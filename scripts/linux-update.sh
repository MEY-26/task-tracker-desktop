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

# Git durumunu kontrol et
log_info "🔍 Git durumu kontrol ediliyor..."
CURRENT_BRANCH=$(git branch --show-current)
log_info "Mevcut branch: $CURRENT_BRANCH"

# Remote'u kontrol et
if ! git remote get-url origin &>/dev/null; then
    log_warning "Remote 'origin' bulunamadı. Ekleniyor..."
    git remote add origin https://github.com/MEY-26/task-tracker-desktop.git
fi

# Remote branch'leri güncelle
log_info "📡 Remote branch'ler güncelleniyor..."
if ! git fetch origin; then
    log_error "Git fetch başarısız oldu. İnternet bağlantısını kontrol edin."
    exit 1
fi

# main branch'i kullan, yoksa master'ı dene
REMOTE_BRANCH="main"
if ! git rev-parse --verify origin/main &>/dev/null; then
    log_warning "origin/main bulunamadı, origin/master deneniyor..."
    if git rev-parse --verify origin/master &>/dev/null; then
        REMOTE_BRANCH="master"
    else
        log_error "Ne origin/main ne de origin/master bulunamadı."
        exit 1
    fi
fi

log_info "Kullanılacak remote branch: $REMOTE_BRANCH"

# Eğer local branch farklıysa, doğru branch'e geç
if [ "$CURRENT_BRANCH" != "$REMOTE_BRANCH" ]; then
    log_info "🔄 Branch değiştiriliyor: $CURRENT_BRANCH -> $REMOTE_BRANCH"
    if git show-ref --verify --quiet "refs/heads/$REMOTE_BRANCH"; then
        git checkout "$REMOTE_BRANCH"
    else
        git checkout -b "$REMOTE_BRANCH" "origin/$REMOTE_BRANCH"
    fi
fi

# Git'ten güncellemeleri çek
log_info "📥 Git güncellemeleri çekiliyor..."
if git pull origin "$REMOTE_BRANCH"; then
    log_success "Git güncellemeleri başarıyla çekildi."
else
    log_error "Git pull başarısız oldu."
    log_info "💡 İpucu: Local değişiklikler varsa önce 'git stash' çalıştırın."
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

