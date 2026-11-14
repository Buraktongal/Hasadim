# Otomatik mesaj bildirimleri

Pazar yeri, ilan detayı ve Mesajlarım ekranında oturum açıkken yeni mesajlar kontrol edilir. Ön plandaki sekmede kontrol aralığı 10 saniye, arka plandaki sekmede 30 saniyedir; tarayıcı arka plan zamanlayıcılarını ayrıca yavaşlatabilir. Sekmeye dönüldüğünde hemen kontrol yapılır.

Menü kapalıyken de okunmamış sayısı menü düğmesinde görünür. Yeni gelen mesaj üstte “Mesajları aç” bağlantılı bildirim oluşturur. Bildirimi kapatmak mesajı okundu saymaz. Görünen konuşmadaki alınan mesajlar okundu kaydedilir; mobilde yalnızca konuşma listesi açıksa mesajlar okunmuş sayılmaz. Yenileme sırasında yazılan taslak korunur. Değişmeyen mesajlar ekranı yeniden oluşturmaz.

Bu özellik uygulama içi bildirimdir. Tarayıcı kapalıyken telefon/masaüstü push bildirimi göndermez.

## Kurulum

Yeni `008_MessageReadState.sql` geçişi ReadAt alanını ve okunmamış mesaj indeksini ekler. Önceden uygulanmış geçiş dosyaları değiştirilmez. Geliştirme ortamında API yeniden başlatıldığında geçiş otomatik uygulanır. Üretimde dağıtım adımı olarak:

```sh
dotnet run --project src/Hasadim.Api -- --migrate
```

Geçişten önceki mesajların okunma bilgisi bulunmadığı için eski gelen mesajlar ilk açılışta okunmamış sayılır.

## Doğrulama

- `node tests/ui-smoke.cjs`: otomatik kontrol, tek zamanlayıcı, kapalı menü sayacı, yeni bildirim, bildirimi kapatma, ağ hatasında sayacın korunması ve çıkış.
- `node tests/static-paths.cjs`: yeni dosyaların yolları ve JavaScript sözdizimi.
- `dotnet run --project tests/Hasadim.SqlTests`: ayrı geçici veritabanında 101 kontrol; yalnızca alıcının okundu işaretleyebilmesi, idempotent güncelleme ve kalıcı okunma durumu dahil.
