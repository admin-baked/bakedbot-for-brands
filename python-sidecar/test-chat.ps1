# Test NotebookLM chat functionality

$VM_IP = "34.121.173.152"

Write-Host "=== Testing NotebookLM Chat ===" -ForegroundColor Cyan

Write-Host "`nAttempting to chat with notebook..." -ForegroundColor Yellow
$body = @{
    tool_name = "chat_with_notebook"
    arguments = @{
        request = @{
            message = "What is this notebook about?"
        }
    }
} | ConvertTo-Json -Depth 5

try {
    $result = Invoke-RestMethod -Uri "http://${VM_IP}:8080/mcp/call" `
        -Method POST `
        -Headers @{'Content-Type'='application/json'} `
        -Body $body `
        -TimeoutSec 90

    Write-Host "`nSuccess: $($result.success)" -ForegroundColor $(if ($result.success) { "Green" } else { "Red" })

    if ($result.success -and $result.result) {
        Write-Host "`nResult:" -ForegroundColor Green
        Write-Host "Raw result object:" -ForegroundColor Gray
        Write-Host ($result.result | ConvertTo-Json -Depth 5) -ForegroundColor Gray

        if ($result.result.text) {
            Write-Host "`nParsing text field..." -ForegroundColor Yellow
            try {
                $response = $result.result.text | ConvertFrom-Json
                Write-Host "  Response: $($response.response)" -ForegroundColor Gray
                Write-Host "  Authenticated: $($response.authenticated)" -ForegroundColor $(if ($response.authenticated) { "Green" } else { "Yellow" })
            } catch {
                Write-Host "  Text content (not JSON): $($result.result.text)" -ForegroundColor Gray
            }
        }
    }

    if ($result.error) {
        Write-Host "`nError: $($result.error)" -ForegroundColor Red
    }

    if ($result.details) {
        Write-Host "`nDetails: $($result.details)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "`nRequest failed: $_" -ForegroundColor Red
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Cyan
