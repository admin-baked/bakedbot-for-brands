
$PROJECT_ID = "studio-567050101-bc6e8"
$LOCATION = "us-central1"
$QUEUE_NAME = "agent-queue"
$SERVICE_ACCOUNT = "firebase-app-hosting-compute@system.gserviceaccount.com"

Write-Host "BakedBot Cloud Tasks Fixer" -ForegroundColor Cyan
Write-Host "--------------------------------"

# 1. Check Auth
Write-Host "Checking gcloud auth..."
try {
    $auth = gcloud auth list --filter=status:ACTIVE --format="value(account)"
    if (-not $auth) { throw "No auth" }
} catch {
    Write-Host "Please login to gcloud first:" -ForegroundColor Yellow
    Write-Host "gcloud auth login" -ForegroundColor White
    exit
}

# 2. Create Queue
Write-Host "Checking Queue '$QUEUE_NAME'..."
try {
    # Check if exists (suppress stderr)
    gcloud tasks queues describe $QUEUE_NAME --location=$LOCATION --project=$PROJECT_ID 2>$null | Out-Null
    Write-Host "[OK] Queue '$QUEUE_NAME' already exists." -ForegroundColor Green
} catch {
    Write-Host "Creating Queue '$QUEUE_NAME'..."
    gcloud tasks queues create $QUEUE_NAME --location=$LOCATION --project=$PROJECT_ID
    Write-Host "[OK] Queue Created." -ForegroundColor Green
}

# 3. Grant Permissions
Write-Host "Granting 'Cloud Tasks Enqueuer' permission..."
Write-Host "Attempting to auto-detect Service Account from Cloud Run..."

try {
    $appName = "bakedbot-prod"
    # Execute directly ensuring proper quoting for PowerShell args
    $detectedSA = gcloud run services describe $appName --region=$LOCATION --project=$PROJECT_ID --format="value(spec.template.spec.serviceAccountName)" 2>$null
    
    if ($detectedSA) {
        $detectedSA = $detectedSA.Trim()
        Write-Host "[OK] Detected Service Account: $detectedSA" -ForegroundColor Green
        $SERVICE_ACCOUNT = $detectedSA
    } else {
        Write-Host "[WARN] Could not auto-detect Service Account (Service might not be deployed yet)." -ForegroundColor Yellow
    }
} catch {
    Write-Host "[WARN] Auto-detection failed." -ForegroundColor Yellow
}

$saInput = Read-Host "Enter Service Account Email (Press Enter to use: $SERVICE_ACCOUNT)"
if ($saInput -ne "") {
    $SERVICE_ACCOUNT = $saInput
}

Write-Host "Granting roles/cloudtasks.enqueuer to $SERVICE_ACCOUNT..."
# Using cmd /c just for the binding command to avoid powershell parsing issues with --member arg sometimes
cmd /c "gcloud projects add-iam-policy-binding $PROJECT_ID --member=serviceAccount:$SERVICE_ACCOUNT --role=roles/cloudtasks.enqueuer --condition=None"

Write-Host "--------------------------------"
Write-Host "[OK] Setup Complete. Please try using the Agent again." -ForegroundColor Cyan
