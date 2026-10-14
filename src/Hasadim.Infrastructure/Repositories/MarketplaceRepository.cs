using Dapper;
using Hasadim.Application;
using Hasadim.Core;
using Hasadim.Infrastructure.Database;
namespace Hasadim.Infrastructure.Repositories;

public class MarketplaceRepository(SqlConnectionFactory factory) : IMarketplaceRepository
{
    const string ViewColumns = "l.*,COALESCE((SELECT p.ShowPhone FROM dbo.UserProfiles p WHERE p.UserId=l.OwnerId),CAST(1 AS bit)) AS ShowPhone,u.DisplayName AS OwnerName,CAST(CASE WHEN l.OwnerId=@user THEN 1 ELSE 0 END AS bit) AS IsMine,CAST(CASE WHEN EXISTS(SELECT 1 FROM dbo.Favorites f WHERE f.ListingId=l.Id AND f.UserId=@user) THEN 1 ELSE 0 END AS bit) AS Favorite";
    public async Task<Paged<ListingView>> Search(ListingQuery q, Guid? user, CancellationToken ct)
    {
        await using var c = await factory.Open(ct); var where = "l.IsDeleted=0";
        where += q.Review
          ? " AND l.Status=1 AND l.Hidden=0"
          : q.Mine
          ? " AND l.OwnerId=@user"
          : """
       AND l.Active = 1
       AND l.Hidden = 0
       AND l.Status = 4
       AND (l.ExpiresAt IS NULL OR l.ExpiresAt > SYSUTCDATETIME())
      """;
        if (q.OwnerId.HasValue) where += " AND l.OwnerId=@owner";
        if (q.Favorites) where += " AND EXISTS(SELECT 1 FROM dbo.Favorites f WHERE f.ListingId=l.Id AND f.UserId=@user)";
        if (!string.IsNullOrWhiteSpace(q.Q)) where += " AND (l.Baslik LIKE @term OR l.Cesit LIKE @term)";
        if (!string.IsNullOrWhiteSpace(q.MeyveTuru)) where += " AND l.MeyveTuru=@fruit";
        if (!string.IsNullOrWhiteSpace(q.Il)) where += " AND l.Il=@city";
        if (q.MinFiyat.HasValue) where += " AND l.KilogramFiyati>=@min";
        if (q.MaxFiyat.HasValue) where += " AND l.KilogramFiyati<=@max";
        var order = q.Sort switch { "priceAsc" => "l.KilogramFiyati ASC,l.Id", "priceDesc" => "l.KilogramFiyati DESC,l.Id", _ => "l.OlusturulmaTarihi DESC,l.Id" };
        var args = new { user, owner = q.OwnerId, term = "%" + q.Q?.Trim() + "%", fruit = q.MeyveTuru?.Trim(), city = q.Il?.Trim(), min = q.MinFiyat, max = q.MaxFiyat, skip = (q.Page - 1) * q.PageSize, take = q.PageSize };
        using var results = await c.QueryMultipleAsync(new CommandDefinition("SELECT COUNT(*) FROM dbo.Listings l WHERE " + where + "; SELECT " + ViewColumns + " FROM dbo.Listings l JOIN dbo.Users u ON u.Id=l.OwnerId WHERE " + where + " ORDER BY " + order + " OFFSET @skip ROWS FETCH NEXT @take ROWS ONLY", args, cancellationToken: ct));
        var total = await results.ReadSingleAsync<int>(); var items = (await results.ReadAsync<ListingView>()).ToList(); foreach (var x in items) { x.Telefon = null; if (x.PhotoUrl is not null) x.PhotoUrl = $"/api/meyve-ilanlari/{x.Id}/photo"; }
        return new(items, total, q.Page, q.PageSize);
    }
    public async Task<Listing?> Find(Guid id, CancellationToken ct) { await using var c = await factory.Open(ct); return await c.QuerySingleOrDefaultAsync<Listing>(new CommandDefinition("SELECT * FROM dbo.Listings WHERE Id=@id", new { id }, cancellationToken: ct)); }
    public async Task<ListingView?> Detail(Guid id, Guid? user, CancellationToken ct) { await using var c = await factory.Open(ct); var item = await c.QuerySingleOrDefaultAsync<ListingView>(new CommandDefinition("SELECT " + ViewColumns + " FROM dbo.Listings l JOIN dbo.Users u ON u.Id=l.OwnerId WHERE l.Id=@id", new { id, user }, cancellationToken: ct)); if (item is not null) item.Photos = (await c.QueryAsync<ListingPhoto>(new CommandDefinition("SELECT Id,Url FROM dbo.ListingPhotos WHERE ListingId=@id ORDER BY SortOrder", new { id }, cancellationToken: ct))).ToList(); return item; }
    public async Task Create(
       Listing l,
       IReadOnlyList<string> photos,
       CancellationToken ct)
    {
        if (photos.Count < 1 || photos.Count > 10)
        {
            throw new AppException(
                400,
                "En az 1, en fazla 10 fotoğraf gerekli."
            );
        }

        if (l.Status != ListingStatus.PendingReview || l.Active || l.SubmittedAt is null)
        {
            throw new AppException(
                400,
                "Yeni ilan inceleme bekleyen durumda oluşturulmalıdır."
            );
        }

        await using var c = await factory.Open(ct);
        using var tx = c.BeginTransaction();

        const string sql = """
        INSERT dbo.Listings
        (
            Id,
            OwnerId,
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
            OlusturulmaTarihi,
            Active,
            Status,
            SubmittedAt,
            PhotoUrl
        )
        VALUES
        (
            @Id,
            @OwnerId,
            @Baslik,
            @MeyveTuru,
            @Cesit,
            @MiktarKg,
            @KilogramFiyati,
            @Il,
            @Ilce,
            @Aciklama,
            @Telefon,
            @HasatTarihi,
            @OlusturulmaTarihi,
            0,
            @Status,
            @SubmittedAt,
            @Photo
        );
        """;

        var parameters = new
        {
            l.Id,
            l.OwnerId,
            l.Baslik,
            l.MeyveTuru,
            l.Cesit,
            l.MiktarKg,
            l.KilogramFiyati,
            l.Il,
            l.Ilce,
            l.Aciklama,
            l.Telefon,
            l.HasatTarihi,
            l.OlusturulmaTarihi,
            Status = (int)l.Status,
            l.SubmittedAt,
            Photo = photos[0]
        };

        await c.ExecuteAsync(new CommandDefinition(
            sql,
            parameters,
            tx,
            cancellationToken: ct
        ));

        for (int i = 0; i < photos.Count; i++)
        {
            await c.ExecuteAsync(new CommandDefinition(
                """
            INSERT dbo.ListingPhotos
                (Id, ListingId, Url, SortOrder)
            VALUES
                (@PhotoId, @ListingId, @Url, @SortOrder);
            """,
                new
                {
                    PhotoId = Guid.NewGuid(),
                    ListingId = l.Id,
                    Url = photos[i],
                    SortOrder = i
                },
                tx,
                cancellationToken: ct
            ));
        }

        tx.Commit();
    }
    public async Task AddPhotos(
    Guid id,
    IReadOnlyList<string> photos,
    CancellationToken ct)
    {
        if (photos.Count < 1 || photos.Count > 10)
        {
            throw new AppException(
                400,
                "1–10 fotoğraf seçin."
            );
        }

        await using var c = await factory.Open(ct);
        using var tx = c.BeginTransaction();

        var status = await c.QuerySingleOrDefaultAsync<int?>(
            new CommandDefinition(
                """
            SELECT Status
            FROM dbo.Listings WITH (UPDLOCK, HOLDLOCK)
            WHERE Id = @id AND IsDeleted = 0;
            """,
                new { id },
                tx,
                cancellationToken: ct
            )
        );

        if (status is null)
        {
            throw new AppException(404, "İlan bulunamadı.");
        }

        if (status != (int)ListingStatus.Draft &&
            status != (int)ListingStatus.ChangesRequested)
        {
            throw new AppException(
                409,
                "Bu durumdaki ilanın fotoğrafları değiştirilemez."
            );
        }

        var count = await c.ExecuteScalarAsync<int>(
            new CommandDefinition(
                """
            SELECT COUNT(*)
            FROM dbo.ListingPhotos
            WHERE ListingId = @id;
            """,
                new { id },
                tx,
                cancellationToken: ct
            )
        );

        if (count + photos.Count > 10)
        {
            throw new AppException(
                400,
                "Bir ilanda en fazla 10 fotoğraf olabilir."
            );
        }

        var lastOrder = await c.ExecuteScalarAsync<int>(
            new CommandDefinition(
                """
            SELECT COALESCE(MAX(SortOrder), -1)
            FROM dbo.ListingPhotos
            WHERE ListingId = @id;
            """,
                new { id },
                tx,
                cancellationToken: ct
            )
        );

        for (int i = 0; i < photos.Count; i++)
        {
            await c.ExecuteAsync(new CommandDefinition(
                """
            INSERT dbo.ListingPhotos
                (Id, ListingId, Url, SortOrder)
            VALUES
                (@PhotoId, @ListingId, @Url, @SortOrder);
            """,
                new
                {
                    PhotoId = Guid.NewGuid(),
                    ListingId = id,
                    Url = photos[i],
                    SortOrder = lastOrder + i + 1
                },
                tx,
                cancellationToken: ct
            ));
        }

        // Kapak varsa korunur.
        // UPDATE, ilanın rowversion değerini de değiştirir.
        await c.ExecuteAsync(new CommandDefinition(
            """
        UPDATE dbo.Listings
        SET PhotoUrl = COALESCE(PhotoUrl, @Photo)
        WHERE Id = @id AND IsDeleted = 0;
        """,
            new
            {
                id,
                Photo = photos[0]
            },
            tx,
            cancellationToken: ct
        ));

        tx.Commit();
    }
    public async Task<bool> Update(
        Listing l,
        byte[] version,
        CancellationToken ct)
    {
        await using var c = await factory.Open(ct);

        var parameters = new DynamicParameters(l);

        parameters.Add("Status", (int)l.Status);
        parameters.Add("ExpectedVersion", version);

        const string sql = """
        UPDATE dbo.Listings
        SET
            Baslik = @Baslik,
            MeyveTuru = @MeyveTuru,
            Cesit = @Cesit,
            MiktarKg = @MiktarKg,
            KilogramFiyati = @KilogramFiyati,
            Il = @Il,
            Ilce = @Ilce,
            Aciklama = @Aciklama,
            Telefon = @Telefon,
            HasatTarihi = @HasatTarihi,
            Active = @Active,
            Status = @Status,
            ReviewNote = @ReviewNote,
            ReviewedBy = @ReviewedBy,
            SubmittedAt = @SubmittedAt,
            ReviewedAt = @ReviewedAt,
            PublishedAt = @PublishedAt,
            ExpiresAt = @ExpiresAt
        WHERE
            Id = @Id
            AND OwnerId = @OwnerId
            AND IsDeleted = 0
            AND Version = @ExpectedVersion;
        """;

        var affected = await c.ExecuteAsync(new CommandDefinition(
            sql,
            parameters,
            cancellationToken: ct
        ));

        return affected == 1;
    }
    public async Task Delete(Guid id, CancellationToken ct) { await using var c = await factory.Open(ct); await c.ExecuteAsync(new CommandDefinition("UPDATE dbo.Listings SET IsDeleted=1,Active=0 WHERE Id=@id", new { id }, cancellationToken: ct)); }
    public async Task SetPhoto(
        Guid id,
        string url,
        CancellationToken ct)
    {
        await using var c = await factory.Open(ct);

        var affected = await c.ExecuteAsync(new CommandDefinition(
            """
        UPDATE dbo.Listings
        SET PhotoUrl = @url
        WHERE
            Id = @id
            AND IsDeleted = 0
            AND Status IN (@Draft, @ChangesRequested);
        """,
            new
            {
                id,
                url,
                Draft = (int)ListingStatus.Draft,
                ChangesRequested = (int)ListingStatus.ChangesRequested
            },
            cancellationToken: ct
        ));

        if (affected != 1)
        {
            throw new AppException(
                409,
                "İlan bulunamadı veya fotoğraf değişikliğine uygun değil."
            );
        }
    }
    public async Task Favorite(Guid id, Guid user, bool add, CancellationToken ct)
    {
        await using var c = await factory.Open(ct);
        if (!add) { await c.ExecuteAsync(new CommandDefinition("DELETE dbo.Favorites WHERE ListingId=@id AND UserId=@user", new { id, user }, cancellationToken: ct)); return; }
        using var tx = c.BeginTransaction(System.Data.IsolationLevel.Serializable);
        await c.ExecuteAsync(new CommandDefinition("IF NOT EXISTS(SELECT 1 FROM dbo.Favorites WITH(UPDLOCK,HOLDLOCK) WHERE ListingId=@id AND UserId=@user) INSERT dbo.Favorites(UserId,ListingId) VALUES(@user,@id)", new { id, user }, tx, cancellationToken: ct)); tx.Commit();
    }
    public async Task<IReadOnlyList<MessageView>> Messages(Guid user, int page, CancellationToken ct) { await using var c = await factory.Open(ct); return (await c.QueryAsync<MessageView>(new CommandDefinition("SELECT m.*,l.Baslik AS ListingTitle,s.DisplayName AS SenderName,r.DisplayName AS RecipientName FROM dbo.Messages m JOIN dbo.Listings l ON l.Id=m.ListingId JOIN dbo.Users s ON s.Id=m.SenderId JOIN dbo.Users r ON r.Id=m.RecipientId WHERE m.SenderId=@user OR m.RecipientId=@user ORDER BY m.CreatedAt DESC,m.Id OFFSET @skip ROWS FETCH NEXT 51 ROWS ONLY", new { user, skip = (page - 1) * 50 }, cancellationToken: ct))).ToList(); }
    public async Task<bool> HasConversation(Guid listing, Guid buyer, Guid owner, CancellationToken ct) { await using var c = await factory.Open(ct); return await c.ExecuteScalarAsync<int>(new CommandDefinition("SELECT COUNT(*) FROM dbo.Messages WHERE ListingId=@listing AND SenderId=@buyer AND RecipientId=@owner", new { listing, buyer, owner }, cancellationToken: ct)) > 0; }
    public async Task Send(Guid id, Guid sender, MessageRequest r, CancellationToken ct) { await using var c = await factory.Open(ct); await c.ExecuteAsync(new CommandDefinition("INSERT dbo.Messages(Id,ListingId,SenderId,RecipientId,Body,CreatedAt) VALUES(@id,@ListingId,@sender,@RecipientId,@body,SYSUTCDATETIME())", new { id, r.ListingId, sender, r.RecipientId, body = r.Body.Trim() }, cancellationToken: ct)); }
    public async Task Report(Guid listing, Guid user, string reason, CancellationToken ct) { await using var c = await factory.Open(ct); using var tx = c.BeginTransaction(System.Data.IsolationLevel.Serializable); await c.ExecuteAsync(new CommandDefinition("IF NOT EXISTS(SELECT 1 FROM dbo.Reports WITH(UPDLOCK,HOLDLOCK) WHERE ListingId=@listing AND UserId=@user AND Resolved=0) INSERT dbo.Reports(Id,ListingId,UserId,Reason,CreatedAt) VALUES(@id,@listing,@user,@reason,SYSUTCDATETIME())", new { id = Guid.NewGuid(), listing, user, reason }, tx, cancellationToken: ct)); tx.Commit(); }
    public async Task<IReadOnlyList<ReportView>> Reports(CancellationToken ct) { await using var c = await factory.Open(ct); return (await c.QueryAsync<ReportView>(new CommandDefinition("SELECT TOP(100) r.Id,r.ListingId,r.Reason,l.Baslik,l.Hidden FROM dbo.Reports r JOIN dbo.Listings l ON l.Id=r.ListingId WHERE r.Resolved=0 ORDER BY r.CreatedAt", cancellationToken: ct))).ToList(); }
    public async Task Visibility(Guid listing, bool hidden, CancellationToken ct) { await using var c = await factory.Open(ct); await c.ExecuteAsync(new CommandDefinition("UPDATE dbo.Listings SET Hidden=@hidden WHERE Id=@listing", new { listing, hidden }, cancellationToken: ct)); }
    public async Task Resolve(Guid report, CancellationToken ct) { await using var c = await factory.Open(ct); await c.ExecuteAsync(new CommandDefinition("UPDATE dbo.Reports SET Resolved=1 WHERE Id=@report", new { report }, cancellationToken: ct)); }
}
