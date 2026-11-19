# Ticaret arayüzü (ilan sitesi düzeni)

Ana sayfa, ilan detayı ve ilan verme ekranları toptan alım yapan tüccarlar için ilan sitesi düzenine geçirildi.

## Ana sayfa / ilan listesi
- Üstte bilgi şeridi, geniş arama, turuncu **İlan ver** düğmesi ve meyve kategorileri çubuğu (`layout.html`).
- Solda **Kategoriler** (yayındaki ilan sayılarıyla) ve **Detaylı arama**: kelime, meyve, çeşit, il, ilçe, TL/kg aralığı, kg aralığı, ambalaj, teslimat.
- Sağda sonuç çubuğu: uygulanan filtreler, sıralama (yeni, fiyat ↑↓, miktar ↑↓), **Liste / Galeri** görünümü (tercih tarayıcıda saklanır).
- Liste görünümü satır düzenindedir: fotoğraf · başlık · çeşit · miktar · fiyat · ilan tarihi · il/ilçe.
- Filtreler adres çubuğuna yazılır (`/html/index.html?meyveTuru=Elma&il=Isparta&sort=priceAsc`); bağlantı paylaşılabilir, sayfa yenilenince korunur.

## İlan detayı
- Başlık satırı (meyve/çeşit, başlık, ilan no, konum).
- Üç sütun: galeri · fiyat ve ilan bilgileri tablosu · satıcı kutusu ve iletişim (telefon, mesaj) + alım tutarı hesabı.
- Altta açıklama, satıcıya hazır sorular ve **benzer ilanlar** (aynı meyve türü).

## İlan verme sihirbazı
Dört adım: **Kategori** (meyve kutucukları + çeşit) → **İlan detayları** → **Fiyat, miktar ve teslimat** → **Fotoğraf ve yayın** (önizleme + yayımla). Her adımda zorunlu alanlar kontrol edilir; düzenlemede tüm adımlar açıktır. Kaydetme akışı değişmedi (`listing-workflow.js`).

## API değişiklikleri
- `GET /api/meyve-ilanlari` yeni filtreler: `ilce`, `cesit`, `ambalaj`, `teslimat`, `minMiktar`, `maxMiktar`; yeni sıralamalar: `qtyDesc`, `qtyAsc`. Ambalaj/teslimat/sıralama sabit listeden doğrulanır.
- `GET /api/meyve-ilanlari/kategoriler`: yayındaki ilanların meyve türüne göre sayısı.

## Dosyalar
- Yeni: `css/ticaret.css`, `js/market-catalog.js`, `js/listing-wizard.js`
- Değişen: `html/index.html`, `html/ilan.html`, `html/layout.html`, `js/app.js`, `js/market-tools.js`, `js/page-loader.js`

## Doğrulama
- Node arayüz testlerinin hepsi geçti (`tests/*.cjs`).
- C# tarafı bu ortamda derlenemedi (.NET SDK yok). `dotnet build Hasadim.slnx` ve `dotnet run --project tests/Hasadim.Tests` ile kontrol edilmeli; yeni 3 kontrol eklendi (ters miktar aralığı, tanımsız sıralama, tanımsız ambalaj).

