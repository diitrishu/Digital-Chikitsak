@echo off
echo Digital Chikitsak - Stopping All Services
echo ======================================

echo Terminating Python processes...
taskkill /f /im python.exe 2>nul

echo Terminating Node.js processes...
taskkill /f /im node.exe 2>nul

echo.
echo All services stopped.
echo.
pause