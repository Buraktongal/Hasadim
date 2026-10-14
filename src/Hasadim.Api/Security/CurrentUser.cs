using System.Security.Claims;
using Hasadim.Application;
namespace Hasadim.Api.Security;
public class CurrentUser(IHttpContextAccessor accessor):ICurrentUser
{
 public Guid? Id=>Guid.TryParse(accessor.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier),out var id)?id:null;
 public bool IsAdmin=>accessor.HttpContext?.User.IsInRole("Admin")==true;
}
