# Initialize NotebookLM Session After Cookie Import

$VM_NAME = "notebooklm-vm"
$ZONE = "us-central1-a"

Write-Host "=== Initializing NotebookLM Session ===" -ForegroundColor Cyan

Write-Host "`nStopping service to reinitialize..." -ForegroundColor Yellow
gcloud compute ssh $VM_NAME --zone=$ZONE --command="sudo systemctl stop bakedbot-sidecar"

Write-Host "`nInitializing NotebookLM MCP with imported cookies..." -ForegroundColor Yellow
gcloud compute ssh $VM_NAME --zone=$ZONE --command=@"
cd /opt/bakedbot-sidecar
source venv/bin/activate
notebooklm-mcp init https://notebooklm.google.com/notebook/59f47d3e-9e5c-4adc-9254-bd78f076898c --no-headless
"@

Write-Host "`nStarting service..." -ForegroundColor Yellow
gcloud compute ssh $VM_NAME --zone=$ZONE --command="sudo systemctl start bakedbot-sidecar"

Write-Host "`nWaiting for service to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host "`n=== Testing Authentication ===" -ForegroundColor Cyan
.\test-chat.ps1

Write-Host "`n✅ Session initialization complete!" -ForegroundColor Green
