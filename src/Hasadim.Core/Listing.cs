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
    bool Active,
    string? Ambalaj = null,
    string? Teslimat = null,
    decimal? MinAlimKg = null,
    // Ana kategori: Meyve, Tahil, Yem, Bal, Kuruyemis veya Arazi.
    string Kategori = ListingCategories.Meyve,
    // Miktarın birimi: kg, balya veya m2 (arazi alanı).
    string? Birim = null,
    LandDetails? Arazi = null,
    // Satıcının haritada işaretlediği isteğe bağlı konum.
    decimal? Enlem = null,
    decimal? Boylam = null
);

// Satılık arazi ilanlarına özel bilgiler.
public record LandDetails(
    string? ImarDurumu,
    string? TapuDurumu,
    string? Sulama,
    string? Ada,
    string? Parsel,
    bool? Elektrik,
    bool? YolCephesi,
    // Satilik (satış) veya Kiralik (yıllık kira).
    string? IslemTipi = null
);

public static class ListingCategories
{
    public const string Meyve = "Meyve";
    public const string Tahil = "Tahil";
    public const string Yem = "Yem";
    public const string Bal = "Bal";
    public const string Kuruyemis = "Kuruyemis";
    public const string Arazi = "Arazi";

    public static readonly string[] All = [Meyve, Tahil, Yem, Bal, Kuruyemis, Arazi];

    public static readonly string[] Packaging =
        ["Kasa", "Koli", "Dökme", "Çuval", "Big bag", "Balya", "Kavanoz", "Teneke", "Diğer"];
    public static readonly string[] Delivery = ["Yerinden teslim", "Satıcı teslimatı", "Görüşülür"];
    public static readonly string[] Zoning =
        ["İmarsız (tarım arazisi)", "Konut imarlı", "Ticari imarlı", "Sanayi imarlı", "Turizm imarlı", "Belirtilmedi"];
    public static readonly string[] Deed = ["Müstakil tapu", "Hisseli tapu", "Tahsisli", "Zilliyet"];
    public static readonly string[] LandDeals = ["Satilik", "Kiralik"];
    public static readonly string[] Irrigation = ["Sulu", "Kısmen sulu", "Kuru (yağışa bağlı)"];

    // Kategoriye göre izin verilen birimler; ilk değer varsayılandır.
    public static string[] UnitsOf(string category) => category switch
    {
        Yem => ["balya", "kg"],
        Arazi => ["m2"],
        _ => ["kg"]
    };
}

public class Listing
{
    public Guid Id { get; private set; }
    public Guid OwnerId { get; private set; }

    public string Baslik { get; private set; } = "";
    public string MeyveTuru { get; private set; } = "";
    public string Cesit { get; private set; } = "";

    public decimal MiktarKg { get; private set; }
    public decimal KilogramFiyati { get; private set; }
    public decimal? OncekiKilogramFiyati { get; private set; }

    public string Il { get; private set; } = "";
    public string Ilce { get; private set; } = "";
    public string Aciklama { get; private set; } = "";
    public string Telefon { get; private set; } = "";

    public string? Ambalaj { get; private set; }
    public string? Teslimat { get; private set; }
    public decimal? MinAlimKg { get; private set; }
    public DateTime? HasatTarihi { get; private set; }
    public DateTime OlusturulmaTarihi { get; private set; }

    public string Kategori { get; private set; } = ListingCategories.Meyve;
    public string Birim { get; private set; } = "kg";
    public string? IslemTipi { get; private set; }
    public string? ImarDurumu { get; private set; }
    public string? TapuDurumu { get; private set; }
    public string? Sulama { get; private set; }
    public string? Ada { get; private set; }
    public string? Parsel { get; private set; }
    public bool? Elektrik { get; private set; }
    public bool? YolCephesi { get; private set; }
    public decimal? Enlem { get; private set; }
    public decimal? Boylam { get; private set; }

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

        if (Hidden || (Status != ListingStatus.Draft && Status != ListingStatus.ChangesRequested &&
            !(Status == ListingStatus.Published && Active && ExpiresAt > DateTime.UtcNow)))
            throw new InvalidOperationException("Bu durumdaki ilan düzenlenemez.");
        ValidateData(data);

