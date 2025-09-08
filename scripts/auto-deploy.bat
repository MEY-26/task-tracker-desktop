@echo off
echo ========================================
echo Task Tracker Auto-Deploy Script
echo ========================================
echo.

REM IP adresini otomatik tespit et
echo Detecting IP address...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    for /f "tokens=1" %%b in ("%%a") do (
        set LOCAL_IP=%%b
        goto :found
    )
)
:found

echo Detected IP: %LOCAL_IP%
echo.

REM CORS dosyasını güncelle
echo Updating CORS configuration...
powershell -Command "(Get-Content 'task-tracker-api\config\cors.php') -replace 'http://YENİ_IP_ADRESİNİZ:5173', 'http://%LOCAL_IP%:5173' -replace 'http://YENİ_IP_ADRESİNİZ:5174', 'http://%LOCAL_IP%:5174' -replace 'http://YENİ_IP_ADRESİNİZ:3000', 'http://%LOCAL_IP%:3000' | Set-Content 'task-tracker-api\config\cors.php'"

REM .env dosyasını güncelle
echo Updating Laravel configuration...
powershell -Command "(Get-Content 'task-tracker-api\.env') -replace 'APP_URL=http://localhost:8000', 'APP_URL=http://%LOCAL_IP%:8000' | Set-Content 'task-tracker-api\.env'"

REM Laravel cache'i temizle
echo Clearing Laravel cache...
cd task-tracker-api
php artisan config:clear
php artisan cache:clear
cd ..

echo.
echo ========================================
echo Configuration Updated Successfully!
echo ========================================
echo.
echo Your Task Tracker is configured for IP: %LOCAL_IP%
echo.
echo Access URLs:
echo   Frontend: http://%LOCAL_IP%:5173
echo   API:      http://%LOCAL_IP%:8000
echo.
echo Starting application...
echo.

REM Uygulamayı başlat
npm run start:network
