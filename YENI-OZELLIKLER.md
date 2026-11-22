# Yeni özellikler (Kasım 2026)

## Satıcı profili (yenilendi)
- Kapak bandı, kapağa taşan profil fotoğrafı, ad / işletme adı, konum ve üyelik tarihi.
- Rozetler: faaliyet (Üretici, Tüccar…), Kurumsal (beyan), Yeni üye (ilk 30 gün), E-posta doğrulandı, kaç ilan yayında, "Şu an hasatta ürünü var".
- Düğmeler: **Mesaj gönder** (ilan seçilerek; mesajlar ilan üzerinden yürür), **Telefon** (numara görünürse arama bağlantısı), **Paylaş** (telefonda paylaşım menüsü, bilgisayarda bağlantıyı kopyalar).
- Hasadım'a özgü bölümler:
  - **Hazır stok:** ürün başına toplam miktar (ton / balya / dönüm) ve fiyat aralığı.
  - **Ne zaman ne bulunur?:** satıcının ürünlerinin 12 aylık hasat takvimi; bu ay vurgulu.
  - **Ürünlerin çıktığı yerler:** ilan verdiği iller Türkiye haritasında, ilan sayısına göre koyulaşır.
- İlanlar ürüne göre süzülebilir (Tümü, Kiraz (4)…); kartlarda kategori, "Hasat döneminde" etiketi, konum · süre · görüntülenme, fiyat ve miktar.
- Puan / değerlendirme sistemi olmadığı için profilde puan gösterilmez.

## İlan kartlarında fotoğraf gezinme
- Bilgisayarda fareyi kart görselinin üzerinde sağa-sola gezdirince ilanın diğer fotoğrafları görünür; fare çıkınca ilk fotoğrafa döner. Altta kaç fotoğraf olduğunu gösteren noktalar çıkar.
- Telefonda görsel sağa-sola kaydırılınca sonraki/önceki fotoğraf gelir (kaydırma ilanı açmaz).
- Pazar yeri ve satıcı profilindeki kartlarda çalışır; liste API'si artık ilan başına en fazla 6 fotoğraf adresi döndürür.

## Kategoriler ve satılık arazi
- Ana kategoriler: **Meyve, Tahıl, Yem ve balya, Bal ve arı ürünleri, Kuruyemiş, Satılık arazi**.
  - Tahıl: buğday, arpa, yulaf, mısır, çavdar, tritikale, çeltik.
  - Yem: yonca, saman, fiğ ve yulaf otu balyası, mısır silajı, korunga. Satış birimi **balya** veya kg seçilebilir.
  - Bal: bal (çam, çiçek, kestane…), polen, propolis, arı sütü, balmumu.
  - Kuruyemiş: ceviz, fındık, Antep fıstığı, badem, kestane, yer fıstığı, kuru kayısı, kuru incir, kuru üzüm.
- **Arazi ilanı** satılık veya **kiralık** olabilir (kiralıkta fiyat yıllık kira bedelidir; pazar yerinde "İşlem tipi" filtresi var). Ayrı alanlarla girilir:
  - Alan (m², dönüm karşılığı otomatik) ve toplam satış fiyatı (m² fiyatı otomatik).
  - İmar ve tapu durumu (zorunlu), sulama, ada/parsel, elektrik, yol cephesi.
  - Ürün alanları (ambalaj, minimum alım, hasat tarihi) arazide kullanılmaz.
- İlan verirken (isteğe bağlı) **haritada konum** işaretlenebilir.
- Arazi tutarları kuruşsuz gösterilir (ör. ₺4.750.000).
- Veritabanı güncellemeleri: `012_CategoriesEngagement.sql`, `013_LandRental.sql`. API geliştirme ortamında açılınca kendiliğinden uygulanır.

## Ürün takvimi
`/html/urun-takvimi.html`: ürünlerin hasat ve yoğun hasat aylarını gösteren tablo. Bu ay hasatta olan ürünler üstte listelenir. Ürüne basınca o ürünün ilanları açılır.

## Harita
`/html/harita.html` sayfasında iki görünüm var:
- **İl haritası:** 81 il kutu olarak gösterilir; renk ilan yoğunluğunu belirtir. Bir ile basınca o ilin ilanları açılır.
- **Sokak haritası:** OpenStreetMap üzerinde ilanlar fiyat etiketiyle görünür. Konumu işaretlenmemiş ilanlar il merkezine yakın, yaklaşık konumda gösterilir.

