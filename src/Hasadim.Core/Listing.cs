namespace Hasadim.Core;

// Sayısal değerleri sonradan değiştirmeyelim:
// Veritabanında bu değerler saklanacak.
public enum ListingStatus
{
    Draft = 0,
    PendingReview = 1,
    ChangesRequested = 2,
    AwaitingPayment = 3,
    Published = 4,
    Expired = 5,
    Sold = 6
}

public record ListingData(
    string Baslik,
    string MeyveTuru,
    string Cesit,
    decimal MiktarKg,
    decimal KilogramFiyati,
    string Il,
    string Ilce,
    string Aciklama,
    string Telefon,
    DateTime? HasatTarihi,

    // Mevcut Application kodunun derlenebilmesi için
    // geçici olarak duruyor. Yayın kararında kullanılmaz.
    bool Active
);

public class Listing
{
    public Guid Id { get; private set; }
    public Guid OwnerId { get; private set; }

    public string Baslik { get; private set; } = "";
    public string MeyveTuru { get; private set; } = "";
    public string Cesit { get; private set; } = "";

    public decimal MiktarKg { get; private set; }
    public decimal KilogramFiyati { get; private set; }

    public string Il { get; private set; } = "";
    public string Ilce { get; private set; } = "";
    public string Aciklama { get; private set; } = "";
    public string Telefon { get; private set; } = "";

    public DateTime? HasatTarihi { get; private set; }
    public DateTime OlusturulmaTarihi { get; private set; }

    public ListingStatus Status { get; private set; }
        = ListingStatus.Draft;

    // Mevcut sorgularla uyumluluk için korunuyor.
    // Kullanıcı isteğinden doğrudan atanmaz.
    public bool Active { get; private set; }

    public bool Hidden { get; private set; }
    public bool IsDeleted { get; private set; }

    public string? PhotoUrl { get; private set; }
    public byte[] Version { get; private set; } = [];

    public string? ReviewNote { get; private set; }
    public Guid? ReviewedBy { get; private set; }

    public DateTime? SubmittedAt { get; private set; }
    public DateTime? ReviewedAt { get; private set; }

    public DateTime? PublishedAt { get; private set; }
    public DateTime? ExpiresAt { get; private set; }

    public static Listing Create(Guid owner, ListingData data)
    {
        if (owner == Guid.Empty)
        {
            throw new ArgumentException("Kullanıcı gerekli.");
        }

        var listing = new Listing
        {
            Id = Guid.NewGuid(),
            OwnerId = owner,
            OlusturulmaTarihi = DateTime.UtcNow,
            Status = ListingStatus.Draft,
            Active = false
        };

        listing.Update(data);

        return listing;
    }

    public void Update(ListingData data)
    {
        EnsureNotDeleted();

        // Onaylanan veya incelemedeki içerik sessizce değişmesin.
        // Bu sürümde düzenleme yalnızca taslak ve
        // düzeltme bekleyen ilanlarda yapılır.
        if (Status != ListingStatus.Draft &&
            Status != ListingStatus.ChangesRequested)
        {
            throw new InvalidOperationException(
                "Bu durumdaki ilan doğrudan düzenlenemez."
            );
        }

        ValidateData(data);

        Baslik = data.Baslik.Trim();
        MeyveTuru = data.MeyveTuru.Trim();
        Cesit = (data.Cesit ?? "").Trim();

        MiktarKg = data.MiktarKg;
        KilogramFiyati = data.KilogramFiyati;

        Il = data.Il.Trim();
        Ilce = data.Ilce.Trim();
        Aciklama = (data.Aciklama ?? "").Trim();
        Telefon = data.Telefon.Trim();
        HasatTarihi = data.HasatTarihi?.Date;

        // data.Active bilerek kullanılmıyor.
        Active = false;
    }

    public void SubmitForReview()
    {
        EnsureNotDeleted();

        if (Status != ListingStatus.Draft &&
            Status != ListingStatus.ChangesRequested)
        {
            throw new InvalidOperationException(
                "Yalnızca taslak veya düzeltme bekleyen ilan gönderilebilir."
            );
        }

        // Fotoğraf sayısı Application katmanında,
        // veritabanındaki gerçek kayıtlar üzerinden kontrol edilecek.
        Status = ListingStatus.PendingReview;
        Active = false;

        SubmittedAt = DateTime.UtcNow;
        ReviewedAt = null;
        ReviewedBy = null;
        ReviewNote = null;
    }

    public void Approve(Guid reviewerId)
    {
        EnsurePendingReview();

        if (reviewerId == Guid.Empty)
        {
            throw new ArgumentException("İnceleyen kullanıcı gerekli.");
        }

        // Onay, tek başına ilanı yayımlamaz.
        Status = ListingStatus.AwaitingPayment;
        Active = false;

        ReviewedBy = reviewerId;
        ReviewedAt = DateTime.UtcNow;
        ReviewNote = null;
    }

    public void RequestChanges(Guid reviewerId, string note)
    {
        EnsurePendingReview();

        if (reviewerId == Guid.Empty)
        {
            throw new ArgumentException("İnceleyen kullanıcı gerekli.");
        }

        if (string.IsNullOrWhiteSpace(note) ||
            note.Trim().Length > 1000)
        {
            throw new ArgumentException(
                "Düzeltme gerekçesi gerekli ve en fazla 1000 karakter olabilir."
            );
        }

        Status = ListingStatus.ChangesRequested;
        Active = false;

        ReviewedBy = reviewerId;
        ReviewedAt = DateTime.UtcNow;
        ReviewNote = note.Trim();
    }

    public void MarkAsSold()
    {
        EnsureNotDeleted();

        if (Status != ListingStatus.Published &&
            Status != ListingStatus.Expired)
        {
            throw new InvalidOperationException(
                "Yalnızca yayımlanmış veya süresi dolmuş ilan satıldı işaretlenebilir."
            );
        }

        Status = ListingStatus.Sold;
        Active = false;
    }

    private void EnsureNotDeleted()
    {
        if (IsDeleted)
        {
            throw new InvalidOperationException(
                "Silinmiş ilan üzerinde işlem yapılamaz."
            );
        }
    }

    private void EnsurePendingReview()
    {
        EnsureNotDeleted();

        if (Status != ListingStatus.PendingReview)
        {
            throw new InvalidOperationException(
                "İlan inceleme beklemiyor."
            );
        }
    }

    private static void ValidateData(ListingData data)
    {
        if (string.IsNullOrWhiteSpace(data.Baslik) ||
            string.IsNullOrWhiteSpace(data.MeyveTuru) ||
            string.IsNullOrWhiteSpace(data.Il) ||
            string.IsNullOrWhiteSpace(data.Ilce) ||
            string.IsNullOrWhiteSpace(data.Telefon) ||
            data.MiktarKg <= 0 ||
            data.KilogramFiyati <= 0)
        {
            throw new ArgumentException("İlan bilgileri geçersiz.");
        }
    }
}