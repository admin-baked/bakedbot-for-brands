# Setup Cloud Scheduler for Thrive Syracuse Daily Competitive Intelligence
# Run this after setup-thrive-competitive-intel.ts has been executed

$PROJECT = "studio-567050101-bc6e8"
$PLAYBOOK_ID = "c1boBTwmKyPo23Ib1C7o"
$CRON_SECRET = $env:CRON_SECRET

if (-not $CRON_SECRET) {
    Write-Host "ERROR: CRON_SECRET environment variable not set" -ForegroundColor Red
    Write-Host "Get it with: gcloud secrets versions access 6 --secret=CRON_SECRET --project=$PROJECT" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "=== Setting up Thrive Syracuse Daily Competitive Intelligence ===" -ForegroundColor Cyan
Write-Host "Project: $PROJECT" -ForegroundColor Gray
Write-Host "Playbook: $PLAYBOOK_ID" -ForegroundColor Gray
Write-Host "Schedule: Daily at 9 AM EST (14:00 UTC)" -ForegroundColor Gray
Write-Host ""

# Create Cloud Scheduler job
gcloud scheduler jobs create http thrive-competitive-intel `
    --project=$PROJECT `
    --location=us-central1 `
    --schedule="0 14 * * *" `
    --uri="https://bakedbot.ai/api/playbooks/$PLAYBOOK_ID/execute" `
    --http-method=POST `
    --headers="Authorization=Bearer $CRON_SECRET,Content-Type=application/json" `
    --message-body='{\"force\":true}' `
    --time-zone="America/New_York" `
    --description="Daily competitive intelligence report for Thrive Syracuse - tracks 4 local competitors and saves reports to BakedBot Drive"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Success! Cron job created." -ForegroundColor Green
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Yellow
    Write-Host "1. Verify job: gcloud scheduler jobs list --project=$PROJECT" -ForegroundColor White
    Write-Host "2. Test run: gcloud scheduler jobs run thrive-competitive-intel --project=$PROJECT --location=us-central1" -ForegroundColor White
    Write-Host "3. View logs: https://console.cloud.google.com/cloudscheduler?project=$PROJECT" -ForegroundColor White
    Write-Host "4. Reports will be saved to BakedBot Drive daily at 9 AM EST" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "Error creating cron job!" -ForegroundColor Red
    Write-Host "If job already exists, delete it first:" -ForegroundColor Yellow
    Write-Host "gcloud scheduler jobs delete thrive-competitive-intel --project=$PROJECT --location=us-central1" -ForegroundColor White
}
