# Testler ve doğrulama sınırları

## 28 Ekim 2026 kontrolü

- .NET SDK 10.0.402 ile çözüm derlendi: 0 hata, 0 uyarı.
- C# test uygulamasındaki 58 kontrol geçti. Otomatik yayın, eski kayıtlar için yönetici onayı, tam 30 günlük yayın, tekrar onayın süreyi uzatmaması, süresi dolan ilanların geçmişe taşınması, yetkiler, sürüm çakışması ve profil gizliliği kapsanır. Depo bellekte taklit edilir; bunlar gerçek SQL testleri değildir.
- `tests/ui-smoke.cjs`: sahte DOM/API üzerinde ilan oluşturma, düzenleme, geçmiş ilanlar, detay, galeri, giriş, mesaj, favori ve şikâyet kontrolleri geçti.
- `tests/listing-workflow.cjs`: inceleme kuyruğu, gerekçe, sürüm bilgisi, çift gönderim engeli ve yönetici kontrolleri geçti.
- `tests/static-paths.cjs`: yerel sayfa ve dosya bağlantıları, yükleme sırası ve 11 JavaScript dosyasının sözdizimi doğrulandı.
- NuGet güvenlik taraması, doğrudan ve dolaylı bağımlılıklarda bilinen açık bildirmedi. SQL istemcisinin dolaylı Pkcs bağımlılığı 9.0.21 sürümüne sabitlendi. Kaynak: https://github.com/dotnet/runtime/security/advisories/GHSA-846f-f764-76mx

## Çalıştırma

.NET 10 SDK ve Node.js kurulu olmalı. Proje kökündeki `TEST.bat` derlemeyi ve dört yerel test grubunu sırayla çalıştırır; herhangi bir hata varsa durur ve başarısız çıkış kodu döndürür.

Ayrı çalıştırmak için:

```powershell
dotnet build Hasadim.slnx
dotnet run --no-build --project tests/Hasadim.Tests
node tests/ui-smoke.cjs
node tests/listing-workflow.cjs
node tests/static-paths.cjs
dotnet list Hasadim.slnx package --vulnerable --include-transitive
```

Statik dosya testi isteğe bağlı çalışan Web adresi de alır: `node tests/static-paths.cjs https://localhost:7106`. Bu kip gerçek HTTP durumlarını, içerik türlerini ve eski bağlantıların sorgu bilgilerini koruyan yönlendirmelerini denetler. Test istemcisinin geliştirme sertifikasına güvenmesi gerekir.

## Gerçek veritabanı testi

