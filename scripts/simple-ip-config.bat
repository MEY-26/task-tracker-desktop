@echo off
echo ========================================
echo BASIT IP KONFIGURASYONU
echo ========================================
echo.

echo 1. MEVCUT IP ADRESLERI:
echo ------------------------
ipconfig | findstr "IPv4 Address"
echo.

echo 2. IP ADRESI GIRIN:
echo --------------------
set /p SYSTEM_IP="Sistem IP adresinizi girin (orn: 192.168.1.100): "

if "%SYSTEM_IP%"=="" (
    echo HATA: IP adresi girilmedi!
    pause
    exit /b 1
)

echo.
echo 3. KONFIGURASYON GUNCELLENIYOR...
echo ----------------------------------

REM CORS dosyasını güncelle
powershell -Command "(Get-Content 'task-tracker-api\config\cors.php') -replace 'http://YENİ_IP_ADRESİNİZ:5173', 'http://%SYSTEM_IP%:5173' -replace 'http://YENİ_IP_ADRESİNİZ:5174', 'http://%SYSTEM_IP%:5174' -replace 'http://YENİ_IP_ADRESİNİZ:3000', 'http://%SYSTEM_IP%:3000' | Set-Content 'task-tracker-api\config\cors.php'"

REM .env dosyasını güncelle
powershell -Command "(Get-Content 'task-tracker-api\.env') -replace 'APP_URL=http://localhost:8000', 'APP_URL=http://%SYSTEM_IP%:8000' | Set-Content 'task-tracker-api\.env'"

echo ✓ CORS konfigurasyonu guncellendi
echo ✓ Laravel .env dosyasi guncellendi

echo.
echo 4. LARAVEL CACHE TEMIZLENIYOR...
echo --------------------------------
cd task-tracker-api
php artisan config:clear
php artisan cache:clear
cd ..

echo ✓ Laravel cache temizlendi
echo.

echo 5. KONFIGURASYON TAMAMLANDI!
echo =============================
echo.
echo Sistem IP'niz: %SYSTEM_IP%
echo.
echo Erisim adresleri:
echo   Yerel:  http://localhost:5173
echo   Ag:     http://%SYSTEM_IP%:5173
echo   API:    http://%SYSTEM_IP%:8000
echo.
echo Uygulamayi baslatmak icin:
echo   scripts\start-network.bat
echo.
echo ========================================
echo KONFIGURASYON TAMAMLANDI
echo ========================================
pause
