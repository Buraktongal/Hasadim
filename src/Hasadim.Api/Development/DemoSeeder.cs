using Dapper;
using Hasadim.Infrastructure.Database;
using Hasadim.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;

namespace Hasadim.Api.Development;

// Yalnızca geliştirme ortamı için demo verisi.
// UYARI: Çalıştırıldığında TÜM kullanıcıları, ilanları, mesajları, favorileri,
// şikâyetleri ve yüklenmiş fotoğrafları siler; ardından 5 kullanıcı, 1 yönetici
// ve 100 rastgele ilan oluşturur. Komut: dotnet run --project src/Hasadim.Api -- --seed-demo
public static class DemoSeeder
{
    public sealed record Region(string Fruit, string City, string[] Districts);

    public sealed record DemoAccount(
        string Email, string Password, string DisplayName, string Phone,
        string City, string District, string AccountType, string Activity,
        string BusinessName, string About, bool IsAdmin, Region[] Regions);

    public const string UserPassword = "Hasadim2026Demo";
    public const string AdminPassword = "Hasadim2026Yonetim";

    public static readonly DemoAccount[] Accounts =
    [
        new("yonetici@hasadim.test", AdminPassword, "Hasadım Yönetim", "05320000000",
            "Ankara", "Çankaya", "Individual", "Other", "", "Hasadım yönetim hesabı.", true, []),
        new("ahmet@hasadim.test", UserPassword, "Ahmet Yılmaz", "05321112201",
            "Isparta", "Eğirdir", "Individual", "Producer", "",
            "Eğirdir’de 25 yıldır elma ve kiraz yetiştiriyorum. Soğuk hava deposu ve tır yüklemesi var.", false,
            [
                new("Elma", "Isparta", ["Eğirdir", "Gelendost", "Yalvaç", "Senirkent"]),
                new("Armut", "Isparta", ["Eğirdir", "Gelendost"]),
                new("Kiraz", "Isparta", ["Eğirdir", "Yalvaç"]),
                new("Vişne", "Isparta", ["Senirkent", "Yalvaç"]),
                new("Elma", "Niğde", ["Merkez", "Bor"]),
            ]),
        new("ayse@hasadim.test", UserPassword, "Ayşe Demir", "05321112202",
            "Mersin", "Erdemli", "Individual", "Producer", "",
            "Erdemli’de narenciye ve çilek bahçelerimiz var. Toptan alıcılara bahçeden teslim ediyoruz.", false,
            [
                new("Limon", "Mersin", ["Erdemli", "Silifke"]),
                new("Portakal", "Mersin", ["Erdemli", "Tarsus"]),
                new("Mandalina", "Mersin", ["Erdemli", "Silifke"]),
                new("Greyfurt", "Mersin", ["Erdemli", "Tarsus"]),
                new("Çilek", "Mersin", ["Silifke", "Tarsus"]),
                new("Muz", "Mersin", ["Anamur"]),
            ]),
        new("mehmet@hasadim.test", UserPassword, "Mehmet Kaya", "05321112203",
            "Antalya", "Korkuteli", "Business", "Trader", "Kaya Tarım Ürünleri",
            "Antalya ve çevresinden toptan meyve alım satımı yapıyoruz. Kendi araçlarımızla teslimat.", false,
            [
                new("Armut", "Antalya", ["Korkuteli", "Elmalı"]),
                new("Elma", "Antalya", ["Elmalı", "Korkuteli"]),
                new("Nar", "Antalya", ["Serik", "Kumluca"]),
                new("Avokado", "Antalya", ["Alanya", "Finike"]),
                new("Şeftali", "Antalya", ["Korkuteli"]),
                new("Nektarin", "Antalya", ["Korkuteli", "Serik"]),
                new("Erik", "Antalya", ["Korkuteli", "Elmalı"]),
            ]),
        new("fatma@hasadim.test", UserPassword, "Fatma Çelik", "05321112204",
            "Manisa", "Alaşehir", "Business", "Cooperative", "Alaşehir Bağcılar Kooperatifi",
            "Kooperatif olarak üyelerimizin üzüm, kiraz ve incir ürününü toplu satıyoruz.", false,
            [
                new("Üzüm", "Manisa", ["Alaşehir", "Sarıgöl", "Salihli", "Turgutlu"]),
                new("Kiraz", "Manisa", ["Salihli", "Turgutlu"]),
                new("Şeftali", "Manisa", ["Salihli"]),
                new("İncir", "Aydın", ["Germencik", "İncirliova", "Nazilli"]),
                new("Karpuz", "Manisa", ["Salihli"]),
                new("Kavun", "Manisa", ["Alaşehir", "Salihli"]),
            ]),
        new("mustafa@hasadim.test", UserPassword, "Mustafa Şahin", "05321112205",
            "Malatya", "Yeşilyurt", "Business", "Trader", "Şahin Yaş Meyve",
            "Kayısı başta olmak üzere yaş meyve toplayıp marketlere ve ihracatçılara satıyoruz.", false,
            [
                new("Kayısı", "Malatya", ["Yeşilyurt", "Battalgazi", "Doğanşehir"]),
                new("Ayva", "Sakarya", ["Akyazı", "Hendek"]),
                new("Kivi", "Sakarya", ["Akyazı", "Hendek"]),
                new("Yaban mersini", "Sakarya", ["Hendek"]),
                new("Ahududu", "Bursa", ["Mustafakemalpaşa", "İnegöl"]),
                new("Böğürtlen", "Bursa", ["İnegöl"]),
                new("Dut", "Malatya", ["Battalgazi"]),
                new("Trabzon hurması", "Bursa", ["Orhangazi"]),
            ]),
    ];

