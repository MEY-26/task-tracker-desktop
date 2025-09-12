# Task Tracker Desktop

Modern bir masaüstü görev takip uygulamas- Token'lar tarayıcı `localStorage`'da tutuluyor. XSS risklerini azaltmak için gelecekte OS anahtar zinciri (örn. keytar) gibi seçenekler değerlendirilebilir.

### 3. Laravel'i Hazırlayınlectron ve React kullanılarak geliştirilmiştir.

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
git clone https://github.com/MEY-26/task-tracker-desktop.git; cd task-tracker-desktop
```

### 2. Bağımlılıkları Yükleyin
```bash
npm install; cd task-tracker-api; composer install

## CI/CD Pipeline

Bu repo için GitHub Actions tabanlı bir CI yapılandırması eklendi (`.github/workflows/ci.yml`). Pipeline şu işleri yapar:

- frontend-tests: Node 20 ile `npm ci` ve `npm run build:ui` çalıştırır (vite derlemesi doğrulanır).
- code-quality: ESLint çalıştırır (`npm run lint`). Electron ana süreç dosyaları Node ortamında lint edilir.
- backend-tests: PHP 8.3 ile Laravel testlerini çalıştırır (`php artisan test`).
- security-scan: `npm audit` (prod, yüksek seviye+) ve `composer audit` çalıştırır. Raporlar üretir; pipeline’ı bloklamaz.
- build-electron: Sadece tag push’larında Electron’u `--dir` modunda paketler ve artifact olarak yükler.

Yerel doğrulama için hızlı komutlar:

- Frontend derleme: `npm ci && npm run build:ui`
- Lint: `npm run lint`
- Backend test: `cd task-tracker-api && composer install && php artisan test`

## Güvenlik Notları

- Electron penceresinde `webSecurity` açıldı ve `allowRunningInsecureContent` kapatıldı.
- CORS artık `.env` ile yönetilebilir. Üretimde `CORS_ALLOWED_ORIGINS` belirleyip `*` kullanmaktan kaçının.
- Token’lar tarayıcı `localStorage`’da tutuluyor. XSS risklerini azaltmak için gelecekte OS anahtar zinciri (örn. keytar) gibi seçenekler değerlendirilebilir.
```

### 3. Laravel'i Hazırlayın
**Not**: Bu komutlar migration ve seeding sırasında çıkan onay sorularına otomatik "yes" yanıtı verir.

```bash
copy .env.example .env; php artisan key:generate; php artisan migrate; yes; php artisan db:seed; yes
```

### 4. Uygulamayı Başlatın
```bash
cd ..; scripts\setup.bat; npm run start:network
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
cd task-tracker-api; php artisan serve --host=0.0.0.0 --port=8000

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
cd task-tracker-api; php artisan serve

# Frontend - Terminal 2 (yeni terminal açın)
npm run dev
```

### Production Build
```bash
npm run build
```

## 📜 Kullanılabilir Scripts

### Ağ Erişimi
- `scripts\setup.bat` - Windows için kurulum ve başlatma
- `scripts\setup.sh` - Linux/Mac için kurulum ve başlatma
- `npm run start:network` - NPM ile ağ erişimi

### Kurulum
- `npm run setup` - Tüm bağımlılıkları yükle
- `npm run setup:dev` - Geliştirme ortamı kurulumu

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
│   └── assets/              # Statik dosyalar
├── task-tracker-api/        # Laravel API backend
│   ├── app/
│   │   ├── Http/Controllers/
│   │   │   ├── AuthController.php
│   │   │   ├── TaskController.php
│   │   │   ├── UserController.php
│   │   │   ├── PasswordResetController.php
│   │   │   └── NotificationController.php
│   │   ├── Models/
│   │   │   ├── Task.php
│   │   │   ├── User.php
│   │   │   ├── TaskHistory.php
│   │   │   └── TaskAttachment.php
│   │   └── Notifications/
│   │       └── TaskUpdated.php
│   ├── database/
│   │   ├── database.sqlite  # SQLite veritabanı
│   │   ├── migrations/      # Veritabanı şemaları
│   │   └── seeders/         # Başlangıç verileri
│   ├── routes/
│   │   └── api.php          # API rotaları
│   └── .env                 # Ortam değişkenleri
├── scripts/                 # Kurulum scriptleri
│   ├── backup-sqlite.ps1    # Veritabanı yedekleme
│   ├── restore-sqlite.ps1   # Veritabanı geri yükleme
│   ├── setup.bat           # Windows kurulum
│   └── setup.sh            # Linux/Mac kurulum
├── public/                  # Statik web dosyaları
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

### v2.1.0 - Hata Düzeltmeleri ve İyileştirmeler
- ✅ **PasswordResetController Eklendi**: Eksik controller sınıfı oluşturuldu
- ✅ **Mail Sistemi Düzeltildi**: TaskNotificationMail hatası çözüldü
- ✅ **WebSocket Bağlantı Sorunu**: Vite HMR ayarları düzeltildi
- ✅ **Mobil Responsive İyileştirmeleri**: Tab butonları ve layout düzeltildi
- ✅ **Gereksiz Dosyalar Temizlendi**: Kullanılmayan script dosyaları kaldırıldı

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
git pull origin main; npm install; cd task-tracker-api; composer install; php artisan migrate
```

## 📞 İletişim

- **Geliştirici**: MEY-26
- **GitHub**: https://github.com/MEY-26/task-tracker-desktop
- **Lisans**: MIT
