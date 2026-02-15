# Verify CRON_SECRET Setup
# Tests both GitHub Actions secret and Firebase endpoint

param(
    [string]$Secret = ""
)

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "🔍 CRON_SECRET Verification Tool" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check if secret was provided
if ([string]::IsNullOrEmpty($Secret)) {
    Write-Host "❌ No secret provided" -ForegroundColor Red
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host '  .\verify-cron-secret.ps1 -Secret "your-secret-here"' -ForegroundColor White
    Write-Host ""
    Write-Host "To get the secret from GitHub Actions:" -ForegroundColor Yellow
    Write-Host "  1. Go to: https://github.com/admin-baked/bakedbot-for-brands/settings/secrets/actions" -ForegroundColor White
    Write-Host "  2. View CRON_SECRET (if you have access)" -ForegroundColor White
    Write-Host ""
    Write-Host "To get the secret from Firebase Secret Manager:" -ForegroundColor Yellow
    Write-Host "  gcloud secrets versions access latest --secret=CRON_SECRET --project=studio-567050101-bc6e8" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "✅ Secret provided (length: $($Secret.Length) chars)" -ForegroundColor Green
Write-Host ""

# Step 2: Test the production endpoint
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "📡 Testing Production Endpoint" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

$endpoint = "https://bakedbot.ai/api/cron/dayday-discovery"
Write-Host "Endpoint: $endpoint" -ForegroundColor White
Write-Host "Method: GET" -ForegroundColor White
Write-Host "Authorization: Bearer ****** (hidden)" -ForegroundColor White
Write-Host ""

try {
    Write-Host "Sending request..." -ForegroundColor Gray

    $headers = @{
        "Authorization" = "Bearer $Secret"
        "User-Agent" = "BakedBot-Verify-Script/1.0"
    }

    $response = Invoke-WebRequest -Uri $endpoint -Method Get -Headers $headers -ErrorAction Stop

    Write-Host ""
    Write-Host "✅ SUCCESS!" -ForegroundColor Green
    Write-Host ""
    Write-Host "HTTP Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor White
    Write-Host $response.Content -ForegroundColor White
    Write-Host ""

    # Try to parse and display JSON results
    try {
        $json = $response.Content | ConvertFrom-Json
        if ($json.success -and $json.result) {
            Write-Host "================================================" -ForegroundColor Cyan
            Write-Host "📊 Day Day Discovery Results" -ForegroundColor Yellow
            Write-Host "================================================" -ForegroundColor Cyan
            Write-Host ""

            if ($json.result.marketsProcessed) {
                Write-Host "Markets Processed: $($json.result.marketsProcessed)" -ForegroundColor White
            }

            if ($json.result.pagesCreated) {
                Write-Host "Pages Created:" -ForegroundColor White
                if ($json.result.pagesCreated.location) {
                    Write-Host "  - Location: $($json.result.pagesCreated.location)" -ForegroundColor White
                }
                if ($json.result.pagesCreated.dispensary) {
                    Write-Host "  - Dispensary: $($json.result.pagesCreated.dispensary)" -ForegroundColor White
                }
                if ($json.result.pagesCreated.brand) {
                    Write-Host "  - Brand: $($json.result.pagesCreated.brand)" -ForegroundColor White
                }
            }

            if ($json.result.pagesOptimized) {
                Write-Host "Pages Optimized: $($json.result.pagesOptimized)" -ForegroundColor White
            }

            Write-Host ""

            if ($json.result.lowCompetitionMarkets -and $json.result.lowCompetitionMarkets.Count -gt 0) {
                Write-Host "Low Competition Markets:" -ForegroundColor White
                foreach ($market in $json.result.lowCompetitionMarkets) {
                    Write-Host "  ✓ $market" -ForegroundColor Green
                }
            }

            if ($json.result.errors -and $json.result.errors.Count -gt 0) {
                Write-Host ""
                Write-Host "Errors:" -ForegroundColor Red
                foreach ($error in $json.result.errors) {
                    Write-Host "  ✗ $error" -ForegroundColor Red
                }
            }
        }
    }
    catch {
        # JSON parsing failed, that's okay - we already showed the raw response
    }

    Write-Host ""
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host "✅ Verification Complete - CRON_SECRET is valid!" -ForegroundColor Green
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host ""
}
catch {
    Write-Host ""
    Write-Host "❌ FAILED" -ForegroundColor Red
    Write-Host ""

    $statusCode = 0
    if ($_.Exception.Response) {
        $statusCode = [int]$_.Exception.Response.StatusCode
    }

    if ($statusCode -eq 401) {
        Write-Host "HTTP Status: 401 Unauthorized" -ForegroundColor Red
        Write-Host ""
        Write-Host "This means:" -ForegroundColor Yellow
        Write-Host "  1. The secret you provided does NOT match the server's CRON_SECRET" -ForegroundColor White
        Write-Host "  2. Or the server's CRON_SECRET environment variable is not set" -ForegroundColor White
        Write-Host ""
        Write-Host "Solutions:" -ForegroundColor Yellow
        Write-Host "  1. Verify you're using the correct secret from Firebase Secret Manager:" -ForegroundColor White
        Write-Host "     gcloud secrets versions access latest --secret=CRON_SECRET --project=studio-567050101-bc6e8" -ForegroundColor Gray
        Write-Host ""
        Write-Host "  2. Update GitHub Actions secret to match:" -ForegroundColor White
        Write-Host "     https://github.com/admin-baked/bakedbot-for-brands/settings/secrets/actions" -ForegroundColor Gray
        Write-Host ""
        Write-Host "  3. Verify Firebase App Hosting has access to the secret:" -ForegroundColor White
        Write-Host "     firebase apphosting:secrets:grantaccess CRON_SECRET --project=studio-567050101-bc6e8" -ForegroundColor Gray
        Write-Host ""
    }
    elseif ($statusCode -eq 500) {
        Write-Host "HTTP Status: 500 Internal Server Error" -ForegroundColor Red
        Write-Host ""
        Write-Host "This might mean:" -ForegroundColor Yellow
        Write-Host "  1. CRON_SECRET is not configured in Firebase App Hosting" -ForegroundColor White
        Write-Host "  2. The secret exists but the app can't access it" -ForegroundColor White
        Write-Host ""
        Write-Host "Check apphosting.yaml:" -ForegroundColor Yellow
        Write-Host "  env:" -ForegroundColor Gray
        Write-Host "    - variable: CRON_SECRET" -ForegroundColor Gray
        Write-Host "      secret: projects/studio-567050101-bc6e8/secrets/CRON_SECRET/versions/latest" -ForegroundColor Gray
        Write-Host "      availability:" -ForegroundColor Gray
        Write-Host "        - RUNTIME" -ForegroundColor Gray
        Write-Host ""
    }
    else {
        if ($statusCode -gt 0) {
            Write-Host "HTTP Status: $statusCode" -ForegroundColor Red
        }
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
    }

    Write-Host "Full Error Details:" -ForegroundColor Gray
    Write-Host $_.Exception -ForegroundColor Gray
    Write-Host ""

    exit 1
}

# Step 3: Additional checks
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "🔧 Additional Checks" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check if gcloud is installed
try {
    $gcloudVersion = gcloud --version 2>&1 | Select-Object -First 1
    Write-Host "✅ gcloud CLI installed: $gcloudVersion" -ForegroundColor Green
    Write-Host ""
    Write-Host "To view the Firebase secret:" -ForegroundColor Yellow
    Write-Host "  gcloud secrets versions access latest --secret=CRON_SECRET --project=studio-567050101-bc6e8" -ForegroundColor White
    Write-Host ""
}
catch {
    Write-Host "INFO: gcloud CLI not found (optional)" -ForegroundColor Yellow
    Write-Host "Install: https://cloud.google.com/sdk/docs/install" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
