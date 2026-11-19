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
| Yönetici | yonetici@hasadim.test | AdminPanel2026 | Hasadım Yönetim | Ankara / Çankaya |
| Kullanıcı | ahmet@hasadim.test | DemoUser2026 | Ahmet Yılmaz (üretici) | Isparta / Eğirdir |
| Kullanıcı | ayse@hasadim.test | DemoUser2026 | Ayşe Demir (üretici) | Mersin / Erdemli |
| Kullanıcı | mehmet@hasadim.test | DemoUser2026 | Mehmet Kaya — Kaya Tarım Ürünleri (tüccar) | Antalya / Korkuteli |
| Kullanıcı | fatma@hasadim.test | DemoUser2026 | Fatma Çelik — Alaşehir Bağcılar Kooperatifi | Manisa / Alaşehir |
| Kullanıcı | mustafa@hasadim.test | DemoUser2026 | Mustafa Şahin — Şahin Yaş Meyve (tüccar) | Malatya / Yeşilyurt |

Şifrelerde Türkçe karakter yoktur; büyük/küçük harfe dikkat et. Yalnızca yerel geliştirme içindir.
Şifre değiştiyse veya hesap kilitlendiyse `DEMO-VERI.bat` dosyasını yeniden çalıştırman yeterli.
Fotoğraflar `src/Hasadim.Api/SeedData/photos` içindeki çizim görsellerdir (gerçek ürün fotoğrafı değildir).
