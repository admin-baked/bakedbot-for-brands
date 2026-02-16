# Force Firebase App Hosting redeploy
# Sometimes IAM binding changes require a new build to take effect

Write-Host "Forcing Firebase App Hosting redeploy..." -ForegroundColor Cyan
Write-Host ""
Write-Host "This creates an empty commit to trigger a rebuild" -ForegroundColor Yellow
Write-Host ""

# Make a trivial change to force rebuild
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$commitMessage = "chore: Force redeploy for IAM binding propagation - $timestamp"

Write-Host "Creating empty commit..." -ForegroundColor Cyan
git commit --allow-empty -m $commitMessage

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to create commit" -ForegroundColor Red
    exit 1
}

Write-Host "OK: Empty commit created" -ForegroundColor Green
Write-Host ""

Write-Host "Pushing to trigger rebuild..." -ForegroundColor Cyan
git push origin main

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to push" -ForegroundColor Red
    exit 1
}

Write-Host "OK: Push completed" -ForegroundColor Green
Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "Firebase App Hosting is now rebuilding" -ForegroundColor Green
Write-Host ""
Write-Host "This rebuild will pick up the IAM bindings we just set." -ForegroundColor Yellow
Write-Host ""
Write-Host "Wait 5-10 minutes, then test again:" -ForegroundColor White
Write-Host "  powershell scripts/test-heartbeat.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "Monitor build: https://console.firebase.google.com/project/studio-567050101-bc6e8/apphosting" -ForegroundColor Blue
Write-Host "================================================================" -ForegroundColor Cyan
