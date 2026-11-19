using System.ComponentModel.DataAnnotations;
using Hasadim.Api.Security;
using Hasadim.Infrastructure.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;
namespace Hasadim.Api.Controllers;
public class LoginRequest{[Required,EmailAddress,StringLength(256)]public string Email{get;set;}="";[Required,StringLength(128)]public string Password{get;set;}="";}
public class RegisterRequest:LoginRequest{[Required,StringLength(100,MinimumLength=2)]public string DisplayName{get;set;}="";[Required,RegularExpression(@"^05[0-9]{9}$",ErrorMessage="Telefon numaranı 05 ile başlayan 11 rakam olarak gir.")]public string Phone{get;set;}="";[Required(ErrorMessage="Şifreyi tekrar yaz."),System.ComponentModel.DataAnnotations.Compare(nameof(Password),ErrorMessage="Şifreler eşleşmiyor.")]public string PasswordConfirm{get;set;}="";}
public class CompleteRegistrationRequest{public Guid ChallengeId{get;set;}[Required,RegularExpression(@"^[0-9]{6}$",ErrorMessage="6 haneli kodu gir.")]public string Code{get;set;}="";}
public class ExternalLoginRequest{[Required,RegularExpression("^(google|apple)$")]public string Provider{get;set;}="";[Required,StringLength(8192)]public string IdToken{get;set;}="";[StringLength(256)]public string? Nonce{get;set;}[StringLength(100)]public string? DisplayName{get;set;}}
public class PhoneStartRequest{[Required,StringLength(25)]public string Phone{get;set;}="";}
public class PhoneConfirmRequest{public Guid ChallengeId{get;set;}[Required,RegularExpression(@"^[0-9]{6}$",ErrorMessage="6 haneli kodu gir.")]public string Code{get;set;}="";}
public class CodeRequest{[Required,StringLength(100)]public string Code{get;set;}="";public bool Recovery{get;set;}}
public class PasswordRequest{[Required,StringLength(128)]public string Password{get;set;}="";}
public class ChangePasswordRequest:PasswordRequest{[Required,StringLength(128,MinimumLength=12)]public string NewPassword{get;set;}="";[Required(ErrorMessage="Yeni şifreyi tekrar yaz."),System.ComponentModel.DataAnnotations.Compare(nameof(NewPassword),ErrorMessage="Yeni şifreler eşleşmiyor.")]public string NewPasswordConfirm{get;set;}="";}
public class EmailRequest{[Required,EmailAddress,StringLength(256)]public string Email{get;set;}="";}
public class ResetRequest:EmailRequest{[Required,StringLength(4096)]public string Token{get;set;}="";[Required,StringLength(128,MinimumLength=12)]public string Password{get;set;}="";[Required(ErrorMessage="Yeni şifreyi tekrar yaz."),System.ComponentModel.DataAnnotations.Compare(nameof(Password),ErrorMessage="Şifreler eşleşmiyor.")]public string PasswordConfirm{get;set;}="";}
public class ConfirmRequest:EmailRequest{[Required,StringLength(4096)]public string Token{get;set;}="";}
[ApiController,Route("api/account"),EnableRateLimiting("auth")]
public class AccountController(UserManager<AppUser> users,SignInManager<AppUser> signIn,AccountMail mail,RegistrationStore registrations,IConfiguration config,ILogger<AccountController> logger,IWebHostEnvironment env,ExternalTokenValidator external,PhoneChallengeStore phones,ISmsSender sms,AccountDeletion deletion):ControllerBase
{
 // Hesabı kalıcı olarak siler (App Store / Google Play hesap silme şartı).
 // Şifresi olan hesapta şifre, tüm hesaplarda "HESABIMI SİL" onayı istenir.
 [Authorize,HttpPost("delete")]
 public async Task<IActionResult> DeleteAccount(Hasadim.Application.DeleteAccountRequest r,CancellationToken ct)
 {
  var u=await MeUser();
  var confirm=r.Confirm.Trim();
  if(!string.Equals(confirm,"HESABIMI SİL",StringComparison.Ordinal)&&!string.Equals(confirm.ToUpperInvariant(),"DELETE MY ACCOUNT",StringComparison.Ordinal))
   return BadRequest(new{mesaj="Onay için kutuya HESABIMI SİL yaz."});
  if(await users.HasPasswordAsync(u)&&(string.IsNullOrEmpty(r.Password)||!await users.CheckPasswordAsync(u,r.Password)))
   return BadRequest(new{mesaj="Şifre hatalı."});
  if(await users.IsInRoleAsync(u,"Admin")&&(await users.GetUsersInRoleAsync("Admin")).Count<=1)
   return BadRequest(new{mesaj="Son yönetici hesabı silinemez. Önce başka bir yönetici ekle."});
  var photo=await deletion.Delete(u.Id,ct);
  if(photo is not null&&Path.GetFileName(photo)==photo){try{System.IO.File.Delete(Path.Combine(env.ContentRootPath,"App_Data","profiles",photo));}catch(IOException){}}
  await signIn.SignOutAsync();
  return Ok(new{mesaj="Hesabın silindi. Hasadım'ı kullandığın için teşekkürler."});
 }
 // Geliştirmede başarısız girişin nedeni API konsoluna yazılır (şifre yazılmaz).
 void LogLogin(string email,string reason){if(env.IsDevelopment())logger.LogWarning("Giriş başarısız: {Email} — {Reason}",email,reason);}
 // İki adımlı doğrulama kurulumu şimdilik kapalı; açmak için "Features:TwoFactorSetup": true.
 bool TwoFactorSetupAvailable=>config.GetValue("Features:TwoFactorSetup",false);
 IActionResult SetupClosed()=>BadRequest(new{mesaj="İki adımlı doğrulama şu anda kullanıma kapalı."});
 IActionResult Errors(IdentityResult r)=>BadRequest(new{mesaj=string.Join(" ",r.Errors.Select(x=>x.Description))});
 async Task<AppUser> MeUser()=>await users.GetUserAsync(User)??throw new Hasadim.Application.AppException(401,"Giriş yapın.");
 [HttpGet("me")]
 public async Task<IActionResult> Me(){var u=await users.GetUserAsync(User);return Ok(u is null?null:new{u.Id,u.DisplayName,u.Email,u.TwoFactorEnabled,isAdmin=await users.IsInRoleAsync(u,"Admin"),hasPassword=await users.HasPasswordAsync(u)});}
 [HttpPost("register")]
 public async Task<IActionResult> Register(RegisterRequest r,CancellationToken ct)
 {
  if(User.Identity?.IsAuthenticated==true)return BadRequest(new{mesaj="Önce çıkış yapın."});
  if(!mail.Enabled)return StatusCode(503,new{mesaj="E-posta gönderimi henüz hazır değil. Lütfen daha sonra tekrar dene."});
  var u=new AppUser{UserName=r.Email.Trim(),Email=r.Email.Trim(),DisplayName=r.DisplayName.Trim(),PhoneNumber=r.Phone};
  u.NormalizedEmail=users.NormalizeEmail(u.Email);u.NormalizedUserName=users.NormalizeName(u.UserName);
  foreach(var validator in users.UserValidators){var result=await validator.ValidateAsync(users,u);if(!result.Succeeded)return Errors(result);}
  foreach(var validator in users.PasswordValidators){var result=await validator.ValidateAsync(users,u,r.Password);if(!result.Succeeded)return Errors(result);}
  u.PasswordHash=users.PasswordHasher.HashPassword(u,r.Password);
  var ticket=await registrations.Start(u,ct);
  try{await mail.Send(u.Email!,"Hasadım kayıt doğrulama kodu",$"Doğrulama kodun: {ticket.Code}\nBu kod 2 dakika geçerlidir. Kodu kimseyle paylaşma. Bu kaydı sen başlatmadıysan mesajı yok say.",ct);}
  catch{await registrations.Cancel(ticket.Id,CancellationToken.None);return StatusCode(503,new{mesaj="Doğrulama e-postası gönderilemedi. Hesap oluşturulmadı. Daha sonra tekrar dene."});}
  return Ok(new{challengeId=ticket.Id,expiresAt=ticket.ExpiresAt,mesaj="6 haneli kod e-posta adresine gönderildi. Hesabın kodu doğruladığında oluşturulacak."});
 }
 [HttpPost("register/confirm")]
 public async Task<IActionResult> CompleteRegistration(CompleteRegistrationRequest r,CancellationToken ct)
 {
  if(User.Identity?.IsAuthenticated==true)return BadRequest(new{mesaj="Önce çıkış yapın."});
  await registrations.Complete(r.ChallengeId,r.Code,ct);
  return Ok(new{mesaj="E-postan doğrulandı ve hesabın oluşturuldu. Giriş yapabilirsin."});
 }
 // Giriş ekranında hangi seçeneklerin gösterileceği (gizli bilgi içermez).
 [HttpGet("providers")]
 public IActionResult Providers()=>Ok(new{
  google=new{enabled=external.Enabled("Google")&&external.WebClientId("Google") is not null,clientId=external.WebClientId("Google")},
  apple=new{enabled=external.Enabled("Apple")&&external.WebClientId("Apple") is not null&&!string.IsNullOrWhiteSpace(config["Auth:Apple:RedirectUri"]),clientId=external.WebClientId("Apple"),redirectUri=config["Auth:Apple:RedirectUri"]},
  phone=new{enabled=sms.Enabled}});

