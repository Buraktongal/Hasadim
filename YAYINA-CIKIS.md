# Yayına çıkış rehberi

Bu rehber Hasadım'ı bir Windows sunucuda (IIS) yayına almak ve mobil uygulamayı mağazalara göndermek için gereken adımları sırayla anlatır.
Kodda yapılacak hazırlıklar tamamlandı; aşağıdaki adımlar hesap açma, sunucu kurma ve bilgileri doldurma işleridir.

## 0. Yayından önce mutlaka

- [ ] **Şirket bilgileri:** `src/Hasadim.Web/wwwroot/data/sirket.json` dosyasındaki köşeli parantezli alanları doldurun (unvan, adres, MERSİS, vergi no, KEP, ETBİS…). Doldurulmamış alanlar yasal sayfalarda sarı görünür.
- [ ] **Yasal metinler:** `kullanim-kosullari.html`, `kvkk.html`, `gizlilik.html`, `cerez-politikasi.html`, `iletisim.html` taslaktır. **Bir avukata kontrol ettirin.**
- [ ] **ETBİS kaydı:** Aracı hizmet sağlayıcı olarak Ticaret Bakanlığı ETBİS'e (etbis.ticaret.gov.tr) kayıt yaptırın; numarayı `sirket.json`'a yazın.
- [ ] **VERBİS:** Çalışan sayısı/ciro eşiğine göre kayıt yükümlülüğünüz olup olmadığını avukatınıza sorun.
- [ ] **Alan adı:** `hasadim.com` (ve `www`) alan adının DNS kaydını sunucunun IP adresine yönlendirin.

## 1. Sunucu

Önerilen: Windows Server 2022 + IIS (en az 2 çekirdek, 4 GB RAM) ve SQL Server (Express ücretsizdir, 10 GB sınırı vardır; büyüyünce Standard'a ya da Azure SQL'e geçilir).

1. IIS'i kurun (Sunucu Yöneticisi → Rol ekle → Web Sunucusu).
2. **ASP.NET Core 10 Hosting Bundle**'ı kurun (dotnet.microsoft.com → .NET 10 → Hosting Bundle), sonra `iisreset`.
3. SQL Server'ı kurun, `Hasadim` adında boş bir veritabanı ve bu veritabanında `db_owner` yetkili bir SQL kullanıcısı oluşturun.
4. Kalıcı veri klasörü oluşturun: `D:\HasadimVeri` (fotoğraflar ve oturum anahtarları burada durur). IIS uygulama havuzu kullanıcılarına (`IIS AppPool\HasadimApi`) bu klasörde **Değiştirme** yetkisi verin.

## 2. Yayımlama (Visual Studio)

1. `Hasadim.Api` → sağ tık → **Yayımla** → Klasör → `C:\Yayin\Api`. Yapılandırma: Release, hedef: `win-x64`, dağıtım: framework-dependent.
2. `Hasadim.Web` için aynısı → `C:\Yayin\Web`.
3. Her iki klasörü sunucuya kopyalayın (ör. `C:\inetpub\hasadim-api` ve `C:\inetpub\hasadim-web`).

## 3. IIS siteleri

**API (yalnızca sunucunun içinden erişilir):**
- Site adı `HasadimApi`, klasör `C:\inetpub\hasadim-api`, bağlama: **http, IP 127.0.0.1, port 5206**.
- Uygulama havuzu: .NET CLR sürümü “Yönetilen kod yok”.
- Ortam değişkenleri (IIS → site → Yapılandırma Düzenleyicisi → `system.webServer/aspNetCore` → environmentVariables, ya da sunucu ortam değişkeni):

| Değişken | Değer |
|---|---|
| `ConnectionStrings__DefaultConnection` | `Server=.\SQLEXPRESS;Database=Hasadim;User Id=...;Password=...;TrustServerCertificate=True;` |
| `Storage__Root` | `D:\HasadimVeri` |
| `Mail__Host`, `Mail__Port`, `Mail__User`, `Mail__Password`, `Mail__From` | E-posta sağlayıcınızın SMTP bilgileri |
| `Auth__Google__WebClientId` vb. | Google/Apple girişi kullanılacaksa (boş kalırsa düğmeler görünmez) |

> SMTP bilgisi verilmezse API güvenlik gereği **açılmaz** (e-posta doğrulaması zorunludur). Brevo, Amazon SES veya Yandex/Google Workspace SMTP kullanılabilir. Gönderen alan adı için SPF ve DKIM kayıtlarını DNS'e ekleyin, yoksa e-postalar spam'e düşer.

