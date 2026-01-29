# Diagnose MCP integration status

$VM_NAME = "notebooklm-vm"
$ZONE = "us-central1-a"
$VM_IP = "34.121.173.152"

Write-Host "=== MCP Integration Diagnostics ===" -ForegroundColor Cyan

# Check health with session ID
Write-Host "`n[1/5] Checking health and session status..." -ForegroundColor Yellow
$health = Invoke-RestMethod -Uri "http://${VM_IP}:8080/health"
Write-Host "MCP Running: $($health.notebooklm_mcp.process_running)" -ForegroundColor $(if ($health.notebooklm_mcp.process_running) { "Green" } else { "Red" })
Write-Host "Session ID: $($health.notebooklm_mcp.session_id)" -ForegroundColor $(if ($health.notebooklm_mcp.session_id) { "Green" } else { "Yellow" })

# Check service logs for session init
Write-Host "`n[2/5] Checking service logs for session initialization..." -ForegroundColor Yellow
Write-Host "Looking for '[NotebookLM MCP] Session' messages:" -ForegroundColor Gray
gcloud compute ssh $VM_NAME --zone=$ZONE --command="sudo journalctl -u bakedbot-sidecar --since '5 minutes ago' --no-pager | grep -i 'session\|error\|starting up'"

# Check Chrome profile
Write-Host "`n[3/5] Checking Chrome profile directory..." -ForegroundColor Yellow
gcloud compute ssh $VM_NAME --zone=$ZONE --command="ls -lah /opt/bakedbot-sidecar/chrome_profile_notebooklm/ 2>/dev/null | head -10 || echo 'Profile directory not found'"

# Test MCP server directly
Write-Host "`n[4/5] Testing MCP server on VM..." -ForegroundColor Yellow
gcloud compute ssh $VM_NAME --zone=$ZONE --command="curl -s -X POST http://localhost:8001/mcp -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' -d '{`"jsonrpc`":`"2.0`",`"id`":1,`"method`":`"initialize`",`"params`":{`"protocolVersion`":`"2024-11-05`",`"capabilities`":{},`"clientInfo`":{`"name`":`"test`",`"version`":`"1.0`"}}}' | head -5"

# Test tool call
Write-Host "`n[5/5] Testing MCP tool call..." -ForegroundColor Yellow
$result = Invoke-RestMethod -Uri "http://${VM_IP}:8080/mcp/call" -Method POST -Headers @{'Content-Type'='application/json'} -Body (@{tool_name="healthcheck"; arguments=@{}} | ConvertTo-Json)
Write-Host "Success: $($result.success)" -ForegroundColor $(if ($result.success) { "Green" } else { "Red" })
if ($result.result.text) {
    $status = ($result.result.text | ConvertFrom-Json)
    Write-Host "Auth Status: authenticated=$($status.authenticated), status=$($status.status)" -ForegroundColor Yellow
}

Write-Host "`n=== Diagnostics Complete ===" -ForegroundColor Cyan
