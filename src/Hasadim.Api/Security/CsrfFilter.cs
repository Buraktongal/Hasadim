using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
namespace Hasadim.Api.Security;
// Tarayıcıdan gelen değiştirici isteklerde CSRF jetonu zorunludur.
// İstisnalar: (1) mobil anahtarla (Bearer) kimliği doğrulanmış istekler — tarayıcı bu başlığı
// kendiliğinden eklemez; (2) [MobileEndpoint] uçlarına mobil istemci başlığıyla gelen istekler.
public class CsrfFilter(IAntiforgery antiforgery):IAsyncAuthorizationFilter
{
 public async Task OnAuthorizationAsync(AuthorizationFilterContext c)
 {
  var m=c.HttpContext.Request.Method;if(HttpMethods.IsGet(m)||HttpMethods.IsHead(m)||HttpMethods.IsOptions(m))return;
  if(MobileTokenHandler.IsMobile(c.HttpContext.User))return;
  if(c.ActionDescriptor.EndpointMetadata.OfType<MobileEndpointAttribute>().Any()
     &&c.HttpContext.Request.Headers[MobileEndpointAttribute.Header].ToString()==MobileEndpointAttribute.Value
     &&!c.HttpContext.Request.Headers.ContainsKey("Cookie"))return;
  try{await antiforgery.ValidateRequestAsync(c.HttpContext);}catch(AntiforgeryValidationException){c.Result=new BadRequestObjectResult(new{mesaj="Oturum doğrulanamadı. Sayfayı yenileyin."});}
 }
}
