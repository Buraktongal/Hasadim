namespace Hasadim.Api.Hosting;

/// <summary>
/// Fotoğrafların ve oturum anahtarlarının saklandığı kök klasör. Varsayılan: uygulama klasöründeki App_Data.
/// Yayında "Storage:Root" ayarıyla uygulama klasörünün DIŞINDA kalıcı bir klasör verilmelidir
/// (ör. D:\HasadimVeri veya /var/hasadim). Böylece yeni sürüm yüklerken ya da sunucu yenilenirken dosyalar silinmez
/// ve yedeklemeye tek bir klasör eklemek yeter.
/// </summary>
public static class StoragePaths
{
    public static string Root(IConfiguration config, IHostEnvironment env)
    {
        var root = config["Storage:Root"];
        return string.IsNullOrWhiteSpace(root) ? Path.Combine(env.ContentRootPath, "App_Data") : Path.GetFullPath(root);
    }

    public static string Folder(IConfiguration config, IHostEnvironment env, string name)
    {
        var path = Path.Combine(Root(config, env), name);
        Directory.CreateDirectory(path);
        return path;
    }
}