İlan detayında da küçük bir konum haritası bulunur. Harita karoları OpenStreetMap'ten gelir. Trafik büyürse kendi karo sağlayıcımıza (ör. MapTiler) geçmek gerekir; adres `js/mini-map.js` içindeki `TILE_URL` satırındadır.

## Teklifler (Tekliflerim)
- Alıcı ilan detayındaki **Teklif ver** düğmesiyle teklif gönderir. Üründe birim fiyat ve miktar, arazide toplam fiyat girilir.
- Satıcı teklifi kısa bir notla kabul eder veya reddeder; alıcı yanıt bekleyen teklifini geri çekebilir.
- Bir alıcının aynı ilanda yalnızca bir bekleyen teklifi olabilir.

## Bildirimler
Üst menüdeki zil, okunmamış bildirim sayısını gösterir. Bildirim gönderilen durumlar:
- yeni mesaj,
- teklif geldiğinde, kabul veya reddedildiğinde, geri çekildiğinde,
- kayıtlı aramaya uyan yeni ilan yayına girdiğinde,
- favorideki ilanın fiyatı düştüğünde.

Hangi bildirimlerin alınacağı Ayarlar sayfasından seçilir.

## Kayıtlı aramalar
Pazar yerinde filtre seçildikten sonra **☆ Bu aramayı kaydet** düğmesi görünür. En fazla 20 arama kaydedilebilir ve her biri için yeni ilan bildirimi açılıp kapatılabilir.

## Üye engelleme
- İlan detayındaki **Satıcıyı engelle** bağlantısıyla bir üye engellenir.
- Engellenen üyenin ilanları görünmez; iki taraf da birbirine mesaj ve teklif gönderemez.
- Aralarında yanıt bekleyen teklifler kapanır.
- Engeller **Engellenen üyeler** sayfasından kaldırılır.

## Ayarlar
Ayarlar alt alta bir liste olarak görünür; bir bölüme basınca o bölüm ayrı açılır (← Ayarlar ile listeye dönülür). Mobilde Hesabım menüsü yana kaymaz, "Hesabım" düğmesiyle alt alta açılır.
- **Tema:** Cihaza göre, açık veya koyu.
- **Dil:** Türkçe veya English.
- Bildirim tercihleri ve gizlilik bağlantıları.
- **Hesabı sil:** Şifresi olan hesapta şifre, tüm hesaplarda "HESABIMI SİL" onayı istenir. Silmede şunlar olur:
  - İlanlar yayından kalkar.
  - Kişisel bilgiler, favoriler, kayıtlı aramalar ve bildirimler silinir.
  - Bağlı Google/Apple hesapları ve telefon kaldırılır.
  - Karşı tarafın mesaj geçmişinde ad "Silinmiş üye" olarak görünür.

  Bu özellik App Store ve Google Play için de zorunludur.

Tercihler cihazda hemen uygulanır. Giriş yapılmışsa sunucuya da kaydedilir ve diğer cihazlara gelir.

## Hesabım menüsü
Tüm hesap sayfalarında aynı yan menü (mobilde yatay şerit) kullanılır:
- **İlanlar ve alışveriş:** İlanlarım, Favorilerim, Mesajlarım, Tekliflerim, Kayıtlı aramalar, Bildirimler.
- **Hesap:** Profil, Ayarlar, Engellenen üyeler, Hesap güvenliği.

## Koyu mod
`css/tema-koyu.css` dosyası diğer stil dosyalarından **otomatik üretilir**. Stil değiştirdiğinde şu komutu tekrar çalıştır:
```
python tools/koyu-tema-uret.py
```

## İngilizce
- Sayfalar Türkçe yazılır. İngilizce seçilince metinler `js/i18n-en.js` sözlüğünden çevrilir; sözlükte olmayan metin Türkçe kalır.
- Kullanıcıların yazdığı içerik (ilan başlığı, açıklama, mesaj) çevrilmez.
- Bazı sunucu hata mesajları henüz Türkçedir.

