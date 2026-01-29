# Fix headless mode in NotebookLM config
$VM_NAME = "notebooklm-vm"
$ZONE = "us-central1-a"

Write-Host "=== Fixing Headless Configuration ===" -ForegroundColor Cyan

Write-Host "`n[1/3] Downloading current config..." -ForegroundColor Yellow
gcloud compute scp ${VM_NAME}:/opt/bakedbot-sidecar/notebooklm-config.json ./notebooklm-config.json --zone=$ZONE

Write-Host "`n[2/3] Updating headless setting..." -ForegroundColor Yellow
$config = Get-Content ./notebooklm-config.json -Raw | ConvertFrom-Json
$config.headless = $true
$config | ConvertTo-Json -Depth 10 | Set-Content ./notebooklm-config.json

Write-Host "`n[3/3] Uploading fixed config..." -ForegroundColor Yellow
gcloud compute scp ./notebooklm-config.json ${VM_NAME}:/tmp/notebooklm-config.json --zone=$ZONE
gcloud compute ssh $VM_NAME --zone=$ZONE --command="sudo mv /tmp/notebooklm-config.json /opt/bakedbot-sidecar/notebooklm-config.json"

Remove-Item ./notebooklm-config.json

Write-Host "`n=== Restarting Service ===" -ForegroundColor Cyan
gcloud compute ssh $VM_NAME --zone=$ZONE --command="sudo systemctl restart bakedbot-sidecar"

Write-Host "`nWaiting for service..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host "`n=== Testing ===" -ForegroundColor Cyan
.\test-chat.ps1

Write-Host "`n✅ Done!" -ForegroundColor Green
