# Task Tracker Desktop

Modern bir masaüstü görev takip uygulaması. Electron ve React kullanılarak geliştirilmiştir.

## 🚀 Özellikler

### 📋 Görev Yönetimi
- ✅ Görev oluşturma ve düzenleme
- 📅 Tarih bazlı görev yönetimi (başlangıç/bitiş tarihleri)
- 🏷️ **Custom Görev Türleri**: Admin'ler özel görev türleri oluşturabilir ve yönetebilir
- 📊 **Custom Görev Durumları**: Her görev türü için özel durumlar tanımlanabilir
- ⭐ Öncelik seviyeleri (Düşük, Orta, Yüksek, Kritik)
- 📝 Görev geçmişi ve yorum sistemi
- 🔄 Gerçek zamanlı güncellemeler
- 🎯 **Akıllı Durum Yönetimi**: Görev türü değiştiğinde durum otomatik reset

### 👥 Kullanıcı Yönetimi
- 🎯 Rol tabanlı erişim kontrolü (Admin, Takım Lideri, Takım Üyesi, Gözlemci)
- 📊 Excel'den toplu kullanıcı ekleme
- 🔍 Gelişmiş kullanıcı arama sistemi
- 🔐 Şifre sıfırlama sistemi
- 👥 **Toplu Lider Atama**: Seçili takım üyelerine toplu lider atama
- 🗑️ **Toplu Kullanıcı Silme**: Seçili kullanıcıları toplu silme (admin hariç)
- 🔑 **Özel Düzenleme İzni**: Admin'ler kullanıcılara geçici haftalık hedef düzenleme izni verebilir

### 📎 Dosya Yönetimi
- 📎 Görevlere dosya ekleme desteği
- 📁 Çoklu dosya yükleme
- 🗑️ Dosya silme yetkisi kontrolü
- 📊 Dosya boyutu ve türü gösterimi

### 🔔 Bildirim Sistemi
- 🔔 Gerçek zamanlı bildirim güncellemeleri
- 🔄 Görev durumu değişiklik bildirimleri
- 👥 Kullanıcı atama bildirimleri
- ✅ Haftalık hedef onay/red bildirimleri
- 📅 İzin bildirimi entegrasyonu

### 🎯 Haftalık Hedef Sistemi
- 📊 Haftalık hedef oluşturma ve takibi
- 🔒 Hedef kilitleme sistemi (rol bazlı: üye 10:00, lider 13:30, admin sınırsız)
- 🏆 Liderlik tablosu ve performans skorlama
- 📈 Gerçek zamanlı hedef analizi
- ⏰ Mesai süresi desteği (overtime minutes)
- 🎁 Mesai bonusu sistemi (1.5x çarpan)
- 👨‍💼 Admin kilitleme bypass yetkisi
- 🔄 Otomatik liste güncelleme sistemi
- ✅ **Onay Sistemi**: Takım üyelerinin haftalık hedefleri lider/admin onayı gerektirir
- 📝 **Onay Notu**: Onayla/Reddet butonları, onay durumu badge'i ve bildirim entegrasyonu
- 📅 **İzin Bildirimi**: Takvim seçimli izin bildirimi modalı, izin süreleri otomatik hedeflere yansır
- 🔑 **Özel Düzenleme İzni**: Admin'ler kullanıcılara geçici hedef düzenleme izni verebilir
- 🔓 **Bağımsız İzin/Mesai Alanları**: İzin ve Mesai girişleri hedef kilitleme durumundan bağımsız çalışır
- 📋 **Önceki Haftadan İş Aktarma**: Tamamlanmamış işleri önceki haftadan yeni haftaya aktarma özelliği
- 📅 **Günlük Gerçekleşme Kotası**: Haftalık taban süre 2700 dk, günlük limitler (her gün 540 dk) ile haftanın önden doldurulması engellenir
- ⏱️ **Günlük Mesai Kotası**: Günlük mesai limitleri ve hafta sonu ek mesai desteği
- 🚫 **Geçmiş Hafta Kilitleme**: Rol bazlı kilitleme kuralları
- 🔒 **Gelecek Haftalar Kilitleme**: Gelecek haftalar için gerçekleşme alanları kilitlidir (sadece mevcut hafta için açık)
- ⚠️ **Anlık Uyarı Sistemi**: Hedef ve gerçekleşme alanlarında anlık kontrol ve görsel geri bildirim
- 🛡️ **Kaydet Butonu Kontrolü**: Uyarı durumlarında kaydet butonu devre dışı bırakılır
- 📊 **Rol Bazlı Puanlama**: Admin tam skor, Takım Lideri harf notu, diğer roller puanlama gizli

