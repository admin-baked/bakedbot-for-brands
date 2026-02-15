# Setup CRON_SECRET for GitHub Actions and Firebase
# Run this script to generate a secure secret and get setup instructions

# Generate a secure random secret (32 bytes = 64 hex chars)
$bytes = New-Object byte[] 32
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
$SECRET = -join ($bytes | ForEach-Object { $_.ToString("x2") })

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "🔐 CRON_SECRET Setup Instructions" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Generated secure secret:" -ForegroundColor Green
Write-Host ""
Write-Host "  $SECRET" -ForegroundColor White
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "📋 Step 1: Add to GitHub Actions" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Go to: https://github.com/admin-baked/bakedbot-for-brands/settings/secrets/actions"
Write-Host "2. Click 'New repository secret'"
Write-Host "3. Name: CRON_SECRET"
Write-Host "4. Value: $SECRET"
Write-Host "5. Click 'Add secret'"
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "📋 Step 2: Add to Firebase Secret Manager" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Run this command (requires gcloud auth):" -ForegroundColor Green
Write-Host ""
Write-Host "  echo '$SECRET' | gcloud secrets create CRON_SECRET ``" -ForegroundColor White
Write-Host "    --project=studio-567050101-bc6e8 ``" -ForegroundColor White
Write-Host "    --data-file=-" -ForegroundColor White
Write-Host ""
Write-Host "Or if secret already exists, update it:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  echo '$SECRET' | gcloud secrets versions add CRON_SECRET ``" -ForegroundColor White
Write-Host "    --project=studio-567050101-bc6e8 ``" -ForegroundColor White
Write-Host "    --data-file=-" -ForegroundColor White
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "📋 Step 3: Grant Access to App Hosting" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Run this command:" -ForegroundColor Green
Write-Host ""
Write-Host "  firebase apphosting:secrets:grantaccess CRON_SECRET ``" -ForegroundColor White
Write-Host "    --project=studio-567050101-bc6e8" -ForegroundColor White
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "✅ Step 4: Verify Setup" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Test the endpoint manually:" -ForegroundColor Green
Write-Host ""
Write-Host "  curl -X GET https://bakedbot.ai/api/cron/dayday-discovery ``" -ForegroundColor White
Write-Host "    -H 'Authorization: Bearer $SECRET'" -ForegroundColor White
Write-Host ""
Write-Host "You should see:" -ForegroundColor Yellow
Write-Host '  {"success": true, "result": {...}}' -ForegroundColor Green
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  IMPORTANT: Keep this secret secure!" -ForegroundColor Red
Write-Host "    Do not commit it to git or share publicly." -ForegroundColor Red
Write-Host ""

# Also save to clipboard if available
try {
    Set-Clipboard -Value $SECRET
    Write-Host "✅ Secret copied to clipboard!" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "INFO: Could not copy to clipboard (copy manually from above)" -ForegroundColor Yellow
    Write-Host ""
}
