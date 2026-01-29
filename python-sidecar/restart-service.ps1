# Restart NotebookLM Service
$VM_NAME = "notebooklm-vm"
$ZONE = "us-central1-a"
$SIDECAR_URL = "http://34.121.173.152:8080"

Write-Host "=== Restarting NotebookLM Service ===" -ForegroundColor Cyan

Write-Host "`nStopping service..." -ForegroundColor Yellow
gcloud compute ssh $VM_NAME --zone=$ZONE --command="sudo systemctl stop bakedbot-sidecar"

Start-Sleep -Seconds 3

Write-Host "`nStarting service..." -ForegroundColor Yellow
gcloud compute ssh $VM_NAME --zone=$ZONE --command="sudo systemctl start bakedbot-sidecar"

Write-Host "`nWaiting for service to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host "`n=== Checking Status ===" -ForegroundColor Cyan
$health = Invoke-RestMethod -Uri "$SIDECAR_URL/health"
Write-Host "Service Status:" $health.status
Write-Host "Process Running:" $health.notebooklm_mcp.process_running
Write-Host "Session ID:" $health.notebooklm_mcp.session_id

Write-Host "`n=== Testing Chat ===" -ForegroundColor Cyan
$chatResponse = Invoke-RestMethod -Uri "$SIDECAR_URL/mcp/call" `
    -Method POST `
    -ContentType "application/json" `
    -Body (@{
        tool_name = "chat_with_notebook"
        arguments = @{
            request = @{
                message = "What is this notebook about?"
            }
        }
    } | ConvertTo-Json -Depth 5)

if ($chatResponse.success) {
    $resultText = $chatResponse.result[0].text
    if ($resultText -like "*Error*") {
        Write-Host "   ❌ Error:" $resultText -ForegroundColor Red
    } else {
        Write-Host "   ✅ Success!" -ForegroundColor Green
        $parsed = $resultText | ConvertFrom-Json
        Write-Host "   Response:" ($parsed.response.Substring(0, [Math]::Min(200, $parsed.response.Length)) + "...")
    }
} else {
    Write-Host "   ❌ Failed:" ($chatResponse | ConvertTo-Json) -ForegroundColor Red
}

Write-Host "`n✅ Complete!" -ForegroundColor Green
