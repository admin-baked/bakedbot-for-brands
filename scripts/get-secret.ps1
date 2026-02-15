# Get CRON_SECRET from Firebase
param()

Write-Host "Retrieving CRON_SECRET from Firebase..." -ForegroundColor Yellow
Write-Host ""

$secret = gcloud secrets versions access latest --secret=CRON_SECRET --project=studio-567050101-bc6e8 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to retrieve secret" -ForegroundColor Red
    Write-Host $secret
    exit 1
}

Write-Host "SUCCESS!" -ForegroundColor Green
Write-Host ""
Write-Host "Secret: $secret"
Write-Host ""
Write-Host "Copy this secret and use it with verify-secret.ps1"
Write-Host ""
