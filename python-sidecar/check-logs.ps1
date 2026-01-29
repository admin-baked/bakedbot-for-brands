# Check service logs for session initialization
$VM_NAME = "notebooklm-vm"
$ZONE = "us-central1-a"

Write-Host "=== Checking Service Logs ===" -ForegroundColor Cyan
gcloud compute ssh $VM_NAME --zone=$ZONE --command='sudo journalctl -u bakedbot-sidecar -n 100 --no-pager | grep -E "(Session|MCP|Error|Starting)"'
