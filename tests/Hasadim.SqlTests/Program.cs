using Dapper;
using Hasadim.Application;
using Hasadim.Core;
using Hasadim.Infrastructure.Database;
using Hasadim.Infrastructure.Repositories;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;

// Yalnızca bu çalıştırmaya ait, rastgele adlı LocalDB veritabanını kullanır.
// Uygulama ayarlarını veya gerçek kullanıcı verilerini okumaz.
var database = "Hasadim_Test_" + Guid.NewGuid().ToString("N");
var connection = new SqlConnectionStringBuilder {
    DataSource = @"(localdb)\MSSQLLocalDB", InitialCatalog = database,
    IntegratedSecurity = true, TrustServerCertificate = true
};
var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> {
    ["ConnectionStrings:DefaultConnection"] = connection.ConnectionString
}).Build();
var factory = new SqlConnectionFactory(config);
var checks = 0;
void Check(bool ok, string message) {
    if (!ok) throw new Exception(message);
    checks++; Console.WriteLine("PASS: " + message);
}
try {
    await new MigrationRunner(factory).Run(true);
    var user = new TestUser { Id = Guid.NewGuid() };
    await using var sql = await factory.Open();
    await sql.ExecuteAsync("""
        INSERT dbo.Users(Id,UserName,NormalizedUserName,Email,NormalizedEmail,DisplayName)
        VALUES(@id,'test','TEST','test@example.test','TEST@EXAMPLE.TEST','SQL test');
        INSERT dbo.UserProfiles(UserId) VALUES(@id);
        """, new { id = user.Id });
    var repo = new MarketplaceRepository(factory);
    var service = new MarketplaceService(repo, user);
    var request = new ListingRequest {
        Baslik = "SQL test elma ilanı", MeyveTuru = "Elma", Cesit = "Starking",
        MiktarKg = 100, KilogramFiyati = 20, Il = "Antalya", Ilce = "Korkuteli",
        Telefon = "0501 343 10 91", Aciklama = "Test"
    };
    var id = await service.Create(request, default, ["one.jpg", "two.jpg"]);
    var persisted = await repo.Find(id, default) ?? throw new Exception("İlan kaydedilmedi");
    Check(persisted.Active && persisted.Status == ListingStatus.Published, "Gerçek SQL kaydı hemen yayında");
    Check(persisted.PublishedAt.HasValue && persisted.ExpiresAt - persisted.PublishedAt == TimeSpan.FromDays(30), "SQL yayın tarihleri tam 30 gün");
    Check((await service.Detail(id, default)).Photos.Count == 2, "İlan ve iki fotoğraf birlikte kaydedildi");
    user.Id = null;
    Check((await service.Search(new ListingQuery(), default)).Items.Any(x => x.Id == id), "İlan herkese açık SQL listesinde");
    Check((await service.Detail(id, default)).Status == ListingStatus.Published, "Anonim kullanıcı yeni ilanı görebilir");
    user.Id = persisted.OwnerId;
    var before = await sql.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM dbo.Listings");
    request.MiktarKg = 0;
    try { await service.Create(request, default, ["one.jpg"]); throw new Exception("Geçersiz ilan kabul edildi"); }
    catch (AppException e) { Check(e.Status == 400, "Eksik/geçersiz bilgi kullanıcıya 400 döndürür"); }
    request.MiktarKg = 100;
    try { await service.Create(request, default); throw new Exception("Fotoğrafsız ilan kabul edildi"); }
    catch (AppException e) { Check(e.Status == 400, "Fotoğrafsız ilan kullanıcıya 400 döndürür"); }
    Check(await sql.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM dbo.Listings") == before, "Geçersiz ilanlar kaydedilmedi");
    // İkinci fotoğrafta SQL hatası: ilk fotoğraf ve ilan da geri alınmalı.
    try { await service.Create(request, default, ["one.jpg", new string('x', 1000)]); throw new Exception("SQL hatası bekleniyordu"); }
    catch (SqlException) { }
    Check(await sql.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM dbo.Listings") == before &&
        await sql.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM dbo.ListingPhotos") == 2, "Fotoğraf kayıt hatasında işlem tamamen geri alındı");
    await sql.ExecuteAsync("UPDATE dbo.Listings SET ExpiresAt=DATEADD(second,-1,SYSUTCDATETIME()) WHERE Id=@id", new { id });
    Check(!(await service.Search(new ListingQuery(), default)).Items.Any(x => x.Id == id), "SQL süresi dolan ilanı pazardan çıkarır");
    Check((await service.Search(new ListingQuery { History = true }, default)).Items.Single().Status == ListingStatus.Expired, "SQL geçmiş ilanı sahibine gösterir");
    Console.WriteLine($"ALL {checks} SQL CHECKS PASSED");
} finally {
    SqlConnection.ClearAllPools();
    connection.InitialCatalog = "master";
    await using var master = new SqlConnection(connection.ConnectionString);
    await master.OpenAsync();
    // İsim dışarıdan alınmaz; sadece yukarıda üretilen test veritabanı temizlenir.
    await master.ExecuteAsync($"IF DB_ID(@database) IS NOT NULL BEGIN ALTER DATABASE [{database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [{database}]; END", new { database });
}
class TestUser : ICurrentUser {
    public Guid? Id { get; set; }
    public bool IsAdmin => false;
}
