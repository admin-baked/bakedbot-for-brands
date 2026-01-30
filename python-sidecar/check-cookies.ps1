# Check if cookies are still in Chrome profile
$VM_NAME = "notebooklm-vm"
$ZONE = "us-central1-a"

Write-Host "=== Checking Chrome Cookies ===" -ForegroundColor Cyan

gcloud compute ssh $VM_NAME --zone=$ZONE --command="sqlite3 /opt/bakedbot-sidecar/chrome_profile_notebooklm/Default/Cookies 'SELECT COUNT(*) FROM cookies WHERE host_key LIKE \"%google%\"'"

Write-Host "`nSample Google cookies:"
gcloud compute ssh $VM_NAME --zone=$ZONE --command="sqlite3 /opt/bakedbot-sidecar/chrome_profile_notebooklm/Default/Cookies 'SELECT host_key, name FROM cookies WHERE host_key LIKE \"%google%\" LIMIT 5'"
