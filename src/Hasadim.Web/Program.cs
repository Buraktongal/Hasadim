using System.Net;
var builder=WebApplication.CreateBuilder(args);
builder.WebHost.ConfigureKestrel(o=>o.Limits.MaxRequestBodySize=52000000);
var apiUrl=builder.Configuration["Api:BaseUrl"]??throw new InvalidOperationException("API adresi gerekli.");
if(!Uri.TryCreate(apiUrl,UriKind.Absolute,out var apiUri)||apiUri.Scheme!="https")throw new InvalidOperationException("API adresi HTTPS olmalıdır.");
builder.Services.AddHttpClient("api",c=>{c.BaseAddress=apiUri;c.Timeout=TimeSpan.FromSeconds(60);}).ConfigurePrimaryHttpMessageHandler(()=>new HttpClientHandler{UseCookies=false,AllowAutoRedirect=false});
var app=builder.Build();if(!app.Environment.IsDevelopment())app.UseHsts();app.UseHttpsRedirection();
app.Use(async(c,next)=>{
 c.Response.Headers["X-Content-Type-Options"]="nosniff";c.Response.Headers["Referrer-Policy"]="no-referrer";
 c.Response.Headers["Content-Security-Policy"]="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";
 c.Response.Headers["Cache-Control"]="no-store";await next();
});
app.MapMethods("/api/{**path}",["GET","POST","PUT","DELETE"],async(HttpContext c,IHttpClientFactory clients)=>{
 using var request=new HttpRequestMessage(new HttpMethod(c.Request.Method),c.Request.Path.Value+c.Request.QueryString.Value);
 if(c.Request.ContentLength>0||c.Request.Headers.ContainsKey("Transfer-Encoding")){
  request.Content=new StreamContent(c.Request.Body);if(c.Request.ContentType is not null)request.Content.Headers.TryAddWithoutValidation("Content-Type",c.Request.ContentType);
 }
 foreach(var h in new[]{"Cookie","X-CSRF-TOKEN","Accept"})if(c.Request.Headers.TryGetValue(h,out var v))request.Headers.TryAddWithoutValidation(h,v.ToArray());
 request.Headers.TryAddWithoutValidation("X-Forwarded-For",c.Connection.RemoteIpAddress?.ToString());
 try{
  using var response=await clients.CreateClient("api").SendAsync(request,HttpCompletionOption.ResponseHeadersRead,c.RequestAborted);
  c.Response.StatusCode=(int)response.StatusCode;
  if(response.Headers.TryGetValues("Set-Cookie",out var cookies))foreach(var cookie in cookies)c.Response.Headers.Append("Set-Cookie",cookie);
  if(response.Headers.TryGetValues("Retry-After",out var retry))c.Response.Headers["Retry-After"]=retry.ToArray();
  if(response.Content.Headers.ContentType is not null)c.Response.ContentType=response.Content.Headers.ContentType.ToString();
  await response.Content.CopyToAsync(c.Response.Body,c.RequestAborted);
 }catch(HttpRequestException){c.Response.StatusCode=502;await c.Response.WriteAsJsonAsync(new{mesaj="API bağlantısı kurulamadı. API projesini ve HTTPS sertifikasını kontrol edin."});}
});
app.UseDefaultFiles();app.UseStaticFiles();app.Run();
