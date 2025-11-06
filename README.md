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
- 🎯 Rol tabanlı erişim kontrolü
- 📊 Excel'den toplu kullanıcı ekleme
- 🔍 Gelişmiş kullanıcı arama sistemi
- 🔐 Şifre sıfırlama sistemi

### 📎 Dosya Yönetimi
- 📎 Görevlere dosya ekleme desteği
- 📁 Çoklu dosya yükleme
- 🗑️ Dosya silme yetkisi kontrolü
- 📊 Dosya boyutu ve türü gösterimi

### 🔔 Bildirim Sistemi
- 🔔 Gerçek zamanlı bildirim güncellemeleri
- 🔄 Görev durumu değişiklik bildirimleri
- 👥 Kullanıcı atama bildirimleri

### 🎯 Haftalık Hedef Sistemi
- 📊 Haftalık hedef oluşturma ve takibi
- 🔒 Hedef kilitleme sistemi (Pazartesi 10:00)
- 🏆 Liderlik tablosu ve performans skorlama
- 📈 Gerçek zamanlı hedef analizi
- ⏰ Mesai süresi desteği (overtime minutes)
- 🎁 Mesai bonusu sistemi (1.5x çarpan)
- 👨‍💼 Admin kilitleme bypass yetkisi
- 🔄 Otomatik liste güncelleme sistemi

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

### Ağ Erişimi
- `scripts\setup.bat` - Windows için kurulum ve başlatma
- `scripts\setup.sh` - Linux/Mac için kurulum ve başlatma
- `npm run start:network` - NPM ile ağ erişimi (eşzamanlı API ve Frontend başlatma)
- `npm run start:network:restart` - API otomatik yeniden başlatma ile ağ erişimi
- `npm run start:network:watch` - Nodemon ile API dosya değişikliklerini izleme ve otomatik yeniden başlatma

### API Yönetimi
- `npm run api:serve` - Laravel API'yi başlat (host=0.0.0.0, port=8000)
- `npm run api:serve:watch` - Nodemon ile API'yi izle ve otomatik yeniden başlat (dosya değişikliklerinde)
- `npm run api:serve:restart` - API crash durumunda otomatik yeniden başlatma

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
│   │   ├── auth/            # Kimlik doğrulama bileşenleri
│   │   ├── admin/           # Admin paneli bileşenleri
│   │   └── account/         # Hesap yönetimi bileşenleri
│   ├── hooks/               # Custom React hooks
│   │   └── useNotifications.js
│   ├── utils/               # Yardımcı fonksiyonlar
│   │   ├── date.js
│   │   ├── string.js
│   │   ├── tasks.js
│   │   └── computeWeeklyScore.js
│   └── assets/              # Statik dosyalar
├── task-tracker-api/        # Laravel API backend
│   ├── app/
│   │   ├── Http/Controllers/
│   │   │   ├── AuthController.php
│   │   │   ├── TaskController.php
│   │   │   ├── TaskTypeController.php
│   │   │   ├── TaskStatusController.php
│   │   │   ├── UserController.php
│   │   │   ├── PasswordResetController.php
│   │   │   ├── NotificationController.php
│   │   │   └── WeeklyGoalController.php
│   │   ├── Models/
│   │   │   ├── Task.php
│   │   │   ├── TaskType.php
│   │   │   ├── TaskStatus.php
│   │   │   ├── User.php
│   │   │   ├── TaskHistory.php
│   │   │   └── TaskAttachment.php
│   │   ├── Notifications/
│   │   │   ├── TaskUpdated.php
│   │   │   └── PasswordResetRequested.php
│   │   └── Mail/
│   │       └── TaskNotificationMail.php
│   ├── database/
│   │   ├── database.sqlite  # SQLite veritabanı
│   │   ├── migrations/      # Veritabanı şemaları
│   │   │   ├── create_task_types_table.php
│   │   │   ├── create_task_statuses_table.php
│   │   │   ├── create_tasks_table.php
│   │   │   ├── create_task_histories_table.php
│   │   │   ├── create_notifications_table.php
│   │   │   ├── create_task_attachments_table.php
│   │   │   ├── create_weekly_goals_tables.php
│   │   │   ├── add_is_completed_to_weekly_goal_items_table.php
│   │   │   ├── add_overtime_minutes_to_weekly_goals_table.php
│   │   │   └── add_text_columns_to_tasks_table.php
│   │   └── seeders/         # Başlangıç verileri
│   │       ├── DatabaseSeeder.php
│   │       └── TaskTypeSeeder.php
│   ├── routes/
│   │   ├── api.php          # API rotaları
│   │   └── web.php          # Web rotaları (dosya indirme)
│   └── .env                 # Ortam değişkenleri
├── scripts/                 # Kurulum ve yönetim scriptleri
│   ├── backup-sqlite.ps1    # Veritabanı yedekleme
│   ├── restore-sqlite.ps1   # Veritabanı geri yükleme
│   ├── setup.bat           # Windows kurulum
│   ├── setup.sh            # Linux/Mac kurulum
│   ├── start-api.bat       # Windows için API otomatik yeniden başlatma
│   ├── start-api.sh        # Linux/Mac için API otomatik yeniden başlatma
│   └── start-api.cjs       # Node.js ile API otomatik yeniden başlatma
├── .github/workflows/       # CI/CD pipeline
│   └── ci.yml              # GitHub Actions
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

