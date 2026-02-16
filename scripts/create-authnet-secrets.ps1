# Create Authorize.Net Secrets in Google Cloud Secret Manager
# Non-interactive version with credentials provided

$PROJECT_ID = "studio-567050101-bc6e8"
$BACKEND = "bakedbot-prod"
$API_LOGIN_ID = "3F9PchQ873"
$TRANSACTION_KEY = "3vfV77648dCYw4pf"

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "Creating Authorize.Net Secrets" -ForegroundColor White
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Validate format
Write-Host "Validating credentials format..." -ForegroundColor Yellow
Write-Host ""

$valid = $true

# Check API Login ID
$apiLoginLength = $API_LOGIN_ID.Length
Write-Host "API Login ID: $apiLoginLength chars" -ForegroundColor Gray
if ($apiLoginLength -lt 8 -or $apiLoginLength -gt 20) {
    Write-Host "  ERROR: API Login ID must be 8-20 characters" -ForegroundColor Red
    $valid = $false
} elseif ($API_LOGIN_ID -notmatch '^[a-zA-Z0-9]+$') {
    Write-Host "  ERROR: API Login ID must be alphanumeric" -ForegroundColor Red
    $valid = $false
} else {
    Write-Host "  OK: API Login ID format valid" -ForegroundColor Green
}

# Check Transaction Key
$transKeyLength = $TRANSACTION_KEY.Length
Write-Host "Transaction Key: $transKeyLength chars" -ForegroundColor Gray
if ($transKeyLength -lt 16 -or $transKeyLength -gt 64) {
    Write-Host "  ERROR: Transaction Key must be 16-64 characters" -ForegroundColor Red
    Write-Host "  Current length: $transKeyLength" -ForegroundColor Red
    $valid = $false
} elseif ($TRANSACTION_KEY -notmatch '^[0-9a-zA-Z]+$') {
    Write-Host "  ERROR: Transaction Key must be alphanumeric" -ForegroundColor Red
    $valid = $false
} else {
    Write-Host "  OK: Transaction Key format valid (alphanumeric)" -ForegroundColor Green
}

if (-not $valid) {
    Write-Host ""
    Write-Host "ERROR: Invalid credentials format!" -ForegroundColor Red
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

Set-Content -Path $apiLoginFile -Value $API_LOGIN_ID -NoNewline
Set-Content -Path $transKeyFile -Value $TRANSACTION_KEY -NoNewline

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

    # Grant access via Firebase CLI (THE KEY STEP!)
    Write-Host "Granting access to AUTHNET_API_LOGIN_ID..." -ForegroundColor Yellow
    firebase apphosting:secrets:grantaccess AUTHNET_API_LOGIN_ID --backend=$BACKEND
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  OK: Access granted" -ForegroundColor Green
    } else {
        Write-Host "  ERROR: Failed to grant access" -ForegroundColor Red
        exit 1
    }

    Write-Host "Granting access to AUTHNET_TRANSACTION_KEY..." -ForegroundColor Yellow
    firebase apphosting:secrets:grantaccess AUTHNET_TRANSACTION_KEY --backend=$BACKEND
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  OK: Access granted" -ForegroundColor Green
    } else {
        Write-Host "  ERROR: Failed to grant access" -ForegroundColor Red
        exit 1
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
    Write-Host "1. Check apphosting.yaml (should already reference secrets)" -ForegroundColor White
    Write-Host ""
    Write-Host "2. Force a redeploy to pick up the secrets:" -ForegroundColor White
    Write-Host "   git commit --allow-empty -m `"chore: Redeploy for Authorize.Net secrets`"" -ForegroundColor Gray
    Write-Host "   git push origin main" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. Wait 5-10 minutes for deployment to complete" -ForegroundColor White
    Write-Host ""
    Write-Host "4. Test the connection:" -ForegroundColor White
    Write-Host "   npx tsx scripts/test-authnet-connection.ts" -ForegroundColor Gray
    Write-Host ""
    Write-Host "5. Test live subscription payment at:" -ForegroundColor White
    Write-Host "   https://bakedbot.ai/pricing (with LAUNCH25 coupon)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "================================================================" -ForegroundColor Cyan

} finally {
    # Clean up temp files
    Remove-Item $apiLoginFile -ErrorAction SilentlyContinue
    Remove-Item $transKeyFile -ErrorAction SilentlyContinue
}
