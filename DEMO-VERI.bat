@echo off
setlocal
cd /d "%~dp0"
echo.
echo  DIKKAT: Bu islem gelistirme veritabanindaki TUM kullanicilari, ilanlari,
echo  mesajlari, favorileri ve yuklenmis fotograflari SILER.
echo  Ardindan 5 kullanici, 1 yonetici ve 100 ornek ilan olusturur.
echo  Once API konsolunu kapatin (Ctrl+C).
echo.
choice /C EH /M "Devam etmek istiyor musunuz? (E = Evet, H = Hayir)"
if errorlevel 2 goto cancelled
where dotnet >nul 2>nul
if errorlevel 1 goto missing
dotnet run --project src\Hasadim.Api --launch-profile Hasadim.Api -- --seed-demo
if errorlevel 1 goto failed
echo.
echo Tamamlandi. BASLAT.bat ile uygulamayi acabilirsiniz.
pause
exit /b 0
:cancelled
echo Islem iptal edildi. Hicbir veri silinmedi.
pause
exit /b 0
:missing
echo .NET 10 SDK gerekli.
pause
exit /b 1
:failed
echo Islem tamamlanamadi. Yukaridaki hata metnini kontrol edin.
pause
exit /b 1
