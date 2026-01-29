# Authenticate NotebookLM MCP Remotely via CLI

$VM_NAME = "notebooklm-vm"
$ZONE = "us-central1-a"
$NOTEBOOK_ID = "59f47d3e-9e5c-4adc-9254-bd78f076898c"

Write-Host "=== Remote NotebookLM Authentication ===" -ForegroundColor Cyan

Write-Host @"

This script will run the notebooklm-mcp init command on the VM.
The init process will:
1. Open a browser window (in GUI mode)
2. Prompt you to log into Google
3. Save authentication to the Chrome profile

"@ -ForegroundColor Yellow

$response = Read-Host "Do you want to proceed? (y/n)"
if ($response -ne 'y') {
    Write-Host "Cancelled." -ForegroundColor Yellow
    exit 0
}

# Step 1: Stop the service temporarily
Write-Host "`n[1/5] Stopping service..." -ForegroundColor Yellow
gcloud compute ssh $VM_NAME --zone=$ZONE --command="sudo systemctl stop bakedbot-sidecar"

# Step 2: Set headless=false for GUI login
Write-Host "`n[2/5] Enabling GUI mode..." -ForegroundColor Yellow
gcloud compute ssh $VM_NAME --zone=$ZONE --command=@"
cd /opt/bakedbot-sidecar
python3 -c "import json; f=open('notebooklm-config.json','r'); d=json.load(f); f.close(); d['headless']=False; f=open('notebooklm-config.json','w'); json.dump(d,f,indent=2); f.close(); print('GUI enabled')"
"@

# Step 3: Run init command
Write-Host "`n[3/5] Running authentication..." -ForegroundColor Yellow
Write-Host "This will attempt to authenticate with Google..." -ForegroundColor Gray

$initCmd = @"
cd /opt/bakedbot-sidecar
source venv/bin/activate
export DISPLAY=:99
Xvfb :99 -screen 0 1280x1024x24 &
XVFB_PID=`$!
sleep 2
notebooklm-mcp init https://notebooklm.google.com/notebook/$NOTEBOOK_ID || echo "Init failed - may need manual intervention"
kill `$XVFB_PID 2>/dev/null
"@

gcloud compute ssh $VM_NAME --zone=$ZONE --command=$initCmd

# Step 4: Restore headless mode
Write-Host "`n[4/5] Restoring headless mode..." -ForegroundColor Yellow
gcloud compute ssh $VM_NAME --zone=$ZONE --command=@"
cd /opt/bakedbot-sidecar
python3 -c "import json; f=open('notebooklm-config.json','r'); d=json.load(f); f.close(); d['headless']=True; f=open('notebooklm-config.json','w'); json.dump(d,f,indent=2); f.close(); print('Headless restored')"
"@

# Step 5: Restart service
Write-Host "`n[5/5] Restarting service..." -ForegroundColor Yellow
gcloud compute ssh $VM_NAME --zone=$ZONE --command="sudo systemctl start bakedbot-sidecar && sleep 5 && sudo systemctl status bakedbot-sidecar --no-pager"

Write-Host "`n=== Testing Authentication ===" -ForegroundColor Cyan
Start-Sleep -Seconds 5

.\test-chat.ps1

Write-Host @"

If authentication still shows as 'Not authenticated', you may need to:

1. Check if cookies were saved:
   gcloud compute ssh $VM_NAME --zone=$ZONE --command='ls -lh /opt/bakedbot-sidecar/chrome_profile_notebooklm/Default/Cookies'

2. Try manual authentication via VNC/X11 forwarding

3. Or use cookie export method (see auth-via-cookies.ps1)

"@ -ForegroundColor Gray
