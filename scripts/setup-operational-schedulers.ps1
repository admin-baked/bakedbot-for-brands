# Setup Cloud Scheduler Jobs for Operational Playbooks (PowerShell)
#
# Prerequisites:
# 1. gcloud CLI installed and authenticated
# 2. Run from PowerShell (not bash)
#
# Usage:
#   .\scripts\setup-operational-schedulers.ps1

$ErrorActionPreference = "Stop"

# Configuration
$PROJECT_ID = "studio-567050101-bc6e8"
$REGION = "us-central1"
$BASE_URL = "https://bakedbot.ai/api/cron/playbook-runner"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Setting up Operational Playbook Schedulers" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Project: $PROJECT_ID"
Write-Host "Region: $REGION"
Write-Host "Base URL: $BASE_URL"
Write-Host ""

# Get CRON_SECRET from Secret Manager
Write-Host "Fetching CRON_SECRET from Secret Manager..." -ForegroundColor Yellow
$CRON_SECRET = gcloud secrets versions access latest --secret=CRON_SECRET 2>$null
if (-not $CRON_SECRET) {
    Write-Host "ERROR: Failed to fetch CRON_SECRET" -ForegroundColor Red
    Write-Host "Run: gcloud auth application-default login" -ForegroundColor Yellow
    exit 1
}
Write-Host "CRON_SECRET retrieved" -ForegroundColor Green
Write-Host ""

# Function to create or update scheduler job
function Create-Or-Update-Job {
    param(
        [string]$JobName,
        [string]$Schedule,
        [string]$PlaybookId,
        [string]$Description
    )

    Write-Host "Setting up: $JobName" -ForegroundColor Cyan
    Write-Host "   Schedule: $Schedule"
    Write-Host "   Playbook: $PlaybookId"

    # Check if job exists (suppress errors)
    $jobExists = $null
    try {
        $jobExists = gcloud scheduler jobs describe $JobName --location=$REGION --project=$PROJECT_ID 2>&1
    } catch {
        # Job doesn't exist, will create new
    }

    if ($jobExists -and $jobExists -notmatch "ERROR") {
        Write-Host "   Status: Updating existing job..." -ForegroundColor Yellow
        gcloud scheduler jobs update http $JobName --location=$REGION --project=$PROJECT_ID --schedule="$Schedule" --uri="${BASE_URL}?playbookId=${PlaybookId}" --http-method=POST --headers="Authorization=Bearer $CRON_SECRET" --description="$Description" --quiet 2>&1 | Out-Null
    } else {
        Write-Host "   Status: Creating new job..." -ForegroundColor Yellow
        gcloud scheduler jobs create http $JobName --location=$REGION --project=$PROJECT_ID --schedule="$Schedule" --uri="${BASE_URL}?playbookId=${PlaybookId}" --http-method=POST --headers="Authorization=Bearer $CRON_SECRET" --description="$Description" --quiet 2>&1 | Out-Null
    }

    Write-Host "   Done" -ForegroundColor Green
    Write-Host ""
}

# Create scheduler jobs
Write-Host "Creating Cloud Scheduler jobs..." -ForegroundColor Cyan
Write-Host ""

# 1. Daily System Health Check (Mon-Fri 9:00 AM EST = 14:00 UTC)
Create-Or-Update-Job -JobName "ops-daily-health-check" -Schedule "0 14 * * 1-5" -PlaybookId "ops_daily_health_check" -Description "Daily system health monitoring (Mon-Fri 9:00 AM EST)"

# 2. Weekly Growth Review (Monday 8:00 AM EST = 13:00 UTC)
Create-Or-Update-Job -JobName "ops-weekly-growth-review" -Schedule "0 13 * * 1" -PlaybookId "ops_weekly_growth_review" -Description "Weekly growth analytics and insights (Monday 8:00 AM EST)"

# 3. Integration Health Monitor (Every hour)
Create-Or-Update-Job -JobName "ops-integration-monitor" -Schedule "0 * * * *" -PlaybookId "ops_integration_monitor" -Description "Hourly integration health monitoring"

# 4. Customer Churn Prevention (Daily 10:00 AM EST = 15:00 UTC)
Create-Or-Update-Job -JobName "ops-churn-prevention" -Schedule "0 15 * * *" -PlaybookId "ops_churn_prevention" -Description "Daily inactive customer detection and re-engagement (10:00 AM EST)"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "All scheduler jobs created successfully!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Created/Updated Jobs:" -ForegroundColor Green
Write-Host "  1. ops-daily-health-check (Mon-Fri 9:00 AM EST)"
Write-Host "  2. ops-weekly-growth-review (Monday 8:00 AM EST)"
Write-Host "  3. ops-integration-monitor (Every hour)"
Write-Host "  4. ops-churn-prevention (Daily 10:00 AM EST)"
Write-Host ""
Write-Host "Verify jobs:" -ForegroundColor Yellow
Write-Host "  gcloud scheduler jobs list --location=$REGION --project=$PROJECT_ID"
Write-Host ""
Write-Host "Test a job manually:" -ForegroundColor Yellow
Write-Host "  gcloud scheduler jobs run ops-daily-health-check --location=$REGION --project=$PROJECT_ID"
Write-Host ""
