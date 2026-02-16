# Check if Firebase App Hosting service account has Secret Manager permissions

$PROJECT_ID = "studio-567050101-bc6e8"
$SECRET_NAME = "CRON_SECRET"

Write-Host "Checking Secret Manager IAM permissions..." -ForegroundColor Cyan
Write-Host ""

# Get the secret's IAM policy
Write-Host "Getting IAM policy for secret: $SECRET_NAME" -ForegroundColor Yellow
gcloud secrets get-iam-policy $SECRET_NAME --project=$PROJECT_ID

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "Expected service accounts that need access:" -ForegroundColor Yellow
Write-Host "  - Firebase App Hosting service account" -ForegroundColor Gray
Write-Host "  - Cloud Run service account" -ForegroundColor Gray
Write-Host "  - Compute Engine default service account" -ForegroundColor Gray
Write-Host ""
Write-Host "If none of these appear above, that's the problem!" -ForegroundColor Yellow
Write-Host ""
Write-Host "To fix, grant Secret Accessor role:" -ForegroundColor Green
Write-Host "  gcloud secrets add-iam-policy-binding CRON_SECRET \\" -ForegroundColor Gray
Write-Host "    --member='serviceAccount:SERVICE_ACCOUNT_EMAIL' \\" -ForegroundColor Gray
Write-Host "    --role='roles/secretmanager.secretAccessor' \\" -ForegroundColor Gray
Write-Host "    --project=$PROJECT_ID" -ForegroundColor Gray
Write-Host "================================================================" -ForegroundColor Cyan
