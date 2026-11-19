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
