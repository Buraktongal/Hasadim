using Hasadim.Application;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Hasadim.Infrastructure.Repositories;
using System.ComponentModel.DataAnnotations;
namespace Hasadim.Api.Controllers;
[ApiController,Authorize,Route("api/messages")]
public class MessagesController(MarketplaceService service,MessageNotifications notifications,ICurrentUser current):ControllerBase
{
 [HttpGet]public async Task<IActionResult> List(int page=1,CancellationToken ct=default){var data=await service.Messages(page,ct);return Ok(new{items=data.Take(50),hasMore=data.Count>50});}
 [HttpPost]public async Task<IActionResult> Send(MessageRequest r,CancellationToken ct){await service.Send(r,ct);return Ok();}
 [HttpGet("notifications")]public async Task<IActionResult> Notifications(CancellationToken ct)=>Ok(await notifications.State(current.Id ?? throw new AppException(401,"Giriş yapın."),ct));
 [HttpPost("read")]public async Task<IActionResult> Read(ReadMessagesRequest request,CancellationToken ct){await notifications.Read(current.Id ?? throw new AppException(401,"Giriş yapın."),request.Ids,ct);return Ok();}
}
public class ReadMessagesRequest
{
 [Required,MinLength(1),MaxLength(100)]public Guid[] Ids {get;set;}=[];
}