## 2. tur düzenlemeleri
- **Yazı tipi:** Siteye gömülü Nunito (yuvarlak hatlı, Türkçe karakterli; `fonts/nunito-latin.woff`, OFL lisansı `fonts/Nunito-OFL.txt`). Ortak tema `css/tema.css` tüm sayfalarda yüklenir; köşe yuvarlaklıkları büyütüldü.
- **Meyve simgeleri:** Emojiler yerine çizilmiş SVG simgeler (`js/fruit-icons.js`): kategori çubuğu, kategori listesi, ilan verme kutucukları ve fotoğrafsız ilan yer tutucuları.
- **Giriş / kayıt / şifre sayfaları:** Sayfa konumu çubuğu ve tekrarlanan "Pazar yerine dön" bağlantıları kaldırıldı; tek üst çubuk (logo + geri dön). Kullanıcı bir ilandan geldiyse "İlana geri dön" gösterilir.
- **Kayıt sayfası:** Adım göstergesi (Hesap bilgileri → E-posta doğrulama), gruplanmış alanlar, canlı şifre kuralları, **şifre tekrar** alanı. Kayıt bitince giriş sayfasına e-posta dolu olarak yönlendirilir.
- **Şifre tekrarı:** Kayıt, şifre yenileme ve hesap güvenliği (şifre değiştir) formlarında. Sunucu da doğrular (`PasswordConfirm`, `NewPasswordConfirm` — `[Compare]`).
- **Yönlendirmeler:** Giriş yapmış kullanıcı giriş/kayıt sayfasını açarsa geldiği sayfaya döner; şifre yenileme, e-posta doğrulama, şifre değiştirme ve tüm oturumları kapatma sonrası giriş sayfasına bilgi notuyla geçilir.
- **Sayfa konumu:** Pazar yerinde seçili filtreleri izler (Ana sayfa › Meyve ilanları › Elma › Isparta), içerikle hizalı ve sade. Kategori/arama sayfasında tanıtım şeridi gizlenir.

## 3. tur düzenlemeleri
- **Hesabım sayfaları (Profilim, Hesap güvenliği) ve Satıcı sayfası** pazar yeriyle aynı üst menüyü kullanır (`js/site-header.js`). Sayfaların kendi bağlantı satırı kaldırıldı; hesap sayfalarında tek bir yan menü var (Profil bilgilerim, Hesap güvenliği, İlanlarım, Favorilerim, Mesajlarım). Stiller: `css/hesap.css`.
- **İki adımlı doğrulama** yeniden yazıldı (`js/security.js`): durum rozeti (Kapalı/Kuruluyor/Açık), "Aç" düğmesiyle başlayan 3 adım (şifre → uygulamaya ekle + 6 haneli kod → kurtarma kodları), anahtar 4'lü gruplar hâlinde ve kopyalanabilir, telefondan "Doğrulayıcı uygulamada aç" bağlantısı, kurtarma kodlarını kopyala/indir, açıkken şifreyle kapatma. Yeni API: `GET /api/account/2fa/status`, `POST /api/account/2fa/disable`.
- **Yayındaki ilanda** "Yayın tarihi / Yayın bitişi" satırları gösterilmez (detay tablosu ve sahip durum kutusu).
- **Telefon numarası açık yazılmaz:** ilan detayında ve satıcı sayfasında "WhatsApp ile yaz" (hazır mesajla `wa.me` bağlantısı) ve "Telefonu göster" (basınca numara ve arama bağlantısı) düğmeleri.

## 4. tur düzenlemeleri
- **Çıkış onayı:** "Çıkış yap" artık sitenin kendi onay penceresini açar (`js/confirm-dialog.js`). İlan silme ve fotoğraf kaldırma da aynı pencereyi kullanır.
- **İlan düzenleme düzeltmesi:** Yayındaki ilana fotoğraf eklemek sunucuda reddediliyordu (yalnızca taslağa izin veriliyordu); artık taslak, düzeltme bekleyen ve süresi dolmamış yayındaki ilanlara eklenebilir.
- **Fotoğraf yönetimi:** Düzenlemede "İlandaki fotoğraflar" bölümü (`js/listing-photos.js`): kapak yap, kaldır (en az bir fotoğraf kalır). Yeni API: `DELETE /api/meyve-ilanlari/{id}/photos/{photoId}`, `POST /api/meyve-ilanlari/{id}/photos/{photoId}/cover`. Kaldırılan dosya diskten de silinir.
- **Önce / sonra:** Düzenleme önizlemesinde değişen alanlar tablo olarak gösterilir (Alan · Önce · Sonra). Fiyatta eski fiyat üstü çizili, yeni fiyat ve yüzde düşüş/artış rozeti görünür.

