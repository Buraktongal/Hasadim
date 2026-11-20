using System.Globalization;
using System.Security.Cryptography;
using System.Text;

namespace Hasadim.Infrastructure.Security;

// Görsel doğrulama kodu (SVG). Harfler yazı tipiyle değil, rastgele bozulmuş çizgilerle çizilir;
// görüntüde metin bulunmaz, yani SVG'yi okuyarak kod çıkarılamaz. Karışmaya açık karakterler
// (0/O, 1/I, 2/Z, 5/S, 8/B, G/6, 4/A, 7/T) kullanılmaz.
public static class CaptchaImage
{
    const int Width = 220, Height = 80, Length = 5;
    static readonly string[] Ink = ["#1d4a33", "#2b6a48", "#7a4a16", "#3a3f8f", "#8f2f2f", "#1f2a22"];

    // Her karakter 10×14 birimlik ızgarada çizgi parçalarından oluşur.
    static readonly Dictionary<char, float[][]> Glyphs = new()
    {
        ['A'] = [[0, 14, 5, 0, 10, 14], [2, 8.5f, 8, 8.5f]],
        ['C'] = [[10, 2, 7, 0, 3, 0, 0, 3, 0, 11, 3, 14, 7, 14, 10, 12]],
        ['D'] = [[0, 0, 0, 14, 6, 14, 10, 10, 10, 4, 6, 0, 0, 0]],
        ['E'] = [[10, 0, 0, 0, 0, 14, 10, 14], [0, 7, 7, 7]],
        ['F'] = [[10, 0, 0, 0, 0, 14], [0, 7, 7, 7]],
        ['H'] = [[0, 0, 0, 14], [10, 0, 10, 14], [0, 7, 10, 7]],
        ['K'] = [[0, 0, 0, 14], [10, 0, 0, 8], [3, 6, 10, 14]],
        ['L'] = [[0, 0, 0, 14, 10, 14]],
        ['M'] = [[0, 14, 0, 0, 5, 8, 10, 0, 10, 14]],
        ['N'] = [[0, 14, 0, 0, 10, 14, 10, 0]],
        ['P'] = [[0, 14, 0, 0, 7, 0, 10, 2, 10, 6, 7, 8, 0, 8]],
        ['R'] = [[0, 14, 0, 0, 7, 0, 10, 2, 10, 6, 7, 8, 0, 8], [5, 8, 10, 14]],
        ['T'] = [[0, 0, 10, 0], [5, 0, 5, 14]],
        ['U'] = [[0, 0, 0, 10, 3, 14, 7, 14, 10, 10, 10, 0]],
        ['V'] = [[0, 0, 5, 14, 10, 0]],
        ['W'] = [[0, 0, 2, 14, 5, 5, 8, 14, 10, 0]],
        ['X'] = [[0, 0, 10, 14], [10, 0, 0, 14]],
        ['Y'] = [[0, 0, 5, 7, 10, 0], [5, 7, 5, 14]],
        ['3'] = [[0, 1, 3, 0, 8, 0, 10, 2, 10, 5, 7, 7, 3, 7], [7, 7, 10, 9, 10, 12, 8, 14, 3, 14, 0, 13]],
        ['6'] = [[9, 1, 6, 0, 3, 0, 0, 4, 0, 11, 3, 14, 7, 14, 10, 11, 10, 8, 7, 6, 3, 6, 0, 8]],
        ['9'] = [[10, 6, 7, 8, 3, 8, 0, 6, 0, 3, 3, 0, 7, 0, 10, 3, 10, 10, 7, 14, 3, 14, 1, 13]]
    };
    static readonly char[] Alphabet = [.. Glyphs.Keys];

    static float Rand(float min, float max) => min + (float)(RandomNumberGenerator.GetInt32(0, 10_001) / 10_000.0) * (max - min);
    static string F(float v) => v.ToString("0.#", CultureInfo.InvariantCulture);

