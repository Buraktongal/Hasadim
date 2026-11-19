namespace Hasadim.Application;

// Türkiye cep telefonu numaralarını tek biçime getirir: 05XXXXXXXXX.
public static class PhoneNumbers
{
    public static string? Normalize(string? value)
    {
        var digits = new string((value ?? "").Where(char.IsAsciiDigit).ToArray());
        if (digits.Length == 12 && digits.StartsWith("90")) digits = digits[2..];
        if (digits.Length == 11 && digits.StartsWith('0')) digits = digits[1..];
        return digits.Length == 10 && digits[0] == '5' ? "0" + digits : null;
    }

    // Ekranda gösterim için: 0532 *** ** 01
    public static string Mask(string normalized) =>
        normalized.Length == 11 ? normalized[..4] + " *** ** " + normalized[^2..] : "***";
}