### ⚡ Performans ve Optimizasyon
- 🚀 Memoized görev filtreleme sistemi
- 🔧 Optimized React hooks kullanımı
- 📱 Responsive tasarım ve mobil uyumluluk
- 🎨 Modern UI/UX tasarımı

## 📋 Gereksinimler

### Frontend (Electron App)
- Node.js (v18 veya üzeri)
- npm veya yarn

### Backend (Laravel API)

**Geliştirme Ortamı (Windows/Mac/Linux):**
- PHP 8.2 veya üzeri
- Composer
- SQLite (veya MySQL/PostgreSQL)
- Laravel 12

**Production Ortamı (Linux - Önerilen):**
- PHP 8.3-FPM (çoklu istek desteği için)
- Nginx (reverse proxy)
- Composer
- SQLite (veya PostgreSQL - 80+ kullanıcı için)
- Systemd (servis yönetimi)

**Mail Servisi (Opsiyonel):**
- SMTP Mail Server (Gmail, Outlook, vb.)

## 🛠️ Kurulum

### 1. Projeyi İndirin
```bash
git clone https://github.com/MEY-26/task-tracker-desktop.git
cd task-tracker-desktop
```

### 2. Bağımlılıkları Yükleyin
```bash
npm install
cd task-tracker-api
composer install
```

### 3. Laravel'i Hazırlayın
**Not**: Bu komutlar migration ve seeding sırasında çıkan onay sorularına otomatik "yes" yanıtı verir.

```bash
copy .env.example .env
php artisan key:generate
php artisan migrate
yes
php artisan db:seed
yes
```

### 4. Uygulamayı Başlatın
```bash
cd ..
scripts\setup.bat
npm run start:network
```

## 🌐 Ağ Erişimi

Uygulamayı local ağınızdaki diğer cihazlardan erişilebilir hale getirmek için:

### 🚀 Hızlı Başlangıç

```bash
# Windows
scripts\setup.bat

# Linux/Mac
./scripts/setup.sh

# NPM
npm run start:network
```

### 📱 Erişim Adresleri

**Yerel:**
- Frontend: `http://localhost:5173`
- API: `http://localhost:8000`

**Ağ:**
- Frontend: `http://[YOUR_IP]:5173`
- API: `http://[YOUR_IP]:8000`

### 🔧 Manuel Başlatma

```bash
# Terminal 1 - API
cd task-tracker-api
php artisan serve --host=0.0.0.0 --port=8000

# Terminal 2 - Frontend (yeni terminal açın)
npm run dev:web
```

### ⚠️ Güvenlik

- Sadece güvendiğiniz ağlarda kullanın
- Firewall ayarlarınızı kontrol edin
- Production'da HTTPS kullanın

### 🔧 Sorun Giderme

**CORS Hatası:**
- `task-tracker-api/config/cors.php` dosyasını kontrol edin

**Bağlantı Kurulamıyor:**
- Firewall ayarlarınızı kontrol edin
- Port 5173 ve 8000'in açık olduğundan emin olun

**Laravel API Başlamıyor:**
- `.env` dosyasının mevcut olduğundan emin olun
- `php artisan key:generate` komutunu çalıştırın

**Mail Hatası:**
- `TaskNotificationMail` sınıfı eksikse, mail gönderimi devre dışı bırakılmıştır
- Mail ayarlarını `.env` dosyasında yapılandırın

## 🏗️ Geliştirme

### Geliştirme Modunda Çalıştırma
```bash
# Backend - Terminal 1
cd task-tracker-api
php artisan serve

# Frontend - Terminal 2 (yeni terminal açın)
npm run dev
```

### Production Build
```bash
npm run build
```

## 📜 Kullanılabilir Scripts

### Ağ Erişimi (Yerel Geliştirme)
- `scripts\setup.bat` - Windows için kurulum ve başlatma
- `scripts\setup.sh` - Linux/Mac için kurulum ve başlatma
- `npm run start:network` - NPM ile ağ erişimi (eşzamanlı API ve Frontend başlatma)

**Not**: Production'da artisan serve kullanmayın. Bunun yerine aşağıdaki "Production Deployment" bölümündeki Nginx + PHP-FPM kurulumunu yapın.

### API Yönetimi (Yerel Geliştirme)
- `npm run api:serve` - Laravel API'yi başlat (host=0.0.0.0, port=8000)

