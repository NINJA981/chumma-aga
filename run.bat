@echo off
title VocalPulse Development Server

echo.
echo  ╔══════════════════════════════════════════════╗
echo  ║        VocalPulse Development Server         ║
echo  ║     Sales Intelligence Platform              ║
echo  ╚══════════════════════════════════════════════╝
echo.

:: Check if .env exists in backend
if not exist "backend\.env" (
    echo [!] Backend .env file not found!
    echo     Copying .env.example to .env...
    copy "backend\.env.example" "backend\.env"
    echo.
    echo [!] Please edit backend\.env with your credentials:
    echo     - DATABASE_URL
    echo     - JWT_SECRET
    echo     - OPENAI_API_KEY (optional)
    echo     - TWILIO credentials (optional)
    echo.
    pause
    exit /b
)

:: Start Backend in new window
echo [1/2] Starting Backend Server (Port 3001)...
start "VocalPulse Backend" cmd /k "cd backend && npm run dev"

:: Wait a moment for backend to start
timeout /t 3 /nobreak > nul

:: Start Web Frontend in new window
echo [2/2] Starting Web Dashboard (Port 3000)...
start "VocalPulse Web" cmd /k "cd web && npm run dev"

echo.
echo ══════════════════════════════════════════════════
echo  ✓ Backend:    http://localhost:3001
echo  ✓ Frontend:   http://localhost:3000
echo  ✓ API Health: http://localhost:3001/api/health
echo ══════════════════════════════════════════════════
echo.
echo Press any key to open the dashboard in your browser...
pause > nul

start http://localhost:3000
