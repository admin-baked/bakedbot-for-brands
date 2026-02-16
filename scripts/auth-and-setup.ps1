# PowerShell script to authenticate and setup delivery zones
# Run this after installing Python

Write-Host "Authenticating with Google Cloud..." -ForegroundColor Cyan
gcloud auth application-default login

if ($LASTEXITCODE -eq 0) {
    Write-Host "Authentication successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Running Thrive delivery setup..." -ForegroundColor Cyan
    npx tsx scripts/setup-thrive-delivery-simple.ts
} else {
    Write-Host "Authentication failed. Please install Python first." -ForegroundColor Red
    Write-Host "   Download from: https://www.python.org/downloads/" -ForegroundColor Yellow
    Write-Host "   Make sure to check Add Python to PATH during installation" -ForegroundColor Yellow
}
