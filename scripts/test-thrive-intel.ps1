# Test Thrive Syracuse Competitive Intelligence Report
# Uses the direct /api/cron/competitive-intel endpoint (reliable, bypasses playbook)

$CRON_SECRET = gcloud secrets versions access latest --secret=CRON_SECRET --project=studio-567050101-bc6e8

Write-Host "Triggering competitive intelligence report for Thrive Syracuse..." -ForegroundColor Cyan

$body = @{ orgId = "org_thrive_syracuse" } | ConvertTo-Json

$headers = @{
    "Authorization" = "Bearer $CRON_SECRET"
    "Content-Type"  = "application/json"
}

try {
    $response = Invoke-RestMethod `
        -Uri "https://bakedbot.ai/api/cron/competitive-intel" `
        -Method POST `
        -Headers $headers `
        -Body $body

    Write-Host ""
    Write-Host "Success!" -ForegroundColor Green
    Write-Host "Report ID:   $($response.reportId)"
    Write-Host "Competitors: $($response.competitorsTracked)"
    Write-Host "Deals:       $($response.totalDeals)"
    Write-Host "Snapshots:   $($response.totalSnapshots)"
    Write-Host ""
    Write-Host "Check your email for the competitive intelligence report." -ForegroundColor Yellow
    Write-Host "Check inbox at /dashboard/inbox for Ezal notification." -ForegroundColor Yellow
    Write-Host "Check /dashboard/pricing for CompetitiveIntelCard." -ForegroundColor Yellow

} catch {
    Write-Host ""
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails) { Write-Host $_.ErrorDetails.Message -ForegroundColor Red }
}
