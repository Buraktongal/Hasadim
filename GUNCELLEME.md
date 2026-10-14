# Profil, ilan galerisi ve gezinme güncellemesi

## Eklenenler

- Profil düzenleme: /profilim.html. Profil fotoğrafı (3 MB), görünen ad, bireysel/kurumsal hesap, firma adı, faaliyet, il/ilçe, açıklama ve telefon görünürlüğü.
- Satıcı sayfası: /satici.html?id=GUID. Satıcının kamuya açık bilgileri ve sayfalı aktif ilanları. E-posta adresi yayımlanmaz. E-posta doğrulaması yalnızca gerçek Identity kaydı doğrulanmışsa gösterilir. Firma bilgisi kullanıcı beyanıdır; firma doğrulama veya işlem puanı iddiası yoktur.
- Ayrı ilan detayı: /ilan.html?id=GUID. Fotoğraf galerisi (altta X / toplam sayacı, seçili küçük resim, tıklamayla büyütme, büyük görünümde önceki/sonraki ve klavye okları; Esc ile kapatma), satıcı kartı, mesaj, telefon gizliliği, şikâyet ve sahip için düzenleme/silme. Detay artık açılır pencere değildir.
- Yeni ilan için API dahil en az 1 fotoğraf zorunludur. En fazla 10 fotoğraf, dosya başına 5 MB. JPG/PNG/WebP uzantıları dosya imzasından belirlenir. Yeni ilan ve fotoğraf kayıtları tek SQL transaction içinde kaydedilir; başarısız işlemde yüklenen dosyalar temizlenir. Disk/veritabanı ortak transaction değildir; ani süreç kesintilerinde kullanılmayan dosyalar kalabilir.
- Düzenlemede yeni fotoğraflar mevcut galeriye eklenir. İlk fotoğraf kapaktır. Fotoğraf silme/sıralama bu sürümde yoktur. Eski fotoğraflı ilanlar otomatik galeriye taşınır. Eski fotoğrafsız ilanlar silinmez; tekrar yayında kaydetmek için fotoğraf eklenir.
- Her sayfanın üstünde ürün/ilan araması. Arama başlık ve çeşitte çalışır; il ve meyve türü filtreleri ana sayfada kalır.
- Sayfa konumu yolu (breadcrumb), aktif bölüm ve ilanı favorilerden/ilanlarımdan/satıcı sayfasından açınca geri dönüş bağlantısı.

## Mevcut kurulumunu güncelleme

1. API ve Web'i durdur. Veritabanını ve API'nin App_Data klasörünü yedekle.
2. ZIP'i yeni klasöre çıkar. Mevcut API/Web appsettings ayarlarını, connection string ve user-secrets ayarlarını koru. API App_Data içeriğini (keys, photos ve varsa profiles) yeni API klasörüne taşı/kopyala; boş klasörle değiştirme. Aynı veritabanına bağlan.
3. Daha önce uygulanmış 001 migration dosyanın içeriğini değiştirme. Bu pakette 001 önceki teslimle aynı; yalnızca 002_UserProfiles.sql ve 003_ListingPhotos.sql eklendi. SchemaVersions tablosunu veya veritabanını silme.
4. Yeni klasörde VERITABANI-GUNCELLE.bat çalıştır. Alternatif olarak Development ortamında BASLAT.bat ile başlatıldığında eksik migration'lar otomatik uygulanır. Bu proje Dapper kullanır: Add-Migration / Update-Database kullanma.
5. BASLAT.bat çalıştır. Her iki konsolda Now listening on görünce https://localhost:7106 adresini aç.
6. Profilim sayfasından bilgilerini tamamla. İlan ver bölümünde birden fazla dosya seçerek ilan oluştur. İlanı incele ile ayrı sayfaya git; galeri küçük resimlerini ve üst aramayı dene.

Eski kullanıcıların üyelik tarihi önceki şemada tutulmuyordu; tarih uydurmak yerine "kayıtlı değil" gösterilir. Yeni hesaplar oluşturulma tarihini kaydeder. Fotoğraflar API/App_Data/profiles ve API/App_Data/photos içindedir; yedeklere dahil et.

