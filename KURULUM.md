# Hasadım — .NET 10, katmanlı API + Web

Bu paket, UstamYolda projesindeki Core / Infrastructure / DependencyInjection ayrımı temel alınarak yeniden yazılmış Hasadım kaynak çözümüdür. Application ve ayrı API eklenmiştir. Dapper kullanır; EF Core bağımlılığı yoktur. Web ayrı çalışır. Mobil uygulama bu pakete dahil değildir.

Mevcut kurulum için önce **GUNCELLEME.md** dosyasını oku; veritabanını ve App_Data içeriğini koru.

## 1. İlk çalıştırma

1. ZIP'i **yeni bir klasöre çıkar**. Eski projeyi değiştirme.
2. Visual Studio 2026, ASP.NET ve web geliştirme iş yükü, .NET 10 SDK ve SQL Server LocalDB kurulu olsun.
3. Eski Hasadım uygulamasını durdur; web portu yine 7106'dır.
4. **BASLAT.bat** dosyasına çift tıkla. HTTPS geliştirme sertifikasının güvenilir olmasını onayla. NuGet paketleri için ilk sefer internet gerekir.
5. API ve Web için iki konsol açılır. **İkisinde de `Now listening on` görünmesini bekle.**
6. Tarayıcıda **https://localhost:7106** adresini aç.
7. Giriş yap → Hesap oluştur. İlk kurulumda kullanıcı veya örnek ilan bulunmaz.
8. Kendi şifreni belirle: en az 12 karakter, büyük harf, küçük harf, rakam. Hesap oluşturduktan sonra ayrı giriş sayfasından giriş yap.
9. “İlan ver” ile peş peşe birkaç ilan oluşturabilirsin. Her ilan farklı GUID alır.

Konsolları kapatırsan uygulamalar durur. Durdurmak için her konsolda Ctrl+C kullan.

### Visual Studio ile

`Hasadim.slnx` dosyasını aç. Çözüme sağ tık → başlangıç projelerini yapılandır → birden fazla başlangıç projesi. **Hasadim.Api** ve **Hasadim.Web** için Başlat seç. Diğer projeleri başlatma. İlgili HTTPS proje profillerini kullan. Ctrl+F5 ile çalıştır.

Alternatif: iki terminalde aşağıdaki komutları çalıştır:

```powershell
dotnet run --project src/Hasadim.Api --launch-profile Hasadim.Api
```

```powershell
dotnet run --project src/Hasadim.Web --launch-profile Hasadim.Web
```

## 2. Veritabanı ve migration

- SQL Server: `(localdb)\MSSQLLocalDB`
- Yeni veritabanı: **HasadimCleanDb**
- Geliştirme ortamında API ilk başladığında veritabanını ve tabloları oluşturur; sonraki başlangıçlarda yalnızca yeni migration'ları uygular.
- Eski **HasadimDb** ve **HasadimAppDb** veritabanlarına dokunmaz. Eski kayıtları otomatik taşımaz.
- Tüm kullanıcı, rol, ilan, mesaj ve şikâyet kimlikleri `uniqueidentifier` / C# `Guid` türündedir. OwnerId üzerinde benzersizlik kısıtı yoktur.
- Migration'lar `src/Hasadim.Infrastructure/Migrations` içinde sıralı SQL dosyalarıdır. `SchemaVersions` tablosunda uygulanan dosyanın adı ve SHA-256 özeti tutulur.
- Migration işlemi transaction ve SQL uygulama kilidi kullanır. Önceden uygulanmış SQL dosyasını değiştirme; yeni `004_...sql` dosyası ekle.
- Elle çalıştırmak için **VERITABANI-GUNCELLE.bat** dosyasını kullan.

**`Add-Migration` ve `Update-Database` bu projede kullanılmaz.** Bunlar EF Core araçlarıdır. Bu projede Dapper ve SQL migration çalıştırıcısı vardır.

Production'da veritabanını DBA oluşturmalı ve deployment sırasında ayrı işlemle migration uygulanmalıdır:

```powershell
dotnet Hasadim.Api.dll --migrate
```

Production normal başlangıcında şema değişikliği yapılmaz. Migration bağlantısı ile uygulama bağlantısının yetkilerini canlı ortamda ayır.

## 3. Ayrı giriş ve hesap sayfaları

- `/giris.html`: e-posta / şifre, gerektiğinde ikinci faktör veya kurtarma kodu.
- `/kayit.html`: kayıt.
- `/hesabim.html`: şifre değiştirme, iki adımlı doğrulama, bütün oturumları kapatma.
- `/sifremi-unuttum.html`: şifre sıfırlama ve doğrulama e-postasını tekrar gönderme.
- E-posta bağlantıları: `/sifre-yenile.html`, `/eposta-dogrula.html`.

İki adımlı doğrulamayı açmak için Hesabım sayfasında mevcut şifreni gir. Verilen anahtarı bir TOTP doğrulayıcı uygulamasına elle ekle; tür zamana dayalı olmalı. Gelen altı haneli kodu gir. Gösterilen **10 tek kullanımlık kurtarma kodunu sakla**. Anahtarı veya kodları başkalarıyla paylaşma. Bu sürümde 2FA kapatma/yeniden kurma arayüzü yoktur; cihaz kaybında kurtarma koduyla giriş yapılır. Kurtarma kodları da kaybolursa otomatik 2FA atlatma yolu bulunmaz.

## 4. E-posta ayarları

