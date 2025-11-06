# Linux Systemd Servisleri

Bu klasörde Linux sunucuda kullanılacak systemd servis dosyalarının örnekleri bulunmaktadır.

## Kurulum

### 1. Servis dosyalarını kopyalayın

```bash
# Servis dosyalarını systemd dizinine kopyalayın
sudo cp scripts/linux-systemd/task-tracker-api.service.example /etc/systemd/system/task-tracker-api.service
sudo cp scripts/linux-systemd/task-tracker-frontend.service.example /etc/systemd/system/task-tracker-frontend.service
```

### 2. Servis dosyalarını düzenleyin

Kullanıcı adı, dizin yolu ve Node.js/npm path'lerini kendi sisteminize göre güncelleyin:

```bash
# API servis dosyasını düzenleyin
sudo nano /etc/systemd/system/task-tracker-api.service

# Frontend servis dosyasını düzenleyin
sudo nano /etc/systemd/system/task-tracker-frontend.service
```

**Önemli:** Aşağıdaki değerleri kendi sisteminize göre güncelleyin:
- `User=gtakip` → Kendi kullanıcı adınız
- `Group=gtakip` → Kendi grup adınız
- `WorkingDirectory=/home/gtakip/task-tracker-desktop` → Proje dizininiz
- `ExecStart=/usr/bin/npm` → npm path'iniz (hangi npm kullanıyorsanız)

**Node.js 20 path'ini bulmak için:**
```bash
which node
which npm
```

Eğer NVM kullanıyorsanız, Node.js 20 path'ini bulun:
```bash
ls -la ~/.nvm/versions/node/
```

Sonra service dosyasında `ExecStart` satırını güncelleyin:
```ini
ExecStart=/home/gtakip/.nvm/versions/node/v20.14.0/bin/npm run dev:web
```

### 3. Systemd'yi yeniden yükleyin

```bash
sudo systemctl daemon-reload
```

### 4. Servisleri etkinleştirin ve başlatın

```bash
# API servisini etkinleştir ve başlat
sudo systemctl enable task-tracker-api
sudo systemctl start task-tracker-api

# Frontend servisini etkinleştir ve başlat
sudo systemctl enable task-tracker-frontend
sudo systemctl start task-tracker-frontend
```

### 5. Servis durumlarını kontrol edin

```bash
# API servis durumu
sudo systemctl status task-tracker-api

# Frontend servis durumu
sudo systemctl status task-tracker-frontend

# Portları kontrol edin
sudo ss -ltnp | grep -E ':5173|:8000'
```

## Servis Yönetimi

### Servisleri Başlat/Durdur/Yeniden Başlat

```bash
# API servisi
sudo systemctl start task-tracker-api
sudo systemctl stop task-tracker-api
sudo systemctl restart task-tracker-api

# Frontend servisi
sudo systemctl start task-tracker-frontend
sudo systemctl stop task-tracker-frontend
sudo systemctl restart task-tracker-frontend
```

### Logları Görüntüle

```bash
# API servis logları
sudo journalctl -u task-tracker-api -f

# Frontend servis logları
sudo journalctl -u task-tracker-frontend -f

# Son 50 satır log
sudo journalctl -u task-tracker-api -n 50
sudo journalctl -u task-tracker-frontend -n 50
```

### Servisleri Devre Dışı Bırak

```bash
# Servisleri durdur ve devre dışı bırak
sudo systemctl stop task-tracker-api
sudo systemctl stop task-tracker-frontend
sudo systemctl disable task-tracker-api
sudo systemctl disable task-tracker-frontend

# Servis dosyalarını sil
sudo rm /etc/systemd/system/task-tracker-api.service
sudo rm /etc/systemd/system/task-tracker-frontend.service
sudo systemctl daemon-reload
```

## Sorun Giderme

### Servis Başlamıyorsa

1. Logları kontrol edin:
```bash
sudo journalctl -u task-tracker-api -n 50
sudo journalctl -u task-tracker-frontend -n 50
```

2. Path'leri kontrol edin:
```bash
which php
which npm
which node
```

3. Dizin izinlerini kontrol edin:
```bash
ls -la /home/gtakip/task-tracker-desktop
ls -la /home/gtakip/task-tracker-desktop/task-tracker-api
```

4. Kullanıcı izinlerini kontrol edin:
```bash
id gtakip
```

### Port Zaten Kullanımda Hatası

```bash
# Portları kontrol edin
sudo ss -ltnp | grep -E ':5173|:8000'

# Process'leri durdurun
sudo kill -9 <PID>
```

## Notlar

- Servisler otomatik olarak başlatılır (sistem açılışında)
- Servisler crash durumunda otomatik olarak yeniden başlatılır
- Loglar systemd journal'da saklanır
- PuTTY kapatıldığında servisler çalışmaya devam eder