## Değişen sayfalar ve katmanlar

| Dosya/bölüm | Değişiklik |
| --- | --- |
| Web/wwwroot/profilim.html, profile.js | Profil bilgileri, fotoğraf, gizlilik |
| Web/wwwroot/satici.html | Herkese açık satıcı sayfası |
| Web/wwwroot/ilan.html, app.js | Ayrı ilan detayı, galeri, çoklu yükleme |
| Web/wwwroot/index.html | Fotoğraf zorunlu ilan formu, detay yönlendirmesi |
| Web/wwwroot/navigation.js, tüm HTML sayfaları | Üst arama ve sayfa konumu yolu |
| Web/wwwroot/hesabim.html | Profil düzenlemeye bağlantı |
| Web/wwwroot/styles.css | Responsive profil, galeri ve arama stilleri |
| Web/Program.cs | Çoklu fotoğraf için proxy istek boyutu 52 MB |
| Core/SellerProfile.cs | Profil modeli |
| Application/Profiles.cs | Profil sözleşmeleri, yetki ve gizlilik kuralları |
| Application/Contracts.cs, MarketplaceService.cs | Fotoğraf zorunluluğu, galeri ve satıcı filtresi |
| Infrastructure/Repositories | Dapper profil, galeri ve transaction işlemleri |
| Infrastructure/Identity/DapperUserStore.cs | Yeni kullanıcı için profil oluşturma |
| Infrastructure/Migrations/002, 003 | Mevcut kayıtları koruyan şema genişletmesi |
| Api/Controllers/ProfilesController.cs, ListingsController.cs | Profil ve çoklu fotoğraf endpoint'leri |
| DependencyInjection/ServiceRegistration.cs | Profil bağımlılık kayıtları |
| tests | Profil gizliliği, fotoğraf zorunluluğu ve yenilenen akışlar |

## API değişikliği

Yeni ilan: POST /api/meyve-ilanlari/with-photos, multipart/form-data. `listing` alanı ListingRequest JSON; `files` alanı tekrarlanan fotoğraf dosyalarıdır. JSON-only eski POST fotoğrafsız oluşturmayı reddeder.
Mevcut ilana ek fotoğraf: POST /api/meyve-ilanlari/{id}/photos, multipart `files`.
Detay JSON'unda `photos` dizisi: GUID `id` ve `photoUrl`. Fotoğraflar ilan görünürlük/yetki kontrollerinden geçerek servis edilir.
Profil: GET/PUT /api/profiles/me; POST/DELETE /api/profiles/me/photo; GET /api/profiles/{id}. Yazma isteklerinde mevcut oturum cookie'si ve CSRF başlığı gerekir.

Yerelde 52 MB sınırı Kestrel/Web proxy üzerinde ayarlandı. IIS veya harici reverse proxy ile dağıtımda o sunucunun gövde boyutu sınırını da uygun ayarla.

## Doğrulama

.NET 10 çözümü 0 hata, 0 uyarıyla derlendi. 23 C# kontrolü, sahte DOM/API arayüz testleri ve gerçek API/Web süreçleriyle veritabanı gerektirmeyen 12 HTTP kontrolü geçti. Yeni sayfalar, HTTPS proxy, CSRF ve anonim profil erişimi kontrol edildi. Gerçek SQL Server/LocalDB, SMTP ve tarayıcı görsel testleri bu ortamda çalıştırılmadı. Yerel SQL kabul testi tests/Sql-Smoke.ps1 içindedir; çalıştırıldığında test hesapları ve ilan geçmişi oluşturur.

## İncelenen örnek

Sahibinden'in resmi yardım sayfalarındaki profil fotoğrafı, mağaza bilgileri, hesap yönetimi ve işlem geçmişine dayalı değerlendirme açıklamaları incelendi. Ana sitenin oturum gerektiren ekranları veya tasarımı kopyalanmadı; Hasadım'ın API/Web ayrımı ve Clean Architecture yapısı korundu.
https://yardim.sahibinden.com/hc/tr/articles/115004671753
https://yardim.sahibinden.com/hc/tr/articles/360014946193
