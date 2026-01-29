# Update main.py on VM and restart service

$VM_NAME = "notebooklm-vm"
$ZONE = "us-central1-a"

Write-Host "=== Updating BakedBot Sidecar ===" -ForegroundColor Cyan

# Step 1: Copy updated main.py
Write-Host "`n[1/3] Copying main.py to VM..." -ForegroundColor Yellow
gcloud compute scp main.py ${VM_NAME}:/tmp/main.py --zone=$ZONE

# Step 2: Move to installation directory
Write-Host "`n[2/3] Moving file and setting permissions..." -ForegroundColor Yellow
gcloud compute ssh $VM_NAME --zone=$ZONE --command="sudo mv /tmp/main.py /opt/bakedbot-sidecar/main.py && sudo chown root:root /opt/bakedbot-sidecar/main.py"

# Step 3: Restart service
Write-Host "`n[3/3] Restarting service..." -ForegroundColor Yellow
gcloud compute ssh $VM_NAME --zone=$ZONE --command="sudo systemctl restart bakedbot-sidecar && sleep 3 && sudo systemctl status bakedbot-sidecar --no-pager"

Write-Host "`n=== Update Complete ===" -ForegroundColor Green
Write-Host "`nCheck logs with: gcloud compute ssh $VM_NAME --zone=$ZONE --command='sudo journalctl -u bakedbot-sidecar -f'" -ForegroundColor Gray
