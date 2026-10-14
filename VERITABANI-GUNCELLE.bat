@echo off
setlocal
cd /d "%~dp0"
dotnet run --project src\Hasadim.Api --launch-profile Hasadim.Api -- --migrate
if errorlevel 1 (echo Migration basarisiz.) else (echo Migration tamamlandi.)
pause
