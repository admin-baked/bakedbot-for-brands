# Get CRON_SECRET from Firebase Secret Manager
# Requires: gcloud CLI authenticated to bakedbot-prod project

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "🔐 Retrieve CRON_SECRET from Firebase" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check if gcloud is installed
try {
    $null = gcloud --version 2>&1
} catch {
    Write-Host "❌ gcloud CLI not installed" -ForegroundColor Red
    Write-Host ""
    Write-Host "Install gcloud CLI:" -ForegroundColor Yellow
    Write-Host "  https://cloud.google.com/sdk/docs/install" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "✅ gcloud CLI found" -ForegroundColor Green
Write-Host ""

# Check authentication
Write-Host "Checking gcloud authentication..." -ForegroundColor Gray
try {
    $account = gcloud config get-value account 2>&1
    if ([string]::IsNullOrEmpty($account)) {
        throw "Not authenticated"
    }
    Write-Host "✅ Authenticated as: $account" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ Not authenticated to gcloud" -ForegroundColor Red
    Write-Host ""
    Write-Host "Run:" -ForegroundColor Yellow
    Write-Host "  gcloud auth login" -ForegroundColor White
    Write-Host "  gcloud config set project studio-567050101-bc6e8" -ForegroundColor White
    Write-Host ""
    exit 1
}

# Retrieve secret
Write-Host "Retrieving CRON_SECRET from Firebase Secret Manager..." -ForegroundColor Gray
Write-Host ""

try {
    $secret = gcloud secrets versions access latest --secret=CRON_SECRET --project=studio-567050101-bc6e8 2>&1

    if ($LASTEXITCODE -ne 0) {
        throw "Failed to retrieve secret"
    }

    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host "✅ CRON_SECRET Retrieved Successfully" -ForegroundColor Green
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Secret Value:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  $secret" -ForegroundColor White
    Write-Host ""
    Write-Host "Length: $($secret.Length) characters" -ForegroundColor Gray
    Write-Host ""

    # Copy to clipboard
    try {
        Set-Clipboard -Value $secret
        Write-Host "✅ Copied to clipboard!" -ForegroundColor Green
        Write-Host ""
    } catch {
        Write-Host "INFO: Could not copy to clipboard (copy manually above)" -ForegroundColor Yellow
        Write-Host ""
    }

    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host "📋 Next Steps" -ForegroundColor Yellow
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Test this secret with the verification script:" -ForegroundColor White
    Write-Host '   .\verify-cron-secret.ps1 -Secret "' -NoNewline -ForegroundColor Gray
    Write-Host $secret -NoNewline -ForegroundColor White
    Write-Host '"' -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. If verification fails, update GitHub Actions secret:" -ForegroundColor White
    Write-Host "   https://github.com/admin-baked/bakedbot-for-brands/settings/secrets/actions" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. Make sure apphosting.yaml includes CRON_SECRET in env section" -ForegroundColor White
    Write-Host ""

} catch {
    Write-Host "❌ Failed to retrieve secret" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Possible reasons:" -ForegroundColor Yellow
    Write-Host "  1. Secret doesn't exist in project studio-567050101-bc6e8" -ForegroundColor White
    Write-Host "  2. You don't have permission to access secrets" -ForegroundColor White
    Write-Host "  3. Wrong project selected" -ForegroundColor White
    Write-Host ""
    Write-Host "Check secrets in console:" -ForegroundColor Yellow
    Write-Host "  https://console.cloud.google.com/security/secret-manager?project=studio-567050101-bc6e8" -ForegroundColor White
    Write-Host ""
    exit 1
}
