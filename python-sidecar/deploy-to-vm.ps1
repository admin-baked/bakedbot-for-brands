# Deploy NotebookLLM MCP Bridge to GCE VM
# Run this from the python-sidecar directory

$VM_NAME = "notebooklm-vm"
$ZONE = "us-central1-a"
$VM_IP = "34.121.173.152"

Write-Host "=== Deploying BakedBot Sidecar to GCE VM ===" -ForegroundColor Cyan

# Step 1: Copy files to VM
Write-Host "`n[1/7] Copying files to VM..." -ForegroundColor Yellow
gcloud compute scp main.py ${VM_NAME}:/tmp/main.py --zone=$ZONE
gcloud compute scp requirements.txt ${VM_NAME}:/tmp/requirements.txt --zone=$ZONE

# Step 2: Create .env file content
Write-Host "`n[2/7] Creating environment file..." -ForegroundColor Yellow
$envContent = @"
# NotebookLLM MCP Configuration
ENABLE_NOTEBOOKLM_MCP=true
NOTEBOOKLM_NOTEBOOK_ID=59f47d3e-9e5c-4adc-9254-bd78f076898c
NOTEBOOKLM_CONFIG=/opt/bakedbot-sidecar/notebooklm-config.json

# Firebase Admin (if needed)
FIREBASE_SERVICE_ACCOUNT_KEY=$(Get-Content ..\.env.local | Select-String "FIREBASE_SERVICE_ACCOUNT_KEY" | ForEach-Object { $_ -replace "FIREBASE_SERVICE_ACCOUNT_KEY=", "" })

# Server Configuration
PORT=8080
"@

$envContent | Out-File -FilePath .env.vm -Encoding UTF8 -NoNewline
gcloud compute scp .env.vm ${VM_NAME}:/tmp/.env --zone=$ZONE
Remove-Item .env.vm

# Step 3: Install dependencies and move files
Write-Host "`n[3/7] Installing dependencies on VM..." -ForegroundColor Yellow
gcloud compute ssh $VM_NAME --zone=$ZONE --command=@"
set -e
cd /opt/bakedbot-sidecar
sudo mv /tmp/main.py /opt/bakedbot-sidecar/
sudo mv /tmp/.env /opt/bakedbot-sidecar/
sudo mv /tmp/requirements.txt /opt/bakedbot-sidecar/
sudo chown -R root:root /opt/bakedbot-sidecar/
source venv/bin/activate
pip install -r requirements.txt
"@

# Step 4: Create systemd service
Write-Host "`n[4/7] Creating systemd service..." -ForegroundColor Yellow
$serviceContent = @"
[Unit]
Description=BakedBot Python Sidecar - NotebookLLM MCP Bridge
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/bakedbot-sidecar
Environment="PATH=/opt/bakedbot-sidecar/venv/bin:/usr/local/bin:/usr/bin:/bin"
ExecStart=/opt/bakedbot-sidecar/venv/bin/python main.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=bakedbot-sidecar

[Install]
WantedBy=multi-user.target
"@

$serviceContent | Out-File -FilePath bakedbot-sidecar.service -Encoding UTF8 -NoNewline
gcloud compute scp bakedbot-sidecar.service ${VM_NAME}:/tmp/ --zone=$ZONE
Remove-Item bakedbot-sidecar.service

gcloud compute ssh $VM_NAME --zone=$ZONE --command=@"
sudo mv /tmp/bakedbot-sidecar.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable bakedbot-sidecar
sudo systemctl start bakedbot-sidecar
sudo systemctl status bakedbot-sidecar
"@

# Step 5: Configure firewall
Write-Host "`n[5/7] Configuring firewall..." -ForegroundColor Yellow
gcloud compute firewall-rules create notebooklm-mcp-allow `
  --allow tcp:8080 `
  --source-ranges 0.0.0.0/0 `
  --target-tags notebooklm-mcp `
  --description "Allow NotebookLLM MCP Bridge traffic"

# Add tag to VM
gcloud compute instances add-tags $VM_NAME --zone=$ZONE --tags notebooklm-mcp

# Step 6: Test the endpoint
Write-Host "`n[6/7] Testing endpoint..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
curl http://${VM_IP}:8080/health

# Step 7: Update local .env.local
Write-Host "`n[7/7] Updating local .env.local..." -ForegroundColor Yellow
$envPath = "..\\.env.local"
$content = Get-Content $envPath
$content = $content -replace "PYTHON_SIDECAR_URL=.*", "PYTHON_SIDECAR_URL=http://${VM_IP}:8080"
$content | Set-Content $envPath

Write-Host "`n=== Deployment Complete ===" -ForegroundColor Green
Write-Host "Sidecar URL: http://${VM_IP}:8080" -ForegroundColor Cyan
Write-Host "`nCheck logs with: gcloud compute ssh $VM_NAME --zone=$ZONE --command='sudo journalctl -u bakedbot-sidecar -f'" -ForegroundColor Gray
