
@echo off
setlocal enabledelayedexpansion

echo Digital Chikitsak - Starting All Services
echo ======================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8+ and add it to your PATH
    echo.
    pause
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js 16+ and add it to your PATH
    echo.
    pause
    exit /b 1
)

REM Check if pip is installed
pip --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: pip is not installed
    echo Please install pip or ensure it's in your PATH
    echo.
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: npm is not installed
    echo Please install npm or ensure it's in your PATH
    echo.
    pause
    exit /b 1
)

echo Prerequisites check passed!
echo.

REM Install backend dependencies if requirements.txt exists
echo Checking backend dependencies...
cd /d "%~dp0backend\chikitsak-backend"
if exist "requirements.txt" (
    echo Installing Python dependencies...
    pip install -r requirements.txt
    if !errorlevel! neq 0 (
        echo WARNING: Failed to install Python dependencies
        echo Continuing anyway...
        echo.
    )
)

REM Install frontend dependencies if package.json exists
echo Checking frontend dependencies...
cd /d "%~dp0frontend\rishu-diital-chikitsak"
if exist "package.json" (
    echo Installing Node.js dependencies...
    npm install
    if !errorlevel! neq 0 (
        echo WARNING: Failed to install Node.js dependencies
        echo Continuing anyway...
        echo.
    )
)

echo.
echo Starting services...
echo.

REM Change to the backend directory and start the main API
echo Starting Main Backend API (Port 5000)...
cd /d "%~dp0backend\chikitsak-backend"
start "Main API" /min cmd /k "python app.py"

REM Wait a moment for the first service to start
timeout /t 5 /nobreak >nul

REM Start the disease prediction API
echo Starting Disease Prediction API (Port 5001)...
start "Disease Prediction API" /min cmd /k "python api.py"

REM Wait a moment for the second service to start
timeout /t 5 /nobreak >nul

REM Change to the frontend directory and start the development server
echo Starting Frontend Development Server...
cd /d "%~dp0frontend\rishu-diital-chikitsak"
start "Frontend" /max cmd /k "npm run dev"

echo.
echo All services started successfully!
echo.
echo Main Backend API: http://localhost:5000
echo Disease Prediction API: http://localhost:5001
echo Frontend: http://localhost:5173 (or next available port)
echo.
echo Note: Services are running in separate command windows
echo Close each window to stop individual services
echo.
echo Press any key to exit this launcher...
pause >nul