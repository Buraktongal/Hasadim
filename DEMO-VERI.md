# Demo verisi (yalnızca geliştirme)

`DEMO-VERI.bat` geliştirme veritabanını sıfırlar ve örnek verilerle doldurur.

**Silinenler:** tüm kullanıcılar, profiller, ilanlar, ilan fotoğrafları (App_Data/photos), profil fotoğrafları (App_Data/profiles), mesajlar, favoriler, şikâyetler, görüntülenme sayıları, bekleyen kayıt kodları. Roller ve veri koruma anahtarları korunur.

**Oluşturulanlar:** 1 yönetici, 5 kullanıcı, 100 yayında ilan (her kullanıcıya 20; kendi bölgesindeki meyvelerden, 1–3 fotoğraf, rastgele fiyat/miktar/ambalaj/teslimat, bazılarında fiyat düşüşü, görüntülenme sayısı ve diğer kullanıcılardan favoriler).

## Çalıştırma
1. API konsolunu kapat (Ctrl+C).
2. `DEMO-VERI.bat` dosyasına çift tıkla ve **E** ile onayla.
   Alternatif: `dotnet run --project src\Hasadim.Api --launch-profile Hasadim.Api -- --seed-demo`
3. `BASLAT.bat` ile uygulamayı aç.

Komut yalnızca `Development` ortamında çalışır; canlı ortamda hata verip durur.

## Hesaplar
| Rol | E-posta | Şifre | Ad / Firma | Konum |
|---|---|---|---|---|
| Yönetici | yonetici@hasadim.test | Hasadim2026Yonetim | Hasadım Yönetim | Ankara / Çankaya |
| Kullanıcı | ahmet@hasadim.test | Hasadim2026Demo | Ahmet Yılmaz (üretici) | Isparta / Eğirdir |
| Kullanıcı | ayse@hasadim.test | Hasadim2026Demo | Ayşe Demir (üretici) | Mersin / Erdemli |
| Kullanıcı | mehmet@hasadim.test | Hasadim2026Demo | Mehmet Kaya — Kaya Tarım Ürünleri (tüccar) | Antalya / Korkuteli |
| Kullanıcı | fatma@hasadim.test | Hasadim2026Demo | Fatma Çelik — Alaşehir Bağcılar Kooperatifi | Manisa / Alaşehir |
| Kullanıcı | mustafa@hasadim.test | Hasadim2026Demo | Mustafa Şahin — Şahin Yaş Meyve (tüccar) | Malatya / Yeşilyurt |

Bu şifreler yalnızca yerel geliştirme içindir; gerçek ortamda kullanma.
Fotoğraflar `src/Hasadim.Api/SeedData/photos` içindeki çizim görsellerdir (gerçek ürün fotoğrafı değildir).
