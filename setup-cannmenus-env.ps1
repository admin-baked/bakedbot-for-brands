# Setup script for CannMenus environment variables
# Run this script to add CannMenus credentials and restart the dev server

# Create or update .env.local
$envContent = @"
CANNMENUS_API_BASE=https://api.cannmenus.com
CANNMENUS_API_KEY=e13ed642a92c177163ecff93c997d4ae
"@

Write-Host "Adding CannMenus credentials to .env.local..." -ForegroundColor Green
$envContent | Out-File -FilePath ".env.local" -Encoding UTF8

Write-Host "Environment variables added successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Contents of .env.local:" -ForegroundColor Cyan
Get-Content ".env.local"
Write-Host ""
Write-Host "Now restart your dev server with: npm run dev" -ForegroundColor Yellow
