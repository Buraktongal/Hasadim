# Mimari ve kapsam

## Projeler

| Proje | Görev | Bağımlılık |
|---|---|---|
| Hasadim.Core | GUID kimlikli ilan modeli, temel iş kuralları | Diğer projelere bağımlı değil |
| Hasadim.Application | Kullanım senaryoları, DTO, sahiplik ve erişim kontrolleri, repository arayüzü | Core |
| Hasadim.Infrastructure | Dapper repository, SQL migration, Identity kullanıcı/rol depoları | Core, Application |
| Hasadim.DependencyInjection | Servis ve Identity kayıtları | Application, Infrastructure |
| Hasadim.Api | HTTP endpoint'leri, kimlik/oturum, CSRF, hız sınırı, medya erişimi | Application, DependencyInjection; Identity uygulama türlerine erişim |
| Hasadim.Web | Ayrı web sunucusu, HTML/CSS/JS, yalnızca yapılandırılmış API'ye aynı-origin geçiş | Diğer projelere bağımlı değil |
| Hasadim.Tests | Bağımlılıksız çalıştırılabilir iş kuralı testleri | Application ve ASP.NET ortak kütüphanesi |

API controller'larında SQL bulunmaz. MarketplaceService işlemleri yönetir; Infrastructure'daki repository parametreli sorguları çalıştırır. Sıralama alanı kullanıcı SQL'i olarak eklenmez; izin verilen sabitlerden seçilir. Identity kendi UserManager / SignInManager bileşenleri ile çalışır; veri depoları Dapper ile uygulanmıştır. Parola kriptografisi yeniden yazılmamıştır.

Web tarayıcısı kendi origin'indeki `/api/...` adreslerine istek gönderir. Web sunucusu yalnızca yapılandırılmış HTTPS API'ye iletir; cookie ve CSRF başlığı korunur. SQL bağlantısı ve kimlik yönetimi Web'de yoktur. Oturum cookie'si JavaScript'ten okunamaz; localStorage'da parola veya giriş token'ı tutulmaz.

## Kimlik ve erişim

- Microsoft ASP.NET Core Identity; `IdentityUser<Guid>` ve `IdentityRole<Guid>`.
- PasswordHasher: rastgele salt, PBKDF2, 210.000 iterasyon. Parola düz metin saklanmaz.
- HTTPS, Secure/HttpOnly cookie, SameSite, state-changing isteklerde CSRF.
- 30 dakika hareketsizlikte oturum süresi; aktif kullanımda kayan süre.
- Security stamp her kimlikli istekte doğrulanır. Şifre değişikliği ve logout-all eski oturumları sonraki istekte reddeder.
- Beş başarısız şifre girişinde 15 dakika kilit. Kimlik endpoint'lerinde ve genel API'de IP hız sınırı.
- TOTP 2FA ve atomik tüketilen, SHA-256 özetli kurtarma kodları. TOTP anahtarı Data Protection ile şifrelenir.
- SMTP ile e-posta doğrulama, tekrar gönderme ve bir saatlik şifre sıfırlama bağlantısı.
- Kayıt/giriş/2FA için ayrı arayüzler. Parola veya token loglanmaz.
- İlan sahibi sunucudaki oturumdan alınır; istemcinin gönderdiği OwnerId kabul edilmez.
- Sadece sahibi ilanını düzenler/siler. Yönetici şikâyetlerden ilan gizler/geri gösterir.

## İlan ve iletişim

- Bir kullanıcı birden fazla ilan oluşturabilir. Her create işleminde yeni GUID üretilir.
- Yeni ilan formu id ve version alanlarını açıkça temizler; önceki ilanı güncellemez.
- Rowversion ile kayıp güncelleme engellenir; çakışma HTTP 409 döner.
- Silme soft-delete yapar. Eski mesajlar saklanır; silinen ilana yeni mesaj gönderilemez.
- Favoriler (UserId, ListingId) birleşik anahtarıyla tekilleştirilir.
- İlan arama, meyve/şehir/fiyat filtreleri, sıralama, 12'li sayfalama.
- Bir fotoğraf, en fazla 5 MB; JPG/PNG/WebP imza kontrolü. Dosyalar public wwwroot dışında tutulur ve ilan görünürlüğü kontrol edilerek API'den servis edilir. Tam görüntü yeniden kodlama/antivirüs taraması henüz yoktur. Değiştirilen fotoğrafın eski dosyası korunur; periyodik yetim medya temizliği sonraki geliştirmedir.
- Mesaj alıcıları sunucuda denetlenir; satıcı yalnızca kendisine yazmış alıcıya yanıt verebilir. Mesajlar 50'li sayfalanır ve Yenile ile güncellenir.
- Açık şikâyetler kullanıcı/ilan bazında tekilleştirilir. Yönetim en eski 100 açık şikâyeti gösterir; kapatılanlar yerini sonrakilere bırakır.

## Bilinçli sınırlar

Mobil uygulama ve mobil OAuth/OIDC token akışı bu pakette yoktur. API webten bağımsızdır; mobil aşamada sistem tarayıcısıyla Authorization Code + PKCE ve uygun kimlik sunucusu entegrasyonu ayrıca yapılmalıdır. Bu sürümde cookie + CSRF oturum modeli vardır; JWT varmış gibi kullanılmamalıdır.

Teklif, ödeme, nakliye, bildirim servisleri, gelişmiş kullanıcı yönetimi, gerçek zamanlı mesajlar, 2FA cihaz yenileme arayüzü ve kullanıcı silme dahil değildir. Bunlar ayrı kullanım senaryoları olarak genişletilebilir.

## Kaynaklar

- https://github.com/Buraktongal/UstamYolda (incelenen master: 05a2c15823cb55473f93327746a9bee4e28cd8ae)
- https://learn.microsoft.com/en-us/aspnet/core/security/authentication/identity-custom-storage-providers?view=aspnetcore-10.0
- https://learn.microsoft.com/en-us/aspnet/core/security/anti-request-forgery?view=aspnetcore-10.0
- https://github.com/DapperLib/Dapper
