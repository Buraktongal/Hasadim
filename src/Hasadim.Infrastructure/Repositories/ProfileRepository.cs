using Dapper;
using Hasadim.Application;
using Hasadim.Core;
using Hasadim.Infrastructure.Database;
namespace Hasadim.Infrastructure.Repositories;
public class ProfileRepository(SqlConnectionFactory factory):IProfileRepository
{
 public async Task<SellerProfile?> Find(Guid id,CancellationToken ct){await using var c=await factory.Open(ct);return await c.QuerySingleOrDefaultAsync<SellerProfile>(new CommandDefinition("SELECT p.*,u.DisplayName,u.Email,u.EmailConfirmed,u.CreatedAt,CAST(CASE WHEN u.PhoneNumberConfirmed=1 AND LEN(p.Phone)>0 AND p.Phone=u.PhoneNumber THEN 1 ELSE 0 END AS bit) AS PhoneVerified,(SELECT COUNT(*) FROM dbo.Listings l WHERE l.OwnerId=u.Id AND l.Active=1 AND l.Hidden=0 AND l.IsDeleted=0 AND l.Status=4 AND (l.ExpiresAt IS NULL OR l.ExpiresAt>SYSUTCDATETIME())) AS ActiveListingCount FROM dbo.UserProfiles p JOIN dbo.Users u ON u.Id=p.UserId WHERE p.UserId=@id",new{id},cancellationToken:ct));}
 public async Task<bool> Update(Guid id,ProfileRequest r,CancellationToken ct)
 {
  await using var c=await factory.Open(ct);using var tx=c.BeginTransaction();
  var p=new{id,displayName=r.DisplayName.Trim(),r.AccountType,r.Activity,business=r.AccountType=="Business"?(r.BusinessName??"").Trim():"",city=r.City.Trim(),district=r.District.Trim(),about=(r.About??"").Trim(),phone=(r.Phone??"").Trim(),r.ShowPhone,r.Version,stamp=Guid.NewGuid().ToString("N")};
  // Consistent lock order with Identity: Users, then profile.
  await c.ExecuteAsync(new CommandDefinition("SELECT Id FROM dbo.Users WITH(UPDLOCK) WHERE Id=@id",new{id},tx,cancellationToken:ct));
  var changed=await c.ExecuteAsync(new CommandDefinition("UPDATE dbo.UserProfiles SET AccountType=@AccountType,Activity=@Activity,BusinessName=@business,City=@city,District=@district,About=@about,Phone=@phone,ShowPhone=@ShowPhone WHERE UserId=@id AND Version=@Version",p,tx,cancellationToken:ct));
  if(changed!=1){tx.Rollback();return false;}
  await c.ExecuteAsync(new CommandDefinition("UPDATE dbo.Users SET DisplayName=@displayName,ConcurrencyStamp=@stamp WHERE Id=@id",p,tx,cancellationToken:ct));tx.Commit();return true;
 }
 public async Task<string?> SetPhoto(Guid id,string? name,CancellationToken ct){await using var c=await factory.Open(ct);var old=await c.QueryAsync<string?>(new CommandDefinition("UPDATE dbo.UserProfiles SET PhotoFile=@name OUTPUT deleted.PhotoFile WHERE UserId=@id",new{id,name},cancellationToken:ct));return old.SingleOrDefault();}
}
