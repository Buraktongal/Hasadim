using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Dapper;
using Hasadim.Application;
using Hasadim.Infrastructure.Database;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Data.SqlClient;

namespace Hasadim.Infrastructure.Identity;

public record RegistrationTicket(Guid Id, string Code, DateTime ExpiresAt);
public class RegistrationStore(SqlConnectionFactory factory, IDataProtectionProvider protection)
{
    private IDataProtector Protector => protection.CreateProtector("Hasadim.Registration.v1");
    private record Payload(AppUser User, string Code);
    private sealed class Challenge {
        public Guid Id { get; set; }
        public string? ProtectedData { get; set; }
        public DateTime ExpiresAt { get; set; }
        public int Attempts { get; set; }
        public DateTime LastSentAt { get; set; }
        public DateTime WindowStartedAt { get; set; }
        public int SendCount { get; set; }
    }
    public async Task<RegistrationTicket> Start(AppUser user, CancellationToken ct)
    {
        await using var c = await factory.Open(ct);
        using var tx = c.BeginTransaction();
        var now = await c.ExecuteScalarAsync<DateTime>(new CommandDefinition("SELECT SYSUTCDATETIME()", transaction: tx, cancellationToken: ct));
        // Seri hale getirilen e-posta aralığı: eşzamanlı gönderimler sınırı aşamaz.
        var previous = await c.QuerySingleOrDefaultAsync<Challenge>(new CommandDefinition(
            "SELECT * FROM dbo.RegistrationChallenges WITH(UPDLOCK,HOLDLOCK) WHERE NormalizedEmail=@email",
            new { email = user.NormalizedEmail }, tx, cancellationToken: ct));
        if (previous is not null && (previous.LastSentAt.AddSeconds(60) > now ||
            (previous.WindowStartedAt.AddHours(1) > now && previous.SendCount >= 5)))
            throw new AppException(429, "Yeni kod için en az 60 saniye bekle. Bir saatte en fazla 5 kod istenebilir.");
        var code = RandomNumberGenerator.GetInt32(1_000_000).ToString("D6", CultureInfo.InvariantCulture);
        var id = Guid.NewGuid();
        var expires = now.AddMinutes(2);
        var payload = Protector.Protect(JsonSerializer.Serialize(new Payload(user, code)));
        var window = previous is not null && previous.WindowStartedAt.AddHours(1) > now ? previous.WindowStartedAt : now;
        var count = window == now ? 1 : previous!.SendCount + 1;
        await c.ExecuteAsync(new CommandDefinition("""
            DELETE dbo.RegistrationChallenges WHERE NormalizedEmail=@email;
            INSERT dbo.RegistrationChallenges(Id,NormalizedEmail,ProtectedData,ExpiresAt,Attempts,LastSentAt,WindowStartedAt,SendCount)
            VALUES(@id,@email,@payload,@expires,0,@now,@window,@count);
            -- Yeni isteklerde bir saatten eski, süresi dolmuş kayıtlar temizlenir.
            DELETE dbo.RegistrationChallenges WHERE WindowStartedAt < DATEADD(hour,-1,@now) AND ExpiresAt <= @now;
            """, new { id, email = user.NormalizedEmail, payload, expires, now, window, count }, tx, cancellationToken: ct));
        tx.Commit();
        return new(id, code, DateTime.SpecifyKind(expires, DateTimeKind.Utc));
    }
    public async Task Cancel(Guid id, CancellationToken ct)
    {
        await using var c = await factory.Open(ct);
        await c.ExecuteAsync(new CommandDefinition("UPDATE dbo.RegistrationChallenges SET ProtectedData=NULL,ExpiresAt=SYSUTCDATETIME() WHERE Id=@id", new { id }, cancellationToken: ct));
    }
    public async Task Complete(Guid id, string code, CancellationToken ct)
    {
        await using var c = await factory.Open(ct);
        using var tx = c.BeginTransaction();
        var challenge = await c.QuerySingleOrDefaultAsync<Challenge>(new CommandDefinition(
            "SELECT * FROM dbo.RegistrationChallenges WITH(UPDLOCK,HOLDLOCK) WHERE Id=@id", new { id }, tx, cancellationToken: ct));
        var now = await c.ExecuteScalarAsync<DateTime>(new CommandDefinition("SELECT SYSUTCDATETIME()", transaction: tx, cancellationToken: ct));
        if (challenge?.ProtectedData is null || challenge.ExpiresAt <= now || challenge.Attempts >= 5)
            throw new AppException(400, "Kodun süresi dolmuş, kullanım sınırı aşılmış veya kayıt tamamlanmış. Yeni kod iste.");
        var payload = JsonSerializer.Deserialize<Payload>(Protector.Unprotect(challenge.ProtectedData))!;
        if (!CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(payload.Code), Encoding.UTF8.GetBytes(code))) {
            await c.ExecuteAsync(new CommandDefinition("UPDATE dbo.RegistrationChallenges SET Attempts=Attempts+1 WHERE Id=@id", new { id }, tx, cancellationToken: ct));
            tx.Commit();
            throw new AppException(400, challenge.Attempts >= 4 ? "Deneme hakkın doldu. Yeni kod iste." : "Doğrulama kodu hatalı.");
        }
        var u = payload.User;
        try {
            // Hesap, profil telefonu ve kodun tüketilmesi aynı işlemde tamamlanır.
            await c.ExecuteAsync(new CommandDefinition("""
                INSERT dbo.Users(Id,UserName,NormalizedUserName,Email,NormalizedEmail,EmailConfirmed,PasswordHash,
                    SecurityStamp,ConcurrencyStamp,DisplayName,LockoutEnabled,PhoneNumber,PhoneNumberConfirmed)
                VALUES(@Id,@UserName,@NormalizedUserName,@Email,@NormalizedEmail,1,@PasswordHash,
                    @SecurityStamp,@ConcurrencyStamp,@DisplayName,1,@PhoneNumber,0);
                INSERT dbo.UserProfiles(UserId,Phone) VALUES(@Id,@PhoneNumber);
                """, u, tx, cancellationToken: ct));
            await c.ExecuteAsync(new CommandDefinition("UPDATE dbo.RegistrationChallenges SET ProtectedData=NULL,ExpiresAt=@now WHERE Id=@id", new { id, now }, tx, cancellationToken: ct));
            tx.Commit();
        } catch (SqlException e) when (e.Number is 2601 or 2627) {
            throw new AppException(409, "Bu e-posta ile hesap zaten oluşturulmuş. Giriş yapmayı dene.");
        }
    }
}
