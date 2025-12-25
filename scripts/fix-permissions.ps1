
$PROJECT_ID = "studio-567050101-bc6e8"
$LOCATION = "us-central1"
$QUEUE_NAME = "agent-queue"
$SERVICE_ACCOUNT = "firebase-app-hosting-compute@system.gserviceaccount.com" # Default for App Hosting but might vary

Write-Host "🔧 BakedBot Cloud Tasks Fixer" -ForegroundColor Cyan
Write-Host "--------------------------------"

# 1. Check Auth
Write-Host "Checking gcloud auth..."
try {
    gcloud auth list --filter=status:ACTIVE --format="value(account)" | Out-Null
} catch {
    Write-Host "Please login to gcloud first:" -ForegroundColor Yellow
    Write-Host "gcloud auth login" -ForegroundColor White
    exit
}

# 2. Create Queue
Write-Host "Checking Queue '$QUEUE_NAME'..."
$queueParams = "feeds queues describe $QUEUE_NAME --location=$LOCATION --project=$PROJECT_ID"
try {
    # Check if exists (will error if not)
    cmd /c "gcloud tasks queues describe $QUEUE_NAME --location=$LOCATION --project=$PROJECT_ID" 2>&1 | Out-Null
    Write-Host "✅ Queue '$QUEUE_NAME' already exists." -ForegroundColor Green
} catch {
    Write-Host "Creating Queue '$QUEUE_NAME'..."
    cmd /c "gcloud tasks queues create $QUEUE_NAME --location=$LOCATION --project=$PROJECT_ID"
    Write-Host "✅ Queue Created." -ForegroundColor Green
}

# 3. Grant Permissions
Write-Host "Granting 'Cloud Tasks Enqueuer' permission..."
Write-Host "Note: We need the Service Account email used by your Cloud Run service."
# Try to auto-detect Service Account from Cloud Run
Write-Host "Attempting to auto-detect Service Account from Cloud Run..."
try {
    # Assuming service name contains 'bakedbot' or 'nextjs'
    $appName = "bakedbot-prod" # Adjust if your service name differs
    $detectedSA = cmd /c "gcloud run services describe $appName --region=$LOCATION --project=$PROJECT_ID --format=""value(spec.template.spec.serviceAccountName)""" 2>&1
    
    if ($detectedSA -and $detectedSA -notmatch "ERROR") {
        $detectedSA = $detectedSA.Trim()
        Write-Host "✅ Detected Service Account: $detectedSA" -ForegroundColor Green
        $SERVICE_ACCOUNT = $detectedSA
    } else {
        Write-Host "⚠️ Could not auto-detect (Service '$appName' might not exist or need different name)." -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️ Could not auto-detect SA." -ForegroundColor Yellow
}

$saInput = Read-Host "Enter Service Account Email (Press Enter to use: $SERVICE_ACCOUNT)"
if ($saInput -ne "") {
    $SERVICE_ACCOUNT = $saInput
}

Write-Host "Granting roles/cloudtasks.enqueuer to $SERVICE_ACCOUNT..."

cmd /c "gcloud projects add-iam-policy-binding $PROJECT_ID --member=serviceAccount:$SERVICE_ACCOUNT --role=roles/cloudtasks.enqueuer"

Write-Host "--------------------------------"
Write-Host "✅ Setup Complete. Please try using the Agent again." -ForegroundColor Cyan
