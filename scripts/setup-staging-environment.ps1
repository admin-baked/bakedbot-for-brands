# =========================================
# BakedBot Staging Environment Setup
# =========================================
# Creates staging Firebase project and copies all secrets from production
# Estimated time: 1 hour (mostly secret copying)
#
# Prerequisites:
# - Firebase CLI installed and authenticated
# - gcloud CLI installed and authenticated
# - Access to studio-567050101-bc6e8 project

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "BakedBot Staging Environment Setup" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

$PROD_PROJECT = "studio-567050101-bc6e8"
$STAGING_PROJECT = "studio-567050101-bc6e8-staging"
$BACKEND_NAME = "bakedbot-staging"
$LOCATION = "us-central1"

# Step 1: Create staging Firebase project
Write-Host "[1/5] Creating staging Firebase project..." -ForegroundColor Yellow
$createProject = Read-Host "Create new Firebase project '$STAGING_PROJECT'? (y/n)"
if ($createProject -eq "y") {
    firebase projects:create $STAGING_PROJECT
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to create Firebase project" -ForegroundColor Red
        exit 1
    }

    # Add staging alias to .firebaserc
    firebase use --add $STAGING_PROJECT
    Write-Host "✓ Firebase project created and added to .firebaserc" -ForegroundColor Green
} else {
    Write-Host "⊘ Skipped project creation" -ForegroundColor Gray
}

# Step 2: Create App Hosting backend
Write-Host ""
Write-Host "[2/5] Creating App Hosting backend..." -ForegroundColor Yellow
$createBackend = Read-Host "Create App Hosting backend '$BACKEND_NAME'? (y/n)"
if ($createBackend -eq "y") {
    Write-Host "NOTE: You'll need to provide your GitHub repo URL during setup" -ForegroundColor Cyan

    firebase apphosting:backends:create $BACKEND_NAME `
        --project=$STAGING_PROJECT `
        --location=$LOCATION

    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to create App Hosting backend" -ForegroundColor Red
        exit 1
    }

    Write-Host "✓ App Hosting backend created" -ForegroundColor Green
    Write-Host "IMPORTANT: Configure backend to deploy from 'develop' branch in Firebase Console" -ForegroundColor Yellow
} else {
    Write-Host "⊘ Skipped backend creation" -ForegroundColor Gray
}

# Step 3: Get list of all production secrets
Write-Host ""
Write-Host "[3/5] Fetching production secrets..." -ForegroundColor Yellow
$secrets = gcloud secrets list --project=$PROD_PROJECT --format="value(name)" 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to fetch production secrets" -ForegroundColor Red
    Write-Host $secrets -ForegroundColor Red
    exit 1
}

$secretList = $secrets -split "`n" | Where-Object { $_ -ne "" }
$totalSecrets = $secretList.Count
Write-Host "✓ Found $totalSecrets production secrets" -ForegroundColor Green

# Step 4: Copy secrets to staging
Write-Host ""
Write-Host "[4/5] Copying secrets to staging..." -ForegroundColor Yellow
Write-Host "This will take ~30-45 minutes for $totalSecrets secrets" -ForegroundColor Cyan
Write-Host ""

$copiedCount = 0
$skippedCount = 0
$errorCount = 0

