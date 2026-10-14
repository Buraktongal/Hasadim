using Hasadim.Application;
using Hasadim.Core;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
var repo=new MemoryRepo();var user=new Current{Id=Guid.NewGuid()};var service=new MarketplaceService(repo,user);var ct=CancellationToken.None;
var request=new ListingRequest{Baslik="Korkuteli elma ilanı",MeyveTuru="Elma",Cesit="Starking",MiktarKg=100,KilogramFiyati=25,Il="Antalya",Ilce="Korkuteli",Telefon="05000000000"};
void Check(bool ok,string name){if(!ok)throw new Exception("FAIL: "+name);Console.WriteLine("PASS: "+name);}
async Task Status(int code,Func<Task> f,string name){try{await f();throw new Exception("FAIL: "+name);}catch(AppException e){Check(e.Status==code,name);}}
var first=await service.Create(request,ct,["photo.jpg"]);var second=await service.Create(request,ct,["photo.jpg"]);
Check(first!=Guid.Empty&&second!=Guid.Empty&&first!=second,"Aynı kullanıcı iki farklı GUID ilanı oluşturur");
Check(repo.Items.Count==2&&repo.Items.All(x=>x.OwnerId==user.Id),"İki ilan aynı kullanıcıya aittir");
var owner=user.Id;user.Id=Guid.NewGuid();
await Status(403,()=>service.Update(first,request,ct),"Başka kullanıcı ilanı düzenleyemez");
await Status(403,()=>service.Delete(first,ct),"Başka kullanıcı ilanı silemez");
user.Id=null;await Status(401,()=>service.Create(request,ct,["photo.jpg"]),"Anonim kullanıcı ilan veremez");
user.Id=owner;await Status(400,()=>service.Update(first,request,ct),"Sürüm bilgisi olmayan güncelleme reddedilir");
request.Version=new byte[8];repo.UpdateSuccess=false;await Status(409,()=>service.Update(first,request,ct),"Çakışan güncelleme reddedilir");
await Status(400,()=>service.Search(new ListingQuery{MinFiyat=50,MaxFiyat=20},ct),"Ters fiyat aralığı reddedilir");
user.Id=null;var detail=await service.Detail(first,ct);Check(detail.Telefon is null,"Anonim kullanıcıya telefon verilmez");
user.Id=owner;await Status(403,()=>service.Reports(ct),"Normal kullanıcı yönetime erişemez");
var hasher=new PasswordHasher<object>(Options.Create(new PasswordHasherOptions{IterationCount=210000}));var obj=new object();
var h1=hasher.HashPassword(obj,"SecurePassword123");var h2=hasher.HashPassword(obj,"SecurePassword123");
Check(h1!=h2,"Aynı şifre farklı salt ile hashlenir");Check(hasher.VerifyHashedPassword(obj,h1,"SecurePassword123")!=PasswordVerificationResult.Failed,"Doğru şifre doğrulanır");Check(hasher.VerifyHashedPassword(obj,h1,"WrongPassword123")==PasswordVerificationResult.Failed,"Yanlış şifre reddedilir");
user.Id=owner;await Status(400,()=>service.Create(request,ct),"Fotoğrafsız ilan API tarafından reddedilir");
await Status(400,()=>service.Create(request,ct,Enumerable.Repeat("a.jpg",11).ToArray()),"11 fotoğraf reddedilir");
var profiles=new MemoryProfiles();var ps=new ProfileService(profiles,user);
user.Id=null;Check((await ps.Public(profiles.Value.UserId,ct)).Phone is null,"Anonim profil telefonu gizlenir");
await Status(401,()=>ps.Mine(ct),"Anonim kullanıcı kendi profiline erişemez");
user.Id=owner;profiles.Value.ShowPhone=false;Check((await ps.Public(profiles.Value.UserId,ct)).Phone is null,"Gizlenen telefon oturum açmış kişiye verilmez");
profiles.Value.ShowPhone=true;Check((await ps.Public(profiles.Value.UserId,ct)).Phone=="05000000000","İzin verilen profil telefonu görünür");
Check((await ps.Public(profiles.Value.UserId,ct)).MemberSince is null,"Eski kullanıcı için üyelik tarihi uydurulmaz");
var pr=new ProfileRequest{DisplayName="Burak",City="Antalya",District="Merkez",Version=new byte[8]};await ps.Update(pr,ct);Check(profiles.UpdatedId==owner,"Profil güncellemesi oturumdaki kullanıcıya aittir");
profiles.Success=false;await Status(409,()=>ps.Update(pr,ct),"Profil sürüm çakışması reddedilir");
pr.AccountType="Business";var errors=new List<System.ComponentModel.DataAnnotations.ValidationResult>();Check(!System.ComponentModel.DataAnnotations.Validator.TryValidateObject(pr,new(pr),errors,true),"Firma adı olmadan kurumsal profil reddedilir");
Console.WriteLine("Tüm 23 kontrol geçti.");
class Current:ICurrentUser{public Guid? Id{get;set;}public bool IsAdmin{get;set;}}
class MemoryRepo:IMarketplaceRepository
{
 public List<Listing> Items {get;}=[];public bool UpdateSuccess=true;
 public Task Create(Listing l,IReadOnlyList<string> photos,CancellationToken ct){Items.Add(l);return Task.CompletedTask;}
 public Task<Listing?> Find(Guid id,CancellationToken ct)=>Task.FromResult(Items.Find(x=>x.Id==id));
 public Task<ListingView?> Detail(Guid id,Guid? user,CancellationToken ct){var l=Items.Find(x=>x.Id==id);return Task.FromResult(l is null?null:new ListingView{Id=l.Id,OwnerId=l.OwnerId,Active=l.Active,Telefon=l.Telefon,Photos=[new(Guid.NewGuid(),"photo.jpg")]});}
 public Task<bool> Update(Listing l,byte[] v,CancellationToken ct)=>Task.FromResult(UpdateSuccess);
 public Task Delete(Guid id,CancellationToken ct)=>Task.CompletedTask;
 public Task<Paged<ListingView>> Search(ListingQuery q,Guid? u,CancellationToken ct)=>Task.FromResult(new Paged<ListingView>([],0,q.Page,q.PageSize));
 public Task AddPhotos(Guid id,IReadOnlyList<string> photos,CancellationToken ct)=>Task.CompletedTask;
 public Task SetPhoto(Guid id,string url,CancellationToken ct)=>Task.CompletedTask;
 public Task Favorite(Guid id,Guid u,bool add,CancellationToken ct)=>Task.CompletedTask;
 public Task<IReadOnlyList<MessageView>> Messages(Guid u,int p,CancellationToken ct)=>Task.FromResult<IReadOnlyList<MessageView>>([]);
 public Task<bool> HasConversation(Guid l,Guid b,Guid o,CancellationToken ct)=>Task.FromResult(false);
 public Task Send(Guid id,Guid s,MessageRequest r,CancellationToken ct)=>Task.CompletedTask;
 public Task Report(Guid l,Guid u,string r,CancellationToken ct)=>Task.CompletedTask;
 public Task<IReadOnlyList<ReportView>> Reports(CancellationToken ct)=>Task.FromResult<IReadOnlyList<ReportView>>([]);
 public Task Visibility(Guid l,bool h,CancellationToken ct)=>Task.CompletedTask;
 public Task Resolve(Guid r,CancellationToken ct)=>Task.CompletedTask;
}

class MemoryProfiles:IProfileRepository{
 public SellerProfile Value=new(){UserId=Guid.NewGuid(),DisplayName="Satıcı",Phone="05000000000",ShowPhone=true};public Guid? UpdatedId;public bool Success=true;
 public Task<SellerProfile?> Find(Guid id,CancellationToken ct)=>Task.FromResult<SellerProfile?>(Value);
 public Task<bool> Update(Guid id,ProfileRequest r,CancellationToken ct){UpdatedId=id;return Task.FromResult(Success);}
 public Task<string?> SetPhoto(Guid id,string? n,CancellationToken ct)=>Task.FromResult<string?>(null);
}
