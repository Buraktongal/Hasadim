using Dapper;
using Hasadim.Application;
using Hasadim.Core;
using Hasadim.Infrastructure.Database;
using Microsoft.Data.SqlClient;

namespace Hasadim.Infrastructure.Repositories;

public class EngagementRepository(SqlConnectionFactory factory) : IEngagementRepository
{
    private const int PageSize = 30;

    // Bildirim türü → kullanıcı ayarındaki sütun. Ayar kaydı yoksa bildirim açıktır.
    private static string? SettingColumn(string kind) => kind switch
    {
        NotificationKinds.Message => "NotifyMessages",
        NotificationKinds.OfferReceived or NotificationKinds.OfferAccepted or
        NotificationKinds.OfferRejected or NotificationKinds.OfferWithdrawn => "NotifyOffers",
        NotificationKinds.SavedSearch => "NotifySavedSearches",
        NotificationKinds.PriceDrop => "NotifyPriceDrops",
        _ => null
    };

    private static string Truncate(string value, int max) => value.Length <= max ? value : value[..(max - 1)] + "…";

    // ---- Teklifler ----

    private const string OfferColumns = """
        o.Id, o.ListingId, l.Baslik AS ListingTitle, l.ListingNumber, l.Kategori, l.Birim, l.KilogramFiyati AS ListingPrice,
        o.BuyerId, b.DisplayName AS BuyerName, o.SellerId, s.DisplayName AS SellerName,
        o.Amount, o.Quantity, o.Note, o.Reply, CAST(o.Status AS int) AS Status, o.CreatedAt, o.RespondedAt
        FROM dbo.Offers o
        JOIN dbo.Listings l ON l.Id = o.ListingId
        JOIN dbo.Users b ON b.Id = o.BuyerId
        JOIN dbo.Users s ON s.Id = o.SellerId
        """;

    public async Task CreateOffer(Guid id, Guid buyer, Guid seller, OfferRequest request, CancellationToken ct)
    {
        await using var c = await factory.Open(ct);
        try
        {
            await c.ExecuteAsync(new CommandDefinition("""
                INSERT dbo.Offers(Id, ListingId, BuyerId, SellerId, Amount, Quantity, Note)
                VALUES(@id, @ListingId, @buyer, @seller, @Amount, @Quantity, @Note);
                """, new { id, request.ListingId, buyer, seller, request.Amount, request.Quantity, request.Note }, cancellationToken: ct));
        }
        catch (SqlException e) when (e.Number is 2601 or 2627)
        {
            throw new AppException(409, "Bu ilanda yanıt bekleyen bir teklifin var. Önce onu geri çekebilirsin.");
        }
    }

    public async Task<OfferView?> FindOffer(Guid id, CancellationToken ct)
    {
        await using var c = await factory.Open(ct);
        return await c.QuerySingleOrDefaultAsync<OfferView>(new CommandDefinition(
            "SELECT " + OfferColumns + " WHERE o.Id = @id", new { id }, cancellationToken: ct));
    }

    public async Task<IReadOnlyList<OfferView>> Offers(Guid user, bool received, int page, CancellationToken ct)
    {
        await using var c = await factory.Open(ct);
        var filter = received ? "o.SellerId = @user" : "o.BuyerId = @user";
        var items = (await c.QueryAsync<OfferView>(new CommandDefinition(
            "SELECT " + OfferColumns + " WHERE " + filter +
            " ORDER BY CASE WHEN o.Status = 0 THEN 0 ELSE 1 END, o.CreatedAt DESC, o.Id OFFSET @skip ROWS FETCH NEXT @take ROWS ONLY",
            new { user, skip = (page - 1) * PageSize, take = PageSize }, cancellationToken: ct))).ToList();
        foreach (var item in items) item.Sent = item.BuyerId == user;
        return items;
    }

    public async Task<bool> SetOfferStatus(Guid id, OfferStatus expected, OfferStatus next, string? reply, CancellationToken ct)
    {
        await using var c = await factory.Open(ct);
        return await c.ExecuteAsync(new CommandDefinition("""
            UPDATE dbo.Offers SET Status = @next, Reply = COALESCE(@reply, Reply), RespondedAt = SYSUTCDATETIME()
            WHERE Id = @id AND Status = @expected;
            """, new { id, expected = (byte)expected, next = (byte)next, reply }, cancellationToken: ct)) == 1;
    }

    // ---- Bildirimler ----

