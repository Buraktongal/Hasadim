using Dapper;
using Hasadim.Infrastructure.Database;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Data.SqlClient;
using System.Security.Cryptography;
using System.Text;
namespace Hasadim.Infrastructure.Identity;
public class DapperUserStore(SqlConnectionFactory factory,IDataProtectionProvider protection):
 IUserPasswordStore<AppUser>,IUserEmailStore<AppUser>,IUserSecurityStampStore<AppUser>,IUserLockoutStore<AppUser>,IUserRoleStore<AppUser>,IUserTwoFactorStore<AppUser>,IUserAuthenticatorKeyStore<AppUser>,IUserTwoFactorRecoveryCodeStore<AppUser>,IUserLoginStore<AppUser>,IUserPhoneNumberStore<AppUser>
{
 public void Dispose(){}
 static IdentityResult Fail(string code,string text)=>IdentityResult.Failed(new IdentityError{Code=code,Description=text});
 public Task<string> GetUserIdAsync(AppUser u,CancellationToken ct)=>Task.FromResult(u.Id.ToString());
 public Task<bool> HasPasswordAsync(AppUser u,CancellationToken ct)=>Task.FromResult(u.PasswordHash is not null);
 public async Task<IdentityResult> CreateAsync(AppUser u,CancellationToken ct)
 {
  await using var c=await factory.Open(ct);using var tx=c.BeginTransaction();
  try{await c.ExecuteAsync(new CommandDefinition("INSERT dbo.Users(Id,UserName,NormalizedUserName,Email,NormalizedEmail,EmailConfirmed,PasswordHash,SecurityStamp,ConcurrencyStamp,DisplayName,LockoutEnabled,TwoFactorEnabled,AccessFailedCount,PhoneNumberConfirmed) VALUES(@Id,@UserName,@NormalizedUserName,@Email,@NormalizedEmail,@EmailConfirmed,@PasswordHash,@SecurityStamp,@ConcurrencyStamp,@DisplayName,@LockoutEnabled,@TwoFactorEnabled,@AccessFailedCount,@PhoneNumberConfirmed); INSERT dbo.UserProfiles(UserId) VALUES(@Id)",u,tx,cancellationToken:ct));tx.Commit();return IdentityResult.Success;}
  catch(SqlException e)when(e.Number is 2601 or 2627){return Fail("DuplicateUser","Bu bilgilerle kayıt oluşturulamadı.");}
 }
 public async Task<IdentityResult> UpdateAsync(AppUser u,CancellationToken ct)
 {
  await using var c=await factory.Open(ct);var old=u.ConcurrencyStamp;var next=Guid.NewGuid().ToString("N");var p=new DynamicParameters(u);p.Add("OldStamp",old);p.Add("NextStamp",next);
  p.Add("ProtectedKey",u.AuthenticatorKey is null?null:protection.CreateProtector("Hasadim.Authenticator.v1").Protect(u.AuthenticatorKey));
  try{var count=await c.ExecuteAsync(new CommandDefinition("UPDATE dbo.Users SET UserName=@UserName,NormalizedUserName=@NormalizedUserName,Email=@Email,NormalizedEmail=@NormalizedEmail,EmailConfirmed=@EmailConfirmed,PasswordHash=@PasswordHash,SecurityStamp=@SecurityStamp,ConcurrencyStamp=@NextStamp,DisplayName=@DisplayName,LockoutEnabled=@LockoutEnabled,LockoutEnd=@LockoutEnd,AccessFailedCount=@AccessFailedCount,TwoFactorEnabled=@TwoFactorEnabled,AuthenticatorKey=@ProtectedKey,PhoneNumber=@PhoneNumber,PhoneNumberConfirmed=@PhoneNumberConfirmed WHERE Id=@Id AND ConcurrencyStamp=@OldStamp",p,cancellationToken:ct));
   if(count==0)return Fail("ConcurrencyFailure","Hesap başka bir işlemle değişti. Tekrar deneyin.");u.ConcurrencyStamp=next;return IdentityResult.Success;}
  catch(SqlException e)when(e.Number is 2601 or 2627){return Fail("DuplicateUser","Hesap bilgileri kullanılamıyor.");}
 }
 public Task<IdentityResult> DeleteAsync(AppUser u,CancellationToken ct)=>Task.FromResult(Fail("NotSupported","Hesap silme bu sürümde desteklenmiyor."));
 // Only code-defined queries may select an account. Values always remain parameters.
 enum UserLookup { Id, Name, Email }
 async Task<AppUser?> Find(UserLookup lookup,object value,CancellationToken ct)
 {
  var sql=lookup switch {
   UserLookup.Id => "SELECT * FROM dbo.Users WHERE Id=@value",
   UserLookup.Name => "SELECT * FROM dbo.Users WHERE NormalizedUserName=@value",
   UserLookup.Email => "SELECT * FROM dbo.Users WHERE NormalizedEmail=@value",
   _ => throw new ArgumentOutOfRangeException(nameof(lookup))
  };
  await using var c=await factory.Open(ct);
  var u=await c.QuerySingleOrDefaultAsync<AppUser>(new CommandDefinition(sql,new{value},cancellationToken:ct));
  if(u?.AuthenticatorKey is not null)u.AuthenticatorKey=protection.CreateProtector("Hasadim.Authenticator.v1").Unprotect(u.AuthenticatorKey);
  return u;
 }
 public Task<AppUser?> FindByIdAsync(string id,CancellationToken ct)=>Guid.TryParse(id,out var guid)?Find(UserLookup.Id,guid,ct):Task.FromResult<AppUser?>(null);
 public Task<AppUser?> FindByNameAsync(string name,CancellationToken ct)=>Find(UserLookup.Name,name,ct);
 public Task<AppUser?> FindByEmailAsync(string email,CancellationToken ct)=>Find(UserLookup.Email,email,ct);
 public Task<string?> GetUserNameAsync(AppUser u,CancellationToken ct)=>Task.FromResult(u.UserName);
 public Task SetUserNameAsync(AppUser u,string? value,CancellationToken ct){ct.ThrowIfCancellationRequested();u.UserName=value;return Task.CompletedTask;}
 public Task<string?> GetNormalizedUserNameAsync(AppUser u,CancellationToken ct)=>Task.FromResult(u.NormalizedUserName);
 public Task SetNormalizedUserNameAsync(AppUser u,string? value,CancellationToken ct){ct.ThrowIfCancellationRequested();u.NormalizedUserName=value;return Task.CompletedTask;}
 public Task<string?> GetPasswordHashAsync(AppUser u,CancellationToken ct)=>Task.FromResult(u.PasswordHash);
 public Task SetPasswordHashAsync(AppUser u,string? value,CancellationToken ct){ct.ThrowIfCancellationRequested();u.PasswordHash=value;return Task.CompletedTask;}
 public Task<string?> GetEmailAsync(AppUser u,CancellationToken ct)=>Task.FromResult(u.Email);
 public Task SetEmailAsync(AppUser u,string? value,CancellationToken ct){ct.ThrowIfCancellationRequested();u.Email=value;return Task.CompletedTask;}
 public Task<string?> GetNormalizedEmailAsync(AppUser u,CancellationToken ct)=>Task.FromResult(u.NormalizedEmail);
 public Task SetNormalizedEmailAsync(AppUser u,string? value,CancellationToken ct){ct.ThrowIfCancellationRequested();u.NormalizedEmail=value;return Task.CompletedTask;}
 public Task<bool> GetEmailConfirmedAsync(AppUser u,CancellationToken ct)=>Task.FromResult(u.EmailConfirmed);
 public Task SetEmailConfirmedAsync(AppUser u,bool value,CancellationToken ct){ct.ThrowIfCancellationRequested();u.EmailConfirmed=value;return Task.CompletedTask;}
 public Task<string?> GetSecurityStampAsync(AppUser u,CancellationToken ct)=>Task.FromResult(u.SecurityStamp);
 public Task SetSecurityStampAsync(AppUser u,string value,CancellationToken ct){ct.ThrowIfCancellationRequested();u.SecurityStamp=value;return Task.CompletedTask;}
 public Task<DateTimeOffset?> GetLockoutEndDateAsync(AppUser u,CancellationToken ct)=>Task.FromResult(u.LockoutEnd);
 public Task SetLockoutEndDateAsync(AppUser u,DateTimeOffset? value,CancellationToken ct){ct.ThrowIfCancellationRequested();u.LockoutEnd=value;return Task.CompletedTask;}
 public Task<bool> GetLockoutEnabledAsync(AppUser u,CancellationToken ct)=>Task.FromResult(u.LockoutEnabled);
 public Task SetLockoutEnabledAsync(AppUser u,bool value,CancellationToken ct){ct.ThrowIfCancellationRequested();u.LockoutEnabled=value;return Task.CompletedTask;}
 public Task<bool> GetTwoFactorEnabledAsync(AppUser u,CancellationToken ct)=>Task.FromResult(u.TwoFactorEnabled);
 public Task SetTwoFactorEnabledAsync(AppUser u,bool value,CancellationToken ct){ct.ThrowIfCancellationRequested();u.TwoFactorEnabled=value;return Task.CompletedTask;}
 public Task<string?> GetAuthenticatorKeyAsync(AppUser u,CancellationToken ct)=>Task.FromResult(u.AuthenticatorKey);
 public Task SetAuthenticatorKeyAsync(AppUser u,string value,CancellationToken ct){ct.ThrowIfCancellationRequested();u.AuthenticatorKey=value;return Task.CompletedTask;}
 public Task<int> IncrementAccessFailedCountAsync(AppUser u,CancellationToken ct)=>Task.FromResult(++u.AccessFailedCount);
 public Task ResetAccessFailedCountAsync(AppUser u,CancellationToken ct){u.AccessFailedCount=0;return Task.CompletedTask;}
 public Task<int> GetAccessFailedCountAsync(AppUser u,CancellationToken ct)=>Task.FromResult(u.AccessFailedCount);
 public async Task AddToRoleAsync(AppUser u,string role,CancellationToken ct){await using var c=await factory.Open(ct);await c.ExecuteAsync(new CommandDefinition("INSERT dbo.UserRoles(UserId,RoleId) SELECT @Id,Id FROM dbo.Roles WHERE NormalizedName=@role AND NOT EXISTS(SELECT 1 FROM dbo.UserRoles ur WHERE ur.UserId=@Id AND ur.RoleId=dbo.Roles.Id)",new{u.Id,role},cancellationToken:ct));}
 public async Task RemoveFromRoleAsync(AppUser u,string role,CancellationToken ct){await using var c=await factory.Open(ct);await c.ExecuteAsync(new CommandDefinition("DELETE ur FROM dbo.UserRoles ur JOIN dbo.Roles r ON r.Id=ur.RoleId WHERE ur.UserId=@Id AND r.NormalizedName=@role",new{u.Id,role},cancellationToken:ct));}
 public async Task<IList<string>> GetRolesAsync(AppUser u,CancellationToken ct){await using var c=await factory.Open(ct);return(await c.QueryAsync<string>(new CommandDefinition("SELECT r.Name FROM dbo.Roles r JOIN dbo.UserRoles ur ON ur.RoleId=r.Id WHERE ur.UserId=@Id",new{u.Id},cancellationToken:ct))).ToList();}
 public async Task<bool> IsInRoleAsync(AppUser u,string role,CancellationToken ct){await using var c=await factory.Open(ct);return await c.ExecuteScalarAsync<int>(new CommandDefinition("SELECT COUNT(*) FROM dbo.UserRoles ur JOIN dbo.Roles r ON r.Id=ur.RoleId WHERE ur.UserId=@Id AND r.NormalizedName=@role",new{u.Id,role},cancellationToken:ct))>0;}
 public async Task<IList<AppUser>> GetUsersInRoleAsync(string role,CancellationToken ct){await using var c=await factory.Open(ct);return(await c.QueryAsync<AppUser>(new CommandDefinition("SELECT u.* FROM dbo.Users u JOIN dbo.UserRoles ur ON ur.UserId=u.Id JOIN dbo.Roles r ON r.Id=ur.RoleId WHERE r.NormalizedName=@role",new{role},cancellationToken:ct))).ToList();}
 static string Hash(string code)=>Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(code)));
 public async Task ReplaceCodesAsync(AppUser u,IEnumerable<string> codes,CancellationToken ct){await using var c=await factory.Open(ct);using var tx=c.BeginTransaction();await c.ExecuteAsync(new CommandDefinition("DELETE dbo.RecoveryCodes WHERE UserId=@Id",new{u.Id},tx,cancellationToken:ct));foreach(var code in codes)await c.ExecuteAsync(new CommandDefinition("INSERT dbo.RecoveryCodes(UserId,CodeHash) VALUES(@Id,@hash)",new{u.Id,hash=Hash(code)},tx,cancellationToken:ct));tx.Commit();}
 public async Task<bool> RedeemCodeAsync(AppUser u,string code,CancellationToken ct){await using var c=await factory.Open(ct);return await c.ExecuteAsync(new CommandDefinition("DELETE dbo.RecoveryCodes WHERE UserId=@Id AND CodeHash=@hash",new{u.Id,hash=Hash(code)},cancellationToken:ct))==1;}
 public async Task<int> CountCodesAsync(AppUser u,CancellationToken ct){await using var c=await factory.Open(ct);return await c.ExecuteScalarAsync<int>(new CommandDefinition("SELECT COUNT(*) FROM dbo.RecoveryCodes WHERE UserId=@Id",new{u.Id},cancellationToken:ct));}

 // ---- Google / Apple girişleri (IUserLoginStore) ----
 public async Task AddLoginAsync(AppUser u,UserLoginInfo login,CancellationToken ct)
 {
  await using var c=await factory.Open(ct);
  await c.ExecuteAsync(new CommandDefinition("INSERT dbo.UserLogins(LoginProvider,ProviderKey,ProviderDisplayName,UserId) VALUES(@LoginProvider,@ProviderKey,@ProviderDisplayName,@Id)",
   new{login.LoginProvider,login.ProviderKey,login.ProviderDisplayName,u.Id},cancellationToken:ct));
 }
 public async Task RemoveLoginAsync(AppUser u,string loginProvider,string providerKey,CancellationToken ct)
 {
  await using var c=await factory.Open(ct);
  await c.ExecuteAsync(new CommandDefinition("DELETE dbo.UserLogins WHERE UserId=@Id AND LoginProvider=@loginProvider AND ProviderKey=@providerKey",new{u.Id,loginProvider,providerKey},cancellationToken:ct));
 }
 public async Task<IList<UserLoginInfo>> GetLoginsAsync(AppUser u,CancellationToken ct)
 {
  await using var c=await factory.Open(ct);
  var rows=await c.QueryAsync<(string LoginProvider,string ProviderKey,string? ProviderDisplayName)>(new CommandDefinition("SELECT LoginProvider,ProviderKey,ProviderDisplayName FROM dbo.UserLogins WHERE UserId=@Id",new{u.Id},cancellationToken:ct));
  return rows.Select(r=>new UserLoginInfo(r.LoginProvider,r.ProviderKey,r.ProviderDisplayName)).ToList();
 }
 public async Task<AppUser?> FindByLoginAsync(string loginProvider,string providerKey,CancellationToken ct)
 {
  Guid? id;
  await using(var c=await factory.Open(ct))
   id=await c.QuerySingleOrDefaultAsync<Guid?>(new CommandDefinition("SELECT UserId FROM dbo.UserLogins WHERE LoginProvider=@loginProvider AND ProviderKey=@providerKey",new{loginProvider,providerKey},cancellationToken:ct));
  return id is null?null:await Find(UserLookup.Id,id.Value,ct);
 }

 // ---- Telefon (IUserPhoneNumberStore); değişiklikler UpdateAsync ile kaydedilir ----
 public Task SetPhoneNumberAsync(AppUser u,string? phoneNumber,CancellationToken ct){ct.ThrowIfCancellationRequested();u.PhoneNumber=phoneNumber;return Task.CompletedTask;}
 public Task<string?> GetPhoneNumberAsync(AppUser u,CancellationToken ct)=>Task.FromResult(u.PhoneNumber);
 public Task<bool> GetPhoneNumberConfirmedAsync(AppUser u,CancellationToken ct)=>Task.FromResult(u.PhoneNumberConfirmed);
 public Task SetPhoneNumberConfirmedAsync(AppUser u,bool confirmed,CancellationToken ct){ct.ThrowIfCancellationRequested();u.PhoneNumberConfirmed=confirmed;return Task.CompletedTask;}
}
