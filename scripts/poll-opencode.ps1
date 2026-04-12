# Bug Hunt Poller - Wakes opencode agent every 30 minutes
# Usage: .\poll-opencode.ps1 [interval_minutes]

param(
    [int]$IntervalMinutes = 30
)

$CRON_SECRET = $env:CRON_SECRET
$AGENT_URL = "https://bakedbot.ai/api/agent-tasks"

Write-Host "🔄 Bug Hunt Poller started (every $IntervalMinutes minutes)" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop`n" -ForegroundColor Yellow

$runCount = 0
while ($true) {
    $runCount++
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$Timestamp] Checking for bug hunt task..." -ForegroundColor Gray
    
    if ($CRON_SECRET) {
        $body = @{
            title = "Bug hunt session triggered by poller"
            body = "Scheduled bug hunt session - continue scanning for vulnerabilities"
            category = "bug"
            priority = "high"
            reportedBy = "poller"
        } | ConvertTo-Json
        
        try {
            $response = Invoke-RestMethod -Uri $AGENT_URL -Method Post -Headers @{
                "Authorization" = "Bearer $CRON_SECRET"
                "Content-Type" = "application/json"
            } -Body $body -ErrorAction Stop
            
            Write-Host "✅ Task created successfully" -ForegroundColor Green
        } catch {
            Write-Host "⚠️ Task creation returned: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "⚠️ CRON_SECRET not set - skipping agent trigger" -ForegroundColor Yellow
    }
    
    Write-Host "💤 Sleeping for $IntervalMinutes minutes..." -ForegroundColor Gray
    Start-Sleep -Seconds ($IntervalMinutes * 60)
}
