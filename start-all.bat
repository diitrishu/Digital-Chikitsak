
@echo off
echo Digital Chikitsak - Starting All Services
echo ======================================

REM Change to the backend directory and start the main API
echo Starting Main Backend API (Port 5000)...
cd /d "%~dp0backend\chikitsak-backend"
start "Main API" /min cmd /c "python app.py"

REM Wait a moment for the first service to start
timeout /t 5 /nobreak >nul

REM Start the disease prediction API
echo Starting Disease Prediction API (Port 5001)...
start "Disease Prediction API" /min cmd /c "python api.py"

REM Wait a moment for the second service to start
timeout /t 5 /nobreak >nul

REM Change to the frontend directory and start the development server
echo Starting Frontend Development Server...
cd /d "%~dp0frontend\rishu-diital-chikitsak"
start "Frontend" /max cmd /c "npm run dev"

echo.
echo All services started successfully!
echo.
echo Main Backend API: http://localhost:5000
echo Disease Prediction API: http://localhost:5001
echo Frontend: http://localhost:5173 (or next available port)
echo.
echo Close this window to stop all services.
echo.
pause