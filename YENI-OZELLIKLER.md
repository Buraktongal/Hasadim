# Yeni özellikler (Kasım 2026)

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
