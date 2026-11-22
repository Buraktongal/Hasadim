using Dapper;
using Microsoft.Data.SqlClient;
namespace Hasadim.Infrastructure.Database;
public class MigrationRunner(SqlConnectionFactory factory)
{
 public async Task Run(bool createDatabase,CancellationToken ct=default)
 {
  var b=new SqlConnectionStringBuilder(factory.ConnectionString);var name=b.InitialCatalog;
  if(string.IsNullOrWhiteSpace(name))throw new InvalidOperationException("Veritabanı adı gerekli.");
  if(createDatabase){b.InitialCatalog="master";await using var master=new SqlConnection(b.ConnectionString);await master.OpenAsync(ct);
   var exists=await master.ExecuteScalarAsync<int>(new CommandDefinition("SELECT COUNT(*) FROM sys.databases WHERE name=@name",new{name},cancellationToken:ct));
   if(exists==0)await master.ExecuteAsync(new CommandDefinition("CREATE DATABASE ["+name.Replace("]","]]")+"]",cancellationToken:ct));}
  await using var c=await factory.Open(ct);using var tx=c.BeginTransaction();
  await c.ExecuteAsync(new CommandDefinition("DECLARE @r int; EXEC @r=sp_getapplock @Resource='HasadimSchema',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=30000; IF @r<0 THROW 51000,'Migration lock failed',1;",transaction:tx,cancellationToken:ct));
  await c.ExecuteAsync(new CommandDefinition("IF OBJECT_ID('dbo.SchemaVersions') IS NULL CREATE TABLE dbo.SchemaVersions(Name nvarchar(200) NOT NULL PRIMARY KEY,Hash char(64) NOT NULL,AppliedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME());",transaction:tx,cancellationToken:ct));
  var assembly=typeof(MigrationRunner).Assembly;
  foreach(var resource in assembly.GetManifestResourceNames().Where(x=>x.EndsWith(".sql")).Order()){
   using var stream=assembly.GetManifestResourceStream(resource)!;using var reader=new StreamReader(stream);var sql=await reader.ReadToEndAsync(ct);
   var hash=MigrationChecksum.Compute(sql);
   var saved=await c.QuerySingleOrDefaultAsync<string>(new CommandDefinition("SELECT Hash FROM dbo.SchemaVersions WHERE Name=@resource",new{resource},tx,cancellationToken:ct));
   if(saved is not null){if(!MigrationChecksum.Matches(sql,saved))throw new InvalidOperationException("Uygulanmış migration içeriği değiştirilmiş: "+resource+". Eski SQL dosyasını geri yükleyin; SchemaVersions kaydını silmeyin.");continue;}
   await c.ExecuteAsync(new CommandDefinition(sql,transaction:tx,commandTimeout:120,cancellationToken:ct));
   await c.ExecuteAsync(new CommandDefinition("INSERT dbo.SchemaVersions(Name,Hash) VALUES(@resource,@hash)",new{resource,hash},tx,cancellationToken:ct));
  }
  tx.Commit();
  // Okumalar yazmaları beklemesin, yazmalar okumaları beklemesin (READ_COMMITTED_SNAPSHOT): eşzamanlı isteklerde
  // kilitlenmeleri büyük ölçüde ortadan kaldırır. Yalnızca kapalıysa ve yetki varsa açılır; olmazsa uygulama yine çalışır.
  try{
   await c.ExecuteAsync(new CommandDefinition("IF (SELECT is_read_committed_snapshot_on FROM sys.databases WHERE database_id=DB_ID())=0 ALTER DATABASE CURRENT SET READ_COMMITTED_SNAPSHOT ON WITH ROLLBACK AFTER 5 SECONDS;",commandTimeout:60,cancellationToken:ct));
  }catch(SqlException){}
 }
}
