# Test NotebookLM MCP Integration

$VM_IP = "34.121.173.152"
$BASE_URL = "http://${VM_IP}:8080"

Write-Host "=== Testing NotebookLM MCP Bridge ===" -ForegroundColor Cyan

# Test 1: Health Check
Write-Host "`n[1/4] Testing Health Check..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$BASE_URL/health" -Method GET
    Write-Host "Status: $($health.status)" -ForegroundColor Green
    Write-Host "MCP Enabled: $($health.notebooklm_mcp.enabled)" -ForegroundColor Green
    Write-Host "MCP Running: $($health.notebooklm_mcp.process_running)" -ForegroundColor Green
    Write-Host "Session ID: $($health.notebooklm_mcp.session_id)" -ForegroundColor $(if ($health.notebooklm_mcp.session_id) { "Green" } else { "Red" })
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

# Test 2: List MCP Tools
Write-Host "`n[2/4] Testing MCP Tools List..." -ForegroundColor Yellow
try {
    $tools = Invoke-RestMethod -Uri "$BASE_URL/mcp/list" -Method GET
    Write-Host "Found $($tools.Count) tools:" -ForegroundColor Green
    $tools | ForEach-Object { Write-Host "  - $($_.name): $($_.description)" -ForegroundColor Gray }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

# Test 3: Wait for session initialization
Write-Host "`n[3/4] Waiting for session initialization..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

# Test 4: Call MCP Tool (healthcheck)
Write-Host "`n[4/4] Testing MCP Tool Call (healthcheck)..." -ForegroundColor Yellow
try {
    $body = @{
        tool_name = "healthcheck"
        arguments = @{}
    } | ConvertTo-Json

    $result = Invoke-RestMethod -Uri "$BASE_URL/mcp/call" `
        -Method POST `
        -Headers @{'Content-Type'='application/json'} `
        -Body $body

    if ($result.success) {
        Write-Host "Success: true" -ForegroundColor Green
        Write-Host "Result: $($result.result | ConvertTo-Json -Depth 5)" -ForegroundColor Gray
    } else {
        Write-Host "Success: false" -ForegroundColor Red
        Write-Host "Error: $($result.error)" -ForegroundColor Red
        if ($result.details) {
            Write-Host "Details: $($result.details)" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

Write-Host "`n=== Tests Complete ===" -ForegroundColor Cyan
