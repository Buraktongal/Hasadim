using Dapper;
using Hasadim.Infrastructure.Database;

namespace Hasadim.Infrastructure.Identity;

public record SessionView(Guid Id, string Method, string Device, DateTime CreatedAt, DateTime LastSeenAt);
public record LoginEventView(DateTime At, bool Success, string Method, string Device, string? Reason);

// Açık oturumlar ve giriş hareketleri. Oturum çerezi kısa ömürlüdür (30 dk hareketsizlik);
// son 30 dakikada kullanılan ve kapatılmamış oturumlar "açık" sayılır.
public class SessionStore(SqlConnectionFactory factory)
{
    public static readonly TimeSpan IdleLimit = TimeSpan.FromMinutes(30);

    // Tarayıcı ve işletim sistemini kısa bir ada çevirir (ör. "Chrome · Windows").
    public static string DeviceName(string? userAgent)
    {
        var ua = userAgent ?? "";
        string browser = ua.Contains("Edg/") ? "Edge" : ua.Contains("OPR/") || ua.Contains("Opera") ? "Opera"
            : ua.Contains("SamsungBrowser") ? "Samsung Internet" : ua.Contains("Firefox/") ? "Firefox"
            : ua.Contains("Chrome/") || ua.Contains("CriOS") ? "Chrome" : ua.Contains("Safari/") ? "Safari"
            : ua.Contains("okhttp") || ua.Contains("Expo") ? "Hasadım uygulaması" : "Tarayıcı";
        if (ua.StartsWith("HasadimMobile/", StringComparison.Ordinal)) browser = "Hasadım uygulaması";
        string os = ua.Contains("iPhone") ? "iPhone" : ua.Contains("iPad") ? "iPad" : ua.Contains("Android") ? "Android"
            : ua.Contains("Windows") ? "Windows" : ua.Contains("Mac OS X") || ua.Contains("Macintosh") ? "macOS"
            : ua.Contains("Linux") ? "Linux" : "bilinmeyen cihaz";
        return browser + " · " + os;
    }

    public static string MethodName(string? amr) => amr switch
    {
        "pwd" => "E-posta ve şifre",
        "mfa" => "İki adımlı doğrulama",
        "google" => "Google",
        "apple" => "Apple",
        "phone" => "Telefon (SMS)",
        _ => "Giriş"
    };

    // Yeni oturum açar ve başarılı girişi kaydeder. Daha önce görülmemiş bir cihazdan
    // giriş yapıldıysa kullanıcıya güvenlik bildirimi gönderilir (ilk giriş hariç).
    public async Task<Guid> Start(Guid user, string? amr, string? userAgent, CancellationToken ct)
    {
        var id = Guid.NewGuid();
        var device = DeviceName(userAgent);
        var method = MethodName(amr);
        await using var c = await factory.Open(ct);
        await c.ExecuteAsync(new CommandDefinition("""
            DECLARE @known bit = CASE WHEN EXISTS(SELECT 1 FROM dbo.UserSessions WHERE UserId = @user AND Device = @device) THEN 1 ELSE 0 END;
            DECLARE @first bit = CASE WHEN EXISTS(SELECT 1 FROM dbo.UserSessions WHERE UserId = @user) THEN 0 ELSE 1 END;
            INSERT dbo.UserSessions(Id, UserId, Method, Device, UserAgent) VALUES(@id, @user, @method, @device, @ua);
            INSERT dbo.LoginEvents(UserId, Success, Method, Device) VALUES(@user, 1, @method, @device);
            IF @known = 0 AND @first = 0
                INSERT dbo.Notifications(Id, UserId, Kind, Title, Body, Link)
                VALUES(NEWID(), @user, N'security', N'Yeni cihazdan giriş',
                       N'Hesabına ' + @device + N' ile giriş yapıldı. Bu sen değilsen şifreni değiştir ve diğer oturumları kapat.', N'/html/hesabim.html');
            -- Eski kayıtlar: 90 günden eski giriş hareketleri ve kapanmış oturumlar silinir.
            DELETE dbo.LoginEvents WHERE UserId = @user AND At < DATEADD(day, -90, SYSUTCDATETIME());
            DELETE dbo.UserSessions WHERE UserId = @user AND LastSeenAt < DATEADD(day, -90, SYSUTCDATETIME());
            """, new { id, user, method, device, ua = userAgent is { Length: > 300 } ? userAgent[..300] : userAgent }, cancellationToken: ct));
        return id;
    }