### Geliştirme
- `npm run dev` - Electron geliştirme modu (localhost)
- `npm run dev:network` - Electron geliştirme modu (network erişimi)
- `npm run dev:web` - Sadece Vite dev server (Electron olmadan)

### Kurulum
- `npm run setup` - Tüm bağımlılıkları yükle
- `npm run setup:dev` - Geliştirme ortamı kurulumu

### Build ve Dağıtım
- `npm run build:ui` - Frontend build
- `npm run build` - Electron uygulamasını paketler
- `npm run build:win` - Windows için build
- `npm run build:mac` - macOS için build
- `npm run build:linux` - Linux için build

### Test ve Kalite Kontrol
- `npm run lint` - ESLint ile kod kalitesi kontrolü
- `npm run lint:fix` - ESLint hataları otomatik düzelt
- `npm run build:ui` - Frontend build testi
- `cd task-tracker-api && php artisan test` - Backend testleri

## 📁 Proje Yapısı

```
task-tracker-desktop/
├── electron/                 # Electron ana süreç dosyaları
│   ├── main.js              # Electron main process
│   └── preload.cjs          # Preload script
├── src/                     # React frontend uygulaması
│   ├── App.jsx              # Ana uygulama komponenti
│   ├── main.jsx             # Uygulama giriş noktası
│   ├── api.js               # API bağlantı ayarları
│   ├── components/          # React bileşenleri
│   │   ├── account/         # Hesap yönetimi (PasswordChangeForm)
│   │   ├── admin/           # Admin bileşenleri (AdminCreateUser)
│   │   ├── auth/            # Kimlik doğrulama (LoginScreen)
│   │   ├── forms/           # Form bileşenleri (AddTaskForm)
│   │   ├── layout/          # Sayfa düzeni (AppFooter)
│   │   ├── modals/          # Modal bileşenler
│   │   │   ├── EditGrantModal.jsx
│   │   │   ├── GoalDescriptionModal.jsx
│   │   │   ├── LeaveRequestModal.jsx
│   │   │   ├── TaskDetailModal.jsx
│   │   │   ├── TaskSettingsModal.jsx
│   │   │   ├── TeamModal.jsx
│   │   │   ├── ThemePanel.jsx
│   │   │   ├── UpdatesModal.jsx
│   │   │   ├── UserProfileModal.jsx
│   │   │   └── WeeklyGoalsModal.jsx
│   │   ├── panels/          # Panel bileşenler
│   │   │   ├── NotificationsPanel.jsx
│   │   │   ├── ProfileMenuDropdown.jsx
│   │   │   └── UserPanel.jsx
│   │   ├── shared/          # Paylaşılan bileşenler
│   │   │   ├── PriorityLabelWithTooltip.jsx
│   │   │   └── TooltipStatus.jsx
│   │   └── views/           # Görünüm bileşenleri
│   │       ├── TaskListView.jsx
│   │       └── WeeklyOverviewView.jsx
│   ├── contexts/            # React Context'ler
│   │   ├── AuthContext.jsx
│   │   ├── NotificationContext.jsx
│   │   └── ThemeContext.jsx
│   ├── hooks/               # Custom React hooks
│   │   ├── useBodyScrollLock.js
│   │   ├── useNotifications.js
│   │   ├── usePreventAutofill.js
│   │   ├── useTaskSettings.js
│   │   ├── useUsers.js
│   │   ├── useWeeklyGoals.js
│   │   └── useWeeklyOverview.js
│   ├── utils/               # Yardımcı fonksiyonlar
│   │   ├── computeWeeklyScore.js
│   │   ├── date.js
│   │   ├── performance.js
│   │   ├── string.js
│   │   ├── tasks.js
│   │   ├── teamAssignments.js
│   │   ├── themes.js
│   │   └── weeklyLimits.js
│   └── assets/              # Statik dosyalar (logolar, ikonlar)
├── task-tracker-api/        # Laravel API backend
│   ├── app/
│   │   ├── Http/Controllers/
│   │   │   ├── AuthController.php
│   │   │   ├── TaskController.php
│   │   │   ├── TaskTypeController.php
│   │   │   ├── TaskStatusController.php
│   │   │   ├── TaskHistoryController.php
│   │   │   ├── UserController.php
│   │   │   ├── PasswordResetController.php
│   │   │   ├── NotificationController.php
│   │   │   ├── WeeklyGoalController.php
│   │   │   ├── WeeklyGoalEditGrantController.php
│   │   │   └── LeaveRequestController.php
│   │   ├── Models/
│   │   ├── Notifications/
│   │   └── Mail/
│   ├── database/
│   │   ├── database.sqlite  # SQLite veritabanı
│   │   ├── migrations/      # Veritabanı şemaları
│   │   └── seeders/         # Başlangıç verileri
│   ├── routes/
│   │   ├── api.php          # API rotaları
│   │   └── web.php          # Web rotaları (dosya indirme)
│   └── .env                 # Ortam değişkenleri
├── scripts/                 # Kurulum ve yönetim scriptleri
│   ├── backup-sqlite.ps1    # Veritabanı yedekleme
│   ├── setup.bat           # Windows kurulum
│   ├── setup.sh            # Linux/Mac kurulum
│   ├── start-api.bat       # Windows için API başlatma
│   ├── start-api.cjs       # Node.js ile API başlatma
│   ├── windows-auto-update.ps1  # Windows otomatik güncelleme
│   ├── linux-update.sh     # Linux otomatik güncelleme
│   ├── deploy-via-scp.sh   # SCP ile deploy
│   └── linux-systemd/      # Linux systemd servis dosyaları
├── .github/workflows/       # CI/CD pipeline
│   └── ci.yml              # GitHub Actions
├── public/                  # Statik web dosyaları (UPDATES.md)
├── package.json             # Node.js bağımlılıkları
└── index.html              # Ana HTML dosyası
```