 // Ortak oturum açma kontrolleri (kilit, e-posta doğrulaması, 2FA).
 async Task<IActionResult?> CannotSignIn(AppUser u)
 {
  if(await users.IsLockedOutAsync(u))return Unauthorized(new{mesaj="Çok fazla hatalı deneme yapıldı. 15 dakika sonra tekrar dene."});
  if(!await signIn.CanSignInAsync(u))return Unauthorized(new{mesaj="Giriş için önce e-posta adresini doğrulamalısın."});
  if(u.TwoFactorEnabled)return Unauthorized(new{mesaj="Bu hesapta iki adımlı doğrulama açık. E-posta ve şifrenle giriş yap."});
  return null;
 }

 // Google veya Apple ile giriş / kayıt. Aynı uç mobil uygulama için de kullanılır.
 [HttpPost("external")]
 public async Task<IActionResult> External(ExternalLoginRequest r,CancellationToken ct)
 {
  if(User.Identity?.IsAuthenticated==true)return BadRequest(new{mesaj="Önce çıkış yap."});
  var id=await external.Validate(r.Provider,r.IdToken,r.Nonce,ct);
  var u=await users.FindByLoginAsync(id.Provider,id.Subject);
  var created=false;
  if(u is null)
  {
   if(string.IsNullOrWhiteSpace(id.Email)||!id.EmailVerified)return BadRequest(new{mesaj=id.Provider+" hesabında doğrulanmış bir e-posta bulunamadı."});
   u=await users.FindByEmailAsync(id.Email);
   if(u is null)
   {
    var name=(r.DisplayName??id.Name??id.Email.Split('@')[0]).Trim();
    if(name.Length<2)name="Hasadım kullanıcısı";if(name.Length>100)name=name[..100];
    u=new AppUser{UserName=id.Email,Email=id.Email,EmailConfirmed=true,DisplayName=name};
    var result=await users.CreateAsync(u);if(!result.Succeeded)return Errors(result);
    created=true;
   }
   // Doğrulanmamış (yarım kalmış) bir hesaba bağlanmaz; önceden ele geçirme riskini önler.
   else if(!u.EmailConfirmed)return BadRequest(new{mesaj="Bu e-postayla doğrulanmamış bir hesap var. Önce e-posta ve şifreyle giriş yapıp e-postanı doğrula."});
   var link=await users.AddLoginAsync(u,new UserLoginInfo(id.Provider,id.Subject,id.Provider));
   if(!link.Succeeded)return Errors(link);
  }
  if(await CannotSignIn(u) is { } blocked)return blocked;
  await signIn.SignInAsync(u,false,id.Provider);
  return Ok(new{created,mesaj=created?"Hesabın oluşturuldu. İlan vermek için profilinden telefonunu ekle.":"Giriş yapıldı."});
 }

