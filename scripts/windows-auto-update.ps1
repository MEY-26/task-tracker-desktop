param(
    [string]$RepoPath = "C:\wamp64\www\task-tracker-desktop",
    [string]$RemoteName = "origin",
    [string]$BranchName = "main",
    [switch]$Force = $false
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
        $process = Start-Process -FilePath $Command -ArgumentList $Arguments -NoNewWindow -PassThru -Wait -ErrorAction Stop
        if ($process.ExitCode -ne 0) {
            throw "$StepName exited with code $($process.ExitCode)"
        }
        Write-Log "Completed step: $StepName"
    }
    finally {
        Pop-Location
    }
}

try {
    Set-Location $RepoPath

    Write-Log "----- Auto update started -----"

    $gitExists = Get-Command git -ErrorAction SilentlyContinue
    if (-not $gitExists) {
        Write-Log "Git is not installed or not in PATH."
        exit 2
    }

    git fetch $RemoteName $BranchName | Out-Null
    Write-Log "Fetched latest changes from $RemoteName/$BranchName."

    $localChanges = git status --porcelain
    if ($localChanges -and -not $Force) {
        Write-Log "Local changes detected. Aborting update to avoid conflicts."
        exit 3
    }

    $remoteAhead = git rev-list HEAD.."$RemoteName/$BranchName" --count
    if ([int]$remoteAhead -eq 0) {
        Write-Log "Already up to date."
        exit 0
    }

    Write-Log "Remote has $remoteAhead new commit(s). Pulling changes..."

    git pull $RemoteName $BranchName | Out-Null
    Write-Log "Pull completed successfully."

    try {
        Invoke-ExternalCommand -Command "npm.cmd" -Arguments @("install", "--no-audit") -StepName "npm install"
    }
    catch {
        Write-Log "npm install failed: $($_.Exception.Message)"
        throw
    }

    $apiPath = Join-Path $RepoPath "task-tracker-api"
    if (Test-Path $apiPath) {
        try {
            Invoke-ExternalCommand -Command "composer" -Arguments @("install", "--no-interaction", "--prefer-dist") -WorkingDirectory $apiPath -StepName "composer install"
        }
        catch {
            Write-Log "composer install failed: $($_.Exception.Message)"
            throw
        }

        try {
            Invoke-ExternalCommand -Command "php" -Arguments @("artisan", "migrate", "--force") -WorkingDirectory $apiPath -StepName "php artisan migrate"
        }
        catch {
            Write-Log "artisan migrate failed: $($_.Exception.Message)"
            throw
        }
    }
    else {
        Write-Log "API path '$apiPath' not found. Skipping composer/npm steps for backend."
    }

    Write-Log "----- Auto update finished -----"
    exit 0
}
catch {
    Write-Log "Auto update failed: $($_.Exception.Message)"
    exit 5
}
