# Setup Authorize.Net Secrets in Google Cloud Secret Manager
# Interactive script to add AUTHNET_API_LOGIN_ID and AUTHNET_TRANSACTION_KEY

$PROJECT_ID = "studio-567050101-bc6e8"
$BACKEND = "bakedbot-prod"

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "Authorize.Net Secret Manager Setup" -ForegroundColor White
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This script will:" -ForegroundColor Yellow
Write-Host "  1. Create secrets in Google Cloud Secret Manager" -ForegroundColor Gray
Write-Host "  2. Grant Firebase App Hosting access" -ForegroundColor Gray
Write-Host "  3. Provide deployment instructions" -ForegroundColor Gray
Write-Host ""
Write-Host "You'll need your Authorize.Net credentials from:" -ForegroundColor Yellow
Write-Host "  https://account.authorize.net/ > Account > Settings > Security Settings > API Credentials & Keys" -ForegroundColor Gray
Write-Host ""

# Prompt for credentials
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "Enter Authorize.Net Credentials" -ForegroundColor White
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

$apiLoginId = Read-Host "API Login ID (8-20 alphanumeric chars)"
$transactionKey = Read-Host "Transaction Key (16 alphanumeric chars)"

# Validate format
Write-Host ""
Write-Host "Validating format..." -ForegroundColor Yellow

$valid = $true

# Check API Login ID
if ($apiLoginId.Length -lt 8 -or $apiLoginId.Length -gt 20) {
    Write-Host "  ERROR: API Login ID must be 8-20 characters" -ForegroundColor Red
    $valid = $false
} elseif ($apiLoginId -notmatch '^[a-zA-Z0-9]+$') {
    Write-Host "  ERROR: API Login ID must be alphanumeric" -ForegroundColor Red
    $valid = $false
} else {
    Write-Host "  OK: API Login ID format valid" -ForegroundColor Green
}

# Check Transaction Key
if ($transactionKey.Length -ne 16) {
    Write-Host "  ERROR: Transaction Key must be exactly 16 characters" -ForegroundColor Red
    Write-Host "  Current length: $($transactionKey.Length)" -ForegroundColor Red
    $valid = $false
} elseif ($transactionKey -notmatch '^[a-zA-Z0-9]+$') {
    Write-Host "  ERROR: Transaction Key must be alphanumeric (a-z, A-Z, 0-9)" -ForegroundColor Red
    $valid = $false
} else {
    Write-Host "  OK: Transaction Key format valid" -ForegroundColor Green
}

if (-not $valid) {
    Write-Host ""
    Write-Host "ERROR: Invalid credentials format!" -ForegroundColor Red
    Write-Host "Please check your credentials and try again." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "Creating Secrets in Secret Manager" -ForegroundColor White
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Create temp files
$tempDir = [System.IO.Path]::GetTempPath()
$apiLoginFile = Join-Path $tempDir "authnet_api_login.txt"
$transKeyFile = Join-Path $tempDir "authnet_trans_key.txt"

Set-Content -Path $apiLoginFile -Value $apiLoginId -NoNewline
Set-Content -Path $transKeyFile -Value $transactionKey -NoNewline

try {
    # Create or update AUTHNET_API_LOGIN_ID
    Write-Host "Creating AUTHNET_API_LOGIN_ID..." -ForegroundColor Yellow
    $result = gcloud secrets create AUTHNET_API_LOGIN_ID --data-file=$apiLoginFile --project=$PROJECT_ID 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  OK: Secret created" -ForegroundColor Green
    } else {
        # If already exists, add new version
        if ($result -like "*already exists*") {
            Write-Host "  Secret already exists, adding new version..." -ForegroundColor Yellow
            gcloud secrets versions add AUTHNET_API_LOGIN_ID --data-file=$apiLoginFile --project=$PROJECT_ID
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  OK: New version added" -ForegroundColor Green
            } else {
                Write-Host "  ERROR: Failed to add version" -ForegroundColor Red
                exit 1
            }
        } else {
            Write-Host "  ERROR: $result" -ForegroundColor Red
            exit 1
        }
    }

    # Create or update AUTHNET_TRANSACTION_KEY
    Write-Host "Creating AUTHNET_TRANSACTION_KEY..." -ForegroundColor Yellow
    $result = gcloud secrets create AUTHNET_TRANSACTION_KEY --data-file=$transKeyFile --project=$PROJECT_ID 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  OK: Secret created" -ForegroundColor Green
    } else {
        # If already exists, add new version
        if ($result -like "*already exists*") {
            Write-Host "  Secret already exists, adding new version..." -ForegroundColor Yellow
            gcloud secrets versions add AUTHNET_TRANSACTION_KEY --data-file=$transKeyFile --project=$PROJECT_ID
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  OK: New version added" -ForegroundColor Green
            } else {
                Write-Host "  ERROR: Failed to add version" -ForegroundColor Red
                exit 1
            }
        } else {
            Write-Host "  ERROR: $result" -ForegroundColor Red
            exit 1
        }
    }

    Write-Host ""
    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host "Granting Firebase App Hosting Access" -ForegroundColor White
    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host ""

    # Grant access via Firebase CLI
    Write-Host "Granting access to AUTHNET_API_LOGIN_ID..." -ForegroundColor Yellow
    firebase apphosting:secrets:grantaccess AUTHNET_API_LOGIN_ID --backend=$BACKEND
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  OK: Access granted" -ForegroundColor Green
    }

    Write-Host "Granting access to AUTHNET_TRANSACTION_KEY..." -ForegroundColor Yellow
    firebase apphosting:secrets:grantaccess AUTHNET_TRANSACTION_KEY --backend=$BACKEND
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  OK: Access granted" -ForegroundColor Green
    }

    Write-Host ""
    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host "SUCCESS!" -ForegroundColor Green
    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Authorize.Net secrets have been created and configured." -ForegroundColor Green
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Force a redeploy to pick up the new secrets:" -ForegroundColor White
    Write-Host "   cd `"c:\Users\admin\BakedBot for Brands\bakedbot-for-brands`"" -ForegroundColor Gray
    Write-Host "   git commit --allow-empty -m `"chore: Redeploy for Authorize.Net secrets`"" -ForegroundColor Gray
    Write-Host "   git push origin main" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Wait 5-10 minutes for deployment to complete" -ForegroundColor White
    Write-Host ""
    Write-Host "3. Test the connection:" -ForegroundColor White
    Write-Host "   npx tsx scripts/test-authnet-connection.ts" -ForegroundColor Gray
    Write-Host ""
    Write-Host "4. Test live subscription payment at:" -ForegroundColor White
    Write-Host "   https://bakedbot.ai/pricing (with LAUNCH25 coupon)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "================================================================" -ForegroundColor Cyan

} finally {
    # Clean up temp files
    Remove-Item $apiLoginFile -ErrorAction SilentlyContinue
    Remove-Item $transKeyFile -ErrorAction SilentlyContinue
}
