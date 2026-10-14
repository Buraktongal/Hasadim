using Microsoft.AspNetCore.Identity;
namespace Hasadim.Infrastructure.Identity;
public class AppUser:IdentityUser<Guid>
{
 public AppUser(){Id=Guid.NewGuid();SecurityStamp=Guid.NewGuid().ToString("N");ConcurrencyStamp=Guid.NewGuid().ToString("N");LockoutEnabled=true;}
 public string DisplayName {get;set;}="";
 public string? AuthenticatorKey {get;set;}
}
