# CannPay Sandbox Credentials Setup Script (PowerShell)
# This script configures Firebase Secret Manager with CannPay sandbox credentials
# Run this script from the project root directory

$ErrorActionPreference = "Stop"

$PROJECT_ID = "studio-567050101-bc6e8"

Write-Host "🔐 Setting up CannPay Sandbox credentials in Firebase Secret Manager..." -ForegroundColor Cyan
Write-Host "Project: $PROJECT_ID" -ForegroundColor Cyan
Write-Host ""

# Set Integrator ID
Write-Host "📝 Setting CANPAY_INTEGRATOR_ID..." -ForegroundColor Yellow
"8954cd15" | gcloud secrets versions add CANPAY_INTEGRATOR_ID `
  --project=$PROJECT_ID `
  --data-file=-

Write-Host "✅ CANPAY_INTEGRATOR_ID set" -ForegroundColor Green

# Set App Key
Write-Host "📝 Setting CANPAY_APP_KEY..." -ForegroundColor Yellow
"BaKxozke8" | gcloud secrets versions add CANPAY_APP_KEY `
  --project=$PROJECT_ID `
  --data-file=-

Write-Host "✅ CANPAY_APP_KEY set" -ForegroundColor Green

# Set API Secret
Write-Host "📝 Setting CANPAY_API_SECRET..." -ForegroundColor Yellow
"7acfs2il" | gcloud secrets versions add CANPAY_API_SECRET `
  --project=$PROJECT_ID `
  --data-file=-

Write-Host "✅ CANPAY_API_SECRET set" -ForegroundColor Green

Write-Host ""
Write-Host "🎉 CannPay Sandbox credentials configured successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Deploy to Firebase: git push origin main" -ForegroundColor White
Write-Host "2. Test payment flow at: https://bakedbot.ai/thrivesyracuse" -ForegroundColor White
Write-Host "3. Use test consumer: Phone 555-779-4523, PIN 2222" -ForegroundColor White
Write-Host ""
