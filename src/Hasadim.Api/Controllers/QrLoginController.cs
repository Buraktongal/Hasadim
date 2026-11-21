using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Hasadim.Api.Security;
using Hasadim.Infrastructure.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Hasadim.Api.Controllers;

public class QrScanRequest { [Required, StringLength(64)] public string Code { get; set; } = ""; }
public class QrDecideRequest : QrScanRequest { public bool Approve { get; set; } }

// QR kodla web girişi. Web tarafı: /api/account/qr/*, telefon tarafı: /api/mobile/qr/*.
// Ayrıntılı akış için QrLoginStore'a bak.
[ApiController]
public class QrLoginController(QrLoginStore store, UserManager<AppUser> users, SignInManager<AppUser> signIn, ILogger<QrLoginController> logger) : ControllerBase
{
    // Tarayıcının gizli anahtarı yalnızca bu HttpOnly çerezde durur; sayfa betikleri okuyamaz.
    const string Cookie = "__Host-HasadimQr";

    CookieOptions CookieOptions(DateTimeOffset expires) => new()
    {
        HttpOnly = true, Secure = true, SameSite = SameSiteMode.Strict, Path = "/", Expires = expires, IsEssential = true
    };

    (Guid Id, string Secret)? BrowserTicket()
    {
        var raw = Request.Cookies[Cookie];
        if (raw is null) return null;
        var dot = raw.IndexOf('.');
        return dot > 0 && Guid.TryParse(raw[..dot], out var id) && QrLoginStore.LooksLikeCode(raw[(dot + 1)..]) ? (id, raw[(dot + 1)..]) : null;
    }

    // ---------- Web ----------

    // Yeni QR. Giriş yapmış tarayıcıda gerek yok.
    [HttpPost("api/account/qr/start"), EnableRateLimiting("auth")]
    public async Task<IActionResult> Start(CancellationToken ct)
    {
        if (User.Identity?.IsAuthenticated == true) return BadRequest(new { mesaj = "Zaten giriş yapmışsın." });
        var device = SessionStore.DeviceName(Request.Headers.UserAgent.ToString());
        var s = await store.Start(device, HttpContext.Connection.RemoteIpAddress?.ToString(), ct);
        Response.Cookies.Append(Cookie, s.Id.ToString("N") + "." + s.Secret, CookieOptions(s.ExpiresAt.AddSeconds(30)));
        return Ok(new { code = s.Code, expiresAt = DateTime.SpecifyKind(s.ExpiresAt, DateTimeKind.Utc), lifetimeSeconds = (int)QrLoginStore.Lifetime.TotalSeconds });
    }

    // Tarayıcı birkaç saniyede bir sorar. Onaylandıysa burada (tek seferlik) giriş yapılır.
    [HttpPost("api/account/qr/poll"), EnableRateLimiting("qr")]
    public async Task<IActionResult> Poll(CancellationToken ct)
    {
        if (BrowserTicket() is not { } t) return Ok(new { status = "expired" });
        var r = await store.ForBrowser(t.Id, t.Secret, ct);
        if (r is null || r.ExpiresAt <= DateTime.UtcNow || r.Status == QrLoginStore.Used) { Response.Cookies.Delete(Cookie, CookieOptions(DateTimeOffset.UnixEpoch)); return Ok(new { status = "expired" }); }
        switch (r.Status)
        {
            case QrLoginStore.Pending: return Ok(new { status = "pending" });
            case QrLoginStore.Scanned: return Ok(new { status = "scanned" });
            case QrLoginStore.Rejected:
                Response.Cookies.Delete(Cookie, CookieOptions(DateTimeOffset.UnixEpoch));
                return Ok(new { status = "rejected" });
        }
        // Onaylandı: önce isteği "kullanıldı" yap (iki sekme aynı anda sorsa bile yalnızca biri girer).
        if (await store.Consume(t.Id, t.Secret, ct) is not Guid userId) return Ok(new { status = "expired" });
        Response.Cookies.Delete(Cookie, CookieOptions(DateTimeOffset.UnixEpoch));
        var u = await users.FindByIdAsync(userId.ToString());
        if (u is null) return Ok(new { status = "expired" });
        if (await users.IsLockedOutAsync(u)) return Unauthorized(new { mesaj = u.LockoutEnd > DateTimeOffset.UtcNow.AddYears(50) ? "Bu hesap Hasadım yönetimi tarafından askıya alındı." : "Hesap geçici olarak kilitli. Biraz sonra tekrar dene." });
        if (!await signIn.CanSignInAsync(u)) return Unauthorized(new { mesaj = "Giriş için önce e-posta adresini doğrulamalısın." });
        // Telefonda zaten (gerekirse iki adımlı doğrulamayla) açılmış bir oturumun onayı ikinci etken sayılır.
        await signIn.SignInWithClaimsAsync(u, false, [new Claim("amr", "qr")]);
        logger.LogInformation("QR ile web girişi: {User}", u.Id);
        return Ok(new { status = "signed-in" });
    }

