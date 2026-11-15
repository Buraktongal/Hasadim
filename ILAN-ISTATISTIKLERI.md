# İlan istatistikleri ve düzenleme

- İlan kartları, detay ve satıcı sayfasında görüntülenme/favori sayıları bulunur.
- Detay açılışı sekme oturumu boyunca bir kez sayılır; satıcının kendi açılışı sayılmaz. Bu sayı tekil kişi sayısı değildir. Önceki görüntülenmeler geriye dönük hesaplanmaz.
- Favori sayısı mevcut favori kayıtlarından hesaplanır.
- Yayındaki ilan sahibi tarafından düzenlenebilir. Süresi dolan, gizlenen ve silinen ilanlarda düzenleme kapalıdır. Mevcut sürüm kontrolü korunur.
- Düzenleme yayın tarihini veya 30 günlük bitiş tarihini değiştirmez.
- Fiyat düşüşünde hemen önceki ilan fiyatı saklanır ve indirim yüzdesi bir ondalık basamağa yuvarlanır. Fiyat değişmezse gösterim korunur; artarsa kaldırılır.
- Yayın tarihi saat olmadan gösterilir.
- Yeni 010 migration geliştirme ortamında API açılışında uygulanır. Önceki migration dosyaları değiştirilmedi.

Doğrulama: derleme, alan kuralları, arayüz davranış testleri ve ayrı LocalDB üzerinde eşzamanlı sayaç/fiyat/yayın süresi kontrolleri. Gerçek tarayıcı görünümü bu değişiklikte doğrulanmadı.
