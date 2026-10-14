using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
namespace Hasadim.Infrastructure.Database;
public class SqlConnectionFactory(IConfiguration config)
{
 public string ConnectionString=>config.GetConnectionString("DefaultConnection")??throw new InvalidOperationException("DefaultConnection eksik.");
 public async Task<SqlConnection> Open(CancellationToken ct=default){var c=new SqlConnection(ConnectionString);try{await c.OpenAsync(ct);return c;}catch{await c.DisposeAsync();throw;}}
}
