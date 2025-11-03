param(
    [string]$RepoPath = "C:\wamp64\www\task-tracker-desktop",
    [string]$RemoteName = "origin",
    [string]$BranchName = "main",
    [switch]$Force = $true  # Varsayılan olarak force enabled
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $RepoPath)) {
    Write-Error "Repository path '$RepoPath' does not exist."
    exit 1
}

$logDirectory = Join-Path $RepoPath "logs"
$logFile = Join-Path $logDirectory "auto-update.log"

if (-not (Test-Path $logDirectory)) {
    New-Item -ItemType Directory -Path $logDirectory | Out-Null
}

function Write-Log {
    param([string]$Message)
    $timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    $entry = "[$timestamp] $Message"
    $entry | Out-File -FilePath $logFile -Encoding utf8 -Append
    Write-Host $entry
}

function Stop-ApplicationProcesses {
    Write-Log "Stopping application processes..."
    
    # Bu script'in process ID'sini al (kendini kapatmamak için)
    $currentProcessId = $PID
    
    # Kapatılacak process isimleri
    $processNames = @("node", "php", "electron", "vite", "concurrently")
    
    foreach ($processName in $processNames) {
        try {
            $processes = Get-Process -Name $processName -ErrorAction SilentlyContinue
            foreach ($process in $processes) {
                # Kendi process'imizi atla
                if ($process.Id -ne $currentProcessId) {
                    Write-Log "Stopping process: $($process.Name) (PID: $($process.Id))"
                    try {
                        Stop-Process -Id $process.Id -Force -ErrorAction Stop
                        Write-Log "Successfully stopped $($process.Name) (PID: $($process.Id))"
                        Start-Sleep -Milliseconds 500
                    }
                    catch {
                        Write-Log "WARNING: Could not stop $($process.Name) (PID: $($process.Id)): $($_.Exception.Message)"
                    }
                }
            }
        }
        catch {
            Write-Log "WARNING: Could not find processes named '$processName': $($_.Exception.Message)"
        }
    }
    
    # PowerShell ve CMD pencerelerini kapat (bu script'in penceresi hariç)
    # Sadece bu repo dizininde çalışan pencereleri kapatmaya çalış
    Write-Log "Checking PowerShell and CMD windows in repository directory..."
    try {
        # Get-CimInstance ile process'lerin command line'ını kontrol edebiliriz
        $powerShellProcesses = Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe' OR Name = 'pwsh.exe'" -ErrorAction SilentlyContinue | Where-Object { $_.ProcessId -ne $currentProcessId }
        $cmdProcesses = Get-CimInstance Win32_Process -Filter "Name = 'cmd.exe'" -ErrorAction SilentlyContinue
        
        foreach ($proc in ($powerShellProcesses + $cmdProcesses)) {
            $commandLine = $proc.CommandLine
            $processId = $proc.ProcessId
            
            # Eğer command line'da repo path'i varsa veya netstat'ta port kullanıyorsa kapat
            if ($commandLine -and ($commandLine -like "*$RepoPath*" -or $commandLine -like "*start:network*" -or $commandLine -like "*api:serve*" -or $commandLine -like "*vite*")) {
                Write-Log "Stopping related process: $($proc.Name) (PID: $processId, Command: $commandLine)"
                try {
                    Stop-Process -Id $processId -Force -ErrorAction Stop
                    Write-Log "Successfully stopped $($proc.Name) (PID: $processId)"
                    Start-Sleep -Milliseconds 500
                }
                catch {
                    Write-Log "WARNING: Could not stop $($proc.Name) (PID: $processId): $($_.Exception.Message)"
                }
            }
        }
    }
    catch {
        Write-Log "WARNING: Could not check PowerShell/CMD windows: $($_.Exception.Message)"
        # Fallback: Sadece bu script'in parent process'ini kontrol et
        try {
            $parentProcess = (Get-CimInstance Win32_Process -Filter "ProcessId = $currentProcessId" -ErrorAction SilentlyContinue).ParentProcessId
            if ($parentProcess) {
                $parent = Get-Process -Id $parentProcess -ErrorAction SilentlyContinue
                if ($parent -and ($parent.Name -eq "powershell" -or $parent.Name -eq "cmd")) {
                    Write-Log "Parent process is PowerShell/CMD, skipping closure to avoid closing this script's window."
                }
            }
        }
        catch {
            Write-Log "WARNING: Could not check parent process: $($_.Exception.Message)"
        }
    }
    
    # Port'ları kullanan process'leri de kontrol et (5173, 8000)
    Write-Log "Checking ports 5173 and 8000..."
    try {
        $netstatOutput = netstat -ano | Select-String ":(5173|8000)"
        foreach ($line in $netstatOutput) {
            if ($line -match '\s+(\d+)$') {
                $portProcessId = [int]$matches[1]
                if ($portProcessId -ne $currentProcessId -and $portProcessId -ne 0) {
                    try {
                        $proc = Get-Process -Id $portProcessId -ErrorAction SilentlyContinue
                        if ($proc) {
                            Write-Log "Stopping process using port (PID: $portProcessId, Name: $($proc.Name))"
                            Stop-Process -Id $portProcessId -Force -ErrorAction Stop
                            Start-Sleep -Milliseconds 500
                        }
                    }
                    catch {
                        Write-Log "WARNING: Could not stop process with PID ${portProcessId}: $($_.Exception.Message)"
                    }
                }
            }
        }
    }
    catch {
        Write-Log "WARNING: Could not check ports: $($_.Exception.Message)"
    }
    
    # Biraz bekle ki process'ler tamamen kapansın
    Start-Sleep -Seconds 2
    
    Write-Log "Process cleanup completed."
}

