using Dapper;
using Hasadim.Infrastructure.Database;

namespace Hasadim.Infrastructure.Repositories;

public record MessageNotificationState(int UnreadCount, Guid? LatestMessageId, Guid? LatestUnreadId);

public class MessageNotifications(SqlConnectionFactory factory)
{
    public async Task<MessageNotificationState> State(Guid user, CancellationToken ct)
    {
        await using var c = await factory.Open(ct);
        return await c.QuerySingleAsync<MessageNotificationState>(new CommandDefinition("""
            SELECT (SELECT COUNT(*) FROM dbo.Messages WHERE RecipientId=@user AND ReadAt IS NULL) AS UnreadCount,
                (SELECT TOP(1) Id FROM dbo.Messages WHERE RecipientId=@user OR SenderId=@user ORDER BY CreatedAt DESC,Id DESC) AS LatestMessageId,
                (SELECT TOP(1) Id FROM dbo.Messages WHERE RecipientId=@user AND ReadAt IS NULL ORDER BY CreatedAt DESC,Id DESC) AS LatestUnreadId
            """, new { user }, cancellationToken: ct));
    }

    public async Task Read(Guid user, Guid[] ids, CancellationToken ct)
    {
        await using var c = await factory.Open(ct);
        // A caller can acknowledge only messages addressed to their authenticated account.
        await c.ExecuteAsync(new CommandDefinition("UPDATE dbo.Messages SET ReadAt=SYSUTCDATETIME() WHERE RecipientId=@user AND Id IN @ids AND ReadAt IS NULL",
            new { user, ids }, cancellationToken: ct));
    }
}