## Yeni API uçları (web ve mobil ortak)
| Uç | Açıklama |
|---|---|
| `GET /api/meyve-ilanlari?kategori=Arazi&imarDurumu=…&tapuDurumu=…` | Yeni filtreler |
| `GET /api/meyve-ilanlari/harita?kategori=&meyveTuru=&il=` | İl sayıları + en yeni 500 ilan noktası |
| `GET/POST /api/offers`, `POST /api/offers/{id}/accept\|reject\|withdraw` | Teklifler (`?kutu=gelen\|giden`) |
| `GET /api/notifications`, `GET /api/notifications/count`, `POST /api/notifications/read`, `POST /api/notifications/{id}/read`, `DELETE /api/notifications/{id}` | Bildirimler |
| `GET/POST /api/saved-searches`, `POST /api/saved-searches/{id}/notify?on=true`, `DELETE /api/saved-searches/{id}` | Kayıtlı aramalar |
| `GET /api/blocks`, `POST/DELETE /api/blocks/{userId}` | Engelleme |
| `GET/PUT /api/me/settings` | Dil, tema, bildirim tercihleri |
| `POST /api/account/delete` | Hesap silme |

## Demo verisi
`DEMO-VERI.bat` artık şunları yükler:
- 75 meyve ilanı ve 25 tahıl/yem/bal/kuruyemiş/arazi ilanı (bir kısmı haritada işaretli),
- örnek teklifler, kayıtlı aramalar ve bildirimler.

Hesaplar ve şifreler aynı kaldı.

## Hesap güvenliği
- **Güvenlik durumu** puanı ve kontrol listesi: e-posta, telefon, şifre, iki adımlı doğrulama.
- **Açık oturumlar:** Hesabın açık olduğu cihazlar listelenir ("Chrome · Windows", "Safari · iPhone"). Tek bir oturum veya bu cihaz dışındaki tüm oturumlar kapatılabilir; kapatılan cihaz bir sonraki işleminde çıkış yapmış olur.
- **Giriş yöntemleri:** E-posta/şifre, telefon (SMS), Google ve Apple. Google/Apple bağlantısı kaldırılabilir; hesaba girmenin son yolu kaldırılamaz.
- **Son giriş hareketleri:** Son 15 başarılı giriş ve başarısız deneme.
- **Yeni cihaz uyarısı:** Daha önce görülmemiş bir cihazdan giriş yapılınca bildirim gelir.
- Güvenlik ipuçları (kapora dolandırıcılığı, kod paylaşmama vb.).
- Veritabanı güncellemesi: `014_AccountSecurity.sql`.
- Yeni API uçları: `GET /api/account/security`, `DELETE /api/account/sessions/{id}`, `POST /api/account/sessions/end-others`, `DELETE /api/account/logins/{provider}`.

## Sayfa yükleme ve bekleme ekranı
- `js/yukleme.js` + `css/yukleme.css` her sayfada head içinde yüklenir.
- Açılışta üst menü, alt bölüm, sayfa betikleri, çeviri ve sayfanın ilk API istekleri bitene kadar içerik gizli kalır; hepsi aynı anda belirir. Bekleme ~0,5 saniyeyi geçerse yaprak simgeli Hasadım açılış ekranı görünür. En geç 8 saniyede sayfa yine de gösterilir.
- Sonraki beklemelerde (filtre, sayfa, kaydetme) üstte ince yeşil-altın ilerleme çizgisi; 1,2 saniyeyi geçerse ortada küçük "Yükleniyor…" kartı. Bildirim yoklamaları göstergeyi tetiklemez; bir isteği sessiz yapmak için `fetch(url, { hasadimQuiet: true })`.
- Pazar yeri betikleri artık tek tek sırayla değil, aynı anda indirilip sırayla çalıştırılıyor (`page-loader.js`).
- Sayfa betikleri kendi hazırlık işini `HasadimLoading.track(promise)` ile bildirebilir.

