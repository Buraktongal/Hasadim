using System.Net;
var builder=WebApplication.CreateBuilder(args);
builder.WebHost.ConfigureKestrel(o=>o.Limits.MaxRequestBodySize=52000000);
var apiUrl=builder.Configuration["Api:BaseUrl"]??throw new InvalidOperationException("API adresi gerekli.");
if(!Uri.TryCreate(apiUrl,UriKind.Absolute,out var apiUri)||apiUri.Scheme!="https")throw new InvalidOperationException("API adresi HTTPS olmalıdır.");
builder.Services.AddHttpClient("api",c=>{c.BaseAddress=apiUri;c.Timeout=TimeSpan.FromSeconds(60);}).ConfigurePrimaryHttpMessageHandler(()=>new HttpClientHandler{UseCookies=false,AllowAutoRedirect=false});
// Site dev tunnel gibi localhost dışı bir adresten açıldığında Visual Studio'nun tarayıcı yenileme ve Browser Link
// betikleri bilgisayardaki localhost'a bağlanamaz ve konsolu hatayla doldurur. Bu süzgeç en dışta çalışır (listenin başına
// eklenir) ve o durumda bu betiklerin yerine boş bir dosya döndürür. Yalnızca geliştirmede; yayında bu betikler hiç yoktur.
if(builder.Environment.IsDevelopment())builder.Services.Insert(0,ServiceDescriptor.Transient<IStartupFilter,QuietDevToolsFilter>());
var app=builder.Build();if(!app.Environment.IsDevelopment())app.UseHsts();
// Geliştirmede Visual Studio'nun canlı yenileme ve Browser Link betikleri localhost'a bağlanır; yayında eklenmez.
var devConnect=app.Environment.IsDevelopment()?" ws://localhost:* wss://localhost:* http://localhost:* https://localhost:*":"";app.UseHttpsRedirection();
app.Use(async(c,next)=>{
 c.Response.Headers["X-Content-Type-Options"]="nosniff";c.Response.Headers["Referrer-Policy"]="strict-origin-when-cross-origin";
 // Google ve Apple ile giriş için yalnızca resmi betik/çerçeve adreslerine izin verilir.
 c.Response.Headers["Content-Security-Policy"]="default-src 'self'; script-src 'self' https://accounts.google.com/gsi/client https://appleid.cdn-apple.com; style-src 'self' https://accounts.google.com/gsi/style; img-src 'self' blob: https://appleid.cdn-apple.com https://tile.openstreetmap.org; connect-src 'self' https://accounts.google.com/gsi/ https://appleid.apple.com"+devConnect+"; frame-src https://accounts.google.com/gsi/ https://appleid.apple.com https://maps.google.com https://www.google.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://appleid.apple.com";
 // Kamera yalnızca bu sitede (ilan fotoğrafı çekmek için); mikrofon, konum ve ödeme kapalı.
 c.Response.Headers["Permissions-Policy"]="camera=(self), microphone=(), geolocation=(self), payment=(), usb=()";
 // Önbellek: API yanıtları kişisel veri içerebilir, hiç saklanmaz. Sayfa ve dosyalar için ayrıntı aşağıda (StaticAssets).
 c.Response.Headers["Cache-Control"]=c.Request.Path.StartsWithSegments("/api")?"no-store":"no-cache";await next();
});
app.MapMethods("/api/{**path}",["GET","POST","PUT","DELETE"],async(HttpContext c,IHttpClientFactory clients)=>{
 using var request=new HttpRequestMessage(new HttpMethod(c.Request.Method),c.Request.Path.Value+c.Request.QueryString.Value);
 if(c.Request.ContentLength>0||c.Request.Headers.ContainsKey("Transfer-Encoding")){
  request.Content=new StreamContent(c.Request.Body);if(c.Request.ContentType is not null)request.Content.Headers.TryAddWithoutValidation("Content-Type",c.Request.ContentType);
 }
 // Mobil uygulama: Authorization (Bearer anahtar), istemci başlığı ve cihaz adı için User-Agent da iletilir.
 foreach(var h in new[]{"Cookie","X-CSRF-TOKEN","Accept","Authorization","X-Hasadim-Client","User-Agent","Accept-Language","X-Human-Token","X-Human-Nonce","X-Human-Answer"})if(c.Request.Headers.TryGetValue(h,out var v))request.Headers.TryAddWithoutValidation(h,v.ToArray());
 request.Headers.TryAddWithoutValidation("X-Forwarded-For",c.Connection.RemoteIpAddress?.ToString());
 try{
  using var response=await clients.CreateClient("api").SendAsync(request,HttpCompletionOption.ResponseHeadersRead,c.RequestAborted);
  c.Response.StatusCode=(int)response.StatusCode;
  if(response.Headers.TryGetValues("Set-Cookie",out var cookies))foreach(var cookie in cookies)c.Response.Headers.Append("Set-Cookie",cookie);
  // Yönlendirme yalnızca mobil Google girişinde olur; yalnızca Google'a ve uygulamaya (hasadim://, exp://) giden adresler iletilir.
  if(response.Headers.Location is { } loc&&(loc.ToString().StartsWith("https://accounts.google.com/",StringComparison.Ordinal)||System.Text.RegularExpressions.Regex.IsMatch(loc.ToString(),"^(hasadim|exps?)://")))c.Response.Headers.Location=loc.ToString();
  if(response.Headers.TryGetValues("Retry-After",out var retry))c.Response.Headers["Retry-After"]=retry.ToArray();
  if(response.Headers.TryGetValues("WWW-Authenticate",out var challenge))c.Response.Headers["WWW-Authenticate"]=challenge.ToArray();
  if(response.Content.Headers.ContentType is not null)c.Response.ContentType=response.Content.Headers.ContentType.ToString();
  // İlan ve profil fotoğrafları kimlikle (fotoğraf numarası / ?v=dosya) adreslenir, içerikleri değişmez: tarayıcı bir hafta
  // saklar, aynı fotoğraf tekrar indirilmez. "private": yalnızca kullanıcının kendi tarayıcısı saklar, ara sunucular saklamaz.
  if(c.Request.Method=="GET"&&response.IsSuccessStatusCode&&response.Content.Headers.ContentType?.MediaType?.StartsWith("image/")==true&&StaticAssets.IsImmutablePhoto(c.Request))
   c.Response.Headers["Cache-Control"]="private, max-age=604800, immutable";
  await response.Content.CopyToAsync(c.Response.Body,c.RequestAborted);
 }catch(HttpRequestException){c.Response.StatusCode=502;await c.Response.WriteAsJsonAsync(new{mesaj="API bağlantısı kurulamadı. API projesini ve HTTPS sertifikasını kontrol edin."});}
});
// HTML sayfaları wwwroot/html içinde tutulur. Ana adres arama parametrelerini korur.
app.MapGet("/", (HttpContext c) =>
    Results.Redirect("/html/index.html" + c.Request.QueryString.Value));

