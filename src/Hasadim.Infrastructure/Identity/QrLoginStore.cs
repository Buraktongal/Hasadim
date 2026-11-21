using System.Security.Cryptography;
using System.Text;
using Dapper;
using Hasadim.Infrastructure.Database;
using Microsoft.AspNetCore.WebUtilities;

namespace Hasadim.Infrastructure.Identity;

public sealed record QrStart(Guid Id, string Code, string Secret, DateTime ExpiresAt);
public sealed record QrRequest(Guid Id, byte Status, Guid? UserId, string BrowserDevice, string? BrowserIp, DateTime CreatedAt, DateTime ExpiresAt);

// Mobil uygulamayla QR okutarak web'de giriş (WhatsApp Web benzeri).
//  1) Tarayıcı istek açar: QR'a yazılan kod + yalnızca tarayıcının çerezinde duran gizli anahtar.
//  2) Telefonda oturum açmış kullanıcı kodu okutur → istek o kullanıcıya bağlanır ("okutuldu").
//  3) Kullanıcı telefonda tarayıcı bilgisini görüp onaylar veya reddeder.
//  4) Tarayıcı, gizli anahtarıyla sorar; onaylandıysa tek seferlik giriş yapar ("kullanıldı").
// Kod 2 dakika geçerli ve tek kullanımlık; kod ve anahtar yalnızca SHA-256 özetleriyle saklanır.
public class QrLoginStore(SqlConnectionFactory factory)
{
    public static readonly TimeSpan Lifetime = TimeSpan.FromMinutes(2);
    public const byte Pending = 0, Scanned = 1, Approved = 2, Rejected = 3, Used = 4;

    static byte[] Hash(string value) => SHA256.HashData(Encoding.UTF8.GetBytes(value));
    static string NewToken() => WebEncoders.Base64UrlEncode(RandomNumberGenerator.GetBytes(32));
    public static bool LooksLikeCode(string? code) => code is { Length: 43 } && code.All(ch => char.IsAsciiLetterOrDigit(ch) || ch is '-' or '_');

    public async Task<QrStart> Start(string device, string? ip, CancellationToken ct)
    {
        var id = Guid.NewGuid();
        var code = NewToken();
        var secret = NewToken();
        var expires = DateTime.UtcNow.Add(Lifetime);
        await using var c = await factory.Open(ct);
        await c.ExecuteAsync(new CommandDefinition("""
            INSERT dbo.QrLogins(Id, CodeHash, SecretHash, BrowserDevice, BrowserIp, ExpiresAt)
            VALUES(@id, @code, @secret, @device, @ip, @expires);
            DELETE dbo.QrLogins WHERE CreatedAt < DATEADD(hour, -1, SYSUTCDATETIME());
            """, new { id, code = Hash(code), secret = Hash(secret), device, ip, expires }, cancellationToken: ct));
        return new(id, code, secret, expires);
    }

    // Tarayıcının sorgusu: kimlik + gizli anahtar eşleşmeli.
    public async Task<QrRequest?> ForBrowser(Guid id, string secret, CancellationToken ct)
    {
        await using var c = await factory.Open(ct);
        return await c.QuerySingleOrDefaultAsync<QrRequest>(new CommandDefinition("""
            SELECT Id, Status, UserId, BrowserDevice, BrowserIp, CreatedAt, ExpiresAt
            FROM dbo.QrLogins WHERE Id = @id AND SecretHash = @secret
            """, new { id, secret = Hash(secret) }, cancellationToken: ct));
    }

    // Onaylanmış isteği tek seferlik "kullanıldı" yapar; eşzamanlı iki sorguda yalnızca biri kazanır.
    public async Task<Guid?> Consume(Guid id, string secret, CancellationToken ct)
    {
        await using var c = await factory.Open(ct);
        return await c.QuerySingleOrDefaultAsync<Guid?>(new CommandDefinition("""
            UPDATE dbo.QrLogins SET Status = 4
            OUTPUT inserted.UserId
            WHERE Id = @id AND SecretHash = @secret AND Status = 2 AND ExpiresAt > SYSUTCDATETIME()
            """, new { id, secret = Hash(secret) }, cancellationToken: ct));
    }

    // Telefon kodu okuttu: yalnızca bekleyen (veya aynı kullanıcının zaten okuttuğu) istek bağlanır.
    public async Task<QrRequest?> Scan(string code, Guid user, Guid session, CancellationToken ct)
    {
        await using var c = await factory.Open(ct);
        return await c.QuerySingleOrDefaultAsync<QrRequest>(new CommandDefinition("""
            UPDATE dbo.QrLogins SET Status = 1, UserId = @user, ApproverSession = @session
            OUTPUT inserted.Id, inserted.Status, inserted.UserId, inserted.BrowserDevice, inserted.BrowserIp, inserted.CreatedAt, inserted.ExpiresAt
            WHERE CodeHash = @code AND ExpiresAt > SYSUTCDATETIME()
              AND (Status = 0 OR (Status = 1 AND UserId = @user AND ApproverSession = @session))
            """, new { code = Hash(code), user, session }, cancellationToken: ct));
    }

    // Onay / ret: yalnızca okutan telefon oturumu karar verebilir.
    public async Task<bool> Decide(string code, Guid user, Guid session, bool approve, CancellationToken ct)
    {
        await using var c = await factory.Open(ct);
        return await c.ExecuteAsync(new CommandDefinition("""
            UPDATE dbo.QrLogins SET Status = @status, DecidedAt = SYSUTCDATETIME()
            WHERE CodeHash = @code AND Status = 1 AND UserId = @user AND ApproverSession = @session AND ExpiresAt > SYSUTCDATETIME()
            """, new { code = Hash(code), user, session, status = approve ? Approved : Rejected }, cancellationToken: ct)) == 1;
    }
}
