using System.ComponentModel.DataAnnotations;
using Hasadim.Core;

namespace Hasadim.Application;

public class MarketplaceService(
    IMarketplaceRepository repo,
    ICurrentUser current,
    IProfileRepository profiles)
{
    private Guid User =>
        current.Id
        ?? throw new AppException(401, "Giriş yapın.");

    private async Task SetProfilePhone(ListingRequest request, CancellationToken ct)
    {
        var profile = await profiles.Find(User, ct);
        var phone = profile?.Phone?.Trim() ?? "";
        if (string.IsNullOrWhiteSpace(phone) ||
            !System.Text.RegularExpressions.Regex.IsMatch(phone, @"\A[+0-9 ()-]{10,25}\z") ||
            phone.Count(char.IsAsciiDigit) < 10)
            throw new AppException(400, "İlan vermeden önce Profilim → Bilgilerimi düzenle bölümünden geçerli telefon numaranı kaydet.");
        request.Telefon = phone;
    }

    private static bool IsPublic(
        bool active,
        bool hidden,
        ListingStatus status,
        DateTime? expiresAt)
    {
        return active
            && !hidden
            && status == ListingStatus.Published
            && (!expiresAt.HasValue || expiresAt.Value > DateTime.UtcNow);
    }

    private static void ValidateRequest(object request)
    {
        var errors = new List<ValidationResult>();

        if (!Validator.TryValidateObject(
            request,
            new ValidationContext(request),
            errors,
            validateAllProperties: true))
        {
            throw new AppException(
                400,
                string.Join(" ", errors.Select(x => x.ErrorMessage))
            );
        }
    }

    // Core katmanındaki kural hatalarını uygun API hatasına çevirir.
    private static void Apply(Action action)
    {
        try
        {
            action();
        }
        catch (ArgumentException error)
        {
            throw new AppException(400, error.Message);
        }
        catch (InvalidOperationException error)
        {
            throw new AppException(409, error.Message);
        }
    }

    private static void EnsureEditable(Listing listing)
    {
        if (listing.Status != ListingStatus.Draft &&
            listing.Status != ListingStatus.ChangesRequested)
        {
            throw new AppException(
                409,
                "Yalnızca taslak veya düzeltme bekleyen ilan düzenlenebilir."
            );
        }
    }

    private static void EnsureVersion(
        Listing listing,
        byte[]? expectedVersion)
    {
        if (expectedVersion is null || expectedVersion.Length != 8)
        {
            throw new AppException(
                400,
                "İlan sürümü eksik. Sayfayı yenileyin."
            );
        }

        if (!listing.Version.SequenceEqual(expectedVersion))
        {
            throw new AppException(
                409,
                "İlan başka bir işlemle değişti. Sayfayı yenileyin."
            );
        }
    }

    private async Task<Listing> FindExisting(
        Guid id,
        CancellationToken ct)
    {
        var listing = await repo.Find(id, ct);

        if (listing is null || listing.IsDeleted)
        {
            throw new AppException(404, "İlan bulunamadı.");
        }

        return listing;
    }

    private async Task<Listing> Own(
        Guid id,
        CancellationToken ct)
    {
        var userId = User;
        var listing = await FindExisting(id, ct);

        if (listing.OwnerId != userId)
        {
            throw new AppException(403, "Bu ilan size ait değil.");
        }

        return listing;
    }

    private void Admin()
    {
        _ = User;

        if (!current.IsAdmin)
        {
            throw new AppException(
                403,
                "Yönetici yetkisi gerekli."
            );
        }
    }

    private async Task Save(
        Listing listing,
        byte[] version,
        CancellationToken ct)
    {
        // İlk kontrolden sonra oluşabilecek değişiklikleri de
        // SQL'deki rowversion koşulu yakalar.
        if (!await repo.Update(listing, version, ct))
        {
            throw new AppException(
                409,
                "İlan başka bir işlemle değişti. Sayfayı yenileyin."
            );
        }
    }

    private void PrepareView(ListingView listing)
    {
        // Süresi dolan ilanı ekranda doğru göster.
        // Bu, veritabanına durum güncellemesi yazmaz.
        if (listing.Status == ListingStatus.Published &&
            listing.ExpiresAt.HasValue &&
            listing.ExpiresAt.Value <= DateTime.UtcNow)
        {
            listing.Status = ListingStatus.Expired;
            listing.Active = false;
        }

        // İnceleme gerekçesi yalnızca sahibine ve yönetime gösterilir.
        if (listing.OwnerId != current.Id && !current.IsAdmin)
        {
            listing.ReviewNote = null;
        }
    }

    public async Task<Paged<ListingView>> Search(
        ListingQuery q,
        CancellationToken ct)
    {
        if (q.Review)
        {
            Admin();
            if (q.Mine || q.Favorites || q.History)
                throw new AppException(400, "İnceleme filtresi diğer hesap filtreleriyle birlikte kullanılamaz.");
        }

        if (q.Mine || q.Favorites || q.History)
        {
            _ = User;
        }

        ValidateRequest(q);
        if (q.History && (q.Mine || q.Favorites))
            throw new AppException(400, "Geçmiş ilan filtresi diğer hesap filtreleriyle birlikte kullanılamaz.");

        if (q.MinFiyat < 0 ||
            q.MaxFiyat < 0 ||
            q.MinFiyat > q.MaxFiyat)
        {
            throw new AppException(400, "Fiyat aralığı geçersiz.");
        }

        var result = await repo.Search(q, current.Id, ct);

        foreach (var listing in result.Items)
        {
            PrepareView(listing);
        }

        return result;
    }

    public async Task<ListingView> Detail(
        Guid id,
        CancellationToken ct)
    {
        var listing = await repo.Detail(id, current.Id, ct);

        if (listing is null || listing.IsDeleted)
        {
            throw new AppException(404, "İlan bulunamadı.");
        }

        var privileged =
            listing.OwnerId == current.Id || current.IsAdmin;

        if (!privileged &&
            !IsPublic(
                listing.Active,
                listing.Hidden,
                listing.Status,
                listing.ExpiresAt))
        {
            throw new AppException(404, "İlan bulunamadı.");
        }

        PrepareView(listing);

        if (listing.PhotoUrl is not null)
        {
            listing.PhotoUrl =
                $"/api/meyve-ilanlari/{id}/photo";
        }

        foreach (var photo in listing.Photos)
        {
            photo.PhotoUrl =
                $"/api/meyve-ilanlari/{id}/photos/{photo.Id}";
        }

        if (current.Id is null ||
            (!listing.ShowPhone && listing.OwnerId != current.Id))
        {
            listing.Telefon = null;
        }

        return listing;
    }

    public async Task<Guid> Create(
        ListingRequest request,
        CancellationToken ct,
        IReadOnlyList<string>? photos = null)
    {
        var userId = User;

        ValidateRequest(request);
        await SetProfilePhone(request, ct);

        if (photos is null || photos.Count < 1 || photos.Count > 10)
        {
            throw new AppException(
                400,
                "En az 1, en fazla 10 fotoğraf gerekli."
            );
        }

        Listing listing;

        try
        {
            listing = Listing.Create(userId, request.Data());
        }
        catch (ArgumentException error)
        {
            throw new AppException(400, error.Message);
        }

        Apply(listing.SubmitForReview);
        Apply(listing.PublishAutomatically);
        await repo.Create(listing, photos, ct);

        return listing.Id;
    }

    public async Task Update(
        Guid id,
        ListingRequest request,
        CancellationToken ct)
    {
        var listing = await Own(id, ct);

        EnsureEditable(listing);
        ValidateRequest(request);
        await SetProfilePhone(request, ct);
        EnsureVersion(listing, request.Version);

        if (listing.Hidden)
            throw new AppException(409, "Yönetim tarafından gizlenen ilan için destek alın.");

        var detail = await repo.Detail(id, current.Id, ct);
        if (detail is null || detail.IsDeleted)
            throw new AppException(404, "İlan bulunamadı.");
        if (detail.Photos.Count < 1 || detail.Photos.Count > 10)
            throw new AppException(400, "İlan için 1–10 fotoğraf gerekli.");

        Apply(() =>
        {
            listing.Update(request.Data());
            listing.SubmitForReview();
            listing.PublishAutomatically();
        });

        await Save(listing, request.Version!, ct);
    }

    public async Task AddPhotos(
        Guid id,
        IReadOnlyList<string> photos,
        CancellationToken ct)
    {
        var listing = await Own(id, ct);

        EnsureEditable(listing);

        if (photos.Count < 1 || photos.Count > 10)
        {
            throw new AppException(400, "1–10 fotoğraf seçin.");
        }

        // Repository, durum kontrolünü kilit altında tekrar yapar.
        await repo.AddPhotos(id, photos, ct);
    }

    public async Task SetPhoto(
        Guid id,
        string url,
        CancellationToken ct)
    {
        var listing = await Own(id, ct);

        EnsureEditable(listing);

        await repo.SetPhoto(id, url, ct);
    }

    public async Task CheckOwner(
        Guid id,
        CancellationToken ct)
    {
        _ = await Own(id, ct);
    }

    public async Task Delete(
        Guid id,
        CancellationToken ct)
    {
        await Own(id, ct);
        await repo.Delete(id, ct);
    }

    // Eski istemciler için gönderim adresi korunur; kontroller sonrası otomatik yayınlar.
    public async Task SubmitForReview(
        Guid id,
        ListingWorkflowRequest request,
        CancellationToken ct)
    {
        var listing = await Own(id, ct);

        ValidateRequest(request);
        EnsureVersion(listing, request.Version);

        if (listing.Hidden)
        {
            throw new AppException(
                409,
                "Yönetim tarafından gizlenen ilan için önce destek alın."
            );
        }

        var detail = await repo.Detail(id, current.Id, ct);

        if (detail is null || detail.IsDeleted)
        {
            throw new AppException(404, "İlan bulunamadı.");
        }

        if (detail.Photos.Count < 1 || detail.Photos.Count > 10)
        {
            throw new AppException(
                400,
                "İncelemeye göndermek için 1–10 fotoğraf gerekli."
            );
        }

        Apply(() =>
        {
            listing.SubmitForReview();
            listing.PublishAutomatically();
        });

        await Save(listing, request.Version, ct);
    }

    // Yalnızca yönetici onaylayabilir.
    // Geçici ücretsiz yayın: onaydan itibaren 30 gün.
    public async Task Approve(
        Guid id,
        ListingWorkflowRequest request,
        CancellationToken ct)
    {
        Admin();

        var listing = await FindExisting(id, ct);

        ValidateRequest(request);
        EnsureVersion(listing, request.Version);

        if (listing.Hidden)
        {
            throw new AppException(
                409,
                "Gizlenmiş ilan bu işlemle onaylanamaz."
            );
        }

        Apply(() => listing.Approve(User));

        await Save(listing, request.Version, ct);
    }

    public async Task RequestChanges(
        Guid id,
        ListingChangesRequest request,
        CancellationToken ct)
    {
        Admin();

        var listing = await FindExisting(id, ct);

        ValidateRequest(request);
        EnsureVersion(listing, request.Version);

        Apply(() => listing.RequestChanges(User, request.Note));

        await Save(listing, request.Version, ct);
    }

    public async Task MarkAsSold(
        Guid id,
        ListingWorkflowRequest request,
        CancellationToken ct)
    {
        var listing = await Own(id, ct);

        ValidateRequest(request);
        EnsureVersion(listing, request.Version);

        Apply(() => listing.MarkAsSold());

        await Save(listing, request.Version, ct);
    }

    public async Task Favorite(
        Guid id,
        bool add,
        CancellationToken ct)
    {
        var userId = User;

        if (add)
        {
            var listing = await FindExisting(id, ct);

            if (!IsPublic(
                listing.Active,
                listing.Hidden,
                listing.Status,
                listing.ExpiresAt))
            {
                throw new AppException(
                    404,
                    "Yayında ilan bulunamadı."
                );
            }
        }

        await repo.Favorite(id, userId, add, ct);
    }

    public Task<IReadOnlyList<MessageView>> Messages(
        int page,
        CancellationToken ct)
    {
        if (page < 1 || page > 100000)
        {
            throw new AppException(400, "Sayfa geçersiz.");
        }

        return repo.Messages(User, page, ct);
    }

    public async Task Send(
        MessageRequest request,
        CancellationToken ct)
    {
        var userId = User;

        ValidateRequest(request);

        var listing = await FindExisting(request.ListingId, ct);

        if (request.RecipientId == userId ||
            request.RecipientId == Guid.Empty)
        {
            throw new AppException(400, "Alıcı geçersiz.");
        }

        if (userId == listing.OwnerId)
        {
            // Satıcı yalnızca daha önce yazıştığı kişiye cevap verebilir.
            if (!await repo.HasConversation(
                listing.Id,
                request.RecipientId,
                userId,
                ct))
            {
                throw new AppException(
                    403,
                    "Bu kullanıcıyla görüşme yok."
                );
            }
        }
        else
        {
            if (request.RecipientId != listing.OwnerId ||
                !IsPublic(
                    listing.Active,
                    listing.Hidden,
                    listing.Status,
                    listing.ExpiresAt))
            {
                throw new AppException(
                    403,
                    "Bu ilana mesaj gönderilemez."
                );
            }
        }

        await repo.Send(Guid.NewGuid(), userId, request, ct);
    }

    public async Task Report(
        Guid id,
        string reason,
        CancellationToken ct)
    {
        var userId = User;

        if (string.IsNullOrWhiteSpace(reason) ||
            reason.Trim().Length > 1000)
        {
            throw new AppException(
                400,
                "Bildirim gerekçesi 1–1000 karakter olmalıdır."
            );
        }

        await Detail(id, ct);

        await repo.Report(id, userId, reason.Trim(), ct);
    }

    public Task<IReadOnlyList<ReportView>> Reports(
        CancellationToken ct)
    {
        Admin();
        return repo.Reports(ct);
    }

    public Task Visibility(
        Guid id,
        bool hidden,
        CancellationToken ct)
    {
        Admin();

        // Gizliliği kaldırmak yayın hakkı vermez.
        // Status, Active ve süre kontrolleri ayrıca uygulanır.
        return repo.Visibility(id, hidden, ct);
    }

    public Task Resolve(
        Guid id,
        CancellationToken ct)
    {
        Admin();
        return repo.Resolve(id, ct);
    }
}
