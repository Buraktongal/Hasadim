using Hasadim.Application;
using Hasadim.Api.Security;
using Hasadim.DependencyInjection;
using Hasadim.Infrastructure.Database;
using Hasadim.Infrastructure.Identity;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using System.Threading.RateLimiting;
var hostArgs = args.Where(x => x != "--migrate" && x != "--bootstrap-admin").ToArray();
var builder = WebApplication.CreateBuilder(hostArgs);
const bool confirm = true;
builder.Services.AddHasadim(confirm);
builder.Services.AddHttpContextAccessor(); builder.Services.AddScoped<ICurrentUser, CurrentUser>(); builder.Services.AddScoped<AccountMail>(); builder.Services.AddScoped<RegistrationStore>();
var keys = Path.Combine(builder.Environment.ContentRootPath, "App_Data", "keys"); Directory.CreateDirectory(keys);
builder.Services.AddDataProtection().SetApplicationName("Hasadim.Api.v2").PersistKeysToFileSystem(new DirectoryInfo(keys));
builder.Services.ConfigureApplicationCookie(o =>
{
    o.Cookie.Name = "__Host-Hasadim"; o.Cookie.Path = "/"; o.Cookie.HttpOnly = true; o.Cookie.SecurePolicy = CookieSecurePolicy.Always; o.Cookie.SameSite = SameSiteMode.Lax;
    o.ExpireTimeSpan = TimeSpan.FromMinutes(30); o.SlidingExpiration = true;
    o.Events.OnRedirectToLogin = c => { c.Response.StatusCode = 401; return Task.CompletedTask; };
    o.Events.OnRedirectToAccessDenied = c => { c.Response.StatusCode = 403; return Task.CompletedTask; };
});
builder.Services.Configure<Microsoft.AspNetCore.Authentication.Cookies.CookieAuthenticationOptions>(IdentityConstants.TwoFactorUserIdScheme, o => { o.Cookie.HttpOnly = true; o.Cookie.SecurePolicy = CookieSecurePolicy.Always; o.Cookie.SameSite = SameSiteMode.Strict; o.ExpireTimeSpan = TimeSpan.FromMinutes(5); });
builder.Services.AddAntiforgery(o => { o.HeaderName = "X-CSRF-TOKEN"; o.Cookie.SecurePolicy = CookieSecurePolicy.Always; o.Cookie.SameSite = SameSiteMode.Strict; });
builder.Services.AddControllers(o => o.Filters.Add<CsrfFilter>());
builder.Services.Configure<ForwardedHeadersOptions>(o => o.ForwardedHeaders = ForwardedHeaders.XForwardedFor);
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = 429;
    o.AddPolicy("auth", c => RateLimitPartition.GetFixedWindowLimiter(c.Connection.RemoteIpAddress?.ToString() ?? "unknown", _ => new FixedWindowRateLimiterOptions { PermitLimit = 30, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
    o.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(c => RateLimitPartition.GetFixedWindowLimiter(c.Connection.RemoteIpAddress?.ToString() ?? "unknown", _ => new FixedWindowRateLimiterOptions { PermitLimit = 180, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
});
var app = builder.Build();
if (!app.Environment.IsDevelopment() && !args.Contains("--migrate") && !args.Contains("--bootstrap-admin") && string.IsNullOrWhiteSpace(builder.Configuration["Mail:Host"])) throw new InvalidOperationException("Production için SMTP ve e-posta doğrulaması gereklidir.");
if (args.Contains("--migrate"))
{
    using var scope = app.Services.CreateScope(); await scope.ServiceProvider.GetRequiredService<MigrationRunner>().Run(app.Environment.IsDevelopment()); Console.WriteLine("Migration tamamlandı."); return;
}
if (app.Environment.IsDevelopment() || args.Contains("--bootstrap-admin"))
{
    using var scope = app.Services.CreateScope(); if (app.Environment.IsDevelopment()) await scope.ServiceProvider.GetRequiredService<MigrationRunner>().Run(true);
    var roles = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<Guid>>>(); if (!await roles.RoleExistsAsync("Admin")) { var rr = await roles.CreateAsync(new IdentityRole<Guid> { Id = Guid.NewGuid(), Name = "Admin" }); if (!rr.Succeeded) throw new InvalidOperationException("Rol oluşturulamadı."); }
    var email = builder.Configuration["BootstrapAdmin:Email"]; var password = builder.Configuration["BootstrapAdmin:Password"];
    if (args.Contains("--bootstrap-admin") && (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))) throw new InvalidOperationException("BootstrapAdmin ayarları gerekli.");
    if (!string.IsNullOrWhiteSpace(email) && !string.IsNullOrWhiteSpace(password))
    {
        var users = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>(); var u = await users.FindByEmailAsync(email);
        if (u is null) { u = new AppUser { UserName = email, Email = email, DisplayName = "Hasadım Yönetim", EmailConfirmed = true }; var r = await users.CreateAsync(u, password); if (!r.Succeeded) throw new InvalidOperationException(string.Join(";", r.Errors.Select(x => x.Description))); var rr = await users.AddToRoleAsync(u, "Admin"); if (!rr.Succeeded) throw new InvalidOperationException("Yönetici rolü atanamadı."); }
        else if (!await users.IsInRoleAsync(u, "Admin")) throw new InvalidOperationException("Yönetici için kullanılmamış bir e-posta seçin.");
    }
}
if (args.Contains("--bootstrap-admin")) { Console.WriteLine("Yönetici hesabı hazır."); return; }
app.UseForwardedHeaders();
app.UseExceptionHandler(handler => handler.Run(async c =>
{
    var error = c.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>()?.Error;
    c.Response.StatusCode = error is AppException a ? a.Status : 500;
    await c.Response.WriteAsJsonAsync(new { mesaj = error is AppException e ? e.Message : "İşlem tamamlanamadı. Sunucu kayıtlarını kontrol edin." });
}));
if (!app.Environment.IsDevelopment()) app.UseHsts(); app.UseHttpsRedirection();
app.Use(async (c, next) => { c.Response.Headers["Cache-Control"] = "no-store"; c.Response.Headers["X-Content-Type-Options"] = "nosniff"; await next(); });
app.UseRouting(); app.UseAuthentication(); app.UseAuthorization(); app.UseRateLimiter(); app.MapControllers();
app.MapGet("/api/csrf", (IAntiforgery a, HttpContext c) => Results.Ok(new { token = a.GetAndStoreTokens(c).RequestToken }));
app.MapGet("/api/health", () => Results.Ok(new { status = "ok" })); app.Run();