## İl haritası (gerçek il sınırları)
- Harita sayfasındaki il haritası artık kutulardan değil, Türkiye'nin gerçek il sınırlarından çiziliyor (SVG). Her il ayrı bir şekil; renk ilan yoğunluğunu gösterir.
- Bir ile dokununca sağdaki kartta il adı, ilan sayısı, o ildeki öne çıkan ürünler ve "… ilanlarını gör" bağlantısı çıkar. Klavyeyle de (Tab + Enter) gezilebilir.
- Sığmayan veya üst üste binen il adları gizlenir, üzerine gelince görünür; ilanı olan illerin adı önceliklidir. Telefonda harita yana kaydırılarak gezilir.
- Veri: `tools/veri/tr-iller-osm.json` (© OpenStreetMap katkıcıları, ODbL; github.com/cihadturhan/tr-geojson). `python tools/il-haritasi-uret.py` sadeleştirip `js/turkiye-iller.js` (~55 KB) dosyasını üretir.

## İlan detayında konum kartı
- Başlıkta "İlçe, İl", altında konumun satıcı tarafından mı işaretlendiği yoksa yaklaşık mı olduğu; altta harita ve "Haritada aç" / "Yol tarifi" düğmeleri.

## Mobil uygulama (mobile/)
Expo (iOS + Android). Ayrıntılı kurulum için `mobile/README.md` dosyasına bak. Uygulama web'deki bütün özellikleri içerir ve verileri aynı API'den alır. Ortak veriler (katalog, ürün simgeleri, il/ilçe, il sınırları, İngilizce sözlük) web dosyalarından `tools/mobil-veri-uret.js` ile aktarılır; böylece tek bir kaynak vardır.

### Sunucu tarafı: mobil giriş
- **Uçlar:** `POST /api/mobile/auth/{login | two-factor | external | phone | refresh | logout}`.
- **Anahtarlar:** çerez yerine iki anahtar kullanılır:
  - **erişim anahtarı:** 15 dakika geçerli, `Authorization: Bearer hsa_…` başlığıyla gönderilir;
  - **yenileme anahtarı:** 30 gün geçerli, oturum en fazla 90 gün sürer.
- **Saklama:** anahtarlar 256 bit rastgele üretilir. Veritabanında (`MobileTokens`, migration 015) yalnızca SHA-256 özetleri tutulur.
- **Doğrulama:** aynı denetleyiciler hem çerezle hem anahtarla çalışır. Hangisinin kullanılacağını bir yönlendirme şeması belirler: Bearer başlığı varsa anahtar, yoksa çerez.
- **Oturum kaydı:** her mobil giriş `UserSessions` tablosunda ayrı bir oturumdur. "Hesap güvenliği" sayfasında "Hasadım uygulaması · Android/iPhone" olarak görünür ve oradan kapatılabilir.
- **CSRF:** jeton istenmeyen istekler yalnızca şunlardır:
  - Bearer ile kimliği doğrulanmış istekler;
  - `[MobileEndpoint]` işaretli uçlara (giriş, kayıt, şifremi unuttum, SMS kodu) `X-Hasadim-Client: mobile` başlığıyla ve çerezsiz gelen istekler.
- **Web aracı:** `Authorization`, `X-Hasadim-Client` ve `User-Agent` başlıklarını API'ye iletir. Web oturumlarında cihaz adı da artık doğru görünür.

