# Grant secret access to all App Hosting backends
# Run this script after creating new backends in Firebase Console

$PROJECT_ID = "studio-567050101-bc6e8"

Write-Host "🔐 Granting secret access to App Hosting backends..." -ForegroundColor Cyan
Write-Host ""

# Secrets needed by all apps
$COMMON_SECRETS = @(
    "FIREBASE_SERVICE_ACCOUNT_KEY",
    "NEXT_PUBLIC_FIREBASE_API_KEY"
)

# Secrets needed only by operations app
$OPERATIONS_SECRETS = @(
    "CLAUDE_API_KEY",
    "GEMINI_API_KEY"
)

# Grant access to SEO backend
Write-Host "📍 Granting access to bakedbot-seo..." -ForegroundColor Yellow
foreach ($SECRET in $COMMON_SECRETS) {
    Write-Host "  - $SECRET"
    firebase apphosting:secrets:grantaccess $SECRET `
        --backend bakedbot-seo `
        --project $PROJECT_ID
}
Write-Host "✅ bakedbot-seo secrets granted" -ForegroundColor Green
Write-Host ""

# Grant access to Operations backend
Write-Host "⚙️  Granting access to bakedbot-operations..." -ForegroundColor Yellow
foreach ($SECRET in ($COMMON_SECRETS + $OPERATIONS_SECRETS)) {
    Write-Host "  - $SECRET"
    firebase apphosting:secrets:grantaccess $SECRET `
        --backend bakedbot-operations `
        --project $PROJECT_ID
}
Write-Host "✅ bakedbot-operations secrets granted" -ForegroundColor Green
Write-Host ""

# Grant access to Shop backend
Write-Host "🛒 Granting access to bakedbot-shop..." -ForegroundColor Yellow
foreach ($SECRET in $COMMON_SECRETS) {
    Write-Host "  - $SECRET"
    firebase apphosting:secrets:grantaccess $SECRET `
        --backend bakedbot-shop `
        --project $PROJECT_ID
}
Write-Host "✅ bakedbot-shop secrets granted" -ForegroundColor Green
Write-Host ""

Write-Host "🎉 All secrets granted! Redeploy each backend to apply changes." -ForegroundColor Cyan
Write-Host ""
Write-Host "Redeploy commands:"
Write-Host "  firebase apphosting:rollouts:create bakedbot-seo --project $PROJECT_ID"
Write-Host "  firebase apphosting:rollouts:create bakedbot-operations --project $PROJECT_ID"
Write-Host "  firebase apphosting:rollouts:create bakedbot-shop --project $PROJECT_ID"
