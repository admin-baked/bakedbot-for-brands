# Verify CRON_SECRET
param([string]$Secret)

if ([string]::IsNullOrEmpty($Secret)) {
    Write-Host "ERROR: No secret provided" -ForegroundColor Red
    Write-Host ""
    Write-Host "Usage: .\verify-secret.ps1 -Secret YOUR_SECRET_HERE"
    exit 1
}

Write-Host "Testing endpoint with provided secret..." -ForegroundColor Yellow
Write-Host ""

$headers = @{
    "Authorization" = "Bearer $Secret"
}

try {
    $response = Invoke-WebRequest -Uri "https://bakedbot.ai/api/cron/dayday-discovery" -Method Get -Headers $headers -ErrorAction Stop
    
    Write-Host "SUCCESS!" -ForegroundColor Green
    Write-Host "Status: $($response.StatusCode)"
    Write-Host ""
    Write-Host "Response:"
    Write-Host $response.Content
}
catch {
    Write-Host "FAILED!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)"
    
    if ($_.Exception.Response) {
        $status = [int]$_.Exception.Response.StatusCode
        Write-Host "HTTP Status: $status"
        
        if ($status -eq 401) {
            Write-Host ""
            Write-Host "This means the secret doesn't match." -ForegroundColor Yellow
            Write-Host "Update GitHub Actions secret to match Firebase."
        }
    }
}
