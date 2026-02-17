# Test Thrive Syracuse Competitive Intelligence Report
# Triggers the daily competitive intel playbook

Write-Host "🔐 Fetching CRON_SECRET..." -ForegroundColor Cyan
$CRON_SECRET = gcloud secrets versions access latest --secret=CRON_SECRET --project=studio-567050101-bc6e8

Write-Host "📊 Triggering competitive intelligence report for Thrive Syracuse..." -ForegroundColor Cyan

$body = @{
    orgId = "org_thrive_syracuse"
} | ConvertTo-Json

$headers = @{
    "Authorization" = "Bearer $CRON_SECRET"
    "Content-Type" = "application/json"
}

try {
    $response = Invoke-RestMethod `
        -Uri "https://bakedbot.ai/api/playbooks/c1boBTwmKyPo23Ib1C7o/execute" `
        -Method POST `
        -Headers $headers `
        -Body $body

    Write-Host ""
    Write-Host "✅ Success! Playbook execution triggered" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Yellow
    $response | ConvertTo-Json -Depth 10

    Write-Host ""
    Write-Host "📁 Check BakedBot Drive for the markdown report" -ForegroundColor Cyan
    Write-Host "📨 Check inbox for notification from Ezal" -ForegroundColor Cyan

} catch {
    Write-Host ""
    Write-Host "❌ Error executing playbook" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
}
