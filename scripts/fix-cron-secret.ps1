# Fix CRON_SECRET in Google Cloud Secret Manager
# This script adds a new version with the Cloud Scheduler's actual value

$PROJECT_ID = "studio-567050101-bc6e8"
$SECRET_NAME = "CRON_SECRET"
$SECRET_VALUE = "PcyrL/jzXMOniVVu15gPBQH+LPQDCTfK4yaOr0zUxhY="

Write-Host "Fixing CRON_SECRET in Secret Manager..." -ForegroundColor Cyan
Write-Host ""

# Check if gcloud is installed
try {
    $gcloudVersion = gcloud version 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: gcloud CLI not found. Please install it first:" -ForegroundColor Red
        Write-Host "   https://cloud.google.com/sdk/docs/install" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "ERROR: gcloud CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "   https://cloud.google.com/sdk/docs/install" -ForegroundColor Yellow
    exit 1
}

Write-Host "OK: gcloud CLI found" -ForegroundColor Green
Write-Host ""

# Set active project
Write-Host "Setting active project to $PROJECT_ID..." -ForegroundColor Cyan
gcloud config set project $PROJECT_ID
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to set project" -ForegroundColor Red
    exit 1
}
Write-Host ""

# List existing versions
Write-Host "Current CRON_SECRET versions:" -ForegroundColor Cyan
gcloud secrets versions list $SECRET_NAME --limit=5
Write-Host ""

# Add new version with Cloud Scheduler's value
Write-Host "Adding new version with Cloud Scheduler's value..." -ForegroundColor Cyan
Write-Host "   Value: $SECRET_VALUE" -ForegroundColor Gray

# Create temp file with secret value
$tempFile = [System.IO.Path]::GetTempFileName()
Set-Content -Path $tempFile -Value $SECRET_VALUE -NoNewline

try {
    # Add new version using temp file
    gcloud secrets versions add $SECRET_NAME --data-file=$tempFile

    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to add new secret version" -ForegroundColor Red
        Remove-Item $tempFile
        exit 1
    }

    Write-Host "OK: New version added successfully" -ForegroundColor Green
    Write-Host ""
} finally {
    # Clean up temp file
    Remove-Item $tempFile -ErrorAction SilentlyContinue
}

# Get the new version number
Write-Host "Getting latest version number..." -ForegroundColor Cyan
$latestVersion = gcloud secrets versions list $SECRET_NAME --limit=1 --format="value(name)"
Write-Host "   Latest version: $latestVersion" -ForegroundColor Green
Write-Host ""

# Verify the value
Write-Host "Verifying new version..." -ForegroundColor Cyan
$storedValue = gcloud secrets versions access latest --secret=$SECRET_NAME
if ($storedValue -eq $SECRET_VALUE) {
    Write-Host "OK: Verification passed - value matches Cloud Scheduler" -ForegroundColor Green
} else {
    Write-Host "WARNING: Stored value doesn't match expected value" -ForegroundColor Yellow
    Write-Host "   Expected: $SECRET_VALUE" -ForegroundColor Gray
    Write-Host "   Got:      $storedValue" -ForegroundColor Gray
}
Write-Host ""

# Show next steps
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "Next Steps:" -ForegroundColor Green
Write-Host ""
Write-Host "1. Update apphosting.yaml to use the new version:" -ForegroundColor White
Write-Host "   Change line 234-237 from hardcoded value to:" -ForegroundColor Gray
Write-Host ""
Write-Host "   - variable: CRON_SECRET" -ForegroundColor Yellow
Write-Host "     secret: CRON_SECRET@$latestVersion" -ForegroundColor Yellow
Write-Host "     availability:" -ForegroundColor Yellow
Write-Host "       - RUNTIME" -ForegroundColor Yellow
Write-Host ""
Write-Host "2. Commit and push:" -ForegroundColor White
Write-Host "   git add apphosting.yaml" -ForegroundColor Gray
Write-Host "   git commit -m 'fix: Move CRON_SECRET back to Secret Manager'" -ForegroundColor Gray
Write-Host "   git push origin main" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Wait for Firebase App Hosting to deploy (5-10 minutes)" -ForegroundColor White
Write-Host ""
Write-Host "4. Test with manual trigger" -ForegroundColor White
Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
