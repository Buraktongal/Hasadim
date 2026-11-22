using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Hasadim.Core;

namespace Hasadim.Application;

public sealed class AppException(int status, string message)
    : Exception(message)
{
    public int Status => status;
}

public interface ICurrentUser
{
    Guid? Id { get; }
    bool IsAdmin { get; }
}

public class ListingRequest
{
    [Required, StringLength(150, MinimumLength = 5)]
    public string Baslik { get; set; } = "";

    [Required, StringLength(100)]
    public string MeyveTuru { get; set; } = "";

    [StringLength(100)]
    public string Cesit { get; set; } = "";

    [Range(
        typeof(decimal),
        "0.01",
        "100000000",
        ParseLimitsInInvariantCulture = true)]
    public decimal MiktarKg { get; set; }

    // Ürünlerde birim fiyat (en fazla 1.000.000), arazide toplam fiyat.
    // Kategoriye göre üst sınırı Core katmanı uygular.
    [Range(
        typeof(decimal),
        "0.01",
        "10000000000",
        ParseLimitsInInvariantCulture = true)]
    public decimal KilogramFiyati { get; set; }

    [Required, RegularExpression("^(Meyve|Sebze|Tahil|Yem|Bal|Kuruyemis|Arazi)$", ErrorMessage = "Kategori geçersiz.")]
    public string Kategori { get; set; } = ListingCategories.Meyve;

    [RegularExpression("^(kg|balya|m2)$", ErrorMessage = "Birim geçersiz.")]
    public string? Birim { get; set; }

    [RegularExpression("^(Satilik|Kiralik)$", ErrorMessage = "İşlem tipi satılık veya kiralık olmalı.")]
    public string? IslemTipi { get; set; }
    [StringLength(40)] public string? ImarDurumu { get; set; }
    [StringLength(40)] public string? TapuDurumu { get; set; }
    [StringLength(40)] public string? Sulama { get; set; }
    [StringLength(20)] public string? Ada { get; set; }
    [StringLength(20)] public string? Parsel { get; set; }
    public bool? Elektrik { get; set; }
    public bool? YolCephesi { get; set; }

    [Range(typeof(decimal), "35.5", "42.5", ParseLimitsInInvariantCulture = true)]
    public decimal? Enlem { get; set; }

    [Range(typeof(decimal), "25.5", "45", ParseLimitsInInvariantCulture = true)]
    public decimal? Boylam { get; set; }

    [Required, StringLength(100)]
    public string Il { get; set; } = "";

    [Required, StringLength(100)]
    public string Ilce { get; set; } = "";

    [StringLength(5000)]
    public string Aciklama { get; set; } = "";

    // İstemciden telefon kabul edilmez; oturum sahibinin profilinden alınır.
    [JsonIgnore]
    public string Telefon { get; set; } = "";

    public string? Ambalaj { get; set; }
    public string? Teslimat { get; set; }
    public decimal? MinAlimKg { get; set; }
    public DateTime? HasatTarihi { get; set; }

    // Eski istemcilerle uyumluluk için korunuyor.
    // Yayın durumunu belirlemek için kullanılmaz.
    public bool Active { get; set; }

    public byte[]? Version { get; set; }

    public ListingData Data() => new(
        Baslik,
        MeyveTuru,
        Cesit,
        MiktarKg,
        KilogramFiyati,
        Il,
        Ilce,
        Aciklama,
        Telefon,
        HasatTarihi,
        false, Ambalaj, Teslimat, MinAlimKg,
        Kategori, Birim,
        new LandDetails(ImarDurumu, TapuDurumu, Sulama, Ada, Parsel, Elektrik, YolCephesi, IslemTipi),
        Enlem, Boylam
    );
}

public class ListingQuery
{
    [StringLength(150)]
    public string? Q { get; set; }

    [StringLength(100)]
    public string? MeyveTuru { get; set; }

    [StringLength(100)]
    public string? Il { get; set; }

    [StringLength(100)]
    public string? Ilce { get; set; }

    [StringLength(100)]
    public string? Cesit { get; set; }

    [RegularExpression("^(Meyve|Sebze|Tahil|Yem|Bal|Kuruyemis|Arazi)$", ErrorMessage = "Geçersiz kategori.")]
    public string? Kategori { get; set; }

    [RegularExpression("^(Satilik|Kiralik)$", ErrorMessage = "Geçersiz işlem tipi.")]
    public string? IslemTipi { get; set; }

    [StringLength(40)]
    public string? ImarDurumu { get; set; }

    [StringLength(40)]
    public string? TapuDurumu { get; set; }

