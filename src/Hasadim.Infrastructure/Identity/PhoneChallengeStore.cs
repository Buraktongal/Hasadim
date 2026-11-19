using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using Dapper;
using Hasadim.Application;
using Hasadim.Infrastructure.Database;
using Microsoft.Data.SqlClient;

namespace Hasadim.Infrastructure.Identity;

public sealed record PhoneTicket(Guid Id, string Code, DateTime ExpiresAt);

// SMS ile gönderilen 6 haneli kodlar: telefonla giriş ("login") ve
// profildeki telefonu doğrulama ("verify"). Kod 3 dakika geçerli, en fazla 5 deneme;
// aynı numaraya 60 saniyede bir, saatte en fazla 5 kod.
public class PhoneChallengeStore(SqlConnectionFactory factory)
{
    static string Hash(Guid id, string code) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(id.ToString("N") + ":" + code)));

    public async Task<Guid?> FindConfirmedUser(string phone, CancellationToken ct)
    {
        await using var c = await factory.Open(ct);
        return await c.QuerySingleOrDefaultAsync<Guid?>(new CommandDefinition(
            "SELECT Id FROM dbo.Users WHERE PhoneNumber = @phone AND PhoneNumberConfirmed = 1", new { phone }, cancellationToken: ct));
    }

    public async Task<string?> ProfilePhone(Guid userId, CancellationToken ct)
    {
        await using var c = await factory.Open(ct);
        return await c.QuerySingleOrDefaultAsync<string?>(new CommandDefinition(
            "SELECT Phone FROM dbo.UserProfiles WHERE UserId = @userId", new { userId }, cancellationToken: ct));
    }

    public async Task<PhoneTicket> Start(string purpose, string phone, Guid? userId, CancellationToken ct)
    {
        await using var c = await factory.Open(ct);
        using var tx = c.BeginTransaction();
        var now = await c.ExecuteScalarAsync<DateTime>(new CommandDefinition("SELECT SYSUTCDATETIME()", transaction: tx, cancellationToken: ct));
        // Aynı numaraya yapılan istekler sıraya girer; sınırlar eşzamanlı isteklerle aşılamaz.
        var recent = (await c.QueryAsync<DateTime>(new CommandDefinition("""
            SELECT CreatedAt FROM dbo.PhoneChallenges WITH (UPDLOCK, HOLDLOCK)
            WHERE Phone = @phone AND CreatedAt > DATEADD(hour, -1, @now)
            """, new { phone, now }, tx, cancellationToken: ct))).ToList();
        if (recent.Any(x => x > now.AddSeconds(-60)))
            throw new AppException(429, "Yeni kod için 60 saniye bekle.");
        if (recent.Count >= 5)
            throw new AppException(429, "Bu numaraya bir saatte en fazla 5 kod gönderilebilir. Daha sonra tekrar dene.");

        var id = Guid.NewGuid();
        var code = RandomNumberGenerator.GetInt32(1_000_000).ToString("D6", CultureInfo.InvariantCulture);
        var expires = now.AddMinutes(3);
        await c.ExecuteAsync(new CommandDefinition("""
            INSERT dbo.PhoneChallenges(Id, Purpose, Phone, UserId, CodeHash, ExpiresAt, CreatedAt)
            VALUES(@id, @purpose, @phone, @userId, @hash, @expires, @now);
            DELETE dbo.PhoneChallenges WHERE CreatedAt < DATEADD(day, -1, @now);
            """, new { id, purpose, phone, userId, hash = Hash(id, code), expires, now }, tx, cancellationToken: ct));
        tx.Commit();
        return new(id, code, DateTime.SpecifyKind(expires, DateTimeKind.Utc));
    }

    private sealed class Row
    {
        public string Purpose { get; set; } = "";
        public string Phone { get; set; } = "";
        public Guid? UserId { get; set; }
        public string CodeHash { get; set; } = "";
        public DateTime ExpiresAt { get; set; }
        public int Attempts { get; set; }
        public bool Used { get; set; }
    }

    // Kodu doğrular ve tüketir. Başarılıysa kullanıcı ve telefon döner.
    public async Task<(Guid UserId, string Phone)> Verify(Guid id, string code, string purpose, CancellationToken ct)
    {
        const string invalid = "Kod hatalı veya süresi dolmuş. Yeni kod iste.";
        await using var c = await factory.Open(ct);
        using var tx = c.BeginTransaction();
        var row = await c.QuerySingleOrDefaultAsync<Row>(new CommandDefinition(
            "SELECT Purpose, Phone, UserId, CodeHash, ExpiresAt, Attempts, Used FROM dbo.PhoneChallenges WITH (UPDLOCK, HOLDLOCK) WHERE Id = @id",
            new { id }, tx, cancellationToken: ct));
        var now = await c.ExecuteScalarAsync<DateTime>(new CommandDefinition("SELECT SYSUTCDATETIME()", transaction: tx, cancellationToken: ct));
        if (row is null || row.Purpose != purpose || row.Used || row.ExpiresAt <= now || row.Attempts >= 5)
            throw new AppException(400, invalid);
        var ok = CryptographicOperations.FixedTimeEquals(Encoding.ASCII.GetBytes(row.CodeHash), Encoding.ASCII.GetBytes(Hash(id, code)));
        if (!ok || row.UserId is null)
        {
            await c.ExecuteAsync(new CommandDefinition("UPDATE dbo.PhoneChallenges SET Attempts = Attempts + 1 WHERE Id = @id", new { id }, tx, cancellationToken: ct));
            tx.Commit();
            throw new AppException(400, row.Attempts >= 4 ? "Deneme hakkın doldu. Yeni kod iste." : "Kod hatalı.");
        }
        await c.ExecuteAsync(new CommandDefinition("UPDATE dbo.PhoneChallenges SET Used = 1 WHERE Id = @id", new { id }, tx, cancellationToken: ct));
        tx.Commit();
        return (row.UserId.Value, row.Phone);
    }

    // Telefonu doğrulanmış olarak kaydeder; profildeki numara da aynı biçime getirilir.
    public async Task ConfirmPhone(Guid userId, string phone, CancellationToken ct)
    {
        await using var c = await factory.Open(ct);
        using var tx = c.BeginTransaction();
        try
        {
            await c.ExecuteAsync(new CommandDefinition("""
                UPDATE dbo.Users SET PhoneNumber = @phone, PhoneNumberConfirmed = 1, ConcurrencyStamp = @stamp WHERE Id = @userId;
                UPDATE dbo.UserProfiles SET Phone = @phone WHERE UserId = @userId;
                """, new { userId, phone, stamp = Guid.NewGuid().ToString("N") }, tx, cancellationToken: ct));
            tx.Commit();
        }
        catch (SqlException e) when (e.Number is 2601 or 2627)
        {
            throw new AppException(409, "Bu telefon numarası başka bir hesapta doğrulanmış.");
        }
    }
}
