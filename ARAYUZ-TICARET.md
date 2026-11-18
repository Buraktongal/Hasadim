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