    static readonly Dictionary<string, string[]> Varieties = new()
    {
        ["Elma"] = ["Starking Delicious", "Golden Delicious", "Granny Smith", "Gala", "Fuji", "Scarlet Spur", "Red Chief", "Amasya"],
        ["Armut"] = ["Deveci", "Santa Maria", "Ankara", "Williams", "Abate Fetel"],
        ["Kiraz"] = ["0900 Ziraat", "Regina", "Kordia", "Napolyon"],
        ["Vişne"] = ["Kütahya", "Montmorency", "Erdi Botermo"],
        ["Limon"] = ["Interdonato", "Lamas", "Kütdiken", "Enterdonat"],
        ["Portakal"] = ["Washington Navel", "Valencia", "Yafa", "Navelina"],
        ["Mandalina"] = ["Satsuma", "Clementine", "Nova", "W. Murcott", "Okitsu"],
        ["Greyfurt"] = ["Star Ruby", "Rio Red", "Marsh Seedless"],
        ["Çilek"] = ["Albion", "San Andreas", "Camarosa", "Rubygem"],
        ["Muz"] = ["Dwarf Cavendish", "Grand Nain", "Azman"],
        ["Nar"] = ["Hicaznar", "Wonderful", "Silifke Aşısı"],
        ["Avokado"] = ["Hass", "Fuerte", "Bacon", "Ettinger"],
        ["Şeftali"] = ["Redhaven", "Cresthaven", "J.H. Hale", "Glohaven"],
        ["Nektarin"] = ["Fantasia", "Venus", "Big Top"],
        ["Erik"] = ["Papaz", "Can", "Black Diamond", "Stanley"],
        ["Üzüm"] = ["Sultani Çekirdeksiz", "Red Globe", "Crimson Seedless", "Superior Seedless", "Yalova İncisi"],
        ["İncir"] = ["Sarılop", "Bursa Siyahı", "Göklop"],
        ["Karpuz"] = ["Crimson Sweet", "Starbrite", "Sugar Baby"],
        ["Kavun"] = ["Kırkağaç", "Hasanbey", "Galia", "Topatan"],
        ["Kayısı"] = ["Hacıhaliloğlu", "Kabaaşı", "Çataloğlu", "Soğancı"],
        ["Ayva"] = ["Ekmek", "Eşme", "Şeker"],
        ["Kivi"] = ["Hayward", "Matua"],
        ["Yaban mersini"] = ["Bluecrop", "Duke", "Legacy"],
        ["Ahududu"] = ["Heritage", "Tulameen", "Polka"],
        ["Böğürtlen"] = ["Chester", "Loch Ness", "Navaho"],
        ["Dut"] = ["Beyaz dut", "Kara dut"],
        ["Trabzon hurması"] = ["Fuyu", "Hachiya", "Rojo Brillante"],
    };