    // Kullanıcı QR penceresini kapatınca istek iptal edilir.
    [HttpPost("api/account/qr/cancel")]
    public IActionResult Cancel()
    {
        Response.Cookies.Delete(Cookie, CookieOptions(DateTimeOffset.UnixEpoch));
        return Ok();
    }

    // ---------- Mobil uygulama ----------

    Guid? PhoneSession => MobileTokenHandler.SessionOf(User);
    Guid Me => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    static IActionResult Invalid() => new BadRequestObjectResult(new { mesaj = "Bu QR kodun süresi dolmuş veya kullanılmış. Bilgisayardaki sayfada yeni kod oluşturup tekrar okut." });

    // Kod okutuldu: istek bu kullanıcıya bağlanır, onay ekranı için tarayıcı bilgisi döner.
    [Authorize, HttpPost("api/mobile/qr/scan"), EnableRateLimiting("auth")]
    public async Task<IActionResult> Scan(QrScanRequest r, CancellationToken ct)
    {
        if (PhoneSession is not Guid session) return StatusCode(403, new { mesaj = "QR ile giriş onayı yalnızca Hasadım mobil uygulamasından verilebilir." });
        if (!QrLoginStore.LooksLikeCode(r.Code)) return Invalid();
        var q = await store.Scan(r.Code, Me, session, ct);
        if (q is null) return Invalid();
        return Ok(new
        {
            device = q.BrowserDevice,
            ip = MaskIp(q.BrowserIp),
            createdAt = DateTime.SpecifyKind(q.CreatedAt, DateTimeKind.Utc),
            expiresAt = DateTime.SpecifyKind(q.ExpiresAt, DateTimeKind.Utc)
        });
    }

    [Authorize, HttpPost("api/mobile/qr/decide"), EnableRateLimiting("auth")]
    public async Task<IActionResult> Decide(QrDecideRequest r, CancellationToken ct)
    {
        if (PhoneSession is not Guid session) return StatusCode(403, new { mesaj = "QR ile giriş onayı yalnızca Hasadım mobil uygulamasından verilebilir." });
        if (!QrLoginStore.LooksLikeCode(r.Code) || !await store.Decide(r.Code, Me, session, r.Approve, ct)) return Invalid();
        return Ok(new { mesaj = r.Approve ? "Bilgisayardaki tarayıcıda giriş yapıldı." : "Giriş isteği reddedildi." });
    }

    // Kullanıcıya tarayıcının IP'sinin yalnızca bir kısmı gösterilir (ör. 85.105.x.x).
    static string? MaskIp(string? ip)
    {
        if (string.IsNullOrEmpty(ip)) return null;
        if (ip.StartsWith("::ffff:", StringComparison.Ordinal)) ip = ip[7..];
        var p = ip.Split('.');
        if (p.Length == 4) return $"{p[0]}.{p[1]}.x.x";
        var v6 = ip.Split(':');
        return v6.Length > 2 ? $"{v6[0]}:{v6[1]}:…" : ip;
    }
}
