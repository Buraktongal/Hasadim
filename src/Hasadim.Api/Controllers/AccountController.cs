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
public class RegisterRequest:LoginRequest{[Required,StringLength(100,MinimumLength=2)]public string DisplayName{get;set;}="";}
public class CodeRequest{[Required,StringLength(100)]public string Code{get;set;}="";public bool Recovery{get;set;}}
public class PasswordRequest{[Required,StringLength(128)]public string Password{get;set;}="";}
public class ChangePasswordRequest:PasswordRequest{[Required,StringLength(128,MinimumLength=12)]public string NewPassword{get;set;}="";}
public class EmailRequest{[Required,EmailAddress,StringLength(256)]public string Email{get;set;}="";}
public class ResetRequest:EmailRequest{[Required,StringLength(4096)]public string Token{get;set;}="";[Required,StringLength(128,MinimumLength=12)]public string Password{get;set;}="";}
public class ConfirmRequest:EmailRequest{[Required,StringLength(4096)]public string Token{get;set;}="";}
[ApiController,Route("api/account"),EnableRateLimiting("auth")]
public class AccountController(UserManager<AppUser> users,SignInManager<AppUser> signIn,AccountMail mail,IOptions<IdentityOptions> options):ControllerBase
{
 IActionResult Errors(IdentityResult r)=>BadRequest(new{mesaj=string.Join(" ",r.Errors.Select(x=>x.Description))});
 async Task<AppUser> MeUser()=>await users.GetUserAsync(User)??throw new Hasadim.Application.AppException(401,"Giriş yapın.");
 [HttpGet("me")]
 public async Task<IActionResult> Me(){var u=await users.GetUserAsync(User);return Ok(u is null?null:new{u.Id,u.DisplayName,u.Email,u.TwoFactorEnabled,isAdmin=await users.IsInRoleAsync(u,"Admin")});}
 [HttpPost("register")]
 public async Task<IActionResult> Register(RegisterRequest r,CancellationToken ct)
 {
  if(User.Identity?.IsAuthenticated==true)return BadRequest(new{mesaj="Önce çıkış yapın."});
  if(await users.FindByEmailAsync(r.Email.Trim()) is not null)return BadRequest(new{mesaj="Bu bilgilerle kayıt oluşturulamadı. Giriş veya şifre yenilemeyi deneyin."});
  var u=new AppUser{UserName=r.Email.Trim(),Email=r.Email.Trim(),DisplayName=r.DisplayName.Trim()};var result=await users.CreateAsync(u,r.Password);if(!result.Succeeded)return Errors(result);
  if(options.Value.SignIn.RequireConfirmedEmail){var token=await users.GenerateEmailConfirmationTokenAsync(u);await mail.Send(u.Email!,"Hasadım e-posta doğrulama",mail.Link("eposta-dogrula.html",u.Email!,token),ct);}
  return Ok(new{requiresConfirmation=options.Value.SignIn.RequireConfirmedEmail,mesaj="Hesap oluşturuldu."});
 }
 [HttpPost("login")]
 public async Task<IActionResult> Login(LoginRequest r)
 {
  var u=await users.FindByEmailAsync(r.Email.Trim());
  if(u is null)return Unauthorized(new{mesaj="Giriş yapılamadı. Bilgilerinizi ve e-posta doğrulamanızı kontrol edin; kilitlenme durumunda 15 dakika bekleyin."});
  var result=await signIn.PasswordSignInAsync(u,r.Password,false,true);
  if(result.RequiresTwoFactor)return Ok(new{requiresTwoFactor=true});
  if(!result.Succeeded)return Unauthorized(new{mesaj="Giriş yapılamadı. Bilgilerinizi ve e-posta doğrulamanızı kontrol edin; kilitlenme durumunda 15 dakika bekleyin."});
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
 [Authorize,HttpPost("2fa/setup")]
 public async Task<IActionResult> Setup(PasswordRequest r){var u=await MeUser();if(!await users.CheckPasswordAsync(u,r.Password))return BadRequest(new{mesaj="Şifre hatalı."});if(u.TwoFactorEnabled)return BadRequest(new{mesaj="İki adımlı doğrulama zaten açık."});var result=await users.ResetAuthenticatorKeyAsync(u);if(!result.Succeeded)return Errors(result);await signIn.RefreshSignInAsync(u);return Ok(new{key=await users.GetAuthenticatorKeyAsync(u),email=u.Email});}
 [Authorize,HttpPost("2fa/enable")]
 public async Task<IActionResult> Enable(CodeRequest r){var u=await MeUser();if(u.TwoFactorEnabled)return BadRequest(new{mesaj="Zaten etkin."});if(!await users.VerifyTwoFactorTokenAsync(u,TokenOptions.DefaultAuthenticatorProvider,r.Code.Replace(" ","")))return BadRequest(new{mesaj="Doğrulama kodu hatalı."});var result=await users.SetTwoFactorEnabledAsync(u,true);if(!result.Succeeded)return Errors(result);var codes=await users.GenerateNewTwoFactorRecoveryCodesAsync(u,10);await users.UpdateSecurityStampAsync(u);await signIn.RefreshSignInAsync(u);return Ok(new{codes});}
}