    public static (string Code, string Svg) Create()
    {
        var code = new string(Enumerable.Range(0, Length).Select(_ => Alphabet[RandomNumberGenerator.GetInt32(Alphabet.Length)]).ToArray());
        var svg = new StringBuilder();
        svg.Append($"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 {Width} {Height}\" width=\"{Width}\" height=\"{Height}\">");
        svg.Append($"<rect width=\"{Width}\" height=\"{Height}\" rx=\"10\" fill=\"#f6f3e8\"/>");

        // Arka plan: soluk dalgalı çizgiler ve noktalar.
        for (var i = 0; i < 6; i++)
            svg.Append($"<path d=\"M0 {F(Rand(5, 75))} Q{F(Rand(40, 180))} {F(Rand(-20, 100))} {Width} {F(Rand(5, 75))}\" fill=\"none\" stroke=\"#c9c2a8\" stroke-width=\"{F(Rand(0.8f, 1.6f))}\"/>");
        for (var i = 0; i < 40; i++)
            svg.Append($"<circle cx=\"{F(Rand(0, Width))}\" cy=\"{F(Rand(0, Height))}\" r=\"{F(Rand(0.6f, 1.8f))}\" fill=\"{Ink[RandomNumberGenerator.GetInt32(Ink.Length)]}\" opacity=\"{F(Rand(0.2f, 0.5f))}\"/>");

        // Karakterler: her biri farklı boyut, eğim, kalınlık ve renk; köşeler titretilir.
        for (var i = 0; i < code.Length; i++)
        {
            var scale = Rand(2.5f, 3.2f);
            var angle = Rand(-16, 16);
            var x = 14 + i * 39 + Rand(-3, 3);
            var y = 14 + Rand(-3, 4);
            var color = Ink[RandomNumberGenerator.GetInt32(Ink.Length)];
            var d = new StringBuilder();
            foreach (var stroke in Glyphs[code[i]])
            {
                for (var k = 0; k < stroke.Length; k += 2)
                {
                    var px = stroke[k] + Rand(-0.7f, 0.7f);
                    var py = stroke[k + 1] + Rand(-0.7f, 0.7f);
                    if (k > 0)
                    {
                        // İki nokta arasına sapmalı bir ara nokta: düz çizgiler el yazısı gibi kıvrılır.
                        var mx = (stroke[k - 2] + stroke[k]) / 2 + Rand(-0.9f, 0.9f);
                        var my = (stroke[k - 1] + stroke[k + 1]) / 2 + Rand(-0.9f, 0.9f);
                        d.Append($"Q{F(mx)} {F(my)} {F(px)} {F(py)}");
                    }
                    else d.Append($"M{F(px)} {F(py)}");
                }
            }
            svg.Append($"<path transform=\"translate({F(x)} {F(y)}) rotate({F(angle)} 5 7) scale({F(scale)} {F(scale * Rand(0.85f, 1.1f))}) skewX({F(Rand(-12, 12))})\" d=\"{d}\" fill=\"none\" stroke=\"{color}\" stroke-width=\"{F(Rand(1.05f, 1.45f))}\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>");
        }

        // Ön plan: harfleri kesen birkaç eğri (otomatik ayrıştırmayı zorlaştırır).
        for (var i = 0; i < 3; i++)
            svg.Append($"<path d=\"M{F(Rand(-10, 20))} {F(Rand(10, 70))} C{F(Rand(40, 90))} {F(Rand(-30, 110))} {F(Rand(120, 170))} {F(Rand(-30, 110))} {F(Rand(200, 230))} {F(Rand(10, 70))}\" fill=\"none\" stroke=\"{Ink[RandomNumberGenerator.GetInt32(Ink.Length)]}\" stroke-width=\"{F(Rand(1.4f, 2.4f))}\" opacity=\"0.85\" stroke-linecap=\"round\"/>");
        svg.Append("</svg>");
        return (code, svg.ToString());
    }
}
