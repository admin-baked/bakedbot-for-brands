# Deploy Heartbeat Cron Job to Google Cloud Scheduler
# Run this script after authenticating with: gcloud auth login

$ErrorActionPreference = "Stop"

$PROJECT_ID = "bakedbot-prod"
$REGION = "us-central1"
$SERVICE_URL = "https://bakedbot.ai/api/cron/heartbeat"
$SCHEDULE = "*/5 * * * *"  # Every 5 minutes
$JOB_NAME = "heartbeat-cron"

Write-Host "🚀 Deploying Heartbeat Cron Job..." -ForegroundColor Cyan
Write-Host "Project: $PROJECT_ID"
Write-Host "Region: $REGION"
Write-Host "Schedule: Every 5 minutes"
Write-Host ""

# Check if job already exists
$jobExists = $false
try {
    gcloud scheduler jobs describe $JOB_NAME --location=$REGION --project=$PROJECT_ID 2>$null
    $jobExists = $true
} catch {
    $jobExists = $false
}

if ($jobExists) {
    Write-Host "⚠️  Job '$JOB_NAME' already exists. Updating..." -ForegroundColor Yellow

    gcloud scheduler jobs update http $JOB_NAME `
        --location=$REGION `
        --project=$PROJECT_ID `
        --schedule="$SCHEDULE" `
        --uri="$SERVICE_URL" `
        --http-method=POST `
        --headers="Content-Type=application/json" `
        --message-body='{\"source\":\"cloud-scheduler\"}' `
        --time-zone="America/New_York" `
        --attempt-deadline="540s" `
        --max-retry-attempts=3 `
        --max-backoff="3600s" `
        --min-backoff="5s"

    Write-Host "✅ Heartbeat cron job updated successfully!" -ForegroundColor Green
} else {
    Write-Host "📝 Creating new job '$JOB_NAME'..." -ForegroundColor Cyan

    gcloud scheduler jobs create http $JOB_NAME `
        --location=$REGION `
        --project=$PROJECT_ID `
        --schedule="$SCHEDULE" `
        --uri="$SERVICE_URL" `
        --http-method=POST `
        --headers="Content-Type=application/json" `
        --message-body='{\"source\":\"cloud-scheduler\"}' `
        --time-zone="America/New_York" `
        --attempt-deadline="540s" `
        --max-retry-attempts=3 `
        --max-backoff="3600s" `
        --min-backoff="5s"

    Write-Host "✅ Heartbeat cron job created successfully!" -ForegroundColor Green
}

Write-Host ""
Write-Host "📊 Job Details:" -ForegroundColor Cyan
gcloud scheduler jobs describe $JOB_NAME --location=$REGION --project=$PROJECT_ID

Write-Host ""
Write-Host "🧪 Testing with manual trigger..." -ForegroundColor Cyan
gcloud scheduler jobs run $JOB_NAME --location=$REGION --project=$PROJECT_ID

Write-Host ""
Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Monitor executions:"
Write-Host "  gcloud scheduler jobs describe $JOB_NAME --location=$REGION --project=$PROJECT_ID"
Write-Host ""
Write-Host "View logs:"
Write-Host "  gcloud scheduler jobs logs read $JOB_NAME --location=$REGION --project=$PROJECT_ID --limit=50"
