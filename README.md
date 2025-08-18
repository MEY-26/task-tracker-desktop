# Task Tracker Desktop

Modern bir masaüstü görev takip uygulaması. Electron ve React kullanılarak geliştirilmiştir.

## 🚀 Özellikler

- ✅ Görev oluşturma ve düzenleme
- 📅 Tarih bazlı görev yönetimi
- 👥 Kullanıcı atama ve takım çalışması
- 📊 Görev durumu takibi
- 🔔 Bildirim sistemi
- 📎 Dosya ekleme desteği
- 🎨 Modern ve kullanıcı dostu arayüz

## 📋 Gereksinimler

### Frontend (Electron App)
- Node.js (v18 veya üzeri)
- npm veya yarn

### Backend (Laravel API)
- PHP 8.2 veya üzeri
- Composer
- MySQL/PostgreSQL/SQLite
- Laravel 12

## 🛠️ Kurulum

### 1. Projeyi İndirin
```bash
git clone https://github.com/MEY-26/task-tracker-desktop.git
cd task-tracker-desktop
```

### 2. Frontend Bağımlılıklarını Yükleyin
```bash
npm install
```

### 3. Backend Kurulumu
```bash
cd task-tracker-api
composer install
cp .env.example .env
php artisan key:generate
```

### 4. Veritabanı Kurulumu
```bash
# .env dosyasında veritabanı ayarlarını yapılandırın
php artisan migrate
php artisan db:seed
```

### 5. API Sunucusunu Başlatın
```bash
php artisan serve
```

### 6. Electron Uygulamasını Başlatın
```bash
# Ana dizine geri dönün
cd ..
npm run dev
```

## 🌐 Local Network Kurulumu

Uygulamayı local ağınızdaki diğer cihazlardan erişilebilir hale getirmek için:

### 1. IP Adresinizi Öğrenin
```bash
# Windows
ipconfig

# macOS/Linux
ifconfig
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

Frontend otomatik olarak network'e açılacaktır (`--host` parametresi ile).

### 4. Erişim Adresleri
- **Frontend**: `http://[IP_ADRESINIZ]:5173/`
- **Backend**: `http://[IP_ADRESINIZ]:800/`

Örnek: `http://192.168.1.180:5173/`

### 5. Windows Firewall (Gerekirse)
Eğer bağlantı sorunu yaşarsanız, PowerShell'i **Yönetici olarak** açın:
```powershell
netsh advfirewall firewall add rule name="Node.js Server" dir=in action=allow protocol=TCP localport=5173
netsh advfirewall firewall add rule name="Laravel API" dir=in action=allow protocol=TCP localport=800
```

### 6. CORS Ayarları
`task-tracker-api/config/cors.php` dosyası otomatik olarak local network adreslerini içerir.

## 🏗️ Geliştirme

### Geliştirme Modunda Çalıştırma
```bash
# Backend
cd task-tracker-api
php artisan serve

# Frontend (yeni terminal)
npm run dev
```

### Production Build
```bash
npm run build
```

## 📁 Proje Yapısı

```
task-tracker-desktop/
├── electron/                 # Electron ana süreç dosyaları
├── src/                     # React uygulaması
├── task-tracker-api/        # Laravel API
│   ├── app/
│   │   ├── Http/Controllers/
│   │   ├── Models/
│   │   └── Notifications/
│   ├── database/
│   └── routes/
└── public/                  # Statik dosyalar
```

## 🔧 Yapılandırma

### API URL Ayarları
`src/api.js` dosyasında API URL'ini kendi sunucunuzun adresine göre güncelleyin:

```javascript
// Localhost için
const API_BASE_URL = 'http://localhost:800/api';

// Local Network için
const API_BASE_URL = 'http://192.168.1.180:800/api';
```

**Not**: Local network kullanımı için IP adresinizi değiştirin.

### Veritabanı Ayarları
`task-tracker-api/.env` dosyasında veritabanı bağlantı bilgilerini güncelleyin:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=task_tracker
DB_USERNAME=root
DB_PASSWORD=
```

## 🚀 Deployment

### Windows için Executable Oluşturma
```bash
npm run build
```

Build tamamlandıktan sonra `release` klasöründe Windows executable dosyası bulunacaktır.

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişikliklerinizi commit edin (`git commit -m 'Add some amazing feature'`)
4. Branch'inizi push edin (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## 📝 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## 🆘 Destek

Herhangi bir sorun yaşarsanız:
- GitHub Issues bölümünde sorun bildirin
- Dokümantasyonu kontrol edin
- Geliştirici ile iletişime geçin

## 🔄 Güncellemeler

Projeyi güncellemek için:
```bash
git pull origin main
npm install
cd task-tracker-api && composer install
```