foreach ($secretName in $secretList) {
    $progress = [math]::Round(($copiedCount / $totalSecrets) * 100, 1)
    Write-Host "[$progress%] Processing: $secretName" -ForegroundColor Cyan

    # Check if secret already exists in staging
    $existingSecret = gcloud secrets describe $secretName --project=$STAGING_PROJECT 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ⊘ Already exists in staging, skipping..." -ForegroundColor Gray
        $skippedCount++
        continue
    }

    # Get secret value from production
    Write-Host "  → Fetching from production..." -NoNewline
    $secretValue = gcloud secrets versions access latest --secret=$secretName --project=$PROD_PROJECT 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host " ERROR" -ForegroundColor Red
        Write-Host "    Failed to fetch: $secretValue" -ForegroundColor Red
        $errorCount++
        continue
    }
    Write-Host " ✓" -ForegroundColor Green

    # Create secret in staging
    Write-Host "  → Creating in staging..." -NoNewline
    $secretValue | Out-File -FilePath "temp_secret.txt" -Encoding ASCII -NoNewline
    gcloud secrets create $secretName --data-file="temp_secret.txt" --project=$STAGING_PROJECT 2>&1 | Out-Null
    Remove-Item "temp_secret.txt" -ErrorAction SilentlyContinue

    if ($LASTEXITCODE -ne 0) {
        Write-Host " ERROR" -ForegroundColor Red
        $errorCount++
        continue
    }
    Write-Host " ✓" -ForegroundColor Green

    # Grant IAM access to App Hosting backend
    Write-Host "  → Granting IAM access..." -NoNewline
    firebase apphosting:secrets:grantaccess $secretName --backend=$BACKEND_NAME --project=$STAGING_PROJECT 2>&1 | Out-Null

    if ($LASTEXITCODE -ne 0) {
        Write-Host " ERROR" -ForegroundColor Red
        $errorCount++
        continue
    }
    Write-Host " ✓" -ForegroundColor Green

    $copiedCount++
    Write-Host "  ✓ Complete ($copiedCount/$totalSecrets)" -ForegroundColor Green
    Write-Host ""
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Secret Copy Summary" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Copied:  $copiedCount" -ForegroundColor Green
Write-Host "Skipped: $skippedCount" -ForegroundColor Gray
Write-Host "Errors:  $errorCount" -ForegroundColor $(if ($errorCount -eq 0) { "Green" } else { "Red" })
Write-Host ""

# Step 5: Create GitHub Actions workflow
Write-Host "[5/5] Creating GitHub Actions workflow..." -ForegroundColor Yellow
$createWorkflow = Read-Host "Create .github/workflows/deploy-staging.yml? (y/n)"
if ($createWorkflow -eq "y") {
    $workflowContent = @"
name: Deploy to Staging

on:
  push:
    branches: [develop]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci --legacy-peer-deps

      - name: Run type check
        run: npm run check:types

      - name: Run tests
        run: npm test -- --passWithNoTests

      # Firebase App Hosting auto-deploys from 'develop' branch
      # No manual deploy command needed
"@

    $workflowDir = ".github/workflows"
    if (-not (Test-Path $workflowDir)) {
        New-Item -ItemType Directory -Path $workflowDir -Force | Out-Null
    }

    $workflowContent | Out-File -FilePath "$workflowDir/deploy-staging.yml" -Encoding UTF8
    Write-Host "✓ GitHub Actions workflow created" -ForegroundColor Green
} else {
    Write-Host "⊘ Skipped workflow creation" -ForegroundColor Gray
}

# Summary
Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Configure App Hosting backend to deploy from 'develop' branch:" -ForegroundColor White
Write-Host "   https://console.firebase.google.com/project/$STAGING_PROJECT/apphosting" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Create 'develop' branch if it doesn't exist:" -ForegroundColor White
Write-Host "   git checkout -b develop" -ForegroundColor Cyan
Write-Host "   git push -u origin develop" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Test staging deployment:" -ForegroundColor White
Write-Host "   git checkout develop" -ForegroundColor Cyan
Write-Host "   git commit --allow-empty -m 'Test staging deploy'" -ForegroundColor Cyan
Write-Host "   git push origin develop" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Verify staging URL (will be shown in Firebase Console after first deploy)" -ForegroundColor White
Write-Host ""

if ($errorCount -gt 0) {
    Write-Host "⚠️  WARNING: $errorCount secrets failed to copy. Review errors above." -ForegroundColor Yellow
    Write-Host "   You may need to manually create these secrets in staging." -ForegroundColor Yellow
}

Write-Host "=========================================" -ForegroundColor Cyan
