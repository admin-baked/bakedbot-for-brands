# Trigger Competitive Intelligence Report
# Manually runs the heartbeat check for immediate testing

$CRON_SECRET = $env:CRON_SECRET
if (-not $CRON_SECRET) {
    Write-Host "ERROR: CRON_SECRET environment variable not set" -ForegroundColor Red
    Write-Host "Set it with: `$env:CRON_SECRET = 'your-secret-here'" -ForegroundColor Yellow
    exit 1
}

$body = @{
    tenantId = "bakedbot_super_admin"
    userId = "GrRRe2YR4zY0MT0PEfMPrPCsR5A3"
    role = "super_user"
    force = $true
} | ConvertTo-Json

$headers = @{
    "Authorization" = "Bearer $CRON_SECRET"
    "Content-Type" = "application/json"
}

Write-Host "`n=== Triggering Competitive Intelligence Report ===" -ForegroundColor Cyan
Write-Host "Tenant: bakedbot_super_admin" -ForegroundColor Gray
Write-Host "User: martez@bakedbot.ai" -ForegroundColor Gray
Write-Host "URL: https://bakedbot.ai/api/cron/heartbeat`n" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri "https://bakedbot.ai/api/cron/heartbeat" `
        -Method POST `
        -Headers $headers `
        -Body $body `
        -ContentType "application/json"
    
    Write-Host "✅ Success!" -ForegroundColor Green
    Write-Host "`nResponse:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 10 | Write-Host
    
    Write-Host "`n📊 Next Steps:" -ForegroundColor Yellow
    Write-Host "1. Check your email: martez@bakedbot.ai"
    Write-Host "2. View dashboard notifications"
    Write-Host "3. Check reports at: /dashboard/ceo?tab=analytics&sub=intelligence&intel=ezal"
    
} catch {
    Write-Host "❌ Error:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    Write-Host "`nFull Error:" -ForegroundColor Yellow
    $_ | Format-List * -Force
}
