# Bug Hunt Poller - Wakes opencode agent every 30 minutes
# Usage: .\poll-opencode.ps1 [interval_minutes]

param(
    [int]$IntervalMinutes = 30
)

$CRON_SECRET = $env:CRON_SECRET
$BASE_URL = "https://bakedbot.ai"

# For local dev, uncomment:
# $BASE_URL = "http://localhost:3000"

$TASK_ENDPOINT = "$BASE_URL/api/agent-tasks"
$POLLER_ENDPOINT = "$BASE_URL/api/cron/agent-poller"

Write-Host "🔄 Bug Hunt Poller started (every $IntervalMinutes minutes)" -ForegroundColor Cyan
Write-Host "Endpoints:" -ForegroundColor Gray
Write-Host "  Task: $TASK_ENDPOINT" -ForegroundColor Gray
Write-Host "  Poller: $POLLER_ENDPOINT" -ForegroundColor Gray
Write-Host "Press Ctrl+C to stop`n" -ForegroundColor Yellow

$runCount = 0
while ($true) {
    $runCount++
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$Timestamp] Run #$runCount - Creating bug hunt task..." -ForegroundColor Gray
    
    if ($CRON_SECRET) {
        # Step 1: Create a task in the queue
        $body = @{
            title = "Bug hunt session #$runCount"
            body = "Scheduled bug hunt session - scan for security vulnerabilities, bugs, and performance issues"
            category = "bug"
            priority = "high"
            reportedBy = "poller"
        } | ConvertTo-Json
        
        try {
            $taskResponse = Invoke-RestMethod -Uri $TASK_ENDPOINT -Method Post -Headers @{
                "Authorization" = "Bearer $CRON_SECRET"
                "Content-Type" = "application/json"
            } -Body $body -ErrorAction Stop
            
            Write-Host "✅ Task created: $($taskResponse.id)" -ForegroundColor Green
            
            # Step 2: Trigger the poller to pick up and wake agent
            Start-Sleep -Seconds 2
            
            $pollResponse = Invoke-RestMethod -Uri $POLLER_ENDPOINT -Method Get -Headers @{
                "Authorization" = "Bearer $CRON_SECRET"
            } -ErrorAction SilentlyContinue
            
            if ($pollResponse.status -eq "success") {
                Write-Host "🚀 Agent triggered: $($pollResponse.triggered) tasks" -ForegroundColor Green
            } else {
                Write-Host "⏳ Poller: $($pollResponse.status)" -ForegroundColor Yellow
            }
            
        } catch {
            Write-Host "⚠️ Error: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "⚠️ CRON_SECRET not set - set `$env:CRON_SECRET" -ForegroundColor Red
    }
    
    Write-Host "💤 Sleeping for $IntervalMinutes minutes..." -ForegroundColor Gray
    Start-Sleep -Seconds ($IntervalMinutes * 60)
}
