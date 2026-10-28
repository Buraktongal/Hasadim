using System.Security.Cryptography;
using System.Text;

namespace Hasadim.Infrastructure.Database;

internal static class MigrationChecksum
{
    private static string Hash(string sql) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(sql)));

    public static string Compute(string sql) => Hash(sql.Replace("\r\n", "\n"));

    public static bool Matches(string sql, string saved)
    {
        // Önceki sürüm ham metni özetliyordu. Git'in LF/CRLF dönüşümü
        // aynı dosya için farklı özet üretmiş olabilir. Yalnızca bu iki
        // biçimi kabul et; boşluk, SQL, yorum ve son satırı değiştirme.
        var lf = sql.Replace("\r\n", "\n");
        return saved == Hash(sql) || saved == Hash(lf) ||
            saved == Hash(lf.Replace("\n", "\r\n"));
    }
}
