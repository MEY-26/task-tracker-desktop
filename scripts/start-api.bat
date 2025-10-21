@echo off
cd /d "%~dp0..\task-tracker-api"

:restart
echo Starting Laravel API server...
php artisan serve --host=0.0.0.0 --port=8000
if %errorlevel% neq 0 (
    echo API server crashed, restarting in 3 seconds...
    timeout /t 3 /nobreak >nul
    goto restart
)