    public async Task Notify(Guid user, string kind, string title, string body, string? link, object? data, CancellationToken ct)
    {
        var column = SettingColumn(kind);
        var allowed = column is null ? "" :
            " WHERE NOT EXISTS(SELECT 1 FROM dbo.UserSettings s WHERE s.UserId = @user AND s." + column + " = 0)";
        await using var c = await factory.Open(ct);
        await c.ExecuteAsync(new CommandDefinition(
            "INSERT dbo.Notifications(Id, UserId, Kind, Title, Body, Link, Data) SELECT @id, @user, @kind, @title, @body, @link, @data" +
            allowed + ";",
            new
            {
                id = Guid.NewGuid(), user, kind, title = Truncate(title, 150), body = Truncate(body, 400), link,
                data = data is null ? null : Truncate(EngagementService.DataJson(data), 1000)
            }, cancellationToken: ct));
    }

    public async Task NotifyPriceDrop(Listing listing, decimal oldPrice, CancellationToken ct)
    {
        var body = $"Favorindeki \"{listing.Baslik}\" ilanının fiyatı {EngagementService.Price(oldPrice, listing.Birim)} → {EngagementService.Price(listing.KilogramFiyati, listing.Birim)} oldu.";
        var data = EngagementService.DataJson(new { listing = listing.Baslik, oldPrice, newPrice = listing.KilogramFiyati, unit = listing.Birim });
        await using var c = await factory.Open(ct);
        await c.ExecuteAsync(new CommandDefinition("""
            INSERT dbo.Notifications(Id, UserId, Kind, Title, Body, Link, Data)
            SELECT NEWID(), f.UserId, @kind, N'Favori ilanda fiyat düştü', @body, @link, @data
            FROM dbo.Favorites f
            WHERE f.ListingId = @id AND f.UserId <> @owner
              AND NOT EXISTS(SELECT 1 FROM dbo.UserSettings s WHERE s.UserId = f.UserId AND s.NotifyPriceDrops = 0)
              AND NOT EXISTS(SELECT 1 FROM dbo.UserBlocks b WHERE b.BlockerId = f.UserId AND b.BlockedId = @owner);
            """, new
        {
            kind = NotificationKinds.PriceDrop, body = Truncate(body, 400), link = "/html/ilan.html?id=" + listing.Id,
            data = Truncate(data, 1000), id = listing.Id, owner = listing.OwnerId
        }, cancellationToken: ct));
    }

    public async Task NotifySavedSearches(Listing listing, CancellationToken ct)
    {
        var data = EngagementService.DataJson(new { listing = listing.Baslik, price = listing.KilogramFiyati, unit = listing.Birim });
        await using var c = await factory.Open(ct);
        // Kategori, ürün, çeşit, il, ilçe, fiyat aralığı ve arama kelimesi ilana uyan
        // kayıtlı aramalar; aynı kullanıcıya ilan başına tek bildirim.
        await c.ExecuteAsync(new CommandDefinition("""
            INSERT dbo.Notifications(Id, UserId, Kind, Title, Body, Link, Data)
            SELECT NEWID(), m.UserId, @kind, N'Kayıtlı aramana yeni ilan', @body + m.Name + N'”.', @link, @data
            FROM (
                SELECT s.UserId, MIN(s.Name) AS Name
                FROM dbo.SavedSearches s
                WHERE s.Notify = 1 AND s.UserId <> @owner
                  AND (s.Kategori IS NULL OR s.Kategori = @Kategori)
                  AND (s.MeyveTuru IS NULL OR s.MeyveTuru = @MeyveTuru)
                  AND (s.Cesit IS NULL OR s.Cesit = @Cesit)
                  AND (s.Il IS NULL OR s.Il = @Il)
                  AND (s.Ilce IS NULL OR s.Ilce = @Ilce)
                  AND (s.MinFiyat IS NULL OR @KilogramFiyati >= s.MinFiyat)
                  AND (s.MaxFiyat IS NULL OR @KilogramFiyati <= s.MaxFiyat)
                  AND (s.Q IS NULL OR @Baslik LIKE N'%' + s.Q + N'%' OR @Cesit LIKE N'%' + s.Q + N'%')
                  AND NOT EXISTS(SELECT 1 FROM dbo.UserSettings u WHERE u.UserId = s.UserId AND u.NotifySavedSearches = 0)
                  AND NOT EXISTS(SELECT 1 FROM dbo.UserBlocks b WHERE b.BlockerId = s.UserId AND b.BlockedId = @owner)
                GROUP BY s.UserId
            ) m;
            """, new
        {
            kind = NotificationKinds.SavedSearch,
            body = Truncate($"\"{listing.Baslik}\" ilanı yayına girdi · Arama: “", 300),
            link = "/html/ilan.html?id=" + listing.Id,
            data = Truncate(data, 1000),
            owner = listing.OwnerId,
            listing.Kategori, listing.MeyveTuru, listing.Cesit, listing.Il, listing.Ilce, listing.KilogramFiyati, listing.Baslik
        }, cancellationToken: ct));
    }

