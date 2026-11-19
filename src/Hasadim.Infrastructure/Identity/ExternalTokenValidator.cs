using System.Security.Cryptography;
using System.Text;
using Hasadim.Application;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;

namespace Hasadim.Infrastructure.Identity;

public sealed record ExternalIdentity(string Provider, string Subject, string? Email, bool EmailVerified, string? Name);

// Google ve Apple'ın verdiği kimlik belirtecini (ID token) doğrular.
// Web (Google Identity Services / Sign in with Apple JS) ve mobil uygulamalar aynı
// belirteci gönderir; imza, yayımlayan, hedef kitle ve süre kontrol edilir.
public class ExternalTokenValidator(IConfiguration config)
{
    static readonly ConfigurationManager<OpenIdConnectConfiguration> GoogleMetadata = new(
        "https://accounts.google.com/.well-known/openid-configuration",
        new OpenIdConnectConfigurationRetriever(), new HttpDocumentRetriever { RequireHttps = true });

    static readonly ConfigurationManager<OpenIdConnectConfiguration> AppleMetadata = new(
        "https://appleid.apple.com/.well-known/openid-configuration",
        new OpenIdConnectConfigurationRetriever(), new HttpDocumentRetriever { RequireHttps = true });

    // appsettings: Auth:Google:WebClientId, Auth:Google:MobileClientIds[]; Apple için aynısı.
    public string? WebClientId(string provider) => config[$"Auth:{provider}:WebClientId"] is { Length: > 0 } id ? id : null;

    public string[] Audiences(string provider) =>
        new[] { WebClientId(provider) }
            .Concat(config.GetSection($"Auth:{provider}:MobileClientIds").Get<string[]>() ?? [])
            .Where(x => !string.IsNullOrWhiteSpace(x)).Select(x => x!).Distinct().ToArray();

    public bool Enabled(string provider) => Audiences(provider).Length > 0;

    public async Task<ExternalIdentity> Validate(string provider, string idToken, string? nonce, CancellationToken ct)
    {
        var (name, metadata, issuers) = provider.ToLowerInvariant() switch
        {
            "google" => ("Google", GoogleMetadata, new[] { "https://accounts.google.com", "accounts.google.com" }),
            "apple" => ("Apple", AppleMetadata, new[] { "https://appleid.apple.com" }),
            _ => throw new AppException(400, "Desteklenmeyen giriş yöntemi.")
        };
        var audiences = Audiences(name);
        if (audiences.Length == 0) throw new AppException(400, name + " ile giriş henüz yapılandırılmadı.");

        OpenIdConnectConfiguration oidc;
        try { oidc = await metadata.GetConfigurationAsync(ct); }
        catch (Exception) { throw new AppException(503, name + " doğrulama hizmetine ulaşılamadı. Biraz sonra tekrar dene."); }

        var result = await new JsonWebTokenHandler().ValidateTokenAsync(idToken, new TokenValidationParameters
        {
            ValidIssuers = issuers,
            ValidAudiences = audiences,
            IssuerSigningKeys = oidc.SigningKeys,
            RequireSignedTokens = true,
            RequireExpirationTime = true,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(2)
        });
        if (!result.IsValid)
        {
            // Anahtarlar yenilenmiş olabilir: bir kez yeniden çek.
            metadata.RequestRefresh();
            throw new AppException(401, name + " oturumu doğrulanamadı. Tekrar dene.");
        }

        string? Claim(string key) => result.Claims.TryGetValue(key, out var v) ? v?.ToString() : null;
        var subject = Claim("sub");
        if (string.IsNullOrWhiteSpace(subject)) throw new AppException(401, name + " oturumu doğrulanamadı.");

        // İstemci nonce gönderdiyse belirteçteki nonce ile eşleşmeli (ham değer veya SHA-256 özeti).
        if (!string.IsNullOrEmpty(nonce))
        {
            var tokenNonce = Claim("nonce");
            var hashed = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(nonce))).ToLowerInvariant();
            if (tokenNonce is null || !(tokenNonce == nonce || string.Equals(tokenNonce, hashed, StringComparison.OrdinalIgnoreCase)))
                throw new AppException(401, name + " oturumu doğrulanamadı (nonce).");
        }

        var verified = string.Equals(Claim("email_verified"), "true", StringComparison.OrdinalIgnoreCase);
        return new ExternalIdentity(name, subject, Claim("email"), verified, Claim("name"));
    }
}
