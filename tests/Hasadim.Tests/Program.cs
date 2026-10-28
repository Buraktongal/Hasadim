using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using Hasadim.Application;
using Hasadim.Core;
using System.Reflection;

var repo = new MemoryRepo();
var user = new Current { Id = Guid.NewGuid() };
var service = new MarketplaceService(repo, user);
var ct = CancellationToken.None;
int checks = 0;
void Check(bool ok, string name)
{
    if (!ok) throw new Exception("FAIL: " + name);
    checks++;
    Console.WriteLine("PASS: " + name);
}
async Task Status(int code, Func<Task> operation, string name)
{
    try { await operation(); throw new Exception("Expected error: " + name); }
    catch (AppException e) { Check(e.Status == code, name); }
}
ListingRequest Request(byte[]? version = null) => new()
{
    Baslik = "Korkuteli elma ilanı", MeyveTuru = "Elma", Cesit = "Starking",
    MiktarKg = 100, KilogramFiyati = 25, Il = "Antalya", Ilce = "Korkuteli",
    Telefon = "0501 343 10 91", Version = version, Active = true
};
var owner = user.Id;
var first = await service.Create(Request(), ct, ["photo.jpg"]);
var second = await service.Create(Request(), ct, ["photo.jpg"]);
Check(first != second, "Aynı kullanıcı ayrı ilanlar oluşturur");
Check(repo.Items[first].Status == ListingStatus.PendingReview, "Yeni ilan doğrudan incelemede");
Check(!repo.Items[first].Active && repo.Items[first].SubmittedAt.HasValue, "İlan yayımlanmaz; gönderim tarihi vardır");
Check(repo.Photos[first].Count == 1, "Fotoğraflar ilanla birlikte depoya gönderilir");
Check((await service.Detail(first, ct)).Status == ListingStatus.PendingReview, "Sahibi incelemedeki ilanı görür");
user.Id = null;
await Status(404, () => service.Detail(first, ct), "Anonim kişi incelemedeki ilana erişemez");
await Status(401, () => service.Search(new ListingQuery { Review = true }, ct), "Anonim inceleme listesine erişemez");
user.Id = Guid.NewGuid();
await Status(404, () => service.Detail(first, ct), "Başka kullanıcı incelemedeki ilanı göremez");
await Status(403, () => service.Search(new ListingQuery { Review = true }, ct), "Normal kullanıcı inceleme listesine erişemez");
await Status(403, () => service.RequestChanges(first, new() { Version = repo.Items[first].Version, Note = "Konumu düzelt" }, ct), "Normal kullanıcı yönetim kararı veremez");
user.Id = owner;
await Status(409, () => service.Update(first, Request(repo.Items[first].Version), ct), "İncelemedeki içerik değiştirilemez");
await Status(400, () => service.Create(Request(), ct), "Fotoğrafsız ilan reddedilir");
user.Id = Guid.NewGuid(); user.IsAdmin = true;
var queue = await service.Search(new ListingQuery { Review = true }, ct);
Check(queue.Items.Count == 2, "Yönetici inceleme kuyruğunu görür");
await Status(400, () => service.RequestChanges(first, new() { Version = repo.Items[first].Version, Note = " " }, ct), "Boş düzeltme gerekçesi reddedilir");
await service.RequestChanges(first, new() { Version = repo.Items[first].Version, Note = "İlçe bilgisini kontrol et" }, ct);
Check(repo.Items[first].Status == ListingStatus.ChangesRequested, "Düzeltme kararı kaydedilir");
user.Id = owner; user.IsAdmin = false;
var detail = await service.Detail(first, ct);
Check(detail.ReviewNote == "İlçe bilgisini kontrol et", "İlan sahibi düzeltme gerekçesini görür");
var oldVersion = detail.Version;
repo.UpdateSuccess = false;
await Status(409, () => service.Update(first, Request(oldVersion), ct), "SQL sürüm çakışması reddedilir");
Check(repo.Items[first].Status == ListingStatus.ChangesRequested, "Başarısız güncelleme kaydı değiştirmez");
repo.UpdateSuccess = true;
await service.Update(first, Request(oldVersion), ct);
Check(repo.Items[first].Status == ListingStatus.PendingReview && repo.Items[first].ReviewNote is null, "Düzeltme tek kayıtta yeniden incelemeye alınır");
await Status(409, () => service.Update(first, Request(oldVersion), ct), "İkinci gönderim yeniden kaydedilmez");
user.Id = Guid.NewGuid(); user.IsAdmin = true;
await Status(409, () => service.Approve(first, new() { Version = oldVersion }, ct), "Eski yönetici sürümüyle onay reddedilir");
await service.Approve(first, new() { Version = repo.Items[first].Version }, ct);
Check(repo.Items[first].Status == ListingStatus.Published && repo.Items[first].Active, "Yönetici onayı ilanı hemen yayımlar");
Check(repo.Items[first].PublishedAt.HasValue && repo.Items[first].ExpiresAt - repo.Items[first].PublishedAt == TimeSpan.FromDays(30), "Yayın süresi tam 30 gün");
var expiryBeforeSecondApproval = repo.Items[first].ExpiresAt;
await Status(409, () => service.Approve(first, new() { Version = repo.Items[first].Version }, ct), "Yayımlanmış ilan yeniden onaylanamaz");
Check(repo.Items[first].ExpiresAt == expiryBeforeSecondApproval, "Tekrarlı onay yayın süresini uzatmaz");
queue = await service.Search(new ListingQuery { Review = true }, ct);
Check(queue.Items.Count == 1 && queue.Items[0].Id == second, "Karar verilen ilan kuyruktan çıkar");
user.Id = null; user.IsAdmin = false;
Check((await service.Detail(first, ct)).Status == ListingStatus.Published, "Onaylanan ilan anonim kullanıcıya görünür");
await Status(401, () => service.Search(new ListingQuery { History = true }, ct), "Anonim kişi geçmiş ilanlara erişemez");
typeof(Listing).GetProperty(nameof(Listing.ExpiresAt))!.SetValue(repo.Items[first], DateTime.UtcNow.AddSeconds(-1));
await Status(404, () => service.Detail(first, ct), "Süre dolunca anonim detay erişimi kapanır");
Check(!(await service.Search(new ListingQuery(), ct)).Items.Any(x => x.Id == first), "Süresi dolan ilan pazar yerinde yoktur");
user.Id = owner;
Check(!(await service.Search(new ListingQuery { Mine = true }, ct)).Items.Any(x => x.Id == first), "Süresi dolan ilan güncel ilanlardan çıkar");
var past = await service.Search(new ListingQuery { History = true }, ct);
Check(past.Items.Single().Id == first && past.Items.Single().Status == ListingStatus.Expired && !past.Items.Single().Active, "Süresi dolan ilan geçmişte doğru durumla görünür");
Check((await service.Detail(first, ct)).Status == ListingStatus.Expired, "Sahibi geçmiş ilanın detayına erişir");
await Status(400, () => service.Search(new ListingQuery { History = true, Mine = true }, ct), "Geçmiş ve güncel filtre birlikte reddedilir");
user.Id = Guid.NewGuid();
Check((await service.Search(new ListingQuery { History = true }, ct)).Items.Count == 0, "Başka kullanıcı geçmiş ilanları göremez");
user.IsAdmin = true;
typeof(Listing).GetProperty(nameof(Listing.Status))!.SetValue(repo.Items[second], ListingStatus.AwaitingPayment);
Check((await service.Search(new ListingQuery { Review = true }, ct)).Items.Any(x => x.Id == second), "Eski ödeme bekleyen ilan yönetim listesine gelir");
await service.Approve(second, new() { Version = repo.Items[second].Version }, ct);
Check(repo.Items[second].Status == ListingStatus.Published && repo.Items[second].Active, "Eski onaylı ilan 30 günlük yayına alınabilir");
user.Id = owner; user.IsAdmin = false;
await service.MarkAsSold(first, new() { Version = repo.Items[first].Version }, ct);
Check((await service.Search(new ListingQuery { History = true }, ct)).Items.Single().Status == ListingStatus.Sold, "Satılan ilan geçmişte saklanır");
var request = Request();
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
Console.WriteLine($"ALL {checks} WORKFLOW CHECKS PASSED");

