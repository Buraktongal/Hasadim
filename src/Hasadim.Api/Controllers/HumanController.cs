using System.Security.Claims;
using Hasadim.Infrastructure.Security;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Hasadim.Api.Controllers;

// İnsan doğrulama bileti. GET olduğu için CSRF gerekmez; bilet tek başına bir işlem yapmaz.
[ApiController, Route("api/human"), EnableRateLimiting("auth")]
public class HumanController(HumanCheck human) : ControllerBase
{
    [HttpGet("challenge")]
    public async Task<IActionResult> Challenge([FromQuery] string purpose, CancellationToken ct)
    {
        if (!HumanCheck.Purposes.Contains(purpose)) return BadRequest(new { mesaj = "Bilinmeyen doğrulama türü." });
        Guid? user = Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;
        var c = await human.Create(purpose, HttpContext.Connection.RemoteIpAddress?.ToString(), user, ct);
        return Ok(new { token = c.Token, salt = c.Salt, difficulty = c.Difficulty, image = c.Image });
    }
}
