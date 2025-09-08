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
- 📧 E-posta bildirimleri ve şifre sıfırlama
- 📊 Excel'den toplu kullanıcı ekleme
- 🔍 Gelişmiş kullanıcı arama sistemi
- 🎯 Rol tabanlı erişim kontrolü
- 🏷️ Görev türü filtreleme (Yeni Ürün, Fikstür, Aparat, vb.)
- 👁️ Observer (Gözlemci) rolü - sadece görüntüleme yetkisi
- 🔄 Gerçek zamanlı bildirim güncellemeleri
- 📝 Görev geçmişi ve yorum sistemi
- 🎨 Responsive tasarım ve mobil uyumluluk

## 📋 Gereksinimler

### Frontend (Electron App)
- Node.js (v18 veya üzeri)
- npm veya yarn

### Backend (Laravel API)
- PHP 8.2 veya üzeri
- Composer
- MySQL/PostgreSQL/SQLite
- Laravel 12
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
```bash
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan db:seed
```

### 4. Uygulamayı Başlatın
```bash
cd ..
npm run dev
```

## 🌐 Ağ Erişimi

Uygulamayı local ağınızdaki diğer cihazlardan erişilebilir hale getirmek için:

### 🚀 Hızlı Başlangıç

```bash
# Windows
scripts\start-network.bat

# Linux/Mac
./scripts/start-network.sh

# NPM
npm run start:network
```

### 📱 Erişim Adresleri

**Yerel:**
- Frontend: `http://localhost:5173`
- API: `http://localhost:8000`

**Ağ:**
- Frontend: `http://192.168.1.180:5173`
- API: `http://192.168.1.180:8000`

### 🔧 Manuel Başlatma

```bash
# Terminal 1 - API
cd task-tracker-api
php artisan serve --host=0.0.0.0 --port=8000

# Terminal 2 - Frontend
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

## 🚀 Farklı Sunucularda Deployment

### Yeni Sistemde İlk Kurulum
```bash
# Basit IP konfigürasyonu (önerilen)
scripts\simple-ip-config.bat

# Uygulamayı başlat
scripts\start-network.bat
```

### Otomatik Deployment
```bash
scripts\auto-deploy.bat
```

### Manuel Deployment
1. Projeyi kopyalayın
2. `npm install` ve `composer install` çalıştırın
3. `php artisan key:generate` ve `php artisan migrate` çalıştırın
4. `npm run start:network` ile başlatın

Detaylı bilgi için yukarıdaki adımları takip edin.

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

## 📜 Kullanılabilir Scripts

### Ağ Erişimi
- `scripts\start-network.bat` - Windows için ağ erişimi
- `scripts\start-network.sh` - Linux/Mac için ağ erişimi
- `npm run start:network` - NPM ile ağ erişimi

### Yeni Sistem Konfigürasyonu
- `scripts\simple-ip-config.bat` - Basit IP konfigürasyonu (önerilen)

### Deployment
- `scripts\auto-deploy.bat` - Otomatik deployment
- `scripts\setup-firewall.bat` - Firewall kuralları

### Kurulum
- `scripts\setup.bat` - Windows kurulum
- `scripts\setup.sh` - Linux/Mac kurulum

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
DB_CONNECTION=sqlite
DB_DATABASE=database/database.sqlite
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

## 🆕 Son Güncellemeler

### v2.0.0 - Observer Rolü ve Görev Türü Filtreleme
- ✅ **Observer (Gözlemci) Rolü**: Sadece görevleri görüntüleyebilen, hiçbir değişiklik yapamayan kullanıcı rolü
- ✅ **Görev Türü Filtreleme**: Yeni Ürün, Fikstür, Aparat, Geliştirme, Revizyon, Kalıp, Test Cihazı
- ✅ **Gelişmiş UI/UX**: Bildirim ikonları büyütüldü, kullanıcı ayarları paneli genişletildi
- ✅ **Gerçek Zamanlı Bildirimler**: Yeni görev eklendiğinde bildirimler anında güncellenir
- ✅ **Görev Geçmişi İyileştirmeleri**: Tarih formatı düzeltildi, görev türü değişiklikleri "Eski → Yeni" formatında
- ✅ **Atanan Kullanıcı Geçmişi**: Hangi kullanıcıların eklendiği/çıkarıldığı gösterilir
- ✅ **Şifre Sıfırlama Sistemi**: Admin'ler kullanıcı şifrelerini sıfırlayabilir
- ✅ **Input Görünürlük Düzeltmeleri**: Tüm input alanlarında metin görünürlüğü iyileştirildi

### v1.5.0 - Mail Sistemi ve Toplu Kullanıcı Ekleme
- ✅ **E-posta Bildirimleri**: Görev atamaları ve durum değişiklikleri için
- ✅ **Şifre Sıfırlama**: E-posta ile şifre sıfırlama kodu gönderimi
- ✅ **Excel Toplu Kullanıcı Ekleme**: Admin'ler Excel dosyasından toplu kullanıcı ekleyebilir
- ✅ **Gelişmiş Kullanıcı Arama**: İsim, e-posta ve rol bazlı arama

### v1.0.0 - Temel Özellikler
- ✅ **Görev Yönetimi**: Oluşturma, düzenleme, silme
- ✅ **Kullanıcı Yönetimi**: Rol tabanlı erişim kontrolü
- ✅ **Dosya Ekleme**: Görevlere dosya ekleme desteği
- ✅ **Responsive Tasarım**: Mobil ve masaüstü uyumluluk

## 🔄 Güncellemeler

Projeyi güncellemek için:
```bash
git pull origin main
npm install
cd task-tracker-api
composer install
php artisan migrate
```