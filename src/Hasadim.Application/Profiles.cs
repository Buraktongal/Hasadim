using System.ComponentModel.DataAnnotations;
using Hasadim.Core;
namespace Hasadim.Application;
public class ProfileRequest:IValidatableObject
{
 [Required,StringLength(100,MinimumLength=2)]public string DisplayName {get;set;}="";
 [Required,RegularExpression("^(Individual|Business)$")]public string AccountType {get;set;}="Individual";
 [Required,RegularExpression("^(Producer|Buyer|Trader|Cooperative|Other)$")]public string Activity {get;set;}="Producer";
 [StringLength(150)]public string BusinessName {get;set;}="";
 [Required,StringLength(100)]public string City {get;set;}="";
 [Required,StringLength(100)]public string District {get;set;}="";
 [StringLength(2000)]public string About {get;set;}="";
 [StringLength(25),RegularExpression(@"^[+0-9 ()-]{10,25}$")]public string? Phone {get;set;}
 public bool ShowPhone {get;set;}=true;
 [Required,MinLength(8),MaxLength(8)]public byte[] Version {get;set;}=[];
 public IEnumerable<ValidationResult> Validate(ValidationContext context){if(AccountType=="Business"&&string.IsNullOrWhiteSpace(BusinessName))yield return new ValidationResult("Kurumsal hesap için firma adı gerekli.",[nameof(BusinessName)]);}
}
public record PublicProfile(Guid Id,string DisplayName,string AccountType,string Activity,string? BusinessName,string City,string District,string About,string? Phone,string? PhotoUrl,DateTime? MemberSince,bool EmailVerified,int ActiveListingCount);
public record MyProfile(Guid Id,string DisplayName,string AccountType,string Activity,string BusinessName,string City,string District,string About,string Phone,bool ShowPhone,string? PhotoUrl,DateTime? MemberSince,string Email,bool EmailVerified,int ActiveListingCount,int Completion,byte[] Version);
public interface IProfileRepository
{
 Task<SellerProfile?> Find(Guid id,CancellationToken ct);
 Task<bool> Update(Guid id,ProfileRequest request,CancellationToken ct);
 Task<string?> SetPhoto(Guid id,string? name,CancellationToken ct);
}
public class ProfileService(IProfileRepository repo,ICurrentUser user)
{
 Guid User=>user.Id??throw new AppException(401,"Giriş yapın.");
 static string? Photo(SellerProfile p)=>p.PhotoFile is null?null:$"/api/profiles/{p.UserId}/photo?v={p.PhotoFile}";
 async Task<SellerProfile> Find(Guid id,CancellationToken ct)=>await repo.Find(id,ct)??throw new AppException(404,"Satıcı bulunamadı.");
 public async Task<PublicProfile> Public(Guid id,CancellationToken ct){var p=await Find(id,ct);return new(p.UserId,p.DisplayName,p.AccountType,p.Activity,p.AccountType=="Business"?p.BusinessName:null,p.City,p.District,p.About,user.Id.HasValue&&p.ShowPhone?p.Phone:null,Photo(p),p.CreatedAt,p.EmailConfirmed,p.ActiveListingCount);}
 public async Task<MyProfile> Mine(CancellationToken ct){var p=await Find(User,ct);var completed=new[]{!string.IsNullOrWhiteSpace(p.DisplayName),!string.IsNullOrWhiteSpace(p.City)&&!string.IsNullOrWhiteSpace(p.District),!string.IsNullOrWhiteSpace(p.About),!string.IsNullOrWhiteSpace(p.Phone),p.PhotoFile is not null}.Count(x=>x);return new(p.UserId,p.DisplayName,p.AccountType,p.Activity,p.BusinessName,p.City,p.District,p.About,p.Phone,p.ShowPhone,Photo(p),p.CreatedAt,p.Email,p.EmailConfirmed,p.ActiveListingCount,completed*20,p.Version);}
 public async Task Update(ProfileRequest r,CancellationToken ct){var id=User;Validator.ValidateObject(r,new ValidationContext(r),true);if(!await repo.Update(id,r,ct))throw new AppException(409,"Profil başka bir işlemle değişti. Sayfayı yenileyin.");}
 public Task<string?> SetPhoto(string? name,CancellationToken ct)=>repo.SetPhoto(User,name,ct);
 public async Task<string?> PhotoFile(Guid id,CancellationToken ct)=>(await Find(id,ct)).PhotoFile;
}
