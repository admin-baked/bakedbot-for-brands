# Setup Manual Authentication for NotebookLM
$VM_NAME = "notebooklm-vm"
$ZONE = "us-central1-a"

Write-Host "=== Setting Up Manual Authentication ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "This script will configure the VM for one-time manual authentication." -ForegroundColor Yellow
Write-Host "After successful login, the session will be saved and reused in headless mode." -ForegroundColor Yellow
Write-Host ""

# Step 1: Install VNC and desktop environment
Write-Host "[1/5] Installing VNC and lightweight desktop..." -ForegroundColor Green
$installScript = @'
#!/bin/bash
set -e

echo "Installing Xvfb, x11vnc, and fluxbox..."
sudo apt-get update -qq
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y \
    xvfb \
    x11vnc \
    fluxbox \
    xterm \
    > /dev/null 2>&1

echo "VNC setup complete"
'@

$installScript | Out-File -FilePath "install-vnc.sh" -Encoding ASCII
gcloud compute scp install-vnc.sh ${VM_NAME}:/tmp/install-vnc.sh --zone=$ZONE
gcloud compute ssh $VM_NAME --zone=$ZONE --command="chmod +x /tmp/install-vnc.sh && /tmp/install-vnc.sh"
Remove-Item install-vnc.sh

# Step 2: Set headless=false temporarily
Write-Host "`n[2/5] Configuring non-headless mode..." -ForegroundColor Green
gcloud compute scp ${VM_NAME}:/opt/bakedbot-sidecar/notebooklm-config.json ./notebooklm-config-temp.json --zone=$ZONE
$config = Get-Content ./notebooklm-config-temp.json -Raw | ConvertFrom-Json
$config.headless = $false
$config | ConvertTo-Json -Depth 10 | Set-Content ./notebooklm-config-temp.json
gcloud compute scp ./notebooklm-config-temp.json ${VM_NAME}:/tmp/notebooklm-config.json --zone=$ZONE
gcloud compute ssh $VM_NAME --zone=$ZONE --command="sudo mv /tmp/notebooklm-config.json /opt/bakedbot-sidecar/notebooklm-config.json"
Remove-Item ./notebooklm-config-temp.json

# Step 3: Create VNC startup script
Write-Host "`n[3/5] Creating VNC server script..." -ForegroundColor Green
$vncScript = @'
#!/bin/bash

# Kill any existing VNC servers
pkill -9 x11vnc || true
pkill -9 Xvfb || true
pkill -9 fluxbox || true

# Start Xvfb (virtual framebuffer)
export DISPLAY=:99
Xvfb :99 -screen 0 1920x1080x24 &
sleep 2

# Start window manager
fluxbox &
sleep 1

# Start VNC server (no password for simplicity)
x11vnc -display :99 -forever -shared -rfbport 5900 &

echo "VNC server started on port 5900"
echo "Display: $DISPLAY"

# Keep running
tail -f /dev/null
'@

$vncScript | Out-File -FilePath "start-vnc.sh" -Encoding ASCII
gcloud compute scp start-vnc.sh ${VM_NAME}:/tmp/start-vnc.sh --zone=$ZONE
gcloud compute ssh $VM_NAME --zone=$ZONE --command="chmod +x /tmp/start-vnc.sh"
Remove-Item start-vnc.sh

# Step 4: Open firewall for VNC
Write-Host "`n[4/5] Opening VNC port in firewall..." -ForegroundColor Green
gcloud compute firewall-rules create allow-vnc `
    --allow tcp:5900 `
    --source-ranges 0.0.0.0/0 `
    --description "Allow VNC for NotebookLM authentication" `
    2>$null

# Step 5: Get VM external IP
Write-Host "`n[5/5] Getting VM connection info..." -ForegroundColor Green
$vmIp = gcloud compute instances describe $VM_NAME --zone=$ZONE --format="get(networkInterfaces[0].accessConfigs[0].natIP)"

Write-Host ""
Write-Host "=== Manual Authentication Setup Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Start the VNC server on the VM:"
Write-Host "   gcloud compute ssh $VM_NAME --zone=$ZONE --command='/tmp/start-vnc.sh &'" -ForegroundColor White
Write-Host ""
Write-Host "2. Connect using a VNC client:" -ForegroundColor Yellow
Write-Host "   Server: ${vmIp}:5900" -ForegroundColor White
Write-Host "   (Download VNC Viewer: https://www.realvnc.com/en/connect/download/viewer/)" -ForegroundColor Gray
Write-Host ""
Write-Host "3. In the VNC session, open a terminal and run:" -ForegroundColor Yellow
Write-Host "   cd /opt/bakedbot-sidecar" -ForegroundColor White
Write-Host "   export DISPLAY=:99" -ForegroundColor White
Write-Host "   source venv/bin/activate" -ForegroundColor White
Write-Host "   notebooklm-mcp init https://notebooklm.google.com/notebook/59f47d3e-9e5c-4adc-9254-bd78f076898c" -ForegroundColor White
Write-Host ""
Write-Host "4. Log in manually when Chrome opens" -ForegroundColor Yellow
Write-Host ""
Write-Host "5. After successful authentication, run:" -ForegroundColor Yellow
Write-Host "   .\cleanup-manual-auth.ps1" -ForegroundColor White
Write-Host ""
Write-Host "VM IP: $vmIp" -ForegroundColor Cyan