### CORS Ayarları
Ağ erişimi için CORS ayarlarını yapılandırın:

```env
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000,app://./
```

## 🚀 Deployment

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

### v2.10.2 - Linux Desteği ve Laravel 12 Uyumluluğu (Son Guncelleme)
- ✅ **Linux Güncelleme Script'i**: Linux için otomatik güncelleme script'i eklendi (`scripts/linux-update.sh`)
- ✅ **Linux Dokümantasyonu**: Linux kurulum ve güncelleme dokümantasyonu eklendi
- ✅ **Laravel 12 Uyumluluğu**: Laravel 12 log parse hatası düzeltildi
- ✅ **Output Filtreleme**: `start-api.cjs` dosyasında output filtreleme eklendi
- ✅ **Systemd Desteği**: API ve Frontend servisleri için systemd yapılandırmaları eklendi

### v2.10.1 - Sorumlu Takim Lideri Izinleri ve UI Iyilestirmeleri
- ✅ **Sorumlu Takim Lideri NO Alani**: Sorumlu olan takim liderleri NO alanini degistirebilir
- ✅ **Modal Boyut Optimizasyonu**: Gorev Detayı penceresi sabit boyutta kaliyor
- ✅ **Hata Mesaji Hizzalamasi**: Hata mesajlari ana icerikle ayni genislik ve hizalanmis
- ✅ **Backend Izin Duzeltmesi**: TaskController takim lideri kontrolunde sorumlu durumu eklendi
- ✅ **Frontend Modal Yukseklik**: max-h yerine h kullanilarak sabit boyut saglandi

### v2.10.0 - Footer ve Otomatik Guncelleme Sistemi
- ✅ **Footer Bar Eklendi**: Sayfanin altinda VADEN logo, tasarim bilgisi, iletisim ve sosyal medya linkleri
- ✅ **Otomatik Guncelleme Betigi**: Windows icin PowerShell tabanli haftalik otomatik guncelleme sistemi
- ✅ **Izın Sistemleri Iyilestirildi**: Dosya silme yetkisi Admin/Takim Lideri/Sorumlu ile sinirlandirildi
- ✅ **Atanan Kullanicilar Icin Durum Kontrolu**: Atananlar sadece combobox ile durum degistirebilir
- ✅ **NO Alani Eklendi**: Manuel giriş yapilabilen, yalnizca Admin/Sorumlu tarafindan duzenlenebilen alan
- ✅ **Takim Lideri Otomatik Atama**: Sorumlu olarak takim lideri secildiginde ekibi otomatik atanir
- ✅ **Aninda Guncelleme**: Takim atamalari ve durum degisiklikleri aninda gorunur
- ✅ **Veritabani Migration**: NO alani icin yeni migration dosyasi eklendi

### v2.9.2 - Haftalik Hedef Sistemi Iyilestirmeleri
- ✅ **Mesai Süresi Desteği**: Overtime minutes (mesai dakikaları) eklenmesi
- ✅ **Mesai Bonusu Sistemi**: 1.5x çarpan ile mesai bonusu hesaplama
- ✅ **Admin Kilitleme Bypass**: Admin kullanıcılar kilitleme durumunda da kayıt yapabilir
- ✅ **Final Skor Hesaplama Düzeltmesi**: Backend ve frontend skor hesaplamaları senkronize edildi
- ✅ **Otomatik Liste Güncelleme**: Haftalık hedef listesi otomatik güncelleniyor
- ✅ **Hedef Ayrıntısı Düzenleme**: 3 sütunlu düzen ile daha iyi görünüm
- ✅ **Kesinti/Bonus Sistemi**: Cezalar ve bonuslar ayrıntılı gösterimi
- ✅ **Backend Hesaplama İyileştirmesi**: computeSummary fonksiyonu frontend ile uyumlu hale getirildi
- ✅ **Veritabanı Migration**: overtime_minutes kolonu eklendi
- ✅ **Kaydet Butonu İyileştirmesi**: Buton durumu korunması ve doğru çalışması

### v2.9.1 - Kalıcı Dosya İndirme Sistemi
- ✅ **Zaman Sınırı Kaldırıldı**: Dosyalar artık süresiz erişilebilir
- ✅ **Token Tabanlı Güvenlik**: MD5 hash ile korumalı kalıcı indirme linkleri
- ✅ **Signed URL Sistemi Kaldırıldı**: Expires parametresi ve signature hatalarının çözümü
- ✅ **Cache Friendly URLs**: Bookmark'a kaydedilebilir, paylaşılabilir dosya linkleri
- ✅ **Geliştirilmiş Hata Yönetimi**: Dosya bulunamadı ve geçersiz token durumları için detaylı mesajlar
- ✅ **Fallback Sistem**: download_url → storage URL yedekleme mekanizması
- ✅ **Backend Optimizasyonu**: showAttachment metodu kaldırıldı, tek endpoint sistemi
- ✅ **Güvenlik Artırımı**: Token kontrolü ile yetkisiz erişim engellenmiş

