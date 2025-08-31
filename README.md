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
- 📧 E-posta bildirimleri ve şifre sıfırlama
- 📊 Excel'den toplu kullanıcı ekleme
- 🔍 Gelişmiş kullanıcı arama sistemi
- 🎯 Rol tabanlı erişim kontrolü

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
- SMTP Mail Server (Gmail, Outlook, vb.)

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

### 5. Mail Sistemi Konfigürasyonu

#### 5.1. SMTP Ayarları
`task-tracker-api/.env` dosyasında mail ayarlarını yapılandırın:

```env
# Mail Ayarları
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=your-email@gmail.com
MAIL_FROM_NAME="${APP_NAME}"
```

#### 5.2. Gmail SMTP Kurulumu
1. Gmail hesabınızda "2 Adımlı Doğrulama"yı etkinleştirin
2. "Uygulama Şifreleri" bölümünden yeni bir şifre oluşturun
3. Bu şifreyi `MAIL_PASSWORD` alanına yazın

#### 5.3. Outlook/Hotmail SMTP Kurulumu
```env
MAIL_HOST=smtp-mail.outlook.com
MAIL_PORT=587
MAIL_USERNAME=your-email@outlook.com
MAIL_PASSWORD=your-password
```

#### 5.4. Kendi Mail Sunucunuz İçin
```env
MAIL_HOST=mail.yourcompany.com
MAIL_PORT=587
MAIL_USERNAME=noreply@yourcompany.com
MAIL_PASSWORD=your-password
```

### 6. API Sunucusunu Başlatın
```bash
php artisan serve
```

### 7. Electron Uygulamasını Başlatın
```bash
# Ana dizine geri dönün
cd ..
npm run dev
```

## 📧 Mail Sistemi Özellikleri

### Şifre Sıfırlama
- Kullanıcılar "Şifremi Unuttum" butonuna tıklayabilir
- Sistem otomatik olarak sıfırlama kodu gönderir
- Kullanıcı kodu girerek yeni şifre belirleyebilir

### Görev Bildirimleri
- Yeni görev atandığında e-posta bildirimi
- Görev durumu değiştiğinde bildirim
- Görev tamamlandığında bildirim

### Mail Template'leri
Mail template'leri `task-tracker-api/resources/views/emails/` klasöründe bulunur:
- `password-reset.blade.php` - Şifre sıfırlama e-postası
- `task-notification.blade.php` - Görev bildirim e-postası

## 📊 Excel Toplu Kullanıcı Ekleme

### Excel Formatı
Excel dosyası şu formatta olmalıdır:
- **A1**: Kullanıcı Adı Soyadı
- **B1**: E-posta Adresi  
- **C1**: Rol (admin/team_leader/team_member/observer)
- **D1**: Şifre (boşsa varsayılan: 123456)

### Kullanım
1. Admin panelinde "Kullanıcı Yönetimi" bölümüne gidin
2. "Excel'den Toplu Kullanıcı Ekle" bölümünü kullanın
3. Excel dosyasını seçin ve yükleyin

## 🎯 Rol Tabanlı Erişim Kontrolü

### Roller ve Yetkiler
- **Admin**: Tüm yetkilere sahip
- **Team Leader**: Görev oluşturabilir, atayabilir, dosya yükleyebilir
- **Team Member**: Görevleri görüntüleyebilir, yorum yapabilir
- **Observer**: Sadece görevleri görüntüleyebilir

### Kısıtlamalar
- Observer'lar görev atanamaz
- Team Leader'lar admin'lere görev atayamaz
- Sorumlu olan aynı görevde atanan olamaz

## 🌐 Local Network Kurulumu

Uygulamayı local ağınızdaki diğer cihazlardan erişilebilir hale getirmek için:

### 1. IP Adresinizi Öğrenin
```bash
# Windows
ipconfig

# macOS/Linux
ifconfig
```

### 1.1. Local Domain Kurulumu (Önerilen)
Hosts dosyasını düzenleyerek local domain kullanabilirsiniz:

**Windows için:**
```bash
# Notepad ile hosts dosyasını açın
notepad C:\Windows\System32\drivers\etc\hosts
```

Hosts dosyasına şu satırları ekleyin:
```
# Task Tracker Desktop Local Domain
192.168.1.180 gorevtakip.vaden
192.168.1.180 api.gorevtakip.vaden
```

**macOS/Linux için:**
```bash
sudo nano /etc/hosts
```

Hosts dosyasına şu satırları ekleyin:
```
# Task Tracker Desktop Local Domain
192.168.1.180 gorevtakip.vaden
192.168.1.180 api.gorevtakip.vaden
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
- **Frontend**: `http://gorevtakip.vaden:5173/`
- **Backend**: `http://api.gorevtakip.vaden:800/`

Alternatif IP adresi: `http://192.168.1.180:5173/`

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
