using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using Dapper;
using Hasadim.Infrastructure.Database;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;

namespace Hasadim.Infrastructure.Security;

public sealed record HumanChallenge(string Token, string Salt, int Difficulty, string? Image);
public enum HumanResult { Ok, Missing, Invalid, ImageRequired, WrongAnswer }

// Robot / insan doğrulaması. Dış hizmet kullanılmaz; her şey sunucuda üretilir ve doğrulanır.
// İki katman:
//  1) İş kanıtı (proof-of-work): istemci, sunucunun verdiği tuzla SHA-256 özeti belirli sayıda
//     sıfır bitle başlayan bir sayı bulmak zorundadır. İnsan için ~1 saniye, binlerce istek
//     gönderen bir bot için ciddi maliyettir. Görünmezdir.
//  2) Görsel kod: yalnızca çizgilerden (yazı tipi değil) oluşan, bozulmuş 5 karakterlik kod.
//     Kayıt, SMS ve şifre sıfırlamada her zaman; girişte hatalı denemelerden sonra; ilanda
//     24 saatte 5 ilandan sonra; geri bildirimde 24 saatte 3 bildirimden sonra istenir.
// Bilet şifreli ve imzalıdır (Data Protection), 5 dakika geçerlidir ve yalnızca bir kez kullanılabilir.
public sealed class HumanCheck(IDataProtectionProvider protection, IMemoryCache cache, SqlConnectionFactory factory, IConfiguration config)
{
    public static readonly string[] Purposes = ["login", "register", "phone", "forgot", "listing", "feedback"];
    public const int ListingSoftLimit = 5, ListingDailyLimit = 20, ListingBurstLimit = 3;
    public const int FeedbackSoftLimit = 3, FeedbackDailyLimit = 10;
    static readonly TimeSpan Lifetime = TimeSpan.FromMinutes(5);
    static readonly TimeSpan FailureWindow = TimeSpan.FromMinutes(15);

    ITimeLimitedDataProtector Protector => protection.CreateProtector("Hasadim.Human.v1").ToTimeLimitedDataProtector();
    bool LoginAlways => string.Equals(config["Security:Human:LoginAlwaysImage"], "true", StringComparison.OrdinalIgnoreCase);
    int BaseDifficulty => int.TryParse(config["Security:Human:Difficulty"], out var d) && d is >= 8 and <= 22 ? d : 16;

    // ---------- Risk ----------
    static string Key(string? ip) => "human:fail:" + (ip ?? "unknown");
    public int Failures(string? ip) => cache.TryGetValue(Key(ip), out int n) ? n : 0;
    public void RecordFailure(string? ip) =>
        cache.Set(Key(ip), Failures(ip) + 1, new MemoryCacheEntryOptions { SlidingExpiration = FailureWindow, Size = 1 });
    public int Difficulty(string? ip) => Failures(ip) >= 5 ? Math.Min(BaseDifficulty + 3, 22) : BaseDifficulty;

    public async Task<bool> NeedsImage(string purpose, string? ip, Guid? user, CancellationToken ct) => purpose switch
    {
        "register" or "phone" or "forgot" => true,
        "login" => LoginAlways || Failures(ip) >= 2,
        "listing" => user is Guid u && await RecentListings(u, TimeSpan.FromHours(24), ct) >= ListingSoftLimit,
        "feedback" => user is Guid f && await RecentFeedback(f, TimeSpan.FromHours(24), ct) >= FeedbackSoftLimit,
        _ => true
    };

    public async Task<int> RecentListings(Guid user, TimeSpan window, CancellationToken ct)
    {
        await using var c = await factory.Open(ct);
        return await c.ExecuteScalarAsync<int>(new CommandDefinition(
            "SELECT COUNT(*) FROM dbo.Listings WHERE OwnerId = @user AND OlusturulmaTarihi > DATEADD(second, -@seconds, SYSUTCDATETIME());",
            new { user, seconds = (int)window.TotalSeconds }, cancellationToken: ct));
    }

    public async Task<int> RecentFeedback(Guid user, TimeSpan window, CancellationToken ct)
    {
        await using var c = await factory.Open(ct);
        return await c.ExecuteScalarAsync<int>(new CommandDefinition(
            "SELECT COUNT(*) FROM dbo.Feedback WHERE UserId = @user AND CreatedAt > DATEADD(second, -@seconds, SYSUTCDATETIME());",
            new { user, seconds = (int)window.TotalSeconds }, cancellationToken: ct));
    }

