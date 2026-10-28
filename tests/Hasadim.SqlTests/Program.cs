using Dapper;
using Hasadim.Application;
using Hasadim.Core;
using Hasadim.Infrastructure.Database;
using Hasadim.Infrastructure.Repositories;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity;
using Hasadim.Infrastructure.Identity;

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
        INSERT dbo.UserProfiles(UserId,Phone) VALUES(@id,'05011111111');
        """, new { id = user.Id });
    var repo = new MarketplaceRepository(factory);
    var service = new MarketplaceService(repo, user, new ProfileRepository(factory));
    var request = new ListingRequest {
        Baslik = "SQL test elma ilanı", MeyveTuru = "Elma", Cesit = "Starking",
        MiktarKg = 100, KilogramFiyati = 20, Il = "Antalya", Ilce = "Korkuteli",
        Telefon = "0501 343 10 91", Aciklama = "Test"
    };
    var id = await service.Create(request, default, ["one.jpg", "two.jpg"]);
    var persisted = await repo.Find(id, default) ?? throw new Exception("İlan kaydedilmedi");
    Check(persisted.Active && persisted.Status == ListingStatus.Published, "Gerçek SQL kaydı hemen yayında");
    Check(persisted.Telefon == "05011111111", "SQL ilan telefonu oturum sahibinin profilinden gelir");
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
    var registrations = new RegistrationStore(factory, new EphemeralDataProtectionProvider());
    AppUser NewUser(string email) => new() {
        UserName = email, NormalizedUserName = email.ToUpperInvariant(), Email = email,
        NormalizedEmail = email.ToUpperInvariant(), DisplayName = "Code test", PhoneNumber = "05011111111",
        PasswordHash = new PasswordHasher<AppUser>().HashPassword(new AppUser(), "OnlyForTests123!")
    };
    async Task Reject(int expected, Func<Task> action, string name) {
        try { await action(); throw new Exception("Expected rejection: " + name); }
        catch (AppException e) { Check(e.Status == expected, name); }
    }
    var draft = NewUser("registration@example.test");
    var ticket = await registrations.Start(draft, default);
    Check(System.Text.RegularExpressions.Regex.IsMatch(ticket.Code, "^[0-9]{6}$"), "Kayıt kodu altı rakam");
    Check(await sql.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM dbo.Users WHERE Id=@Id", draft) == 0, "Kod gönderimi hesap oluşturmaz");
    Check(await sql.ExecuteScalarAsync<int>("SELECT DATEDIFF(second,LastSentAt,ExpiresAt) FROM dbo.RegistrationChallenges WHERE Id=@Id", ticket) == 120, "Kodun SQL süresi tam 120 saniye");
    var protectedData = await sql.ExecuteScalarAsync<string>("SELECT ProtectedData FROM dbo.RegistrationChallenges WHERE Id=@Id", ticket);
    Check(!protectedData!.Contains(draft.Email!) && !protectedData.Contains(draft.PasswordHash!), "Bekleyen kayıt içeriği korumalı saklanır");
    await Reject(429, () => registrations.Start(draft, default), "Hızlı tekrar gönderim engellenir");
    var wrong = ticket.Code == "000000" ? "111111" : "000000";
    await Reject(400, () => registrations.Complete(ticket.Id, wrong, default), "Yanlış kod hesap açmaz");
    Check(await sql.ExecuteScalarAsync<int>("SELECT Attempts FROM dbo.RegistrationChallenges WHERE Id=@Id", ticket) == 1, "Yanlış deneme SQL üzerinde sayılır");
    await registrations.Complete(ticket.Id, ticket.Code, default);
    var created = await sql.QuerySingleAsync<AppUser>("SELECT * FROM dbo.Users WHERE Id=@Id", draft);
    Check(created.EmailConfirmed && !created.PhoneNumberConfirmed, "Doğru kod yalnızca e-postayı doğrular");
    Check(new PasswordHasher<AppUser>().VerifyHashedPassword(created, created.PasswordHash!, "OnlyForTests123!") != PasswordVerificationResult.Failed, "Hesap şifresi doğrulanabilir özet olarak saklanır");
    Check(await sql.ExecuteScalarAsync<string>("SELECT Phone FROM dbo.UserProfiles WHERE UserId=@Id", draft) == draft.PhoneNumber, "Kayıt telefonu profile taşınır");
    await Reject(400, () => registrations.Complete(ticket.Id, ticket.Code, default), "Kod ikinci kez kullanılamaz");
    var expired = await registrations.Start(NewUser("expired@example.test"), default);
    await sql.ExecuteAsync("UPDATE dbo.RegistrationChallenges SET ExpiresAt=SYSUTCDATETIME() WHERE Id=@Id", expired);
    await Reject(400, () => registrations.Complete(expired.Id, expired.Code, default), "Süresi dolan doğru kod reddedilir");
    var limited = await registrations.Start(NewUser("limited@example.test"), default);
    wrong = limited.Code == "000000" ? "111111" : "000000";
    for (var i = 0; i < 5; i++) await Reject(400, () => registrations.Complete(limited.Id, wrong, default), "Hatalı kod sınırı " + (i + 1));
    await Reject(400, () => registrations.Complete(limited.Id, limited.Code, default), "Beş yanlış deneme sonrasında doğru kod da reddedilir");
    var resendUser = NewUser("resend@example.test");
    var oldTicket = await registrations.Start(resendUser, default);
    await sql.ExecuteAsync("UPDATE dbo.RegistrationChallenges SET LastSentAt=DATEADD(second,-61,LastSentAt) WHERE Id=@Id", oldTicket);
    var newTicket = await registrations.Start(resendUser, default);
    await Reject(400, () => registrations.Complete(oldTicket.Id, oldTicket.Code, default), "Yeni gönderim önceki kodu geçersiz kılar");
    await registrations.Cancel(newTicket.Id, default);
    await Reject(400, () => registrations.Complete(newTicket.Id, newTicket.Code, default), "E-posta gönderimi başarısızsa kod geçersizdir");
    var concurrent = await registrations.Start(NewUser("parallel@example.test"), default);
    async Task<bool> CompleteOnce() { try { await registrations.Complete(concurrent.Id, concurrent.Code, default); return true; } catch (AppException e) when(e.Status==400) { return false; } }
    Check((await Task.WhenAll(CompleteOnce(), CompleteOnce())).Count(x => x) == 1, "Eşzamanlı doğrulama yalnızca bir kez hesap açar");
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
