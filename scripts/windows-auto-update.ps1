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
    if (Test-Path $apiPath) {
        Write-Log "Updating backend API..."
        
        # Composer install
        try {
            Invoke-ExternalCommand -Command "composer" -Arguments @("install", "--no-interaction", "--prefer-dist", "--no-dev") -WorkingDirectory $apiPath -StepName "composer install"
            Write-Log "composer install completed."
        }
        catch {
            Write-Log "WARNING: composer install failed: $($_.Exception.Message)"
            Write-Log "Attempting to continue..."
        }

        # Artisan migrate
        try {
            Invoke-ExternalCommand -Command "php" -Arguments @("artisan", "migrate", "--force") -WorkingDirectory $apiPath -StepName "php artisan migrate"
            Write-Log "Database migrations completed."
        }
        catch {
            Write-Log "WARNING: artisan migrate failed: $($_.Exception.Message)"
            Write-Log "Attempting to continue..."
        }
    }
    else {
        Write-Log "API path '$apiPath' not found. Skipping backend updates."
    }

    Write-Log "----- Auto update finished successfully -----"
    Write-Log "Application is ready. Please restart the Electron app if it's running."
    exit 0
}
catch {
    Write-Log "ERROR: Auto update failed: $($_.Exception.Message)"
    Write-Log "Stack trace: $($_.ScriptStackTrace)"
    exit 5
}
