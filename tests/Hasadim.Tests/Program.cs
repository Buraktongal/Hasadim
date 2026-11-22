using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using Hasadim.Application;
using Hasadim.Core;
using System.Reflection;

var repo = new MemoryRepo();
var user = new Current { Id = Guid.NewGuid() };
var listingProfiles = new MemoryProfiles();
var service = new MarketplaceService(repo, user, listingProfiles);
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
var missingPhoneRequest = Request();
listingProfiles.Value.Phone = "";
await Status(400, () => service.Create(missingPhoneRequest, ct, ["photo.jpg"]), "Profil telefonu yoksa istemcinin numarası kabul edilmez");
Check(repo.Items.Count == 0, "Profil telefonu eksikken ilan oluşturulmaz");
listingProfiles.Value.Phone = "05011111111";
var first = await service.Create(Request(), ct, ["photo.jpg"]);
Check(repo.Items[first].Telefon == "05011111111", "İlan telefonu istemciden değil profilden alınır");
var second = await service.Create(Request(), ct, ["photo.jpg"]);
Check(first != second, "Aynı kullanıcı ayrı ilanlar oluşturur");
Check(repo.Items[first].Status == ListingStatus.Published && repo.Items[first].Active, "Yeni ilan yönetici olmadan otomatik yayımlanır");
Check(repo.Items[first].ExpiresAt - repo.Items[first].PublishedAt == TimeSpan.FromDays(30), "Otomatik yayın tam 30 gün sürer");
Check(repo.Items[first].ReviewedBy is null && repo.Items[first].ReviewedAt is null, "Otomatik yayın yönetici incelemesi olarak kaydedilmez");
user.Id = null;
Check((await service.Detail(first, ct)).Status == ListingStatus.Published, "Otomatik yayın herkese görünür");
user.Id = Guid.NewGuid();
await Status(403, () => service.RemovePhoto(first, Guid.NewGuid(), ct), "Başka kullanıcı ilan fotoğrafı silemez");
await Status(403, () => service.SetCover(first, Guid.NewGuid(), ct), "Başka kullanıcı kapak fotoğrafı değiştiremez");
user.Id = owner;
await service.CheckEditable(first, ct);
Check(true, "Yayındaki ilan fotoğraf işlemleri için düzenlenebilir");
await Status(400, () => service.RemovePhoto(first, Guid.NewGuid(), ct), "Son fotoğraf silinemez");
Check(PhoneNumbers.Normalize("0532 111 22 01") == "05321112201", "Telefon 0 ile yazılınca normalleşir");
Check(PhoneNumbers.Normalize("+90 (532) 111 22 01") == "05321112201", "Telefon +90 ile yazılınca normalleşir");
Check(PhoneNumbers.Normalize("5321112201") == "05321112201", "Telefon başında 0 olmadan normalleşir");
Check(PhoneNumbers.Normalize("0212 111 22 01") is null && PhoneNumbers.Normalize("123") is null, "Sabit hat ve eksik numara reddedilir");
var invalid = Request(); invalid.MiktarKg = 0;
await Status(400, () => service.Create(invalid, ct, ["photo.jpg"]), "Geçersiz ilan otomatik yayımlanmaz");
var originalExpiry = repo.Items[first].ExpiresAt;
await Status(409, () => service.SubmitForReview(first, new() { Version = repo.Items[first].Version }, ct), "Yayımlanmış ilan yeniden gönderilemez");
Check(repo.Items[first].ExpiresAt == originalExpiry, "Yeniden gönderim otomatik yayın süresini uzatmaz");
// Eski inceleme kayıtları ve yönetim yetkileri için ayrı senaryo.
foreach (var id in new[] { first, second })
{
    typeof(Listing).GetProperty(nameof(Listing.Status))!.SetValue(repo.Items[id], ListingStatus.PendingReview);
    typeof(Listing).GetProperty(nameof(Listing.Active))!.SetValue(repo.Items[id], false);
}
Check(repo.Items[first].Status == ListingStatus.PendingReview, "Eski inceleme kaydı senaryosu hazır");
Check(!repo.Items[first].Active && repo.Items[first].SubmittedAt.HasValue, "Eski inceleme kaydı yayında değildir; gönderim tarihi vardır");
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
Check(repo.Items[first].Status == ListingStatus.Published && repo.Items[first].ReviewNote is null, "Düzeltilen ilan tek kayıtta otomatik yayımlanır");
await Status(409, () => service.Update(first, Request(oldVersion), ct), "İkinci gönderim yeniden kaydedilmez");
user.Id = Guid.NewGuid(); user.IsAdmin = true;
await Status(409, () => service.Approve(first, new() { Version = oldVersion }, ct), "Eski yönetici sürümüyle onay reddedilir");
typeof(Listing).GetProperty(nameof(Listing.Status))!.SetValue(repo.Items[first], ListingStatus.PendingReview);
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
await Status(400, () => service.Search(new ListingQuery { MinMiktar = 500, MaxMiktar = 100 }, ct), "Ters miktar aralığı reddedilir");
await Status(400, () => service.Search(new ListingQuery { Sort = "l.Id; DROP TABLE x" }, ct), "Tanımsız sıralama reddedilir");
await Status(400, () => service.Search(new ListingQuery { Ambalaj = "Bidon" }, ct), "Tanımsız ambalaj filtresi reddedilir");
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
Check(!(await ps.Public(profiles.Value.UserId,ct)).IsMine,"Anonim ziyaretçi için profil kendi profili sayılmaz");
user.Id=profiles.Value.UserId;Check((await ps.Public(profiles.Value.UserId,ct)).IsMine,"Kişi kendi profilini açınca IsMine işaretlenir");
await Status(401,()=>ps.Mine(ct),"Anonim kullanıcı kendi profiline erişemez");
user.Id=owner;profiles.Value.ShowPhone=false;Check((await ps.Public(profiles.Value.UserId,ct)).Phone is null,"Gizlenen telefon oturum açmış kişiye verilmez");
profiles.Value.ShowPhone=true;Check((await ps.Public(profiles.Value.UserId,ct)).Phone=="05000000000","İzin verilen profil telefonu görünür");
Check((await ps.Public(profiles.Value.UserId,ct)).MemberSince is null,"Eski kullanıcı için üyelik tarihi uydurulmaz");
var pr=new ProfileRequest{DisplayName="Burak",City="Antalya",District="Merkez",Version=new byte[8]};await ps.Update(pr,ct);Check(profiles.UpdatedId==owner,"Profil güncellemesi oturumdaki kullanıcıya aittir");
profiles.Success=false;await Status(409,()=>ps.Update(pr,ct),"Profil sürüm çakışması reddedilir");
await ps.SetFrame(new FrameRequest{Target="cover",X=20,Y=80,Zoom=150},ct);Check(profiles.Frame==("cover",20,80,150),"Kapak kadrajı kaydedilir");
async Task<bool> Rejected(Func<Task> f){try{await f();return false;}catch(System.ComponentModel.DataAnnotations.ValidationException){return true;}}
profiles.Frame=null;Check(await Rejected(()=>ps.SetFrame(new FrameRequest{Target="photo; DROP",X=20},ct))&&profiles.Frame is null,"Bilinmeyen kadraj hedefi reddedilir");
Check(await Rejected(()=>ps.SetFrame(new FrameRequest{Zoom=900},ct)),"Aşırı yakınlaştırma reddedilir");
Check((await ps.Search("a",ct)).Count==0&&profiles.LastTerm is null,"Tek harfle satıcı araması veritabanına gitmez");
profiles.Rows=[new(Guid.NewGuid(),"Ali Kaya","Business","Kaya Tarım","Antalya","Korkuteli","Trader",null,3,true),new(Guid.NewGuid(),"Veli","Individual","Gizli Firma","İzmir","Ödemiş","Producer","x.jpg",1,false)];
var found=await ps.Search("  ka  ",ct);Check(profiles.LastTerm=="ka"&&found[0].Name=="Kaya Tarım"&&found[0].PersonName=="Ali Kaya","Kurumsal satıcı firma adıyla, kişi adı alt satırda gösterilir");
Check(found[1].Name=="Veli"&&found[1].PersonName is null&&found[1].PhotoUrl!.Contains("/photo"),"Bireysel hesapta firma adı açığa çıkmaz");
pr.AccountType="Business";var errors=new List<System.ComponentModel.DataAnnotations.ValidationResult>();Check(!System.ComponentModel.DataAnnotations.Validator.TryValidateObject(pr,new(pr),errors,true),"Firma adı olmadan kurumsal profil reddedilir");
string RawHash(string sql) => Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(sql)));
const string sqlLf = "SELECT 1;\nSELECT 'text';\n";
var sqlCrLf = sqlLf.Replace("\n", "\r\n");
Check(Hasadim.Infrastructure.Database.MigrationChecksum.Matches(sqlCrLf, RawHash(sqlLf)), "Eski LF özeti CRLF dosyasını kabul eder");
Check(Hasadim.Infrastructure.Database.MigrationChecksum.Matches(sqlLf, RawHash(sqlCrLf)), "Eski CRLF özeti LF dosyasını kabul eder");
Check(Hasadim.Infrastructure.Database.MigrationChecksum.Compute(sqlLf) == Hasadim.Infrastructure.Database.MigrationChecksum.Compute(sqlCrLf), "Yeni özet satır sonlarından bağımsızdır");
Check(!Hasadim.Infrastructure.Database.MigrationChecksum.Matches(sqlLf.Replace("SELECT 1", "SELECT 2"), RawHash(sqlCrLf)), "Gerçek SQL değişikliği reddedilir");
Check(!Hasadim.Infrastructure.Database.MigrationChecksum.Matches(sqlLf.Replace("'text'", "' text'"), RawHash(sqlLf)), "SQL içindeki boşluk değişikliği reddedilir");
Check(!Hasadim.Infrastructure.Database.MigrationChecksum.Matches(sqlLf.TrimEnd(), RawHash(sqlLf)), "Son satırın silinmesi sessizce kabul edilmez");
// Kategoriler, birimler ve satılık arazi kuralları.
user.Id = owner; user.IsAdmin = false;
ListingRequest Land() => new()
{
    Baslik = "Isparta Eğirdir'de satılık elma bahçesi", Kategori = "Arazi", MeyveTuru = "Meyve bahçesi",
    MiktarKg = 12500, KilogramFiyati = 4_750_000, Il = "Isparta", Ilce = "Eğirdir",
    ImarDurumu = "İmarsız (tarım arazisi)", TapuDurumu = "Müstakil tapu", Sulama = "Sulu", Ada = "112", Parsel = "7",
    Elektrik = true, YolCephesi = true, Ambalaj = "Kasa", MinAlimKg = 100, HasatTarihi = DateTime.UtcNow
};
var landId = await service.Create(Land(), ct, ["arazi.jpg"]);
var land = repo.Items[landId];
Check(land.Kategori == "Arazi" && land.Birim == "m2" && land.IslemTipi == "Satilik", "Arazi ilanı m² birimiyle, varsayılan satılık kaydedilir");
var rent = Land(); rent.IslemTipi = "Kiralik"; rent.KilogramFiyati = 60_000;
Check(repo.Items[await service.Create(rent, ct, ["arazi.jpg"])].IslemTipi == "Kiralik", "Arazi kiralık olarak verilebilir");
var badDeal = Land(); badDeal.IslemTipi = "Takas";
await Status(400, () => service.Create(badDeal, ct, ["arazi.jpg"]), "Tanımsız işlem tipi reddedilir");
Check(repo.Items.Values.Where(x => x.Kategori == "Meyve").All(x => x.IslemTipi is null), "Ürün ilanında işlem tipi boş kalır");
Check(land.KilogramFiyati == 4_750_000 && land.Ambalaj is null && land.MinAlimKg is null && land.HasatTarihi is null, "Arazide toplam fiyat 1 milyonu aşabilir; ürün alanları temizlenir");
var noZoning = Land(); noZoning.ImarDurumu = null;
await Status(400, () => service.Create(noZoning, ct, ["arazi.jpg"]), "İmar durumu olmadan arazi ilanı reddedilir");
var badParcel = Land(); badParcel.Parsel = "7; DROP";
await Status(400, () => service.Create(badParcel, ct, ["arazi.jpg"]), "Geçersiz parsel bilgisi reddedilir");
var expensiveFruit = Request(); expensiveFruit.KilogramFiyati = 2_000_000;
await Status(400, () => service.Create(expensiveFruit, ct, ["photo.jpg"]), "Ürünlerde birim fiyat 1 milyon TL'yi aşamaz");
var hay = Request(); hay.Kategori = "Yem"; hay.MeyveTuru = "Yonca balyası"; hay.Cesit = ""; hay.Birim = "balya"; hay.Ambalaj = "Balya";
var hayId = await service.Create(hay, ct, ["balya.jpg"]);
Check(repo.Items[hayId].Birim == "balya" && repo.Items[hayId].Ambalaj == "Balya", "Yem ilanı balya birimiyle verilebilir");
var wrongUnit = Request(); wrongUnit.Birim = "balya";
await Status(400, () => service.Create(wrongUnit, ct, ["photo.jpg"]), "Meyve ilanında balya birimi reddedilir");
var wrongCategory = Request(); wrongCategory.Kategori = "Sebze";
await Status(400, () => service.Create(wrongCategory, ct, ["photo.jpg"]), "Tanımsız kategori reddedilir");
var outside = Request(); outside.Enlem = 51.5m; outside.Boylam = 0.1m;
await Status(400, () => service.Create(outside, ct, ["photo.jpg"]), "Türkiye dışındaki harita konumu reddedilir");
var pinned = Request(); pinned.Enlem = 37.764512m; pinned.Boylam = 30.556789m;
var pinnedId = await service.Create(pinned, ct, ["photo.jpg"]);
Check(repo.Items[pinnedId].Enlem == 37.7645m && repo.Items[pinnedId].Boylam == 30.5568m, "Harita konumu 4 ondalığa yuvarlanır");
await Status(400, () => service.Search(new ListingQuery { Kategori = "Sebze" }, ct), "Tanımsız kategori filtresi reddedilir");
var parsed = SavedSearchFilters.Parse("?kategori=Meyve&meyveTuru=Elma&il=Isparta&maxFiyat=30&evil=1&sort=priceAsc");
Check(parsed.Kategori == "Meyve" && parsed.MeyveTuru == "Elma" && parsed.Il == "Isparta" && parsed.MaxFiyat == 30, "Kayıtlı arama filtreleri ayrıştırılır");
Check(!parsed.Query.Contains("evil") && parsed.Query.Contains("sort=priceAsc"), "Kayıtlı aramada yalnızca bilinen filtreler saklanır");
Check(SavedSearchFilters.Parse("kategori=Sebze").Kategori is null, "Kayıtlı aramada tanımsız kategori yok sayılır");
Check(EngagementService.Price(32.5m, "kg") == "32,50 TL/kg" && EngagementService.Price(4_750_000m, "m2") == "4.750.000 TL", "Bildirim fiyat metni birime göre yazılır");
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
    public Task<long> RecordView(Guid id, Guid? user, CancellationToken ct) => Task.FromResult(0L);
    public Task<IReadOnlyList<CategoryCount>> Categories(CancellationToken ct) =>
        Task.FromResult<IReadOnlyList<CategoryCount>>([]);
    public Task<MapData> Map(MapQuery q, Guid? user, CancellationToken ct) =>
        Task.FromResult(new MapData([], []));
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
    public Task<string> RemovePhoto(Guid id, Guid photoId, CancellationToken ct)
    {
        var list = Photos[id].ToList();
        if (list.Count <= 1) throw new AppException(400, "İlanda en az bir fotoğraf kalmalı.");
        var url = list[0]; list.RemoveAt(0); Photos[id] = list;
        return Task.FromResult(url);
    }
    public Task SetCover(Guid id, Guid photoId, CancellationToken ct) => Task.CompletedTask;
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
 public Task<string?> SetCover(Guid id,string? n,CancellationToken ct)=>Task.FromResult<string?>(null);
 public (string T,int X,int Y,int Z)? Frame;
 public Task SetFrame(Guid id,string t,int x,int y,int z,CancellationToken ct){Frame=(t,x,y,z);return Task.CompletedTask;}
 public List<SellerSearchRow> Rows=[];public string? LastTerm;
 public Task<IReadOnlyList<SellerSearchRow>> Search(string term,Guid? viewer,int take,CancellationToken ct){LastTerm=term;return Task.FromResult<IReadOnlyList<SellerSearchRow>>(Rows.Take(take).ToList());}
}
