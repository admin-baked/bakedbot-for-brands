# Complete NotebookLM Authentication Setup

$VM_NAME = "notebooklm-vm"
$ZONE = "us-central1-a"

Write-Host "=== NotebookLM Authentication Setup ===" -ForegroundColor Cyan

Write-Host "`nThe MCP server needs to authenticate with Google to access NotebookLM." -ForegroundColor Yellow
Write-Host "We'll set it to non-headless mode temporarily so you can log in." -ForegroundColor Yellow

# Step 1: Update config to headless=false
Write-Host "`n[1/4] Updating config to enable GUI mode..." -ForegroundColor Yellow
gcloud compute ssh $VM_NAME --zone=$ZONE --command="cd /opt/bakedbot-sidecar && python3 -c `"import json; f=open('notebooklm-config.json','r'); d=json.load(f); f.close(); d['headless']=False; f=open('notebooklm-config.json','w'); json.dump(d,f,indent=2); f.close(); print('Config updated')`""

# Step 2: Restart service
Write-Host "`n[2/4] Restarting service..." -ForegroundColor Yellow
gcloud compute ssh $VM_NAME --zone=$ZONE --command="sudo systemctl restart bakedbot-sidecar && sleep 5"

# Step 3: Instructions for VNC setup
Write-Host "`n[3/4] Setting up VNC access..." -ForegroundColor Yellow
Write-Host @"

To complete authentication, you need to access the VM desktop:

Option 1: SSH with X11 forwarding (if you have X server on Windows)
  1. Install VcXsrv or similar X server
  2. Run: gcloud compute ssh $VM_NAME --zone=$ZONE -- -X
  3. Check Chrome: ps aux | grep chrome

Option 2: Use Cloud Console serial port (easier)
  1. Go to: https://console.cloud.google.com/compute/instances
  2. Click on '$VM_NAME'
  3. Click 'Connect' -> 'SSH-in-browser'
  4. Check service logs: sudo journalctl -u bakedbot-sidecar -f

The Chrome browser will open and you need to:
1. Log into your Google account
2. Navigate to NotebookLM
3. Grant any necessary permissions
4. The session will be saved in ./chrome_profile_notebooklm

"@ -ForegroundColor Gray

Write-Host "`n[4/4] After authentication is complete, run restore-headless.ps1" -ForegroundColor Yellow
Write-Host "This will switch back to headless mode and restart the service." -ForegroundColor Yellow

# Create restore script
@"
# Restore headless mode after authentication
`$VM_NAME = "$VM_NAME"
`$ZONE = "$ZONE"

Write-Host "=== Restoring Headless Mode ===" -ForegroundColor Cyan

gcloud compute ssh `$VM_NAME --zone=`$ZONE --command="cd /opt/bakedbot-sidecar && python3 -c \`"import json; f=open('notebooklm-config.json','r'); d=json.load(f); f.close(); d['headless']=True; f=open('notebooklm-config.json','w'); json.dump(d,f,indent=2); f.close(); print('Config updated to headless=True')\`""

gcloud compute ssh `$VM_NAME --zone=`$ZONE --command="sudo systemctl restart bakedbot-sidecar && sleep 3 && sudo systemctl status bakedbot-sidecar --no-pager"

Write-Host "`nHeadless mode restored. Testing..." -ForegroundColor Green
Start-Sleep -Seconds 5

# Test
.\test-mcp.ps1
"@ | Out-File -FilePath "restore-headless.ps1" -Encoding UTF8

Write-Host "`nCreated restore-headless.ps1 for later use" -ForegroundColor Green