### v2.9.0 - Görev Türü ve Durum Yönetimi Sistemi
- ✅ **Custom Görev Türleri**: Admin'ler özel görev türleri oluşturabilir ve yönetebilir
- ✅ **Custom Görev Durumları**: Her görev türü için özel durumlar tanımlanabilir
- ✅ **Gelişmiş Görev Oluşturma**: Görev türü seçimi ve otomatik durum yönetimi
- ✅ **Görev Detayı İyileştirmeleri**: Görev türü değiştiğinde durum otomatik reset
- ✅ **Atananlar Listesi Düzenlendi**: Daha düzenli badge görünümü
- ✅ **Backend API Genişletildi**: TaskType ve TaskStatus controller'ları eklendi
- ✅ **Veritabanı Şeması Güncellendi**: Yeni tablolar ve migration'lar eklendi
- ✅ **Kod Temizliği**: Gereksiz import'lar ve kod blokları kaldırıldı

### v2.8.0 - Performans İyileştirmeleri ve Kod Optimizasyonu
- ✅ **Görev Filtreleme Optimizasyonu**: `filteredTasks` useMemo ile performans artırıldı
- ✅ **Kod Organizasyonu**: Gereksiz yorumlar ve kullanılmayan component referansları temizlendi
- ✅ **Filtreleme Mantığı İyileştirildi**: Aktif/tamamlanan tab'lar için daha verimli filtreleme
- ✅ **React Hooks Optimizasyonu**: useCallback dependency array'leri düzeltildi
- ✅ **CI/CD Hataları Çözüldü**: GitHub Actions pipeline'ı başarılı çalışıyor
- ✅ **Laravel Controller'ları Eklendi**: WeeklyGoalController ve PasswordResetRequested notification
- ✅ **Gitignore Düzeltildi**: Laravel app klasörü artık GitHub'da mevcut

### v2.7.3 - Dosya İndirme ve UI İyileştirmeleri
- ✅ **Dosya İndirme Sorunu Çözüldü**: Dosyalar artık orijinal isimleriyle ve uzantılarıyla iniyor
- ✅ **Backend İyileştirmesi**: Attachment endpoint'i güncellendi, proper download header'ları eklendi
- ✅ **Frontend İyileştirmesi**: Dosya linklerine download attribute'u eklendi
- ✅ **Form Düzeni İyileştirildi**: Sol taraftaki etiketler genişletildi, sağ taraftaki girişler daraltıldı
- ✅ **Mesaj Butonu İyileştirmesi**: Buton yüksekliği dinamik olarak ayarlandı, ok simgesi merkezde kalıyor
- ✅ **Deprecated Event Handler**: onKeyPress yerine onKeyDown kullanılıyor
- ✅ **Responsive İyileştirmeler**: Tüm ekran boyutlarında daha iyi görünüm

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
powershell -ExecutionPolicy Bypass -File "C:\wamp64\www\task-tracker-desktop\scripts\windows-auto-update.ps1"
```
- Varsayılan dizin farklıysa `-RepoPath "D:\projeler\task-tracker-desktop"` parametresi ile değiştirilebilir.
- `-Force` eklenirse yerel değişiklikler olsa bile pull yapılır (kendi değişikliklerinizi kaybedebilirsiniz).

> Betik çalışırken `npm`, `composer` ve `php` komutlarının PATH’te bulunması gerekir. WAMP veya ilgili araçların kurulu olduğundan emin olun.

### Windows Task Scheduler ile Haftalık Görev
1. `Win + R` → `taskschd.msc`
2. Sağ panelden **Create Basic Task…**
3. Ad ve açıklama: `Task Tracker Auto Update`
4. Trigger: **Weekly** → Pazartesi, 07:00
5. Action: **Start a program**
   - Program/script: `powershell.exe`
   - Arguments:
     ```
     -ExecutionPolicy Bypass -File "C:\wamp64\www\task-tracker-desktop\scripts\windows-auto-update.ps1"
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

#### Systemd ile Otomatik Güncelleme (Opsiyonel)
Linux'ta haftalık otomatik güncellemeler için systemd timer kullanabilirsiniz:

1. Timer dosyası oluşturun: `/etc/systemd/system/task-tracker-update.timer`
2. Service dosyası oluşturun: `/etc/systemd/system/task-tracker-update.service`
3. Timer'ı etkinleştirin: `sudo systemctl enable task-tracker-update.timer`

### Ek Notlar
- `git pull` sonrası servis/daemon restart işlemleri yapmaz. Gerekiyorsa betiğin sonuna `npm run build`, `php artisan config:cache` gibi komutlar eklenebilir.
- `php artisan migrate --force`, veritabanı değişikliklerini üretime uygular; bakım moduna alma veya yedekleme adımlarını ihtiyaca göre ekleyin.
- Yerel değişiklik varsa (ve `-Force` kullanılmadıysa) güncelleme iptal edilir.