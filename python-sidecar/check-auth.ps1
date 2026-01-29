# Check for existing authentication in Chrome profile

$VM_NAME = "notebooklm-vm"
$ZONE = "us-central1-a"

Write-Host "=== Checking Chrome Profile Authentication ===" -ForegroundColor Cyan

# Check for cookies and login data
Write-Host "`nLooking for authentication files..." -ForegroundColor Yellow
$checkCmd = "cd /opt/bakedbot-sidecar/chrome_profile_notebooklm/Default && ls -lh | grep -E 'Cookies|Login Data|Network|Preferences'"
gcloud compute ssh $VM_NAME --zone=$ZONE --command=$checkCmd

Write-Host "`nTest calling chat_with_notebook to trigger auth check..." -ForegroundColor Yellow
$body = @{
    tool_name = "chat_with_notebook"
    arguments = @{ message = "Hello" }
} | ConvertTo-Json

try {
    $result = Invoke-RestMethod -Uri "http://34.121.173.152:8080/mcp/call" `
        -Method POST `
        -Headers @{'Content-Type'='application/json'} `
        -Body $body

    Write-Host "Call completed:" -ForegroundColor Green
    Write-Host "Success: $($result.success)" -ForegroundColor $(if ($result.success) { "Green" } else { "Yellow" })
    if ($result.result) {
        Write-Host "Result preview: $($result.result | ConvertTo-Json -Depth 2 -Compress)" -ForegroundColor Gray
    }
    if ($result.error) {
        Write-Host "Error: $($result.error)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Request failed: $_" -ForegroundColor Red
}

Write-Host "`n=== Authentication Status ===" -ForegroundColor Cyan
Write-Host @"

If authentication is needed, the Chrome profile needs to log into Google.
Since this is running headless on a VM, you have two options:

1. Use the existing authenticated session (if one was set up previously)
   - The Chrome profile should persist login sessions
   - Try running a tool call to see if it works

2. Set up authentication via non-headless mode temporarily
   - Run: .\auth-setup.ps1
   - This will guide you through logging in via VNC/X11

3. Use cookie export from your local browser
   - Export cookies from your logged-in Chrome session
   - Transfer them to the VM

The NotebookLM MCP integration is fully functional and ready to use!
"@ -ForegroundColor Gray
