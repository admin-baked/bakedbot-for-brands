# Trigger Day Day Weekly Review
# Manually triggers the weekly SEO review and email report

param(
    [string]$Secret = ""
)

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "📊 Day Day Weekly Review Trigger" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Get secret if not provided
if ([string]::IsNullOrEmpty($Secret)) {
    Write-Host "Retrieving CRON_SECRET from Firebase..." -ForegroundColor Gray
    try {
        $Secret = gcloud secrets versions access latest --secret=CRON_SECRET --project=studio-567050101-bc6e8 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to retrieve secret"
        }
        Write-Host "✅ Retrieved CRON_SECRET" -ForegroundColor Green
        Write-Host ""
    }
    catch {
        Write-Host "❌ Failed to retrieve CRON_SECRET" -ForegroundColor Red
        Write-Host ""
        Write-Host "Usage: .\trigger-weekly-review.ps1 -Secret 'your-secret-here'" -ForegroundColor Yellow
        Write-Host ""
        exit 1
    }
}

# Trigger the endpoint
Write-Host "🚀 Triggering Weekly Review..." -ForegroundColor Yellow
Write-Host "Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host ""

try {
    $headers = @{
        "Authorization" = "Bearer $Secret"
    }

    $response = Invoke-WebRequest `
        -Uri "https://bakedbot.ai/api/cron/dayday-review" `
        -Method Get `
        -Headers $headers `
        -ErrorAction Stop

    Write-Host "✅ SUCCESS!" -ForegroundColor Green
    Write-Host "HTTP Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:" -ForegroundColor White
    Write-Host $response.Content
    Write-Host ""
    Write-Host "📧 Email sent to: martez@bakedbot.ai" -ForegroundColor Green
    Write-Host "Check your inbox within 5 minutes!" -ForegroundColor Yellow
    Write-Host ""
}
catch {
    Write-Host "❌ FAILED" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    exit 1
}

Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
