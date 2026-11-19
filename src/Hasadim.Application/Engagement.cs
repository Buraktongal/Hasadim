using System.ComponentModel.DataAnnotations;
using System.Globalization;
using System.Text.Json;
using Hasadim.Core;

namespace Hasadim.Application;

// Teklif, bildirim, kayıtlı arama, engelleme ve kullanıcı ayarları.
// Web ve mobil uygulama aynı uçları kullanır.

public enum OfferStatus
{
    Pending = 0,
    Accepted = 1,
    Rejected = 2,
    Withdrawn = 3
}

public class OfferRequest
{
    public Guid ListingId { get; set; }

    // Ürünlerde birim fiyat (TL/kg, TL/balya); arazide toplam fiyat.
    [Range(typeof(decimal), "0.01", "10000000000", ParseLimitsInInvariantCulture = true)]
    public decimal Amount { get; set; }

    // Ürünlerde alınmak istenen miktar; arazide kullanılmaz.
    [Range(typeof(decimal), "0.01", "100000000", ParseLimitsInInvariantCulture = true)]
    public decimal? Quantity { get; set; }

    [StringLength(500)]
    public string? Note { get; set; }
}

public class OfferReplyRequest
{
    [StringLength(500)]
    public string? Reply { get; set; }
}

public class OfferView
{
    public Guid Id { get; set; }
    public Guid ListingId { get; set; }
    public string ListingTitle { get; set; } = "";
    public long ListingNumber { get; set; }
    public string Kategori { get; set; } = ListingCategories.Meyve;
    public string Birim { get; set; } = "kg";
    public decimal ListingPrice { get; set; }
    public Guid BuyerId { get; set; }
    public string BuyerName { get; set; } = "";
    public Guid SellerId { get; set; }
    public string SellerName { get; set; } = "";
    public decimal Amount { get; set; }
    public decimal? Quantity { get; set; }
    public string? Note { get; set; }
    public string? Reply { get; set; }
    public OfferStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? RespondedAt { get; set; }
    public bool Sent { get; set; }
}

public class NotificationView
{
    public Guid Id { get; set; }
    public string Kind { get; set; } = "";
    public string Title { get; set; } = "";
    public string Body { get; set; } = "";
    public string? Link { get; set; }
    // İstemcinin metni kendi dilinde yazabilmesi için bildirim değerleri (JSON).
    public string? Data { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ReadAt { get; set; }
}

public record NotificationCounts(int Unread, int PendingOffers);

public class SavedSearchRequest
{
    [Required, StringLength(80, MinimumLength = 2)]
    public string Name { get; set; } = "";

    // Pazar yeri adres satırındaki filtreler (ör. kategori=Meyve&meyveTuru=Elma&il=Isparta).
    [StringLength(1000)]
    public string Query { get; set; } = "";

