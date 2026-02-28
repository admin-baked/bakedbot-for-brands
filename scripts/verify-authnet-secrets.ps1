# Verify Authorize.Net Secrets in Google Cloud Secret Manager
# Checks existence, format, and length without exposing the actual values

$PROJECT_ID = "studio-567050101-bc6e8"

Write-Host "Verifying Authorize.Net Secrets..." -ForegroundColor Cyan
Write-Host ""

# Expected formats:
# - API_LOGIN_ID: 8-20 alphanumeric characters
# - TRANSACTION_KEY: 16 alphanumeric characters

function Test-SecretFormat {
    param(
        [string]$SecretName,
        [string]$ExpectedPattern,
        [int]$MinLength,
        [int]$MaxLength
    )

    Write-Host "Checking $SecretName..." -ForegroundColor Yellow

    # Check if secret exists
    try {
        $secretValue = gcloud secrets versions access latest --secret=$SecretName --project=$PROJECT_ID 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  ERROR: Secret does not exist!" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "  ERROR: Cannot access secret!" -ForegroundColor Red
        return $false
    }

    # Check length
    $length = $secretValue.Length
    Write-Host "  Length: $length characters" -ForegroundColor Gray

    if ($length -lt $MinLength -or $length -gt $MaxLength) {
        Write-Host "  WARNING: Length outside expected range ($MinLength-$MaxLength)" -ForegroundColor Yellow
        Write-Host "  This may cause 'invalid length/format' errors" -ForegroundColor Yellow
    } else {
        Write-Host "  OK: Length is within valid range" -ForegroundColor Green
    }

    # Check format (without exposing value)
    if ($secretValue -match $ExpectedPattern) {
        Write-Host "  OK: Format matches expected pattern" -ForegroundColor Green
    } else {
        Write-Host "  ERROR: Format does not match expected pattern!" -ForegroundColor Red
        Write-Host "  Expected: $ExpectedPattern" -ForegroundColor Gray
    }

    # Show first/last 2 characters for verification (safe to expose)
    if ($length -ge 4) {
        $preview = $secretValue.Substring(0, 2) + "****" + $secretValue.Substring($length - 2, 2)
        Write-Host "  Preview: $preview (first 2 and last 2 chars)" -ForegroundColor Gray
    }

    Write-Host ""
    return $true
}

# Check AUTHNET_API_LOGIN_ID
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "1. AUTHNET_API_LOGIN_ID" -ForegroundColor White
Write-Host "================================================================" -ForegroundColor Cyan
$apiLoginExists = Test-SecretFormat -SecretName "AUTHNET_API_LOGIN_ID" `
    -ExpectedPattern "^[a-zA-Z0-9]+$" `
    -MinLength 8 `
    -MaxLength 20

# Check AUTHNET_TRANSACTION_KEY
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "2. AUTHNET_TRANSACTION_KEY" -ForegroundColor White
Write-Host "================================================================" -ForegroundColor Cyan
$transKeyExists = Test-SecretFormat -SecretName "AUTHNET_TRANSACTION_KEY" `
    -ExpectedPattern "^[a-zA-Z0-9]+$" `
    -MinLength 16 `
    -MaxLength 16

# Check AUTHNET_ENV in apphosting.yaml
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "3. AUTHNET_ENV (from apphosting.yaml)" -ForegroundColor White
Write-Host "================================================================" -ForegroundColor Cyan
$apphostingContent = Get-Content "apphosting.yaml" -Raw
if ($apphostingContent -match 'variable: AUTHNET_ENV\s+value: "([^"]+)"') {
    $authnetEnv = $Matches[1]
    Write-Host "  Current Value: $authnetEnv" -ForegroundColor Gray

    if ($authnetEnv -eq "production") {
        Write-Host "  OK: Set to PRODUCTION (uses live Authorize.Net gateway)" -ForegroundColor Green
    } elseif ($authnetEnv -eq "sandbox") {
        Write-Host "  INFO: Set to SANDBOX (uses test Authorize.Net gateway)" -ForegroundColor Yellow
        Write-Host "  If you want to accept real payments, change to 'production'" -ForegroundColor Yellow
    } else {
        Write-Host "  ERROR: Invalid value! Must be 'production' or 'sandbox'" -ForegroundColor Red
    }
} else {
    Write-Host "  ERROR: AUTHNET_ENV not found in apphosting.yaml!" -ForegroundColor Red
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "Summary" -ForegroundColor White
Write-Host "================================================================" -ForegroundColor Cyan

if ($apiLoginExists -and $transKeyExists) {
    Write-Host "Status: Secrets exist and accessible" -ForegroundColor Green
} else {
    Write-Host "Status: Issues found with secrets" -ForegroundColor Red
}

Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. If secrets have wrong format/length:" -ForegroundColor White
Write-Host "   - Log into Authorize.Net Merchant Dashboard" -ForegroundColor Gray
Write-Host "   - Go to Settings > Security Settings > API Credentials & Keys" -ForegroundColor Gray
Write-Host "   - Generate new Transaction Key (old one will be invalidated)" -ForegroundColor Gray
Write-Host "   - Copy API Login ID and new Transaction Key" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Update Secret Manager with correct values:" -ForegroundColor White
Write-Host "   gcloud secrets versions add AUTHNET_API_LOGIN_ID --data-file=login_id.txt --project=$PROJECT_ID" -ForegroundColor Gray
Write-Host "   gcloud secrets versions add AUTHNET_TRANSACTION_KEY --data-file=trans_key.txt --project=$PROJECT_ID" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Grant Firebase App Hosting access (if not already done):" -ForegroundColor White
Write-Host "   firebase apphosting:secrets:grantaccess AUTHNET_API_LOGIN_ID --backend=bakedbot-prod" -ForegroundColor Gray
Write-Host "   firebase apphosting:secrets:grantaccess AUTHNET_TRANSACTION_KEY --backend=bakedbot-prod" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Force redeploy to pick up new secrets:" -ForegroundColor White
Write-Host "   git commit --allow-empty -m 'chore: Redeploy for Authorize.Net secret update'" -ForegroundColor Gray
Write-Host "   git push origin main" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Test after deployment (5-10 minutes):" -ForegroundColor White
Write-Host "   powershell scripts/test-authnet-connection.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
