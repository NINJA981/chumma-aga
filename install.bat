@echo off
title VocalPulse - Install Dependencies

echo.
echo  ╔══════════════════════════════════════════════╗
echo  ║     VocalPulse - Installing Dependencies     ║
echo  ╚══════════════════════════════════════════════╝
echo.

echo [1/2] Installing Backend dependencies...
cd backend
call npm install
cd ..

echo.
echo [2/2] Installing Web Dashboard dependencies...
cd web
call npm install
cd ..

echo.
echo ══════════════════════════════════════════════════
echo  ✓ All dependencies installed!
echo  ✓ Run 'run.bat' to start the servers
echo ══════════════════════════════════════════════════
echo.
pause
