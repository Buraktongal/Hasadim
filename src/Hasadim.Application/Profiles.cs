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
// Fotoğraf kadrajı: X/Y odak noktası (yüzde), Zoom yakınlaştırma (yüzde 100-300).
public record PhotoFrame(int X=50,int Y=50,int Zoom=100);
public record PublicProfile(Guid Id,string DisplayName,string AccountType,string Activity,string? BusinessName,string City,string District,string About,string? Phone,string? PhotoUrl,DateTime? MemberSince,bool EmailVerified,int ActiveListingCount,string? CoverUrl=null,PhotoFrame? PhotoFrame=null,PhotoFrame? CoverFrame=null,bool HasPhone=false,bool IsMine=false);
public class FrameRequest
{
 [Required,RegularExpression("^(photo|cover)$")]public string Target {get;set;}="photo";
 [Range(0,100)]public int X {get;set;}=50;
 [Range(0,100)]public int Y {get;set;}=50;
 [Range(100,300)]public int Zoom {get;set;}=100;
}
// Arama kutusunda satıcı önerisi: yalnızca yayında ilanı olan kullanıcılar listelenir.
public record SellerSearchResult(Guid Id,string Name,string? PersonName,string City,string District,string Activity,string? PhotoUrl,int ActiveListingCount,bool EmailVerified);
public record SellerSearchRow(Guid UserId,string DisplayName,string AccountType,string BusinessName,string City,string District,string Activity,string? PhotoFile,int ActiveListingCount,bool EmailConfirmed);
public record MyProfile(Guid Id,string DisplayName,string AccountType,string Activity,string BusinessName,string City,string District,string About,string Phone,bool ShowPhone,string? PhotoUrl,DateTime? MemberSince,string Email,bool EmailVerified,int ActiveListingCount,int Completion,byte[] Version,bool PhoneVerified=false,string? CoverUrl=null,PhotoFrame? PhotoFrame=null,PhotoFrame? CoverFrame=null);
public interface IProfileRepository
{
 Task<SellerProfile?> Find(Guid id,CancellationToken ct);
 Task<bool> Update(Guid id,ProfileRequest request,CancellationToken ct);
 Task<string?> SetPhoto(Guid id,string? name,CancellationToken ct);
 Task<string?> SetCover(Guid id,string? name,CancellationToken ct);
 Task SetFrame(Guid id,string target,int x,int y,int zoom,CancellationToken ct);
 Task<IReadOnlyList<SellerSearchRow>> Search(string term,Guid? viewer,int take,CancellationToken ct);
}
public class ProfileService(IProfileRepository repo,ICurrentUser user)
{
 Guid User=>user.Id??throw new AppException(401,"Giriş yapın.");
 static string? Photo(SellerProfile p)=>p.PhotoFile is null?null:$"/api/profiles/{p.UserId}/photo?v={p.PhotoFile}";
 static string? Cover(SellerProfile p)=>p.CoverFile is null?null:$"/api/profiles/{p.UserId}/cover?v={p.CoverFile}";
 static PhotoFrame PFrame(SellerProfile p)=>new(p.PhotoX,p.PhotoY,p.PhotoZoom);
 static PhotoFrame CFrame(SellerProfile p)=>new(p.CoverX,p.CoverY,p.CoverZoom);
 async Task<SellerProfile> Find(Guid id,CancellationToken ct)=>await repo.Find(id,ct)??throw new AppException(404,"Satıcı bulunamadı.");
 public async Task<PublicProfile> Public(Guid id,CancellationToken ct){var p=await Find(id,ct);return new(p.UserId,p.DisplayName,p.AccountType,p.Activity,p.AccountType=="Business"?p.BusinessName:null,p.City,p.District,p.About,user.Id.HasValue&&p.ShowPhone?p.Phone:null,Photo(p),p.CreatedAt,p.EmailConfirmed,p.ActiveListingCount,Cover(p),PFrame(p),CFrame(p),p.ShowPhone&&!string.IsNullOrWhiteSpace(p.Phone),user.Id==p.UserId);}
 public async Task<IReadOnlyList<SellerSearchResult>> Search(string? q,CancellationToken ct)
 {
  var term=(q??"").Trim();
  if(term.Length<2)return [];
  if(term.Length>60)term=term[..60];
  var rows=await repo.Search(term,user.Id,8,ct);
  return rows.Select(r=>{var business=r.AccountType=="Business"&&!string.IsNullOrWhiteSpace(r.BusinessName);return new SellerSearchResult(r.UserId,business?r.BusinessName:r.DisplayName,business?r.DisplayName:null,r.City,r.District,r.Activity,r.PhotoFile is null?null:$"/api/profiles/{r.UserId}/photo?v={r.PhotoFile}",r.ActiveListingCount,r.EmailConfirmed);}).ToList();
 }
 public async Task<MyProfile> Mine(CancellationToken ct){var p=await Find(User,ct);var completed=new[]{!string.IsNullOrWhiteSpace(p.DisplayName),!string.IsNullOrWhiteSpace(p.City)&&!string.IsNullOrWhiteSpace(p.District),!string.IsNullOrWhiteSpace(p.About),!string.IsNullOrWhiteSpace(p.Phone),p.PhotoFile is not null}.Count(x=>x);return new(p.UserId,p.DisplayName,p.AccountType,p.Activity,p.BusinessName,p.City,p.District,p.About,p.Phone,p.ShowPhone,Photo(p),p.CreatedAt,p.Email,p.EmailConfirmed,p.ActiveListingCount,completed*20,p.Version,p.PhoneVerified,Cover(p),PFrame(p),CFrame(p));}
 public async Task Update(ProfileRequest r,CancellationToken ct){var id=User;Validator.ValidateObject(r,new ValidationContext(r),true);if(!await repo.Update(id,r,ct))throw new AppException(409,"Profil başka bir işlemle değişti. Sayfayı yenileyin.");}
 public Task<string?> SetPhoto(string? name,CancellationToken ct)=>repo.SetPhoto(User,name,ct);
 public Task<string?> SetCover(string? name,CancellationToken ct)=>repo.SetCover(User,name,ct);
 public async Task SetFrame(FrameRequest r,CancellationToken ct){var id=User;Validator.ValidateObject(r,new ValidationContext(r),true);await repo.SetFrame(id,r.Target,r.X,r.Y,r.Zoom,ct);}
 public async Task<string?> CoverFile(Guid id,CancellationToken ct)=>(await Find(id,ct)).CoverFile;
 public async Task<string?> PhotoFile(Guid id,CancellationToken ct)=>(await Find(id,ct)).PhotoFile;
}
