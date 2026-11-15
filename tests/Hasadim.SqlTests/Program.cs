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
        Telefon = "0501 343 10 91", Aciklama = "Test", Ambalaj = "Kasa", Teslimat = "Yerinden teslim", MinAlimKg = 50
    };
    var id = await service.Create(request, default, ["one.jpg", "two.jpg"]);
    var persisted = await repo.Find(id, default) ?? throw new Exception("İlan kaydedilmedi");
    Check(persisted.Active && persisted.Status == ListingStatus.Published, "Gerçek SQL kaydı hemen yayında");
    Check(persisted.Telefon == "05011111111", "SQL ilan telefonu oturum sahibinin profilinden gelir");
    Check(persisted.PublishedAt.HasValue && persisted.ExpiresAt - persisted.PublishedAt == TimeSpan.FromDays(30), "SQL yayın tarihleri tam 30 gün");
    Check((await service.Detail(id, default)).Photos.Count == 2, "İlan ve iki fotoğraf birlikte kaydedildi");
    Check(persisted.Ambalaj=="Kasa" && persisted.Teslimat=="Yerinden teslim" && persisted.MinAlimKg==50,"Ticaret bilgileri SQL kaydına taşınır");
    await sql.ExecuteAsync("UPDATE dbo.Listings SET Status=2,Active=0 WHERE Id=@id",new{id});
    request.Version=(await repo.Find(id,default))!.Version;
    request.Ambalaj="Koli";request.Teslimat="Görüşülür";request.MinAlimKg=25;
    await service.Update(id,request,default);
    var tradeDetail=await service.Detail(id,default);
    Check(tradeDetail.Ambalaj=="Koli" && tradeDetail.Teslimat=="Görüşülür" && tradeDetail.MinAlimKg==25,"Ticaret bilgileri güncellenir ve detayda okunur");
    var publication = tradeDetail.PublishedAt; var expiration = tradeDetail.ExpiresAt;
    request.Version = tradeDetail.Version; request.KilogramFiyati = 15;
    await service.Update(id,request,default);
    var discounted = await service.Detail(id,default);
    Check(discounted.OncekiKilogramFiyati==20 && discounted.KilogramFiyati==15,"Yayındaki fiyat indirimi önceki fiyatla kaydedilir");
    Check(discounted.PublishedAt==publication && discounted.ExpiresAt==expiration && discounted.Active,"Düzenleme yayın süresini sıfırlamaz");
    request.Version=discounted.Version; request.Aciklama="Açıklama güncellendi";
    await service.Update(id,request,default);
    Check((await service.Detail(id,default)).OncekiKilogramFiyati==20,"Fiyat değişmeyen düzenleme indirim bilgisini korur");
    request.Version=(await service.Detail(id,default)).Version; request.KilogramFiyati=18;
    await service.Update(id,request,default);
    Check((await service.Detail(id,default)).OncekiKilogramFiyati is null,"Fiyat artışında indirim etiketi kalkar");
    var versionBeforeViews=(await service.Detail(id,default)).Version;
    Check(await service.RecordView(id,default)==0,"Satıcının kendi görüntülemesi sayılmaz");
    user.Id=null;
    await Task.WhenAll(Enumerable.Range(0,8).Select(_=>service.RecordView(id,default)));
    var stats=await service.Detail(id,default);
    Check(stats.ViewCount==8 && stats.Version.SequenceEqual(versionBeforeViews),"Eşzamanlı görüntülenmeler kaybolmaz ve düzenleme sürümünü değiştirmez");
    user.Id=persisted.OwnerId;
    await repo.Favorite(id,persisted.OwnerId,true,default);
    Check((await service.Detail(id,default)).FavoriteCount==1,"Favori sayısı gerçek kayıtlardan hesaplanır");
    await repo.Favorite(id,persisted.OwnerId,false,default);
    Check((await service.Detail(id,default)).FavoriteCount==0,"Favoriden çıkarma sayıyı düşürür");
    request.MinAlimKg=101;
    try { await service.Create(request,default,["one.jpg"]); throw new Exception("Minimum alım sınırı kabul edildi"); }
    catch(AppException e){Check(e.Status==400,"Ürün miktarını aşan minimum alım sunucuda reddedilir");}
    request.MinAlimKg=25;
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
    await SecurityRegression.Run(config, factory, Check);

    var notifications = new MessageNotifications(factory);
    var sender = persisted.OwnerId;
    var recipient = await sql.ExecuteScalarAsync<Guid>("SELECT TOP(1) Id FROM dbo.Users WHERE Id<>@sender",new{sender});
    var firstMessage = Guid.NewGuid(); var secondMessage = Guid.NewGuid(); var replyMessage = Guid.NewGuid();
    await repo.Send(firstMessage,sender,new MessageRequest{ListingId=id,RecipientId=recipient,Body="Birinci mesaj"},default);
    await repo.Send(secondMessage,sender,new MessageRequest{ListingId=id,RecipientId=recipient,Body="İkinci mesaj"},default);
    await repo.Send(replyMessage,recipient,new MessageRequest{ListingId=id,RecipientId=sender,Body="Yanıt"},default);
    Check((await notifications.State(recipient,default)).UnreadCount==2,"Bildirim sayısı yalnızca gelen okunmamış mesajları içerir");
    await notifications.Read(sender,[firstMessage,secondMessage],default);
    Check((await notifications.State(recipient,default)).UnreadCount==2,"Gönderen karşı tarafın mesajlarını okundu işaretleyemez");
    await notifications.Read(recipient,[firstMessage,replyMessage],default);
    Check((await notifications.State(recipient,default)).UnreadCount==1,"Yalnızca alıcı ve belirtilen mesaj okundu işaretlenir");
    Check((await notifications.State(sender,default)).UnreadCount==1,"Başkasına gelen mesajın okunmamış durumu korunur");
    await notifications.Read(recipient,[firstMessage],default);
    Check((await notifications.State(recipient,default)).UnreadCount==1,"Tekrarlanan okundu isteği sayacı bozmaz");
    await notifications.Read(recipient,[secondMessage],default);
    var notificationState=await notifications.State(recipient,default);
    Check(notificationState.UnreadCount==0&&notificationState.LatestUnreadId is null,"Tüm mesajlar okunduğunda sayaç sıfırlanır");
    Check((await repo.Messages(recipient,1,default)).Where(m=>m.RecipientId==recipient).All(m=>m.ReadAt.HasValue),"Okunma bilgisi mesaj API verisinde kalıcıdır");
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