    [RegularExpression("^(Kasa|Koli|Dökme|Çuval|Big bag|Balya|Kavanoz|Teneke|Diğer)$", ErrorMessage = "Geçersiz ambalaj seçeneği.")]
    public string? Ambalaj { get; set; }

    [RegularExpression("^(Yerinden teslim|Satıcı teslimatı|Görüşülür)$", ErrorMessage = "Geçersiz teslimat seçeneği.")]
    public string? Teslimat { get; set; }

    public decimal? MinFiyat { get; set; }
    public decimal? MaxFiyat { get; set; }

    // Toptan alıcılar için ürün miktarı aralığı (kg).
    public decimal? MinMiktar { get; set; }
    public decimal? MaxMiktar { get; set; }

    public Guid? OwnerId { get; set; }

    [Required, RegularExpression("^(new|priceAsc|priceDesc|qtyDesc|qtyAsc)$", ErrorMessage = "Geçersiz sıralama seçeneği.")]
    public string Sort { get; set; } = "new";

    [Range(1, 100000)]
    public int Page { get; set; } = 1;

    // Arayüz 10, 25, 50 veya 100 seçtirir; sunucu en fazla 100 kayıt döndürür.
    [Range(1, 100)]
    public int PageSize { get; set; } = 25;

    public bool Mine { get; set; }
    public bool Favorites { get; set; }

    public bool Review { get; set; }
    public bool History { get; set; }
}

public record ListingPhoto(
    Guid Id,
    [property: JsonIgnore] string Url)
{
    public string? PhotoUrl { get; set; }
}

public class ListingView
{
    public long ViewCount { get; set; }
    public int FavoriteCount { get; set; }
    public decimal? OncekiKilogramFiyati { get; set; }
    public Guid Id { get; set; }
    public Guid OwnerId { get; set; }

    public long ListingNumber { get; set; }

    public string Baslik { get; set; } = "";
    public string MeyveTuru { get; set; } = "";
    public string Cesit { get; set; } = "";

    public decimal MiktarKg { get; set; }
    public decimal KilogramFiyati { get; set; }

    public string Il { get; set; } = "";
    public string Ilce { get; set; } = "";
    public string Aciklama { get; set; } = "";

    public string? Telefon { get; set; }

    public string? Ambalaj { get; set; }
    public string? Teslimat { get; set; }
    public decimal? MinAlimKg { get; set; }
    public DateTime? HasatTarihi { get; set; }
    public DateTime OlusturulmaTarihi { get; set; }

    public string Kategori { get; set; } = ListingCategories.Meyve;
    public string Birim { get; set; } = "kg";
    public string? IslemTipi { get; set; }
    public string? ImarDurumu { get; set; }
    public string? TapuDurumu { get; set; }
    public string? Sulama { get; set; }
    public string? Ada { get; set; }
    public string? Parsel { get; set; }
    public bool? Elektrik { get; set; }
    public bool? YolCephesi { get; set; }
    public decimal? Enlem { get; set; }
    public decimal? Boylam { get; set; }

    public bool ShowPhone { get; set; } = true;

    public bool Active { get; set; }
    public bool Hidden { get; set; }
    public bool IsDeleted { get; set; }

    public ListingStatus Status { get; set; }

    public string? ReviewNote { get; set; }

    [JsonIgnore]
    public Guid? ReviewedBy { get; set; }

    public DateTime? SubmittedAt { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public DateTime? PublishedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }

    public string? PhotoUrl { get; set; }

    public string OwnerName { get; set; } = "";

    public bool IsMine { get; set; }
    public bool Favorite { get; set; }

    public IReadOnlyList<ListingPhoto> Photos { get; set; } = [];

    public byte[] Version { get; set; } = [];

    public string StatusText => Status switch
    {
        ListingStatus.Draft => "Taslak",
        ListingStatus.PendingReview => "İncelemede",
        ListingStatus.ChangesRequested => "Düzeltme bekliyor",
        ListingStatus.AwaitingPayment => "Onaylı · Yayın bekliyor",
        ListingStatus.Published => "Yayında",
        ListingStatus.Expired => "Süresi doldu",
        ListingStatus.Sold => "Satıldı",
        _ => "Bilinmeyen durum"
    };
}

// Sütun sırası SQL ile aynı olmalı (Dapper kurucuyu sıraya göre eşler).
public record CategoryCount(string MeyveTuru, int Count, string Kategori = ListingCategories.Meyve);

// Harita: il bazında ilan sayısı ve haritada gösterilecek ilan noktaları.
public record CityCount(string Il, int Count);

