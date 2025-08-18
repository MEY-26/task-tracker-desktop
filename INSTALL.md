# Task Tracker Desktop - Detaylı Kurulum Rehberi

Bu rehber, Task Tracker Desktop uygulamasını bilgisayarınızda çalıştırmak için gerekli tüm adımları içerir.

## 📋 Sistem Gereksinimleri

### Minimum Gereksinimler
- **İşletim Sistemi**: Windows 10/11, macOS 10.15+, Ubuntu 18.04+
- **RAM**: 4GB
- **Disk Alanı**: 2GB boş alan
- **İnternet**: İlk kurulum için gerekli

### Yazılım Gereksinimleri
- **Node.js**: v18.0.0 veya üzeri
- **npm**: v8.0.0 veya üzeri
- **PHP**: v8.2 veya üzeri
- **Composer**: v2.0.0 veya üzeri
- **MySQL**: v8.0 veya üzeri (veya PostgreSQL/SQLite)

## 🛠️ Adım Adım Kurulum

### 1. Gerekli Yazılımları Yükleyin

#### Node.js Kurulumu
1. [Node.js resmi sitesinden](https://nodejs.org/) LTS sürümünü indirin
2. İndirilen dosyayı çalıştırın ve kurulumu tamamlayın
3. Kurulumu doğrulayın:
   ```bash
   node --version
   npm --version
   ```

#### PHP Kurulumu
**Windows için:**
1. [XAMPP](https://www.apachefriends.org/) veya [WAMP](https://www.wampserver.com/) indirin
2. Kurulumu tamamlayın
3. PHP'yi doğrulayın:
   ```bash
   php --version
   ```

**macOS için:**
```bash
brew install php
```

**Ubuntu/Debian için:**
```bash
sudo apt update
sudo apt install php php-cli php-mysql php-mbstring php-xml php-curl
```

#### Composer Kurulumu
1. [Composer resmi sitesinden](https://getcomposer.org/) indirin
2. Kurulumu tamamlayın
3. Doğrulayın:
   ```bash
   composer --version
   ```

#### MySQL Kurulumu
**Windows için:**
- XAMPP/WAMP ile birlikte gelir

**macOS için:**
```bash
brew install mysql
brew services start mysql
```

**Ubuntu/Debian için:**
```bash
sudo apt install mysql-server
sudo systemctl start mysql
sudo systemctl enable mysql
```

### 2. Projeyi İndirin

```bash
git clone https://github.com/kullaniciadi/task-tracker-desktop.git
cd task-tracker-desktop
```

### 3. Frontend Bağımlılıklarını Yükleyin

```bash
npm install
```

### 4. Backend Kurulumu

```bash
cd task-tracker-api
composer install
```

### 5. Veritabanı Kurulumu

#### MySQL Veritabanı Oluşturun
```sql
CREATE DATABASE task_tracker CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'task_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON task_tracker.* TO 'task_user'@'localhost';
FLUSH PRIVILEGES;
```

#### Laravel Yapılandırması
```bash
cp env.example .env
```

`.env` dosyasını düzenleyin:
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=task_tracker
DB_USERNAME=task_user
DB_PASSWORD=your_password
```

#### Laravel Anahtar ve Migration
```bash
php artisan key:generate
php artisan migrate
php artisan db:seed
```

### 6. Uygulamayı Başlatın

#### Backend Sunucusunu Başlatın
```bash
php artisan serve
```

#### Frontend Uygulamasını Başlatın (Yeni Terminal)
```bash
cd ..
npm run dev
```

## 🌐 Local Network Kurulumu

Uygulamayı local ağınızdaki diğer cihazlardan erişilebilir hale getirmek için:

### 1. IP Adresinizi Öğrenin
```bash
# Windows
ipconfig

# macOS
ifconfig

# Linux
ip addr show
```

### 2. Backend'i Network'e Açın
```bash
cd task-tracker-api
php artisan serve --host=0.0.0.0 --port=800
```

### 3. Frontend'i Network'e Açın
```bash
# Ana dizinde
npm run dev
```

### 4. Erişim Adresleri
- **Frontend**: `http://[IP_ADRESINIZ]:5173/`
- **Backend**: `http://[IP_ADRESINIZ]:800/`

Örnek: `http://192.168.1.180:5173/`

### 5. Windows Firewall Ayarları
Eğer bağlantı sorunu yaşarsanız, PowerShell'i **Yönetici olarak** açın:
```powershell
netsh advfirewall firewall add rule name="Node.js Server" dir=in action=allow protocol=TCP localport=5173
netsh advfirewall firewall add rule name="Laravel API" dir=in action=allow protocol=TCP localport=800
```

### 6. API URL Güncelleme
`src/api.js` dosyasında API URL'ini güncelleyin:
```javascript
const api = axios.create({
  baseURL: 'http://[IP_ADRESINIZ]:800/api',
  // ...
});
```

### 7. Test Kullanıcıları
Kurulum sonrası şu test kullanıcıları mevcuttur:
- **Admin**: admin@vaden.com.tr / 1234
- **Readonly**: readonly@example.com / 1234
- **User**: user@example.com / 1234
- **Observer**: izleyici@example.com / 1234

## 🔧 Yapılandırma

### API URL Ayarları
`src/api.js` dosyasında API URL'ini kontrol edin:
```javascript
const API_BASE_URL = 'http://localhost:8000/api';
```

### CORS Ayarları
Laravel API'de CORS ayarlarını kontrol edin:
```php
// config/cors.php
'allowed_origins' => ['http://localhost:5173', 'app://./'],
```

## 🚀 Production Build

### Windows Executable Oluşturma
```bash
npm run build
```

Build tamamlandıktan sonra `release` klasöründe `.exe` dosyası bulunacaktır.

## 🐛 Sorun Giderme

### Yaygın Sorunlar

#### 1. Node.js Sürüm Hatası
```bash
# Node.js sürümünü kontrol edin
node --version

# Gerekirse Node.js'i güncelleyin
```

#### 2. PHP Uzantı Eksikliği
```bash
# Gerekli PHP uzantılarını yükleyin
sudo apt install php-mysql php-mbstring php-xml php-curl
```

#### 3. Composer Bellek Hatası
```bash
# Composer bellek limitini artırın
COMPOSER_MEMORY_LIMIT=-1 composer install
```

#### 4. Veritabanı Bağlantı Hatası
- MySQL servisinin çalıştığından emin olun
- Veritabanı kullanıcı adı ve şifresini kontrol edin
- `.env` dosyasındaki ayarları doğrulayın

#### 5. Port Çakışması
```bash
# Kullanılan portları kontrol edin
netstat -ano | findstr :8000
netstat -ano | findstr :5173

# Gerekirse farklı portlar kullanın
php artisan serve --port=8001
```

### Log Dosyalarını Kontrol Edin
```bash
# Laravel logları
tail -f task-tracker-api/storage/logs/laravel.log

# Electron logları
# Uygulama çalışırken DevTools'u açın (Ctrl+Shift+I)
```

## 📞 Destek

Sorun yaşarsanız:
1. Bu dokümantasyonu tekrar kontrol edin
2. GitHub Issues bölümünde sorun bildirin
3. Geliştirici ile iletişime geçin

## 🔄 Güncelleme

Projeyi güncellemek için:
```bash
git pull origin main
npm install
cd task-tracker-api && composer install
php artisan migrate
```