    // ---------- Bilet ----------
    public async Task<HumanChallenge> Create(string purpose, string? ip, Guid? user, CancellationToken ct)
    {
        if (!Purposes.Contains(purpose)) throw new ArgumentException("Bilinmeyen doğrulama amacı.", nameof(purpose));
        var id = Guid.NewGuid();
        var salt = Convert.ToHexString(RandomNumberGenerator.GetBytes(16)).ToLowerInvariant();
        var difficulty = Difficulty(ip);
        string? image = null, answerHash = "-";
        if (await NeedsImage(purpose, ip, user, ct))
        {
            var (code, svg) = CaptchaImage.Create();
            image = svg;
            answerHash = AnswerHash(id, code);
        }
        var payload = string.Join('|', id.ToString("N"), purpose, salt, difficulty.ToString(CultureInfo.InvariantCulture), answerHash, user?.ToString("N") ?? "-");
        return new HumanChallenge(Protector.Protect(payload, Lifetime), salt, difficulty, image);
    }

    public async Task<HumanResult> Verify(string purpose, string? token, string? nonce, string? answer, string? ip, Guid? user, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(token) || string.IsNullOrWhiteSpace(nonce)) return HumanResult.Missing;
        if (token.Length > 4000 || nonce.Length > 16 || !nonce.All(char.IsAsciiDigit)) return HumanResult.Invalid;
        string payload;
        try { payload = Protector.Unprotect(token); }
        catch (CryptographicException) { return HumanResult.Invalid; }
        var p = payload.Split('|');
        if (p.Length != 6 || !Guid.TryParseExact(p[0], "N", out var id) || p[1] != purpose) return HumanResult.Invalid;
        if (p[5] != (user?.ToString("N") ?? "-")) return HumanResult.Invalid;
        if (!int.TryParse(p[3], NumberStyles.None, CultureInfo.InvariantCulture, out var difficulty) || !ProofOk(p[2], nonce, difficulty))
            return HumanResult.Invalid;
        var hasImage = p[4] != "-";
        // Bilet alındıktan sonra risk arttıysa (ör. 5. ilan), görsel kod gerekir.
        if (!hasImage && await NeedsImage(purpose, ip, user, ct)) return HumanResult.ImageRequired;
        // Önce bilet harcanır: aynı biletle tekrar tekrar kod denenemez.
        if (!await Redeem(id, ct)) return HumanResult.Invalid;
        if (hasImage && !CryptographicOperations.FixedTimeEquals(
                Encoding.ASCII.GetBytes(AnswerHash(id, answer ?? "")), Encoding.ASCII.GetBytes(p[4])))
            return HumanResult.WrongAnswer;
        return HumanResult.Ok;
    }

    static string Normalize(string answer) =>
        new string(answer.Where(ch => !char.IsWhiteSpace(ch)).ToArray()).ToUpperInvariant().Replace('İ', 'I');

    static string AnswerHash(Guid id, string answer) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(id.ToString("N") + ":" + Normalize(answer))));

    // SHA-256(tuz + ":" + sayı) en az "difficulty" sıfır bitle başlamalı.
    public static bool ProofOk(string salt, string nonce, int difficulty)
    {
        var hash = SHA256.HashData(Encoding.ASCII.GetBytes(salt + ":" + nonce));
        var bits = 0;
        foreach (var b in hash)
        {
            if (b == 0) { bits += 8; continue; }
            bits += System.Numerics.BitOperations.LeadingZeroCount((uint)b) - 24;
            break;
        }
        return bits >= difficulty;
    }

    async Task<bool> Redeem(Guid id, CancellationToken ct)
    {
        await using var c = await factory.Open(ct);
        try
        {
            await c.ExecuteAsync(new CommandDefinition(
                "INSERT dbo.HumanRedemptions(Id, ExpiresAt) VALUES(@id, DATEADD(minute, 10, SYSUTCDATETIME()));", new { id }, cancellationToken: ct));
        }
        catch (SqlException e) when (e.Number is 2627 or 2601) { return false; }
        // Ara sıra süresi geçmiş kayıtları temizle.
        if (Random.Shared.Next(50) == 0)
            await c.ExecuteAsync(new CommandDefinition("DELETE TOP (500) dbo.HumanRedemptions WHERE ExpiresAt < SYSUTCDATETIME();", cancellationToken: ct));
        return true;
    }
}
