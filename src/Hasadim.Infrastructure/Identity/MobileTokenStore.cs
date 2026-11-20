using System.Buffers;
using System.Security.Cryptography;
using Dapper;
using Hasadim.Infrastructure.Database;

namespace Hasadim.Infrastructure.Identity;

public record MobileTokens(string AccessToken, DateTime AccessExpiresAt, string RefreshToken, DateTime RefreshExpiresAt);
public record MobileIdentity(Guid UserId, Guid SessionId, string UserName, string Method, IReadOnlyList<string> Roles);
public enum RefreshOutcome { Rotated, Invalid, Reused }
public record RefreshResult(RefreshOutcome Outcome, MobileTokens? Tokens, Guid? UserId);

// Mobil uygulama oturum anahtarları.
// - Erişim anahtarı 15 dakika, yenileme anahtarı 30 gün geçerlidir (oturum en fazla 90 gün).
// - Anahtarlar 256 bit rastgele üretilir; veritabanında yalnızca SHA-256 özetleri tutulur.
// - Her yenilemede iki anahtar da değişir. Kullanılmış (eski) bir yenileme anahtarı tekrar
//   gelirse anahtar çalınmış sayılır ve oturum tamamen kapatılır.
// - Anahtar, verildiği andaki güvenlik damgasına bağlıdır: şifre sıfırlama, şifre değişikliği,
//   "tüm oturumları kapat" veya oturumun Hesap güvenliği sayfasından kapatılması anahtarı geçersiz kılar.
public class MobileTokenStore(SqlConnectionFactory factory)
{
    public static readonly TimeSpan AccessLifetime = TimeSpan.FromMinutes(15);
    public static readonly TimeSpan RefreshLifetime = TimeSpan.FromDays(30);
    public static readonly TimeSpan SessionLimit = TimeSpan.FromDays(90);
    // Aynı anda iki yenileme isteği gelirse ikincisi saldırı sayılmasın (yalnızca reddedilir).
    static readonly TimeSpan ReuseGrace = TimeSpan.FromSeconds(20);

    const string AccessPrefix = "hsa_", RefreshPrefix = "hsr_";
    static readonly SearchValues<char> TokenChars =
        SearchValues.Create("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_");

