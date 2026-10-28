@echo off
setlocal
cd /d "%~dp0"
where dotnet >nul 2>nul
if errorlevel 1 (
    echo .NET 10 SDK bulunamadi.
    goto failed
)
where node >nul 2>nul
if errorlevel 1 (
    echo Arayuz testleri icin Node.js kurulumu gerekli.
    goto failed
)
dotnet build Hasadim.slnx
if errorlevel 1 goto failed
dotnet run --no-build --project tests\Hasadim.Tests
if errorlevel 1 goto failed
node tests\ui-smoke.cjs
if errorlevel 1 goto failed
node tests\listing-workflow.cjs
if errorlevel 1 goto failed
node tests\static-paths.cjs
if errorlevel 1 goto failed
echo Tum yerel kontroller basarili. Gercek veritabani testi ayri calistirilir.
pause
exit /b 0

:failed
echo Test tamamlanamadi. Yukaridaki hata metnini kontrol edin.
pause
exit /b 1