    // TL/kg fiyat aralıkları (yaklaşık, demo amaçlı).
    static readonly Dictionary<string, (decimal Min, decimal Max)> Prices = new()
    {
        ["Elma"] = (14, 32), ["Armut"] = (24, 45), ["Kiraz"] = (60, 150), ["Vişne"] = (30, 60),
        ["Limon"] = (12, 26), ["Portakal"] = (10, 20), ["Mandalina"] = (10, 22), ["Greyfurt"] = (12, 22),
        ["Çilek"] = (50, 120), ["Muz"] = (40, 70), ["Nar"] = (15, 35), ["Avokado"] = (60, 120),
        ["Şeftali"] = (25, 50), ["Nektarin"] = (30, 55), ["Erik"] = (25, 50), ["Üzüm"] = (25, 60),
        ["İncir"] = (50, 120), ["Karpuz"] = (6, 15), ["Kavun"] = (10, 25), ["Kayısı"] = (40, 90),
        ["Ayva"] = (20, 40), ["Kivi"] = (30, 60), ["Yaban mersini"] = (250, 450), ["Ahududu"] = (150, 300),
        ["Böğürtlen"] = (120, 250), ["Dut"] = (60, 120), ["Trabzon hurması"] = (25, 50),
    };

    static readonly Dictionary<string, string> PhotoSlugs = new()
    {
        ["Elma"] = "elma", ["Armut"] = "armut", ["Ayva"] = "ayva", ["Portakal"] = "portakal", ["Mandalina"] = "mandalina",
        ["Limon"] = "limon", ["Greyfurt"] = "greyfurt", ["Üzüm"] = "uzum", ["Kiraz"] = "kiraz", ["Vişne"] = "visne",
        ["Şeftali"] = "seftali", ["Nektarin"] = "nektarin", ["Kayısı"] = "kayisi", ["Erik"] = "erik", ["Nar"] = "nar",
        ["Çilek"] = "cilek", ["Ahududu"] = "ahududu", ["Böğürtlen"] = "bogurtlen", ["Yaban mersini"] = "yaban-mersini",
        ["Dut"] = "dut", ["Karpuz"] = "karpuz", ["Kavun"] = "kavun", ["Muz"] = "muz", ["İncir"] = "incir",
        ["Trabzon hurması"] = "trabzon-hurmasi", ["Avokado"] = "avokado", ["Kivi"] = "kivi",
    };

    static readonly string[] Qualities = ["1. sınıf", "ihracat kalitesi", "kalibreli", "seçme", "sofralık", "market tipi", "toptan"];
    static readonly string[] Packagings = ["Kasa", "Koli", "Dökme", "Çuval"];
    static readonly string[] Deliveries = ["Yerinden teslim", "Satıcı teslimatı", "Görüşülür"];
    static readonly string[] Storage = ["Soğuk hava deposunda bekletiliyor.", "Dalından taze kesim yapılır.", "Hasat devam ediyor, sipariş üzerine toplanır.", "Depodan hemen yüklemeye hazır."];
    static readonly string[] Payment = ["Ödeme yükleme öncesi peşin.", "Ödeme yarısı peşin, kalanı teslimde.", "Ödeme koşulları görüşülür.", "Kurumsal alıcılara faturalı satış yapılır."];

    const string WipeSql = """
        DELETE dbo.Messages;
        DELETE dbo.Favorites;
        DELETE dbo.Reports;
        DELETE dbo.ListingStatistics;
        DELETE dbo.ListingPhotos;
        DELETE dbo.Listings;
        DELETE dbo.RecoveryCodes;
        DELETE dbo.UserRoles;
        DELETE dbo.UserProfiles;
        DELETE dbo.RegistrationChallenges;
        DELETE dbo.Users;
        """;