## 🔧 Yapılandırma

### API URL Ayarları
`src/api.js` dosyasında API URL'ini kendi sunucunuzun adresine göre güncelleyin:

```javascript
// Localhost için
const API_BASE_URL = 'http://localhost:8000/api';

// Local Network için
const API_BASE_URL = 'http://[YOUR_IP]:8000/api';
```

**Not**: Local network kullanımı için IP adresinizi değiştirin.

### Veritabanı Ayarları
`task-tracker-api/.env` dosyasında veritabanı bağlantı bilgilerini güncelleyin:

```env
DB_CONNECTION=sqlite
DB_DATABASE=database/database.sqlite
```

### Mail Ayarları
E-posta bildirimleri için `.env` dosyasında mail ayarlarını yapılandırın:

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_ENCRYPTION=tls
```

### CORS Ayarları
Ağ erişimi için CORS ayarlarını yapılandırın:

```env
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000,app://./
```

## 🚀 Deployment

### Production Deployment (Linux + Nginx + PHP-FPM)

**Önerilen yapı**: Artisan serve yerine **Nginx + PHP-FPM** kullanın. Bu sayede:
- ✅ Çoklu eşzamanlı istek desteği
- ✅ Büyük dosya yüklemesi sırasında sistem kullanılabilir
- ✅ 80+ kullanıcı için ölçeklenebilir performans

#### 1. Sunucu Gereksinimleri
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx php8.3-fpm php8.3-sqlite3 php8.3-mbstring php8.3-xml php8.3-curl
```

#### 2. PHP-FPM Yapılandırması
```bash
# Upload limitlerini ayarlayın
sudo nano /etc/php/8.3/fpm/php.ini
```

Şu ayarları yapın:
```ini
upload_max_filesize = 1024M
post_max_size = 1024M
memory_limit = 512M
max_execution_time = 600
max_input_time = 600
```

Kaydet ve restart:
```bash
sudo systemctl restart php8.3-fpm
```

#### 3. Nginx Yapılandırması
```bash
sudo nano /etc/nginx/sites-available/task-tracker
```

Aşağıdaki içeriği yapıştırın:
```nginx
server {
    listen 80;
    server_name your-domain.com;  # veya IP adresi

    root /path/to/task-tracker-desktop/task-tracker-api/public;
    index index.php;

    client_max_body_size 1024M;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
        fastcgi_read_timeout 600s;
        fastcgi_send_timeout 600s;
    }

    location ~* \.(jpg|jpeg|png|gif|svg|css|js|ico|woff2?)$ {
        expires 7d;
        access_log off;
    }
}
```