    public async Task<IReadOnlyList<NotificationView>> Notifications(Guid user, int page, CancellationToken ct)
    {
        await using var c = await factory.Open(ct);
        return (await c.QueryAsync<NotificationView>(new CommandDefinition("""
            SELECT Id, Kind, Title, Body, Link, Data, CreatedAt, ReadAt FROM dbo.Notifications
            WHERE UserId = @user ORDER BY CreatedAt DESC, Id OFFSET @skip ROWS FETCH NEXT @take ROWS ONLY;
            """, new { user, skip = (page - 1) * PageSize, take = PageSize + 1 }, cancellationToken: ct))).ToList();
    }

    public async Task<NotificationCounts> Counts(Guid user, CancellationToken ct)
    {
        await using var c = await factory.Open(ct);
        return await c.QuerySingleAsync<NotificationCounts>(new CommandDefinition("""
            SELECT (SELECT COUNT(*) FROM dbo.Notifications WHERE UserId = @user AND ReadAt IS NULL) AS Unread,
                   (SELECT COUNT(*) FROM dbo.Offers WHERE SellerId = @user AND Status = 0) AS PendingOffers;
            """, new { user }, cancellationToken: ct));
    }

    public async Task ReadNotifications(Guid user, Guid? id, CancellationToken ct)
    {
        await using var c = await factory.Open(ct);
        await c.ExecuteAsync(new CommandDefinition(
            "UPDATE dbo.Notifications SET ReadAt = SYSUTCDATETIME() WHERE UserId = @user AND ReadAt IS NULL AND (@id IS NULL OR Id = @id);",
            new { user, id }, cancellationToken: ct));
    }

    public async Task DeleteNotification(Guid user, Guid id, CancellationToken ct)
    {
        await using var c = await factory.Open(ct);
        await c.ExecuteAsync(new CommandDefinition("DELETE dbo.Notifications WHERE UserId = @user AND Id = @id;",
            new { user, id }, cancellationToken: ct));
    }

    // ---- Kayıtlı aramalar ----

    public async Task<IReadOnlyList<SavedSearchView>> SavedSearches(Guid user, CancellationToken ct)
    {
        await using var c = await factory.Open(ct);
        return (await c.QueryAsync<SavedSearchView>(new CommandDefinition(
            "SELECT Id, Name, Query, Notify, CreatedAt FROM dbo.SavedSearches WHERE UserId = @user ORDER BY CreatedAt DESC, Id;",
            new { user }, cancellationToken: ct))).ToList();
    }

    public async Task<Guid> SaveSearch(Guid user, string name, bool notify, SavedSearchFilters f, CancellationToken ct)
    {
        var id = Guid.NewGuid();
        await using var c = await factory.Open(ct);
        await c.ExecuteAsync(new CommandDefinition("""
            INSERT dbo.SavedSearches(Id, UserId, Name, Query, Kategori, MeyveTuru, Cesit, Il, Ilce, MinFiyat, MaxFiyat, Q, Notify)
            VALUES(@id, @user, @name, @Query, @Kategori, @MeyveTuru, @Cesit, @Il, @Ilce, @MinFiyat, @MaxFiyat, @Q, @notify);
            """, new { id, user, name, notify, f.Query, f.Kategori, f.MeyveTuru, f.Cesit, f.Il, f.Ilce, f.MinFiyat, f.MaxFiyat, f.Q },
            cancellationToken: ct));
        return id;
    }

    public async Task<bool> SetSavedSearchNotify(Guid user, Guid id, bool notify, CancellationToken ct)
    {
        await using var c = await factory.Open(ct);
        return await c.ExecuteAsync(new CommandDefinition(
            "UPDATE dbo.SavedSearches SET Notify = @notify WHERE UserId = @user AND Id = @id;",
            new { user, id, notify }, cancellationToken: ct)) == 1;
    }

    public async Task<bool> DeleteSavedSearch(Guid user, Guid id, CancellationToken ct)
    {
        await using var c = await factory.Open(ct);
        return await c.ExecuteAsync(new CommandDefinition("DELETE dbo.SavedSearches WHERE UserId = @user AND Id = @id;",
            new { user, id }, cancellationToken: ct)) == 1;
    }

    // ---- Engelleme ----

