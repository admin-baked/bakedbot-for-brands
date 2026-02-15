# Trigger Day Day Weekly Review
# Manually triggers the weekly SEO review and email report

param(
    [string]$Secret = ""
)

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "📊 Day Day Weekly Review Trigger" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Get secret if not provided
if ([string]::IsNullOrEmpty($Secret)) {
    Write-Host "No secret provided, attempting to retrieve from Firebase..." -ForegroundColor Gray
    Write-Host ""

    try {
        $Secret = gcloud secrets versions access latest --secret=CRON_SECRET --project=studio-567050101-bc6e8 2>&1

        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Failed to retrieve CRON_SECRET" -ForegroundColor Red
            Write-Host ""
            Write-Host "Usage:" -ForegroundColor Yellow
            Write-Host '  .\trigger-weekly-review.ps1 -Secret "your-secret-here"' -ForegroundColor White
            Write-Host ""
            exit 1
        }

        Write-Host "✅ Retrieved CRON_SECRET from Firebase" -ForegroundColor Green
        Write-Host ""
    }
    catch {
        Write-Host "❌ Could not retrieve secret automatically" -ForegroundColor Red
        Write-Host ""
        Write-Host "Usage:" -ForegroundColor Yellow
        Write-Host '  .\trigger-weekly-review.ps1 -Secret "your-secret-here"' -ForegroundColor White
        Write-Host ""
        exit 1
    }
}

# Step 2: Trigger the endpoint
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "🚀 Triggering Weekly Review" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

$endpoint = "https://bakedbot.ai/api/cron/dayday-review"
Write-Host "Endpoint: $endpoint" -ForegroundColor White
Write-Host "Method: GET" -ForegroundColor White
Write-Host "Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor White
Write-Host ""

try {
    Write-Host "Sending request..." -ForegroundColor Gray
    Write-Host ""

    $headers = @{
        "Authorization" = "Bearer $Secret"
        "User-Agent" = "BakedBot-Weekly-Review-Script/1.0"
    }

    $response = Invoke-WebRequest -Uri $endpoint -Method Get -Headers $headers -ErrorAction Stop

    Write-Host ""
    Write-Host "✅ SUCCESS!" -ForegroundColor Green
    Write-Host ""
    Write-Host "HTTP Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:" -ForegroundColor White
    Write-Host $response.Content -ForegroundColor White
    Write-Host ""

    # Try to parse and display JSON results
    try {
        $json = $response.Content | ConvertFrom-Json
        if ($json.success -and $json.result) {
            Write-Host "================================================" -ForegroundColor Cyan
            Write-Host "📊 Weekly Review Results" -ForegroundColor Yellow
            Write-Host "================================================" -ForegroundColor Cyan
            Write-Host ""

            if ($json.result.optimized) {
                Write-Host "Pages Optimized: $($json.result.optimized)" -ForegroundColor Green
            }

            if ($json.result.analyzed) {
                Write-Host "Pages Analyzed: $($json.result.analyzed)" -ForegroundColor White
            }

            if ($json.result.errors) {
                Write-Host "Errors: $($json.result.errors)" -ForegroundColor $(if ($json.result.errors -gt 0) { "Red" } else { "Green" })
            }

            if ($json.result.details -and $json.result.details.Count -gt 0) {
                Write-Host ""
                Write-Host "Optimizations:" -ForegroundColor White
                foreach ($detail in $json.result.details) {
                    Write-Host "  ✓ $($detail.page): $($detail.query)" -ForegroundColor Green
                }
            }

            Write-Host ""
        }
    }
    catch {
        # JSON parsing failed, that's okay - we already showed the raw response
    }

    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host "📧 Email Notification" -ForegroundColor Yellow
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "An email report has been sent to: martez@bakedbot.ai" -ForegroundColor Green
    Write-Host "Subject: Day Day Weekly Review: [X] Pages Optimized" -ForegroundColor White
    Write-Host ""
    Write-Host "Check your inbox within 5 minutes!" -ForegroundColor Yellow
    Write-Host ""

    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host "✅ Weekly Review Completed Successfully" -ForegroundColor Green
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host ""
}
catch {
    Write-Host ""
    Write-Host "❌ FAILED" -ForegroundColor Red
    Write-Host ""

    $statusCode = 0
    if ($_.Exception.Response) {
        $statusCode = [int]$_.Exception.Response.StatusCode
    }

    if ($statusCode -eq 401) {
        Write-Host "HTTP Status: 401 Unauthorized" -ForegroundColor Red
        Write-Host ""
        Write-Host "This means:" -ForegroundColor Yellow
        Write-Host "  1. The secret you provided does NOT match the server's CRON_SECRET" -ForegroundColor White
        Write-Host "  2. Or the server's CRON_SECRET environment variable is not set" -ForegroundColor White
        Write-Host ""
        Write-Host "Solutions:" -ForegroundColor Yellow
        Write-Host "  Run without -Secret parameter to auto-retrieve from Firebase" -ForegroundColor White
        Write-Host ""
    }
    elseif ($statusCode -eq 500) {
        Write-Host "HTTP Status: 500 Internal Server Error" -ForegroundColor Red
        Write-Host ""
        Write-Host "This might mean:" -ForegroundColor Yellow
        Write-Host "  1. The weekly review job encountered an error" -ForegroundColor White
        Write-Host "  2. Search Console API is unavailable" -ForegroundColor White
        Write-Host "  3. Email service failed" -ForegroundColor White
        Write-Host ""
        Write-Host "Check Cloud Logging for details:" -ForegroundColor Yellow
        Write-Host "  https://console.cloud.google.com/logs/query?project=studio-567050101-bc6e8" -ForegroundColor Gray
        Write-Host ""
    }
    else {
        if ($statusCode -gt 0) {
            Write-Host "HTTP Status: $statusCode" -ForegroundColor Red
        }
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
    }

    Write-Host "Full Error Details:" -ForegroundColor Gray
    Write-Host $_.Exception -ForegroundColor Gray
    Write-Host ""

    exit 1
}

Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
