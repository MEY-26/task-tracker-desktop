@echo off
echo Starting Task Tracker for Network Access...
echo.

REM Get local IP address
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    for /f "tokens=1" %%b in ("%%a") do (
        set LOCAL_IP=%%b
        goto :found
    )
)
:found

echo Your local IP address is: %LOCAL_IP%
echo.
echo Frontend will be available at:
echo   http://localhost:5173
echo   http://%LOCAL_IP%:5173
echo.
echo Backend API will be available at:
echo   http://localhost:8000
echo   http://%LOCAL_IP%:8000
echo.

REM Start Laravel API server
echo Starting Laravel API server...
start "Laravel API" cmd /k "cd /d %~dp0..\task-tracker-api && php artisan serve --host=0.0.0.0 --port=8000"

REM Wait a moment for Laravel to start
timeout /t 3 /nobreak >nul

REM Start Vite development server
echo Starting Vite development server...
start "Vite Dev Server" cmd /k "cd /d %~dp0.. && npm run dev:network"

echo.
echo Both servers are starting...
echo You can access the application from other devices using:
echo   http://%LOCAL_IP%:5173
echo.
pause
