# Otomatik ilan yayını

Bu dalı indirdikten sonra çalışan API ve Web pencerelerini kapatıp BASLAT.bat ile yeniden başlatın.

- Yeni ilanlar gerekli bilgi ve 1–10 fotoğraf kontrollerinden sonra yönetici onayı beklemeden yayımlanır.
- Yayın 30 gün sürer. Süre dolunca ilan sahibinin Geçmiş ilanlar bölümüne geçer.
- Otomatik kontroller içerik doğruluğunu veya fotoğraftaki ürünü değerlendirmez.
- Önceden inceleme/yayın bekleyen, gizlenmemiş ve temel kontrolleri geçen kayıtlar yeni 006 geçişiyle 30 günlük yayına alınır. Development ortamında bu geçiş API başlarken otomatik uygulanır.
- Daha önce uygulanan SQL geçişleri değiştirilmedi. Fotoğraflar ve mevcut veriler korunur.

Doğrulama: derleme 0 hata/0 uyarı; 58 C# kontrolü, arayüz testleri ve statik dosya kontrolleri başarılı. SQL geçişi gerçek veritabanında henüz çalıştırılmadı.