### Güvenlik: hangi riske karşı ne yapıldı
| Risk | Önlem |
| --- | --- |
| Telefon çalınır veya yedeği alınır | Yenileme anahtarı iOS Anahtar Zinciri / Android Keystore'da `WHEN_UNLOCKED_THIS_DEVICE_ONLY` olarak saklanır: cihaz kilitliyken okunamaz, yedekle başka cihaza geçmez. Android'de `allowBackup: false`. Erişim anahtarı yalnızca bellektedir. İsteğe bağlı **uygulama kilidi** açılışta ve 1 dakikadan uzun arka planda kalınca Face ID / parmak izi ister, uygulama değiştiricide ekranı gizler. |
| Anahtar çalınır | Erişim anahtarı 15 dakikada geçersizleşir. Yenileme anahtarı her kullanımda değişir; eski bir yenileme anahtarı tekrar gelirse çalınma sayılır, oturum tamamen kapatılır ve kullanıcı yeniden giriş yapar. Oturum Hesap güvenliği sayfasından da uzaktan kapatılabilir. |
| Şifre değişikliği veya sıfırlama sonrası eski oturum | Anahtar, verildiği andaki güvenlik damgasına bağlıdır. Şifre değişince, sıfırlanınca veya "tüm oturumları kapat" seçilince bütün mobil oturumlar geçersizleşir. |
| Kaba kuvvet ve kod deneme | Mobil uçlar da `auth` hız sınırının içindedir. 5 hatalı şifre girilince hesap 15 dakika kilitlenir. Hatalı iki adımlı doğrulama kodları da kilit sayacına eklenir. Başarısız denemeler giriş hareketlerine yazılır. |
| İki adımlı doğrulamanın atlanması | Şifre doğru olsa bile anahtar verilmez. Yalnızca 5 dakika geçerli, şifreli ve imzalı bir bilet verilir. Bilet, kullanıcının güvenlik damgasına bağlıdır. |
| Google / Apple kimliğinin taklidi | Kimlik jetonu sunucuda doğrulanır: imza, yayıncı, alıcı (istemci kimliği), süre ve tek kullanımlık nonce. Uygulamada istemci sırrı (client secret) yoktur. Doğrulanmamış bir e-posta hesabına sosyal giriş bağlanmaz. |
| Ağ dinleme (MITM) | Yayın sürümünde yalnızca HTTPS kullanılır; adres kodda denetlenir. iOS'ta App Transport Security açıktır. Şifresiz http yalnızca geliştirme sırasında yerel ağda kullanılabilir. |
| Anahtarın başka bir adrese sızması | Anahtar yalnızca yapılandırılmış sunucunun `/api/` yollarına eklenir. Fotoğraflarda ve dış bağlantılarda (OSM, harita) eklenmez. |
| CSRF / oturum binme | Mobil istekler çerez kullanmaz (`credentials: 'omit'`). Bearer başlığını bir tarayıcı başka bir siteden kendiliğinden gönderemez. Tarayıcıdaki çerezli istekler eskisi gibi CSRF jetonu ister. |
| Fotoğraflarla konum sızması | Seçilen her fotoğraf yüklemeden önce yeniden kodlanır (JPEG, en fazla 1600 px). EXIF bilgileri (GPS, cihaz, tarih) silinir. |
| Zararlı yönlendirme ve bağlantılar | Bildirim bağlantıları yalnızca bilinen uygulama ekranlarına çevrilir; tanınmayan veya dış adresler açılmaz. Rota parametreleri (GUID) denetlenir. |
| Gereksiz izinler | Mikrofon, konum ve rehber izinleri derlemede engellenir. Kamera ve galeri yalnızca fotoğraf eklerken istenir. |
| Kullanıcı içeriğiyle betik çalıştırma | React Native metinleri HTML olarak yorumlamaz; WebView kullanılmaz. Uzaktan kod yüklenmez. |

**Bilinen sınırlar:**
- **Sertifika sabitleme (pinning):** Expo Go ile kullanılamaz, mağaza sürümünde eklenebilir.
- **Root / jailbreak tespiti:** yok.
- **`npm audit` uyarısı:** 3 orta düzey bulgunun kaynağı yalnızca derleme aracındaki `minimatch` (`@expo/fingerprint`). Uygulama paketine girmez.

## Fotoğraf çekme, galeri izni, tarih ve seçim kutuları
- **Web – canlı kamera:** ilan verirken "📷 Fotoğraf çek" düğmesi eklendi (`js/camera-capture.js`).
  - **Bilgisayarda:** kamera görüntüsü pencerede canlı gösterilir; "Çek", "Tekrar çek" ve "Fotoğrafı ekle" adımları var.
  - **Telefon tarayıcısında:** telefonun kendi kamera ekranı açılır.
  - **İşleme:** çekilen fotoğraf en fazla 1600 px JPEG'e çevrilir; konum ve cihaz bilgileri silinir.
  - **İzin:** kamera reddedilirse nasıl izin verileceği yazılır. Pencere kapanınca kamera hemen kapatılır.
  - **Permissions-Policy:** başlığı eklendi: kamera yalnızca bu sitede, mikrofon/konum/ödeme kapalı.
- **Mobil – galeri izni:** galeriden seçim artık izin istemiyor; sistemin fotoğraf seçicisi kullanılıyor ve uygulama yalnızca seçilen fotoğrafları görüyor.
  - Kamera izni yalnızca "Kamera"ya dokununca isteniyor.
  - İzin kalıcı reddedildiyse "Ayarları aç" seçeneği çıkıyor.
  - Android'de gereksiz depolama ve medya izinleri derlemede engellendi.
