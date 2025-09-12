<#
Basit geri yükleme (SQLite)

Ne yapar:
- db-sqlite-*.sqlite yedeğini alıp yeni kurulumun database.sqlite dosyasına kopyalar.
- İsteğe bağlı: .env yedeklerini de geri yükler.

Kullanım örneği:
  powershell -NoProfile -ExecutionPolicy Bypass -File scripts\restore-sqlite.ps1 \
    -ProjectDir "C:\wamp64\www\task-tracker-desktop" -BackupFile "C:\Users\user\Backups\task-tracker-desktop\db-sqlite-20250912-101010.sqlite" -Overwrite -RestoreEnv

Veya en son yedeği otomatik seçmek için:
  powershell -NoProfile -ExecutionPolicy Bypass -File scripts\restore-sqlite.ps1 \
    -ProjectDir "C:\wamp64\www\task-tracker-desktop"

Parametreler:
  -ProjectDir : Proje kök klasörü (zorunlu)
  -BackupFile : .sqlite yedeğin tam yolu (opsiyonel). Verilmezse varsayılan OutDir'deki en son dosya seçilir.
  -FromDir    : Yedek arama klasörü (vars: %USERPROFILE%\Backups\task-tracker-desktop)
  -Overwrite  : Var olan database.sqlite üstüne yaz (aksi halde var olan dosya korunur ve .pre-restore-* olarak adlandırılır)
  -RestoreEnv : Mevcutsa env-backend-*.env ve env-root-*.env dosyalarını geri yükle
#>

param(
  [Parameter(Mandatory = $true)] [string] $ProjectDir,
  [string] $BackupFile,
  [string] $FromDir = "$env:USERPROFILE\Backups\task-tracker-desktop",
  [switch] $Overwrite,
  [switch] $RestoreEnv
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Info($msg) { Write-Host "[INFO] $msg" -ForegroundColor Cyan }
function Write-Warn($msg) { Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Err($msg)  { Write-Host "[ERR ] $msg" -ForegroundColor Red }

function Get-LatestSqlite([string]$dir) {
  if (-not (Test-Path $dir)) { return $null }
  $f = Get-ChildItem -Path $dir -Filter 'db-sqlite-*.sqlite' | Sort-Object -Property LastWriteTime -Descending | Select-Object -First 1
  return $f?.FullName
}

if (-not $BackupFile) {
  $BackupFile = Get-LatestSqlite -dir $FromDir
}

if (-not $BackupFile -or -not (Test-Path $BackupFile)) {
  Write-Err "Yedek .sqlite bulunamadı. -BackupFile ile dosya verin veya -FromDir altında db-sqlite-*.sqlite dosyası bulundurun."
  exit 1
}

$apiDir = Join-Path $ProjectDir 'task-tracker-api'
$dbDir = Join-Path $apiDir 'database'
$target = Join-Path $dbDir 'database.sqlite'
New-Item -ItemType Directory -Force -Path $dbDir | Out-Null

if (Test-Path $target) {
  if ($Overwrite) {
    Write-Warn "Var olan database.sqlite üstüne yazılacak."
  } else {
    $ts = Get-Date -Format 'yyyyMMdd-HHmmss'
    $bak = Join-Path $dbDir "database.pre-restore-$ts.sqlite"
    Copy-Item $target $bak -Force
    Write-Info "Mevcut DB yedeğe alındı: $bak"
  }
}

Copy-Item $BackupFile $target -Force
Write-Info "Yedek geri yüklendi: $BackupFile -> $target"

if ($RestoreEnv) {
  $envBackendLatest = Get-ChildItem -Path $FromDir -Filter 'env-backend-*.env' | Sort-Object -Property LastWriteTime -Descending | Select-Object -First 1
  if ($envBackendLatest) {
    Copy-Item $envBackendLatest.FullName (Join-Path $apiDir '.env') -Force
    Write-Info "Backend .env geri yüklendi: $($envBackendLatest.Name)"
  }
  $envRootLatest = Get-ChildItem -Path $FromDir -Filter 'env-root-*.env' | Sort-Object -Property LastWriteTime -Descending | Select-Object -First 1
  if ($envRootLatest) {
    Copy-Item $envRootLatest.FullName (Join-Path $ProjectDir '.env') -Force
    Write-Info "Root .env geri yüklendi: $($envRootLatest.Name)"
  }
}

Write-Host 'Tamamlandı.' -ForegroundColor Green