function Invoke-GitCommand {
    param(
        [string[]]$Arguments,
        [string]$WorkingDirectory = $RepoPath,
        [switch]$AllowFailure = $false
    )
    
    Push-Location $WorkingDirectory
    try {
        $output = & git $Arguments 2>&1
        if ($LASTEXITCODE -ne 0 -and -not $AllowFailure) {
            throw "Git command 'git $($Arguments -join ' ')' failed with exit code $LASTEXITCODE. Output: $output"
        }
        return $output
    }
    finally {
        Pop-Location
    }
}

function Invoke-ExternalCommand {
    param(
        [string]$Command,
        [string[]]$Arguments = @(),
        [string]$WorkingDirectory = $RepoPath,
        [string]$StepName = $Command
    )

    Write-Log "Starting step: $StepName"
    Push-Location $WorkingDirectory
    try {
        $output = & $Command $Arguments 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "$StepName exited with code $LASTEXITCODE. Output: $output"
        }
        Write-Log "Completed step: $StepName"
        return $output
    }
    catch {
        Write-Log "Error in $StepName`: $($_.Exception.Message)"
        throw
    }
    finally {
        Pop-Location
    }
}

try {
    Set-Location $RepoPath

    Write-Log "----- Auto update started -----"
    Write-Log "Force mode: $Force"

    # Uygulama process'lerini kapat (güncelleme öncesi)
    Stop-ApplicationProcesses

    # Git kontrolü
    $gitExists = Get-Command git -ErrorAction SilentlyContinue
    if (-not $gitExists) {
        Write-Log "ERROR: Git is not installed or not in PATH."
        exit 2
    }

    # Mevcut durumu kontrol et
    Write-Log "Checking current repository status..."
    $currentBranch = Invoke-GitCommand -Arguments @("rev-parse", "--abbrev-ref", "HEAD")
    Write-Log "Current branch: $currentBranch"

    # Remote'u kontrol et ve fetch yap
    Write-Log "Fetching latest changes from $RemoteName/$BranchName..."
    try {
        Invoke-GitCommand -Arguments @("fetch", $RemoteName, $BranchName)
        Write-Log "Fetched successfully."
    }
    catch {
        Write-Log "WARNING: Fetch failed. Trying to continue anyway: $($_.Exception.Message)"
        # Remote yoksa veya bağlantı sorunu varsa, reset --hard yapabiliriz
        if ($Force) {
            Write-Log "Force mode enabled. Attempting to reset to remote state..."
        }
    }

    # Local changes kontrolü ve işleme
    $localChanges = Invoke-GitCommand -Arguments @("status", "--porcelain") -AllowFailure
    if ($localChanges -and $Force) {
        Write-Log "Local changes detected. Force mode enabled - stashing/resetting local changes..."
        try {
            # Önce stash yapmaya çalış
            Invoke-GitCommand -Arguments @("stash", "push", "-m", "Auto-update stash $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')")
            Write-Log "Local changes stashed successfully."
        }
        catch {
            Write-Log "Stash failed. Attempting hard reset..."
            # Stash başarısız olursa hard reset yap
            Invoke-GitCommand -Arguments @("reset", "--hard", "$RemoteName/$BranchName")
            Write-Log "Hard reset completed."
        }
    }
    elseif ($localChanges -and -not $Force) {
        Write-Log "WARNING: Local changes detected but Force mode is disabled."
        Write-Log "Local changes: $localChanges"
    }

    # Remote ile local'i karşılaştır
    Write-Log "Comparing local and remote branches..."
    try {
        $remoteAhead = Invoke-GitCommand -Arguments @("rev-list", "HEAD..$RemoteName/$BranchName", "--count")
        $remoteAhead = [int]$remoteAhead.Trim()
        
        if ($remoteAhead -eq 0) {
            Write-Log "Already up to date. No new commits."
        }
        else {
            Write-Log "Remote has $remoteAhead new commit(s). Updating..."
            
            # Pull yerine reset --hard kullan (force mode için daha güvenilir)
            if ($Force) {
                Write-Log "Force mode: Resetting to $RemoteName/$BranchName..."
                Invoke-GitCommand -Arguments @("reset", "--hard", "$RemoteName/$BranchName")
                Write-Log "Reset completed successfully."
            }
            else {
                Write-Log "Pulling changes..."
                Invoke-GitCommand -Arguments @("pull", $RemoteName, $BranchName)
                Write-Log "Pull completed successfully."
            }
        }
    }
    catch {
        Write-Log "WARNING: Could not compare branches. Attempting force reset..."
        if ($Force) {
            Invoke-GitCommand -Arguments @("reset", "--hard", "$RemoteName/$BranchName")
            Write-Log "Force reset completed."
        }
        else {
            throw "Could not update repository: $($_.Exception.Message)"
        }
    }

    # Clean up (untracked files'ı temizle, force mode'da)
    if ($Force) {
        Write-Log "Cleaning untracked files and directories..."
        try {
            Invoke-GitCommand -Arguments @("clean", "-fd")
            Write-Log "Clean completed."
        }
        catch {
            Write-Log "WARNING: Clean failed: $($_.Exception.Message)"
        }
    }

    # Yeni commit hash'ini logla
    $newHash = Invoke-GitCommand -Arguments @("rev-parse", "HEAD")
    Write-Log "Current commit hash: $newHash"

    # npm install
    Write-Log "Installing npm dependencies..."
    try {
        Invoke-ExternalCommand -Command "npm.cmd" -Arguments @("install", "--no-audit", "--prefer-offline") -StepName "npm install"
        Write-Log "npm install completed successfully."
    }
    catch {
        Write-Log "ERROR: npm install failed: $($_.Exception.Message)"
        Write-Log "Attempting to continue with build anyway..."
    }

    # Build UI (vite build)
    Write-Log "Building UI with vite..."
    try {
        Invoke-ExternalCommand -Command "npm.cmd" -Arguments @("run", "build:ui") -StepName "vite build"
        Write-Log "UI build completed successfully."
    }
    catch {
        Write-Log "ERROR: vite build failed: $($_.Exception.Message)"
        throw
    }

    # Backend (Laravel API) güncelleme
    $apiPath = Join-Path $RepoPath "task-tracker-api"
    Write-Log "Checking API path: $apiPath"
    if (Test-Path $apiPath) {
        Write-Log "API path exists. Updating backend API..."
        
        # Composer install
        Write-Log "Running composer install in task-tracker-api directory..."
        try {
            Push-Location $apiPath
            try {
                Write-Log "Current directory: $(Get-Location)"
                $composerOutput = & composer install --no-interaction --prefer-dist --no-dev 2>&1
                if ($LASTEXITCODE -ne 0) {
                    throw "composer install exited with code $LASTEXITCODE. Output: $composerOutput"
                }
                Write-Log "composer install completed successfully."
                Write-Log "Composer output: $composerOutput"
            }
            finally {
                Pop-Location
            }
        }
        catch {
            Write-Log "ERROR: composer install failed: $($_.Exception.Message)"
            Write-Log "Stack trace: $($_.ScriptStackTrace)"
            Write-Log "Attempting to continue with migrations..."
        }

        # Artisan migrate
        Write-Log "Running php artisan migrate in task-tracker-api directory..."
        try {
            Push-Location $apiPath
            try {
                Write-Log "Current directory: $(Get-Location)"
                $migrateOutput = & php artisan migrate --force 2>&1
                if ($LASTEXITCODE -ne 0) {
                    throw "php artisan migrate exited with code $LASTEXITCODE. Output: $migrateOutput"
                }
                Write-Log "Database migrations completed successfully."
                Write-Log "Migration output: $migrateOutput"
            }
            finally {
                Pop-Location
            }
        }
        catch {
            Write-Log "ERROR: artisan migrate failed: $($_.Exception.Message)"
            Write-Log "Stack trace: $($_.ScriptStackTrace)"
            Write-Log "Attempting to continue..."
        }
    }
    else {
        Write-Log "WARNING: API path '$apiPath' does not exist. Skipping backend updates."
    }

    Write-Log "----- Auto update finished successfully -----"
    
    # Uygulamayı otomatik başlat
    Write-Log "Starting application with 'npm run start:network:restart'..."
    try {
        $startScript = @"
cd `"$RepoPath`"
npm run start:network:restart
"@
        
        # Yeni bir PowerShell penceresinde başlat (konsol penceresi görünür olsun)
        $psStartInfo = New-Object System.Diagnostics.ProcessStartInfo
        $psStartInfo.FileName = "powershell.exe"
        $psStartInfo.Arguments = "-NoExit -ExecutionPolicy Bypass -Command $startScript"
        $psStartInfo.WorkingDirectory = $RepoPath
        $psStartInfo.UseShellExecute = $true
        $psStartInfo.CreateNoWindow = $false
        
        $process = [System.Diagnostics.Process]::Start($psStartInfo)
        Write-Log "Application started in new PowerShell window (PID: $($process.Id))"
        Write-Log "Application is ready and running."
    }
    catch {
        Write-Log "ERROR: Could not start application: $($_.Exception.Message)"
        Write-Log "Please manually run: npm run start:network:restart"
        Write-Log "Stack trace: $($_.ScriptStackTrace)"
    }
    
    exit 0
}
catch {
    Write-Log "ERROR: Auto update failed: $($_.Exception.Message)"
    Write-Log "Stack trace: $($_.ScriptStackTrace)"
    
    # Hata olsa bile uygulamayı başlatmayı dene
    Write-Log "Attempting to start application despite errors..."
    try {
        $startScript = @"
cd `"$RepoPath`"
npm run start:network:restart
"@
        $psStartInfo = New-Object System.Diagnostics.ProcessStartInfo
        $psStartInfo.FileName = "powershell.exe"
        $psStartInfo.Arguments = "-NoExit -ExecutionPolicy Bypass -Command $startScript"
        $psStartInfo.WorkingDirectory = $RepoPath
        $psStartInfo.UseShellExecute = $true
        $psStartInfo.CreateNoWindow = $false
        $process = [System.Diagnostics.Process]::Start($psStartInfo)
        Write-Log "Application started in new PowerShell window (PID: $($process.Id))"
    }
    catch {
        Write-Log "ERROR: Could not start application: $($_.Exception.Message)"
    }
    
    exit 5
}