// Eski yer imleri ve daha önce gönderilmiş e-posta bağlantıları çalışmaya devam etsin.
foreach (var file in Directory.EnumerateFiles(
    Path.Combine(app.Environment.WebRootPath, "html"), "*.html"))
{
    var page = Path.GetFileName(file);
    app.MapGet("/" + page, (HttpContext c) =>
        Results.Redirect("/html/" + page + c.Request.QueryString.Value));
}

// Sayfalardaki /js, /css, /img ve /data adreslerine dosyanın içerik özeti (?v=...) eklenir. Özetli dosyalar tarayıcıda
// bir yıl saklanır (ör. Türkiye haritası, il-ilçe listesi, ürün kataloğu bir kez iner); dosya değişince özet de değişir
// ve yeni sürüm hemen iner. Sayfaların kendisi her açılışta kısa bir kontrolle (304) tazelenir.
app.Use(async(c,next)=>{if(!await StaticAssets.TryServeHtml(c,app.Environment.WebRootPath))await next();});
app.UseStaticFiles(new StaticFileOptions{OnPrepareResponse=ctx=>ctx.Context.Response.Headers.CacheControl=StaticAssets.CachePolicy(ctx.Context.Request,ctx.File.Name)});
app.Run();

sealed class QuietDevToolsFilter:IStartupFilter
{
 public Action<IApplicationBuilder> Configure(Action<IApplicationBuilder> next)=>app=>
 {
  app.Use(async(c,go)=>
  {
   var path=c.Request.Path.Value??"";
   var tool=path.StartsWith("/_framework/aspnetcore-browser-refresh",StringComparison.OrdinalIgnoreCase)||path.StartsWith("/_vs/browserLink",StringComparison.OrdinalIgnoreCase);
   var host=c.Request.Host.Host;
   var local=host.Equals("localhost",StringComparison.OrdinalIgnoreCase)||host=="127.0.0.1"||host=="[::1]";
   if(tool&&!local){c.Response.ContentType="application/javascript; charset=utf-8";c.Response.Headers.CacheControl="no-store";await c.Response.WriteAsync("// Geliştirme araçları bu adreste kapalı.\n");return;}
   await go();
  });
  next(app);
 };
}