public record MapPoint(
    Guid Id, string Baslik, string Kategori, string MeyveTuru, string Il, string Ilce,
    decimal KilogramFiyati, string Birim, decimal MiktarKg, decimal? Enlem, decimal? Boylam);

public record MapData(IReadOnlyList<CityCount> Iller, IReadOnlyList<MapPoint> Noktalar);

public class MapQuery
{
    [RegularExpression("^(Meyve|Sebze|Tahil|Yem|Bal|Kuruyemis|Arazi)$", ErrorMessage = "Geçersiz kategori.")]
    public string? Kategori { get; set; }

    [StringLength(100)]
    public string? MeyveTuru { get; set; }

    [StringLength(100)]
    public string? Il { get; set; }
}

public record Paged<T>(
    IReadOnlyList<T> Items,
    int Total,
    int Page,
    int PageSize);

public class ListingWorkflowRequest
{
    [Required, MinLength(8), MaxLength(8)]
    public byte[] Version { get; set; } = [];
}

public class ListingChangesRequest : ListingWorkflowRequest
{
    [Required, StringLength(1000)]
    public string Note { get; set; } = "";
}

public class MessageRequest
{
    public Guid ListingId { get; set; }
    public Guid RecipientId { get; set; }

    [Required, StringLength(2000)]
    public string Body { get; set; } = "";
}

public class MessageView
{
    public Guid Id { get; set; }
    public Guid ListingId { get; set; }
    public Guid SenderId { get; set; }
    public Guid RecipientId { get; set; }

    public string Body { get; set; } = "";

    public DateTime CreatedAt { get; set; }
    public DateTime? ReadAt { get; set; }

    public string ListingTitle { get; set; } = "";
    public string SenderName { get; set; } = "";
    public string RecipientName { get; set; } = "";
}

public class ReportRequest
{
    [Required, StringLength(1000)]
    public string Reason { get; set; } = "";
}

public class ReportView
{
    public Guid Id { get; set; }
    public Guid ListingId { get; set; }

    public string Baslik { get; set; } = "";
    public string Reason { get; set; } = "";

    public bool Hidden { get; set; }
}

public interface IMarketplaceRepository
{
    Task<long> RecordView(Guid id, Guid? user, CancellationToken ct);

    // Fotoğraf kaldırır; en az bir fotoğraf kalmalıdır. Silinen dosya adresini döndürür.
    Task<string> RemovePhoto(Guid id, Guid photoId, CancellationToken ct);

    // Seçilen fotoğrafı ilk sıraya alır ve kapak yapar.
    Task SetCover(Guid id, Guid photoId, CancellationToken ct);

    // Yayındaki ilanların kategori ve ürün türüne göre sayıları.
    Task<IReadOnlyList<CategoryCount>> Categories(CancellationToken ct);

    // Harita için il sayıları ve en yeni 500 ilan noktası.
    Task<MapData> Map(MapQuery q, Guid? user, CancellationToken ct);
    Task<Paged<ListingView>> Search(
        ListingQuery q,
        Guid? user,
        CancellationToken ct);

    Task<Listing?> Find(
        Guid id,
        CancellationToken ct);

    Task<ListingView?> Detail(
        Guid id,
        Guid? user,
        CancellationToken ct);

    Task Create(
        Listing l,
        IReadOnlyList<string> photos,
        CancellationToken ct);

    Task AddPhotos(
        Guid id,
        IReadOnlyList<string> photos,
        CancellationToken ct);

    Task<bool> Update(
        Listing l,
        byte[] version,
        CancellationToken ct);

    Task Delete(
        Guid id,
        CancellationToken ct);

    Task SetPhoto(
        Guid id,
        string url,
        CancellationToken ct);

    Task Favorite(
        Guid id,
        Guid user,
        bool add,
        CancellationToken ct);

    Task<IReadOnlyList<MessageView>> Messages(
        Guid user,
        int page,
        CancellationToken ct);

    Task<bool> HasConversation(
        Guid listing,
        Guid buyer,
        Guid owner,
        CancellationToken ct);

    Task Send(
        Guid id,
        Guid sender,
        MessageRequest r,
        CancellationToken ct);

    Task Report(
        Guid listing,
        Guid user,
        string reason,
        CancellationToken ct);

    Task<IReadOnlyList<ReportView>> Reports(
        CancellationToken ct);

    Task Visibility(
        Guid listing,
        bool hidden,
        CancellationToken ct);

    Task Resolve(
        Guid report,
        CancellationToken ct);
}