- **Tarih alanları:** yalnızca takvim simgesine değil, alanın her yerine tıklanınca takvim açılıyor.
- **Seçim kutuları:** yerel açılır listeler ile aranabilir listeler artık aynı görünüyor: aynı ok simgesi, zemin ve yazı ağırlığı. Koyu modda da aynı.
  - Seçeneği olmayan aranabilir liste artık boş görünmüyor, "Seç" yazıyor.
- **Detaylı arama kutusu:**
  - Başlık zeminleri yuvarlak köşelerden taşmıyor.
  - Dar ekranda alanlar tek sütunda; eski iki sütunlu düzen alanları kaydırıyordu.

## Yönetim paneli (`/html/yonetim.html`)
Sitenin geri kalanından ayrı bir çalışma ekranı. Hesap menüsünde yalnızca yöneticilere "Yönetim paneli" bağlantısı görünür (eski `/?view=admin` adresi buraya yönlenir).
- **Özet:** üye, ilan, inceleme bekleyen ilan, açık şikâyet, yeni geri bildirim, askıdaki hesap, son 24 saatteki hatalı giriş ve mesaj sayıları.
- **Geri bildirimler:** durum, tür ve bölüme göre süzme, arama. Bir kayda basınca durum (Yeni → İnceleniyor → Planlandı → Çözüldü / Kapatıldı), kullanıcıya yanıt ve yalnızca yöneticilerin gördüğü iç not girilir. Yanıt yazılınca kullanıcıya bildirim gider.
- **Kullanıcılar:** ad, e-posta veya telefonla arama; "son 7 gün, doğrulanmamış, askıda, yöneticiler" süzgeçleri. Kullanıcı ayrıntısında son giriş denemeleri, açık oturum, şikâyet sayısı ve işlemler: **askıya al / askıyı kaldır, tüm oturumları kapat, yönetici yap / yetkiyi kaldır**.
- **İlan onayı** ve **Şikâyetler:** mevcut onay akışı (ilan detayında Onayla / Düzeltme iste), ilanı gizleme ve şikâyeti kapatma.
- **Denetim kaydı:** hangi yöneticinin ne zaman, hangi IP'den ne yaptığı.

Güvenlik:
- `/api/admin/*` uçları yalnızca `Admin` rolü **ve tarayıcı oturumu (çerez)** ile çalışır; mobil anahtarla yönetim yapılamaz. Yönetici başına dakikada 120 istek sınırı vardır.
- Askıya alma, oturum kapatma ve yetki değişikliği için **şifre yeniden sorulur** (10 dakika geçerli, oturuma bağlı). Hatalı şifre denemeleri denetim kaydına yazılır ve hesap kilidi kuralları geçerlidir.
- Yönetici kendini askıya alamaz, başka bir yöneticiyi askıya alamaz, son yöneticinin yetkisi kaldırılamaz; yetki yalnızca e-postası doğrulanmış hesaba verilir.
- Askıya alınan hesabın tüm web ve mobil oturumları kapanır; giriş denemesinde "hesap askıya alındı" uyarısı görünür.
- `AdminAudit` tablosu veritabanı tetikleyicisiyle **değiştirilemez ve silinemez**.
- Panel sayfası arama motorlarına kapalıdır (`noindex`); tüm metinler `textContent` ile yazılır.

## Öneri ve geri bildirim kutusu
- Web: `/html/geri-bildirim.html` (Hesabım menüsü, üst menü ve alt bilgide bağlantı). Mobil: Hesap → **Öneri ve geri bildirim**.
- Tür (Öneri / Hata bildirimi / Diğer), uygulamanın bölümü (pazar, ilan verme, mesajlar, harita, mobil uygulama…), başlık ve açıklama girilir. Web'de geldiği sayfa isteğe bağlı eklenir; cihaz/tarayıcı bilgisi otomatik kaydedilir.
- Kullanıcı gönderdiklerini, durumlarını ve ekibin yanıtlarını aynı sayfada görür; yanıt gelince bildirim alır.
- Sınırlar: 24 saatte 3 bildirimden sonra görsel kod sorulur, 24 saatte en fazla 10 bildirim gönderilir.

