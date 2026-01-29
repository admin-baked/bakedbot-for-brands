# Trigger NotebookLM Authentication Check
# This forces the browser to navigate to NotebookLM and validate cookies

$VM_NAME = "notebooklm-vm"
$ZONE = "us-central1-a"
$SIDECAR_URL = "http://34.121.173.152:8080"

Write-Host "=== Triggering NotebookLM Authentication Check ===" -ForegroundColor Cyan

Write-Host "`n[1/2] Calling navigate_to_notebook..." -ForegroundColor Yellow

# Call the navigate_to_notebook tool to force browser navigation
$response = Invoke-RestMethod -Uri "$SIDECAR_URL/mcp/call" `
    -Method POST `
    -ContentType "application/json" `
    -Body (@{
        tool_name = "navigate_to_notebook"
        arguments = @{
            request = @{
                notebook_id = "59f47d3e-9e5c-4adc-9254-bd78f076898c"
            }
        }
    } | ConvertTo-Json -Depth 5)

Write-Host "   Result:" ($response | ConvertTo-Json -Depth 5)

Write-Host "`n[2/2] Checking authentication status..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

$health = Invoke-RestMethod -Uri "$SIDECAR_URL/health"
Write-Host "   Authenticated:" $health.notebooklm_mcp.process_running
Write-Host "   Session ID:" $health.notebooklm_mcp.session_id

Write-Host "`n=== Testing Chat ===" -ForegroundColor Cyan

# Try a test query
$chatResponse = Invoke-RestMethod -Uri "$SIDECAR_URL/mcp/call" `
    -Method POST `
    -ContentType "application/json" `
    -Body (@{
        tool_name = "chat_with_notebook"
        arguments = @{
            request = @{
                message = "What is this notebook about?"
            }
        }
    } | ConvertTo-Json -Depth 5)

if ($chatResponse.success) {
    $resultText = $chatResponse.result[0].text
    if ($resultText -like "*Error*") {
        Write-Host "   ❌ Error:" $resultText -ForegroundColor Red
    } else {
        Write-Host "   ✅ Success!" -ForegroundColor Green
        Write-Host "   Response:" ($resultText.Substring(0, [Math]::Min(200, $resultText.Length)) + "...")
    }
} else {
    Write-Host "   ❌ Failed:" ($chatResponse | ConvertTo-Json) -ForegroundColor Red
}

Write-Host "`n✅ Complete!" -ForegroundColor Green