    public static async Task Run(IServiceProvider services, string contentRoot, CancellationToken ct)
    {
        var factory = services.GetRequiredService<SqlConnectionFactory>();
        var users = services.GetRequiredService<UserManager<AppUser>>();
        var roles = services.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
        var random = new Random(2026);
        var now = DateTime.UtcNow;

        var sourcePhotos = new[] { Path.Combine(AppContext.BaseDirectory, "SeedData", "photos"), Path.Combine(contentRoot, "SeedData", "photos") }
            .FirstOrDefault(Directory.Exists) ?? throw new InvalidOperationException("SeedData/photos klasörü bulunamadı.");

        // 1) Eski verileri sil (tek işlem).
        await using (var c = await factory.Open(ct))
        {
            using var tx = c.BeginTransaction();
            await c.ExecuteAsync(new CommandDefinition(WipeSql, transaction: tx, commandTimeout: 120, cancellationToken: ct));
            tx.Commit();
        }
        foreach (var folder in new[] { "photos", "profiles" })
        {
            var path = Path.Combine(contentRoot, "App_Data", folder);
            Directory.CreateDirectory(path);
            foreach (var file in Directory.EnumerateFiles(path)) File.Delete(file);
        }

        // 2) Hesaplar.
        if (!await roles.RoleExistsAsync("Admin"))
        {
            var created = await roles.CreateAsync(new IdentityRole<Guid> { Id = Guid.NewGuid(), Name = "Admin" });
            if (!created.Succeeded) throw new InvalidOperationException("Admin rolü oluşturulamadı.");
        }
        var owners = new List<(DemoAccount Account, Guid Id)>();
        foreach (var a in Accounts)
        {
            var u = new AppUser { UserName = a.Email, Email = a.Email, DisplayName = a.DisplayName, EmailConfirmed = true, PhoneNumber = a.Phone };
            var result = await users.CreateAsync(u, a.Password);
            if (!result.Succeeded) throw new InvalidOperationException(a.Email + ": " + string.Join(" ", result.Errors.Select(e => e.Description)));
            if (a.IsAdmin)
            {
                var role = await users.AddToRoleAsync(u, "Admin");
                if (!role.Succeeded) throw new InvalidOperationException("Yönetici rolü atanamadı.");
            }
            await using var c = await factory.Open(ct);
            await c.ExecuteAsync(new CommandDefinition("""
                UPDATE dbo.UserProfiles
                SET AccountType = @AccountType, Activity = @Activity, BusinessName = @BusinessName,
                    City = @City, District = @District, About = @About, Phone = @Phone, ShowPhone = 1
                WHERE UserId = @Id;
                UPDATE dbo.Users SET CreatedAt = @CreatedAt WHERE Id = @Id;
                """, new
            {
                u.Id, a.AccountType, a.Activity, a.BusinessName, a.City, a.District, a.About, a.Phone,
                CreatedAt = now.AddDays(-random.Next(60, 700))
            }, cancellationToken: ct));
            if (!a.IsAdmin) owners.Add((a, u.Id));
        }

        // 3) 100 ilan: her kullanıcıya 20 ilan, kendi bölgesindeki meyvelerden.
        await using (var c = await factory.Open(ct))
        {
            using var tx = c.BeginTransaction();
            for (var i = 0; i < 100; i++)
            {
                var (account, ownerId) = owners[i % owners.Count];
                var region = account.Regions[random.Next(account.Regions.Length)];
                var fruit = region.Fruit;
                var district = region.Districts[random.Next(region.Districts.Length)];
                var variety = Varieties[fruit][random.Next(Varieties[fruit].Length)];
                var (min, max) = Prices[fruit];
                var price = Math.Round(min + (decimal)random.NextDouble() * (max - min), 1);
                var berry = fruit is "Yaban mersini" or "Ahududu" or "Böğürtlen" or "Dut" or "Çilek" or "Kiraz";
                var quantity = berry ? random.Next(5, 80) * 100m : random.Next(5, 150) * 1000m;
                decimal? minimum = random.Next(4) == 0 ? null : Math.Round(quantity * (decimal)(0.05 + random.NextDouble() * 0.2) / 100m) * 100m;
                if (minimum is <= 0) minimum = 100;
                var quality = Qualities[random.Next(Qualities.Length)];
                var packaging = Packagings[random.Next(Packagings.Length)];
                var delivery = Deliveries[random.Next(Deliveries.Length)];
                var published = now.AddDays(-random.Next(0, 26)).AddHours(-random.Next(0, 24)).AddMinutes(-random.Next(0, 60));
                decimal? previous = random.Next(8) == 0 ? Math.Round(price * (decimal)(1.05 + random.NextDouble() * 0.12), 1) : null;
                var title = random.Next(3) switch
                {
                    0 => $"{district} {variety} {fruit.ToLower(new System.Globalization.CultureInfo("tr-TR"))} — {quality}",
                    1 => $"{quality[..1].ToUpper()}{quality[1..]} {fruit.ToLower(new System.Globalization.CultureInfo("tr-TR"))}, {variety}, {packaging.ToLower(new System.Globalization.CultureInfo("tr-TR"))}",
                    _ => $"{variety} {fruit.ToLower(new System.Globalization.CultureInfo("tr-TR"))} · {region.City} / {district} çıkışlı",
                };
                if (title.Length > 150) title = title[..150];
                var description = $"{variety} çeşidi {fruit.ToLower(new System.Globalization.CultureInfo("tr-TR"))}, {quality}. {Storage[random.Next(Storage.Length)]}\n" +
                                  $"Toplam {quantity:N0} kg ürün var; {(minimum is null ? "minimum alım şartı yok" : $"en az {minimum:N0} kg alım")}. Ambalaj: {packaging.ToLower(new System.Globalization.CultureInfo("tr-TR"))}.\n" +
                                  $"{Payment[random.Next(Payment.Length)]} Numune için bahçeye/depoya gelebilirsiniz.";
                var id = Guid.NewGuid();
                var photoCount = random.Next(1, 4);
                var photos = new List<string>();
                var slug = PhotoSlugs[fruit];
                foreach (var n in Enumerable.Range(1, 3).OrderBy(_ => random.Next()).Take(photoCount))
                {
                    var name = Guid.NewGuid().ToString("N") + ".jpg";
                    File.Copy(Path.Combine(sourcePhotos, $"{slug}-{n}.jpg"), Path.Combine(contentRoot, "App_Data", "photos", name));
                    photos.Add("/api/meyve-ilanlari/photo-file/" + name);
                }
                await c.ExecuteAsync(new CommandDefinition("""
                    INSERT dbo.Listings
                        (Id, OwnerId, Baslik, MeyveTuru, Cesit, MiktarKg, KilogramFiyati, OncekiKilogramFiyati, Il, Ilce, Aciklama, Telefon,
                         HasatTarihi, OlusturulmaTarihi, Active, Status, PhotoUrl, Ambalaj, Teslimat, MinAlimKg, PublishedAt, ExpiresAt)
                    VALUES
                        (@id, @ownerId, @title, @fruit, @variety, @quantity, @price, @previous, @city, @district, @description, @phone,
                         @harvest, @published, 1, 4, @cover, @packaging, @delivery, @minimum, @published, @expires);
                    INSERT dbo.ListingStatistics(ListingId, ViewCount) VALUES(@id, @views);
                    """, new
                {
                    id, ownerId, title, fruit, variety, quantity, price, previous, city = region.City, district, description,
                    phone = account.Phone, harvest = published.Date.AddDays(-random.Next(0, 30)), published, cover = photos[0],
                    packaging, delivery, minimum, expires = published.AddDays(30), views = random.Next(5, 900)
                }, tx, cancellationToken: ct));
                for (var p = 0; p < photos.Count; p++)
                {
                    await c.ExecuteAsync(new CommandDefinition(
                        "INSERT dbo.ListingPhotos(Id, ListingId, Url, SortOrder) VALUES(@pid, @id, @url, @order);",
                        new { pid = Guid.NewGuid(), id, url = photos[p], order = p }, tx, cancellationToken: ct));
                }
                // Diğer kullanıcılardan birkaç favori.
                foreach (var (_, fan) in owners.Where(o => o.Id != ownerId).OrderBy(_ => random.Next()).Take(random.Next(0, 3)))
                {
                    await c.ExecuteAsync(new CommandDefinition(
                        "INSERT dbo.Favorites(UserId, ListingId) VALUES(@fan, @id);", new { fan, id }, tx, cancellationToken: ct));
                }
            }
            tx.Commit();
        }
    }
}
