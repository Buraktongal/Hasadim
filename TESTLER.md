# Test sonuçları ve sınırları

## Bu ortamda doğrulananlar

- .NET 10 SDK 10.0.100 ile Core, Application, Infrastructure, DependencyInjection, API, Web ve test projeleri derlendi.
- C# test uygulamasındaki **23 kontrol geçti**: aynı kullanıcıya ait iki farklı GUID ilanı, sahiplik, anonim oluşturma yasağı, rowversion zorunluluğu ve çakışması, fiyat aralığı, telefon gizliliği, yönetici yetkisi, salt ve parola doğrulama. Yeni kontroller fotoğraf zorunluluğu/10 fotoğraf sınırı, profil telefonu gizliliği, profil sahipliği, rowversion ve kurumsal ad zorunluluğunu da kapsar. Repository testte bellekte taklit edildi; gerçek SQL Server kullanılmadı.
- `tests/ui-smoke.cjs`: sahte DOM ve API ile listeleme, filtre, iki ayrı yeni ilan, düzenleme sürümü/tarihi, GUID mesaj, favori, şikâyet ve ayrı giriş sayfasına yönlendirme geçti.
- JavaScript sözdizimi kontrol edildi.
- **Gerçek API ve Web süreçleri çalıştırılarak** ayrı giriş sayfasının HTTP 200 dönmesi, Web–API HTTPS bağlantısı, CSRF token aktarımı, eksik CSRF'nin HTTP 400 ile reddi, DTO doğrulaması ve anonim mesaj/yönetim/ilan oluşturma isteklerinin HTTP 401 ile reddi doğrulandı. Bu kontroller veritabanı gerektirmeyen endpoint'lerle yapıldı. Yerel test istemcisi geliştirme sertifikasına özel test ayarı kullandı; uygulamanın API istemcisinde sertifika doğrulaması kapatılmadı.

## Henüz bu ortamda doğrulanamayanlar

SQL Server/LocalDB sunucusu olmadığı için SQL migration'ların ve Dapper kullanıcı depolarının gerçek veritabanında uçtan uca çalışması test edilemedi. Gerçek SMTP teslimatı ve gerçek kullanıcıyla TOTP kayıt/giriş akışı da test edilemedi. Gerçek tarayıcı görsel/mobil render testi yapılmadı. Derleme başarısı veya sahte repository testleri bu kontrollerin yerine geçmez.

## Testleri tekrar çalıştırma

Proje kökünde:

```powershell
dotnet build Hasadim.slnx
dotnet run --project tests/Hasadim.Tests
```

Veya TEST.bat kullan. Node.js varsa ayrıca:

```powershell
node tests/ui-smoke.cjs
```

## Gerçek SQL testi

Yerel uygulamayı BASLAT.bat ile başlat, iki sunucunun hazır olmasını bekle. Development ortamında e-posta doğrulaması kapalıyken:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tests\Sql-Smoke.ps1
```

Bu komut yalnızca mevcut betik çalışması için geçerlidir; kalıcı yürütme ilkesi değişmez. Test iki benzersiz hesap ve iki ilan oluşturur. Sonunda ilanlar soft-delete edilir; test kullanıcıları, ilan geçmişi ve mesajı veritabanında kalır. Üretim veritabanında kullanma. Betik bu teslim ortamında çalıştırılmadı.

## Manuel kabul kontrolü

1. Kaydol ve giriş yap; aynı hesapla en az iki farklı ilan ver. İkisi de İlanlarım ekranında kalmalı.
2. Birini düzenleyip tekrar “İlan ver” aç; başlık ve kimlikler yeni kayıt için temiz olmalı.
3. Aynı ilanı iki sekmede düzenle; eski sürümü kaydetme HTTP 409 vermeli.
4. Başka hesap ilk hesabın ilanını değiştirememeli; mesajlar yalnızca taraflara görünmeli.
5. Hesabım → 2FA kurulumunu yap, kurtarma kodlarını sakla, çıkış yapıp TOTP ve ayrı bir girişte kurtarma koduyla giriş dene. Kullanılmış kurtarma kodu tekrar çalışmamalı.
6. Aynı hesapla iki tarayıcıda giriş yap. Birinde tüm oturumları kapat; diğerinde sonraki korumalı istek giriş istemeli.
7. Şifre değiştirme sonrasında eski şifre reddedilmeli; doğrulanmış e-postaya sıfırlama akışını gerçek SMTP ile dene.
8. Beş yanlış şifreyle kilidi, CSRF ve hız sınırlarını kontrol et.
9. Fotoğraf yükle, sunucuları yeniden başlat: ilan ve fotoğraf korunmalı. Gizlenen/silinen ilanın fotoğrafı anonim erişimde açılmamalı.
10. Telefon ve masaüstü tarayıcılarda giriş, form, detay ve menü görünümünü kontrol et.

Profil ve galeri güncellemesinin kullanım/upgrade adımları GUNCELLEME.md içindedir. Yeni HTTP kontrolleri profil sayfaları, üst arama, breadcrumb ve anonim /api/profiles/me erişimini de kapsar.
