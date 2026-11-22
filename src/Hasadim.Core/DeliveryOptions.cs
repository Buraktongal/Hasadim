namespace Hasadim.Core;

// Teslimat seçenekleri. Bir ilan birden çok seçenek taşıyabilir; veritabanında sabit sırayla,
// ", " ile ayrılmış tek metin olarak saklanır (ör. "Yerinden teslim, Kargo").
public static class DeliveryOptions
{
    public static readonly string[] All = ["Yerinden teslim", "Satıcı teslimatı", "Kargo", "Görüşülür"];
    public const string Pattern = "^(Yerinden teslim|Satıcı teslimatı|Kargo|Görüşülür)(, ?(Yerinden teslim|Satıcı teslimatı|Kargo|Görüşülür)){0,3}$";

    // Bilinmeyenleri atar, tekrarları birleştirir, sırayı sabitler. Hiç geçerli seçenek yoksa null.
    public static string? Normalize(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var picked = value.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries).ToHashSet(StringComparer.Ordinal);
        var list = All.Where(picked.Contains).ToArray();
        return list.Length == 0 ? null : string.Join(", ", list);
    }
}