Site'ı aktif edin:
```bash
sudo ln -s /etc/nginx/sites-available/task-tracker /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 4. Laravel İzinleri
```bash
# Storage ve database izinleri
sudo chown -R www-data:www-data task-tracker-api/storage
sudo chown -R www-data:www-data task-tracker-api/bootstrap/cache
sudo chown -R www-data:www-data task-tracker-api/database
sudo chmod -R 775 task-tracker-api/storage
sudo chmod -R 775 task-tracker-api/bootstrap/cache
sudo chmod 664 task-tracker-api/database/database.sqlite
```

#### 5. Frontend (Vite) için Systemd Servisi
```bash
sudo nano /etc/systemd/system/task-tracker-frontend.service
```

İçerik:
```ini
[Unit]
Description=Task Tracker Frontend Server
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/task-tracker-desktop
ExecStart=/usr/bin/npm run dev:web
Restart=always
Environment="NODE_ENV=production"

[Install]
WantedBy=multi-user.target
```

Aktif edin:
```bash
sudo systemctl daemon-reload
sudo systemctl enable task-tracker-frontend
sudo systemctl start task-tracker-frontend
```

#### 6. Artisan Serve Servisini Kaldırma (Eski Yapı)
Eğer eski `task-tracker-api.service` varsa devre dışı bırakın:
```bash
sudo systemctl stop task-tracker-api
sudo systemctl disable task-tracker-api
```

#### 7. Frontend API URL Ayarı
`src/api.js` dosyasında API URL artık port olmadan:
```javascript
// Önceki: http://host:8000/api
// Yeni: http://host/api (Nginx üzerinden)
const host = window.location.hostname;
return `http://${host}/api`;
```

#### 8. Test
```bash
# Backend test
curl -I http://localhost/api/user

# Frontend test
curl -I http://localhost:5173
```

### Windows için Executable Oluşturma
```bash
npm run build
```

Build tamamlandıktan sonra `release` klasöründe Windows executable dosyası bulunacaktır.

### Docker ile Deployment
```bash
# Backend için
cd task-tracker-api
docker build -t task-tracker-api .

# Frontend için
docker build -t task-tracker-frontend .
```

## 🔒 Güvenlik

### Güvenlik Özellikleri
- ✅ **CORS Koruması**: Sadece belirtilen origin'lerden erişim
- ✅ **Token Tabanlı Kimlik Doğrulama**: Laravel Sanctum
- ✅ **Rol Tabanlı Erişim Kontrolü**: Granüler yetki yönetimi
- ✅ **Dosya Güvenliği**: İmzalı URL'ler ile güvenli dosya erişimi
- ✅ **Input Validasyonu**: Tüm kullanıcı girdileri doğrulanır
- ✅ **SQL Injection Koruması**: Eloquent ORM kullanımı

### Güvenlik Notları
- Electron penceresinde `webSecurity` açıldı ve `allowRunningInsecureContent` kapatıldı
- CORS artık `.env` ile yönetilebilir. Üretimde `CORS_ALLOWED_ORIGINS` belirleyip `*` kullanmaktan kaçının
- Token'lar tarayıcı `localStorage`'da tutuluyor. XSS risklerini azaltmak için gelecekte OS anahtar zinciri (örn. keytar) gibi seçenekler değerlendirilebilir

## 🧪 Test ve Kalite Kontrol

### CI/CD Pipeline

Bu repo için GitHub Actions tabanlı bir CI yapılandırması eklendi (`.github/workflows/ci.yml`). Pipeline şu işleri yapar:

- **frontend-tests**: Node 20 ile `npm ci` ve `npm run build:ui` çalıştırır (vite derlemesi doğrulanır)
- **code-quality**: ESLint çalıştırır (`npm run lint`). Electron ana süreç dosyaları Node ortamında lint edilir
- **backend-tests**: PHP 8.3 ile Laravel testlerini çalıştırır (`php artisan test`)
- **security-scan**: `npm audit` (prod, yüksek seviye+) ve `composer audit` çalıştırır. Raporlar üretir; pipeline'ı bloklamaz
- **build-electron**: Sadece tag push'larında Electron'u `--dir` modunda paketler ve artifact olarak yükler

### Yerel Test Komutları

```bash
# Frontend derleme testi
npm ci && npm run build:ui

# Kod kalitesi kontrolü
npm run lint

# Backend testleri
cd task-tracker-api && composer install && php artisan test

