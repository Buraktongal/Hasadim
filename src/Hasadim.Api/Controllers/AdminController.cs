using System.ComponentModel.DataAnnotations;
using Hasadim.Api.Security;
using Hasadim.Application;
using Hasadim.Infrastructure.Identity;
using Hasadim.Infrastructure.Repositories;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Caching.Memory;

namespace Hasadim.Api.Controllers;

public class StepUpRequest { [Required, StringLength(128)] public string Password { get; set; } = ""; }
public class SuspendRequest { [Required, StringLength(300, MinimumLength = 5)] public string Reason { get; set; } = ""; }
public class FeedbackUpdateRequest
{
    [Range(0, 4)] public byte Status { get; set; }
    [StringLength(2000)] public string? AdminNote { get; set; }
    [StringLength(2000)] public string? Reply { get; set; }
}

// Yönetim paneli API'si.
// Güvenlik:
// - Yalnızca "Admin" rolündeki kullanıcılar ve yalnızca tarayıcı oturumu (çerez) ile erişilir;
//   mobil anahtarla yönetim yapılamaz (çalınan bir telefon anahtarı yönetici yetkisi vermez).
// - Hassas işlemler (askıya alma, rol değişikliği, oturum kapatma) için son 10 dakika içinde
//   şifreyle yeniden doğrulama gerekir.
// - Her yönetici işlemi silinemeyen denetim kaydına (AdminAudit) yazılır.
// - Yönetici kendini askıya alamaz, son yöneticinin yetkisi kaldırılamaz.
[ApiController]
[Authorize(Roles = "Admin", AuthenticationSchemes = "Identity.Application")]
[Route("api/admin")]
[EnableRateLimiting("admin")]
public class AdminController(
    MarketplaceService service,
    AdminRepository admin,
    IEngagementRepository engagement,
    UserManager<AppUser> users,
    SignInManager<AppUser> signIn,
    SessionStore sessions,
    IMemoryCache cache) : ControllerBase
{
    static readonly TimeSpan StepUpLifetime = TimeSpan.FromMinutes(10);
    Guid Me => Guid.Parse(users.GetUserId(User)!);
    string? Ip => HttpContext.Connection.RemoteIpAddress?.ToString();
    Task Audit(string action, string? type, string? target, string? detail = null) =>
        admin.Audit(Me, action, type, target, detail, Ip, HttpContext.RequestAborted);

    async Task<string> StepUpKey()
    {
        var sid = SessionCookie.Id((await HttpContext.AuthenticateAsync(IdentityConstants.ApplicationScheme)).Properties);
        return "admin:stepup:" + Me + ":" + (sid?.ToString() ?? "-");
    }
    async Task<bool> SteppedUp() => cache.TryGetValue(await StepUpKey(), out bool ok) && ok;
    ObjectResult NeedStepUp() => StatusCode(403, new { mesaj = "Bu işlem için şifreni yeniden girmelisin.", code = "step_up_required" });

    // ---------- Oturum ----------
    [HttpGet("me")]
    public async Task<IActionResult> MeInfo()
    {
        var u = await users.GetUserAsync(User);
        return Ok(new { u!.Id, u.DisplayName, u.Email, steppedUp = await SteppedUp(), hasPassword = await users.HasPasswordAsync(u) });
    }

    // Şifreyle yeniden doğrulama: 10 dakika boyunca hassas işlemlere izin verir.
    [HttpPost("step-up"), EnableRateLimiting("auth")]
    public async Task<IActionResult> StepUp(StepUpRequest r)
    {
        var u = await users.GetUserAsync(User);
        if (u is null) return Unauthorized();
        if (!await users.HasPasswordAsync(u)) return BadRequest(new { mesaj = "Hassas yönetim işlemleri için hesabında şifre olmalı. Ayarlar'dan şifre belirle." });
        var result = await signIn.CheckPasswordSignInAsync(u, r.Password, lockoutOnFailure: true);
        if (!result.Succeeded)
        {
            await Audit("step-up-failed", "user", u.Id.ToString());
            return Unauthorized(new { mesaj = result.IsLockedOut ? "Çok fazla hatalı deneme. 15 dakika sonra tekrar dene." : "Şifre hatalı." });
        }
        cache.Set(await StepUpKey(), true, new MemoryCacheEntryOptions { AbsoluteExpirationRelativeToNow = StepUpLifetime, Size = 1 });
        await Audit("step-up", "user", u.Id.ToString());
        return Ok(new { mesaj = "Doğrulandı. 10 dakika boyunca hassas işlemleri yapabilirsin.", expiresInSeconds = (int)StepUpLifetime.TotalSeconds });
    }

    [HttpGet("stats")]
    public async Task<IActionResult> Stats(CancellationToken ct) => Ok(await admin.Stats(ct));

    // ---------- Kullanıcılar ----------
    [HttpGet("users")]
    public async Task<IActionResult> Users([FromQuery] string? q, [FromQuery] string? filter, [FromQuery] int page = 1, CancellationToken ct = default)
    {
        if (q is { Length: > 100 }) q = q[..100];
        return Ok(await admin.Users(q, filter, page, ct));
    }

    [HttpGet("users/{id:guid}")]
    public async Task<IActionResult> UserDetail(Guid id, CancellationToken ct)
    {
        var (user, logins, openSessions, feedback, reports) = await admin.UserDetail(id, ct);
        if (user is null) return NotFound(new { mesaj = "Kullanıcı bulunamadı." });
        await Audit("user-view", "user", id.ToString());
        return Ok(new { user, logins, openSessions, feedback, reportsAgainst = reports });
    }

    [HttpPost("users/{id:guid}/suspend")]
    public async Task<IActionResult> Suspend(Guid id, SuspendRequest r, CancellationToken ct)
    {
        if (!await SteppedUp()) return NeedStepUp();
        if (id == Me) return BadRequest(new { mesaj = "Kendi hesabını askıya alamazsın." });
        var u = await users.FindByIdAsync(id.ToString());
        if (u is null) return NotFound(new { mesaj = "Kullanıcı bulunamadı." });
        if (await users.IsInRoleAsync(u, "Admin")) return BadRequest(new { mesaj = "Yönetici hesabı askıya alınamaz. Önce yöneticilik yetkisini kaldır." });
        await users.SetLockoutEnabledAsync(u, true);
        await users.SetLockoutEndDateAsync(u, DateTimeOffset.MaxValue);
        await users.UpdateSecurityStampAsync(u);               // tarayıcı oturumları ve mobil anahtarlar hemen geçersizleşir
        await sessions.EndAll(u.Id, null, ct);
        await admin.Suspend(u.Id, r.Reason.Trim(), Me, ct);
        await Audit("user-suspend", "user", id.ToString(), r.Reason.Trim());
        return Ok(new { mesaj = "Hesap askıya alındı; açık oturumları kapatıldı." });
    }

    [HttpPost("users/{id:guid}/unsuspend")]
    public async Task<IActionResult> Unsuspend(Guid id, CancellationToken ct)
    {
        if (!await SteppedUp()) return NeedStepUp();
        var u = await users.FindByIdAsync(id.ToString());
        if (u is null) return NotFound(new { mesaj = "Kullanıcı bulunamadı." });
        await users.SetLockoutEndDateAsync(u, null);
        await users.ResetAccessFailedCountAsync(u);
        await admin.Unsuspend(u.Id, ct);
        await Audit("user-unsuspend", "user", id.ToString());
        return Ok(new { mesaj = "Hesabın askısı kaldırıldı." });
    }

    [HttpPost("users/{id:guid}/end-sessions")]
    public async Task<IActionResult> EndSessions(Guid id, CancellationToken ct)
    {
        if (!await SteppedUp()) return NeedStepUp();
        var u = await users.FindByIdAsync(id.ToString());
        if (u is null) return NotFound(new { mesaj = "Kullanıcı bulunamadı." });
        await users.UpdateSecurityStampAsync(u);
        var n = await sessions.EndAll(u.Id, null, ct);
        await Audit("user-end-sessions", "user", id.ToString(), n + " oturum");
        return Ok(new { mesaj = n + " oturum kapatıldı." });
    }

    [HttpPost("users/{id:guid}/admin")]
    public async Task<IActionResult> SetAdmin(Guid id, [FromQuery] bool on, CancellationToken ct)
    {
        if (!await SteppedUp()) return NeedStepUp();
        var u = await users.FindByIdAsync(id.ToString());
        if (u is null) return NotFound(new { mesaj = "Kullanıcı bulunamadı." });
        if (!on && id == Me) return BadRequest(new { mesaj = "Kendi yöneticilik yetkini kaldıramazsın." });
        if (!on && (await users.GetUsersInRoleAsync("Admin")).Count <= 1) return BadRequest(new { mesaj = "Son yöneticinin yetkisi kaldırılamaz." });
        if (on && !u.EmailConfirmed) return BadRequest(new { mesaj = "E-postası doğrulanmamış bir hesaba yönetici yetkisi verilemez." });
        var result = on ? await users.AddToRoleAsync(u, "Admin") : await users.RemoveFromRoleAsync(u, "Admin");
        if (!result.Succeeded) return BadRequest(new { mesaj = string.Join(" ", result.Errors.Select(e => e.Description)) });
        await users.UpdateSecurityStampAsync(u);               // yeni yetki için yeniden giriş gerekir
        await sessions.EndAll(u.Id, null, ct);
        await Audit(on ? "admin-grant" : "admin-revoke", "user", id.ToString());
        return Ok(new { mesaj = on ? "Yönetici yetkisi verildi. Kullanıcı yeniden giriş yapmalı." : "Yönetici yetkisi kaldırıldı." });
    }

    // ---------- Geri bildirimler ----------
    [HttpGet("feedback")]
    public async Task<IActionResult> Feedback([FromQuery] byte? status, [FromQuery] string? kind, [FromQuery] string? area, [FromQuery] string? q, [FromQuery] int page = 1, CancellationToken ct = default)
    {
        if (kind is not null && !FeedbackCatalog.Kinds.Contains(kind)) kind = null;
        if (area is not null && !FeedbackCatalog.Areas.Contains(area)) area = null;
        if (status is > 4) status = null;
        if (q is { Length: > 100 }) q = q[..100];
        return Ok(await admin.Feedback(status, kind, area, q, page, ct));
    }

    [HttpPut("feedback/{id:guid}")]
    public async Task<IActionResult> UpdateFeedback(Guid id, FeedbackUpdateRequest r, CancellationToken ct)
    {
        var reply = string.IsNullOrWhiteSpace(r.Reply) ? null : r.Reply.Trim();
        var note = string.IsNullOrWhiteSpace(r.AdminNote) ? null : r.AdminNote.Trim();
        var updated = await admin.UpdateFeedback(id, r.Status, note, reply, Me, ct);
        if (updated is not { } x) return NotFound(new { mesaj = "Geri bildirim bulunamadı." });
        if (x.ReplyChanged)
            await engagement.Notify(x.UserId, "feedback", "Geri bildirimin yanıtlandı",
                "#" + x.Number + " numaralı geri bildirimine Hasadım ekibi yanıt verdi.", "/html/geri-bildirim.html", new { number = x.Number }, ct);
        await Audit("feedback-update", "feedback", id.ToString(), "Durum: " + FeedbackCatalog.Statuses[r.Status] + (x.ReplyChanged ? " · yanıt gönderildi" : ""));
        return Ok(new { mesaj = x.ReplyChanged ? "Kaydedildi; kullanıcıya bildirim gönderildi." : "Kaydedildi." });
    }

    // ---------- Denetim kaydı ----------
    [HttpGet("audit")]
    public async Task<IActionResult> AuditLog([FromQuery] int page = 1, CancellationToken ct = default) => Ok(await admin.AuditLog(page, ct));

    // ---------- İlanlar ve şikâyetler ----------
    [HttpGet("listings/pending")]
    public async Task<IActionResult> Pending([FromQuery] int page = 1, CancellationToken ct = default) =>
        Ok(await service.Search(new ListingQuery { Review = true, Page = page, PageSize = 12 }, ct));

    // Yönetici, taslak veya incelemedeki ilanı da görüntüleyebilir.
    [HttpGet("listings/{id:guid}")]
    public async Task<IActionResult> ListingDetail(Guid id, CancellationToken ct) => Ok(await service.Detail(id, ct));

    [HttpPost("listings/{id:guid}/approve")]
    public async Task<IActionResult> Approve(Guid id, [FromBody] ListingWorkflowRequest request, CancellationToken ct)
    {
        await service.Approve(id, request, ct);
        await Audit("listing-approve", "listing", id.ToString());
        return Ok(new { id, mesaj = "İlan onaylandı ve 30 günlüğüne yayımlandı." });
    }

    [HttpPost("listings/{id:guid}/request-changes")]
    public async Task<IActionResult> RequestChanges(Guid id, [FromBody] ListingChangesRequest request, CancellationToken ct)
    {
        await service.RequestChanges(id, request, ct);
        await Audit("listing-request-changes", "listing", id.ToString(), request.Note);
        return Ok(new { id, mesaj = "İlan gerekçesiyle birlikte düzeltmeye gönderildi." });
    }

    [HttpGet("reports")]
    public async Task<IActionResult> Reports(CancellationToken ct) => Ok(await service.Reports(ct));

    [HttpPost("listings/{id:guid}/visibility")]
    public async Task<IActionResult> Visibility(Guid id, [FromQuery] bool hidden, CancellationToken ct)
    {
        await service.Visibility(id, hidden, ct);
        await Audit(hidden ? "listing-hide" : "listing-show", "listing", id.ToString());
        return Ok(new { id, hidden });
    }

    [HttpPost("reports/{id:guid}/resolve")]
    public async Task<IActionResult> Resolve(Guid id, CancellationToken ct)
    {
        await service.Resolve(id, ct);
        await Audit("report-resolve", "report", id.ToString());
        return Ok(new { mesaj = "Şikâyet kapatıldı." });
    }
}
