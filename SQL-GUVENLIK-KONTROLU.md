# SQL ve giriş güvenliği kontrolü

İncelenen Dapper kullanıcı, rol, profil, ilan, mesaj ve kayıt sorgularında kullanıcı girdisini SQL komutuna doğrudan ekleyen bir kullanım bulunmadı. Giriş e-posta ile hesap bulur; parolayı ASP.NET Core Identity doğrular. Tek tırnak içeren bir metin, parametreli sorguda komut olarak çalışmaz.

## Yapılan sıkılaştırmalar

- Kullanıcı arama yardımcısı artık SQL koşulu metni kabul etmiyor. Kimlik, kullanıcı adı ve e-posta için yalnızca üç sabit sorgudan seçim yapıyor. Aranan değer her zaman Dapper parametresi.
- İlan sıralaması sunucuda `new`, `priceAsc`, `priceDesc` ile sınırlandı. Depodaki sabit ORDER BY seçenekleri de korunuyor.
- İsim ve parolalardan tek tırnak silinmiyor; güvenlik karakter kara listesi yerine parametreli sorgularla sağlanıyor.

## Doğrulama

`dotnet run --project tests/Hasadim.SqlTests`

Bu komut rastgele isimli ayrı bir LocalDB test veritabanı oluşturur ve sonunda yalnızca bu veritabanını kaldırır. Gerçek kullanıcı verilerini kullanmaz.

SQL enjeksiyonu örnekleri e-posta, kullanıcı adı, kimlik, rol, arama, il, ürün ve sıralama alanlarında sınanır. Parola denemeleri uygulamanın gerçek Identity ayarlarıyla `CheckPasswordSignInAsync` üzerinden yapılır. Dolu tablolarla hesap seçiminin ve filtrelerin aşılamadığı, tabloların değişmediği, beş yanlış parolada kilitleme ve doğrulanmamış e-posta engeli kontrol edilir. Meşru tek tırnak içeren isimlerin korunması da sınanır.

Son çalıştırma: 94 SQL/Identity kontrolü ve 67 uygulama kontrolü geçti; çözüm sıfır hata ve sıfır uyarıyla derlendi.

Bu çalışma canlı sisteme karşı HTTP sızma testi değildir; çerez oluşturma, ters vekil yapılandırması ve dağıtılmış saldırı senaryolarının uçtan uca doğrulaması bu testin kapsamında değildir. Tüm güvenlik açıklarının giderildiği iddiası taşımaz.
