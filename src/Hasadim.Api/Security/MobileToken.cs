using System.Security.Claims;
using System.Text.Encodings.Web;
using Hasadim.Infrastructure.Identity;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

namespace Hasadim.Api.Security;

// Mobil uygulama girişi: "Authorization: Bearer hsa_..." başlığı.
// Tarayıcı çerezle, mobil uygulama bu anahtarla giriş yapar; ikisi aynı denetleyicileri kullanır.
public class MobileTokenHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder,
    MobileTokenStore tokens) : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string Scheme = "HasadimMobile";
    public const string SessionClaim = "hasadim:sid";
    // Tarayıcı istekleri bu şemaya (çerez) gider; Bearer başlığı olan istekler mobil şemaya.
    public const string PolicyScheme = "Hasadim";

    public static bool HasBearer(HttpRequest request) =>
        request.Headers.Authorization.ToString().StartsWith("Bearer ", StringComparison.Ordinal);

    public static Guid? SessionOf(ClaimsPrincipal? user) =>
        user?.Identity?.AuthenticationType == Scheme && Guid.TryParse(user.FindFirstValue(SessionClaim), out var id) ? id : null;

    public static bool IsMobile(ClaimsPrincipal? user) => user?.Identity?.AuthenticationType == Scheme && user.Identity.IsAuthenticated;

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!HasBearer(Request)) return AuthenticateResult.NoResult();
        var token = Request.Headers.Authorization.ToString()["Bearer ".Length..].Trim();
        var identity = await tokens.Validate(token, Context.RequestAborted);
        if (identity is null) return AuthenticateResult.Fail("Geçersiz veya süresi dolmuş anahtar.");
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, identity.UserId.ToString()),
            new(ClaimTypes.Name, identity.UserName),
            new(SessionClaim, identity.SessionId.ToString())
        };
        claims.AddRange(identity.Roles.Select(r => new Claim(ClaimTypes.Role, r)));
        var principal = new ClaimsPrincipal(new ClaimsIdentity(claims, Scheme));
        return AuthenticateResult.Success(new AuthenticationTicket(principal, Scheme));
    }

    protected override Task HandleChallengeAsync(AuthenticationProperties properties)
    {
        Response.StatusCode = 401;
        Response.Headers.WWWAuthenticate = "Bearer error=\"invalid_token\"";
        return Task.CompletedTask;
    }

    protected override Task HandleForbiddenAsync(AuthenticationProperties properties)
    {
        Response.StatusCode = 403;
        return Task.CompletedTask;
    }
}

// Mobil uygulamanın giriş öncesi (anonim) çağırdığı uçlar. Bu uçlar çerez oluşturmaz;
// "X-Hasadim-Client: mobile" başlığıyla gelen isteklerde CSRF jetonu istenmez.
// Özel başlık, başka bir siteden tarayıcıyla gönderilemez (CORS ön kontrolü engeller).
[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class)]
public sealed class MobileEndpointAttribute : Attribute
{
    public const string Header = "X-Hasadim-Client";
    public const string Value = "mobile";
}
