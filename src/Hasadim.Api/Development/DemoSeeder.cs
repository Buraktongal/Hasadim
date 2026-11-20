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

    // Türkçe karakter içermez (ı/i, ö/o karışmasın diye).
    public const string UserPassword = "DemoUser2026";
    public const string AdminPassword = "AdminPanel2026";

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

    // Meyve dışındaki kategoriler için örnek ilanlar (25 adet).
    public sealed record Extra(
        string Owner, string Category, string Product, string Unit, string Slug, string City, string[] Districts,
        string[] Varieties, decimal Min, decimal Max, int QtyMin, int QtyMax, int QtyStep, string[] Packaging);

    static readonly Extra[] Extras =
    [
        new("mehmet@hasadim.test", "Tahil", "Buğday", "kg", "bugday", "Konya", ["Karapınar", "Cihanbeyli", "Ereğli"], ["Bezostaya 1", "Tosunbey", "Kunduru 1149 (makarnalık)"], 12, 15.5m, 20, 200, 1000, ["Dökme", "Big bag"]),
        new("mehmet@hasadim.test", "Tahil", "Arpa", "kg", "arpa", "Konya", ["Karapınar", "Ereğli"], ["Larende", "Konevi 98", "Yemlik arpa"], 9, 11.5m, 20, 150, 1000, ["Dökme", "Çuval"]),
        new("mustafa@hasadim.test", "Tahil", "Buğday", "kg", "bugday", "Şanlıurfa", ["Harran", "Siverek"], ["Ceyhan 99", "Pehlivan", "Karakılçık (yerli)"], 12, 15, 30, 250, 1000, ["Dökme", "Big bag"]),
        new("ayse@hasadim.test", "Tahil", "Mısır", "kg", "misir", "Adana", ["Ceyhan", "Kozan"], ["Dane mısır", "Atdişi mısır"], 10, 13, 20, 180, 1000, ["Dökme", "Big bag"]),
        new("mehmet@hasadim.test", "Tahil", "Yulaf", "kg", "yulaf", "Eskişehir", ["Sivrihisar", "Alpu"], ["Seydişehir", "Faikbey", "Yemlik yulaf"], 10, 13, 10, 80, 1000, ["Çuval", "Dökme"]),
        new("mehmet@hasadim.test", "Tahil", "Arpa", "kg", "arpa", "Ankara", ["Polatlı", "Haymana"], ["Bülbül 89", "Tarm-92", "Biralık arpa"], 9.5m, 12, 20, 120, 1000, ["Dökme", "Big bag"]),
        new("mustafa@hasadim.test", "Yem", "Yonca balyası", "balya", "yonca-balyasi", "Malatya", ["Yeşilyurt", "Battalgazi"], ["1. biçim", "2. biçim", "3. biçim"], 280, 420, 5, 50, 100, ["Balya"]),
        new("mehmet@hasadim.test", "Yem", "Saman balyası", "balya", "saman-balyasi", "Konya", ["Cihanbeyli", "Karapınar"], ["Buğday samanı", "Arpa samanı", "Büyük paket saman"], 120, 190, 10, 80, 100, ["Balya"]),
        new("ahmet@hasadim.test", "Yem", "Yonca balyası", "balya", "yonca-balyasi", "Isparta", ["Senirkent", "Gelendost"], ["2. biçim", "3. biçim"], 300, 400, 5, 30, 100, ["Balya"]),
        new("fatma@hasadim.test", "Yem", "Mısır silajı", "kg", "misir-silaji", "Manisa", ["Salihli", "Alaşehir"], ["Paket silaj", "Dökme silaj"], 3, 4.5m, 50, 300, 1000, ["Dökme", "Diğer"]),
        new("fatma@hasadim.test", "Yem", "Fiğ balyası", "balya", "saman-balyasi", "Manisa", ["Sarıgöl", "Salihli"], ["Macar fiği", "Fiğ-arpa karışımı"], 200, 300, 5, 40, 100, ["Balya"]),
        new("ayse@hasadim.test", "Bal", "Bal", "kg", "bal", "Muğla", ["Marmaris", "Ula"], ["Çam balı", "Çiçek balı"], 450, 700, 2, 20, 100, ["Teneke", "Kavanoz"]),
        new("ahmet@hasadim.test", "Bal", "Bal", "kg", "bal", "Isparta", ["Eğirdir", "Yalvaç"], ["Çiçek balı", "Kekik balı", "Karakovan balı"], 500, 850, 1, 10, 100, ["Kavanoz", "Teneke"]),
        new("ayse@hasadim.test", "Bal", "Polen", "kg", "polen", "Mersin", ["Erdemli", "Silifke"], ["Taze polen", "Kurutulmuş polen"], 700, 1000, 1, 5, 50, ["Kavanoz"]),
        new("mustafa@hasadim.test", "Kuruyemis", "Ceviz", "kg", "ceviz", "Malatya", ["Yeşilyurt", "Doğanşehir"], ["Chandler", "Fernor", "Yerli ceviz", "Ceviz içi"], 140, 260, 1, 20, 500, ["Çuval", "Koli"]),
        new("mustafa@hasadim.test", "Kuruyemis", "Kuru kayısı", "kg", "kuru-kayisi", "Malatya", ["Battalgazi", "Yeşilyurt"], ["Gün kurusu", "Kükürtlü (sarı)", "Jumbo boy"], 140, 260, 1, 30, 500, ["Koli", "Çuval"]),
        new("mustafa@hasadim.test", "Kuruyemis", "Antep fıstığı", "kg", "antep-fistigi", "Gaziantep", ["Nizip", "Şehitkamil"], ["Kırmızı (Antep)", "Uzun", "Boz iç"], 450, 650, 1, 15, 500, ["Çuval", "Big bag"]),
        new("mehmet@hasadim.test", "Kuruyemis", "Fındık", "kg", "findik", "Ordu", ["Ünye", "Fatsa"], ["Tombul", "Palaz", "Fındık içi"], 150, 190, 2, 40, 500, ["Çuval", "Big bag"]),
        new("fatma@hasadim.test", "Kuruyemis", "Kuru üzüm", "kg", "kuru-uzum", "Manisa", ["Alaşehir", "Sarıgöl"], ["Sultani çekirdeksiz", "Gün kurusu"], 90, 140, 2, 40, 500, ["Koli", "Çuval"]),
        new("fatma@hasadim.test", "Kuruyemis", "Kestane", "kg", "kestane", "Aydın", ["Nazilli", "Koçarlı"], ["Aydın kestanesi", "Marron"], 80, 140, 1, 10, 500, ["Çuval", "Kasa"]),
        new("ayse@hasadim.test", "Kuruyemis", "Badem", "kg", "badem", "Muğla", ["Ula", "Milas"], ["Ferragnes", "Nonpareil", "Badem içi"], 250, 400, 1, 8, 500, ["Çuval", "Koli"]),
        new("ahmet@hasadim.test", "Arazi", "Meyve bahçesi", "m2", "meyve-bahcesi", "Isparta", ["Eğirdir", "Gelendost"], [], 2_500_000, 6_000_000, 8, 20, 1000, []),
        // Tarla kiralık: fiyat yıllık kira bedelidir.
        new("mehmet@hasadim.test", "Arazi", "Tarla", "m2", "tarla", "Konya", ["Karapınar", "Cihanbeyli"], [], 60_000, 240_000, 20, 80, 1000, []),
        new("fatma@hasadim.test", "Arazi", "Bağ", "m2", "bag", "Manisa", ["Alaşehir", "Sarıgöl"], [], 1_800_000, 4_500_000, 5, 15, 1000, []),
        new("ayse@hasadim.test", "Arazi", "Zeytinlik", "m2", "zeytinlik", "Mersin", ["Silifke", "Erdemli"], [], 2_000_000, 5_000_000, 6, 18, 1000, []),
    ];

    // İl merkezleri (yaklaşık); demo ilanların bir kısmı haritada işaretli gelir.
    static readonly Dictionary<string, (double Lat, double Lon)> Centers = new()
    {
        ["Isparta"] = (37.76, 30.55), ["Mersin"] = (36.80, 34.63), ["Antalya"] = (36.89, 30.71), ["Manisa"] = (38.61, 27.43),
        ["Aydın"] = (37.85, 27.84), ["Malatya"] = (38.35, 38.31), ["Sakarya"] = (40.78, 30.40), ["Bursa"] = (40.19, 29.06),
        ["Niğde"] = (37.97, 34.68), ["Konya"] = (37.87, 32.48), ["Şanlıurfa"] = (37.16, 38.79), ["Adana"] = (37.00, 35.32),
        ["Eskişehir"] = (39.78, 30.52), ["Ankara"] = (39.93, 32.86), ["Muğla"] = (37.22, 28.36), ["Gaziantep"] = (37.07, 37.38),
        ["Ordu"] = (40.98, 37.88),
    };

    const string WipeSql = """
        DELETE dbo.Notifications;
        DELETE dbo.Offers;
        DELETE dbo.SavedSearches;
        DELETE dbo.UserBlocks;
        DELETE dbo.UserSettings;
        DELETE dbo.Messages;
        DELETE dbo.Favorites;
        DELETE dbo.Reports;
        DELETE dbo.ListingStatistics;
        DELETE dbo.ListingPhotos;
        DELETE dbo.Listings;
        DELETE dbo.PhoneChallenges;
        DELETE dbo.UserLogins;
        DELETE dbo.RecoveryCodes;
        DELETE dbo.UserRoles;
        DELETE dbo.UserProfiles;
        DELETE dbo.RegistrationChallenges;
        DELETE dbo.Feedback;
        DELETE dbo.UserSuspensions;
        DELETE dbo.HumanRedemptions;
        DISABLE TRIGGER dbo.TR_AdminAudit_ReadOnly ON dbo.AdminAudit;
        DELETE dbo.AdminAudit;
        ENABLE TRIGGER dbo.TR_AdminAudit_ReadOnly ON dbo.AdminAudit;
        DELETE dbo.MobileTokens;
        DELETE dbo.UserSessions;
        DELETE dbo.LoginEvents;
        DELETE dbo.Users;
        """;

    const string InsertListingSql = """
        INSERT dbo.Listings
            (Id, OwnerId, Baslik, Kategori, Birim, MeyveTuru, Cesit, MiktarKg, KilogramFiyati, OncekiKilogramFiyati, Il, Ilce, Aciklama, Telefon,
             HasatTarihi, OlusturulmaTarihi, Active, Status, PhotoUrl, Ambalaj, Teslimat, MinAlimKg, PublishedAt, ExpiresAt,
             IslemTipi, ImarDurumu, TapuDurumu, Sulama, Ada, Parsel, Elektrik, YolCephesi, Enlem, Boylam)
        VALUES
            (@id, @ownerId, @title, @category, @unit, @fruit, @variety, @quantity, @price, @previous, @city, @district, @description, @phone,
             @harvest, @published, 1, 4, @cover, @packaging, @delivery, @minimum, @published, @expires,
             @deal, @zoning, @deed, @irrigation, @block, @parcel, @electricity, @road, @lat, @lon);
        INSERT dbo.ListingStatistics(ListingId, ViewCount) VALUES(@id, @views);
        """;

    // İlanların yaklaşık %40'ı haritada işaretli gelir (il merkezine 5–25 km).
    static (decimal? Lat, decimal? Lon) Pin(string city, Random random, bool always = false)
    {
        if ((!always && random.Next(5) >= 2) || !Centers.TryGetValue(city, out var c)) return (null, null);
        var angle = random.NextDouble() * Math.PI * 2;
        var distance = 0.05 + random.NextDouble() * 0.2;
        return (Math.Round((decimal)(c.Lat + Math.Sin(angle) * distance * 0.75), 4), Math.Round((decimal)(c.Lon + Math.Cos(angle) * distance), 4));
    }

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
                UPDATE dbo.Users SET CreatedAt = @CreatedAt, PhoneNumber = @Phone, PhoneNumberConfirmed = 1 WHERE Id = @Id;
                """, new
            {
                u.Id, a.AccountType, a.Activity, a.BusinessName, a.City, a.District, a.About, a.Phone,
                CreatedAt = now.AddDays(-random.Next(60, 700))
            }, cancellationToken: ct));
            if (!a.IsAdmin) owners.Add((a, u.Id));
        }

        // 3) 75 meyve ilanı (kullanıcıların bölgesindeki meyvelerden) + 25 diğer kategori ilanı.
        await using (var c = await factory.Open(ct))
        {
            using var tx = c.BeginTransaction();
            var listingIds = new List<(Guid Id, Guid Owner, decimal Price, string Unit, string Title)>();
            for (var i = 0; i < 75; i++)
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
                var (lat, lon) = Pin(region.City, random);
                await c.ExecuteAsync(new CommandDefinition(InsertListingSql, new
                {
                    id, ownerId, title, category = "Meyve", unit = "kg", fruit, variety, quantity, price, previous, city = region.City, district, description,
                    phone = account.Phone, harvest = (DateTime?)published.Date.AddDays(-random.Next(0, 30)), published, cover = photos[0],
                    packaging = (string?)packaging, delivery = (string?)delivery, minimum, expires = published.AddDays(30), views = random.Next(5, 900),
                    deal = (string?)null, zoning = (string?)null, deed = (string?)null, irrigation = (string?)null, block = (string?)null, parcel = (string?)null,
                    electricity = (bool?)null, road = (bool?)null, lat, lon
                }, tx, cancellationToken: ct));
                listingIds.Add((id, ownerId, price, "kg", title));
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

            var tr = new System.Globalization.CultureInfo("tr-TR");
            foreach (var x in Extras)
            {
                var (account, ownerId) = owners.First(o => o.Account.Email == x.Owner);
                var land = x.Category == "Arazi";
                var district = x.Districts[random.Next(x.Districts.Length)];
                var variety = x.Varieties.Length == 0 ? "" : x.Varieties[random.Next(x.Varieties.Length)];
                var quantity = random.Next(x.QtyMin, x.QtyMax + 1) * (decimal)x.QtyStep;
                var price = land
                    ? Math.Round((x.Min + (decimal)random.NextDouble() * (x.Max - x.Min)) / 10_000m) * 10_000m
                    : Math.Round(x.Min + (decimal)random.NextDouble() * (x.Max - x.Min), x.Max >= 100 ? 0 : 1);
                decimal? minimum = land || random.Next(3) == 0 ? null : Math.Max(x.QtyStep, Math.Round(quantity * 0.1m / x.QtyStep) * x.QtyStep);
                var unitText = x.Unit == "balya" ? "balya" : "kg";
                var product = x.Product.ToLower(tr);
                var published = now.AddDays(-random.Next(0, 26)).AddHours(-random.Next(0, 24));
                decimal? previous = !land && random.Next(6) == 0 ? Math.Round(price * 1.08m, x.Max >= 100 ? 0 : 1) : null;
                string title, description;
                if (land)
                {
                    var donum = quantity / 1000m;
                    title = $"{district}'de {(x.Product == "Tarla" ? "kiralık" : "satılık")} {donum.ToString("0.#", tr)} dönüm {product}" + (random.Next(2) == 0 ? ", yola cepheli" : ", sulu");
                    description = $"{x.City} {district}'de {quantity.ToString("N0", tr)} m² ({donum.ToString("0.#", tr)} dönüm) {product}. " +
                                  "Ulaşımı kolay, köy yoluna yakın. " + (x.Product == "Tarla" ? "Yıllık kira, en az 3 yıllık sözleşme." : "Tapu devri hemen yapılabilir.") + "\nAraziyi yerinde görmek için randevu alabilirsiniz. Takas düşünülmez.";
                }
                else
                {
                    var amount = x.Unit == "balya" ? $"{quantity.ToString("N0", tr)} balya" : quantity >= 1000 ? $"{(quantity / 1000m).ToString("0.#", tr)} ton" : $"{quantity.ToString("N0", tr)} kg";
                    title = random.Next(2) == 0 ? $"{district} {variety} {product} — {amount}" : $"{variety} {product}, {x.City} / {district} çıkışlı";
                    description = $"{variety} {product}, {x.City} {district}. Toplam {quantity.ToString("N0", tr)} {unitText}; " +
                                  (minimum is null ? "minimum alım şartı yok." : $"en az {minimum.Value.ToString("N0", tr)} {unitText} alım.") +
                                  $"\n{Payment[random.Next(Payment.Length)]} Numune için depoya gelebilirsiniz.";
                }
                if (title.Length > 150) title = title[..150];
                var id = Guid.NewGuid();
                var photos = new List<string>();
                foreach (var n in Enumerable.Range(1, 3).OrderBy(_ => random.Next()).Take(random.Next(1, 4)))
                {
                    var name = Guid.NewGuid().ToString("N") + ".jpg";
                    File.Copy(Path.Combine(sourcePhotos, $"{x.Slug}-{n}.jpg"), Path.Combine(contentRoot, "App_Data", "photos", name));
                    photos.Add("/api/meyve-ilanlari/photo-file/" + name);
                }
                var (lat, lon) = Pin(x.City, random, always: land);
                await c.ExecuteAsync(new CommandDefinition(InsertListingSql, new
                {
                    id, ownerId, title, category = x.Category, unit = x.Unit, fruit = x.Product, variety, quantity, price, previous,
                    city = x.City, district, description, phone = account.Phone,
                    harvest = land ? (DateTime?)null : published.Date.AddDays(-random.Next(0, 40)), published, cover = photos[0],
                    packaging = land ? null : x.Packaging[random.Next(x.Packaging.Length)], delivery = land ? null : Deliveries[random.Next(Deliveries.Length)],
                    minimum, expires = published.AddDays(30), views = random.Next(5, 900),
                    deal = land ? (x.Product == "Tarla" ? "Kiralik" : "Satilik") : null, zoning = land ? "İmarsız (tarım arazisi)" : null, deed = land ? (random.Next(3) == 0 ? "Hisseli tapu" : "Müstakil tapu") : null,
                    irrigation = land ? new[] { "Sulu", "Kısmen sulu", "Kuru (yağışa bağlı)" }[random.Next(3)] : null,
                    block = land ? random.Next(100, 900).ToString() : null, parcel = land ? random.Next(1, 60).ToString() : null,
                    electricity = land ? random.Next(2) == 0 : (bool?)null, road = land ? random.Next(3) != 0 : (bool?)null, lat, lon
                }, tx, cancellationToken: ct));
                for (var p = 0; p < photos.Count; p++)
                {
                    await c.ExecuteAsync(new CommandDefinition(
                        "INSERT dbo.ListingPhotos(Id, ListingId, Url, SortOrder) VALUES(@pid, @id, @url, @order);",
                        new { pid = Guid.NewGuid(), id, url = photos[p], order = p }, tx, cancellationToken: ct));
                }
                listingIds.Add((id, ownerId, price, x.Unit, title));
            }

            // 4) Örnek teklifler, kayıtlı aramalar ve bildirimler.
            var states = new byte[] { 0, 0, 0, 1, 2, 3, 0, 1 };
            for (var k = 0; k < states.Length; k++)
            {
                var target = listingIds[random.Next(listingIds.Count)];
                var buyer = owners.Where(o => o.Id != target.Owner).OrderBy(_ => random.Next()).First();
                var amount = target.Unit == "m2"
                    ? Math.Round(target.Price * (decimal)(0.85 + random.NextDouble() * 0.12) / 10_000m) * 10_000m
                    : Math.Round(target.Price * (decimal)(0.85 + random.NextDouble() * 0.12), 1);
                decimal? quantity = target.Unit == "m2" ? null : random.Next(1, 20) * (target.Unit == "balya" ? 50m : 500m);
                var created = now.AddHours(-random.Next(2, 96));
                await c.ExecuteAsync(new CommandDefinition("""
                    IF NOT EXISTS(SELECT 1 FROM dbo.Offers WHERE ListingId = @listing AND BuyerId = @buyer AND Status = 0 AND @status = 0)
                    BEGIN
                        INSERT dbo.Offers(Id, ListingId, BuyerId, SellerId, Amount, Quantity, Note, Reply, Status, CreatedAt, RespondedAt)
                        VALUES(NEWID(), @listing, @buyer, @seller, @amount, @quantity, @note, @reply, @status, @created,
                               CASE WHEN @status = 0 THEN NULL ELSE DATEADD(hour, 3, @created) END);
                        IF @status = 0
                            INSERT dbo.Notifications(Id, UserId, Kind, Title, Body, Link, CreatedAt)
                            VALUES(NEWID(), @seller, N'offer-received', N'Yeni teklif', N'"' + @title + N'" ilanına yeni teklif geldi.',
                                   N'/html/tekliflerim.html?kutu=gelen', @created);
                    END
                    """, new
                {
                    listing = target.Id, buyer = buyer.Id, seller = target.Owner, amount, quantity,
                    note = random.Next(2) == 0 ? "Peşin ödeme yapabilirim, nakliyeyi biz ayarlarız." : null,
                    reply = states[k] == 1 ? "Uygundur, yükleme tarihini mesajla konuşalım." : states[k] == 2 ? "Bu fiyata veremiyoruz, teşekkürler." : null,
                    status = states[k], created, title = target.Title.Length > 120 ? target.Title[..120] : target.Title
                }, tx, cancellationToken: ct));
            }
            var ahmet = owners.First(o => o.Account.Email == "ahmet@hasadim.test").Id;
            var ayse = owners.First(o => o.Account.Email == "ayse@hasadim.test").Id;
            await c.ExecuteAsync(new CommandDefinition("""
                INSERT dbo.SavedSearches(Id, UserId, Name, Query, Kategori, MeyveTuru, Il, Notify)
                VALUES(NEWID(), @ahmet, N'Konya buğday', N'kategori=Tahil&meyveTuru=Bu%C4%9Fday&il=Konya', N'Tahil', N'Buğday', N'Konya', 1),
                      (NEWID(), @ahmet, N'Yonca balyası', N'kategori=Yem&meyveTuru=Yonca%20balyas%C4%B1', N'Yem', N'Yonca balyası', NULL, 1),
                      (NEWID(), @ayse, N'Isparta elma · en çok 25 TL', N'kategori=Meyve&meyveTuru=Elma&il=Isparta&maxFiyat=25', N'Meyve', N'Elma', N'Isparta', 1);
                INSERT dbo.Notifications(Id, UserId, Kind, Title, Body, Link, CreatedAt)
                VALUES(NEWID(), @ahmet, N'saved-search', N'Kayıtlı aramana yeni ilan', N'Konya''da yeni buğday ilanı yayına girdi · Arama: “Konya buğday”.',
                       N'/html/index.html?kategori=Tahil&meyveTuru=Bu%C4%9Fday&il=Konya', DATEADD(hour, -5, SYSUTCDATETIME())),
                      (NEWID(), @ayse, N'price-drop', N'Favori ilanda fiyat düştü', N'Favorindeki bir elma ilanının fiyatı düştü.', N'/?view=favorites',
                       DATEADD(hour, -26, SYSUTCDATETIME()));
                """, new { ahmet, ayse }, tx, cancellationToken: ct));
            tx.Commit();
        }
    }
}