static class StaticAssets
{
 static readonly System.Collections.Concurrent.ConcurrentDictionary<string,(DateTime Time,long Size,string Hash)> hashes=new();
 static readonly System.Collections.Concurrent.ConcurrentDictionary<string,(DateTime Time,string Etag,byte[] Body)> pages=new();
 static readonly System.Text.RegularExpressions.Regex assetRef=new("(?<a>(?:src|href)=\")(?<p>/(?:js|css|img|data)/[A-Za-z0-9_./-]+\\.(?:js|css|svg|png|jpg|webp|json|ico))(?<b>\")",System.Text.RegularExpressions.RegexOptions.Compiled);
 static readonly System.Text.RegularExpressions.Regex photoPath=new("^/api/(?:meyve-ilanlari/[0-9a-fA-F-]{36}/photos/[0-9a-fA-F-]{36}|profiles/[0-9a-fA-F-]{36}/(?:photo|cover))$",System.Text.RegularExpressions.RegexOptions.Compiled);

 public static bool IsImmutablePhoto(HttpRequest r)
 {
  var path=r.Path.Value??"";
  if(!photoPath.IsMatch(path))return false;
  // Profil fotoğrafı ve kapak adresi yalnızca dosya sürümüyle (?v=) birlikte değişmez sayılır.
  return path.Contains("/photos/")||r.Query.ContainsKey("v");
 }

 public static string CachePolicy(HttpRequest r,string name)
 {
  if(r.Query.ContainsKey("v"))return "public, max-age=31536000, immutable";
  var ext=Path.GetExtension(name).ToLowerInvariant();
  // Özetsiz görseller bir gün saklanır; sonra kısa bir kontrolle tazelenir. Diğer her şey her seferinde kontrol edilir (304).
  return ext is ".png" or ".jpg" or ".webp" or ".svg" or ".ico" or ".woff2"?"public, max-age=86400, must-revalidate":"no-cache";
 }

 static string? Hash(string root,string url)
 {
  var full=Path.GetFullPath(Path.Combine(root,url.TrimStart('/')));
  if(!full.StartsWith(Path.GetFullPath(root),StringComparison.Ordinal)||!File.Exists(full))return null;
  var info=new FileInfo(full);
  if(hashes.TryGetValue(full,out var known)&&known.Time==info.LastWriteTimeUtc&&known.Size==info.Length)return known.Hash;
  var hash=Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(File.ReadAllBytes(full)))[..10].ToLowerInvariant();
  hashes[full]=(info.LastWriteTimeUtc,info.Length,hash);
  return hash;
 }

 // /html/*.html isteklerinde sayfa, varlık adresleri özetlenerek döndürülür (ETag ile; değişmediyse 304).
 public static async Task<bool> TryServeHtml(HttpContext c,string root)
 {
  var path=c.Request.Path.Value??"";
  if(!HttpMethods.IsGet(c.Request.Method)&&!HttpMethods.IsHead(c.Request.Method))return false;
  if(!path.StartsWith("/html/",StringComparison.Ordinal)||!path.EndsWith(".html",StringComparison.Ordinal)||path.Contains(".."))return false;
  var full=Path.GetFullPath(Path.Combine(root,path.TrimStart('/')));
  if(!full.StartsWith(Path.GetFullPath(root),StringComparison.Ordinal)||!File.Exists(full))return false;
  var time=File.GetLastWriteTimeUtc(full);
  if(!pages.TryGetValue(full,out var page)||page.Time!=time)
  {
   var html=await File.ReadAllTextAsync(full,c.RequestAborted);
   html=assetRef.Replace(html,m=>{var h=Hash(root,m.Groups["p"].Value);return h is null?m.Value:m.Groups["a"].Value+m.Groups["p"].Value+"?v="+h+m.Groups["b"].Value;});
   var body=System.Text.Encoding.UTF8.GetBytes(html);
   page=(time,"\""+Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(body))[..16]+"\"",body);
   pages[full]=page;
  }
  // Sayfadaki dosyalardan biri değişmiş olabilir: önbellekteki sayfa bu dosyaların özetleriyle yeniden doğrulanır.
  else
  {
   var html=System.Text.Encoding.UTF8.GetString(page.Body);
   foreach(System.Text.RegularExpressions.Match m in System.Text.RegularExpressions.Regex.Matches(html,"(/(?:js|css|img|data)/[A-Za-z0-9_./-]+)\\?v=([0-9a-f]{10})"))
    if(Hash(root,m.Groups[1].Value)!=m.Groups[2].Value){pages.TryRemove(full,out _);return await TryServeHtml(c,root);}
  }
  c.Response.Headers.ETag=page.Etag;
  c.Response.Headers.CacheControl="no-cache";
  if(c.Request.Headers.IfNoneMatch.ToString()==page.Etag){c.Response.StatusCode=304;return true;}
  c.Response.ContentType="text/html; charset=utf-8";
  c.Response.ContentLength=page.Body.Length;
  if(HttpMethods.IsGet(c.Request.Method))await c.Response.Body.WriteAsync(page.Body,c.RequestAborted);
  return true;
 }
}
