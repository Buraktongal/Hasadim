using Hasadim.Application;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
namespace Hasadim.Api.Controllers;
[ApiController,Authorize,Route("api/messages")]
public class MessagesController(MarketplaceService service):ControllerBase
{
 [HttpGet]public async Task<IActionResult> List(int page=1,CancellationToken ct=default){var data=await service.Messages(page,ct);return Ok(new{items=data.Take(50),hasMore=data.Count>50});}
 [HttpPost]public async Task<IActionResult> Send(MessageRequest r,CancellationToken ct){await service.Send(r,ct);return Ok();}
}
