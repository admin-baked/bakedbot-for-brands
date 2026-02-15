# Setup Weekly Nurture Email Cloud Schedulers (PowerShell)
#
# Creates Cloud Scheduler jobs for each user segment's weekly nurture emails.
# Run with: .\scripts\setup-weekly-nurture-schedulers.ps1

$PROJECT_ID = "studio-567050101-bc6e8"
$LOCATION = "us-central1"
$BASE_URL = "https://bakedbot.ai"

# Get CRON_SECRET
Write-Host "🔐 Getting CRON_SECRET from Secret Manager..."
$CRON_SECRET = gcloud secrets versions access latest --secret=CRON_SECRET

if (-not $CRON_SECRET) {
    Write-Host "❌ Failed to get CRON_SECRET. Please check Secret Manager." -ForegroundColor Red
    exit 1
}

Write-Host "🚀 Creating Weekly Nurture Cloud Scheduler Jobs..." -ForegroundColor Green
Write-Host ""

# Function to create scheduler job
function Create-SchedulerJob {
    param(
        [string]$JobName,
        [string]$Schedule,
        [string]$Body,
        [string]$Description,
        [string]$Emoji
    )

    Write-Host "$Emoji Creating $JobName..." -ForegroundColor Cyan

    gcloud scheduler jobs create http $JobName `
        --project=$PROJECT_ID `
        --location=$LOCATION `
        --schedule="$Schedule" `
        --time-zone="America/New_York" `
        --uri="$BASE_URL/api/jobs/weekly-nurture" `
        --http-method=POST `
        --headers="Authorization=Bearer $CRON_SECRET,Content-Type=application/json" `
        --message-body="$Body" `
        --description="$Description" 2>&1 | Out-Null

    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ Created successfully" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Job already exists or failed" -ForegroundColor Yellow
    }
}

# 1. Customer Weekly Nurture (Every Monday 9am EST)
Create-SchedulerJob `
    -JobName "customer-weekly-nurture" `
    -Schedule "0 9 * * 1" `
    -Body '{"segment":"customer","playbookId":"welcome_customer"}' `
    -Description "Weekly nurture emails for customers - deals and education and loyalty" `
    -Emoji "📧"

# 2. Super User Weekly Update (Every Monday 8am EST)
Create-SchedulerJob `
    -JobName "super-user-weekly-update" `
    -Schedule "0 8 * * 1" `
    -Body '{"segment":"super_user","playbookId":"welcome_super_user"}' `
    -Description "Weekly company updates for BakedBot team - growth and wins and competitive intel" `
    -Emoji "🚀"

# 3. Dispensary Weekly Insights (Every Monday 10am EST)
Create-SchedulerJob `
    -JobName "dispensary-weekly-insights" `
    -Schedule "0 10 * * 1" `
    -Body '{"segment":"dispensary_owner","playbookId":"welcome_dispensary"}' `
    -Description "Weekly insights for dispensaries - inventory and compliance and retention" `
    -Emoji "💼"

# 4. Brand Weekly Marketing Tips (Every Monday 11am EST)
Create-SchedulerJob `
    -JobName "brand-weekly-marketing" `
    -Schedule "0 11 * * 1" `
    -Body '{"segment":"brand_marketer","playbookId":"welcome_brand"}' `
    -Description "Weekly marketing tips for brands - campaigns and content ideas and competitive intel" `
    -Emoji "🎨"

# 5. Lead Weekly Value Emails (Every Wednesday 10am EST)
Create-SchedulerJob `
    -JobName "lead-weekly-value" `
    -Schedule "0 10 * * 3" `
    -Body '{"segment":"lead","playbookId":"welcome_lead"}' `
    -Description "Weekly value emails for leads - education and case studies and demo invites" `
    -Emoji "🧲"

Write-Host ""
Write-Host "✅ Weekly Nurture Schedulers Created!" -ForegroundColor Green
Write-Host ""
Write-Host "Schedule Summary:" -ForegroundColor Yellow
Write-Host "  🌿 Customer: Every Monday 9am EST"
Write-Host "  🚀 Super User: Every Monday 8am EST"
Write-Host "  💼 Dispensary: Every Monday 10am EST"
Write-Host "  🎨 Brand: Every Monday 11am EST"
Write-Host "  🧲 Lead: Every Wednesday 10am EST"
Write-Host ""
Write-Host "Verify jobs:" -ForegroundColor Cyan
Write-Host "  gcloud scheduler jobs list --location=$LOCATION --filter='name:nurture OR name:update OR name:insights OR name:marketing OR name:value'"
Write-Host ""
Write-Host "Test a job manually:" -ForegroundColor Cyan
Write-Host "  gcloud scheduler jobs run customer-weekly-nurture --location=$LOCATION"
Write-Host ""
