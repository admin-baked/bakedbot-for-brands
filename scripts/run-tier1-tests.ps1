# Run Tier 1 Critical System Tests
# Track C: Production Readiness Audit
#
# Usage:
#   .\scripts\run-tier1-tests.ps1 [unit|e2e|all]
#
# Examples:
#   .\scripts\run-tier1-tests.ps1 unit    # Run unit tests only
#   .\scripts\run-tier1-tests.ps1 e2e     # Run E2E tests only
#   .\scripts\run-tier1-tests.ps1 all     # Run all tests (default)

param(
    [string]$TestType = "all"
)

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  Tier 1 Critical System Tests      " -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "ERROR: Must run from project root directory" -ForegroundColor Red
    exit 1
}

# Function to run unit tests
function Run-UnitTests {
    Write-Host "[1/2] Running Unit Tests..." -ForegroundColor Yellow
    Write-Host ""

    Write-Host "  - Deebo Compliance Checks" -ForegroundColor Gray
    npm test -- src/server/agents/__tests__/deebo-compliance.test.ts --silent=false

    Write-Host ""
    Write-Host "  - Billing Webhook Processing" -ForegroundColor Gray
    npm test -- src/app/api/billing/authorize-net-webhook/__tests__/route.test.ts --silent=false

    Write-Host ""
    Write-Host "  - Campaign Sender Service" -ForegroundColor Gray
    npm test -- src/server/services/__tests__/campaign-sender.test.ts --silent=false

    Write-Host ""

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ All unit tests passed" -ForegroundColor Green
    } else {
        Write-Host "❌ Unit tests failed" -ForegroundColor Red
        return $false
    }

    return $true
}

# Function to run E2E tests
function Run-E2ETests {
    Write-Host "[2/2] Running E2E Tests..." -ForegroundColor Yellow
    Write-Host ""

    # Check if dev server is running
    Write-Host "Checking if dev server is running..." -ForegroundColor Gray
    $devServerRunning = $false
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            $devServerRunning = $true
        }
    } catch {
        $devServerRunning = $false
    }

    if (-not $devServerRunning) {
        Write-Host ""
        Write-Host "⚠️  Dev server not running on http://localhost:3000" -ForegroundColor Yellow
        Write-Host "   Start dev server in another terminal: npm run dev" -ForegroundColor Gray
        Write-Host ""
        $continue = Read-Host "Continue anyway? (y/N)"
        if ($continue -ne "y") {
            Write-Host "Exiting..." -ForegroundColor Gray
            return $false
        }
    } else {
        Write-Host "✅ Dev server is running" -ForegroundColor Green
        Write-Host ""
    }

    Write-Host "  - Campaign Send Flow" -ForegroundColor Gray
    npx playwright test tests/e2e/campaign-send-flow.spec.ts

    Write-Host ""
    Write-Host "  - POS Sync Flow" -ForegroundColor Gray
    npx playwright test tests/e2e/pos-sync-flow.spec.ts

    Write-Host ""
    Write-Host "  - Public Menu Age Gate" -ForegroundColor Gray
    npx playwright test tests/e2e/public-menu-age-gate.spec.ts

    Write-Host ""

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ All E2E tests passed" -ForegroundColor Green
    } else {
        Write-Host "❌ E2E tests failed" -ForegroundColor Red
        return $false
    }

    return $true
}

# Main execution
$unitPassed = $true
$e2ePassed = $true

switch ($TestType.ToLower()) {
    "unit" {
        $unitPassed = Run-UnitTests
    }
    "e2e" {
        $e2ePassed = Run-E2ETests
    }
    "all" {
        $unitPassed = Run-UnitTests
        Write-Host ""
        Write-Host "=====================================" -ForegroundColor Cyan
        Write-Host ""
        $e2ePassed = Run-E2ETests
    }
    default {
        Write-Host "ERROR: Invalid test type '$TestType'" -ForegroundColor Red
        Write-Host "Usage: .\scripts\run-tier1-tests.ps1 [unit|e2e|all]" -ForegroundColor Gray
        exit 1
    }
}

# Summary
Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  Test Summary                      " -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

if ($TestType -eq "all") {
    Write-Host "Unit Tests:  " -NoNewline
    if ($unitPassed) {
        Write-Host "✅ PASSED" -ForegroundColor Green
    } else {
        Write-Host "❌ FAILED" -ForegroundColor Red
    }

    Write-Host "E2E Tests:   " -NoNewline
    if ($e2ePassed) {
        Write-Host "✅ PASSED" -ForegroundColor Green
    } else {
        Write-Host "❌ FAILED" -ForegroundColor Red
    }
    Write-Host ""

    if ($unitPassed -and $e2ePassed) {
        Write-Host "🎉 All Tier 1 tests passed!" -ForegroundColor Green
        exit 0
    } else {
        Write-Host "⚠️  Some tests failed. Review output above." -ForegroundColor Yellow
        exit 1
    }
} elseif ($TestType -eq "unit") {
    if ($unitPassed) {
        Write-Host "✅ Unit tests passed" -ForegroundColor Green
        exit 0
    } else {
        Write-Host "❌ Unit tests failed" -ForegroundColor Red
        exit 1
    }
} else {
    if ($e2ePassed) {
        Write-Host "✅ E2E tests passed" -ForegroundColor Green
        exit 0
    } else {
        Write-Host "❌ E2E tests failed" -ForegroundColor Red
        exit 1
    }
}
