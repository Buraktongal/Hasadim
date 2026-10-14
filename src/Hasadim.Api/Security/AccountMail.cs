using System.Net;
using System.Net.Mail;
namespace Hasadim.Api.Security;
public class AccountMail(IConfiguration config)
{
 public bool Enabled=>!string.IsNullOrWhiteSpace(config["Mail:Host"]);
 public string Link(string page,string email,string token){var origin=config["Web:PublicOrigin"]??"https://localhost:7106";return origin.TrimEnd('/')+"/html/"+page+"?email="+Uri.EscapeDataString(email)+"&token="+Uri.EscapeDataString(token);}
 public async Task Send(string email,string subject,string text,CancellationToken ct)
 {
  if(!Enabled)throw new InvalidOperationException("SMTP ayarları eksik.");
  using var smtp=new SmtpClient(config["Mail:Host"],config.GetValue("Mail:Port",587)){EnableSsl=true};
  if(!string.IsNullOrWhiteSpace(config["Mail:User"]))smtp.Credentials=new NetworkCredential(config["Mail:User"],config["Mail:Password"]);
  using var mail=new MailMessage(config["Mail:From"]??throw new InvalidOperationException("Mail:From gerekli."),email,subject,text);
  await smtp.SendMailAsync(mail,ct);
 }
}
