@echo off
echo Setting up Windows Firewall rules for Task Tracker...
echo.
echo This script needs to be run as Administrator.
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% == 0 (
    echo Running as Administrator - OK
) else (
    echo ERROR: This script must be run as Administrator!
    echo Right-click on this file and select "Run as administrator"
    pause
    exit /b 1
)

echo.
echo Adding firewall rules...

REM Add rule for Vite dev server (port 5173)
netsh advfirewall firewall add rule name="Task Tracker - Vite Dev Server" dir=in action=allow protocol=TCP localport=5173
if %errorLevel% == 0 (
    echo ✓ Rule added for port 5173 (Vite Dev Server)
) else (
    echo ✗ Failed to add rule for port 5173
)

REM Add rule for Laravel API (port 8000)
netsh advfirewall firewall add rule name="Task Tracker - Laravel API" dir=in action=allow protocol=TCP localport=8000
if %errorLevel% == 0 (
    echo ✓ Rule added for port 8000 (Laravel API)
) else (
    echo ✗ Failed to add rule for port 8000
)

echo.
echo Firewall setup complete!
echo.
echo Your Task Tracker is now accessible from other devices at:
echo   http://192.168.1.180:5173
echo   http://172.23.16.1:5173
echo.
pause
