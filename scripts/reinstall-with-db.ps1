<#
Sıfırdan kurulum scripti (Windows/PowerShell)

Bu script şunları yapar:
1) Mevcut MySQL veritabanını yedekler (timestamp'li .sql)
2) Proje klasörünü tamamen siler
3) Repoyu tekrar klonlar ve bağımlılıkları kurar
4) Yedeklenmiş veritabanını geri yükler

Kullanım (örnek):

  # Temel örnek
  pwsh -File scripts/reinstall-with-db.ps1 \
    -RepoUrl "https://github.com/ORG/REPO.git" \
    -ProjectDir "C:\\wamp64\\www\\task-tracker-desktop" \
    -DbName "task_tracker" -DbUser "root" -DbPassword "root" -Yes

  # WAMP MySQL bin klasörünü belirtmek için (ör. C:\\wamp64\\bin\\mysql\\mysql8.0.36\\bin)
  pwsh -File scripts/reinstall-with-db.ps1 \
    -RepoUrl "https://github.com/ORG/REPO.git" \
    -ProjectDir "C:\\wamp64\\www\\task-tracker-desktop" \
    -DbName "task_tracker" -DbUser "root" -DbPassword "root" \
    -MysqlBin "C:\\wamp64\\bin\\mysql\\mysql8.0.36\\bin" -Yes

Parametreler:
  -RepoUrl       : Git repo URL'i (zorunlu)
  -ProjectDir    : Projenin tam yolu (zorunlu)
  -Branch        : Klonlanacak branch (varsayılan: main)
  -DbHost        : DB host (varsayılan: 127.0.0.1)
  -DbPort        : DB port (varsayılan: 3306)
  -DbName        : DB adı (zorunlu)
  -DbUser        : DB kullanıcı adı (zorunlu)
  -DbPassword    : DB şifresi (zorunlu)
  -MysqlBin      : mysql/mysqldump bulunan klasör (opsiyonel)
  -ComposerBin   : composer komutu (varsayılan: composer)
  -PhpBin        : php komutu (varsayılan: php)
  -Pkg           : npm|pnpm|yarn (varsayılan: npm)
  -BackupDir     : Yedeklerin saklanacağı klasör (varsayılan: %USERPROFILE%\Backups\task-tracker-desktop)
  -SkipFrontend  : Frontend adımlarını atla
  -SkipBackend   : Backend adımlarını atla
  -NoRestore     : DB geri yüklemeyi atla (sadece yedek al)
  -Yes           : Etkileşim olmadan onayla (silme için)

Notlar:
- Yedekler proje klasörü dışında tutulur: %USERPROFILE%\Backups\task-tracker-desktop
- DB yedeği --routines ve --events içerir. GTID kapalı alınır.
- Geri yükleme için en son alınan yedek kullanılır.
- Laravel backend 'task-tracker-api' klasöründe varsayılmıştır.
#>

