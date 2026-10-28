$ErrorActionPreference = 'Stop'
Write-Host 'Gmail icin Google 2 Adimli Dogrulama ve 16 harfli uygulama sifresi gereklidir.'
Write-Host 'Normal Gmail sifrenizi girmeyin. Degerler Git disindaki yerel kullanici sirlarina kaydedilir.'
$mailAddress = (Read-Host 'Gonderici Gmail adresi').Trim()
if ($mailAddress -notmatch '^[^\s@]+@gmail\.com$') { throw 'Gecerli bir Gmail adresi girin.' }
$securePassword = Read-Host 'Google uygulama sifresi (ekranda gorunmez)' -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
try {
    $appPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer).Replace(' ', '')
    if ($appPassword -notmatch '^[a-zA-Z]{16}$') { throw '16 harfli Google uygulama sifresi gerekli. Normal hesap sifresi kullanilmaz.' }
    $settings = @{
        'Mail:Host' = 'smtp.gmail.com'; 'Mail:Port' = '587'
        'Mail:User' = $mailAddress; 'Mail:From' = $mailAddress; 'Mail:Password' = $appPassword
    } | ConvertTo-Json -Compress
    # Sifre komut satirina veya gecici dosyaya yazilmaz; standart giristen aktarilir.
    $settings | & dotnet user-secrets set --project (Join-Path $PSScriptRoot '..\src\Hasadim.Api')
    if ($LASTEXITCODE -ne 0) { throw 'Yerel e-posta ayarlari kaydedilemedi.' }
    Write-Host 'Ayarlar kaydedildi. API uygulamasini yeniden baslatin. SMTP baglantisi henuz test edilmedi.'
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    $appPassword = $null
    $settings = $null
    $securePassword.Dispose()
}