    public async Task<bool> IsBlocked(Guid a, Guid b, CancellationToken ct)
    {
        await using var c = await factory.Open(ct);
        return await c.ExecuteScalarAsync<int>(new CommandDefinition("""
            SELECT COUNT(*) FROM dbo.UserBlocks
            WHERE (BlockerId = @a AND BlockedId = @b) OR (BlockerId = @b AND BlockedId = @a);
            """, new { a, b }, cancellationToken: ct)) > 0;
    }

    public async Task<IReadOnlyList<BlockView>> Blocks(Guid user, CancellationToken ct)
    {
        await using var c = await factory.Open(ct);
        return (await c.QueryAsync<BlockView>(new CommandDefinition("""
            SELECT b.BlockedId AS UserId, u.DisplayName, b.CreatedAt
            FROM dbo.UserBlocks b JOIN dbo.Users u ON u.Id = b.BlockedId
            WHERE b.BlockerId = @user ORDER BY b.CreatedAt DESC;
            """, new { user }, cancellationToken: ct))).ToList();
    }

    public async Task Block(Guid user, Guid target, CancellationToken ct)
    {
        await using var c = await factory.Open(ct);
        using var tx = c.BeginTransaction(System.Data.IsolationLevel.Serializable);
        await c.ExecuteAsync(new CommandDefinition("""
            IF NOT EXISTS(SELECT 1 FROM dbo.UserBlocks WITH (UPDLOCK, HOLDLOCK) WHERE BlockerId = @user AND BlockedId = @target)
                INSERT dbo.UserBlocks(BlockerId, BlockedId) VALUES(@user, @target);
            -- Engellenen üyenin bekleyen teklifleri kapanır (iki yönde).
            UPDATE dbo.Offers SET Status = 2, RespondedAt = SYSUTCDATETIME()
            WHERE Status = 0 AND ((BuyerId = @target AND SellerId = @user) OR (BuyerId = @user AND SellerId = @target));
            """, new { user, target }, tx, cancellationToken: ct));
        tx.Commit();
    }

    public async Task Unblock(Guid user, Guid target, CancellationToken ct)
    {
        await using var c = await factory.Open(ct);
        await c.ExecuteAsync(new CommandDefinition("DELETE dbo.UserBlocks WHERE BlockerId = @user AND BlockedId = @target;",
            new { user, target }, cancellationToken: ct));
    }

    public async Task<bool> UserExists(Guid id, CancellationToken ct)
    {
        await using var c = await factory.Open(ct);
        return await c.ExecuteScalarAsync<int>(new CommandDefinition(
            "SELECT COUNT(*) FROM dbo.Users WHERE Id = @id AND DeletedAt IS NULL;", new { id }, cancellationToken: ct)) > 0;
    }

    // ---- Ayarlar ----

    public async Task<UserSettings> Settings(Guid user, CancellationToken ct)
    {
        await using var c = await factory.Open(ct);
        return await c.QuerySingleOrDefaultAsync<UserSettings>(new CommandDefinition("""
            SELECT Language, Theme, NotifyMessages, NotifyOffers, NotifySavedSearches, NotifyPriceDrops
            FROM dbo.UserSettings WHERE UserId = @user;
            """, new { user }, cancellationToken: ct)) ?? new UserSettings();
    }

    public async Task SaveSettings(Guid user, UserSettings s, CancellationToken ct)
    {
        await using var c = await factory.Open(ct);
        using var tx = c.BeginTransaction(System.Data.IsolationLevel.Serializable);
        await c.ExecuteAsync(new CommandDefinition("""
            UPDATE dbo.UserSettings WITH (UPDLOCK, HOLDLOCK)
            SET Language = @Language, Theme = @Theme, NotifyMessages = @NotifyMessages, NotifyOffers = @NotifyOffers,
                NotifySavedSearches = @NotifySavedSearches, NotifyPriceDrops = @NotifyPriceDrops, UpdatedAt = SYSUTCDATETIME()
            WHERE UserId = @user;
            IF @@ROWCOUNT = 0
                INSERT dbo.UserSettings(UserId, Language, Theme, NotifyMessages, NotifyOffers, NotifySavedSearches, NotifyPriceDrops)
                VALUES(@user, @Language, @Theme, @NotifyMessages, @NotifyOffers, @NotifySavedSearches, @NotifyPriceDrops);
            """, new { user, s.Language, s.Theme, s.NotifyMessages, s.NotifyOffers, s.NotifySavedSearches, s.NotifyPriceDrops },
            tx, cancellationToken: ct));
        tx.Commit();
    }
}
