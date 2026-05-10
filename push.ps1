param(
    [string]$Message = ""
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AgentForge DevOS - Git Push Helper" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

try {
    $status = git status --porcelain
    if ($status) {
        Write-Host "[1/3] Staging all changes..." -ForegroundColor Yellow
        git add -A
        Write-Host "  Done." -ForegroundColor Green
    } else {
        Write-Host "[1/3] No new changes to stage." -ForegroundColor DarkGray
    }

    Write-Host ""
    Write-Host "[2/3] Committing..." -ForegroundColor Yellow
    if (-not $Message) {
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
        $changedFiles = git diff --cached --name-only 2>$null
        $fileCount = ($changedFiles | Measure-Object).Count
        $Message = "update: auto-commit ($fileCount files) at $timestamp"
    }
    git commit -m $Message 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Committed: $Message" -ForegroundColor Green
    } else {
        Write-Host "  Nothing new to commit." -ForegroundColor DarkGray
    }

    Write-Host ""
    Write-Host "[3/3] Pushing to origin/main..." -ForegroundColor Yellow
    git push origin main -v
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "  Push Successful!" -ForegroundColor Green
        Write-Host "  https://github.com/a-hi1/AgentForge-Blog" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
    } else {
        Write-Host "  Push failed!" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
}
