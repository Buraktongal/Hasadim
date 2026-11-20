using Dapper;
using Hasadim.Infrastructure.Database;

namespace Hasadim.Infrastructure.Repositories;

public static class FeedbackCatalog
{
    public static readonly string[] Kinds = ["Oneri", "Hata", "Diger"];
    // Kullanıcının seçebileceği uygulama bölümleri.
    public static readonly string[] Areas = ["Pazar", "IlanVerme", "IlanDetayi", "Mesajlar", "Teklifler", "Harita", "UrunTakvimi", "Bildirimler", "Hesap", "Giris", "MobilUygulama", "Diger"];
    public static readonly string[] Statuses = ["Yeni", "İnceleniyor", "Planlandı", "Çözüldü", "Kapatıldı"];
}

public sealed record FeedbackView(Guid Id, int Number, string Kind, string Area, string Title, string Body, string? PageUrl, string? Client,
    byte Status, string? Reply, DateTime CreatedAt, DateTime? UpdatedAt);

public sealed class FeedbackRepository(SqlConnectionFactory factory)
{
    public async Task<int> Create(Guid user, string kind, string area, string title, string body, string? pageUrl, string? client, CancellationToken ct)
    {
        await using var c = await factory.Open(ct);
        return await c.ExecuteScalarAsync<int>(new CommandDefinition("""
            INSERT dbo.Feedback(Id, UserId, Kind, Area, Title, Body, PageUrl, Client)
            OUTPUT inserted.Number
            VALUES(@id, @user, @kind, @area, @title, @body, @pageUrl, @client);
            """, new { id = Guid.NewGuid(), user, kind, area, title, body, pageUrl, client }, cancellationToken: ct));
    }

    public async Task<IReadOnlyList<FeedbackView>> Mine(Guid user, CancellationToken ct)
    {
        await using var c = await factory.Open(ct);
        return (await c.QueryAsync<FeedbackView>(new CommandDefinition("""
            SELECT TOP (50) Id, Number, Kind, Area, Title, Body, PageUrl, Client, Status, Reply, CreatedAt, UpdatedAt
            FROM dbo.Feedback WHERE UserId = @user ORDER BY CreatedAt DESC;
            """, new { user }, cancellationToken: ct))).ToList();
    }
}
