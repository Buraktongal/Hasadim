@echo off
setlocal
cd /d "%~dp0"
for %%F in ("src\Hasadim.Web\Hasadim.Web.csproj" "src\Hasadim.Web\appsettings.json" "src\Hasadim.Web\Properties\launchSettings.json") do (
 if not exist "%%~F" (
  echo Eksik dosya: %%~F
  echo Onarim paketini Hasadim.slnx bulunan klasore cikarin.
  goto failed
 )
)
where dotnet >nul 2>nul
if errorlevel 1 goto missing
dotnet dev-certs https --trust
if errorlevel 1 goto failed
dotnet build Hasadim.slnx
if errorlevel 1 goto failed
start "Hasadim API - 7206" cmd /k dotnet run --no-build --project src\Hasadim.Api --launch-profile Hasadim.Api
start "Hasadim Web - 7106" cmd /k dotnet run --no-build --project src\Hasadim.Web --launch-profile Hasadim.Web
echo Iki konsolda da Now listening on satirini bekleyin.
echo Tarayicida https://localhost:7106 adresini acin.
pause
exit /b 0
:missing
echo .NET 10 SDK gerekli. Visual Studio ASP.NET is yukunu kontrol edin.
pause
exit /b 1
:failed
echo Islem tamamlanamadi. Yukaridaki hata metnini kontrol edin.
pause
exit /b 1