**Web (ziyaretçilerin açtığı site):**
- Site adı `HasadimWeb`, klasör `C:\inetpub\hasadim-web`, bağlama: **https, port 443, ana bilgisayar adı hasadim.com** (www için ikinci bağlama).
- SSL sertifikası: ücretsiz **win-acme** (Let's Encrypt) ile alın ve otomatik yenilemeyi açın.
- http (80) bağlaması da ekleyin; site kendisi https'e yönlendirir.

Web ayarları `appsettings.Production.json`'da hazır (API adresi `http://127.0.0.1:5206`, site adresi `https://hasadim.com`).

## 4. Veritabanı ve yönetici

Sunucuda yönetici olarak komut istemi açın:

```bat
cd C:\inetpub\hasadim-api
set ASPNETCORE_ENVIRONMENT=Production
set ConnectionStrings__DefaultConnection=Server=.\SQLEXPRESS;Database=Hasadim;User Id=...;Password=...;TrustServerCertificate=True;
dotnet Hasadim.Api.dll --migrate
set BootstrapAdmin__Email=yonetim@hasadim.com
set BootstrapAdmin__Password=GüçlüBirŞifre123
dotnet Hasadim.Api.dll --bootstrap-admin
```

Demo verisi yayında yüklenemez (yalnızca Development).
Her yeni sürümde: siteleri durdurun → dosyaları kopyalayın → `--migrate` → siteleri başlatın.

## 5. Kontrol

- `https://hasadim.com/health` → `{"status":"ok","api":"ok"}`
- Kayıt ol → e-posta kodu geliyor mu?
- İlan ver (10 fotoğrafla) → yükleniyor mu?
- Bir ilan bağlantısını WhatsApp'ta paylaşın → başlık ve fotoğraf görünüyor mu?
- `https://hasadim.com/robots.txt` ve `https://hasadim.com/sitemap.xml` açılıyor mu?

## 6. İzleme ve yedek

- **Kesinti uyarısı:** UptimeRobot (ücretsiz) ile `https://hasadim.com/health` adresini 5 dakikada bir kontrol ettirin.
- **Veritabanı yedeği:** SQL Server Agent (Express'te yoktur → Görev Zamanlayıcı + `sqlcmd BACKUP DATABASE`) ile her gece tam yedek.
- **Fotoğraf yedeği:** `D:\HasadimVeri` klasörünü her gece başka bir diske/buluta kopyalayın (ör. `robocopy` + Görev Zamanlayıcı ya da OneDrive/Backblaze).
- Yedekten geri yüklemeyi en az bir kez deneyin.
- **Arama motoru:** Google Search Console'a siteyi ekleyip `sitemap.xml`'i gönderin.

## 7. Mobil uygulama

Hazır: `mobile/eas.json` (development / preview / production profilleri). Production derlemesi otomatik olarak `https://hasadim.com` sunucusuna bağlanır ve sürüm numarasını kendisi artırır.

1. **Hesaplar:** Apple Developer Program (yıllık 99 $; şirket adına açılacaksa D-U-N-S numarası gerekir) ve Google Play Console (bir kerelik 25 $).
2. Bilgisayarda: `npm install -g eas-cli` → `cd mobile` → `eas login` → `eas init` (projeyi Expo hesabınıza bağlar).
3. **Test derlemesi (Android APK):** `eas build -p android --profile preview` → çıkan bağlantıdan telefona kurun.
4. **Mağaza derlemesi:** `eas build -p all --profile production`
5. **Gönderim:** `eas submit -p ios` ve `eas submit -p android` (`eas.json`'daki `ascAppId` alanına App Store Connect'teki uygulama numarasını yazın).
6. **Google Play:** Yeni bireysel geliştirici hesaplarında üretime çıkmadan önce **en az 12 test kullanıcısıyla 14 gün kapalı test** zorunludur — bunu hemen başlatın.
7. **Mağaza formları:**
   - Gizlilik politikası adresi: `https://hasadim.com/html/gizlilik.html`
   - Hesap silme adresi (Google istiyor): aynı sayfadaki “Hesabınızı ve verilerinizi silme” bölümü
   - Toplanan veriler: ad, e-posta, telefon (isteğe bağlı), fotoğraflar, kullanıcı içeriği (ilan, mesaj), yaklaşık konum (kullanıcının işaretlediği), cihaz/oturum bilgisi. **İzleme (tracking): yok. Reklam: yok.** Veriler aktarımda şifreli, kullanıcı silebilir.
   - İçerik derecelendirme anketi; kategori: Alışveriş / İş.
   - Apple incelemesi için bir **demo hesap** (e-posta + şifre) verin; inceleme ekibi giriş yapıp ilan görebilmelidir.
   - Ekran görüntüleri: iPhone 6.9" ve 6.5", Android telefon.

## 8. İlk sürümde kapalı/eksik olanlar

- **SMS:** SMS sağlayıcısı bağlı değil; telefonla giriş ve telefon doğrulama otomatik olarak gizlenir. Netgsm / İleti Merkezi hesabı açılınca `Sms:Provider` eklenecek.
- **Anlık bildirim (push):** Mesaj ve tekliflerin telefona bildirim olarak düşmesi henüz yok; uygulama içi bildirimler çalışır. Yayından sonraki ilk geliştirme olarak önerilir.
- **Google/Apple ile giriş:** Client ID'ler girilmezse düğmeler görünmez; e-posta ile kayıt çalışır.
