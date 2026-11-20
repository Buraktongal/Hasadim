using Dapper;
using Hasadim.Infrastructure.Database;

namespace Hasadim.Infrastructure.Repositories;

public sealed record AdminStats(
    int Users, int NewUsers7d, int SuspendedUsers, int Admins,
    int LiveListings, int PendingListings, int HiddenListings, int Listings24h,
    int OpenReports, int NewFeedback, int OpenFeedback, int FailedLogins24h, int Messages24h);

public sealed record AdminUserRow(
    Guid Id, string DisplayName, string Email, string? PhoneNumber, bool EmailConfirmed, bool PhoneNumberConfirmed,
    DateTime? CreatedAt, DateTime? LastSeenAt, int ListingCount, int LiveListings, bool IsAdmin,
    string? SuspendReason, DateTime? SuspendedAt, DateTimeOffset? LockoutEnd, DateTime? DeletedAt);

public sealed record AdminLoginRow(DateTime At, bool Success, string Method, string Device, string? Reason);
public sealed record AdminFeedbackRow(
    Guid Id, int Number, string Kind, string Area, string Title, string Body, string? PageUrl, string? Client, byte Status,
    string? AdminNote, string? Reply, DateTime CreatedAt, DateTime? UpdatedAt, Guid UserId, string UserName, string UserEmail, string? HandledByName);
public sealed record AdminAuditRow(long Id, DateTime CreatedAt, string AdminName, string Action, string? TargetType, string? TargetId, string? Detail, string? Ip);
public sealed record AdminPage<T>(IReadOnlyList<T> Items, int Total, int Page, int PageSize);

// Yönetim paneli veri erişimi. Bütün sorgular parametrelidir; sıralama ve filtre değerleri
// beyaz listeden seçilir (SQL enjeksiyonu yok).
public sealed class AdminRepository(SqlConnectionFactory factory)
{
    public const int PageSize = 25;

    public async Task<AdminStats> Stats(CancellationToken ct)
    {
        await using var c = await factory.Open(ct);
        return await c.QuerySingleAsync<AdminStats>(new CommandDefinition("""
            SELECT
              (SELECT COUNT(*) FROM dbo.Users WHERE DeletedAt IS NULL) AS Users,
              (SELECT COUNT(*) FROM dbo.Users WHERE DeletedAt IS NULL AND CreatedAt > DATEADD(day, -7, SYSUTCDATETIME())) AS NewUsers7d,
              (SELECT COUNT(*) FROM dbo.UserSuspensions) AS SuspendedUsers,
              (SELECT COUNT(*) FROM dbo.UserRoles ur JOIN dbo.Roles r ON r.Id = ur.RoleId WHERE r.NormalizedName = N'ADMIN') AS Admins,
              (SELECT COUNT(*) FROM dbo.Listings WHERE Status = 4 AND IsDeleted = 0 AND Hidden = 0) AS LiveListings,
              (SELECT COUNT(*) FROM dbo.Listings WHERE Status = 1 AND IsDeleted = 0) AS PendingListings,
              (SELECT COUNT(*) FROM dbo.Listings WHERE Hidden = 1 AND IsDeleted = 0) AS HiddenListings,
              (SELECT COUNT(*) FROM dbo.Listings WHERE OlusturulmaTarihi > DATEADD(hour, -24, SYSUTCDATETIME())) AS Listings24h,
              (SELECT COUNT(*) FROM dbo.Reports WHERE Resolved = 0) AS OpenReports,
              (SELECT COUNT(*) FROM dbo.Feedback WHERE Status = 0) AS NewFeedback,
              (SELECT COUNT(*) FROM dbo.Feedback WHERE Status IN (0, 1, 2)) AS OpenFeedback,
              (SELECT COUNT(*) FROM dbo.LoginEvents WHERE Success = 0 AND At > DATEADD(hour, -24, SYSUTCDATETIME())) AS FailedLogins24h,
              (SELECT COUNT(*) FROM dbo.Messages WHERE CreatedAt > DATEADD(hour, -24, SYSUTCDATETIME())) AS Messages24h;
            """, cancellationToken: ct));
    }

    // ---------- Kullanıcılar ----------
    const string UserColumns = """
        u.Id, u.DisplayName, u.Email, u.PhoneNumber, u.EmailConfirmed, u.PhoneNumberConfirmed, u.CreatedAt,
        (SELECT MAX(s.LastSeenAt) FROM dbo.UserSessions s WHERE s.UserId = u.Id) AS LastSeenAt,
        (SELECT COUNT(*) FROM dbo.Listings l WHERE l.OwnerId = u.Id AND l.IsDeleted = 0) AS ListingCount,
        (SELECT COUNT(*) FROM dbo.Listings l WHERE l.OwnerId = u.Id AND l.IsDeleted = 0 AND l.Status = 4) AS LiveListings,
        CAST(CASE WHEN EXISTS(SELECT 1 FROM dbo.UserRoles ur JOIN dbo.Roles r ON r.Id = ur.RoleId WHERE ur.UserId = u.Id AND r.NormalizedName = N'ADMIN') THEN 1 ELSE 0 END AS bit) AS IsAdmin,
        su.Reason AS SuspendReason, su.CreatedAt AS SuspendedAt, u.LockoutEnd, u.DeletedAt
        """;

