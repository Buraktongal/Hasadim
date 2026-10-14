using Hasadim.Application;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hasadim.Api.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/admin")]
public class AdminController(
    MarketplaceService service) : ControllerBase
{
    // Yönetici, taslak veya incelemedeki ilanı da görüntüleyebilir.
    [HttpGet("listings/{id:guid}")]
    public async Task<IActionResult> ListingDetail(
        Guid id,
        CancellationToken ct)
    {
        return Ok(await service.Detail(id, ct));
    }

    // Onaydan sonra ilan ödeme bekler.
    [HttpPost("listings/{id:guid}/approve")]
    public async Task<IActionResult> Approve(
        Guid id,
        [FromBody] ListingWorkflowRequest request,
        CancellationToken ct)
    {
        await service.Approve(id, request, ct);

        return Ok(new
        {
            id,
            mesaj = "İlan onaylandı. Ödeme bekliyor."
        });
    }

    [HttpPost("listings/{id:guid}/request-changes")]
    public async Task<IActionResult> RequestChanges(
        Guid id,
        [FromBody] ListingChangesRequest request,
        CancellationToken ct)
    {
        await service.RequestChanges(id, request, ct);

        return Ok(new
        {
            id,
            mesaj = "İlan gerekçesiyle birlikte düzeltmeye gönderildi."
        });
    }

    [HttpGet("reports")]
    public async Task<IActionResult> Reports(
        CancellationToken ct)
    {
        return Ok(await service.Reports(ct));
    }

    [HttpPost("listings/{id:guid}/visibility")]
    public async Task<IActionResult> Visibility(
        Guid id,
        [FromQuery] bool hidden,
        CancellationToken ct)
    {
        await service.Visibility(id, hidden, ct);

        return Ok(new
        {
            id,
            hidden
        });
    }

    [HttpPost("reports/{id:guid}/resolve")]
    public async Task<IActionResult> Resolve(
        Guid id,
        CancellationToken ct)
    {
        await service.Resolve(id, ct);

        return Ok(new
        {
            mesaj = "Şikâyet kapatıldı."
        });
    }
}