# Güvenlik taraması
npm audit
cd task-tracker-api && composer audit
```

## 📝 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## 🆕 Son Güncellemeler

### v3.0.0 - Büyük Mimari Güncelleme, Onay Sistemi ve İzin Yönetimi (Son Güncelleme)
- ✅ **Haftalık Hedef Onay Sistemi**: Takım üyelerinin hedefleri lider/admin onayı ile kesinleşir
- ✅ **İzin Bildirimi Sistemi**: Takvim seçimli izin bildirimi modalı, otomatik hedef entegrasyonu
- ✅ **Kullanıcı Yönetimi Paneli**: Toplu lider atama, toplu silme, özel düzenleme izni
- ✅ **Rol Bazlı Puanlama**: Admin tam skor, Takım Lideri harf notu, diğer roller gizli
- ✅ **Mimari Yeniden Yapılandırma**: 20+ bileşen, 7 hook, 3 context, 4 utility modülü ayrıştırıldı
- ✅ **Rol Bazlı Kilitleme**: Üye 10:00, Lider 13:30, Admin sınırsız
- ✅ **UI/UX Tutarlılığı**: Tüm inputlar yuvarlak köşe, tema uyumlu formlar
- ✅ **Backend Genişletildi**: Onay, izin, düzenleme izni endpoint'leri ve migration'lar

### v2.10.8 - Başlık Düzenleme ve Performans Hesaplama
- ✅ Görev Detayı'nda başlık düzenleme, performans skoru güncelleme, planlı süre validasyonu kaldırma

### v2.10.5–v2.10.7 - Tema, Kota Sistemi, Performans
- ✅ Gelişmiş tema sistemi (6 hazır + özel tema), günlük gerçekleşme/mesai kotası, anlık uyarılar

### v2.10.0–v2.10.4 - Footer, Güncelleme, Kilitleme
- ✅ Footer bar, otomatik güncelleme betikleri, Linux systemd desteği, haftalık hedef kilitleme kuralları

### v2.9.0–v2.9.2 - Görev Türleri, Mesai, Dosya İndirme
- ✅ Custom görev türleri/durumları, mesai bonusu sistemi, kalıcı dosya indirme

### v2.0.0–v2.8.0 - Observer Rolü, Performans, CI/CD
- ✅ Gözlemci rolü, görev türü filtreleme, performans optimizasyonu, GitHub Actions CI/CD

### v1.0.0–v1.5.0 - Temel Özellikler
- ✅ Görev yönetimi, kullanıcı yönetimi, dosya ekleme, mail sistemi, Excel toplu kullanıcı ekleme

## 🔄 Güncellemeler

### Windows

Projeyi güncellemek için:
```bash
git pull origin main
npm install
cd task-tracker-api
composer install
php artisan migrate
```

### Linux

Projeyi güncellemek için:
```bash
cd ~/task-tracker-desktop
git pull origin main
npm install
cd task-tracker-api
composer install --no-interaction
php artisan migrate --force
cd ..
```

**Veya otomatik güncelleme script'ini kullanın:**
```bash
# Script'e çalıştırma izni verin
chmod +x scripts/linux-update.sh

# Güncellemeyi başlatın
./scripts/linux-update.sh

# Veya farklı bir dizin için:
./scripts/linux-update.sh /path/to/task-tracker-desktop
```

#### Linux Güncelleme Senaryosu (SCP ile Dosya Transferi)

Eğer Linux sunucuda Git erişiminiz yoksa, Windows'tan SCP ile dosya transferi yapabilirsiniz:

**1. Windows'ta (PowerShell veya CMD):**

```powershell
# Tek dosya transferi
scp C:\path\to\task-tracker-desktop\src\App.jsx user@hostname:/path/to/task-tracker-desktop/src/App.jsx

# Tüm değişen dosyaları transfer etmek için (örnek):
scp C:\path\to\task-tracker-desktop\src\*.jsx user@hostname:/path/to/task-tracker-desktop/src/
scp C:\path\to\task-tracker-desktop\task-tracker-api\routes\api.php user@hostname:/path/to/task-tracker-desktop/task-tracker-api/routes/
scp C:\path\to\task-tracker-desktop\task-tracker-api\app\Http\Controllers\*.php user@hostname:/path/to/task-tracker-desktop/task-tracker-api/app/Http/Controllers/
```

**2. Linux Sunucuda Güncelleme Adımları:**

```bash
# 1. Servisleri durdur (güncelleme sırasında kesintisiz çalışma için)
sudo systemctl stop task-tracker-api
sudo systemctl stop task-tracker-frontend

# 2. Bağımlılıkları güncelle (yeni paketler varsa)
cd ~/task-tracker-desktop
npm install

# 3. Backend bağımlılıklarını güncelle
cd task-tracker-api
composer install --no-interaction

# 4. Veritabanı migration'larını çalıştır (yeni tablolar/kolonlar varsa)
php artisan migrate --force

# 5. Laravel cache'lerini temizle
php artisan config:clear
php artisan cache:clear
php artisan route:clear