    public async Task<AdminPage<AdminUserRow>> Users(string? query, string? filter, int page, CancellationToken ct)
    {
        page = Math.Clamp(page, 1, 10_000);
        var where = filter switch
        {
            "admins" => " AND EXISTS(SELECT 1 FROM dbo.UserRoles ur JOIN dbo.Roles r ON r.Id = ur.RoleId WHERE ur.UserId = u.Id AND r.NormalizedName = N'ADMIN')",
            "suspended" => " AND su.UserId IS NOT NULL",
            "new" => " AND u.CreatedAt > DATEADD(day, -7, SYSUTCDATETIME())",
            "unverified" => " AND u.EmailConfirmed = 0",
            _ => ""
        };
        var q = string.IsNullOrWhiteSpace(query) ? null : "%" + query.Trim().Replace("[", "[[]").Replace("%", "[%]").Replace("_", "[_]") + "%";
        if (q is not null) where += " AND (u.DisplayName LIKE @q OR u.Email LIKE @q OR u.PhoneNumber LIKE @q)";
        await using var c = await factory.Open(ct);
        using var grid = await c.QueryMultipleAsync(new CommandDefinition($"""
            SELECT COUNT(*) FROM dbo.Users u LEFT JOIN dbo.UserSuspensions su ON su.UserId = u.Id WHERE u.DeletedAt IS NULL{where};
            SELECT {UserColumns}
            FROM dbo.Users u LEFT JOIN dbo.UserSuspensions su ON su.UserId = u.Id
            WHERE u.DeletedAt IS NULL{where}
            ORDER BY u.CreatedAt DESC, u.Id
            OFFSET @skip ROWS FETCH NEXT @take ROWS ONLY;
            """, new { q, skip = (page - 1) * PageSize, take = PageSize }, cancellationToken: ct));
        var total = await grid.ReadSingleAsync<int>();
        var items = (await grid.ReadAsync<AdminUserRow>()).ToList();
        return new AdminPage<AdminUserRow>(items, total, page, PageSize);
    }

    public async Task<(AdminUserRow? User, IReadOnlyList<AdminLoginRow> Logins, int OpenSessions, int Feedback, int ReportsAgainst)> UserDetail(Guid id, CancellationToken ct)
    {
        await using var c = await factory.Open(ct);
        using var grid = await c.QueryMultipleAsync(new CommandDefinition($"""
            SELECT {UserColumns} FROM dbo.Users u LEFT JOIN dbo.UserSuspensions su ON su.UserId = u.Id WHERE u.Id = @id;
            SELECT TOP (20) At, Success, Method, Device, Reason FROM dbo.LoginEvents WHERE UserId = @id ORDER BY At DESC;
            SELECT COUNT(*) FROM dbo.UserSessions WHERE UserId = @id AND EndedAt IS NULL;
            SELECT COUNT(*) FROM dbo.Feedback WHERE UserId = @id;
            SELECT COUNT(*) FROM dbo.Reports r JOIN dbo.Listings l ON l.Id = r.ListingId WHERE l.OwnerId = @id;
            """, new { id }, cancellationToken: ct));
        var user = await grid.ReadSingleOrDefaultAsync<AdminUserRow>();
        var logins = (await grid.ReadAsync<AdminLoginRow>()).ToList();
        return (user, logins, await grid.ReadSingleAsync<int>(), await grid.ReadSingleAsync<int>(), await grid.ReadSingleAsync<int>());
    }

    public async Task Suspend(Guid user, string reason, Guid admin, CancellationToken ct)
    {
        await using var c = await factory.Open(ct);
        await c.ExecuteAsync(new CommandDefinition("""
            MERGE dbo.UserSuspensions AS t USING (SELECT @user AS UserId) AS s ON t.UserId = s.UserId
            WHEN MATCHED THEN UPDATE SET Reason = @reason, AdminId = @admin, CreatedAt = SYSUTCDATETIME()
            WHEN NOT MATCHED THEN INSERT(UserId, Reason, AdminId) VALUES(@user, @reason, @admin);
            """, new { user, reason, admin }, cancellationToken: ct));
    }

    public async Task Unsuspend(Guid user, CancellationToken ct)
    {
        await using var c = await factory.Open(ct);
        await c.ExecuteAsync(new CommandDefinition("DELETE dbo.UserSuspensions WHERE UserId = @user;", new { user }, cancellationToken: ct));
    }

    public async Task<string?> SuspensionReason(Guid user, CancellationToken ct)
    {
        await using var c = await factory.Open(ct);
        return await c.ExecuteScalarAsync<string?>(new CommandDefinition("SELECT Reason FROM dbo.UserSuspensions WHERE UserId = @user;", new { user }, cancellationToken: ct));
    }

