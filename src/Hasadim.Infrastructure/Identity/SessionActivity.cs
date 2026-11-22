using System.Collections.Concurrent;
using Dapper;
using Hasadim.Infrastructure.Database;
using Microsoft.Data.SqlClient;

namespace Hasadim.Infrastructure.Identity;

// Oturumun "son görülme" zamanı. Bu bilgi yalnızca "Açık oturumlar" listesinde gösterilir; isteğin kendisi için
// gerekli değildir. Bu yüzden:
//  - aynı oturum için bu sunucudan en fazla dakikada bir yazılır (mobil uygulama aynı anda çok istek gönderir),
//  - düşük kilit önceliğiyle ve kısa bekleme süresiyle yazılır; kilitlenme veya zaman aşımında sessizce atlanır.
public static class SessionActivity
{
    static readonly ConcurrentDictionary<Guid, DateTime> lastWrite = new();

    public static async Task Touch(SqlConnectionFactory factory, Guid session, CancellationToken ct)
    {
        if (session == Guid.Empty) return;
        var now = DateTime.UtcNow;
        if (lastWrite.TryGetValue(session, out var last) && now - last < TimeSpan.FromMinutes(1)) return;
        lastWrite[session] = now;
        if (lastWrite.Count > 50_000) lastWrite.Clear();
        try
        {
            await using var c = await factory.Open(ct);
            await c.ExecuteAsync(new CommandDefinition("""
                SET DEADLOCK_PRIORITY LOW; SET LOCK_TIMEOUT 1500;
                UPDATE dbo.UserSessions SET LastSeenAt = SYSUTCDATETIME()
                WHERE Id = @session AND EndedAt IS NULL AND LastSeenAt < DATEADD(minute, -1, SYSUTCDATETIME());
                """, new { session }, cancellationToken: ct));
        }
        catch (SqlException e) when (e.Number is 1205 or 1222 or -2) { /* kilitlenme / zaman aşımı: bir sonraki istekte yazılır */ }
    }
}

// SQL Server kilitlenme kurbanı seçtiğinde (hata 1205) salt okunur işlem kısa bir beklemeyle tekrarlanır.
public static class SqlRetry
{
    public static async Task<T> OnDeadlock<T>(Func<Task<T>> work, int attempts = 3)
    {
        for (var i = 1; ; i++)
        {
            try { return await work(); }
            catch (SqlException e) when (e.Number == 1205 && i < attempts) { await Task.Delay(40 * i + Random.Shared.Next(30)); }
        }
    }
}
