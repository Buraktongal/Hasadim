using System.ComponentModel.DataAnnotations;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Hasadim.Api.Security;
using Hasadim.Infrastructure.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Caching.Memory;

namespace Hasadim.Api.Controllers;

public class MobileLoginRequest { [Required, EmailAddress, StringLength(256)] public string Email { get; set; } = ""; [Required, StringLength(128)] public string Password { get; set; } = ""; }
public class MobileTwoFactorRequest { [Required, StringLength(2048)] public string Ticket { get; set; } = ""; [Required, StringLength(100)] public string Code { get; set; } = ""; public bool Recovery { get; set; } }
public class MobileGoogleFinishRequest { [Required, StringLength(2048)] public string Code { get; set; } = ""; [Required, StringLength(128, MinimumLength = 43)] public string Verifier { get; set; } = ""; }
public class MobileRefreshRequest { [Required, StringLength(100)] public string RefreshToken { get; set; } = ""; }

// Mobil uygulama girişi. Çerez yerine kısa ömürlü erişim anahtarı + dönen yenileme anahtarı verir.
// Her giriş Hesap güvenliği sayfasında ayrı bir oturum olarak görünür ve oradan kapatılabilir.
// Kayıt, şifre sıfırlama ve SMS kodu isteme için mevcut /api/account uçları kullanılır.
[ApiController, Route("api/mobile/auth"), EnableRateLimiting("auth"), MobileEndpoint]
public class MobileAuthController(
    UserManager<AppUser> users,
    SignInManager<AppUser> signIn,
    SessionStore sessions,
    MobileTokenStore tokens,
    ExternalTokenValidator external,
    PhoneChallengeStore phones,
    IDataProtectionProvider protection,
    IConfiguration config,
    IMemoryCache cache,
    ILogger<MobileAuthController> logger) : ControllerBase
{
    const string Failed = "E-posta veya şifre hatalı. Şifrede büyük/küçük harf ve Türkçe karakterlere (ı/i, ö/o) dikkat et.";
    ITimeLimitedDataProtector TwoFactorTickets => protection.CreateProtector("Hasadim.Mobile.TwoFactor.v1").ToTimeLimitedDataProtector();
    string UserAgent => Request.Headers.UserAgent.ToString();

    async Task<object> UserInfo(AppUser u) => new
    {
        u.Id, u.DisplayName, u.Email, u.TwoFactorEnabled,
        isAdmin = await users.IsInRoleAsync(u, "Admin"),
        hasPassword = await users.HasPasswordAsync(u)
    };

    async Task<IActionResult> Issue(AppUser u, string amr, object? extra = null)
    {
        var ct = HttpContext.RequestAborted;
        var sid = await sessions.Start(u.Id, amr, UserAgent, ct);
        var t = await tokens.Issue(sid, u.Id, await users.GetSecurityStampAsync(u), ct);
        return Ok(new
        {
            accessToken = t.AccessToken, accessExpiresAt = t.AccessExpiresAt,
            refreshToken = t.RefreshToken, refreshExpiresAt = t.RefreshExpiresAt,
            user = await UserInfo(u), extra
        });
    }

    // Kilit ve e-posta doğrulaması (çerezli girişle aynı kurallar).
    async Task<IActionResult?> Blocked(AppUser u)
    {
        if (await users.IsLockedOutAsync(u) && u.LockoutEnd > DateTimeOffset.UtcNow.AddYears(50)) return Unauthorized(new { mesaj = "Bu hesap Hasadım yönetimi tarafından askıya alındı." });
        if (await users.IsLockedOutAsync(u)) return Unauthorized(new { mesaj = "Çok fazla hatalı deneme yapıldı. 15 dakika sonra tekrar dene veya şifreni yenile." });
        if (!await signIn.CanSignInAsync(u)) return Unauthorized(new { mesaj = "Giriş için önce e-posta adresini doğrulamalısın." });
        return null;
    }

    [HttpPost("login"), RequireHuman("login")]
    public async Task<IActionResult> Login(MobileLoginRequest r)
    {
        var u = await users.FindByEmailAsync(r.Email.Trim());
        if (u is null) return Unauthorized(new { mesaj = Failed });
        // lockoutOnFailure: 5 hatalı denemede hesap 15 dakika kilitlenir.
        var result = await signIn.CheckPasswordSignInAsync(u, r.Password, lockoutOnFailure: true);
        if (result.IsLockedOut && u.LockoutEnd > DateTimeOffset.UtcNow.AddYears(50))
            return Unauthorized(new { mesaj = "Bu hesap Hasadım yönetimi tarafından askıya alındı. Ayrıntı için destek ekibiyle iletişime geç." });
        if (result.IsLockedOut)
        {
            await sessions.Failed(u.Id, UserAgent, "Hesap geçici olarak kilitlendi", HttpContext.RequestAborted);
            return Unauthorized(new { mesaj = "Çok fazla hatalı deneme yapıldı. 15 dakika sonra tekrar dene veya şifreni yenile." });
        }
        if (result.IsNotAllowed) return Unauthorized(new { mesaj = "Giriş için önce e-posta adresini doğrulamalısın." });
        if (!result.Succeeded)
        {
            await sessions.Failed(u.Id, UserAgent, "Hatalı şifre", HttpContext.RequestAborted);
            return Unauthorized(new { mesaj = Failed });
        }
        if (u.TwoFactorEnabled)
        {
            // 5 dakika geçerli, şifreli ve imzalı bir bilet; içinde kullanıcı ve güvenlik damgası var.
            var ticket = TwoFactorTickets.Protect(u.Id + "|" + await users.GetSecurityStampAsync(u), TimeSpan.FromMinutes(5));
            return Ok(new { requiresTwoFactor = true, ticket });
        }
        return await Issue(u, "pwd");
    }

    [HttpPost("two-factor")]
    public async Task<IActionResult> TwoFactor(MobileTwoFactorRequest r)
    {
        const string invalid = "Kod geçersiz veya giriş süresi doldu.";
        string payload;
        try { payload = TwoFactorTickets.Unprotect(r.Ticket); }
        catch (System.Security.Cryptography.CryptographicException) { return Unauthorized(new { mesaj = invalid }); }
        var parts = payload.Split('|', 2);
        var u = parts.Length == 2 ? await users.FindByIdAsync(parts[0]) : null;
        if (u is null || !u.TwoFactorEnabled || !string.Equals(await users.GetSecurityStampAsync(u), parts[1], StringComparison.Ordinal))
            return Unauthorized(new { mesaj = invalid });
        if (await Blocked(u) is { } blocked) return blocked;
        var ok = r.Recovery
            ? (await users.RedeemTwoFactorRecoveryCodeAsync(u, r.Code.Trim())).Succeeded
            : await users.VerifyTwoFactorTokenAsync(u, TokenOptions.DefaultAuthenticatorProvider, r.Code.Replace(" ", ""));
        if (!ok)
        {
            await users.AccessFailedAsync(u);
            await sessions.Failed(u.Id, UserAgent, "Hatalı doğrulama kodu", HttpContext.RequestAborted);
            return Unauthorized(new { mesaj = invalid });
        }
        await users.ResetAccessFailedCountAsync(u);
        return await Issue(u, "mfa");
    }

    // Google veya Apple: uygulamada alınan kimlik jetonu sunucuda doğrulanır (imza, alıcı, süre, nonce).
    [HttpPost("external")]
    public async Task<IActionResult> External(ExternalLoginRequest r, CancellationToken ct)
    {
        var id = await external.Validate(r.Provider, r.IdToken, r.Nonce, ct);
        return await SignInExternal(id, r.DisplayName);
    }

    async Task<IActionResult> SignInExternal(ExternalIdentity id, string? displayName)
    {
        var u = await users.FindByLoginAsync(id.Provider, id.Subject);
        var created = false;
        if (u is null)
        {
            if (string.IsNullOrWhiteSpace(id.Email) || !id.EmailVerified) return BadRequest(new { mesaj = id.Provider + " hesabında doğrulanmış bir e-posta bulunamadı." });
            u = await users.FindByEmailAsync(id.Email);
            if (u is null)
            {
                var name = (displayName ?? id.Name ?? id.Email.Split('@')[0]).Trim();
                if (name.Length < 2) name = "Hasadım kullanıcısı";
                if (name.Length > 100) name = name[..100];
                u = new AppUser { UserName = id.Email, Email = id.Email, EmailConfirmed = true, DisplayName = name };
                var result = await users.CreateAsync(u);
                if (!result.Succeeded) return BadRequest(new { mesaj = string.Join(" ", result.Errors.Select(x => x.Description)) });
                created = true;
            }
            // Doğrulanmamış (yarım kalmış) bir hesaba bağlanmaz; önceden ele geçirme riskini önler.
            else if (!u.EmailConfirmed) return BadRequest(new { mesaj = "Bu e-postayla doğrulanmamış bir hesap var. Önce e-posta ve şifreyle giriş yapıp e-postanı doğrula." });
            var link = await users.AddLoginAsync(u, new UserLoginInfo(id.Provider, id.Subject, id.Provider));
            if (!link.Succeeded) return BadRequest(new { mesaj = string.Join(" ", link.Errors.Select(x => x.Description)) });
        }
        if (await Blocked(u) is { } blocked) return blocked;
        if (u.TwoFactorEnabled) return Unauthorized(new { mesaj = "Bu hesapta iki adımlı doğrulama açık. E-posta ve şifrenle giriş yap." });
        return await Issue(u, id.Provider.ToLowerInvariant(), new { created });
    }

    // ---------- Google ile giriş (tarayıcı üzerinden; Expo Go dahil her yerde çalışır) ----------
    // 1) Uygulama sistem tarayıcısında /google/start'ı açar (PKCE: yalnızca doğrulayıcının özeti gönderilir).
    // 2) Google, kullanıcıyı sunucudaki /google/callback'e döndürür; sunucu kodu gizli anahtarıyla jetona çevirip doğrular.
    // 3) Sunucu, 2 dakikalık tek kullanımlık bir kodla uygulamaya döner (hasadim:// veya Expo Go'da exp://).
    // 4) Uygulama bu kodu doğrulayıcıyla birlikte /google/finish'e gönderir ve oturum anahtarlarını alır.
    //    Kodu yakalayan başka bir uygulama, doğrulayıcıyı bilmediği için kullanamaz.
    static readonly HttpClient GoogleHttp = new() { Timeout = TimeSpan.FromSeconds(15) };
    static readonly Regex AppReturn = new(@"^(hasadim|exps?)://[A-Za-z0-9._~:/?#@!$&'()*+,;=%-]{1,280}$", RegexOptions.CultureInvariant);
    static readonly Regex Challenge = new(@"^[A-Za-z0-9_-]{43}$", RegexOptions.CultureInvariant);
    ITimeLimitedDataProtector GoogleState => protection.CreateProtector("Hasadim.Mobile.GoogleState.v1").ToTimeLimitedDataProtector();
    ITimeLimitedDataProtector GoogleCode => protection.CreateProtector("Hasadim.Mobile.GoogleCode.v1").ToTimeLimitedDataProtector();
    string? GoogleSecret => config["Auth:Google:ClientSecret"] is { Length: > 0 } s ? s : null;
    string? GoogleRedirect => config["Auth:Google:MobileRedirectUri"] is { Length: > 0 } s ? s : null;
    public static bool GoogleWebFlowEnabled(IConfiguration c, ExternalTokenValidator e) =>
        e.WebClientId("Google") is not null && !string.IsNullOrWhiteSpace(c["Auth:Google:ClientSecret"]) && !string.IsNullOrWhiteSpace(c["Auth:Google:MobileRedirectUri"]);

    sealed record GoogleStateData(string Challenge, string Return, string Nonce);
    sealed record GoogleCodeData(string Id, string Challenge, string Subject, string? Email, bool EmailVerified, string? Name);

    static string BackTo(string returnUrl, string key, string value) =>
        returnUrl + (returnUrl.Contains('?') ? "&" : "?") + key + "=" + Uri.EscapeDataString(value);

    [HttpGet("google/start")]
    public IActionResult GoogleStart([FromQuery] string challenge, [FromQuery(Name = "return")] string returnUrl)
    {
        if (!GoogleWebFlowEnabled(config, external)) return BadRequest(new { mesaj = "Google ile giriş henüz yapılandırılmadı." });
        if (!Challenge.IsMatch(challenge ?? "") || !AppReturn.IsMatch(returnUrl ?? "")) return BadRequest(new { mesaj = "Geçersiz istek." });
        var nonce = WebEncoders.Base64UrlEncode(RandomNumberGenerator.GetBytes(24));
        var state = GoogleState.Protect(JsonSerializer.Serialize(new GoogleStateData(challenge, returnUrl, nonce)), TimeSpan.FromMinutes(10));
        var url = QueryHelpers.AddQueryString("https://accounts.google.com/o/oauth2/v2/auth", new Dictionary<string, string?>
        {
            ["client_id"] = external.WebClientId("Google"), ["redirect_uri"] = GoogleRedirect, ["response_type"] = "code",
            ["scope"] = "openid email profile", ["state"] = state, ["nonce"] = nonce, ["prompt"] = "select_account"
        });
        return Redirect(url);
    }

    [HttpGet("google/callback")]
    public async Task<IActionResult> GoogleCallback([FromQuery] string? code, [FromQuery] string? state, [FromQuery] string? error, CancellationToken ct)
    {
        GoogleStateData? s;
        try { s = JsonSerializer.Deserialize<GoogleStateData>(GoogleState.Unprotect(state ?? "")); }
        catch { return BadRequest(new { mesaj = "Giriş isteğinin süresi doldu. Uygulamaya dönüp tekrar dene." }); }
        if (s is null || !AppReturn.IsMatch(s.Return)) return BadRequest(new { mesaj = "Geçersiz istek." });
        if (!string.IsNullOrEmpty(error) || string.IsNullOrEmpty(code)) return Redirect(BackTo(s.Return, "error", "Google ile giriş iptal edildi."));
        try
        {
            using var res = await GoogleHttp.PostAsync("https://oauth2.googleapis.com/token", new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["code"] = code, ["client_id"] = external.WebClientId("Google")!, ["client_secret"] = GoogleSecret!,
                ["redirect_uri"] = GoogleRedirect!, ["grant_type"] = "authorization_code"
            }), ct);
            if (!res.IsSuccessStatusCode) { logger.LogWarning("Google kod değişimi başarısız: {Status}", (int)res.StatusCode); return Redirect(BackTo(s.Return, "error", "Google ile giriş tamamlanamadı.")); }
            using var doc = JsonDocument.Parse(await res.Content.ReadAsStringAsync(ct));
            var idToken = doc.RootElement.TryGetProperty("id_token", out var t) ? t.GetString() : null;
            if (string.IsNullOrEmpty(idToken)) return Redirect(BackTo(s.Return, "error", "Google ile giriş tamamlanamadı."));
            var id = await external.Validate("google", idToken, s.Nonce, ct);
            var data = new GoogleCodeData(Guid.NewGuid().ToString("N"), s.Challenge, id.Subject, id.Email, id.EmailVerified, id.Name);
            return Redirect(BackTo(s.Return, "code", GoogleCode.Protect(JsonSerializer.Serialize(data), TimeSpan.FromMinutes(2))));
        }
        catch (Hasadim.Application.AppException e) { return Redirect(BackTo(s.Return, "error", e.Message)); }
        catch (HttpRequestException) { return Redirect(BackTo(s.Return, "error", "Google'a ulaşılamadı. Biraz sonra tekrar dene.")); }
    }

    [HttpPost("google/finish")]
    public async Task<IActionResult> GoogleFinish(MobileGoogleFinishRequest r)
    {
        const string invalid = "Google ile giriş isteğinin süresi doldu. Tekrar dene.";
        GoogleCodeData? d;
        try { d = JsonSerializer.Deserialize<GoogleCodeData>(GoogleCode.Unprotect(r.Code)); }
        catch { return Unauthorized(new { mesaj = invalid }); }
        if (d is null) return Unauthorized(new { mesaj = invalid });
        var hash = WebEncoders.Base64UrlEncode(SHA256.HashData(Encoding.ASCII.GetBytes(r.Verifier)));
        if (!CryptographicOperations.FixedTimeEquals(Encoding.ASCII.GetBytes(hash), Encoding.ASCII.GetBytes(d.Challenge))) return Unauthorized(new { mesaj = invalid });
        // Tek kullanımlık: aynı kod ikinci kez kullanılamaz.
        var key = "google-code:" + d.Id;
        if (cache.TryGetValue(key, out _)) return Unauthorized(new { mesaj = invalid });
        cache.Set(key, true, new MemoryCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(3), Size = 1 });
        return await SignInExternal(new ExternalIdentity("Google", d.Subject, d.Email, d.EmailVerified, d.Name), null);
    }

    // Telefonla giriş: kod /api/account/phone/start ile istenir, burada doğrulanır.
    [HttpPost("phone")]
    public async Task<IActionResult> Phone(PhoneConfirmRequest r, CancellationToken ct)
    {
        var (userId, _) = await phones.Verify(r.ChallengeId, r.Code, "login", ct);
        var u = await users.FindByIdAsync(userId.ToString());
        if (u is null) return BadRequest(new { mesaj = "Kod hatalı veya süresi dolmuş. Yeni kod iste." });
        if (await Blocked(u) is { } blocked) return blocked;
        if (u.TwoFactorEnabled) return Unauthorized(new { mesaj = "Bu hesapta iki adımlı doğrulama açık. E-posta ve şifrenle giriş yap." });
        return await Issue(u, "phone");
    }

    // Anahtar yenileme. Kullanılmış bir yenileme anahtarı tekrar gelirse oturum kapatılır.
    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh(MobileRefreshRequest r, CancellationToken ct)
    {
        var result = await tokens.Refresh(r.RefreshToken, async userId =>
        {
            var u = await users.FindByIdAsync(userId.ToString());
            return u is null ? null : await users.GetSecurityStampAsync(u);
        }, ct);
        if (result.Outcome == RefreshOutcome.Reused)
        {
            logger.LogWarning("Mobil yenileme anahtarı tekrar kullanıldı; oturum kapatıldı. Kullanıcı {UserId}", result.UserId);
            return Unauthorized(new { mesaj = "Güvenlik nedeniyle oturum kapatıldı. Tekrar giriş yap.", code = "token_reused" });
        }
        if (result.Tokens is not { } t) return Unauthorized(new { mesaj = "Oturumun sona erdi. Tekrar giriş yap.", code = "session_expired" });
        return Ok(new { accessToken = t.AccessToken, accessExpiresAt = t.AccessExpiresAt, refreshToken = t.RefreshToken, refreshExpiresAt = t.RefreshExpiresAt });
    }

    // Çıkış: bu cihazın oturumu kapanır, anahtarlar silinir.
    [Authorize, HttpPost("logout")]
    public async Task<IActionResult> Logout(CancellationToken ct)
    {
        if (MobileTokenHandler.SessionOf(User) is Guid sid) await tokens.Revoke(sid, ct);
        return Ok();
    }
}