# 6. Servisleri yeniden başlat
sudo systemctl restart task-tracker-api
sudo systemctl restart task-tracker-frontend

# 7. Servis durumlarını kontrol et
sudo systemctl status task-tracker-api
sudo systemctl status task-tracker-frontend
```

**3. Hızlı Güncelleme Senaryosu (Sadece Frontend Değişiklikleri):**

Eğer sadece frontend dosyalarında değişiklik varsa:

```bash
# Windows'ta
scp C:\path\to\task-tracker-desktop\src\App.jsx user@hostname:/path/to/task-tracker-desktop/src/App.jsx

# Linux'ta
sudo systemctl restart task-tracker-frontend
sudo systemctl status task-tracker-frontend
```

**4. Hızlı Güncelleme Senaryosu (Sadece Backend Değişiklikleri):**

Eğer sadece backend dosyalarında değişiklik varsa:

```bash
# Windows'ta
scp C:\path\to\task-tracker-desktop\task-tracker-api\routes\api.php user@hostname:/path/to/task-tracker-desktop/task-tracker-api/routes/api.php
scp C:\path\to\task-tracker-desktop\task-tracker-api\app\Http\Controllers\*.php user@hostname:/path/to/task-tracker-desktop/task-tracker-api/app/Http/Controllers/

# Linux'ta
cd ~/task-tracker-desktop/task-tracker-api
php artisan route:clear
php artisan config:clear
sudo systemctl restart task-tracker-api
sudo systemctl status task-tracker-api
```

**5. Tam Güncelleme Senaryosu (Frontend + Backend + Migration):**

Yeni özellikler veya veritabanı değişiklikleri varsa:

```bash
# Windows'ta - Tüm değişen dosyaları transfer et
# (Hangi dosyaların değiştiğini git status ile kontrol edin)

# Linux'ta
cd ~/task-tracker-desktop

# Servisleri durdur
sudo systemctl stop task-tracker-api
sudo systemctl stop task-tracker-frontend

# Bağımlılıkları güncelle
npm install
cd task-tracker-api
composer install --no-interaction

# Migration'ları çalıştır
php artisan migrate --force

# Cache'leri temizle
php artisan config:clear
php artisan cache:clear
php artisan route:clear

# Servisleri yeniden başlat
cd ..
sudo systemctl restart task-tracker-api
sudo systemctl restart task-tracker-frontend

# Durumu kontrol et
sudo systemctl status task-tracker-api
sudo systemctl status task-tracker-frontend

# Logları kontrol et (hata varsa)
sudo journalctl -u task-tracker-api -n 50 --no-pager
sudo journalctl -u task-tracker-frontend -n 50 --no-pager
```

**Not:** SCP komutlarında `user@hostname` yerine kendi kullanıcı adınızı ve sunucu adresinizi kullanın. IP adresi de kullanabilirsiniz (örn: `user@192.168.1.100`).

## 🛠️ Otomatik Güncelleme

### Windows

Haftalık otomatik güncellemeler için `scripts/windows-auto-update.ps1` kullanılabilir. Betik; git'ten güncel kodu çeker, frontend/backend bağımlılıklarını günceller ve Laravel migrasyonlarını çalıştırır.

### Betiğin Yaptıkları
1. `git fetch` + `git pull origin main`
2. `npm install --no-audit`
3. `task-tracker-api` klasöründe `composer install --no-interaction --prefer-dist`
4. `php artisan migrate --force`
5. `logs/auto-update.log` dosyasına her adımı kayıt eder

Her adım `Invoke-ExternalCommand` fonksiyonu ile izlenir. Hata durumunda betik durur ve log’da ayrıntı bulunur.

### Manuel Çalıştırma
```
powershell -ExecutionPolicy Bypass -File "C:\path\to\task-tracker-desktop\scripts\windows-auto-update.ps1"
```
- Varsayılan dizin farklıysa `-RepoPath "D:\path\to\task-tracker-desktop"` parametresi ile değiştirilebilir.
- `-Force` eklenirse yerel değişiklikler olsa bile pull yapılır (kendi değişikliklerinizi kaybedebilirsiniz).

> Betik çalışırken `npm`, `composer` ve `php` komutlarının PATH'te bulunması gerekir. WAMP veya ilgili araçların kurulu olduğundan emin olun.

### Windows Task Scheduler ile Haftalık Görev
1. `Win + R` → `taskschd.msc`
2. Sağ panelden **Create Basic Task…**
3. Ad ve açıklama: `Task Tracker Auto Update`
4. Trigger: **Weekly** → Pazartesi, 07:00
5. Action: **Start a program**
   - Program/script: `powershell.exe`
   - Arguments:
     ```
     -ExecutionPolicy Bypass -File "C:\path\to\task-tracker-desktop\scripts\windows-auto-update.ps1"
     ```
6. Sihirbazı bitir. Gerekiyorsa görevin özelliklerinde “Run whether user is logged on or not” ve “Run with highest privileges” seçeneklerini işaretleyin.
7. Görevi sağ tıklayıp **Run** diyerek test edin. Sonuçlar `logs/auto-update.log` içinde görülür.

### Linux

Linux için otomatik güncelleme script'i `scripts/linux-update.sh` kullanılabilir. Betik; git'ten güncel kodu çeker, frontend/backend bağımlılıklarını günceller ve Laravel migrasyonlarını çalıştırır.

#### Betiğin Yaptıkları
1. `git pull origin main`
2. `npm install`
3. `task-tracker-api` klasöründe `composer install --no-interaction`
4. `php artisan migrate --force`

#### Manuel Çalıştırma
```bash
# Script'e çalıştırma izni verin
chmod +x scripts/linux-update.sh

