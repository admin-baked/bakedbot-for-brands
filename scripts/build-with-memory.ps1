# Build with Maximum Memory Allocation
# This script allocates 16GB to Node.js and retries the build up to 3 times

param(
    [int]$MaxRetries = 3,
    [int]$MemoryMB = 16384  # 16GB default
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " BakedBot Build with Extended Memory" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Memory allocation: $MemoryMB MB" -ForegroundColor Yellow
Write-Host "Max retries: $MaxRetries" -ForegroundColor Yellow
Write-Host ""

# Set environment variable for Node.js memory
$env:NODE_OPTIONS = "--max-old-space-size=$MemoryMB"

# Clean .next cache before build
Write-Host "[1/4] Cleaning .next cache..." -ForegroundColor Magenta
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next" -ErrorAction SilentlyContinue
    Write-Host "  Cache cleared." -ForegroundColor Green
} else {
    Write-Host "  No cache to clear." -ForegroundColor Gray
}

# Run build:embed first
Write-Host "[2/4] Running build:embed (tsup)..." -ForegroundColor Magenta
npm run build:embed
if ($LASTEXITCODE -ne 0) {
    Write-Host "  build:embed failed!" -ForegroundColor Red
    exit 1
}
Write-Host "  build:embed succeeded." -ForegroundColor Green

# Run check:structure
Write-Host "[3/4] Running check:structure..." -ForegroundColor Magenta
npm run check:structure
if ($LASTEXITCODE -ne 0) {
    Write-Host "  check:structure failed!" -ForegroundColor Red
    exit 1
}
Write-Host "  check:structure succeeded." -ForegroundColor Green

# Retry loop for next build
Write-Host "[4/4] Running next build (with retries)..." -ForegroundColor Magenta

$attempt = 0
$success = $false

while ($attempt -lt $MaxRetries -and -not $success) {
    $attempt++
    Write-Host ""
    Write-Host "  Attempt $attempt of $MaxRetries..." -ForegroundColor Yellow
    
    # Run next build
    npx next build
    
    if ($LASTEXITCODE -eq 0) {
        $success = $true
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host " BUILD SUCCEEDED on attempt $attempt!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
    } else {
        Write-Host "  Attempt $attempt failed." -ForegroundColor Red
        
        if ($attempt -lt $MaxRetries) {
            Write-Host "  Waiting 5 seconds before retry..." -ForegroundColor Yellow
            Start-Sleep -Seconds 5
            
            # Clear cache between attempts
            if (Test-Path ".next") {
                Remove-Item -Recurse -Force ".next" -ErrorAction SilentlyContinue
                Write-Host "  Cache cleared for retry." -ForegroundColor Gray
            }
        }
    }
}

if (-not $success) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host " BUILD FAILED after $MaxRetries attempts" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Suggestions:" -ForegroundColor Yellow
    Write-Host "  1. Close other applications to free memory" -ForegroundColor White
    Write-Host "  2. Temporarily disable antivirus" -ForegroundColor White
    Write-Host "  3. Try deploying via CI/CD instead" -ForegroundColor White
    Write-Host "  4. Check for Next.js/Turbopack updates" -ForegroundColor White
    exit 1
}

exit 0