    public bool Notify { get; set; } = true;
}

// Yeni ilan eşleştirmesi için ayrıştırılmış filtreler.
public record SavedSearchFilters(
    string Query, string? Kategori, string? MeyveTuru, string? Cesit, string? Il, string? Ilce,
    decimal? MinFiyat, decimal? MaxFiyat, string? Q)
{
    private static readonly string[] Keys =
        ["q", "kategori", "meyveTuru", "cesit", "il", "ilce", "minFiyat", "maxFiyat", "minMiktar", "maxMiktar",
         "ambalaj", "teslimat", "imarDurumu", "tapuDurumu", "sort"];

    public static SavedSearchFilters Parse(string? query)
    {
        var raw = System.Web.HttpUtility.ParseQueryString((query ?? "").TrimStart('?'));
        var kept = new List<string>();
        string? Get(string key)
        {
            var value = raw[key]?.Trim();
            return string.IsNullOrEmpty(value) ? null : value.Length > 150 ? value[..150] : value;
        }
        foreach (var key in Keys)
        {
            var value = Get(key);
            if (value is not null) kept.Add(key + "=" + Uri.EscapeDataString(value));
        }
        decimal? Number(string key) =>
            decimal.TryParse(Get(key), NumberStyles.Number, CultureInfo.InvariantCulture, out var n) && n >= 0 ? n : null;
        var category = Get("kategori");
        if (category is not null && !ListingCategories.All.Contains(category)) category = null;
        return new(string.Join("&", kept), category, Get("meyveTuru"), Get("cesit"), Get("il"), Get("ilce"),
            Number("minFiyat"), Number("maxFiyat"), Get("q"));
    }
}

public class SavedSearchView
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public string Query { get; set; } = "";
    public bool Notify { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class BlockView
{
    public Guid UserId { get; set; }
    public string DisplayName { get; set; } = "";
    public DateTime CreatedAt { get; set; }
}

public class UserSettings
{
    [Required, RegularExpression("^(tr|en)$", ErrorMessage = "Dil geçersiz.")]
    public string Language { get; set; } = "tr";

    [Required, RegularExpression("^(system|light|dark)$", ErrorMessage = "Tema geçersiz.")]
    public string Theme { get; set; } = "system";

    public bool NotifyMessages { get; set; } = true;
    public bool NotifyOffers { get; set; } = true;
    public bool NotifySavedSearches { get; set; } = true;
    public bool NotifyPriceDrops { get; set; } = true;
}

public class DeleteAccountRequest
{
    // Şifresi olan hesaplarda zorunlu; yalnızca Google/Apple/telefonla girilen hesaplarda boş olabilir.
    [StringLength(128)]
    public string? Password { get; set; }

    // Kullanıcının bilerek onayladığını göstermek için "HESABIMI SİL" yazılır.
    [Required, StringLength(40)]
    public string Confirm { get; set; } = "";
}

public static class NotificationKinds
{
    public const string Message = "message";
    public const string OfferReceived = "offer-received";
    public const string OfferAccepted = "offer-accepted";
    public const string OfferRejected = "offer-rejected";
    public const string OfferWithdrawn = "offer-withdrawn";
    public const string PriceDrop = "price-drop";
    public const string SavedSearch = "saved-search";
}

public interface IEngagementRepository
{
    Task CreateOffer(Guid id, Guid buyer, Guid seller, OfferRequest request, CancellationToken ct);
    Task<OfferView?> FindOffer(Guid id, CancellationToken ct);
    Task<IReadOnlyList<OfferView>> Offers(Guid user, bool received, int page, CancellationToken ct);
    // Yalnızca beklenen durumdaki teklifi günceller; eşzamanlı yanıtları önler.
    Task<bool> SetOfferStatus(Guid id, OfferStatus expected, OfferStatus next, string? reply, CancellationToken ct);

    // Kullanıcının bildirim ayarına göre bildirim ekler (ayar kapalıysa eklenmez).
    Task Notify(Guid user, string kind, string title, string body, string? link, object? data, CancellationToken ct);
    // Favoriye ekleyen kullanıcılara fiyat düşüşü bildirimi.
    Task NotifyPriceDrop(Listing listing, decimal oldPrice, CancellationToken ct);
    // Bildirimi açık kayıtlı aramalara uyan yeni ilan bildirimi.
    Task NotifySavedSearches(Listing listing, CancellationToken ct);
    Task<IReadOnlyList<NotificationView>> Notifications(Guid user, int page, CancellationToken ct);
    Task<NotificationCounts> Counts(Guid user, CancellationToken ct);
    Task ReadNotifications(Guid user, Guid? id, CancellationToken ct);
    Task DeleteNotification(Guid user, Guid id, CancellationToken ct);

    Task<IReadOnlyList<SavedSearchView>> SavedSearches(Guid user, CancellationToken ct);
    Task<Guid> SaveSearch(Guid user, string name, bool notify, SavedSearchFilters filters, CancellationToken ct);
    Task<bool> SetSavedSearchNotify(Guid user, Guid id, bool notify, CancellationToken ct);
    Task<bool> DeleteSavedSearch(Guid user, Guid id, CancellationToken ct);

    // İki yönde de engel varsa true.
    Task<bool> IsBlocked(Guid a, Guid b, CancellationToken ct);
    Task<IReadOnlyList<BlockView>> Blocks(Guid user, CancellationToken ct);
    Task Block(Guid user, Guid target, CancellationToken ct);
    Task Unblock(Guid user, Guid target, CancellationToken ct);
    Task<bool> UserExists(Guid id, CancellationToken ct);

    Task<UserSettings> Settings(Guid user, CancellationToken ct);
    Task SaveSettings(Guid user, UserSettings settings, CancellationToken ct);
}

public class EngagementService(
    IEngagementRepository repo,
    IMarketplaceRepository listings,
    ICurrentUser current)
{
    private static readonly CultureInfo Tr = CultureInfo.GetCultureInfo("tr-TR");
    public const int MaxSavedSearches = 20;
    public const int MaxBlocks = 500;

    private Guid User => current.Id ?? throw new AppException(401, "Giriş yapın.");

    private static void Validate(object request)
    {
        var errors = new List<ValidationResult>();
        if (!Validator.TryValidateObject(request, new ValidationContext(request), errors, true))
            throw new AppException(400, string.Join(" ", errors.Select(x => x.ErrorMessage)));
    }

    private static bool IsPublic(Listing l) =>
        l.Active && !l.Hidden && !l.IsDeleted && l.Status == ListingStatus.Published &&
        (!l.ExpiresAt.HasValue || l.ExpiresAt > DateTime.UtcNow);

    public static string Price(decimal amount, string unit) =>
        amount.ToString("N2", Tr) + " TL" + unit switch { "m2" => "", "balya" => "/balya", _ => "/kg" };

    // ---- Teklifler ----

    public async Task<Guid> MakeOffer(OfferRequest request, CancellationToken ct)
    {
        var buyer = User;
        Validate(request);
        var listing = await listings.Find(request.ListingId, ct);
        if (listing is null || !IsPublic(listing)) throw new AppException(404, "Yayında ilan bulunamadı.");
        if (listing.OwnerId == buyer) throw new AppException(400, "Kendi ilanına teklif veremezsin.");
        if (await repo.IsBlocked(buyer, listing.OwnerId, ct)) throw new AppException(403, "Bu satıcıya teklif gönderilemiyor.");
        if (decimal.Round(request.Amount, 2) != request.Amount) throw new AppException(400, "Teklif tutarı en fazla iki ondalık içerebilir.");
        var land = listing.Kategori == ListingCategories.Arazi;
        if (land) request.Quantity = null;
        else
        {
            if (request.Amount > 1_000_000m) throw new AppException(400, "Birim fiyat teklifi en fazla 1.000.000 TL olabilir.");
            if (request.Quantity is null) throw new AppException(400, "Almak istediğin miktarı yaz.");
            if (request.Quantity > listing.MiktarKg) throw new AppException(400, "Teklif miktarı ilandaki toplam miktarı aşamaz.");
            if (listing.MinAlimKg is not null && request.Quantity < listing.MinAlimKg)
                throw new AppException(400, "Satıcının minimum alım miktarı: " + listing.MinAlimKg.Value.ToString("N0", Tr) + " " + UnitName(listing.Birim) + ".");
        }
        request.Note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim();
        var id = Guid.NewGuid();
        await repo.CreateOffer(id, buyer, listing.OwnerId, request, ct);
        await repo.Notify(listing.OwnerId, NotificationKinds.OfferReceived, "Yeni teklif",
            $"\"{listing.Baslik}\" ilanına {Price(request.Amount, listing.Birim)} teklif geldi.",
            "/html/tekliflerim.html?kutu=gelen",
            new { listing = listing.Baslik, amount = request.Amount, unit = listing.Birim, quantity = request.Quantity }, ct);
        return id;
    }

    public static string UnitName(string unit) => unit switch { "m2" => "m²", "balya" => "balya", _ => "kg" };

    public Task<IReadOnlyList<OfferView>> Offers(bool received, int page, CancellationToken ct)
    {
        if (page is < 1 or > 10000) throw new AppException(400, "Sayfa geçersiz.");
        return repo.Offers(User, received, page, ct);
    }

    public async Task RespondOffer(Guid id, bool accept, OfferReplyRequest request, CancellationToken ct)
    {
        var user = User;
        Validate(request);
        var offer = await repo.FindOffer(id, ct) ?? throw new AppException(404, "Teklif bulunamadı.");
        if (offer.SellerId != user) throw new AppException(403, "Bu teklif sana gönderilmemiş.");
        if (offer.Status != OfferStatus.Pending) throw new AppException(409, "Bu teklif artık yanıt beklemiyor.");
        var reply = string.IsNullOrWhiteSpace(request.Reply) ? null : request.Reply.Trim();
        if (!await repo.SetOfferStatus(id, OfferStatus.Pending, accept ? OfferStatus.Accepted : OfferStatus.Rejected, reply, ct))
            throw new AppException(409, "Teklif başka bir işlemle değişti. Sayfayı yenile.");
        await repo.Notify(offer.BuyerId, accept ? NotificationKinds.OfferAccepted : NotificationKinds.OfferRejected,
            accept ? "Teklifin kabul edildi" : "Teklifin reddedildi",
            $"\"{offer.ListingTitle}\" ilanına verdiğin {Price(offer.Amount, offer.Birim)} teklif " + (accept ? "kabul edildi." : "reddedildi."),
            "/html/tekliflerim.html?kutu=giden",
            new { listing = offer.ListingTitle, amount = offer.Amount, unit = offer.Birim }, ct);
    }

    public async Task WithdrawOffer(Guid id, CancellationToken ct)
    {
        var user = User;
        var offer = await repo.FindOffer(id, ct) ?? throw new AppException(404, "Teklif bulunamadı.");
        if (offer.BuyerId != user) throw new AppException(403, "Bu teklif sana ait değil.");
        if (offer.Status != OfferStatus.Pending) throw new AppException(409, "Yalnızca yanıt bekleyen teklif geri çekilebilir.");
        if (!await repo.SetOfferStatus(id, OfferStatus.Pending, OfferStatus.Withdrawn, null, ct))
            throw new AppException(409, "Teklif başka bir işlemle değişti. Sayfayı yenile.");
        await repo.Notify(offer.SellerId, NotificationKinds.OfferWithdrawn, "Teklif geri çekildi",
            $"\"{offer.ListingTitle}\" ilanına gelen {Price(offer.Amount, offer.Birim)} teklif geri çekildi.",
            "/html/tekliflerim.html?kutu=gelen",
            new { listing = offer.ListingTitle, amount = offer.Amount, unit = offer.Birim }, ct);
    }

    // ---- Bildirimler ----

    public Task<IReadOnlyList<NotificationView>> Notifications(int page, CancellationToken ct)
    {
        if (page is < 1 or > 10000) throw new AppException(400, "Sayfa geçersiz.");
        return repo.Notifications(User, page, ct);
    }

    public Task<NotificationCounts> Counts(CancellationToken ct) => repo.Counts(User, ct);
    public Task Read(Guid? id, CancellationToken ct) => repo.ReadNotifications(User, id, ct);
    public Task DeleteNotification(Guid id, CancellationToken ct) => repo.DeleteNotification(User, id, ct);

    // ---- Kayıtlı aramalar ----

    public Task<IReadOnlyList<SavedSearchView>> SavedSearches(CancellationToken ct) => repo.SavedSearches(User, ct);

    public async Task<Guid> SaveSearch(SavedSearchRequest request, CancellationToken ct)
    {
        var user = User;
        Validate(request);
        var filters = SavedSearchFilters.Parse(request.Query);
        var existing = await repo.SavedSearches(user, ct);
        if (existing.Count >= MaxSavedSearches)
            throw new AppException(400, "En fazla " + MaxSavedSearches + " arama kaydedebilirsin. Önce eskilerden birini sil.");
        if (existing.Any(x => x.Query == filters.Query))
            throw new AppException(409, "Bu arama zaten kayıtlı.");
        return await repo.SaveSearch(user, request.Name.Trim(), request.Notify, filters, ct);
    }

    public async Task SetSavedSearchNotify(Guid id, bool notify, CancellationToken ct)
    {
        if (!await repo.SetSavedSearchNotify(User, id, notify, ct)) throw new AppException(404, "Kayıtlı arama bulunamadı.");
    }

    public async Task DeleteSavedSearch(Guid id, CancellationToken ct)
    {
        if (!await repo.DeleteSavedSearch(User, id, ct)) throw new AppException(404, "Kayıtlı arama bulunamadı.");
    }

    // ---- Engelleme ----

    public Task<IReadOnlyList<BlockView>> Blocks(CancellationToken ct) => repo.Blocks(User, ct);

    public async Task Block(Guid target, CancellationToken ct)
    {
        var user = User;
        if (target == user || target == Guid.Empty) throw new AppException(400, "Kendini engelleyemezsin.");
        if (!await repo.UserExists(target, ct)) throw new AppException(404, "Üye bulunamadı.");
        if ((await repo.Blocks(user, ct)).Count >= MaxBlocks) throw new AppException(400, "Engel listesi dolu.");
        await repo.Block(user, target, ct);
    }

    public Task Unblock(Guid target, CancellationToken ct) => repo.Unblock(User, target, ct);

    // ---- Ayarlar ----

    public Task<UserSettings> Settings(CancellationToken ct) => repo.Settings(User, ct);

    public async Task<UserSettings> SaveSettings(UserSettings settings, CancellationToken ct)
    {
        var user = User;
        Validate(settings);
        await repo.SaveSettings(user, settings, ct);
        return await repo.Settings(user, ct);
    }

    public static string DataJson(object? data) => data is null ? "" : JsonSerializer.Serialize(data, new JsonSerializerOptions(JsonSerializerDefaults.Web));
}
