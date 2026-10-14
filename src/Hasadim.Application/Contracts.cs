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

    [Range(
        typeof(decimal),
        "0.01",
        "1000000",
        ParseLimitsInInvariantCulture = true)]
    public decimal KilogramFiyati { get; set; }

    [Required, StringLength(100)]
    public string Il { get; set; } = "";

    [Required, StringLength(100)]
    public string Ilce { get; set; } = "";

    [StringLength(5000)]
    public string Aciklama { get; set; } = "";

    [Required, RegularExpression(@"^[+0-9 ()-]{10,25}$")]
    public string Telefon { get; set; } = "";

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
        false
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

    public decimal? MinFiyat { get; set; }
    public decimal? MaxFiyat { get; set; }

    public Guid? OwnerId { get; set; }

    public string Sort { get; set; } = "new";

    [Range(1, 100000)]
    public int Page { get; set; } = 1;

    [Range(1, 48)]
    public int PageSize { get; set; } = 12;

    public bool Mine { get; set; }
    public bool Favorites { get; set; }

    public bool Review { get; set; }
}

public record ListingPhoto(
    Guid Id,
    [property: JsonIgnore] string Url)
{
    public string? PhotoUrl { get; set; }
}

public class ListingView
{
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

    public DateTime? HasatTarihi { get; set; }
    public DateTime OlusturulmaTarihi { get; set; }

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
        ListingStatus.AwaitingPayment => "Ödeme bekliyor",
        ListingStatus.Published => "Yayında",
        ListingStatus.Expired => "Süresi doldu",
        ListingStatus.Sold => "Satıldı",
        _ => "Bilinmeyen durum"
    };
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