    // ---------- Geri bildirimler ----------
    public async Task<AdminPage<AdminFeedbackRow>> Feedback(byte? status, string? kind, string? area, string? query, int page, CancellationToken ct)
    {
        page = Math.Clamp(page, 1, 10_000);
        var where = "1 = 1";
        if (status is not null) where += " AND f.Status = @status";
        if (kind is not null) where += " AND f.Kind = @kind";
        if (area is not null) where += " AND f.Area = @area";
        var q = string.IsNullOrWhiteSpace(query) ? null : "%" + query.Trim().Replace("[", "[[]").Replace("%", "[%]").Replace("_", "[_]") + "%";
        if (q is not null) where += " AND (f.Title LIKE @q OR f.Body LIKE @q OR u.DisplayName LIKE @q OR u.Email LIKE @q)";
        await using var c = await factory.Open(ct);
        using var grid = await c.QueryMultipleAsync(new CommandDefinition($"""
            SELECT COUNT(*) FROM dbo.Feedback f JOIN dbo.Users u ON u.Id = f.UserId WHERE {where};
            SELECT f.Id, f.Number, f.Kind, f.Area, f.Title, f.Body, f.PageUrl, f.Client, f.Status, f.AdminNote, f.Reply, f.CreatedAt, f.UpdatedAt,
                   f.UserId, u.DisplayName AS UserName, u.Email AS UserEmail, h.DisplayName AS HandledByName
            FROM dbo.Feedback f JOIN dbo.Users u ON u.Id = f.UserId LEFT JOIN dbo.Users h ON h.Id = f.HandledBy
            WHERE {where}
            ORDER BY CASE WHEN f.Status IN (0, 1, 2) THEN 0 ELSE 1 END, f.CreatedAt DESC
            OFFSET @skip ROWS FETCH NEXT @take ROWS ONLY;
            """, new { status, kind, area, q, skip = (page - 1) * PageSize, take = PageSize }, cancellationToken: ct));
        var total = await grid.ReadSingleAsync<int>();
        return new AdminPage<AdminFeedbackRow>((await grid.ReadAsync<AdminFeedbackRow>()).ToList(), total, page, PageSize);
    }

    // Yanıt değiştiyse kullanıcıya bildirim gönderilmesi için sahibini ve numarasını döndürür.
    public async Task<(Guid UserId, int Number, bool ReplyChanged)?> UpdateFeedback(Guid id, byte status, string? note, string? reply, Guid admin, CancellationToken ct)
    {
        await using var c = await factory.Open(ct);
        var row = await c.QuerySingleOrDefaultAsync<(Guid UserId, int Number, string? Reply)>(new CommandDefinition(
            "SELECT UserId, Number, Reply FROM dbo.Feedback WHERE Id = @id;", new { id }, cancellationToken: ct));
        if (row.UserId == Guid.Empty) return null;
        await c.ExecuteAsync(new CommandDefinition("""
            UPDATE dbo.Feedback SET Status = @status, AdminNote = @note, Reply = @reply, HandledBy = @admin, UpdatedAt = SYSUTCDATETIME() WHERE Id = @id;
            """, new { id, status, note, reply, admin }, cancellationToken: ct));
        return (row.UserId, row.Number, !string.IsNullOrWhiteSpace(reply) && reply != row.Reply);
    }

    // ---------- Denetim kaydı ----------
    public async Task Audit(Guid admin, string action, string? targetType, string? targetId, string? detail, string? ip, CancellationToken ct)
    {
        await using var c = await factory.Open(ct);
        await c.ExecuteAsync(new CommandDefinition("""
            INSERT dbo.AdminAudit(AdminId, Action, TargetType, TargetId, Detail, Ip) VALUES(@admin, @action, @targetType, @targetId, @detail, @ip);
            """, new { admin, action, targetType, targetId, detail = detail is { Length: > 1000 } ? detail[..1000] : detail, ip }, cancellationToken: ct));
    }

    public async Task<AdminPage<AdminAuditRow>> AuditLog(int page, CancellationToken ct)
    {
        page = Math.Clamp(page, 1, 10_000);
        await using var c = await factory.Open(ct);
        using var grid = await c.QueryMultipleAsync(new CommandDefinition("""
            SELECT COUNT(*) FROM dbo.AdminAudit;
            SELECT a.Id, a.CreatedAt, u.DisplayName AS AdminName, a.Action, a.TargetType, a.TargetId, a.Detail, a.Ip
            FROM dbo.AdminAudit a JOIN dbo.Users u ON u.Id = a.AdminId
            ORDER BY a.Id DESC OFFSET @skip ROWS FETCH NEXT @take ROWS ONLY;
            """, new { skip = (page - 1) * PageSize, take = PageSize }, cancellationToken: ct));
        var total = await grid.ReadSingleAsync<int>();
        return new AdminPage<AdminAuditRow>((await grid.ReadAsync<AdminAuditRow>()).ToList(), total, page, PageSize);
    }
}
