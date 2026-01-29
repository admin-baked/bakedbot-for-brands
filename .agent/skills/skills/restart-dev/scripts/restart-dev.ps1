# Restart Dev Server Script
# Safely kills running dev processes and restarts npm run dev

param(
    [int]$Port = 3000
)

Write-Host "[*] Restarting dev server..." -ForegroundColor Cyan

# Step 1: Kill process on port 3000
Write-Host "    Checking for processes on port $Port..." -ForegroundColor Yellow
try {
    $process = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -First 1

    if ($process) {
        Stop-Process -Id $process -Force -ErrorAction SilentlyContinue
        Write-Host "    [+] Killed process on port $Port" -ForegroundColor Green
    } else {
        Write-Host "    [i] No process found on port $Port" -ForegroundColor Gray
    }
} catch {
    Write-Host "    [i] Port check skipped" -ForegroundColor Gray
}

# Step 2: Kill any remaining next dev processes
Write-Host "    Checking for Next.js processes..." -ForegroundColor Yellow
try {
    $nextProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -like "*next dev*" }

    if ($nextProcesses) {
        $nextProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
        Write-Host "    [+] Killed Next.js dev processes" -ForegroundColor Green
    } else {
        Write-Host "    [i] No Next.js processes found" -ForegroundColor Gray
    }
} catch {
    Write-Host "    [i] Process check skipped" -ForegroundColor Gray
}

# Step 3: Wait for clean shutdown
Write-Host "    Waiting for clean shutdown..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

# Step 4: Start new dev server
Write-Host "    Starting npm run dev..." -ForegroundColor Yellow
$logFile = ".next/dev-server.log"

# Ensure .next directory exists
if (-not (Test-Path ".next")) {
    New-Item -ItemType Directory -Path ".next" -Force | Out-Null
}

# Start dev server in background, redirecting output to log
$job = Start-Job -ScriptBlock {
    param($workDir)
    Set-Location $workDir
    npm run dev 2>&1 | Out-File -FilePath ".next/dev-server.log" -Append
} -ArgumentList (Get-Location).Path

Write-Host "    [+] Dev server started in background (Job ID: $($job.Id))" -ForegroundColor Green
Write-Host ""
Write-Host "[*] Server status:" -ForegroundColor Cyan
Write-Host "    - Check logs: Get-Content $logFile -Tail 20 -Wait" -ForegroundColor Gray
Write-Host "    - View jobs: Get-Job" -ForegroundColor Gray
Write-Host "    - Stop server: Stop-Job -Id $($job.Id); Remove-Job -Id $($job.Id)" -ForegroundColor Gray
Write-Host ""
Write-Host "[+] Restart complete! Waiting for server to initialize..." -ForegroundColor Green
Write-Host ""

# Tail logs for a few seconds to confirm startup
Start-Sleep -Seconds 3
if (Test-Path $logFile) {
    Write-Host "[*] Recent logs:" -ForegroundColor Cyan
    Get-Content $logFile -Tail 10
}