Yerel geliştirmede SMTP zorunlu değildir ve `Identity:RequireConfirmedEmail=false` ayarlıdır. Bu modda yeni hesap giriş yapabilir; bu, e-postanın doğrulandığı anlamına gelmez. E-posta gönderimi yapılandırılmamışsa şifre yenileme e-postası da gönderilemez.

Production'da doğrulanmış e-posta zorunludur; SMTP host eksikse API normal çalışmayı reddeder. API projesine sağ tık → **Kullanıcı Gizli Dizilerini Yönet** ile geliştirme SMTP ayarlarını ekle:

```json
{
  "Identity": { "RequireConfirmedEmail": true },
  "Mail": {
    "Host": "SMTP-SUNUCUN",
    "Port": 587,
    "User": "SMTP-KULLANICIN",
    "Password": "SMTP-SIFREN",
    "From": "gonderici@alanadin.com"
  },
  "Web": { "PublicOrigin": "https://localhost:7106" }
}
```

SMTP uygulaması TLS/STARTTLS kullanır. Sağlayıcının SMTP erişimine izin vermesi gerekir. Buradaki değerler örnektir. Gerçek şifreleri appsettings.json'a veya GitHub'a yazma. Production'da Secret Manager / ortam değişkenleri kullan; User Secrets otomatik olarak yalnızca geliştirme ortamında yüklenir. E-posta gönderimi bu ortamda gerçek bir sağlayıcıyla test edilmedi.

## 5. Yönetici hesabı

Hazır yönetici hesabı veya ortak parola yoktur. API User Secrets içine daha önce kaydedilmemiş bir e-posta ve güçlü şifre ekle:

```json
{
  "BootstrapAdmin": {
    "Email": "yonetici@alanadin.com",
    "Password": "KENDI-GUCLU-SIFREN"
  }
}
```

API'yi Development profiliyle yeniden başlat. Hesap oluşturulunca bu iki ayarı kaldır. Yönetici e-postası bu manuel bootstrap işleminde onaylanmış sayılır; yalnızca kontrolündeki adresi kullan. Önceden normal üye olan hesap otomatik olarak yükseltilmez. Bu hesapla girişte Yönetim menüsü görünür. Yönetici için 2FA'yı Hesabım sayfasından ayrıca aç.

Production'da, migration sonrası aynı ayarları güvenli ortam değişkenleriyle verip `dotnet Hasadim.Api.dll --bootstrap-admin` çalıştır. Ardından bootstrap sırlarını kaldır.

## 6. Sorun giderme

- **API bağlantısı kurulamadı:** API konsolunu kontrol et. Her iki proje de çalışmalı. Web ayarındaki API adresi `https://localhost:7206` olmalı.
- **Sertifika:** `dotnet dev-certs https --trust` çalıştır. API bağlantısında sertifika doğrulamasını kapatan kod ekleme.
- **SQL bağlantısı:** SSMS'den `(localdb)\MSSQLLocalDB` bağlantısını dene. Yalnızca SSMS kurulu olması LocalDB kurulu olduğu anlamına gelmez.
- **Port kullanımda:** Önceki uygulamayı durdur. API 7206, Web 7106 kullanır.
- **Giriş başarısız:** Şifreyi/e-posta doğrulamasını kontrol et. Beş başarısız denemeden sonra 15 dakika hesap kilidi uygulanır. IP bazlı hız sınırı da vardır.
- **Oturum doğrulanamadı:** Sayfayı yenile. Giriş/çıkış yaptıktan sonra eski sekmedeki formu yeniden yükle.
- **İlan değişmiş hatası:** Başka sekme/istek ilanı değiştirmiştir; detayı yeniden açıp düzenle.

## 7. Yedekleme ve yayına hazırlık

SQL veritabanı ile API'nin `App_Data/photos` ve `App_Data/keys` klasörlerini birlikte koru. Anahtarlar oturumlar ve şifreli TOTP anahtarları için gereklidir. `App_Data/keys` klasörünü silme; kaybı oturumları ve 2FA anahtarlarını etkiler.

Canlı ortamda gerçek HTTPS alan adları, AllowedHosts, güvenilir reverse proxy adresleri, kalıcı ve erişimi sınırlı Data Protection anahtar deposu (sertifika/KMS ile at-rest koruma), SQL yetkileri ve yedek geri dönüş planı yapılandırılmalıdır. Data Protection anahtar dosyaları bu yerel pakette dosya sistemi izinleriyle korunur; üretimde ayrıca şifrelenmelidir. SMTP teslimatı, zararlı medya taraması/yeniden kodlama ve yük testi tamamlanmalıdır. Varsayılan hız sınırları tek sunucu içindir; çoklu sunucuda dağıtık sınırlandırma gerekir.

Bu sürüm bir kaynak geliştirme paketidir; bağımsız güvenlik denetimi yapılmış veya üretime yayımlanmış hizmet olarak değerlendirilmemelidir.

## İlk kurulum düzeltmesi

İlk paketteki `Aciklama nvarchar(5000)` tanımı `nvarchar(max)` olarak düzeltildi. Uygulamanın 5000 karakter doğrulaması korunur. Bu hata ilk migration sırasında oluştuysa transaction geri alınır; veritabanını silmeden düzeltilmiş projeyi yeniden derleyip API’yi başlat. Daha önce SQL dosyasını kendin değiştirip migration’ı başarıyla uyguladıysan checksum geçmişini değiştirme; mevcut şema için ayrı migration hazırlanmalıdır.