    // Oturum hâlâ geçerliyse son görülme zamanını (dakikada bir) günceller.
    public async Task<bool> Touch(Guid id, CancellationToken ct)
    {
        await using var c = await factory.Open(ct);
        return await c.ExecuteScalarAsync<int>(new CommandDefinition("""
            UPDATE dbo.UserSessions SET LastSeenAt = SYSUTCDATETIME()
            WHERE Id = @id AND EndedAt IS NULL AND LastSeenAt < DATEADD(minute, -1, SYSUTCDATETIME());
            SELECT COUNT(*) FROM dbo.UserSessions WHERE Id = @id AND EndedAt IS NULL;
            """, new { id }, cancellationToken: ct)) > 0;
    }

    public async Task End(Guid id, CancellationToken ct)
    {
        await using var c = await factory.Open(ct);
        await c.ExecuteAsync(new CommandDefinition("UPDATE dbo.UserSessions SET EndedAt = SYSUTCDATETIME() WHERE Id = @id AND EndedAt IS NULL;",
            new { id }, cancellationToken: ct));
    }

    public async Task<bool> EndForUser(Guid user, Guid id, CancellationToken ct)
    {
        await using var c = await factory.Open(ct);
        return await c.ExecuteAsync(new CommandDefinition(
            "UPDATE dbo.UserSessions SET EndedAt = SYSUTCDATETIME() WHERE Id = @id AND UserId = @user AND EndedAt IS NULL;",
            new { id, user }, cancellationToken: ct)) == 1;
    }

    // keep verilirse o oturum (bu cihaz) açık kalır.
    public async Task<int> EndAll(Guid user, Guid? keep, CancellationToken ct)
    {
        await using var c = await factory.Open(ct);
        return await c.ExecuteAsync(new CommandDefinition(
            "UPDATE dbo.UserSessions SET EndedAt = SYSUTCDATETIME() WHERE UserId = @user AND EndedAt IS NULL AND (@keep IS NULL OR Id <> @keep);",
            new { user, keep }, cancellationToken: ct));
    }

    public async Task<IReadOnlyList<SessionView>> Open(Guid user, CancellationToken ct)
    {
        await using var c = await factory.Open(ct);
        return (await c.QueryAsync<SessionView>(new CommandDefinition("""
            SELECT Id, Method, Device, CreatedAt, LastSeenAt FROM dbo.UserSessions
            WHERE UserId = @user AND EndedAt IS NULL
              AND (LastSeenAt > DATEADD(minute, -30, SYSUTCDATETIME())
                   -- Mobil uygulama oturumları yenileme anahtarı geçerli olduğu sürece açıktır.
                   OR EXISTS(SELECT 1 FROM dbo.MobileTokens t WHERE t.SessionId = dbo.UserSessions.Id AND t.RefreshExpiresAt > SYSUTCDATETIME()))
            ORDER BY LastSeenAt DESC;
            """, new { user }, cancellationToken: ct))).ToList();
    }

    public async Task Failed(Guid user, string? userAgent, string reason, CancellationToken ct)
    {
        await using var c = await factory.Open(ct);
        await c.ExecuteAsync(new CommandDefinition(
            "INSERT dbo.LoginEvents(UserId, Success, Method, Device, Reason) VALUES(@user, 0, N'E-posta ve şifre', @device, @reason);",
            new { user, device = DeviceName(userAgent), reason }, cancellationToken: ct));
    }

    public async Task<IReadOnlyList<LoginEventView>> History(Guid user, CancellationToken ct)
    {
        await using var c = await factory.Open(ct);
        return (await c.QueryAsync<LoginEventView>(new CommandDefinition(
            "SELECT TOP (15) At, Success, Method, Device, Reason FROM dbo.LoginEvents WHERE UserId = @user ORDER BY At DESC, Id DESC;",
            new { user }, cancellationToken: ct))).ToList();
    }
}
