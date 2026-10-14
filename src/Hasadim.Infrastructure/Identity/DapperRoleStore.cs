using Dapper;
using Hasadim.Infrastructure.Database;
using Microsoft.AspNetCore.Identity;
namespace Hasadim.Infrastructure.Identity;
public class DapperRoleStore(SqlConnectionFactory factory):IRoleStore<IdentityRole<Guid>>
{
 public void Dispose(){}
 public Task<string> GetRoleIdAsync(IdentityRole<Guid> r,CancellationToken ct)=>Task.FromResult(r.Id.ToString());
 public Task<string?> GetRoleNameAsync(IdentityRole<Guid> r,CancellationToken ct)=>Task.FromResult(r.Name);
 public Task SetRoleNameAsync(IdentityRole<Guid> r,string? n,CancellationToken ct){r.Name=n;return Task.CompletedTask;}
 public Task<string?> GetNormalizedRoleNameAsync(IdentityRole<Guid> r,CancellationToken ct)=>Task.FromResult(r.NormalizedName);
 public Task SetNormalizedRoleNameAsync(IdentityRole<Guid> r,string? n,CancellationToken ct){r.NormalizedName=n;return Task.CompletedTask;}
 public async Task<IdentityRole<Guid>?> FindByIdAsync(string id,CancellationToken ct){if(!Guid.TryParse(id,out var guid))return null;await using var c=await factory.Open(ct);return await c.QuerySingleOrDefaultAsync<IdentityRole<Guid>>(new CommandDefinition("SELECT * FROM dbo.Roles WHERE Id=@guid",new{guid},cancellationToken:ct));}
 public async Task<IdentityRole<Guid>?> FindByNameAsync(string name,CancellationToken ct){await using var c=await factory.Open(ct);return await c.QuerySingleOrDefaultAsync<IdentityRole<Guid>>(new CommandDefinition("SELECT * FROM dbo.Roles WHERE NormalizedName=@name",new{name},cancellationToken:ct));}
 public async Task<IdentityResult> CreateAsync(IdentityRole<Guid> r,CancellationToken ct){if(r.Id==Guid.Empty)r.Id=Guid.NewGuid();await using var c=await factory.Open(ct);await c.ExecuteAsync(new CommandDefinition("INSERT dbo.Roles(Id,Name,NormalizedName,ConcurrencyStamp) VALUES(@Id,@Name,@NormalizedName,@ConcurrencyStamp)",r,cancellationToken:ct));return IdentityResult.Success;}
 public async Task<IdentityResult> UpdateAsync(IdentityRole<Guid> r,CancellationToken ct){await using var c=await factory.Open(ct);var count=await c.ExecuteAsync(new CommandDefinition("UPDATE dbo.Roles SET Name=@Name,NormalizedName=@NormalizedName WHERE Id=@Id",r,cancellationToken:ct));return count==1?IdentityResult.Success:IdentityResult.Failed(new IdentityError{Description="Rol bulunamadı."});}
 public Task<IdentityResult> DeleteAsync(IdentityRole<Guid> r,CancellationToken ct)=>Task.FromResult(IdentityResult.Failed(new IdentityError{Description="Rol silme desteklenmiyor."}));
}
