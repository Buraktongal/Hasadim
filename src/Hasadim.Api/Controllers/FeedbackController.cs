using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Hasadim.Api.Security;
using Hasadim.Infrastructure.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hasadim.Api.Controllers;

public class FeedbackRequest
{
    [Required, RegularExpression("^(Oneri|Hata|Diger)$", ErrorMessage = "Geri bildirim türünü seç.")] public string Kind { get; set; } = "";
    [Required, StringLength(30)] public string Area { get; set; } = "";
    [Required, StringLength(150, MinimumLength = 5, ErrorMessage = "Başlık 5–150 karakter olmalı.")] public string Title { get; set; } = "";
    [Required, StringLength(4000, MinimumLength = 15, ErrorMessage = "Açıklama 15–4000 karakter olmalı.")] public string Body { get; set; } = "";
    [StringLength(300)] public string? PageUrl { get; set; }
}

// Öneri ve geri bildirim kutusu. Yalnızca giriş yapmış kullanıcılar gönderebilir;
// 24 saatte 3'ten sonra görsel doğrulama, 10'dan sonra gönderim kapalı (RequireHuman).
[ApiController, Authorize, Route("api/feedback")]
public class FeedbackController(FeedbackRepository feedback) : ControllerBase
{
    Guid Me => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpPost, RequireHuman("feedback")]
    public async Task<IActionResult> Create(FeedbackRequest r, CancellationToken ct)
    {
        if (!FeedbackCatalog.Areas.Contains(r.Area)) return BadRequest(new { mesaj = "Uygulama bölümünü seç." });
        // Sayfa adresi yalnızca site içi yol olarak saklanır (dış bağlantı veya betik kabul edilmez).
        var page = r.PageUrl is { } p && p.StartsWith('/') && !p.StartsWith("//") && !p.Contains('<') ? p : null;
        var ua = Request.Headers.UserAgent.ToString();
        var client = (MobileTokenHandler.IsMobile(User) ? "Mobil uygulama · " : "Web · ") + SessionStoreDevice(ua);
        var number = await feedback.Create(Me, r.Kind, r.Area, r.Title.Trim(), r.Body.Trim(), page, client, ct);
        return Ok(new { number, mesaj = "Teşekkürler! #" + number + " numaralı geri bildirimin Hasadım ekibine iletildi." });
    }

    [HttpGet("mine")]
    public async Task<IActionResult> Mine(CancellationToken ct) => Ok(await feedback.Mine(Me, ct));

    static string SessionStoreDevice(string ua) => Hasadim.Infrastructure.Identity.SessionStore.DeviceName(ua);
}