param(
  [Parameter(Mandatory = $true)] [string] $RepoUrl,
  [Parameter(Mandatory = $true)] [string] $ProjectDir,
  [string] $Branch = "main",

  # DB türü: auto => mevcut .env'den algılar; sqlite veya mysql de seçilebilir
  [ValidateSet("auto","sqlite","mysql")] [string] $DbType = "auto",
  [string] $DbHost = "127.0.0.1",
  [int] $DbPort = 3306,
  [string] $DbName,
  [string] $DbUser,
  [string] $DbPassword,
  [string] $MysqlBin = "",

  [string] $ComposerBin = "composer",
  [string] $PhpBin = "php",
  [ValidateSet("npm","pnpm","yarn")] [string] $Pkg = "npm",
  [string] $BackupDir = "$env:USERPROFILE\Backups\task-tracker-desktop",
  [switch] $SkipFrontend,
  [switch] $SkipBackend,
  [switch] $NoRestore,
  [switch] $Yes,
  # Dahili kullanım: geçici dizinden yeniden başlatıldı mı?
  [switch] $FromTemp
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Info($msg) { Write-Host "[INFO] $msg" -ForegroundColor Cyan }
function Write-Warn($msg) { Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Err($msg)  { Write-Host "[ERR ] $msg" -ForegroundColor Red }

function Find-Exe([string]$name, [string]$binDir = "") {
  if ($binDir -and (Test-Path (Join-Path $binDir $name))) {
    return (Join-Path $binDir $name)
  }
  $cmd = Get-Command $name -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  return $null
}

function Ensure-Tool([string]$label, [string]$exeName, [string]$binDir = "") {
  $exe = Find-Exe $exeName $binDir
  if (-not $exe) { throw "Gerekli araç bulunamadı: $label ($exeName)" }
  return $exe
}

function Run-Cmd([string]$exe, [string[]]$args, [string]$workdir = "") {
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = $exe
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.UseShellExecute = $false
  if ($workdir) { $psi.WorkingDirectory = $workdir }
  foreach ($a in $args) { [void]$psi.ArgumentList.Add($a) }
  $p = New-Object System.Diagnostics.Process
  $p.StartInfo = $psi
  [void]$p.Start()
  $stdout = $p.StandardOutput.ReadToEnd()
  $stderr = $p.StandardError.ReadToEnd()
  $p.WaitForExit()
  if ($p.ExitCode -ne 0) {
    Write-Err $stderr
    throw "Komut hatalı çıktı kodu ile bitti: $exe $($args -join ' ')"
  }
  if ($stdout) { Write-Host $stdout }
}

function Get-LatestBackup([string]$dir, [string]$dbName) {
  if (-not (Test-Path $dir)) { return $null }
  $files = Get-ChildItem -Path $dir -Filter "db-$dbName-*.sql" | Sort-Object -Property LastWriteTime -Descending
  if ($files -and $files.Length -gt 0) { return $files[0].FullName }
  return $null
}

# Eğer script proje klasörünün içindeyse, kendini temp'e kopyalayıp oradan tekrar çalıştır
$scriptFull = [System.IO.Path]::GetFullPath($PSCommandPath)
$projFull = [System.IO.Path]::GetFullPath($ProjectDir)
if (-not $FromTemp -and $scriptFull.StartsWith($projFull, [System.StringComparison]::OrdinalIgnoreCase)) {
  try {
    $tempDir = Join-Path $env:TEMP ("reinstall-tt-" + ([guid]::NewGuid().ToString('N')))
    New-Item -ItemType Directory -Force -Path $tempDir | Out-Null
    $tempScript = Join-Path $tempDir (Split-Path -Leaf $PSCommandPath)
    Copy-Item -LiteralPath $PSCommandPath -Destination $tempScript -Force

    $forwardArgs = @()
    foreach ($kv in $PSBoundParameters.GetEnumerator()) {
      if ($kv.Key -eq 'FromTemp') { continue }
      $isSwitch = ($kv.Value -is [System.Management.Automation.SwitchParameter])
      if ($isSwitch) {
        if ($kv.Value.IsPresent) { $forwardArgs += "-" + $kv.Key }
      } else {
        $forwardArgs += "-" + $kv.Key
        $forwardArgs += [string]$kv.Value
      }
    }
    $forwardArgs += '-FromTemp'

    $pwsh = (Get-Command pwsh -ErrorAction SilentlyContinue)?.Source
    if (-not $pwsh) { $pwsh = (Get-Command powershell -ErrorAction SilentlyContinue)?.Source }
    if (-not $pwsh) { throw 'PowerShell yürütülebilir dosyası bulunamadı.' }

    $argList = @('-NoLogo','-NoProfile','-File', $tempScript) + $forwardArgs
    Start-Process -FilePath $pwsh -ArgumentList $argList | Out-Null
    Write-Info "Script geçici dizinden yeniden başlatıldı: $tempScript"
    exit 0
  } catch {
    Write-Warn "Geçici dizinden yeniden başlatma başarısız: $($_.Exception.Message). Mevcut konumdan devam edilecek; silme adımı başarısız olabilir."
  }
}

Write-Info "Ön koşullar kontrol ediliyor"
$gitExe   = Ensure-Tool "Git" "git.exe"
$phpExe   = Ensure-Tool "PHP" ($PhpBin)
$compExe  = Ensure-Tool "Composer" ($ComposerBin)
switch ($Pkg) {
  'npm'  { $pkgExe = Ensure-Tool "npm"  "npm.cmd" }
  'pnpm' { $pkgExe = Ensure-Tool "pnpm" "pnpm.cmd" }
  'yarn' { $pkgExe = Ensure-Tool "yarn" "yarn.cmd" }
}

# DB türünü mevcut projeden algıla (auto ise)
$apiDir = Join-Path $ProjectDir "task-tracker-api"
$apiEnv = Join-Path $apiDir ".env"
$dbMode = $DbType
if ($dbMode -eq 'auto') {
  $dbMode = 'sqlite'
  if (Test-Path $apiEnv) {
    $connLine = (Get-Content $apiEnv | Where-Object { $_ -match '^DB_CONNECTION=' } | Select-Object -First 1)
    if ($connLine -match 'mysql') { $dbMode = 'mysql' }
    elseif ($connLine -match 'sqlite') { $dbMode = 'sqlite' }
  } elseif (Test-Path (Join-Path $apiDir 'database\database.sqlite')) {
    $dbMode = 'sqlite'
  }
}

if ($dbMode -eq 'mysql') {
  if (-not $DbName -or -not $DbUser) {
    throw "MySQL için -DbName ve -DbUser zorunludur. -DbPassword da gerekli olabilir."
  }
  $mysqldumpExe = Ensure-Tool "mysqldump" "mysqldump.exe" $MysqlBin
  $mysqlExe     = Ensure-Tool "mysql"     "mysql.exe"     $MysqlBin
}

Write-Info "Yedek klasörü hazırlanıyor: $BackupDir"
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

Write-Info "Veritabanı yedeği alınıyor (tür: $dbMode)"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupFile = $null
if ($dbMode -eq 'mysql') {
  $backupFile = Join-Path $BackupDir "db-$DbName-$timestamp.sql"
  $dumpArgs = @(
    "--host=$DbHost",
    "--port=$DbPort",
    "--user=$DbUser",
    "--password=$DbPassword",
    "--routines",
    "--events",
    "--single-transaction",
    "--quick",
    "--set-gtid-purged=OFF",
    "--databases", $DbName,
    "--result-file=$backupFile"
  )
  Run-Cmd $mysqldumpExe $dumpArgs
  Write-Info "MySQL yedeği oluşturuldu: $backupFile"
} else {
  $sqlitePath = Join-Path $apiDir "database\database.sqlite"
  if (Test-Path $sqlitePath) {
    $backupFile = Join-Path $BackupDir "db-sqlite-$timestamp.sqlite"
    Copy-Item $sqlitePath $backupFile -Force
    Write-Info "SQLite dosyası yedeklendi: $backupFile"
  } else {
    Write-Warn "SQLite dosyası bulunamadı: $sqlitePath (boş kurulum olabilir)"
  }
}

# .env dosyalarını da yedekle (varsa)
$envBackupBackend = Join-Path $BackupDir "env-backend-$timestamp.env"
$envBackupFrontend = Join-Path $BackupDir "env-frontend-$timestamp.env"
$apiEnv = Join-Path $ProjectDir "task-tracker-api\.env"
if (Test-Path $apiEnv) {
  Copy-Item $apiEnv $envBackupBackend -Force
  Write-Info "Backend .env yedeklendi: $envBackupBackend"
}
$rootEnv = Join-Path $ProjectDir ".env"
if (Test-Path $rootEnv) {
  Copy-Item $rootEnv $envBackupFrontend -Force
  Write-Info "Frontend/.root .env yedeklendi: $envBackupFrontend"
}

if (-not $Yes) {
  $confirm = Read-Host "Uyarı: '$ProjectDir' KLASÖRÜ TAMAMEN SİLİNECEK. Devam? (y/N)"
  if ($confirm -ne 'y' -and $confirm -ne 'Y') {
    Write-Warn "İşlem kullanıcı tarafından iptal edildi."
    exit 0
  }
}

if (Test-Path $ProjectDir) {
  Write-Info "Proje klasörü siliniyor: $ProjectDir"
  Remove-Item -LiteralPath $ProjectDir -Recurse -Force -ErrorAction Stop
}

Write-Info "Repo klonlanıyor: $RepoUrl -> $ProjectDir (branch: $Branch)"
Run-Cmd $gitExe @("clone", "--branch", $Branch, "--single-branch", $RepoUrl, $ProjectDir)

# Backend kurulum
if (-not $SkipBackend) {
  $apiDir = Join-Path $ProjectDir "task-tracker-api"
  if (-not (Test-Path $apiDir)) {
    Write-Warn "Backend klasörü bulunamadı: $apiDir (SkipBackend kullanmadıysanız dizin adını kontrol edin)"
  } else {
    Write-Info "Composer bağımlılıkları yükleniyor"
    Run-Cmd $compExe @("install", "--no-interaction", "--prefer-dist") $apiDir

    $apiEnvPath = Join-Path $apiDir ".env"
    if (Test-Path $envBackupBackend) {
      Copy-Item $envBackupBackend $apiEnvPath -Force
      Write-Info "Backend .env geri yüklendi"
    } elseif (Test-Path (Join-Path $apiDir ".env.example")) {
      Copy-Item (Join-Path $apiDir ".env.example") $apiEnvPath -Force
      Write-Info ".env.example kopyalandı"
    }

    Write-Info "APP_KEY oluşturuluyor (varsa güncellenmez)"
    Run-Cmd $phpExe @("artisan", "key:generate", "--force") $apiDir

    $didRestore = $false

    if ($dbMode -eq 'mysql') {
      # DB oluştur (varsa atla)
      Write-Info "MySQL veritabanı oluşturma kontrolü: $DbName"
      $createDbSql = "CREATE DATABASE IF NOT EXISTS `$DbName` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
      Run-Cmd $mysqlExe @("--host=$DbHost", "--port=$DbPort", "--user=$DbUser", "--password=$DbPassword", "--execute=$createDbSql")

      if (-not $NoRestore) {
        $restoreFile = $backupFile
        if (-not ($restoreFile -and (Test-Path $restoreFile))) {
          $restoreFile = Get-LatestBackup -dir $BackupDir -dbName $DbName
        }
        if ($restoreFile -and (Test-Path $restoreFile)) {
          Write-Info "MySQL geri yükleme: $restoreFile"
          $sourceCmd = "SOURCE `"$restoreFile`";"
          Run-Cmd $mysqlExe @("--host=$DbHost", "--port=$DbPort", "--user=$DbUser", "--password=$DbPassword", $DbName, "--execute=$sourceCmd")
          $didRestore = $true
        } else {
          Write-Warn "Geri yüklenecek MySQL .sql bulunamadı."
        }
      } else {
        Write-Info "NoRestore seçildi, DB geri yükleme atlandı."
      }
    } else {
      # SQLite modu
      $sqlitePathNew = Join-Path $apiDir "database\database.sqlite"
      New-Item -ItemType Directory -Force -Path (Split-Path $sqlitePathNew -Parent) | Out-Null

      if (-not $NoRestore -and $backupFile -and (Test-Path $backupFile)) {
        Write-Info "SQLite geri yükleme: $backupFile -> $sqlitePathNew"
        Copy-Item $backupFile $sqlitePathNew -Force
        $didRestore = $true
      } elseif (-not $NoRestore) {
        # Eski yedeklerden en sonunu dene
        $latest = Get-ChildItem -Path $BackupDir -Filter "db-sqlite-*.sqlite" | Sort-Object -Property LastWriteTime -Descending | Select-Object -First 1
        if ($latest) {
          Write-Info "SQLite geri yükleme: $($latest.FullName) -> $sqlitePathNew"
          Copy-Item $latest.FullName $sqlitePathNew -Force
          $didRestore = $true
        }
      }

      if (-not $didRestore) {
        if (-not (Test-Path $sqlitePathNew)) {
          Write-Info "Yeni SQLite veritabanı oluşturuluyor: $sqlitePathNew"
          New-Item -ItemType File -Path $sqlitePathNew -Force | Out-Null
        } else {
          Write-Warn "SQLite geri yükleme yapılmadı; mevcut dosya kullanılacak."
        }
      }
    }

    # Eğer geri yükleme yoksa (veya bulunamadıysa) migrate + seed çalıştır
    if (-not $didRestore) {
      Write-Info "Migrasyonlar uygulanıyor"
      Run-Cmd $phpExe @("artisan", "migrate", "--force") $apiDir
      Write-Info "Seeder çalıştırılıyor"
      Run-Cmd $phpExe @("artisan", "db:seed", "--force") $apiDir
    }
  }
}

# Frontend kurulum
if (-not $SkipFrontend) {
  Write-Info "Frontend bağımlılıkları yükleniyor ($Pkg)"
  switch ($Pkg) {
    'npm'  { Run-Cmd $pkgExe @("install") $ProjectDir }
    'pnpm' { Run-Cmd $pkgExe @("install") $ProjectDir }
    'yarn' { Run-Cmd $pkgExe @("install") $ProjectDir }
  }

  if (Test-Path $envBackupFrontend) {
    Copy-Item $envBackupFrontend (Join-Path $ProjectDir ".env") -Force
    Write-Info "Root/.frontend .env geri yüklendi"
  }
}

Write-Host "\nTamamlandı. Özet:" -ForegroundColor Green
Write-Host "- DB yedeği: $backupFile"
Write-Host "- Proje dizini: $ProjectDir"
if (-not $SkipBackend) { Write-Host "- Backend kuruldu: task-tracker-api (DB türü: $dbMode)" }
if (-not $SkipFrontend) { Write-Host "- Frontend bağımlılıkları kuruldu" }
