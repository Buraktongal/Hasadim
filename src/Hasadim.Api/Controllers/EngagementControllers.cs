using Hasadim.Application;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hasadim.Api.Controllers;

// Teklifler: alıcı teklif verir; satıcı kabul eder veya reddeder; alıcı geri çekebilir.
[ApiController, Authorize, Route("api/offers")]
public class OffersController(EngagementService service) : ControllerBase
{
    // kutu=gelen (bana gelen teklifler) veya kutu=giden (verdiğim teklifler)
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string kutu = "gelen", [FromQuery] int page = 1, CancellationToken ct = default)
    {
        if (kutu is not ("gelen" or "giden")) return BadRequest(new { mesaj = "Kutu gelen veya giden olmalı." });
        var items = await service.Offers(kutu == "gelen", page, ct);
        return Ok(new { items });
    }

    [HttpPost]
    public async Task<IActionResult> Create(OfferRequest request, CancellationToken ct)
    {
        var id = await service.MakeOffer(request, ct);
        return Ok(new { id, mesaj = "Teklifin satıcıya iletildi." });
    }

    [HttpPost("{id:guid}/accept")]
    public async Task<IActionResult> Accept(Guid id, OfferReplyRequest request, CancellationToken ct)
    {
        await service.RespondOffer(id, true, request, ct);
        return Ok(new { mesaj = "Teklifi kabul ettin. Alıcıyla mesajlaşarak satışı tamamlayabilirsin." });
    }

    [HttpPost("{id:guid}/reject")]
    public async Task<IActionResult> Reject(Guid id, OfferReplyRequest request, CancellationToken ct)
    {
        await service.RespondOffer(id, false, request, ct);
        return Ok(new { mesaj = "Teklif reddedildi." });
    }

    [HttpPost("{id:guid}/withdraw")]
    public async Task<IActionResult> Withdraw(Guid id, CancellationToken ct)
    {
        await service.WithdrawOffer(id, ct);
        return Ok(new { mesaj = "Teklifin geri çekildi." });
    }
}

[ApiController, Authorize, Route("api/notifications")]
public class NotificationsController(EngagementService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] int page = 1, CancellationToken ct = default)
    {
        var data = await service.Notifications(page, ct);
        return Ok(new { items = data.Take(30), hasMore = data.Count > 30 });
    }

    // Üst menüdeki zil ve teklif sayıları.
    [HttpGet("count")]
    public async Task<IActionResult> Count(CancellationToken ct) => Ok(await service.Counts(ct));

    [HttpPost("read")]
    public async Task<IActionResult> ReadAll(CancellationToken ct)
    {
        await service.Read(null, ct);
        return Ok();
    }

    [HttpPost("{id:guid}/read")]
    public async Task<IActionResult> Read(Guid id, CancellationToken ct)
    {
        await service.Read(id, ct);
        return Ok();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await service.DeleteNotification(id, ct);
        return Ok();
    }
}

[ApiController, Authorize, Route("api/saved-searches")]
public class SavedSearchesController(EngagementService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct) => Ok(await service.SavedSearches(ct));

    [HttpPost]
    public async Task<IActionResult> Create(SavedSearchRequest request, CancellationToken ct)
    {
        var id = await service.SaveSearch(request, ct);
        return Ok(new { id, mesaj = "Arama kaydedildi." });
    }

    [HttpPost("{id:guid}/notify")]
    public async Task<IActionResult> Notify(Guid id, [FromQuery] bool on, CancellationToken ct)
    {
        await service.SetSavedSearchNotify(id, on, ct);
        return Ok();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await service.DeleteSavedSearch(id, ct);
        return Ok();
    }
}

[ApiController, Authorize, Route("api/blocks")]
public class BlocksController(EngagementService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct) => Ok(await service.Blocks(ct));

    [HttpPost("{userId:guid}")]
    public async Task<IActionResult> Block(Guid userId, CancellationToken ct)
    {
        await service.Block(userId, ct);
        return Ok(new { mesaj = "Üye engellendi. İlanlarını görmeyecek, birbirinize mesaj ve teklif gönderemeyeceksiniz." });
    }

    [HttpDelete("{userId:guid}")]
    public async Task<IActionResult> Unblock(Guid userId, CancellationToken ct)
    {
        await service.Unblock(userId, ct);
        return Ok(new { mesaj = "Engel kaldırıldı." });
    }
}

[ApiController, Authorize, Route("api/me/settings")]
public class SettingsController(EngagementService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct) => Ok(await service.Settings(ct));

    [HttpPut]
    public async Task<IActionResult> Save(UserSettings settings, CancellationToken ct) => Ok(await service.SaveSettings(settings, ct));
}
