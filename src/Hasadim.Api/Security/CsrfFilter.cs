using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
namespace Hasadim.Api.Security;
public class CsrfFilter(IAntiforgery antiforgery):IAsyncAuthorizationFilter
{
 public async Task OnAuthorizationAsync(AuthorizationFilterContext c)
 {
  var m=c.HttpContext.Request.Method;if(HttpMethods.IsGet(m)||HttpMethods.IsHead(m)||HttpMethods.IsOptions(m))return;
  try{await antiforgery.ValidateRequestAsync(c.HttpContext);}catch(AntiforgeryValidationException){c.Result=new BadRequestObjectResult(new{mesaj="Oturum doğrulanamadı. Sayfayı yenileyin."});}
 }
}
