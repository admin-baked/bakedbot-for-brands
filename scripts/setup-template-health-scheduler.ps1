# Cloud Scheduler Setup for Template Health Checks (PowerShell)
# Windows-compatible version

$PROJECT_ID = "studio-567050101-bc6e8"
$REGION = "us-central1"
$SCHEDULE = "0 9 * * *"
$TIMEZONE = "America/New_York"
$JOB_NAME = "template-health-check"
$ENDPOINT = "https://bakedbot.ai/api/cron/template-health-check"

Write-Host "🔧 Cloud Scheduler Setup for Template Health Checks" -ForegroundColor Cyan
Write-Host ""

# Get CRON_SECRET
Write-Host "📋 Retrieving CRON_SECRET..." -ForegroundColor Yellow
$CRON_SECRET = gcloud secrets versions access latest --secret=CRON_SECRET --project=$PROJECT_ID 2>$null

if (-not $CRON_SECRET) {
    Write-Host "❌ Failed to retrieve CRON_SECRET" -ForegroundColor Red
    exit 1
}

Write-Host "✅ CRON_SECRET retrieved" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Configuration:" -ForegroundColor Cyan
Write-Host "   Job: $JOB_NAME"
Write-Host "   Schedule: $SCHEDULE ($TIMEZONE)"
Write-Host "   Endpoint: $ENDPOINT"
Write-Host ""

# Create message body and headers
$headers = "x-cron-secret:$CRON_SECRET,Content-Type:application/json"
$messageBody = "{}"

Write-Host "⏳ Setting up Cloud Scheduler..." -ForegroundColor Yellow

# Try to update existing job
$existingJob = gcloud scheduler jobs describe $JOB_NAME --location=$REGION --project=$PROJECT_ID 2>&1 | Select-String -Pattern "ERROR" -Quiet

if ($existingJob) {
    Write-Host "Creating new job..." -ForegroundColor Cyan
    & gcloud scheduler jobs create http $JOB_NAME `
        --schedule=$SCHEDULE `
        --timezone=$TIMEZONE `
        --uri=$ENDPOINT `
        --http-method=POST `
        --location=$REGION `
        --headers=$headers `
        --message-body=$messageBody `
        --project=$PROJECT_ID
} else {
    Write-Host "Updating existing job..." -ForegroundColor Cyan
    & gcloud scheduler jobs update http $JOB_NAME `
        --schedule=$SCHEDULE `
        --timezone=$TIMEZONE `
        --uri=$ENDPOINT `
        --http-method=POST `
        --location=$REGION `
        --headers=$headers `
        --message-body=$messageBody `
        --project=$PROJECT_ID
}

Write-Host ""
Write-Host "✅ Cloud Scheduler Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next: Test the job (run immediately)" -ForegroundColor Cyan
Write-Host "   gcloud scheduler jobs run $JOB_NAME --location=$REGION --project=$PROJECT_ID"
Write-Host ""
