using System.Globalization;
using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Caching.Memory;

/// <summary>
/// Arama motorları ve paylaşım önizlemeleri (WhatsApp, Facebook, X, Telegram…).
/// Sayfalar içeriğini JavaScript ile yüklediği için bu servisler ilanın başlığını ve fotoğrafını göremez.
/// Bu sınıf sayfayı sunucuda döndürürken &lt;head&gt; içine başlık, açıklama, görsel ve yapılandırılmış veri ekler.
/// </summary>
static partial class Seo
{
    const string SiteDescription = "Hasadım: üreticiden toptan meyve, sebze, tahıl, yem, bal, kuruyemiş ilanları ve satılık/kiralık tarım arazisi. İlan vermek ücretsiz.";
    static readonly CultureInfo Tr = CultureInfo.GetCultureInfo("tr-TR");

    // Yalnızca herkese açık sayfalar site haritasına girer; hesap sayfaları arama motorlarına kapalıdır.
    static readonly string[] PublicPages = ["index.html", "harita.html", "urun-takvimi.html", "kullanim-kosullari.html", "kvkk.html", "gizlilik.html", "cerez-politikasi.html", "iletisim.html"];
    static readonly string[] PrivatePages = ["hesabim.html", "ayarlar.html", "bildirimler.html", "engellenenler.html", "eposta-dogrula.html", "giris.html", "kayit.html", "kayitli-aramalar.html", "profilim.html", "qr.html", "sifre-yenile.html", "sifremi-unuttum.html", "tekliflerim.html", "yonetim.html", "geri-bildirim.html", "layout.html"];

    public static string Origin(HttpContext c)
    {
        var configured = c.RequestServices.GetRequiredService<IConfiguration>()["Site:PublicOrigin"];
        return string.IsNullOrWhiteSpace(configured) ? c.Request.Scheme + "://" + c.Request.Host : configured.TrimEnd('/');
    }

    static string E(string? s) => WebUtility.HtmlEncode(s ?? "");

    static string Short(string? s, int max)
    {
        s = Regex.Replace(s ?? "", @"\s+", " ").Trim();
        return s.Length <= max ? s : s[..max].TrimEnd() + "…";
    }

    static string Number(decimal value) => value.ToString("#,0.##", Tr);

    [GeneratedRegex("<title>(.*?)</title>", RegexOptions.Singleline)]
    private static partial Regex TitleTag();

    public static async Task<string> Enrich(HttpContext c, string html)
    {
        if (html.Contains("property=\"og:title\"", StringComparison.Ordinal)) return html;
        var origin = Origin(c);
        var path = c.Request.Path.Value ?? "";
        var page = Path.GetFileName(path);
        var title = WebUtility.HtmlDecode(TitleTag().Match(html).Groups[1].Value.Trim());
        var description = SiteDescription;
        var image = origin + "/images/og-kapak.png";
        var url = c.Request.QueryString.HasValue ? null : origin + path;
        var type = "website";
        string? jsonLd = null;

        if (page == "ilan.html" && Guid.TryParse(c.Request.Query["id"].ToString(), out var id) && await Listing(c, id) is { } l)
        {
            string S(string name) => l.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() ?? "" : "";
            decimal D(string name) => l.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.Number ? v.GetDecimal() : 0;
            var baslik = S("baslik"); var urun = S("meyveTuru"); var cesit = S("cesit"); var il = S("il"); var ilce = S("ilce"); var birim = S("birim");
            if (birim.Length == 0) birim = "kg";
            var place = string.Join(", ", new[] { ilce, il }.Where(x => x.Length > 0));
            var product = string.Join(" ", new[] { urun, cesit }.Where(x => x.Length > 0));
            title = $"{baslik} — {product}{(place.Length > 0 ? ", " + place : "")} | Hasadım";
            var price = D("kilogramFiyati"); var qty = D("miktarKg");
            var parts = new List<string>();
            if (product.Length > 0) parts.Add(product + (place.Length > 0 ? " · " + place : ""));
            if (price > 0) parts.Add($"₺{Number(price)} / {birim}");
            if (qty > 0) parts.Add($"{Number(qty)} {birim} mevcut");
            description = Short(string.Join(" · ", parts) + ". " + S("aciklama"), 200);
            var photo = S("photoUrl");
            if (photo.Length > 0) image = photo.StartsWith("http", StringComparison.Ordinal) ? photo : origin + (photo.StartsWith('/') ? "" : "/") + photo;
            url = origin + "/html/ilan.html?id=" + id;
            type = "product";
            var ld = new Dictionary<string, object?>
            {
                ["@context"] = "https://schema.org",
                ["@type"] = "Product",
                ["name"] = baslik,
                ["description"] = Short(S("aciklama"), 500),
                ["image"] = image,
                ["category"] = product,
                ["url"] = url,
            };
            if (price > 0)
                ld["offers"] = new Dictionary<string, object?>
                {
                    ["@type"] = "Offer",
                    ["price"] = price.ToString(CultureInfo.InvariantCulture),
                    ["priceCurrency"] = "TRY",
                    ["availability"] = "https://schema.org/InStock",
                    ["url"] = url,
                };
            // "</" dizisi kaçırılır: veri bloğu hiçbir durumda sayfadaki betik etiketini kapatamaz.
            jsonLd = JsonSerializer.Serialize(ld).Replace("</", "<\\/");
        }

        var head = new StringBuilder();
        if (!html.Contains("name=\"description\"", StringComparison.Ordinal)) head.Append($"\n    <meta name=\"description\" content=\"{E(description)}\">");
        if (PrivatePages.Contains(page)) head.Append("\n    <meta name=\"robots\" content=\"noindex\">");
        if (url is not null) head.Append($"\n    <link rel=\"canonical\" href=\"{E(url)}\">");
        head.Append("\n    <meta property=\"og:site_name\" content=\"Hasadım\">");
        head.Append("\n    <meta property=\"og:locale\" content=\"tr_TR\">");
        head.Append($"\n    <meta property=\"og:type\" content=\"{type}\">");
        head.Append($"\n    <meta property=\"og:title\" content=\"{E(title)}\">");
        head.Append($"\n    <meta property=\"og:description\" content=\"{E(description)}\">");
        if (url is not null) head.Append($"\n    <meta property=\"og:url\" content=\"{E(url)}\">");
        head.Append($"\n    <meta property=\"og:image\" content=\"{E(image)}\">");
        head.Append("\n    <meta name=\"twitter:card\" content=\"summary_large_image\">");
        if (jsonLd is not null) head.Append($"\n    <script type=\"application/ld+json\">{jsonLd}</script>");
        head.Append('\n');

        var titleTag = "<title>" + E(title) + "</title>";
        var result = TitleTag().Replace(html, _ => titleTag, 1);
        var at = result.IndexOf("</head>", StringComparison.OrdinalIgnoreCase);
        return at < 0 ? result : result.Insert(at, head.ToString());
    }

