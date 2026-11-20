# Hasadım mobil uygulaması (iOS + Android)

Expo SDK 58, Expo Router ve TypeScript ile yazıldı. Bütün veriler web sitesiyle aynı API'den gelir; ayrı bir sunucu yoktur.

## Özellikler

- **Pazar:** arama, kategoriler, detaylı filtreler, sıralama, sonsuz kaydırma (25'er ilan), favoriler ve arama kaydetme.
- **İlan detayı:** fotoğraf galerisi, fiyat (indirim ve m² / dönüm hesabı), bilgiler ve satıcı kartı.
  - Konum haritası, "Haritada aç" ve "Yol tarifi".
  - Teklif verme, mesaj, arama, paylaşma, şikâyet ve satıcıyı engelleme.
  - Kendi ilanında düzenleme, satıldı olarak işaretleme ve silme.
- **İlan ver (4 adım):**
  1. kategori, ürün ve çeşit;
  2. başlık, açıklama ve hasat tarihi;
  3. fiyat, miktar, arazi bilgileri (satılık/kiralık, imar, tapu, sulama, ada/parsel), il/ilçe ve haritada konum;
  4. kamera veya galeriden fotoğraf, önizleme ve yayınlama.
  - Var olan ilanı düzenlerken fotoğraf eklenebilir, silinebilir veya kapak yapılabilir.
- **Mesajlar:** konuşma listesi, arama, okunmamış sayısı, gün ayraçları, okundu işaretleri (✓✓).
- **Harita:** il sınırlarıyla Türkiye haritası, kategori filtresi ve OpenStreetMap sokak haritası.
- **Ürün takvimi:** aylar üstte sabit kalır, içinde bulunulan ay vurgulanır.
- **Hesabım:**
  - ilanlarım, geçmiş ilanlar, favoriler, teklifler (kabul, ret, geri çekme), bildirimler, kayıtlı aramalar, engellenenler ve profil;
  - **hesap güvenliği:** güvenlik puanı, açık oturumlar, bağlı hesaplar ve giriş hareketleri;
  - **ayarlar:** görünüm (cihaza göre / açık / koyu), dil (TR/EN), bildirimler, şifre değiştirme, uygulama kilidi ve hesabı silme.
- **Giriş:** e-posta ve şifre (iki adımlı doğrulama dahil), SMS ile telefon, Google, Apple, kayıt ve şifremi unuttum.

## Çalıştırma

```bash
cd mobile
npm install
npx expo start
```

Telefona **Expo Go** uygulamasını kur ve ekrandaki QR kodu okut.

### Sunucu adresi

Uygulama, web sitesinin (Hasadim.Web) adresine bağlanır ve API isteklerini oradan sunucuya iletir. Adresi şu iki yoldan biriyle ver:

- `EXPO_PUBLIC_API_URL` ortam değişkeni (örnek: `EXPO_PUBLIC_API_URL=https://xxxx.devtunnels.ms npx expo start`)
- `app.json` dosyasında `extra.apiBaseUrl`

Yayın sürümünde adres **https://** ile başlamak zorundadır; başka bir adres verilirse uygulama hiçbir istek göndermez.

Geliştirme sırasında telefondan bilgisayara ulaşmanın en kolay ve güvenli yolu Visual Studio **Dev Tunnels**:

1. Visual Studio'da üst araç çubuğundaki çalıştır düğmesinin yanından **Dev Tunnels → Create a Tunnel** seç. Hesap türü önemsiz; **Tunnel type: Temporary**, **Access: Public** seç.
2. `Hasadim.Web` ile birlikte `Hasadim.Api` projesini de başlat.
3. Tarayıcıda açılan `https://…devtunnels.ms` adresini `EXPO_PUBLIC_API_URL` olarak ver.

Bu adres geliştirme ortamında `appsettings.Development.json` dosyasındaki `AllowedHosts` listesine zaten eklendi.

Aynı Wi-Fi ağında şifresiz `http://192.168.x.x:port` bağlantısına yalnızca geliştirme sırasında ve yalnızca yerel ağ adreslerinde izin verilir.

### Google ve Apple ile giriş

- **Google:** Google Cloud'da iOS ve Android için birer OAuth istemcisi oluştur.
  - İstemci kimliklerini `app.json` → `extra.googleClientIds` alanına yaz.
  - Aynı kimlikleri sunucuda `Auth:Google:MobileClientIds` ayarına ekle.
- **Apple:** Paket kimliği `com.hasadim.app`. Bu değeri sunucuda `Auth:Apple:MobileClientIds` ayarına ekle.

Ayarlanmamış yöntemlerin düğmesi uygulamada görünmez.

## Komutlar

| Komut | Ne yapar |
| --- | --- |
| `npm test` | Biçim, filtre, adres kuralı, mesaj gruplama ve çeviri testleri |
| `npx tsc --noEmit` | Tip denetimi |
| `npx expo lint` | ESLint |
| `npm run i18n-check` | İngilizce karşılığı eksik metinleri listeler |
| `node ../tools/mobil-veri-uret.js` | Web'deki ortak verileri (katalog, simgeler, il/ilçe, il sınırları, sözlük) `src/data` ve `src/i18n/en.ts` dosyalarına yeniden aktarır |

## Yayınlama

`npx eas-cli@latest build --platform all` ile mağaza paketleri bulutta derlenir. `ios/` ve `android/` klasörleri elle düzenlenmez; bütün ayarlar `app.json` dosyasındadır.

## Güvenlik

Ayrıntılar kök klasördeki `YENI-OZELLIKLER.md` dosyasının **Mobil uygulama → Güvenlik** bölümünde.