        Baslik = data.Baslik.Trim();
        MeyveTuru = data.MeyveTuru.Trim();
        Cesit = (data.Cesit ?? "").Trim();

        MiktarKg = data.MiktarKg;
        if (KilogramFiyati > 0 && data.KilogramFiyati != KilogramFiyati)
            OncekiKilogramFiyati = data.KilogramFiyati < KilogramFiyati ? KilogramFiyati : null;
        KilogramFiyati = data.KilogramFiyati;

        Il = data.Il.Trim();
        Ilce = data.Ilce.Trim();
        Aciklama = (data.Aciklama ?? "").Trim();
        Telefon = data.Telefon.Trim();
        HasatTarihi = data.HasatTarihi?.Date;
        Ambalaj = string.IsNullOrWhiteSpace(data.Ambalaj) ? null : data.Ambalaj;
        Teslimat = string.IsNullOrWhiteSpace(data.Teslimat) ? null : data.Teslimat;
        MinAlimKg = data.MinAlimKg;
        Kategori = data.Kategori;
        Birim = UnitOf(data);
        var land = Kategori == ListingCategories.Arazi ? data.Arazi : null;
        IslemTipi = land is null ? null : Clean(land.IslemTipi) ?? "Satilik";
        ImarDurumu = Clean(land?.ImarDurumu);
        TapuDurumu = Clean(land?.TapuDurumu);
        Sulama = Clean(land?.Sulama);
        Ada = Clean(land?.Ada);
        Parsel = Clean(land?.Parsel);
        Elektrik = land?.Elektrik;
        YolCephesi = land?.YolCephesi;
        if (Kategori == ListingCategories.Arazi)
        {
            // Arazi ilanında ürün koşulları kullanılmaz.
            Ambalaj = null; Teslimat = null; MinAlimKg = null; HasatTarihi = null;
        }
        Enlem = data.Enlem is null || data.Boylam is null ? null : decimal.Round(data.Enlem.Value, 4);
        Boylam = data.Enlem is null || data.Boylam is null ? null : decimal.Round(data.Boylam.Value, 4);

        // Yayındaki düzenleme mevcut yayın tarihlerini ve durumunu korur.
        Active = Status == ListingStatus.Published;
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

    public void PublishAutomatically()
    {
        EnsureNotDeleted();
        if (Hidden || (Status != ListingStatus.PendingReview && Status != ListingStatus.AwaitingPayment))
            throw new InvalidOperationException("İlan otomatik yayına uygun değil.");

        ValidateData(Snapshot());
        var now = DateTime.UtcNow;
        Status = ListingStatus.Published;
        Active = true;
        PublishedAt = now;
        ExpiresAt = now.AddDays(30);
        // Otomatik yayın bir insanın inceleme yaptığı anlamına gelmez.
        ReviewedBy = null;
        ReviewedAt = null;
        ReviewNote = null;
    }