    // İlan bilgisi API'den alınır ve 5 dakika saklanır. API yavaşsa sayfa beklemez (2 sn), etiketsiz döner.
    static async Task<JsonElement?> Listing(HttpContext c, Guid id)
    {
        var cache = c.RequestServices.GetRequiredService<IMemoryCache>();
        if (cache.TryGetValue("seo-ilan-" + id, out JsonElement? known)) return known;
        JsonElement? result = null;
        try
        {
            using var cts = CancellationTokenSource.CreateLinkedTokenSource(c.RequestAborted);
            cts.CancelAfter(TimeSpan.FromSeconds(2));
            var client = c.RequestServices.GetRequiredService<IHttpClientFactory>().CreateClient("api");
            using var request = new HttpRequestMessage(HttpMethod.Get, $"/api/meyve-ilanlari/{id}");
            // API'nin istek sınırı ziyaretçi başına işlesin (aksi halde tüm önizlemeler sunucunun kendi adresinden sayılır).
            request.Headers.TryAddWithoutValidation("X-Forwarded-For", c.Connection.RemoteIpAddress?.ToString());
            using var response = await client.SendAsync(request, cts.Token);
            if (response.IsSuccessStatusCode)
            {
                using var doc = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(cts.Token), cancellationToken: cts.Token);
                result = doc.RootElement.Clone();
            }
        }
        catch (Exception) when (!c.RequestAborted.IsCancellationRequested) { return null; }
        cache.Set("seo-ilan-" + id, result, TimeSpan.FromMinutes(result is null ? 1 : 5));
        return result;
    }

    public static string Robots(HttpContext c)
    {
        var sb = new StringBuilder("User-agent: *\n");
        // İlan fotoğrafları paylaşım önizlemesinde görünsün diye açık; diğer API adresleri taranmaz.
        sb.Append("Allow: /api/meyve-ilanlari/*/photo\nAllow: /api/meyve-ilanlari/*/photos/\nDisallow: /api/\n");
        foreach (var p in PrivatePages) sb.Append("Disallow: /html/").Append(p).Append('\n');
        sb.Append("\nSitemap: ").Append(Origin(c)).Append("/sitemap.xml\n");
        return sb.ToString();
    }

    // Site haritası: genel sayfalar + yayındaki tüm ilanlar (en fazla 5.000). Bir saat saklanır.
    public static async Task<string> Sitemap(HttpContext c)
    {
        var cache = c.RequestServices.GetRequiredService<IMemoryCache>();
        var origin = Origin(c);
        if (cache.TryGetValue("seo-sitemap", out string? known) && known is not null) return known;
        var sb = new StringBuilder("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n");
        foreach (var p in PublicPages) sb.Append($"  <url><loc>{E(origin)}/html/{p}</loc></url>\n");
        var complete = true;
        try
        {
            var client = c.RequestServices.GetRequiredService<IHttpClientFactory>().CreateClient("api");
            for (var page = 1; page <= 50; page++)
            {
                using var response = await client.GetAsync($"/api/meyve-ilanlari?sort=new&page={page}&pageSize=100", c.RequestAborted);
                if (!response.IsSuccessStatusCode) { complete = false; break; }
                using var doc = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(c.RequestAborted), cancellationToken: c.RequestAborted);
                if (!doc.RootElement.TryGetProperty("items", out var items) || items.ValueKind != JsonValueKind.Array) break;
                foreach (var item in items.EnumerateArray())
                {
                    if (!item.TryGetProperty("id", out var idValue)) continue;
                    sb.Append($"  <url><loc>{E(origin)}/html/ilan.html?id={E(idValue.GetString())}</loc>");
                    foreach (var field in new[] { "publishedAt", "olusturulmaTarihi" })
                        if (item.TryGetProperty(field, out var date) && date.ValueKind == JsonValueKind.String && DateTime.TryParse(date.GetString(), CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var d))
                        { sb.Append($"<lastmod>{d:yyyy-MM-dd}</lastmod>"); break; }
                    sb.Append("</url>\n");
                }
                if (items.GetArrayLength() < 100) break;
            }
        }
        catch (HttpRequestException) { complete = false; }
        sb.Append("</urlset>\n");
        var xml = sb.ToString();
        cache.Set("seo-sitemap", xml, TimeSpan.FromMinutes(complete ? 60 : 2));
        return xml;
    }
}
