#!/usr/bin/env bash

##
# Task Tracker Desktop
# --------------------
# Basit SCP/SSH ile dağıtım script'i.
#
# Bu script yerel kodu arşivleyip hedef Linux sunucusuna SCP ile gönderir,
# ardından SSH üzerinden arşivleri açıp bağımlılıkları kurar.
# Git kullanmak zorunda kalmadan hızlı güncelleme için tasarlandı.
#
# Gereksinimler:
#   - Yerel makinede: bash, tar, scp, ssh, npm, composer (sadece paket hazırlama için gerekmez)
#   - Uzak makinede: bash, tar, npm, composer, php, gerekli sistem paketleri
#
# Kullanım:
#   REMOTE_HOST=10.0.0.10 ./scripts/deploy-via-scp.sh
#   REMOTE_HOST=10.0.0.10 REMOTE_USER=deploy REMOTE_PATH=/var/www/task-tracker ./scripts/deploy-via-scp.sh
#
# Opsiyonel ortam değişkenleri:
#   REMOTE_HOST      : (Zorunlu) Uzak sunucu adresi veya IP'si
#   REMOTE_USER      : Varsayılan "ubuntu"
#   REMOTE_PATH      : Varsayılan "/var/www/task-tracker-desktop"
#   SSH_KEY          : Varsayılan "~/.ssh/id_rsa"
#   KEEP_RELEASES    : Varsayılan 3 (ne kadar eski release tutulacak)
#   BUILD_FRONTEND   : Varsayılan "false" (true ise npm run build çalışır)
##

set -euo pipefail

REMOTE_HOST="${REMOTE_HOST:-}"
REMOTE_USER="${REMOTE_USER:-ubuntu}"
REMOTE_PATH="${REMOTE_PATH:-/var/www/task-tracker-desktop}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_rsa}"
KEEP_RELEASES="${KEEP_RELEASES:-3}"
BUILD_FRONTEND="${BUILD_FRONTEND:-false}"

if [[ -z "$REMOTE_HOST" ]]; then
  echo "[ERROR] REMOTE_HOST değeri belirtilmeli (örn. REMOTE_HOST=1.2.3.4 $0)" >&2
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TIMESTAMP="$(date +%Y%m%d%H%M%S)"
ARCHIVE_NAME="task-tracker-desktop-${TIMESTAMP}.tar.gz"
ARCHIVE_PATH="${REPO_ROOT}/${ARCHIVE_NAME}"

echo "[INFO] Proje arşivi hazırlanıyor: ${ARCHIVE_NAME}"
tar -czf "$ARCHIVE_PATH" \
  --exclude='.git' \
  --exclude='.github' \
  --exclude='node_modules' \
  --exclude='task-tracker-api/vendor' \
  --exclude='storage/logs' \
  --exclude='**/*.log' \
  -C "$REPO_ROOT" .

echo "[INFO] Arşiv SCP ile gönderiliyor..."
scp -i "$SSH_KEY" "$ARCHIVE_PATH" "${REMOTE_USER}@${REMOTE_HOST}:/tmp/${ARCHIVE_NAME}"

rm -f "$ARCHIVE_PATH"

REMOTE_SCRIPT="$(cat <<'EOF'
set -euo pipefail

: "${ARCHIVE:?Arşiv adı gelmedi}"
: "${APP_DIR:?Uygulama yolu gelmedi}"
: "${RELEASE_NAME:?Release adı gelmedi}"
: "${KEEP_RELEASES:=3}"
: "${BUILD_FRONTEND:=false}"

echo "[INFO] Uzak sunucuda arşiv işleniyor..."
sudo mkdir -p "$APP_DIR/releases" "$APP_DIR/backups"
sudo chown -R "$USER":"$USER" "$APP_DIR/releases" "$APP_DIR/backups"

RELEASE_DIR="$APP_DIR/releases/$RELEASE_NAME"
sudo rm -rf "$RELEASE_DIR"
sudo mkdir -p "$RELEASE_DIR"
sudo tar -xzf "$ARCHIVE" -C "$RELEASE_DIR"
sudo rm -f "$ARCHIVE"

pushd "$RELEASE_DIR" >/dev/null

echo "[INFO] npm bağımlılıkları kuruluyor..."
npm install --production
if [[ "$BUILD_FRONTEND" == "true" ]]; then
  npm run build
fi

echo "[INFO] Laravel API bağımlılıkları kuruluyor..."
pushd task-tracker-api >/dev/null
composer install --no-dev --optimize-autoloader --no-interaction
php artisan migrate --force || true
popd >/dev/null

popd >/dev/null

echo "[INFO] Mevcut release sembolik bağı güncelleniyor..."
sudo ln -sfn "$RELEASE_DIR" "$APP_DIR/current"

echo "[INFO] Eski release'ler temizleniyor..."
cd "$APP_DIR/releases"
ls -1dt release-* 2>/dev/null | tail -n +"$((KEEP_RELEASES + 1))" | xargs -r sudo rm -rf

echo "[SUCCESS] Dağıtım tamamlandı. Yeni release: $RELEASE_NAME"
EOF
)"

echo "[INFO] Uzak script çalıştırılıyor..."
ssh -i "$SSH_KEY" "${REMOTE_USER}@${REMOTE_HOST}" \
  "ARCHIVE=/tmp/${ARCHIVE_NAME} APP_DIR=${REMOTE_PATH} RELEASE_NAME=release-${TIMESTAMP} KEEP_RELEASES=${KEEP_RELEASES} BUILD_FRONTEND=${BUILD_FRONTEND} bash -s" <<<"$REMOTE_SCRIPT"

echo "[DONE] İşlem başarıyla tamamlandı."