    static string NewToken(string prefix) =>
        prefix + Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    public static byte[] Hash(string token) => SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(token));

    static bool Shaped(string? token, string prefix) =>
        token is { Length: >= 40 and <= 80 } && token.StartsWith(prefix, StringComparison.Ordinal)
        && token.AsSpan(prefix.Length).IndexOfAnyExcept(TokenChars) < 0;

    public async Task<MobileTokens> Issue(Guid sessionId, Guid userId, string? securityStamp, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var tokens = new MobileTokens(NewToken(AccessPrefix), now + AccessLifetime, NewToken(RefreshPrefix), now + RefreshLifetime);
        await using var c = await factory.Open(ct);
        await c.ExecuteAsync(new CommandDefinition("""
            INSERT dbo.MobileTokens(SessionId, UserId, AccessHash, AccessExpiresAt, RefreshHash, RefreshExpiresAt, SecurityStamp)
            VALUES(@sessionId, @userId, @access, @accessExpires, @refresh, @refreshExpires, @stamp);
            """, new
        {
            sessionId, userId, access = Hash(tokens.AccessToken), accessExpires = tokens.AccessExpiresAt,
            refresh = Hash(tokens.RefreshToken), refreshExpires = tokens.RefreshExpiresAt, stamp = securityStamp
        }, cancellationToken: ct));
        return tokens;
    }

    // Her istekte çağrılır: anahtar, oturum ve kullanıcı tek sorguda doğrulanır.
    public async Task<MobileIdentity?> Validate(string? accessToken, CancellationToken ct)
    {
        if (!Shaped(accessToken, AccessPrefix)) return null;
        var hash = Hash(accessToken!);
        await using var c = await factory.Open(ct);
        using var grid = await c.QueryMultipleAsync(new CommandDefinition("""
            DECLARE @session uniqueidentifier, @user uniqueidentifier;
            SELECT @session = t.SessionId, @user = t.UserId
            FROM dbo.MobileTokens t
            JOIN dbo.UserSessions s ON s.Id = t.SessionId
            JOIN dbo.Users u ON u.Id = t.UserId
            WHERE t.AccessHash = @hash AND t.AccessExpiresAt > SYSUTCDATETIME()
              AND s.EndedAt IS NULL AND u.DeletedAt IS NULL
              AND ISNULL(u.SecurityStamp, N'') = ISNULL(t.SecurityStamp, N'');
            SELECT u.Id AS UserId, @session AS SessionId, u.UserName, s.Method
            FROM dbo.Users u JOIN dbo.UserSessions s ON s.Id = @session WHERE u.Id = @user;
            SELECT r.Name FROM dbo.UserRoles ur JOIN dbo.Roles r ON r.Id = ur.RoleId WHERE ur.UserId = @user;
            UPDATE dbo.UserSessions SET LastSeenAt = SYSUTCDATETIME()
            WHERE Id = @session AND LastSeenAt < DATEADD(minute, -1, SYSUTCDATETIME());
            """, new { hash }, cancellationToken: ct));
        var row = await grid.ReadSingleOrDefaultAsync<(Guid UserId, Guid SessionId, string UserName, string Method)>();
        var roles = (await grid.ReadAsync<string>()).ToList();
        if (row.UserId == Guid.Empty) return null;
        return new MobileIdentity(row.UserId, row.SessionId, row.UserName, row.Method, roles);
    }

    // Yenileme: eski anahtar çifti atomik olarak yenisiyle değiştirilir.
    public async Task<RefreshResult> Refresh(string? refreshToken, Func<Guid, Task<string?>> currentStamp, CancellationToken ct)
    {
        if (!Shaped(refreshToken, RefreshPrefix)) return new(RefreshOutcome.Invalid, null, null);
        var old = Hash(refreshToken!);
        await using var c = await factory.Open(ct);
        var row = await c.QuerySingleOrDefaultAsync<(Guid SessionId, Guid UserId, string? Stamp, DateTime CreatedAt, bool Ended, bool Deleted)>(new CommandDefinition("""
            SELECT t.SessionId, t.UserId, t.SecurityStamp AS Stamp, s.CreatedAt,
                   CAST(CASE WHEN s.EndedAt IS NULL THEN 0 ELSE 1 END AS bit) AS Ended,
                   CAST(CASE WHEN u.DeletedAt IS NULL THEN 0 ELSE 1 END AS bit) AS Deleted
            FROM dbo.MobileTokens t
            JOIN dbo.UserSessions s ON s.Id = t.SessionId
            JOIN dbo.Users u ON u.Id = t.UserId
            WHERE t.RefreshHash = @old AND t.RefreshExpiresAt > SYSUTCDATETIME();
            """, new { old }, cancellationToken: ct));

        if (row.SessionId == Guid.Empty)
        {
            // Daha önce kullanılmış bir yenileme anahtarı mı? (çalınma belirtisi)
            var reused = await c.QuerySingleOrDefaultAsync<(Guid SessionId, Guid UserId, DateTime RotatedAt)>(new CommandDefinition(
                "SELECT SessionId, UserId, RotatedAt FROM dbo.MobileTokens WHERE PreviousRefreshHash = @old;", new { old }, cancellationToken: ct));
            if (reused.SessionId == Guid.Empty) return new(RefreshOutcome.Invalid, null, null);
            if (DateTime.UtcNow - reused.RotatedAt < ReuseGrace) return new(RefreshOutcome.Invalid, null, null);
            await Revoke(reused.SessionId, ct);
            return new(RefreshOutcome.Reused, null, reused.UserId);
        }
        if (row.Ended || row.Deleted || !string.Equals(row.Stamp ?? "", await currentStamp(row.UserId) ?? "", StringComparison.Ordinal))
        {
            await Revoke(row.SessionId, ct);
            return new(RefreshOutcome.Invalid, null, null);
        }

        var now = DateTime.UtcNow;
        var limit = DateTime.SpecifyKind(row.CreatedAt, DateTimeKind.Utc) + SessionLimit;
        var refreshExpires = now + RefreshLifetime < limit ? now + RefreshLifetime : limit;
        if (refreshExpires <= now) { await Revoke(row.SessionId, ct); return new(RefreshOutcome.Invalid, null, null); }
        var tokens = new MobileTokens(NewToken(AccessPrefix), now + AccessLifetime, NewToken(RefreshPrefix), refreshExpires);
        // WHERE RefreshHash = @old: aynı anahtarla gelen iki istekten yalnızca biri başarılı olur.
        var changed = await c.ExecuteAsync(new CommandDefinition("""
            UPDATE dbo.MobileTokens
            SET AccessHash = @access, AccessExpiresAt = @accessExpires,
                RefreshHash = @refresh, RefreshExpiresAt = @refreshExpires,
                PreviousRefreshHash = @old, RotatedAt = SYSUTCDATETIME()
            WHERE SessionId = @session AND RefreshHash = @old;
            UPDATE dbo.UserSessions SET LastSeenAt = SYSUTCDATETIME() WHERE Id = @session;
            """, new
        {
            access = Hash(tokens.AccessToken), accessExpires = tokens.AccessExpiresAt,
            refresh = Hash(tokens.RefreshToken), refreshExpires = tokens.RefreshExpiresAt,
            old, session = row.SessionId
        }, cancellationToken: ct));
        return changed >= 1 ? new(RefreshOutcome.Rotated, tokens, row.UserId) : new(RefreshOutcome.Invalid, null, null);
    }

    // Kullanıcının kendi işlemiyle güvenlik damgası değişirse (ör. Google bağlantısını kaldırma)
    // o işlemi yapan cihazın anahtarı yeni damgaya taşınır; diğer cihazlar çıkış yapar.
    public async Task Restamp(Guid sessionId, string? securityStamp, CancellationToken ct)
    {
        await using var c = await factory.Open(ct);
        await c.ExecuteAsync(new CommandDefinition("UPDATE dbo.MobileTokens SET SecurityStamp = @securityStamp WHERE SessionId = @sessionId;",
            new { sessionId, securityStamp }, cancellationToken: ct));
    }

    // Oturumu kapatır ve anahtarlarını siler.
    public async Task Revoke(Guid sessionId, CancellationToken ct)
    {
        await using var c = await factory.Open(ct);
        await c.ExecuteAsync(new CommandDefinition("""
            UPDATE dbo.UserSessions SET EndedAt = SYSUTCDATETIME() WHERE Id = @sessionId AND EndedAt IS NULL;
            DELETE dbo.MobileTokens WHERE SessionId = @sessionId;
            """, new { sessionId }, cancellationToken: ct));
    }
}
