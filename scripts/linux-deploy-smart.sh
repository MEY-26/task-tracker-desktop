#!/usr/bin/env bash
# Task Tracker Desktop — akıllı Linux güncelleme:
# git pull origin main + yalnızca gerektiğinde npm install, composer install,
# artisan migrate/cache clear, systemd restart.
#
# Varsayılan repo: ~/task-tracker-desktop
#
# Kullanım:
#   chmod +x scripts/linux-deploy-smart.sh
#   ./scripts/linux-deploy-smart.sh
#   ./scripts/linux-deploy-smart.sh /home/user/task-tracker-desktop --dry-run
#
# Çevre:
#   BRANCH=main
#
# Bayraklar:
#   --dry-run      Pull etmez; fetch sonrası origin/$BRANCH ile planı gösterir.
#   --force-all    Dosya filtresini atlayıp tüm adımları çalıştırır.
#   --no-restart   systemd restart/status atlar.
#   --build-ui     npm run build:ui (prod vite derlemesi).

set -euo pipefail

REPO_ROOT="${HOME}/task-tracker-desktop"
BRANCH="${BRANCH:-main}"
DRY_RUN=0
FORCE_ALL=0
NO_RESTART=0
BUILD_UI_FLAG=0

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${BLUE}[deploy]${NC} $*"; }
ok() { echo -e "${GREEN}[ok]${NC} $*"; }
warn() { echo -e "${YELLOW}[warn]${NC} $*"; }
err() { echo -e "${RED}[error]${NC} $*"; exit 1; }

usage() {
  grep '^#' "$0" | grep -v '^#!/' | head -40 | sed 's/^# \{0,1\}//'
}

while [[ $# -gt 0 ]]; do
  case "${1:-}" in
    --dry-run)       DRY_RUN=1; shift;;
    --force-all)     FORCE_ALL=1; shift;;
    --no-restart)    NO_RESTART=1; shift;;
    --build-ui)      BUILD_UI_FLAG=1; shift;;
    -h|--help)       usage; exit 0;;
    -*)
      err "Bilinmeyen seçenek: $1 (yardım: --help)"
      ;;
    *)
      REPO_ROOT="$1"
      shift;;
  esac
done

[[ -d "$REPO_ROOT" ]] || err "Dizin yok: $REPO_ROOT"
cd "$REPO_ROOT"

APISUB="task-tracker-api"
API_PATH="$REPO_ROOT/$APISUB"

# Çalıştır ('dry-run'da yazdırır, işlem yapılmaz)
rcmd() {
  if [[ "$DRY_RUN" -eq 1 ]]; then
    log "(dry-run) $*"; return 0
  fi
  log "+ $*"; "$@"
}

have_api() {
  [[ -d "$API_PATH" ]]
}

if ! git rev-parse --is-inside-work-tree &>/dev/null; then
  err "Git deposu değil: $REPO_ROOT"
fi

if ! git remote get-url origin &>/dev/null; then
  warn "Git remote 'origin' tanımlı değil."
fi

log "Repo: $REPO_ROOT | branch: $BRANCH"

REMOTE_REF="origin/$BRANCH"

# Refs güncel olsun (working tree yi değiştirmez).
if [[ "$DRY_RUN" -eq 1 ]]; then
  warn "Dry-run: fetch yapılır (salt ref güncellenir)"
fi
git fetch origin "$BRANCH"

if ! git rev-parse --verify "$REMOTE_REF" &>/dev/null; then
  err "Bulunamadı: $REMOTE_REF — fetch ve BRANCH'i kontrol edin"
fi

LOCAL_HEAD=$(git rev-parse HEAD)
UPSTREAM_HEAD=$(git rev-parse "$REMOTE_REF")

needs_pull=0
[[ "$LOCAL_HEAD" != "$UPSTREAM_HEAD" ]] && needs_pull=1

if [[ "$needs_pull" -eq 0 ]] && [[ "$FORCE_ALL" -eq 0 ]]; then
  ok "Zaten güncel (HEAD = $REMOTE_REF)."
  exit 0
fi

OLD_COMMIT="$LOCAL_HEAD"

if [[ "$DRY_RUN" -eq 1 ]]; then
  warn "Dry-run: çalışma kopyası pull ile güncellenmeyecek (plan için upstream kullanılacak)"
  NEW_COMMIT="$UPSTREAM_HEAD"
elif [[ "$needs_pull" -eq 1 ]]; then
  log "git pull origin $BRANCH ..."
  git pull origin "$BRANCH"
  NEW_COMMIT=$(git rev-parse HEAD)
else
  NEW_COMMIT="$LOCAL_HEAD"
fi

mapfile -t CHANGED < <(git diff --name-only "$OLD_COMMIT" "$NEW_COMMIT" || true)

FRONT_CHANGES=()
BACK_CHANGES=()
for f in "${CHANGED[@]:-}"; do
  if [[ "$f" == "$APISUB/"* ]] || [[ "$f" == "$APISUB" ]]; then
    BACK_CHANGES+=("$f")
  else
    FRONT_CHANGES+=("$f")
  fi
done

DO_NPM=0
DO_COMPOSER=0
DO_MIGRATE=0
DO_CLEAR=0
DO_BUILD_UI=0

if [[ "$FORCE_ALL" -eq 1 ]]; then
  DO_NPM=1
  DO_COMPOSER=1
  DO_MIGRATE=1
  DO_CLEAR=1
  DO_BUILD_UI=$BUILD_UI_FLAG