## Robot / insan doğrulaması
Dış hizmet (Google reCAPTCHA vb.) kullanılmaz; kişisel veri üçüncü tarafa gitmez.
1. **Görünmez iş kanıtı:** korunan her istekten önce cihaz, sunucunun verdiği tuzla küçük bir SHA-256 bulmacası çözer (insan için ~0,1–1 sn, binlerce istek gönderen bot için pahalı). Bilet şifreli, 5 dakika geçerli ve **tek kullanımlıktır**.
2. **Görsel kod:** yalnızca çizgilerden oluşan, bozulmuş 5 karakterlik kod (yazı tipi kullanılmaz, OCR'ı zorlaştırır). Şu durumlarda sorulur:
   - **Kayıt, SMS kodu, şifre sıfırlama / doğrulama e-postası:** her zaman.
   - **Giriş:** aynı adresten 2 hatalı denemeden sonra (her zaman sormak için `Security:Human:LoginAlwaysImage=true`).
   - **İlan verme:** 24 saatte **5 ilandan sonra** her yeni ilanda.
   - **Geri bildirim:** 24 saatte 3 bildirimden sonra.
3. **Kesin sınırlar:** 24 saatte en fazla 20 ilan, 2 dakikada en fazla 3 ilan; aşılırsa doğrulamadan bağımsız olarak reddedilir. Hatalı denemeler arttıkça bulmaca zorlaşır.

Ayarlar (`appsettings.json`, isteğe bağlı): `Security:Human:Difficulty` (varsayılan 16 bit; 8–22), `Security:Human:LoginAlwaysImage`.
Not: kendi sunucumuzda üretilen görsel kod, gelişmiş bir saldırganı tek başına durduramaz; asıl koruma iş kanıtı + hız sınırları + tek kullanımlık bilet birleşimidir. Saldırı görülürse Cloudflare Turnstile gibi bir hizmet aynı noktaya (`RequireHuman`) eklenebilir.

Veritabanı: `016_AdminFeedbackHuman.sql` (Feedback, AdminAudit, UserSuspensions, HumanRedemptions).
Yeni API uçları: `GET /api/human/challenge`, `POST /api/feedback`, `GET /api/feedback/mine`, `GET/POST/PUT /api/admin/{me,step-up,stats,users,users/{id}/…,feedback,audit}`.

## QR kod ile web girişi
Bilgisayarda giriş sayfasında **“Mobil uygulamayla QR kod okutarak giriş”** seçilir; telefonda Hasadım uygulamasında **Hesap → Bilgisayarda giriş (QR)** ile kod okutulup onaylanır.

Akış:
1. Tarayıcı `POST /api/account/qr/start` ile istek açar. QR'da `https://<site>/html/qr.html#c=<kod>` yazar (kod 32 bayt rastgele, 2 dakika geçerli). Tarayıcıya ayrıca yalnızca **HttpOnly `__Host-HasadimQr` çerezinde** duran gizli bir anahtar verilir; sayfa betikleri bu anahtarı okuyamaz.
2. Telefon `POST /api/mobile/qr/scan` ile kodu gönderir; istek telefondaki kullanıcıya ve o telefon oturumuna bağlanır. Uygulama tarayıcıyı (ör. “Chrome · Windows”), IP'nin bir kısmını, saati ve QR'ın geldiği siteyi gösterir.
3. Kullanıcı **Giriş yap** derse (cihazda parmak izi/yüz/ekran kilidi varsa önce o sorulur) `POST /api/mobile/qr/decide` çağrılır.
4. Tarayıcı 2 saniyede bir `POST /api/account/qr/poll` ile sorar; onaylandıysa istek tek seferlik “kullanıldı” yapılır ve çerezli oturum açılır. Oturum Hesap güvenliği sayfasında “QR kod (mobil uygulamadan onay)” olarak görünür.

Güvenlik:
- Kod ve tarayıcı anahtarı veritabanında yalnızca SHA-256 özetleriyle saklanır; kod tek kullanımlıktır, 2 dakikada geçersiz olur.
- Onayı yalnızca kodu okutan **mobil uygulama oturumu** verebilir; web çereziyle veya başka bir telefondan onay verilemez.
- Tarayıcı tarafı CSRF korumalıdır; giriş, kodu açan tarayıcının gizli anahtarı olmadan tamamlanamaz (QR'ın fotoğrafını çeken biri giriş yapamaz).
- Askıya alınmış, kilitli veya e-postası doğrulanmamış hesaplar QR ile de giremez. Telefondaki oturum zaten (gerekirse iki adımlı doğrulamayla) açıldığı için onay ikinci etken sayılır.
- Bilinen risk (“QR ele geçirme”): saldırgan kendi tarayıcısındaki QR'ı kurbana okutup onaylatırsa saldırgan girer. Bunu önlemek için onay ekranında tarayıcı/IP/site bilgisi ve açık bir uyarı gösterilir; telefonun kendi kamerasıyla okutulan kod `qr.html` sayfasında aynı uyarıyı verir.

Veritabanı: `017_QrLogin.sql`. Mobil: `expo-camera` eklendi (kamera izni metni güncellendi, mikrofon izni istenmez). Yeni yerel modül olduğu için geliştirme derlemesinin (development build) yeniden alınması gerekir; Expo Go'da doğrudan çalışır.

## Mobil uygulamada Google ile giriş
Expo Go dahil her ortamda çalışan, sunucu üzerinden yürüyen akış:
1. Uygulama sistem tarayıcısında `GET /api/mobile/auth/google/start` açar (PKCE: yalnızca doğrulayıcının SHA-256 özeti gönderilir).
2. Google kullanıcıyı `GET /api/mobile/auth/google/callback` adresine döndürür; sunucu kodu gizli anahtarıyla jetona çevirir ve imza/alıcı/nonce doğrular.
3. Sunucu 2 dakikalık tek kullanımlık bir kodla uygulamaya döner (`hasadim://google-giris`, Expo Go'da `exp://…/--/google-giris`).
4. Uygulama kodu doğrulayıcıyla `POST /api/mobile/auth/google/finish`'e gönderir ve oturum anahtarlarını alır.

Ayarlar (gizli anahtarı **User Secrets**'a yaz, depoya ekleme):
- `Auth:Google:WebClientId` — Google Cloud → Kimlik bilgileri → OAuth istemcisi (Web uygulaması).
- `Auth:Google:ClientSecret` — aynı istemcinin gizli anahtarı (`dotnet user-secrets set "Auth:Google:ClientSecret" "…" --project src/Hasadim.Api`).
- `Auth:Google:MobileRedirectUri` — `https://<site>/api/mobile/auth/google/callback`; aynı adres Google Cloud'da "Yetkili yönlendirme URI'leri"ne eklenmeli. Geçici tünel adresi her açılışta değiştiği için geliştirmede **kalıcı** bir Dev Tunnel kullan.
Ayarlanmamışsa uygulamada düğme "Google ile devam et (yakında)" olarak pasif görünür.

## Diğer
- Web: Apple ile giriş düğmesi şimdilik kaldırıldı (sunucu desteği duruyor).
- Web: QR ile giriş telefon ve tabletlerde (dokunmatik ekran / mobil tarayıcı) gösterilmez.
- Web: Menü panelinde alttaki "Hesap, Ayarlar, Çıkış yap" bölümü görünmeyen ikinci sütuna taşıyordu; düzeltildi, panel ekran yüksekliğine sığıyor ve kayıyor.

## Sebze kategorisi
Meyve ile aynı yapıda yeni ana kategori (`Sebze`): 22 ürün (domates, biber, patlıcan, salatalık, kabak, patates, soğan, sarımsak, havuç, lahana, karnabahar, brokoli, marul, ıspanak, pırasa, fasulye, bezelye, bamya, enginar, turp, mantar, yeşillik) ve "Diğer sebze"; her biri için çeşitler, SVG simge ve hasat takvimi. Web (pazar, filtreler, harita, ürün takvimi, ilan verme, alt bilgi) ve mobil uygulama (veriler `tools/mobil-veri-uret.js` ile üretilir) aynı kataloğu kullanır.
Veritabanı: `018_Sebze.sql` kategori kısıtını günceller. Sebze için demo ilan üretilmez (fotoğraf seti yok).
