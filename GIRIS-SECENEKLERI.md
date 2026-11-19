# Giriş seçenekleri: Google, Apple, telefon

Giriş ve kayıt sayfalarında **Google ile devam et**, **Apple ile devam et** ve **Telefon numarasıyla giriş** seçenekleri var. Gmail hesapları "Google ile devam et" ile girer. Ayarlar boşken düğmeler "yakında" olarak pasif görünür; e-posta + şifre girişi her zaman çalışır.

Aynı API uçları mobil uygulama tarafından da kullanılacak:

| Uç | Ne yapar |
|---|---|
| `GET /api/account/providers` | Hangi seçeneklerin açık olduğunu ve herkese açık istemci kimliklerini döner |
| `POST /api/account/external` | `{ provider: "google" \| "apple", idToken, nonce?, displayName? }` — sağlayıcının kimlik belirtecini doğrular, hesap yoksa oluşturur, varsa bağlar, oturum açar |
| `POST /api/account/phone/start` | `{ phone }` — doğrulanmış numaraya 6 haneli SMS kodu gönderir |
| `POST /api/account/phone/confirm` | `{ challengeId, code }` — kodu doğrular, oturum açar |
| `POST /api/account/me/phone/start` / `confirm` | Profildeki telefonu SMS ile doğrular (Profilim → Telefon → "Telefonumu doğrula") |

## Güvenlik kuralları
- Google/Apple belirteçleri sunucuda doğrulanır: imza (sağlayıcının yayımladığı anahtarlar), yayımlayan, hedef kitle (bizim istemci kimliklerimiz), süre ve varsa nonce.
- Sağlayıcıdaki e-posta **doğrulanmış** olmalıdır. Aynı e-postayla doğrulanmış bir Hasadım hesabı varsa ona bağlanır; doğrulanmamış hesaba bağlanmaz.
- Telefonla giriş yalnızca profilde **SMS ile doğrulanmış** numaralar için çalışır. Profilde numara değişirse doğrulama düşer.
- SMS kodu 3 dakika geçerli, en fazla 5 deneme; aynı numaraya 60 saniyede bir, saatte en fazla 5 kod. Numara kayıtlı değilse SMS gönderilmez ama yanıt aynıdır (numara taraması önlenir). Kodun kendisi değil özeti saklanır.
- İki adımlı doğrulaması açık hesaplar bu yöntemlerle giriş yapamaz (e-posta + şifre + kod kullanır).

## Google kurulumu (ücretsiz)
1. https://console.cloud.google.com → yeni proje → **APIs & Services → OAuth consent screen**: uygulama adı "Hasadım", destek e-postası, kapsamlar: `email`, `profile`, `openid`.
2. **Credentials → Create credentials → OAuth client ID → Web application**.
   - Authorized JavaScript origins: `https://localhost:7106` (canlıda kendi alan adın, ör. `https://hasadim.com`).
3. Oluşan **Client ID**'yi API ayarına yaz (gizli değildir, ama yine de User Secrets kullanabilirsin):
   ```json
   "Auth": { "Google": { "WebClientId": "xxxxxxxx.apps.googleusercontent.com", "MobileClientIds": [] } }
   ```
4. Mobil uygulama aşamasında Android ve iOS için ayrı OAuth istemcileri oluşturup kimliklerini `MobileClientIds` listesine ekleyeceğiz.

## Apple kurulumu (Apple Developer hesabı gerekir, yıllık 99 USD)
1. https://developer.apple.com → **Certificates, Identifiers & Profiles**.
2. **Identifiers → App IDs**: uygulama kimliği (ör. `com.hasadim.app`), "Sign in with Apple" açık.
3. **Identifiers → Services IDs**: web için kimlik (ör. `com.hasadim.web`), "Sign in with Apple" → Configure:
   - Domains: `hasadim.com` · Return URL: `https://hasadim.com/html/giris.html`
   - Apple **localhost kabul etmez**; web'de Apple ile giriş ancak gerçek HTTPS alan adında denenebilir.
4. API ayarı:
   ```json
   "Auth": { "Apple": { "WebClientId": "com.hasadim.web", "RedirectUri": "https://hasadim.com/html/giris.html", "MobileClientIds": ["com.hasadim.app"] } }
   ```
   Belirteç doğrulamada Apple'ın gizli anahtarı (.p8) gerekmez; yalnızca kimlikler yeterlidir.

## SMS (telefonla giriş)
- **Geliştirmede** sağlayıcı gerekmez: kod gönderilmez, **API konsoluna yazılır** ("SMS (geliştirme, gönderilmedi) → 0532…: Hasadım giriş kodun: 123456").
- Demo verisindeki 5 kullanıcının telefonları doğrulanmış gelir (bkz. DEMO-VERI.md); `DEMO-VERI.bat` yeniden çalıştırılınca telefonla giriş hemen denenebilir.
- **Canlıda** bir SMS sağlayıcısı gerekir (Netgsm, İleti Merkezi, Verimor, Twilio vb.). Sağlayıcı seçilince `Sms:Provider` ayarı ve gönderim kodu `src/Hasadim.Api/Security/SmsSender.cs` içine eklenecek. Sağlayıcı yokken canlıda telefon seçeneği pasif kalır.

## Veritabanı
`011_LoginOptions.sql`: `UserLogins` (Google/Apple hesap bağları), `PhoneChallenges` (SMS kodları), doğrulanmış telefonun tek hesapta olmasını sağlayan benzersiz dizin. API Development'ta açılırken otomatik uygulanır.
