# Create Authorize.Net secrets in Google Cloud Secret Manager.
# Supports non-interactive usage via params or env vars:
#   AUTHNET_API_LOGIN_ID_INPUT
#   AUTHNET_TRANSACTION_KEY_INPUT
#   AUTHNET_SIGNATURE_KEY_INPUT (optional)

param(
    [string]$ApiLoginId = $env:AUTHNET_API_LOGIN_ID_INPUT,
    [string]$TransactionKey = $env:AUTHNET_TRANSACTION_KEY_INPUT,
    [string]$SignatureKey = $env:AUTHNET_SIGNATURE_KEY_INPUT
)

$PROJECT_ID = "studio-567050101-bc6e8"
$BACKEND = "bakedbot-prod"

function Upsert-SecretVersion {
    param(
        [Parameter(Mandatory = $true)][string]$SecretName,
        [Parameter(Mandatory = $true)][string]$DataFile
    )

    $result = gcloud secrets create $SecretName --data-file=$DataFile --project=$PROJECT_ID 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  OK: $SecretName created" -ForegroundColor Green
        return
    }

    if ($result -like "*already exists*") {
        gcloud secrets versions add $SecretName --data-file=$DataFile --project=$PROJECT_ID | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  OK: $SecretName version added" -ForegroundColor Green
            return
        }
    }

    Write-Host "  ERROR: Failed upserting $SecretName" -ForegroundColor Red
    Write-Host "  $result" -ForegroundColor DarkGray
    exit 1
}

function Grant-BackendSecretAccess {
    param([Parameter(Mandatory = $true)][string]$SecretName)

    firebase apphosting:secrets:grantaccess $SecretName --backend=$BACKEND | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  OK: Access granted for $SecretName" -ForegroundColor Green
    } else {
        Write-Host "  ERROR: Failed granting access for $SecretName" -ForegroundColor Red
        exit 1
    }
}

if (-not $ApiLoginId) {
    $ApiLoginId = Read-Host "API Login ID (8-20 alphanumeric chars)"
}
if (-not $TransactionKey) {
    $TransactionKey = Read-Host "Transaction Key (16 alphanumeric chars)"
}
if (-not $SignatureKey) {
    Write-Host "AUTHNET_SIGNATURE_KEY not supplied; skipping signature key update." -ForegroundColor Yellow
}

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "Creating Authorize.Net Secrets" -ForegroundColor White
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

$valid = $true

if ($ApiLoginId.Length -lt 8 -or $ApiLoginId.Length -gt 20 -or $ApiLoginId -notmatch '^[a-zA-Z0-9]+$') {
    Write-Host "ERROR: API Login ID must be 8-20 alphanumeric characters" -ForegroundColor Red
    $valid = $false
}

if ($TransactionKey.Length -ne 16 -or $TransactionKey -notmatch '^[a-zA-Z0-9]+$') {
    Write-Host "ERROR: Transaction Key must be exactly 16 alphanumeric characters" -ForegroundColor Red
    $valid = $false
}

if ($SignatureKey) {
    if ($SignatureKey -notmatch '^[0-9a-fA-F]+$' -or $SignatureKey.Length -lt 64) {
        Write-Host "ERROR: Signature Key must be hex and typically 128 chars" -ForegroundColor Red
        $valid = $false
    }
}

if (-not $valid) {
    exit 1
}

$tempDir = [System.IO.Path]::GetTempPath()
$apiLoginFile = Join-Path $tempDir "authnet_api_login.txt"
$transKeyFile = Join-Path $tempDir "authnet_trans_key.txt"
$signatureKeyFile = Join-Path $tempDir "authnet_signature_key.txt"

Set-Content -Path $apiLoginFile -Value $ApiLoginId -NoNewline
Set-Content -Path $transKeyFile -Value $TransactionKey -NoNewline
if ($SignatureKey) {
    Set-Content -Path $signatureKeyFile -Value $SignatureKey -NoNewline
}

try {
    Write-Host "Upserting secrets..." -ForegroundColor Yellow
    Upsert-SecretVersion -SecretName "AUTHNET_API_LOGIN_ID" -DataFile $apiLoginFile
    Upsert-SecretVersion -SecretName "AUTHNET_TRANSACTION_KEY" -DataFile $transKeyFile
    if ($SignatureKey) {
        Upsert-SecretVersion -SecretName "AUTHNET_SIGNATURE_KEY" -DataFile $signatureKeyFile
    }

    Write-Host ""
    Write-Host "Granting App Hosting access..." -ForegroundColor Yellow
    Grant-BackendSecretAccess -SecretName "AUTHNET_API_LOGIN_ID"
    Grant-BackendSecretAccess -SecretName "AUTHNET_TRANSACTION_KEY"
    if ($SignatureKey) {
        Grant-BackendSecretAccess -SecretName "AUTHNET_SIGNATURE_KEY"
    }

    Write-Host ""
    Write-Host "SUCCESS: Authorize.Net secrets updated." -ForegroundColor Green
    Write-Host "Next: push a commit to trigger App Hosting deploy." -ForegroundColor Green
} finally {
    Remove-Item $apiLoginFile -ErrorAction SilentlyContinue
    Remove-Item $transKeyFile -ErrorAction SilentlyContinue
    Remove-Item $signatureKeyFile -ErrorAction SilentlyContinue
}
