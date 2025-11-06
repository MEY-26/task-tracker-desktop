#!/bin/bash

# Task Tracker Desktop - Linux Güncelleme Script'i
# Bu script projeyi GitHub'tan günceller ve bağımlılıkları yükler

set -e  # Hata durumunda script'i durdur

# Renkli çıktı için
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Log fonksiyonları
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Proje dizinine git
REPO_PATH="${1:-$HOME/task-tracker-desktop}"

if [ ! -d "$REPO_PATH" ]; then
    log_error "Proje dizini bulunamadı: $REPO_PATH"
    exit 1
fi

cd "$REPO_PATH"

log_info "🔄 Task Tracker Desktop - Güncelleme Başlatılıyor..."
echo ""

# Git'ten güncellemeleri çek
log_info "📥 Git güncellemeleri çekiliyor..."
if git pull origin main; then
    log_success "Git güncellemeleri başarıyla çekildi."
else
    log_error "Git pull başarısız oldu."
    exit 1
fi

# Frontend bağımlılıklarını güncelle
log_info "📦 Frontend bağımlılıkları güncelleniyor..."
if npm install; then
    log_success "Frontend bağımlılıkları başarıyla güncellendi."
else
    log_error "Frontend bağımlılıkları güncellenirken hata oluştu."
    exit 1
fi

# Backend bağımlılıklarını güncelle
log_info "📦 Backend bağımlılıkları güncelleniyor..."
cd task-tracker-api

if composer install --no-interaction; then
    log_success "Backend bağımlılıkları başarıyla güncellendi."
else
    log_error "Backend bağımlılıkları güncellenirken hata oluştu."
    exit 1
fi

# Veritabanı migration'larını çalıştır
log_info "🗄️ Veritabanı migration'ları çalıştırılıyor..."
if php artisan migrate --force; then
    log_success "Veritabanı migration'ları başarıyla tamamlandı."
else
    log_warning "Migration'lar çalıştırılamadı. Veritabanı bağlantısını kontrol edin."
fi

# Ana dizine dön
cd ..

echo ""
log_success "✅ Güncelleme tamamlandı!"
echo ""
echo "📋 Sonraki adımlar:"
echo "1. Uygulamayı yeniden başlatın: npm run start:network:restart"
echo "2. Veya systemd servislerini yeniden başlatın:"
echo "   sudo systemctl restart task-tracker-api"
echo "   sudo systemctl restart task-tracker-frontend"
echo ""

