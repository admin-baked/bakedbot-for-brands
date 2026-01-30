# Patch NotebookLM MCP Server to Call Authenticate
$VM_NAME = "notebooklm-vm"
$ZONE = "us-central1-a"

Write-Host "=== Patching NotebookLM MCP Server ===" -ForegroundColor Cyan

$patchScript = @'
#!/bin/bash
cd /opt/bakedbot-sidecar

# Backup original
sudo cp venv/lib/python3.11/site-packages/notebooklm_mcp/server.py venv/lib/python3.11/site-packages/notebooklm_mcp/server.py.backup

# Create patch
sudo tee patch.txt > /dev/null << 'EOF'
--- server.py.orig
+++ server.py
@@ -1,2 +1,3 @@
                 self.client = NotebookLMClient(self.config)
                 await self.client.start()
+                await self.client.authenticate()
                 logger.info("✅ NotebookLM client initialized and authenticated")
EOF

# Apply patch using sed
sudo sed -i '/await self.client.start()/a\                await self.client.authenticate()' venv/lib/python3.11/site-packages/notebooklm_mcp/server.py

echo "Patch applied. Verifying..."
grep -A 2 "await self.client.start()" venv/lib/python3.11/site-packages/notebooklm_mcp/server.py
'@

# Save patch script
$patchScript | Out-File -FilePath "patch.sh" -Encoding ASCII

Write-Host "`n[1/3] Uploading patch script..." -ForegroundColor Yellow
gcloud compute scp patch.sh ${VM_NAME}:/tmp/patch.sh --zone=$ZONE

Write-Host "`n[2/3] Applying patch..." -ForegroundColor Yellow
gcloud compute ssh $VM_NAME --zone=$ZONE --command="chmod +x /tmp/patch.sh && /tmp/patch.sh"

Write-Host "`n[3/3] Restarting service..." -ForegroundColor Yellow
gcloud compute ssh $VM_NAME --zone=$ZONE --command="sudo systemctl restart bakedbot-sidecar"

Remove-Item patch.sh

Write-Host "`nWaiting for service..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

Write-Host "`n=== Testing Authentication ===" -ForegroundColor Cyan
.\test-chat.ps1

Write-Host "`n✅ Done!" -ForegroundColor Green