 // Telefonla giriş 1/2: doğrulanmış numaraya SMS kodu gönderilir.
 [HttpPost("phone/start")]
 public async Task<IActionResult> PhoneStart(PhoneStartRequest r,CancellationToken ct)
 {
  if(!sms.Enabled)return StatusCode(503,new{mesaj="Telefonla giriş şu anda kullanılamıyor."});
  var phone=Hasadim.Application.PhoneNumbers.Normalize(r.Phone);
  if(phone is null)return BadRequest(new{mesaj="5 ile başlayan 10 haneli cep telefonu numaranı gir."});
  var userId=await phones.FindConfirmedUser(phone,ct);
  var ticket=await phones.Start("login",phone,userId,ct);
  // Numara bir hesaba ait değilse SMS gönderilmez; yanıt yine aynıdır (numara taraması önlenir).
  if(userId is not null)await sms.Send(phone,$"Hasadım giriş kodun: {ticket.Code}. Kod 3 dakika geçerlidir, kimseyle paylaşma.",ct);
  return Ok(new{challengeId=ticket.Id,expiresAt=ticket.ExpiresAt,mesaj="Numara doğrulanmış bir hesaba aitse 6 haneli kod SMS ile gönderildi."});
 }

 // Telefonla giriş 2/2: kod doğrulanır ve oturum açılır.
 [HttpPost("phone/confirm")]
 public async Task<IActionResult> PhoneConfirm(PhoneConfirmRequest r,CancellationToken ct)
 {
  var (userId,_)=await phones.Verify(r.ChallengeId,r.Code,"login",ct);
  var u=await users.FindByIdAsync(userId.ToString());
  if(u is null)return BadRequest(new{mesaj="Kod hatalı veya süresi dolmuş. Yeni kod iste."});
  if(await CannotSignIn(u) is { } blocked)return blocked;
  await signIn.SignInAsync(u,false,"phone");
  return Ok(new{mesaj="Giriş yapıldı."});
 }

