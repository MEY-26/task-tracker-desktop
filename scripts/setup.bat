@echo off
setlocal enabledelayedexpansion

REM Task Tracker Desktop - Windows Otomatik Kurulum Script'i
REM Bu script projeyi Windows'ta otomatik olarak kurar ve yapılandırır

echo.
echo ==========================================
echo Task Tracker Desktop - Otomatik Kurulum
echo ==========================================
echo.

REM Gereksinimleri kontrol et
echo [INFO] Gereksinimler kontrol ediliyor...

REM Node.js kontrolü
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js bulunamadı. Lütfen Node.js 18+ yükleyin.
    pause
    exit /b 1
)

for /f "tokens=1,2,3 delims=." %%a in ('node --version') do (
    set NODE_VERSION=%%a
    set NODE_VERSION=!NODE_VERSION:~1!
)

if !NODE_VERSION! lss 18 (
    echo [ERROR] Node.js 18+ gerekli. Mevcut sürüm: 
    node --version
    pause
    exit /b 1
)

echo [SUCCESS] Node.js sürümü: 
node --version

REM npm kontrolü
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm bulunamadı.
    pause
    exit /b 1
)

echo [SUCCESS] npm sürümü: 
npm --version

REM PHP kontrolü
php --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] PHP bulunamadı. Lütfen PHP 8.2+ yükleyin.
    pause
    exit /b 1
)

echo [SUCCESS] PHP sürümü: 
php --version

REM Composer kontrolü
composer --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Composer bulunamadı. Lütfen Composer yükleyin.
    pause
    exit /b 1
)

echo [SUCCESS] Composer sürümü: 
composer --version

REM Frontend kurulumu
echo.
echo [INFO] Frontend bağımlılıkları yükleniyor...

if not exist "package.json" (
    echo [ERROR] package.json bulunamadı. Doğru dizinde olduğunuzdan emin olun.
    pause
    exit /b 1
)

npm install
if %errorlevel% neq 0 (
    echo [ERROR] Frontend bağımlılıkları yüklenirken hata oluştu.
    pause
    exit /b 1
)

echo [SUCCESS] Frontend bağımlılıkları başarıyla yüklendi.

REM Backend kurulumu
echo.
echo [INFO] Backend kurulumu başlatılıyor...

if not exist "task-tracker-api" (
    echo [ERROR] task-tracker-api dizini bulunamadı.
    pause
    exit /b 1
)

cd task-tracker-api

REM Composer bağımlılıkları
echo [INFO] Composer bağımlılıkları yükleniyor...
composer install --no-interaction

if %errorlevel% neq 0 (
    echo [ERROR] Composer bağımlılıkları yüklenirken hata oluştu.
    pause
    exit /b 1
)

REM .env dosyası oluştur
if not exist ".env" (
    echo [INFO] .env dosyası oluşturuluyor...
    copy env.example .env >nul
    
    REM Laravel key generate
    php artisan key:generate --no-interaction
    echo [SUCCESS] .env dosyası oluşturuldu ve Laravel key generate edildi.
) else (
    echo [WARNING] .env dosyası zaten mevcut.
)

cd ..

REM Veritabanı kurulumu
echo.
echo [INFO] Veritabanı kurulumu...

cd task-tracker-api

REM Migration'ları çalıştır
echo [INFO] Veritabanı migration'ları çalıştırılıyor...
php artisan migrate --force

if %errorlevel% equ 0 (
    echo [SUCCESS] Veritabanı migration'ları başarıyla tamamlandı.
) else (
    echo [WARNING] Migration'lar çalıştırılamadı. Veritabanı bağlantısını kontrol edin.
)

REM Seed'leri çalıştır
echo [INFO] Veritabanı seed'leri çalıştırılıyor...
php artisan db:seed --force

if %errorlevel% equ 0 (
    echo [SUCCESS] Veritabanı seed'leri başarıyla tamamlandı.
) else (
    echo [WARNING] Seed'ler çalıştırılamadı.
)

cd ..

REM Build işlemi
echo.
echo [INFO] Uygulama build ediliyor...

npm run build:ui

if %errorlevel% neq 0 (
    echo [ERROR] Build işlemi başarısız oldu.
    pause
    exit /b 1
)

echo [SUCCESS] Uygulama başarıyla build edildi.

REM Kurulum sonrası bilgiler
echo.
echo [SUCCESS] 🎉 Kurulum tamamlandı!
echo.
echo 📋 Sonraki adımlar:
echo 1. Veritabanı ayarlarını kontrol edin: task-tracker-api\.env
echo 2. API sunucusunu başlatın: cd task-tracker-api ^&^& php artisan serve
echo 3. Electron uygulamasını başlatın: npm run dev
echo.
echo 📚 Daha fazla bilgi için README.md dosyasını okuyun.
echo.

pause
