using System.Security.Claims;
using Hasadim.Infrastructure.Security;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Hasadim.Api.Security;

// İşaretli uçlarda insan doğrulaması ister (bkz. HumanCheck).
// İstemci önce GET /api/human/challenge?purpose=... ile bilet alır, iş kanıtını çözer ve
// gerekiyorsa görsel kodu kullanıcıya sorar; sonra isteği şu başlıklarla gönderir:
//   X-Human-Token, X-Human-Nonce, X-Human-Answer
// Doğrulama geçmezse 428 ve { code: "human_required" } döner; istemci yeni bilet alıp tekrar dener.
[AttributeUsage(AttributeTargets.Method)]
public sealed class RequireHumanAttribute(string purpose) : Attribute, IAsyncActionFilter
{
    public string Purpose { get; } = purpose;

    static ObjectResult Reply(int status, string message, string code, bool image = false) =>
        new(new { mesaj = message, code, image }) { StatusCode = status };

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var http = context.HttpContext;
        var human = http.RequestServices.GetRequiredService<HumanCheck>();
        var ip = http.Connection.RemoteIpAddress?.ToString();
        Guid? user = Guid.TryParse(http.User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;
        var ct = http.RequestAborted;

        // Kesin sınırlar: doğrulamayı geçse bile aşırı yükü engeller.
        if (Purpose == "listing" && user is Guid owner)
        {
            if (await human.RecentListings(owner, TimeSpan.FromHours(24), ct) >= HumanCheck.ListingDailyLimit)
                { context.Result = Reply(429, $"24 saat içinde en fazla {HumanCheck.ListingDailyLimit} ilan verebilirsin. Yarın tekrar dene.", "listing_daily_limit"); return; }
            if (await human.RecentListings(owner, TimeSpan.FromMinutes(2), ct) >= HumanCheck.ListingBurstLimit)
                { context.Result = Reply(429, "Çok hızlı ilan veriyorsun. Birkaç dakika bekleyip tekrar dene.", "listing_burst_limit"); return; }
        }
        if (Purpose == "feedback" && user is Guid sender && await human.RecentFeedback(sender, TimeSpan.FromHours(24), ct) >= HumanCheck.FeedbackDailyLimit)
            { context.Result = Reply(429, $"24 saat içinde en fazla {HumanCheck.FeedbackDailyLimit} geri bildirim gönderebilirsin.", "feedback_daily_limit"); return; }

        var h = http.Request.Headers;
        var result = await human.Verify(Purpose, h["X-Human-Token"].ToString(), h["X-Human-Nonce"].ToString(), h["X-Human-Answer"].ToString(), ip, user, ct);
        switch (result)
        {
            case HumanResult.Ok:
                var executed = await next();
                // Hatalı giriş denemeleri risk sayacını artırır; birkaç denemeden sonra görsel kod istenir.
                if (Purpose == "login" && executed.Result is ObjectResult { StatusCode: 401 }) human.RecordFailure(ip);
                return;
            case HumanResult.ImageRequired:
                context.Result = Reply(428, "Devam etmek için robot olmadığını doğrula.", "human_required", image: true);
                return;
            case HumanResult.WrongAnswer:
                human.RecordFailure(ip);
                context.Result = Reply(428, "Doğrulama kodu hatalı. Yeni kodu gir.", "human_wrong", image: true);
                return;
            default:
                if (result == HumanResult.Invalid) human.RecordFailure(ip);
                context.Result = Reply(428, "Güvenlik doğrulaması tamamlanamadı. Tekrar dene.", "human_required");
                return;
        }
    }
}
