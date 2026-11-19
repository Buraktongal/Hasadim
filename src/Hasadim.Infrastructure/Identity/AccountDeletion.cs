using Dapper;
using Hasadim.Infrastructure.Database;

namespace Hasadim.Infrastructure.Identity;

// Hesap silme: kişisel bilgiler kalıcı olarak temizlenir. Kullanıcı satırı
// anonim olarak kalır; böylece karşı tarafın mesaj ve teklif geçmişi bozulmaz.
// Silinen hesapla tekrar giriş yapılamaz (e-posta, şifre, telefon ve bağlı
// Google/Apple hesapları kaldırılır; güvenlik damgası yenilenir).
public class AccountDeletion(SqlConnectionFactory factory)
{
    // Silinen profil fotoğrafının dosya adını döndürür (dosyayı çağıran siler).
    public async Task<string?> Delete(Guid user, CancellationToken ct)
    {
        await using var c = await factory.Open(ct);
        using var tx = c.BeginTransaction();
        var photo = await c.QuerySingleOrDefaultAsync<string?>(new CommandDefinition(
            "SELECT PhotoFile FROM dbo.UserProfiles WHERE UserId = @user;", new { user }, tx, cancellationToken: ct));
        var anonymous = "silinmis-" + user.ToString("N");
        await c.ExecuteAsync(new CommandDefinition("""
            UPDATE dbo.Listings SET IsDeleted = 1, Active = 0 WHERE OwnerId = @user AND IsDeleted = 0;
            UPDATE dbo.Offers SET Status = 3, RespondedAt = SYSUTCDATETIME() WHERE Status = 0 AND (BuyerId = @user OR SellerId = @user);
            DELETE dbo.Favorites WHERE UserId = @user;
            DELETE dbo.SavedSearches WHERE UserId = @user;
            DELETE dbo.Notifications WHERE UserId = @user;
            DELETE dbo.UserBlocks WHERE BlockerId = @user OR BlockedId = @user;
            DELETE dbo.UserSettings WHERE UserId = @user;
            DELETE dbo.UserLogins WHERE UserId = @user;
            DELETE dbo.UserSessions WHERE UserId = @user;
            DELETE dbo.LoginEvents WHERE UserId = @user;
            DELETE dbo.PhoneChallenges WHERE UserId = @user;
            DELETE dbo.RecoveryCodes WHERE UserId = @user;
            DELETE dbo.UserRoles WHERE UserId = @user;
            UPDATE dbo.UserProfiles
            SET BusinessName = N'', City = N'', District = N'', About = N'', Phone = N'', ShowPhone = 0, PhotoFile = NULL
            WHERE UserId = @user;
            UPDATE dbo.Users
            SET UserName = @anonymous, NormalizedUserName = UPPER(@anonymous),
                Email = @email, NormalizedEmail = UPPER(@email), EmailConfirmed = 0,
                PasswordHash = NULL, SecurityStamp = CONVERT(nvarchar(64), NEWID()), ConcurrencyStamp = CONVERT(nvarchar(64), NEWID()),
                PhoneNumber = NULL, PhoneNumberConfirmed = 0, TwoFactorEnabled = 0, AuthenticatorKey = NULL,
                LockoutEnabled = 1, LockoutEnd = '9999-12-31T00:00:00+00:00', AccessFailedCount = 0,
                DisplayName = N'Silinmiş üye', DeletedAt = SYSUTCDATETIME()
            WHERE Id = @user AND DeletedAt IS NULL;
            """, new { user, anonymous, email = anonymous + "@silindi.invalid" }, tx, cancellationToken: ct, commandTimeout: 60));
        tx.Commit();
        return photo;
    }
}
