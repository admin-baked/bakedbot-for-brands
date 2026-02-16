# Check Firebase App Hosting deployment status

$PROJECT_ID = "studio-567050101-bc6e8"
$BACKEND = "bakedbot-prod"

Write-Host "Checking deployment status for backend: $BACKEND" -ForegroundColor Cyan
Write-Host ""

# List Cloud Run services (Firebase App Hosting deploys to Cloud Run)
Write-Host "Cloud Run services:" -ForegroundColor Yellow
gcloud run services list --platform=managed --region=us-central1 --project=$PROJECT_ID | Select-String -Pattern "bakedbot"

Write-Host ""
Write-Host "To see detailed logs for errors:" -ForegroundColor Yellow
Write-Host "  gcloud run services logs read bakedbot-prod --region=us-central1 --project=$PROJECT_ID --limit=50" -ForegroundColor Gray
Write-Host ""
Write-Host "To check environment variables:" -ForegroundColor Yellow
Write-Host "  gcloud run services describe bakedbot-prod --region=us-central1 --project=$PROJECT_ID --format='get(spec.template.spec.containers[0].env)'" -ForegroundColor Gray
