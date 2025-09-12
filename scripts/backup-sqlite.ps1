<#
Basit yedekleme (SQLite)

Ne yapar:
- task-tracker-api/database/database.sqlite dosyasını zaman damgalı olarak kopyalar.
- İsteğe bağlı: .env dosyalarını da kopyalar.

Kullanım örneği:
  powershell -NoProfile -ExecutionPolicy Bypass -File scripts\backup-sqlite.ps1 \
    -ProjectDir "C:\wamp64\www\task-tracker-desktop" -IncludeEnv

Parametreler:
  -ProjectDir  : Proje kök klasörü (zorunlu)
  -OutDir      : Yedeklerin yazılacağı klasör (vars: %USERPROFILE%\Backups\task-tracker-desktop)
  -IncludeEnv  : .env dosyalarını da kopyala
#>

param(
  [Parameter(Mandatory = $true)] [string] $ProjectDir,
  [string] $OutDir = "$env:USERPROFILE\Backups\task-tracker-desktop",
  [switch] $IncludeEnv
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Info($msg) { Write-Host "[INFO] $msg" -ForegroundColor Cyan }
function Write-Warn($msg) { Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Err($msg)  { Write-Host "[ERR ] $msg" -ForegroundColor Red }

$apiDir = Join-Path $ProjectDir 'task-tracker-api'
$sqlite = Join-Path $apiDir 'database\database.sqlite'

if (-not (Test-Path $sqlite)) {
  Write-Err "SQLite dosyası bulunamadı: $sqlite"
  exit 1
}

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$ts = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupFile = Join-Path $OutDir "db-sqlite-$ts.sqlite"

Copy-Item -LiteralPath $sqlite -Destination $backupFile -Force
Write-Info "DB yedeği oluşturuldu: $backupFile"

if ($IncludeEnv) {
  $envBackend = Join-Path $apiDir '.env'
  if (Test-Path $envBackend) {
    $envOut = Join-Path $OutDir "env-backend-$ts.env"
    Copy-Item $envBackend $envOut -Force
    Write-Info "Backend .env yedeklendi: $envOut"
  }
  $envRoot = Join-Path $ProjectDir '.env'
  if (Test-Path $envRoot) {
    $envOut = Join-Path $OutDir "env-root-$ts.env"
    Copy-Item $envRoot $envOut -Force
    Write-Info "Root .env yedeklendi: $envOut"
  }
}

Write-Host "Tamamlandı." -ForegroundColor Green