`tests/Sql-Smoke.ps1` yeni ilanların otomatik yayımlanması, 30 günlük süre ve anonim telefon gizliliği davranışına uyarlandı. Bu güncellemede gerçek SQL Server üzerinde çalıştırılmadı. Test veritabanı kullanan Development ortamını BASLAT.bat ile başlattıktan sonra, e-posta doğrulaması kapalıyken:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tests\Sql-Smoke.ps1
```

Betik iki test hesabı ve iki ilan oluşturur; sonunda ilanları soft-delete eder. Hesaplar ve kayıt geçmişi veritabanında kalır. Üretim veritabanında çalıştırmayın. Bu betik yönetici onayı ve 30 günlük sürenin SQL üzerinde uçtan uca doğrulamasını içermez.

## Manuel kabul kontrolü

1. Kaydolup fotoğraflı bir ilan verin. Yönetici hesabı gerekmeksizin hemen Yayında görünmeli ve herkese açık listede yer almalı.
2. Eksik veya geçersiz zorunlu alan ya da fotoğrafsız gönderim hata vermeli; ilan oluşmamalı.
3. Yayın bitişi başlangıçtan 30 gün sonra olmalı. Tekrar gönderim süreyi uzatmamalı.
4. Test veritabanında süresi dolmuş bir ilan güncel ve herkese açık listelerden çıkmalı; sahibinin Geçmiş ilanlar bölümünde kalmalı.

006_AutomaticPublication.sql, eski inceleme/yayın bekleyen uygun kayıtları bir defa yayımlar. Gizlenen, silinen, taslak, düzeltme bekleyen ve geçmiş ilanlara dokunmaz; mevcut yayınların süresini uzatmaz. Development ortamında API başlarken uygulanır. Diğer ortamlarda VERITABANI-GUNCELLE.bat ile uygulanmalıdır.

Bu güncellemede gerçek SQL veritabanıyla geçiş ve uçtan uca kayıt/ilan akışı çalıştırılmadı. SMTP/TOTP ve gerçek tarayıcı görsel kontrolleri de doğrulanmadı. Sahte DOM ve bellek deposu testleri bu kontrollerin yerine geçmez.
## Git sonrası migration satır sonu uyumluluğu

MigrationRunner artık eski LF ve CRLF dosyalarından üretilmiş özetleri kabul eder. Yeni özetler LF biçiminde hesaplanır; SQL dosyaları Git tarafından LF olarak alınır. SQL içeriği, boşluklar veya yorumlar değişmişse koruma devam eder. SchemaVersions kayıtları silinmez/güncellenmez; uygulanmış SQL yeniden çalıştırılmaz.

Bu düzeltmeyle 64 C# kontrolü geçti ve derleme 0 hata/0 uyarıyla tamamlandı. Gerçek kullanıcı veritabanındaki kayıtlı özet okunmadığı için bildirilen hatanın kesin nedeni doğrulanmadı. Hata sürerse eski SQL içeriği ile kayıtlı özet karşılaştırılmalıdır; veritabanı veya SchemaVersions tablosu silinmemelidir.

## Profil ekranı düzenlemesi

Profil ilk açılışta salt okunur özet gösterir. Bilgilerimi düzenle düğmesi ayrı düzenleme bölümünü açar; Vazgeç kaydedilmemiş alanları atar, başarılı kayıt özet görünümüne döner. Fotoğraf işlemleri bu bölümde ayrıca ve hemen kaydedilir. Profil sayfasından arama formu kaldırıldı; ortak gezinme kodu arama alanı olmayan sayfalarda da çalışır.

İl/ilçe seçicileri mevcut iller-ilceler.json dosyasına bağlandı. Kayıtlı seçimler yüklenir, il değişince ilçe temizlenir. Liste yüklenemezse düzenleme açılmaz; kullanıcı tekrar deneyebilir.

`node tests/profile-ui.cjs` ve TEST.bat üzerinden yeni kontroller çalıştırılır. Özet/düzenleme geçişi, iptal, kayıt, kayıt hatasında alanların korunması, konum yükleme hatasından sonra yeniden deneme ve bağlı ilçe seçimi sahte DOM/API ile doğrulandı. Statik bağlantı ve mevcut ilan arayüz testleri de geçti. Gerçek tarayıcı görsel kontrolü ve gerçek hesapla API kaydı bu değişiklikte yapılmadı.

## İletişim doğrulama durumu

E-posta doğrulaması ayrı bilgi satırı yerine e-posta adresinin yanında Doğrulandı/Doğrulanmadı etiketiyle gösterilir. Doğrulanmamış hesap kendi e-posta adresine bağlantı gönderebilir; yeni kimlik doğrulamalı endpoint mevcut CSRF ve auth hız sınırına tabidir. İstekten e-posta adresi kabul etmez. SMTP yapılandırılmamışsa 503 döner; gönderim başarılı gösterilmez. Bağlantıyı gönderme işlemi EmailConfirmed değerini değiştirmez; kullanıcı bağlantıyı tamamlayıp profil sayfasını yenilediğinde durum değişir.

Telefon yanında doğrulama durumu ve SMS hizmetinin henüz açılmadığı açıklaması bulunur. Kullanıcının SMS hizmeti hesabı olmadığı için düğme kapalıdır; SMS gönderimi/kod kontrolü henüz uygulanmadı. Doğrulanmış telefon etiketi yalnızca Users tablosunda doğrulanmış numara ile profil numarası aynıysa gösterilir. Numara eklemek doğrulama sayılmaz.

Derleme 0 hata/0 uyarı, mevcut 64 C# kontrolü, profil ve ilan arayüz testleri geçti. Profil testi doğrulanmış/doğrulanmamış e-posta etiketini, CSRF ile gönderimi, gönderim hatasını, gönderim sonrası etiketin değişmemesini ve SMS düğmesinin kapalı olmasını kapsar. Gerçek SMTP teslimatı ve gerçek SQL üzerinde telefon durum sorgusu bu değişiklikte test edilmedi.

## Otomatik yayının gerçek SQL kayıt düzeltmesi

Otomatik yayın akışına geçerken MarketplaceRepository.Create içinde kalan PendingReview şartı kaldırıldı. Kayıt artık sunucunun yayımladığı Active/Published durumunu, PublishedAt ve ExpiresAt değerlerini yazar. 30 günlük süre ve fotoğrafların aynı işlem içinde kaydı korunur. Geçersiz bilgi ve fotoğrafsız gönderim kayıt oluşmadan hata döndürür.

Yeni regresyon testi:

```powershell
dotnet run --project tests/Hasadim.SqlTests
```

SQL Server LocalDB gerektirir. Uygulamanın bağlantı ayarlarını kullanmaz: rastgele isimli Hasadim_Test_ veritabanı oluşturur, tüm migration'ları uygular, test sonunda yalnızca bu veritabanını siler. TEST.bat bu testi otomatik çalıştırmaz.

Gerçek LocalDB üzerinde 11 kontrol geçti: yayımlanmış kayıt, 30 günlük tarihlerin saklanması, iki fotoğrafın kaydı, anonim liste/detay erişimi, geçersiz veri ve fotoğrafsız gönderimin reddi, fotoğraf kayıt hatasında tam geri alma, süresi dolan ilanın pazardan çıkıp geçmişte görünmesi. Bu kontrol HTTP yükleme ve gerçek tarayıcı testinin yerine geçmez.

## İlanlarda profil telefonunun kullanılması

Yeni ilan ve ilan düzenleme formlarından telefon girişi kaldırıldı. İlan kaydında sunucu, oturum sahibinin profil telefonunu alır; istemciden gelen telefon alanı JSON sözleşmesinde yok sayılır. Profilde geçerli numara yoksa ilan oluşturulmaz ve kullanıcı Profilim → Bilgilerimi düzenle bölümüne yönlendiren hata alır. Formlarda profil bağlantısı bulunur. Var olan ilanların telefonları topluca değiştirilmez; yeni kayıt ve izin verilen düzenlemeler profil numarasını kullanır.

Bu değişiklik SMS doğrulaması sağlamaz. SMS hizmeti hesabı henüz olmadığından telefonun profilde kayıtlı olması doğrulanmış olması anlamına gelmez.

Derleme 0 hata/0 uyarı; 67 C# kontrolü, arayüz/statik dosya testleri ve ayrı LocalDB üzerinde 12 SQL kontrolü geçti. Testler profil telefonu yokken istemcinin numarasının kabul edilmemesini ve SQL kaydındaki telefonun gerçekten profilden gelmesini kapsar.

## Hesap açılmadan önce 6 haneli e-posta kodu

Yeni kayıt iki adıma ayrıldı. İlk istek yalnızca korumalı bekleyen kayıt ve 120 saniyelik kod oluşturur; kullanıcı/profil satırı açılmaz. Doğru kod, kullanıcı ve profil oluşturmayı aynı SQL işleminde tamamlar. Kod tek kullanımlıktır, en fazla 5 yanlış denemeye izin verilir; yeniden gönderim için 60 saniye ve saatlik 5 istek sınırı uygulanır. E-posta doğrulaması girişte zorunludur. Kayıt telefonunu profile taşır, SMS doğrulanmış olarak işaretlemez.

Derleme 0 hata/0 uyarı; 67 mevcut C# kontrolü, yeni kayıt arayüz testi ve diğer arayüz/statik dosya kontrolleri geçti. Ayrı LocalDB üzerinde toplam 33 SQL kontrolü geçti: kayıt öncesi hesap bulunmaması, 120 saniye sınırı, yanlış kod sayacı, doğru kodla atomik oluşturma, tekrar kullanım, süresi geçmiş kod, 5 yanlış deneme, eski kodun geçersizleşmesi, gönderim iptali ve eşzamanlı doğrulama dahil.

Gerçek Gmail gönderimi uygulama şifresi henüz sağlanmadığından test edilmedi. EPOSTA-KUR.bat yerel kurulum yardımcısıdır; çalıştırılması tek başına SMTP teslimatını doğrulamaz. Ayrıntılar KODLU-KAYIT-KURULUM.md dosyasındadır. HTTP SQL testi artık doğrulanmış iki test hesabı ister; e-posta doğrulamasını atlayan eski test akışı kaldırıldı.
