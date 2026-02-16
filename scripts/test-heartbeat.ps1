# Test Heartbeat Manual Trigger
$SECRET = "PcyrL/jzXMOniVVu15gPBQH+LPQDCTfK4yaOr0zUxhY="
$URL = "https://bakedbot.ai/api/cron/heartbeat"

Write-Host "Testing heartbeat trigger..." -ForegroundColor Cyan

try {
    $headers = @{
        Authorization = "Bearer $SECRET"
    }

    $response = Invoke-RestMethod -Uri $URL -Method POST -Headers $headers -ContentType "application/json"

    Write-Host "SUCCESS!" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "ERROR!" -ForegroundColor Red
    Write-Host $_.Exception.Message
    Write-Host $_.Exception.Response.StatusCode
}
