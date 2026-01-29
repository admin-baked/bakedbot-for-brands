# Initialize NotebookLM Session
$VM_NAME = "notebooklm-vm"
$ZONE = "us-central1-a"
$NOTEBOOK_URL = "https://notebooklm.google.com/notebook/59f47d3e-9e5c-4adc-9254-bd78f076898c"

Write-Host "=== Initializing NotebookLM Session ===" -ForegroundColor Cyan

Write-Host "`n[1/3] Stopping service..." -ForegroundColor Yellow
gcloud compute ssh $VM_NAME --zone=$ZONE --command="sudo systemctl stop bakedbot-sidecar"

Write-Host "`n[2/3] Running notebooklm-mcp init..." -ForegroundColor Yellow
gcloud compute ssh $VM_NAME --zone=$ZONE --command="cd /opt/bakedbot-sidecar && source venv/bin/activate && sudo -E venv/bin/notebooklm-mcp init $NOTEBOOK_URL"

Write-Host "`n[3/3] Starting service..." -ForegroundColor Yellow
gcloud compute ssh $VM_NAME --zone=$ZONE --command="sudo systemctl start bakedbot-sidecar"

Write-Host "`nWaiting for service to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host "`n=== Testing ===" -ForegroundColor Cyan
.\test-chat.ps1

Write-Host "`n✅ Done!" -ForegroundColor Green