else
  [[ ${#FRONT_CHANGES[@]} -gt 0 ]] && DO_NPM=1
  for f in "${BACK_CHANGES[@]:-}"; do
    if [[ "$f" == "$APISUB/composer.json" ]] || [[ "$f" == "$APISUB/composer.lock" ]]; then
      DO_COMPOSER=1
    elif [[ "$f" == "$APISUB/database/migrations/"* ]]; then
      DO_MIGRATE=1
    elif [[ "$f" == "$APISUB/config/"* ]] || [[ "$f" == "$APISUB/routes/"* ]] || [[ "$f" == "$APISUB/bootstrap/"* ]] || [[ "$f" == "$APISUB/.env.example" ]] || [[ "$f" == ".env.example" ]]; then
      DO_CLEAR=1
    fi
  done
  [[ "$DO_MIGRATE" -eq 1 || "$DO_COMPOSER" -eq 1 ]] && DO_CLEAR=1
  [[ "$BUILD_UI_FLAG" -eq 1 ]] && DO_BUILD_UI=1
fi

log "=== Özet (${OLD_COMMIT:0:7} → ${NEW_COMMIT:0:7}) ==="
echo "  Değişen dosya: ${#CHANGED[@]} (frontend tarafı: ${#FRONT_CHANGES[@]}, $APISUB: ${#BACK_CHANGES[@]})"
echo "  npm install        : $([[ $DO_NPM -eq 1 ]] && echo evet || echo hayır)"
echo "  composer install  : $([[ $DO_COMPOSER -eq 1 ]] && echo evet || echo hayır)"
echo "  artisan migrate     : $([[ $DO_MIGRATE -eq 1 ]] && echo evet || echo hayır)"
echo "  artisan *:clear     : $([[ $DO_CLEAR -eq 1 ]] && echo evet || echo hayır)"
echo "  npm run build:ui    : $([[ $DO_BUILD_UI -eq 1 ]] && echo evet || echo hayır)"
echo ""

if [[ "$DRY_RUN" -eq 1 ]]; then
  printf '%s\n' "${CHANGED[@]:-}" | head -50
  [[ ${#CHANGED[@]} -gt 50 ]] && echo "  ... ($((${#CHANGED[@]} - 50)) satır daha)"
  ok "Dry-run bitti."
  exit 0
fi

# --- Uygulama ---
if [[ "$DO_NPM" -eq 1 ]]; then
  rcmd npm install --no-audit --prefer-offline
fi

if [[ "$DO_BUILD_UI" -eq 1 ]]; then
  rcmd npm run build:ui
fi

if have_api; then
  if [[ ${#BACK_CHANGES[@]} -gt 0 || "$FORCE_ALL" -eq 1 ]]; then
    if [[ "$DO_COMPOSER" -eq 1 ]]; then
      ( cd "$API_PATH" && rcmd composer install --no-interaction --prefer-dist ) || warn "composer install hata verdi"
    fi
    if [[ "$DO_MIGRATE" -eq 1 ]]; then
      ( cd "$API_PATH" && rcmd php artisan migrate --force ) || warn "migrate hata verdi"
    fi
    if [[ "$DO_CLEAR" -eq 1 ]]; then
      ( cd "$API_PATH" && rcmd php artisan config:clear && rcmd php artisan cache:clear && rcmd php artisan route:clear ) || warn "cache clear hata verdi"
    fi
  fi
else
  warn "Backend yolu yok; composer/artisan atlandı."
fi

RESTART_FE=0
RESTART_API=0
[[ "$DO_NPM" -eq 1 || "$DO_BUILD_UI" -eq 1 ]] && RESTART_FE=1
[[ ${#BACK_CHANGES[@]} -gt 0 || "$FORCE_ALL" -eq 1 ]] && RESTART_API=1

if [[ ${#BACK_CHANGES[@]} -gt 0 ]]; then
  ONLY_NOISE=1
  for f in "${BACK_CHANGES[@]}"; do
    case "$f" in
      *.md|"$APISUB"/database/database.sqlite|*.sqlite.backup|"$APISUB"/storage/logs/*) ;;
      *) ONLY_NOISE=0;;
    esac
  done
  [[ "$ONLY_NOISE" -eq 1 ]] && RESTART_API=0
fi

if [[ "$NO_RESTART" -eq 1 ]]; then
  warn "--no-restart: systemd atlandı."
  ok "Tamamlandı."
  exit 0
fi

if [[ "$RESTART_API" -eq 1 ]] || [[ "$RESTART_FE" -eq 1 ]]; then
  log "systemctl restart (api=$RESTART_API frontend=$RESTART_FE)"
  if [[ "$RESTART_API" -eq 1 ]] && [[ "$RESTART_FE" -eq 1 ]]; then
    rcmd sudo systemctl restart task-tracker-api task-tracker-frontend
  elif [[ "$RESTART_API" -eq 1 ]]; then
    rcmd sudo systemctl restart task-tracker-api
  elif [[ "$RESTART_FE" -eq 1 ]]; then
    rcmd sudo systemctl restart task-tracker-frontend
  fi
  rcmd sudo systemctl status task-tracker-api --no-pager || true
  rcmd sudo systemctl status task-tracker-frontend --no-pager || true
else
  warn "Servis yeniden başlatılmadı (gerek görülmedi)."
fi

ok "Tamamlandı."