## 5. tur düzenlemeleri
- **Profil:** Yan menüde yalnızca "Profil bilgilerim" ve "Hesap güvenliği" kaldı (İlanlarım/Favorilerim/Mesajlarım üst menüde ve footer'da). Profil özetinden aktif ilan sayısı çıkarıldı.
- **İki adımlı doğrulama şimdilik kapalı:** Hesap güvenliği sayfasında bölüm gizli; sunucuda `Features:TwoFactorSetup` (varsayılan `false`) açılmadan kurulum yapılamaz. Daha önce açmış kullanıcılar bölümü görür ve kapatabilir; girişte kodları çalışmaya devam eder. İleride açmak için `appsettings.json` → `"Features": { "TwoFactorSetup": true }`.
- **Footer:** Yeni düzen (Hasadım hakkında · Kategoriler · Hesabım · Yardım ve güvenlik), yasal metinler "Hazırlanıyor" satırı, tüm ana sayfalarda (pazar, ilan, profil, güvenlik, satıcı). Giriş yapmadan "Ücretsiz ilan ver" girişe yönlendirir.
- **Kapat (×) düğmeleri** tam ortalandı.
- **Yazım:** Üst küçük başlıklar metinde normal yazılıp CSS ile büyütülüyor; tutarsız büyük harfler, "Farketmez" → "Fark etmez", apostroflar (’), "seçin" → "seç" (sen dili), "Değişikliklerini kaydettiğinde", sayfa başlığı düzeltildi.

## 6. tur düzenlemeleri
- **Aranabilir seçim kutuları** (`js/searchable-select.js`, kütüphanesiz select2 benzeri): meyve, çeşit, il, ilçe (filtreler, ilan verme, profil). Türkçe harf duyarsız arama ("cilek" → Çilek), eşleşen kısmı vurgular, klavye (↑ ↓ Enter Esc) ve ekran okuyucu desteği. Asıl `<select>` formda kalır; 8'den az seçenekte arama kutusu gizlenir.
- **Yeni meyveler:** Ayva, Greyfurt, Nektarin, Ahududu, Böğürtlen, Yaban mersini, Dut, Trabzon hurması; mevcut meyvelere yeni çeşitler (ör. Elma: Scarlet Spur, Red Chief, Jonagold, Braeburn, Arapkızı). Hepsine çizilmiş simge eklendi.
- **İlan ver – meyve seçimi:** Kutucuk seçilince "pop" animasyonu ve onay işareti; ardından "{Meyve} çeşidini seç" paneli kayarak açılır, çeşitler çip olarak sırayla belirir. Hareket azaltma tercihinde animasyonlar kapanır.
- **Mobil:** İlan verme adımlarında seçili adımın numarası ortalı; meyve kutucukları mobilde 3 sütun.

## 7. tur düzenlemeleri
- **Fiyat düşüşü yeşil:** İlan kartında ve detayda indirim yeşil "↓ %x indirim" rozetiyle, eski fiyat üstü çizili gösterilir. Fiyat artışında eski fiyat ve rozet hiç gösterilmez (düzenleme önizlemesinde de artış rozeti yok).
- **Sayfalama:** İlk açılışta yalnızca 10 ilan istenir. "Göster" seçimi: 10 / 25 / 50 / 100 (tercih tarayıcıda saklanır). Sayfa numaraları (1 … 4 5 [6] 7 8 … 18), "444 ilandan 126–150 arası gösteriliyor". Sayfa ve sayfa boyutu adres çubuğunda (`?page=6&pageSize=25`). Sunucu en fazla 100 kayıt döndürür (`PageSize` 1–100, varsayılan 10).
- **Giriş:** Kilitlenme ve doğrulanmamış e-posta için ayrı mesajlar; geliştirmede başarısız girişin nedeni API konsoluna yazılır. Demo şifreleri Türkçe karakter içermeyecek şekilde değişti (bkz. DEMO-VERI.md).