class Current : ICurrentUser
{
    public Guid? Id { get; set; }
    public bool IsAdmin { get; set; }
}
class MemoryRepo : IMarketplaceRepository
{
    public Dictionary<Guid, Listing> Items = [];
    public Dictionary<Guid, IReadOnlyList<string>> Photos = [];
    public bool UpdateSuccess = true;
    private static Listing Clone(Listing l) => (Listing)typeof(object)
        .GetMethod("MemberwiseClone", BindingFlags.Instance | BindingFlags.NonPublic)!.Invoke(l, null)!;
    private static void Version(Listing l, long value) => typeof(Listing)
        .GetProperty(nameof(Listing.Version))!.SetValue(l, BitConverter.GetBytes(value));
    private ListingView View(Listing l, Guid? user) => new()
    {
        Id = l.Id, OwnerId = l.OwnerId, Baslik = l.Baslik, Active = l.Active,
        Status = l.Status, Hidden = l.Hidden, IsDeleted = l.IsDeleted,
        ReviewNote = l.ReviewNote, Version = l.Version, Telefon = l.Telefon,
        SubmittedAt = l.SubmittedAt, IsMine = l.OwnerId == user,
        PublishedAt = l.PublishedAt, ExpiresAt = l.ExpiresAt,
        Photos = Photos[l.Id].Select(p => new ListingPhoto(Guid.NewGuid(), p)).ToArray()
    };
    public Task Create(Listing l, IReadOnlyList<string> photos, CancellationToken ct)
    { Version(l, 1); Items[l.Id] = Clone(l); Photos[l.Id] = photos.ToArray(); return Task.CompletedTask; }
    public Task<Listing?> Find(Guid id, CancellationToken ct) =>
        Task.FromResult(Items.TryGetValue(id, out var l) ? Clone(l) : null);
    public Task<ListingView?> Detail(Guid id, Guid? user, CancellationToken ct) =>
        Task.FromResult(Items.TryGetValue(id, out var l) ? View(l, user) : null);
    public Task<bool> Update(Listing l, byte[] expected, CancellationToken ct)
    {
        if (!UpdateSuccess || !Items[l.Id].Version.SequenceEqual(expected)) return Task.FromResult(false);
        Version(l, BitConverter.ToInt64(expected) + 1); Items[l.Id] = Clone(l); return Task.FromResult(true);
    }
    public Task<Paged<ListingView>> Search(ListingQuery q, Guid? user, CancellationToken ct)
    {
        bool Historical(Listing l) => l.Status is ListingStatus.Expired or ListingStatus.Sold ||
            (l.Status == ListingStatus.Published && l.ExpiresAt.HasValue && l.ExpiresAt <= DateTime.UtcNow);
        var items = Items.Values.Where(l => !l.IsDeleted &&
            (q.Review ? (l.Status is ListingStatus.PendingReview or ListingStatus.AwaitingPayment) && !l.Hidden :
                q.History ? l.OwnerId == user && Historical(l) :
                q.Mine ? l.OwnerId == user && !Historical(l) :
                l.Active && !l.Hidden && l.Status == ListingStatus.Published && !Historical(l)))
            .Select(l => View(l, user)).ToArray();
        return Task.FromResult(new Paged<ListingView>(items, items.Length, q.Page, q.PageSize));
    }
    public Task Delete(Guid id, CancellationToken ct) => Task.CompletedTask;
    public Task AddPhotos(Guid id, IReadOnlyList<string> photos, CancellationToken ct) => Task.CompletedTask;
    public Task SetPhoto(Guid id, string url, CancellationToken ct) => Task.CompletedTask;
    public Task Favorite(Guid id, Guid u, bool add, CancellationToken ct) => Task.CompletedTask;
    public Task<IReadOnlyList<MessageView>> Messages(Guid u, int p, CancellationToken ct) => Task.FromResult<IReadOnlyList<MessageView>>([]);
    public Task<bool> HasConversation(Guid l, Guid b, Guid o, CancellationToken ct) => Task.FromResult(false);
    public Task Send(Guid id, Guid s, MessageRequest r, CancellationToken ct) => Task.CompletedTask;
    public Task Report(Guid l, Guid u, string r, CancellationToken ct) => Task.CompletedTask;
    public Task<IReadOnlyList<ReportView>> Reports(CancellationToken ct) => Task.FromResult<IReadOnlyList<ReportView>>([]);
    public Task Visibility(Guid l, bool h, CancellationToken ct) => Task.CompletedTask;
    public Task Resolve(Guid r, CancellationToken ct) => Task.CompletedTask;
}

class MemoryProfiles:IProfileRepository{
 public SellerProfile Value=new(){UserId=Guid.NewGuid(),DisplayName="Satıcı",Phone="05000000000",ShowPhone=true};public Guid? UpdatedId;public bool Success=true;
 public Task<SellerProfile?> Find(Guid id,CancellationToken ct)=>Task.FromResult<SellerProfile?>(Value);
 public Task<bool> Update(Guid id,ProfileRequest r,CancellationToken ct){UpdatedId=id;return Task.FromResult(Success);}
 public Task<string?> SetPhoto(Guid id,string? n,CancellationToken ct)=>Task.FromResult<string?>(null);
}
