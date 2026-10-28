# Kodla kayıt ve Gmail kurulumu

## Kayıt akışı

1. Kullanıcı adını, e-postasını, telefonunu ve hesap şifresini girer.
2. Sunucu bilgileri/şifre kurallarını kontrol edip e-postaya rastgele 6 haneli kod gönderir. Henüz kullanıcı hesabı oluşmaz.
3. Kod 120 saniye geçerlidir. Doğru kod girilirse hesap ve profil tek veritabanı işleminde oluşturulur; e-posta doğrulanmış olur.
4. Kod tek kullanımlıktır. Beş yanlış denemeden sonra kilitlenir. Yeni kod isteği önceki kodu geçersiz kılar; gönderimler arasında en az 60 saniye ve e-posta başına saatte en fazla 5 gönderim sınırı vardır.
5. Telefon profile kaydedilir, ancak SMS hizmeti bağlı olmadığı için doğrulanmış sayılmaz.

Yeni 007 migration Development ortamında API açılırken uygulanır. Mevcut migration dosyaları değiştirilmedi. Bekleyen kayıtta açık hesap şifresi saklanmaz; şifre özeti ve kod Data Protection ile korunur. App_Data/keys klasörü korunmalıdır.

Giriş için e-posta doğrulaması artık zorunludur. Mevcut doğrulanmamış hesaplar, Şifremi unuttum sayfasındaki doğrulama bağlantısını yeniden gönderme işlemini kullanabilir. Mevcut hesapların bağlantı ile doğrulaması korunmuştur; 6 haneli kod yeni hesap açılışı içindir.

## Gmail'i yerel bilgisayarda bağlama

Normal Google hesap şifresi kullanılmaz. Sohbette paylaşılan şifreyi değiştirin; yeni şifreyi sohbete veya Git'e göndermeyin.

1. Google hesabınızda 2 Adımlı Doğrulama'yı etkinleştirin.
2. https://myaccount.google.com/apppasswords adresinden Hasadım için uygulama şifresi oluşturun.
3. Proje kökünde EPOSTA-KUR.bat dosyasını çalıştırın. Gönderici Gmail adresinizi ve 16 harfli uygulama şifresini yalnızca açılan yerel pencerede girin.
4. API ve Web konsollarını kapatıp BASLAT.bat ile yeniden başlatın. Kayıt ol sayfasından erişebildiğiniz bir e-postayla kod isteyerek teslimatı test edin.

Kurulum smtp.gmail.com:587, TLS ve gönderici hesabını .NET User Secrets içine kaydeder; şifre Git'e veya proje dosyasına yazılmaz. User Secrets yerel geliştirme içindir ve şifreli bir kasa değildir. Canlı sunucuda aynı Mail ayarlarını sunucunun gizli ayar yönetiminden sağlayın. Google açıklaması: https://support.google.com/accounts/answer/185833?hl=tr

Gerçek Gmail uygulama şifresi henüz girilmediğinden SMTP teslimatı doğrulanmadı. Kod ve veritabanı testlerinin geçmesi e-posta teslim edildiği anlamına gelmez.

## Testler

- TEST.bat: yerel C# ve arayüz testleri; kayıt ekranı için tests/registration-ui.cjs eklendi.
- dotnet run --project tests/Hasadim.SqlTests: ayrı, geçici LocalDB veritabanında kod süresi, yanlış deneme, tekrar kullanım, eşzamanlı doğrulama, profil telefonu ve kayıt bütünlüğü testleri.
- tests/Sql-Smoke.ps1 artık otomatik doğrulanmamış hesap açmaz. SellerEmail ve BuyerEmail olarak önceden doğrulanmış iki test hesabı ister; hesap şifreleri yerel pencerede girilir. Test yalnızca test ortamında çalıştırılmalıdır; satıcı profilini ve test ilanlarını değiştirir.
