namespace Hasadim.Api.Security;

// SMS gönderimi. Sağlayıcı (ör. Netgsm, İleti Merkezi, Verimor, Twilio) seçilince
// "Sms:Provider" ayarına göre buraya eklenir. Geliştirme ortamında sağlayıcı yoksa
// kod API konsoluna yazılır; böylece telefonla giriş yerelde denenebilir.
public interface ISmsSender
{
    bool Enabled { get; }
    Task Send(string phone, string text, CancellationToken ct);
}

public class SmsSender(IConfiguration config, IWebHostEnvironment env, ILogger<SmsSender> logger) : ISmsSender
{
    string Provider => (config["Sms:Provider"] ?? "").Trim();
    bool ConsoleMode => Provider.Length == 0 && env.IsDevelopment() || string.Equals(Provider, "Console", StringComparison.OrdinalIgnoreCase);

    public bool Enabled => ConsoleMode;

    public Task Send(string phone, string text, CancellationToken ct)
    {
        if (ConsoleMode)
        {
            // Yalnızca geliştirme: gerçek SMS gönderilmez.
            logger.LogWarning("SMS (geliştirme, gönderilmedi) → {Phone}: {Text}", phone, text);
            return Task.CompletedTask;
        }
        throw new InvalidOperationException("SMS sağlayıcısı yapılandırılmadı (Sms:Provider).");
    }
}
