# Test if CRON_SECRET is accessible in deployed app
# This checks a simple endpoint to see if secrets are resolving

$URL = "https://bakedbot.ai/api/system/health"

Write-Host "Checking deployment status..." -ForegroundColor Cyan
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri $URL -Method GET

    Write-Host "Health Endpoint Response:" -ForegroundColor Yellow
    Write-Host "  Pulse: $($response.pulse)" -ForegroundColor $(if($response.pulse -eq 'alive'){'Green'}else{'Red'})
    Write-Host "  Status: $($response.status)"
    Write-Host "  Healthy: $($response.healthy)"
    Write-Host "  Schedules Executed: $($response.schedulesExecuted)"
    Write-Host "  Last Execution: $($response.timestamp)"
    Write-Host ""

    if ($response.pulse -eq 'unknown') {
        Write-Host "DIAGNOSIS: No heartbeat executions found" -ForegroundColor Red
        Write-Host "This means either:" -ForegroundColor Yellow
        Write-Host "  1. Firebase App Hosting is still building/deploying" -ForegroundColor Yellow
        Write-Host "  2. Secret Manager reference CRON_SECRET@6 is not resolving" -ForegroundColor Yellow
        Write-Host "  3. Heartbeat cron hasn't run yet (runs every 5 min)" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Check Firebase Console for build status:" -ForegroundColor Cyan
        Write-Host "  https://console.firebase.google.com/project/studio-567050101-bc6e8/apphosting" -ForegroundColor Blue
    }

} catch {
    Write-Host "ERROR checking health endpoint!" -ForegroundColor Red
    Write-Host $_.Exception.Message
}
