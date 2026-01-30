# Simpler Manual Authentication Using Chrome Remote Debugging
$VM_NAME = "notebooklm-vm"
$ZONE = "us-central1-a"
$NOTEBOOK_URL = "https://notebooklm.google.com/notebook/59f47d3e-9e5c-4adc-9254-bd78f076898c"

Write-Host "=== Simple Manual Authentication ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "This approach uses Chrome Remote Debugging to authenticate manually." -ForegroundColor Yellow
Write-Host "You'll connect to the Chrome instance running on the VM from your local browser." -ForegroundColor Yellow
Write-Host ""

# Step 1: Stop service
Write-Host "[1/6] Stopping service..." -ForegroundColor Green
gcloud compute ssh $VM_NAME --zone=$ZONE --command="sudo systemctl stop bakedbot-sidecar"

# Step 2: Set headless=false and enable remote debugging
Write-Host "`n[2/6] Configuring Chrome for remote debugging..." -ForegroundColor Green

$setupScript = @'
#!/bin/bash
cd /opt/bakedbot-sidecar

# Update config to non-headless
sudo tee notebooklm-config.json > /dev/null << 'EOF'
{
  "headless": false,
  "debug": true,
  "timeout": 60,
  "default_notebook_id": "59f47d3e-9e5c-4adc-9254-bd78f076898c",
  "base_url": "https://notebooklm.google.com",
  "server_name": "notebooklm-mcp",
  "stdio_mode": true,
  "streaming_timeout": 60,
  "response_stability_checks": 3,
  "retry_attempts": 3,
  "auth": {
    "cookies_path": null,
    "profile_dir": "./chrome_profile_notebooklm",
    "use_persistent_session": true,
    "auto_login": true
  }
}
EOF

echo "Config updated"
'@

$setupScript | Out-File -FilePath "setup-debug.sh" -Encoding ASCII
gcloud compute scp setup-debug.sh ${VM_NAME}:/tmp/setup-debug.sh --zone=$ZONE
gcloud compute ssh $VM_NAME --zone=$ZONE --command="chmod +x /tmp/setup-debug.sh && /tmp/setup-debug.sh"
Remove-Item setup-debug.sh

# Step 3: Install Xvfb (virtual display)
Write-Host "`n[3/6] Installing virtual display..." -ForegroundColor Green
gcloud compute ssh $VM_NAME --zone=$ZONE --command="sudo apt-get update -qq && sudo DEBIAN_FRONTEND=noninteractive apt-get install -y xvfb > /dev/null 2>&1"

# Step 4: Create manual auth script
Write-Host "`n[4/6] Creating authentication script..." -ForegroundColor Green

$authScript = @"
#!/bin/bash
cd /opt/bakedbot-sidecar

# Start virtual display
export DISPLAY=:99
Xvfb :99 -screen 0 1920x1080x24 > /dev/null 2>&1 &
sleep 2

# Activate venv and run init
source venv/bin/activate

echo "Starting NotebookLM authentication..."
echo "Chrome will start and navigate to NotebookLM"
echo ""

# Run init - this will open Chrome
notebooklm-mcp init $NOTEBOOK_URL

echo ""
echo "Authentication complete!"
"@

$authScript | Out-File -FilePath "run-manual-auth.sh" -Encoding ASCII
gcloud compute scp run-manual-auth.sh ${VM_NAME}:/tmp/run-manual-auth.sh --zone=$ZONE
gcloud compute ssh $VM_NAME --zone=$ZONE --command="chmod +x /tmp/run-manual-auth.sh"
Remove-Item run-manual-auth.sh

# Step 5: Instructions
Write-Host "`n[5/6] Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "=== Next Steps ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "OPTION A: Use Local Chrome Profile (EASIEST)" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "Instead of manual auth on VM, copy your authenticated Chrome profile:" -ForegroundColor Gray
Write-Host ""
Write-Host "1. Find your Chrome profile on Windows:" -ForegroundColor White
Write-Host "   %LOCALAPPDATA%\Google\Chrome\User Data\Default" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Copy the Cookies file to the VM:" -ForegroundColor White
Write-Host "   (Already done via cookie import)" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Copy additional session files:" -ForegroundColor White
Write-Host "   - Local Storage/" -ForegroundColor Gray
Write-Host "   - Session Storage/" -ForegroundColor Gray
Write-Host "   - Preferences" -ForegroundColor Gray
Write-Host ""
Write-Host ""
Write-Host "OPTION B: Manual Auth on VM (More Complex)" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "Run this command to authenticate on the VM:" -ForegroundColor White
Write-Host ""
Write-Host "   gcloud compute ssh $VM_NAME --zone=$ZONE" -ForegroundColor Cyan
Write-Host "   /tmp/run-manual-auth.sh" -ForegroundColor Cyan
Write-Host ""
Write-Host "The script will:" -ForegroundColor Gray
Write-Host "- Start a virtual display" -ForegroundColor Gray
Write-Host "- Open Chrome (you won't see it)" -ForegroundColor Gray
Write-Host "- Navigate to NotebookLM" -ForegroundColor Gray
Write-Host "- Wait for authentication" -ForegroundColor Gray
Write-Host ""
Write-Host "Note: This runs headlessly, so you won't see the browser." -ForegroundColor Yellow
Write-Host "      Chrome will try to use your imported cookies." -ForegroundColor Yellow
Write-Host ""
Write-Host ""
Write-Host "[6/6] Recommendation:" -ForegroundColor Green
Write-Host "Try running the manual auth script first. If it fails, we'll try Option A." -ForegroundColor Yellow
