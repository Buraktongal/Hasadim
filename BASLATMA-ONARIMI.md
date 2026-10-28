# GitHub'daki güncel sürümün başlatma onarımı

15 Ekim 2026, burak dalı commit 8d92666 incelendi.

Hasadim.Web.csproj artık mevcut ve çözüm derleniyor. Fakat Web klasöründe appsettings.json ve Properties/launchSettings.json yok. BASLAT.bat Web'i Hasadim.Web profiliyle başlatıyor; profil bulunamayınca Development/7106 ayarları yüklenmiyor. Api:BaseUrl de olmadığından süreç "API adresi gerekli" hatasıyla kapanıyor. Hata ayrı kontrol klasöründe yeniden oluşturuldu.

Onarım paketini `C:\Users\BURAK\source\repos\Hasadim-Net10` klasörüne, Hasadim.slnx yanına çıkar. Klasörleri silmeden içeriği birleştir. Paket şunları içerir:

- src/Hasadim.Web/appsettings.json: API adresi https://localhost:7206.
- src/Hasadim.Web/Properties/launchSettings.json: Development, Web HTTPS 7106.
- src/Hasadim.Web/Hasadim.Web.csproj: proje dosyası.
- BASLAT.bat: gerekli Web dosyalarını başlangıçta kontrol eder.

API ayarları, veritabanı ve App_Data pakette yok; değiştirilmez. BASLAT.bat ile yeniden başlat. API ve Web konsollarında Now listening on görünmesini bekle.

Doğrulama: Güncel GitHub çözümü 0 hata ile derlendi. Eksik dosyalar geri eklendikten sonra Web, Development profiliyle gerçek HTTPS üzerinde başladı. Ana sayfa, HTML, JS ve CSS için 5 HTTPS isteği 200 döndü. Kontrol diğer uygulamalarla port çakışmaması için 7346'da yapıldı; paket normal 7106/7206 ayarlarını içerir. Gerçek API/SQL başlangıcı bu onarımda çalıştırılmadı.
