# Testler ve doğrulama sınırları

## 28 Ekim 2026 kontrolü

- .NET SDK 10.0.402 ile çözüm derlendi: 0 hata, 0 uyarı.
- C# test uygulamasındaki 51 kontrol geçti. Yönetici onayı, tam 30 günlük yayın, tekrar onayın süreyi uzatmaması, süresi dolan ilanların geçmişe taşınması, yetkiler, sürüm çakışması ve profil gizliliği kapsanır. Depo bellekte taklit edilir; bunlar gerçek SQL testleri değildir.
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

`tests/Sql-Smoke.ps1` yeni ilanların incelemeye gitmesi ve onay öncesinde dışarıdan erişilememesi davranışına uyarlandı. Bu güncellemede gerçek SQL Server üzerinde çalıştırılmadı. Test veritabanı kullanan Development ortamını BASLAT.bat ile başlattıktan sonra, e-posta doğrulaması kapalıyken:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tests\Sql-Smoke.ps1
```

Betik iki test hesabı ve iki ilan oluşturur; sonunda ilanları soft-delete eder. Hesaplar ve kayıt geçmişi veritabanında kalır. Üretim veritabanında çalıştırmayın. Bu betik yönetici onayı ve 30 günlük sürenin SQL üzerinde uçtan uca doğrulamasını içermez.

## Manuel kabul kontrolü

1. Kaydolup giriş yapın; fotoğraflı bir ilan gönderin. İlanlarım içinde incelemede görünmeli, herkese açık listede bulunmamalı.
2. Yöneticiyle düzeltme isteyin. İlan sahibi gerekçeyi görmeli, düzenleyip yeniden incelemeye gönderebilmeli.
3. Yönetici onayı verin. İlan hemen yayımlanmalı; yayın bitişi onaydan 30 gün sonra olmalı. Tekrarlanan onay süreyi uzatmamalı.
4. Test veritabanında süresi dolmuş bir ilanla kontrol edin: herkese açık ve güncel listelerden çıkmalı; sahibinin Geçmiş ilanlar bölümünde ve detayında görünmeli.
5. Başka kullanıcı geçmiş ilana erişememeli; normal kullanıcı yönetici işlemlerini yapamamalı.

Gerçek veritabanıyla kayıt → ilan → onay akışı, gerçek SMTP/TOTP ve tarayıcıdaki görsel/mobil kontroller henüz bu güncellemede doğrulanmadı. Sahte DOM ve bellek deposu testlerinin geçmesi bunların yerine geçmez.