    public void Approve(Guid reviewerId)
    {
        EnsureNotDeleted();
        if (Status != ListingStatus.PendingReview && Status != ListingStatus.AwaitingPayment)
            throw new InvalidOperationException("İlan onay veya yayın beklemiyor.");

        if (reviewerId == Guid.Empty)
        {
            throw new ArgumentException("İnceleyen kullanıcı gerekli.");
        }

        // Ödeme entegrasyonu hazır olana kadar onayla birlikte 30 günlük ücretsiz yayın.
        var now = DateTime.UtcNow;
        Status = ListingStatus.Published;
        Active = true;
        PublishedAt = now;
        ExpiresAt = now.AddDays(30);

        ReviewedBy = reviewerId;
        ReviewedAt = now;
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

    // Kayıtlı alanlardan doğrulama için ilan verisi üretir.
    public ListingData Snapshot() => new(Baslik, MeyveTuru, Cesit, MiktarKg, KilogramFiyati,
        Il, Ilce, Aciklama, Telefon, HasatTarihi, false, Ambalaj, Teslimat, MinAlimKg,
        Kategori, Birim, new LandDetails(ImarDurumu, TapuDurumu, Sulama, Ada, Parsel, Elektrik, YolCephesi, IslemTipi),
        Enlem, Boylam);

    private static string? Clean(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static string UnitOf(ListingData data)
    {
        var units = ListingCategories.UnitsOf(data.Kategori);
        return string.IsNullOrWhiteSpace(data.Birim) ? units[0] : data.Birim.Trim();
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
        if (!ListingCategories.All.Contains(data.Kategori))
            throw new ArgumentException("Kategori geçersiz.");
        var land = data.Kategori == ListingCategories.Arazi;
        if (!ListingCategories.UnitsOf(data.Kategori).Contains(UnitOf(data)))
            throw new ArgumentException("Bu kategori için miktar birimi geçersiz.");
        if (decimal.Round(data.KilogramFiyati, 2) != data.KilogramFiyati)
            throw new ArgumentException("Fiyat en fazla iki ondalık basamak içerebilir.");
        // Ürünlerde birim fiyat, arazide toplam satış fiyatı girilir.
        if (!land && data.KilogramFiyati > 1_000_000m)
            throw new ArgumentException("Birim fiyat en fazla 1.000.000 TL olabilir.");
        if (land && data.KilogramFiyati > 10_000_000_000m)
            throw new ArgumentException("Arazi fiyatı en fazla 10 milyar TL olabilir.");
        if (land && (data.MiktarKg < 1 || data.MiktarKg > 100_000_000m))
            throw new ArgumentException("Arazi alanı 1 ile 100.000.000 m² arasında olmalı.");
        if (!land && data.MinAlimKg is not null && (data.MinAlimKg < 0.01m || data.MinAlimKg > data.MiktarKg || decimal.Round(data.MinAlimKg.Value,2) != data.MinAlimKg))
            throw new ArgumentException("Minimum alım miktarı sıfırdan büyük olmalı ve ürün miktarını aşmamalı.");
        if (!land && !string.IsNullOrEmpty(data.Ambalaj) && !ListingCategories.Packaging.Contains(data.Ambalaj))
            throw new ArgumentException("Ambalaj seçeneği geçersiz.");
        if (!land && !string.IsNullOrEmpty(data.Teslimat) && !ListingCategories.Delivery.Contains(data.Teslimat))
            throw new ArgumentException("Teslimat seçeneği geçersiz.");
        if (land)
        {
            var a = data.Arazi;
            if (a is not null && !string.IsNullOrWhiteSpace(a.IslemTipi) && !ListingCategories.LandDeals.Contains(a.IslemTipi.Trim()))
                throw new ArgumentException("Arazi için satılık veya kiralık seç.");
            if (a is null || string.IsNullOrWhiteSpace(a.ImarDurumu) || !ListingCategories.Zoning.Contains(a.ImarDurumu.Trim()))
                throw new ArgumentException("Arazinin imar durumunu seç.");
            if (string.IsNullOrWhiteSpace(a.TapuDurumu) || !ListingCategories.Deed.Contains(a.TapuDurumu.Trim()))
                throw new ArgumentException("Arazinin tapu durumunu seç.");
            if (!string.IsNullOrWhiteSpace(a.Sulama) && !ListingCategories.Irrigation.Contains(a.Sulama.Trim()))
                throw new ArgumentException("Sulama seçeneği geçersiz.");
            foreach (var part in new[] { a.Ada, a.Parsel })
                if (!string.IsNullOrWhiteSpace(part) && !System.Text.RegularExpressions.Regex.IsMatch(part.Trim(), @"\A[0-9A-Za-z/ -]{1,20}\z"))
                    throw new ArgumentException("Ada ve parsel en fazla 20 karakter; rakam, harf, / ve - içerebilir.");
        }
        if ((data.Enlem is null) != (data.Boylam is null) ||
            data.Enlem is < 35.5m or > 42.5m || data.Boylam is < 25.5m or > 45m)
            throw new ArgumentException("Harita konumu Türkiye sınırları içinde olmalı.");
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
