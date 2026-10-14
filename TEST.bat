@echo off
cd /d "%~dp0"
dotnet run --project tests\Hasadim.Tests
pause