 // Profildeki telefonu doğrulama 1/2.
 [Authorize,HttpPost("me/phone/start")]
 public async Task<IActionResult> MyPhoneStart(CancellationToken ct)
 {
  if(!sms.Enabled)return StatusCode(503,new{mesaj="SMS ile doğrulama şu anda kullanılamıyor."});
  var u=await MeUser();
  var phone=Hasadim.Application.PhoneNumbers.Normalize(await phones.ProfilePhone(u.Id,ct));
  if(phone is null)return BadRequest(new{mesaj="Önce profiline geçerli bir cep telefonu ekle."});
  var owner=await phones.FindConfirmedUser(phone,ct);
  if(owner is not null&&owner!=u.Id)return Conflict(new{mesaj="Bu numara başka bir hesapta doğrulanmış."});
  var ticket=await phones.Start("verify",phone,u.Id,ct);
  await sms.Send(phone,$"Hasadım telefon doğrulama kodun: {ticket.Code}. Kod 3 dakika geçerlidir.",ct);
  return Ok(new{challengeId=ticket.Id,expiresAt=ticket.ExpiresAt,mesaj=Hasadim.Application.PhoneNumbers.Mask(phone)+" numarasına 6 haneli kod gönderildi."});
 }

 // Profildeki telefonu doğrulama 2/2.
 [Authorize,HttpPost("me/phone/confirm")]
 public async Task<IActionResult> MyPhoneConfirm(PhoneConfirmRequest r,CancellationToken ct)
 {
  var u=await MeUser();
  var (userId,phone)=await phones.Verify(r.ChallengeId,r.Code,"verify",ct);
  if(userId!=u.Id)return BadRequest(new{mesaj="Kod hatalı veya süresi dolmuş. Yeni kod iste."});
  await phones.ConfirmPhone(u.Id,phone,ct);
  return Ok(new{mesaj="Telefonun doğrulandı. Artık telefon numaranla da giriş yapabilirsin."});
 }

