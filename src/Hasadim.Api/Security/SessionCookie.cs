using Microsoft.AspNetCore.Authentication;

namespace Hasadim.Api.Security;

// Oturum kimliği giriş çerezinin özelliklerinde saklanır (çerez şifrelidir).
public static class SessionCookie
{
    public const string Key = "hasadim.sid";

    public static Guid? Id(AuthenticationProperties? properties) =>
        properties is not null && properties.Items.TryGetValue(Key, out var raw) && Guid.TryParse(raw, out var id) ? id : null;
}
