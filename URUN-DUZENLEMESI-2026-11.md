# Hasadım ürün düzenlemesi — 15 Kasım 2026

## İncelemenin kapsamı

Sahibinden, Arabam ve TÜCCAR'ın erişilebilir resmî sayfaları ve yardım içerikleri incelendi. Sahibinden ana sayfası erişim sınırı döndürdü; rakiplerin giriş gerektiren özel hesapları, bütün mobil ekranları ve tüm ilan verme adımları doğrudan denenmedi. Bu belge tam bir rakip ürün denetimi iddiası taşımaz.

| Kaynak | Gözlenen yaklaşım | Hasadım'a uygulanan karar |
| --- | --- | --- |
| [Sahibinden hesap açma rehberi](https://yardim.sahibinden.com/hc/tr/articles/115004600793-Nas%C4%B1l-Hesap-A%C3%A7abilirim) | Hesap, e-posta doğrulaması, favoriler ve ilan sahibiyle iletişim birbirini tamamlıyor. | Mevcut kodlu e-posta doğrulaması korundu; sade hesap ekranı, görünür şifre koşulları ve güvenli giriş dönüşü eklendi. |
| [Arabam ilan verme rehberi](https://www.arabam.com/yardim/ilan-ver) | Ürün bilgileri, fotoğraflar, adres ve iletişim bilgileri sonrasında önizleme sunuluyor. | Ürün / fiyat ve konum / fotoğraflar bölümleri ve gönderimden önce gerçek önizleme eklendi. |
| [Arabam ilan arama rehberi](https://www.arabam.com/yardim/ilan-ara) | Hızlı arama, kategori filtreleme, favoriler ve ilan üzerinden soru sorma birlikte kullanılıyor. | Meyve kısayolları, kaldırılabilir filtreler, mobil filtre düğmesi ve detayda favori işlemi eklendi. İlan üzerinden özel soru sorma korundu. |
| [TÜCCAR](https://xn--tccar-kva.com.tr/) ve [yardım sayfası](https://www.xn--tccar-kva.com.tr/yardim) | Ürün, konum ve birim fiyatı öne çıkaran ilanlar; alıcı-satıcı iletişimi ve teslimat koşullarında anlaşma. | Kilogram fiyatı, miktar ve hasat tarihinin yanına ambalaj, teslimat ve minimum alım alanları eklendi. |

Ortak sonuç: ürünün anlaşılması, satıcıya erişim ve işlem sırasında nerede olunduğunun bilinmesi önceliklidir. Tasarım Hasadım'ın yeşil/krem renkleriyle geliştirildi; logo dosyası değiştirilmedi. Rakiplere özgü araç alanları, ödeme ürünleri veya doğrulama rozetleri kopyalanmadı.

## Tamamlanan değişiklikler

- Giriş/kayıt sayfalarında aramasız üst alan, sade form düzeni, mobil yerleşim, şifre göster/gizle, Caps Lock uyarısı ve kayıt şifresi koşulları.
- Giriş sonrası yalnızca izin verilen uygulama sayfalarına dönüş. İlan vermek için giriş yapan kullanıcıya formun yeniden açılması. Dış site yönlendirmeleri reddedilir.
- İlan formunda üç bölüm, minimum alım kontrolü ve yayın öncesi özet. İlk önizleme tıklaması veritabanına yazmaz. Alanlar değişirse yeniden önizleme gerekir.
- Ambalaj, teslimat ve minimum alımın isteğe bağlı olarak kaydı, güncellenmesi ve gösterimi. Eski ilanlarda bilgi uydurulmaz; “Belirtilmedi” görünür.
- Meyve kısayolları, etkin filtreleri kaldırma, mobilde açılır filtre alanı, ilan detayında favoriler ve bağlantı kopyalama.
- Mesaj bildirimlerinin uygulama başlangıcında başlatılması ve buna yönelik regresyon kontrolü.

## Kurulum ve doğrulama

`codex/test-ve-baslatma-duzeltmeleri` dalını çekip API ve Web projelerini yeniden başlatın. Geliştirme ortamında `009_ListingTradeDetails.sql` otomatik uygulanır. Üretimde önce mevcut veritabanı yedekleme düzeninizi kullanın, ardından `dotnet run --project src/Hasadim.Api -- --migrate` ile geçişleri uygulayın. Önceden uygulanmış SQL dosyaları değiştirilmedi.

Derleme sıfır hata ve uyarı verdi. 104 gerçek LocalDB kontrolü, 67 uygulama kontrolü, kayıt, profil, ilan, mesajlaşma, bildirim, kaynak yolları ve güvenli giriş dönüşü testleri geçti. SQL kontrolleri ayrı ve geçici veritabanında çalıştırılır. Arayüz davranış testleri sahte DOM kullanır; gerçek cihazdaki görsel doğrulamanın yerine geçmez.

## Canlı kullanım sınırları

Bu sürüm ilan ve iletişim platformudur. SMS sağlayıcısı bağlanmadığından telefon sahipliği doğrulaması yoktur. SMTP'nin canlı e-posta teslimatı bu çalışmada denenmedi. Ödeme ve şirket hesabı entegrasyonu önceki karara göre kapsam dışında bırakıldı. Tarayıcı kapalıyken push bildirimi yoktur. Bu bağımlılıklar tamamlanmadan uygulamaya “tüm üretim koşullarında doğrulandı” denmemelidir.
