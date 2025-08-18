#!/bin/bash

# Task Tracker Desktop - Otomatik Kurulum Script'i
# Bu script projeyi otomatik olarak kurar ve yapılandırır

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

# Gereksinimleri kontrol et
check_requirements() {
    log_info "Gereksinimler kontrol ediliyor..."
    
    # Node.js kontrolü
    if ! command -v node &> /dev/null; then
        log_error "Node.js bulunamadı. Lütfen Node.js 18+ yükleyin."
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        log_error "Node.js 18+ gerekli. Mevcut sürüm: $(node -v)"
        exit 1
    fi
    
    log_success "Node.js sürümü: $(node -v)"
    
    # npm kontrolü
    if ! command -v npm &> /dev/null; then
        log_error "npm bulunamadı."
        exit 1
    fi
    
    log_success "npm sürümü: $(npm -v)"
    
    # PHP kontrolü
    if ! command -v php &> /dev/null; then
        log_error "PHP bulunamadı. Lütfen PHP 8.2+ yükleyin."
        exit 1
    fi
    
    PHP_VERSION=$(php -r "echo PHP_MAJOR_VERSION;")
    if [ "$PHP_VERSION" -lt 8 ]; then
        log_error "PHP 8.2+ gerekli. Mevcut sürüm: $(php -v | head -n1)"
        exit 1
    fi
    
    log_success "PHP sürümü: $(php -v | head -n1)"
    
    # Composer kontrolü
    if ! command -v composer &> /dev/null; then
        log_error "Composer bulunamadı. Lütfen Composer yükleyin."
        exit 1
    fi
    
    log_success "Composer sürümü: $(composer --version | head -n1)"
}

# Frontend kurulumu
setup_frontend() {
    log_info "Frontend bağımlılıkları yükleniyor..."
    
    if [ ! -f "package.json" ]; then
        log_error "package.json bulunamadı. Doğru dizinde olduğunuzdan emin olun."
        exit 1
    fi
    
    npm install
    
    if [ $? -eq 0 ]; then
        log_success "Frontend bağımlılıkları başarıyla yüklendi."
    else
        log_error "Frontend bağımlılıkları yüklenirken hata oluştu."
        exit 1
    fi
}

# Backend kurulumu
setup_backend() {
    log_info "Backend kurulumu başlatılıyor..."
    
    if [ ! -d "task-tracker-api" ]; then
        log_error "task-tracker-api dizini bulunamadı."
        exit 1
    fi
    
    cd task-tracker-api
    
    # Composer bağımlılıkları
    log_info "Composer bağımlılıkları yükleniyor..."
    composer install --no-interaction
    
    if [ $? -ne 0 ]; then
        log_error "Composer bağımlılıkları yüklenirken hata oluştu."
        exit 1
    fi
    
    # .env dosyası oluştur
    if [ ! -f ".env" ]; then
        log_info ".env dosyası oluşturuluyor..."
        cp env.example .env
        
        # Laravel key generate
        php artisan key:generate --no-interaction
        log_success ".env dosyası oluşturuldu ve Laravel key generate edildi."
    else
        log_warning ".env dosyası zaten mevcut."
    fi
    
    cd ..
}

# Veritabanı kurulumu
setup_database() {
    log_info "Veritabanı kurulumu..."
    
    cd task-tracker-api
    
    # Migration'ları çalıştır
    log_info "Veritabanı migration'ları çalıştırılıyor..."
    php artisan migrate --force
    
    if [ $? -eq 0 ]; then
        log_success "Veritabanı migration'ları başarıyla tamamlandı."
    else
        log_warning "Migration'lar çalıştırılamadı. Veritabanı bağlantısını kontrol edin."
    fi
    
    # Seed'leri çalıştır
    log_info "Veritabanı seed'leri çalıştırılıyor..."
    php artisan db:seed --force
    
    if [ $? -eq 0 ]; then
        log_success "Veritabanı seed'leri başarıyla tamamlandı."
    else
        log_warning "Seed'ler çalıştırılamadı."
    fi
    
    cd ..
}

# Build işlemi
build_application() {
    log_info "Uygulama build ediliyor..."
    
    npm run build:ui
    
    if [ $? -eq 0 ]; then
        log_success "Uygulama başarıyla build edildi."
    else
        log_error "Build işlemi başarısız oldu."
        exit 1
    fi
}

# Kurulum sonrası bilgiler
show_post_install_info() {
    echo ""
    log_success "🎉 Kurulum tamamlandı!"
    echo ""
    echo "📋 Sonraki adımlar:"
    echo "1. Veritabanı ayarlarını kontrol edin: task-tracker-api/.env"
    echo "2. API sunucusunu başlatın: cd task-tracker-api && php artisan serve"
    echo "3. Electron uygulamasını başlatın: npm run dev"
    echo ""
    echo "📚 Daha fazla bilgi için README.md dosyasını okuyun."
    echo ""
}

# Ana kurulum fonksiyonu
main() {
    echo "🚀 Task Tracker Desktop - Otomatik Kurulum"
    echo "=========================================="
    echo ""
    
    # Gereksinimleri kontrol et
    check_requirements
    
    # Frontend kurulumu
    setup_frontend
    
    # Backend kurulumu
    setup_backend
    
    # Veritabanı kurulumu
    setup_database
    
    # Build işlemi
    build_application
    
    # Kurulum sonrası bilgiler
    show_post_install_info
}

# Script'i çalıştır
main "$@"