 [HttpPost("login")]
 public async Task<IActionResult> Login(LoginRequest r)
 {
  const string failed="E-posta veya şifre hatalı. Şifrede büyük/küçük harf ve Türkçe karakterlere (ı/i, ö/o) dikkat et.";
  var u=await users.FindByEmailAsync(r.Email.Trim());
  if(u is null){LogLogin(r.Email,"kullanıcı bulunamadı");return Unauthorized(new{mesaj=failed});}
  var result=await signIn.PasswordSignInAsync(u,r.Password,false,true);
  if(result.RequiresTwoFactor)return Ok(new{requiresTwoFactor=true});
  if(result.IsLockedOut){LogLogin(r.Email,"hesap kilitli");return Unauthorized(new{mesaj="Çok fazla hatalı deneme yapıldı. 15 dakika sonra tekrar dene veya şifreni yenile."});}
  if(result.IsNotAllowed){LogLogin(r.Email,"e-posta doğrulanmamış");return Unauthorized(new{mesaj="Giriş için önce e-posta adresini doğrulamalısın."});}
  if(!result.Succeeded){LogLogin(r.Email,"şifre hatalı");return Unauthorized(new{mesaj=failed});}
  return Ok(new{requiresTwoFactor=false});
 }
 [HttpPost("two-factor-login")]
 public async Task<IActionResult> TwoFactorLogin(CodeRequest r)
 {
  var result=r.Recovery?await signIn.TwoFactorRecoveryCodeSignInAsync(r.Code.Trim()):await signIn.TwoFactorAuthenticatorSignInAsync(r.Code.Replace(" ",""),false,false);
  return result.Succeeded?Ok():Unauthorized(new{mesaj="Kod geçersiz veya giriş süresi doldu."});
 }
 [Authorize,HttpPost("logout")]
 public async Task<IActionResult> Logout(){await signIn.SignOutAsync();return Ok();}
 [Authorize,HttpPost("logout-all")]
 public async Task<IActionResult> LogoutAll(PasswordRequest r){var u=await MeUser();if(!await users.CheckPasswordAsync(u,r.Password))return BadRequest(new{mesaj="Şifre hatalı."});var res=await users.UpdateSecurityStampAsync(u);if(!res.Succeeded)return Errors(res);await signIn.SignOutAsync();return Ok();}
 [Authorize,HttpPost("change-password")]
 public async Task<IActionResult> Change(ChangePasswordRequest r){var u=await MeUser();var result=await users.ChangePasswordAsync(u,r.Password,r.NewPassword);if(!result.Succeeded)return Errors(result);await signIn.SignOutAsync();return Ok();}
 [HttpPost("forgot-password")]
 public async Task<IActionResult> Forgot(EmailRequest r,CancellationToken ct){var u=await users.FindByEmailAsync(r.Email.Trim());if(u is not null&&u.EmailConfirmed&&mail.Enabled){var t=await users.GeneratePasswordResetTokenAsync(u);await mail.Send(u.Email!,"Hasadım şifre yenileme",mail.Link("sifre-yenile.html",u.Email!,t),ct);}return Ok(new{mesaj="Uygun bir hesap varsa şifre yenileme bağlantısı gönderildi."});}
 [HttpPost("resend-confirmation")]
 public async Task<IActionResult> Resend(EmailRequest r,CancellationToken ct){var u=await users.FindByEmailAsync(r.Email.Trim());if(u is not null&&!u.EmailConfirmed&&mail.Enabled){var t=await users.GenerateEmailConfirmationTokenAsync(u);await mail.Send(u.Email!,"Hasadım e-posta doğrulama",mail.Link("eposta-dogrula.html",u.Email!,t),ct);}return Ok(new{mesaj="Uygun bir hesap varsa doğrulama bağlantısı gönderildi."});}
 [Authorize,HttpPost("me/resend-confirmation")]
 public async Task<IActionResult> ResendMine(CancellationToken ct)
 {
  var u=await MeUser();
  if(u.EmailConfirmed)return Ok(new{mesaj="E-posta adresin zaten doğrulandı."});
  if(!mail.Enabled)return StatusCode(503,new{mesaj="E-posta gönderimi şu anda kullanılamıyor. Lütfen daha sonra tekrar dene."});
  if(string.IsNullOrWhiteSpace(u.Email))return BadRequest(new{mesaj="Hesabında e-posta adresi bulunamadı."});
  var token=await users.GenerateEmailConfirmationTokenAsync(u);
  await mail.Send(u.Email,"Hasadım e-posta doğrulama",mail.Link("eposta-dogrula.html",u.Email,token),ct);
  return Ok(new{mesaj="Doğrulama bağlantısı e-posta adresine gönderildi. Gelen kutunu ve spam klasörünü kontrol et."});
 }
 [HttpPost("confirm-email")]
 public async Task<IActionResult> Confirm(ConfirmRequest r){var u=await users.FindByEmailAsync(r.Email.Trim());if(u is null)return BadRequest(new{mesaj="Bağlantı geçersiz."});var result=await users.ConfirmEmailAsync(u,r.Token);return result.Succeeded?Ok():BadRequest(new{mesaj="Bağlantı geçersiz veya süresi dolmuş."});}
 [HttpPost("reset-password")]
 public async Task<IActionResult> Reset(ResetRequest r){var u=await users.FindByEmailAsync(r.Email.Trim());if(u is null)return BadRequest(new{mesaj="Bağlantı geçersiz."});var result=await users.ResetPasswordAsync(u,r.Token,r.Password);return result.Succeeded?Ok():Errors(result);}
 // İki adımlı doğrulama durumu ve kalan kurtarma kodu sayısı.
 [Authorize,HttpGet("2fa/status")]
 public async Task<IActionResult> TwoFactorStatus(){var u=await MeUser();return Ok(new{enabled=u.TwoFactorEnabled,setupAvailable=TwoFactorSetupAvailable,recoveryCodesLeft=u.TwoFactorEnabled?await users.CountRecoveryCodesAsync(u):0});}
 // Kapatma şifre ister; anahtar sıfırlanır ve diğer oturumlar kapanır.
 [Authorize,HttpPost("2fa/disable")]
 public async Task<IActionResult> Disable(PasswordRequest r)
 {
  var u=await MeUser();
  if(!await users.CheckPasswordAsync(u,r.Password))return BadRequest(new{mesaj="Şifre hatalı."});
  if(!u.TwoFactorEnabled)return BadRequest(new{mesaj="İki adımlı doğrulama zaten kapalı."});
  var result=await users.SetTwoFactorEnabledAsync(u,false);if(!result.Succeeded)return Errors(result);
  result=await users.ResetAuthenticatorKeyAsync(u);if(!result.Succeeded)return Errors(result);
  await signIn.RefreshSignInAsync(u);
  return Ok(new{mesaj="İki adımlı doğrulama kapatıldı."});
 }
 [Authorize,HttpPost("2fa/setup")]
 public async Task<IActionResult> Setup(PasswordRequest r){if(!TwoFactorSetupAvailable)return SetupClosed();var u=await MeUser();if(!await users.CheckPasswordAsync(u,r.Password))return BadRequest(new{mesaj="Şifre hatalı."});if(u.TwoFactorEnabled)return BadRequest(new{mesaj="İki adımlı doğrulama zaten açık."});var result=await users.ResetAuthenticatorKeyAsync(u);if(!result.Succeeded)return Errors(result);await signIn.RefreshSignInAsync(u);return Ok(new{key=await users.GetAuthenticatorKeyAsync(u),email=u.Email});}
 [Authorize,HttpPost("2fa/enable")]
 public async Task<IActionResult> Enable(CodeRequest r){if(!TwoFactorSetupAvailable)return SetupClosed();var u=await MeUser();if(u.TwoFactorEnabled)return BadRequest(new{mesaj="Zaten etkin."});if(!await users.VerifyTwoFactorTokenAsync(u,TokenOptions.DefaultAuthenticatorProvider,r.Code.Replace(" ","")))return BadRequest(new{mesaj="Doğrulama kodu hatalı."});var result=await users.SetTwoFactorEnabledAsync(u,true);if(!result.Succeeded)return Errors(result);var codes=await users.GenerateNewTwoFactorRecoveryCodesAsync(u,10);await users.UpdateSecurityStampAsync(u);await signIn.RefreshSignInAsync(u);return Ok(new{codes});}
}
