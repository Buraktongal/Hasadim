@echo off
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\Setup-Gmail.ps1"
if errorlevel 1 echo E-posta ayarlari tamamlanamadi.
pause