# Güncellemeyi başlatın
./scripts/linux-update.sh

# Veya farklı bir dizin için:
./scripts/linux-update.sh /path/to/task-tracker-desktop
```

#### Systemd Servisleri ile Arka Planda Çalıştırma

PuTTY kapandığında uygulamanın kapanmaması için systemd servisleri kullanabilirsiniz:

**1. Servis dosyalarını kopyalayın:**
```bash
sudo cp scripts/linux-systemd/task-tracker-api.service.example /etc/systemd/system/task-tracker-api.service
sudo cp scripts/linux-systemd/task-tracker-frontend.service.example /etc/systemd/system/task-tracker-frontend.service
```

**2. Servis dosyalarını düzenleyin:**
Kullanıcı adı, dizin yolu ve Node.js/npm path'lerini kendi sisteminize göre güncelleyin:
```bash
sudo nano /etc/systemd/system/task-tracker-api.service
sudo nano /etc/systemd/system/task-tracker-frontend.service
```

**Önemli:** Aşağıdaki değerleri kendi sisteminize göre güncelleyin:
- `User=your-username` → Kendi kullanıcı adınız
- `WorkingDirectory=/path/to/task-tracker-desktop` → Proje dizininiz
- `ExecStart=/usr/bin/npm` → npm path'iniz (hangi npm kullanıyorsanız)

**3. Systemd'yi yeniden yükleyin:**
```bash
sudo systemctl daemon-reload
```

**4. Servisleri etkinleştirin ve başlatın:**
```bash
sudo systemctl enable task-tracker-api
sudo systemctl enable task-tracker-frontend
sudo systemctl start task-tracker-api
sudo systemctl start task-tracker-frontend
```

**5. Servis durumlarını kontrol edin:**
```bash
sudo systemctl status task-tracker-api
sudo systemctl status task-tracker-frontend
```

**Servis Yönetimi:**
```bash
# Servisleri başlat/durdur/yeniden başlat
sudo systemctl start task-tracker-api
sudo systemctl stop task-tracker-api
sudo systemctl restart task-tracker-api

# Logları görüntüle
sudo journalctl -u task-tracker-api -f
sudo journalctl -u task-tracker-frontend -f
```

Detaylı bilgi için `scripts/linux-systemd/README.md` dosyasına bakın.

#### Systemd ile Otomatik Güncelleme (Opsiyonel)
Linux'ta haftalık otomatik güncellemeler için systemd timer kullanabilirsiniz:

1. Timer dosyası oluşturun: `/etc/systemd/system/task-tracker-update.timer`
2. Service dosyası oluşturun: `/etc/systemd/system/task-tracker-update.service`
3. Timer'ı etkinleştirin: `sudo systemctl enable task-tracker-update.timer`

### Ek Notlar
- `git pull` sonrası servis/daemon restart işlemleri yapmaz. Gerekiyorsa betiğin sonuna `npm run build`, `php artisan config:cache` gibi komutlar eklenebilir.
- `php artisan migrate --force`, veritabanı değişikliklerini üretime uygular; bakım moduna alma veya yedekleme adımlarını ihtiyaca göre ekleyin.
- Yerel değişiklik varsa (ve `-Force` kullanılmadıysa) güncelleme iptal edilir.