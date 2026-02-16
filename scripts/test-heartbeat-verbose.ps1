# Test Heartbeat with Verbose Error Details
$SECRET = "PcyrL/jzXMOniVVu15gPBQH+LPQDCTfK4yaOr0zUxhY="
$URL = "https://bakedbot.ai/api/cron/heartbeat"

Write-Host "Testing heartbeat trigger (verbose mode)..." -ForegroundColor Cyan
Write-Host ""

try {
    $headers = @{
        Authorization = "Bearer $SECRET"
        "Content-Type" = "application/json"
    }

    $body = @{
        tenantId = "system"
        userId = "system"
        role = "super_user"
        force = $true
    } | ConvertTo-Json

    Write-Host "Request Details:" -ForegroundColor Yellow
    Write-Host "  URL: $URL" -ForegroundColor Gray
    Write-Host "  Method: POST" -ForegroundColor Gray
    Write-Host "  Auth: Bearer [SECRET]" -ForegroundColor Gray
    Write-Host ""

    $response = Invoke-WebRequest -Uri $URL -Method POST -Headers $headers -Body $body -ContentType "application/json"

    Write-Host "SUCCESS!" -ForegroundColor Green
    Write-Host "Status Code: $($response.StatusCode)" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Yellow
    Write-Host ($response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10)

} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "ERROR!" -ForegroundColor Red
    Write-Host "Status Code: $statusCode" -ForegroundColor Red
    Write-Host ""

    if ($statusCode -eq 401) {
        Write-Host "DIAGNOSIS: Unauthorized (401)" -ForegroundColor Yellow
        Write-Host "  The CRON_SECRET is not being resolved correctly" -ForegroundColor Yellow
        Write-Host "  or doesn't match the incoming Authorization header" -ForegroundColor Yellow
    } elseif ($statusCode -eq 500) {
        Write-Host "DIAGNOSIS: Internal Server Error (500)" -ForegroundColor Yellow
        Write-Host "  Authentication passed, but heartbeat execution failed" -ForegroundColor Yellow
        Write-Host "  This could mean:" -ForegroundColor Yellow
        Write-Host "    1. Bug in heartbeat execution code" -ForegroundColor Gray
        Write-Host "    2. Missing dependencies or environment setup" -ForegroundColor Gray
        Write-Host "    3. Database connection issues" -ForegroundColor Gray
        Write-Host ""

        # Try to get response body for more details
        try {
            $errorResponse = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($errorResponse)
            $errorBody = $reader.ReadToEnd()
            Write-Host "Error Response Body:" -ForegroundColor Yellow
            Write-Host $errorBody -ForegroundColor Gray
        } catch {
            Write-Host "Could not read error response body" -ForegroundColor Gray
        }
    }

    Write-Host ""
    Write-Host "Full Error:" -ForegroundColor Yellow
    Write-Host $_.Exception.Message -ForegroundColor Gray
}
