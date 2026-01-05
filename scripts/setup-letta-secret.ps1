# setup-letta-secret.ps1
# Helper script to configure Letta API Key in Google Secret Manager

$KEY = "sk-let-MGNiODlmMGEtYTliYS00YzYyLWFiMWItZTNlYWU3NDI2ZmZiOjE4NzMxYzQ2LThkYmYtNDJmYi1hZGZhLTk4YWNlZmVlNGE2Mw=="

Write-Host "Creating 'LETTA_API_KEY' secret..."
gcloud secrets create LETTA_API_KEY --replication-policy="automatic" 2>$null

Write-Host "Adding key version..."
$result = echo $KEY | gcloud secrets versions add LETTA_API_KEY --data-file=-

if ($LASTEXITCODE -eq 0) {
    Write-Host "Successfully added secret version." -ForegroundColor Green
} else {
    Write-Host "Error adding secret version. Please check your gcloud auth." -ForegroundColor Red
    exit 1
}

# Attempt to find the App Hosting Service Account
# Usually it is service-<PROJECT_NUMBER>@gcp-sa-firebaseapphosting.iam.gserviceaccount.com

Write-Host "Attempting to grant access to App Hosting Service Account..."
$PROJECT_NUMBER = gcloud projects list --filter="$(gcloud config get-value project)" --format="value(projectNumber)"
$SERVICE_ACCOUNT = "service-${PROJECT_NUMBER}@gcp-sa-firebaseapphosting.iam.gserviceaccount.com"

Write-Host "Detected Service Account: $SERVICE_ACCOUNT"

gcloud secrets add-iam-policy-binding LETTA_API_KEY `
    --member="serviceAccount:${SERVICE_ACCOUNT}" `
    --role="roles/secretmanager.secretAccessor"

if ($LASTEXITCODE -eq 0) {
    Write-Host "Success! Letta API Key is configured and accessible." -ForegroundColor Green
} else {
    Write-Host "Could not automatically grant permissions. Please run manually:" -ForegroundColor Yellow
    Write-Host "gcloud secrets add-iam-policy-binding LETTA_API_KEY --member='serviceAccount:$SERVICE_ACCOUNT' --role='roles/secretmanager.secretAccessor'"
}
