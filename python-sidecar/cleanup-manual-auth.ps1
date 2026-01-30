# Cleanup After Manual Authentication
$VM_NAME = "notebooklm-vm"
$ZONE = "us-central1-a"

Write-Host "=== Cleaning Up Manual Auth Setup ===" -ForegroundColor Cyan

# Step 1: Set headless=true
Write-Host "`n[1/4] Restoring headless mode..." -ForegroundColor Green
gcloud compute scp ${VM_NAME}:/opt/bakedbot-sidecar/notebooklm-config.json ./notebooklm-config-temp.json --zone=$ZONE
$config = Get-Content ./notebooklm-config-temp.json -Raw | ConvertFrom-Json
$config.headless = $true
$config | ConvertTo-Json -Depth 10 | Set-Content ./notebooklm-config-temp.json
gcloud compute scp ./notebooklm-config-temp.json ${VM_NAME}:/tmp/notebooklm-config.json --zone=$ZONE
gcloud compute ssh $VM_NAME --zone=$ZONE --command="sudo mv /tmp/notebooklm-config.json /opt/bakedbot-sidecar/notebooklm-config.json"
Remove-Item ./notebooklm-config-temp.json

# Step 2: Stop VNC
Write-Host "`n[2/4] Stopping VNC server..." -ForegroundColor Green
gcloud compute ssh $VM_NAME --zone=$ZONE --command="pkill -9 x11vnc; pkill -9 Xvfb; pkill -9 fluxbox" 2>$null

# Step 3: Close firewall
Write-Host "`n[3/4] Closing VNC port..." -ForegroundColor Green
gcloud compute firewall-rules delete allow-vnc --quiet 2>$null

# Step 4: Restart service
Write-Host "`n[4/4] Restarting NotebookLM service..." -ForegroundColor Green
gcloud compute ssh $VM_NAME --zone=$ZONE --command="sudo systemctl restart bakedbot-sidecar"

Write-Host "`nWaiting for service..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host "`n=== Testing Authentication ===" -ForegroundColor Cyan
.\test-chat.ps1

Write-Host "`n✅ Cleanup complete!" -ForegroundColor Green
