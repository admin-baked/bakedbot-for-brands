#!/usr/bin/env bash
# ============================================================================
# NY Outreach Infrastructure Provisioning
# ============================================================================
#
# Run this script to set up all infrastructure for the NY dispensary outreach
# pipeline. Requires gcloud CLI authenticated + firebase CLI.
#
# Usage:
#   chmod +x scripts/provision-ny-outreach.sh
#   ./scripts/provision-ny-outreach.sh
#
# Or run individual sections manually by copying commands.
# ============================================================================

set -euo pipefail

PROJECT="studio-567050101-bc6e8"
BACKEND="bakedbot-prod"
BASE_URL="https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app"
REGION="us-central1"

echo "============================================"
echo "  NY Outreach Infrastructure Provisioning"
echo "============================================"
echo ""

# ============================================================================
# STEP 1: QuickEmailVerification API Key
# ============================================================================
echo "--- Step 1: QuickEmailVerification Secret ---"

# Check if secret already exists
if gcloud secrets describe QUICKEMAILVERIFICATION_API_KEY --project="$PROJECT" &>/dev/null; then
    echo "Secret QUICKEMAILVERIFICATION_API_KEY already exists."
    # Check if it has versions
    VERSION_COUNT=$(gcloud secrets versions list QUICKEMAILVERIFICATION_API_KEY --project="$PROJECT" --format="value(name)" 2>/dev/null | wc -l)
    if [ "$VERSION_COUNT" -eq 0 ]; then
        echo "WARNING: Secret has 0 versions. Adding value..."
        echo -n "840ee2e610772d299ed35d32736a02a3a3a33dd5a9742026cfeb34636bb2" | \
            gcloud secrets versions add QUICKEMAILVERIFICATION_API_KEY --data-file=- --project="$PROJECT"
        echo "Version added."
    else
        echo "Secret has $VERSION_COUNT version(s). OK."
    fi
else
    echo "Creating QUICKEMAILVERIFICATION_API_KEY secret..."
    echo -n "840ee2e610772d299ed35d32736a02a3a3a33dd5a9742026cfeb34636bb2" | \
        gcloud secrets create QUICKEMAILVERIFICATION_API_KEY --data-file=- --project="$PROJECT"
    echo "Secret created."
fi

# Grant Firebase access
echo "Granting Firebase App Hosting access..."
firebase apphosting:secrets:grantaccess QUICKEMAILVERIFICATION_API_KEY --backend="$BACKEND" || true
echo "Firebase access granted."
echo ""

# ============================================================================
# STEP 2: Cloud Scheduler — Outreach Digest (Twice Daily)
# ============================================================================
echo "--- Step 2: Cloud Scheduler Jobs ---"

# Get CRON_SECRET value for headers
CRON_SECRET=$(gcloud secrets versions access latest --secret=CRON_SECRET --project="$PROJECT" 2>/dev/null || echo "")

if [ -z "$CRON_SECRET" ]; then
    echo "WARNING: Could not read CRON_SECRET. You'll need to set the Authorization header manually."
    echo "Run: gcloud secrets versions access latest --secret=CRON_SECRET --project=$PROJECT"
fi

# Morning Digest — 9 AM EST
echo "Creating ny-outreach-digest-morning..."
gcloud scheduler jobs create http ny-outreach-digest-morning \
    --schedule="0 9 * * *" \
    --time-zone="America/New_York" \
    --uri="${BASE_URL}/api/cron/ny-outreach-digest" \
    --http-method=POST \
    --headers="Authorization=Bearer ${CRON_SECRET}" \
    --location="$REGION" \
    --project="$PROJECT" \
    --description="NY Outreach morning digest to martez@bakedbot.ai" \
    2>/dev/null || \
gcloud scheduler jobs update http ny-outreach-digest-morning \
    --schedule="0 9 * * *" \
    --time-zone="America/New_York" \
    --uri="${BASE_URL}/api/cron/ny-outreach-digest" \
    --http-method=POST \
    --headers="Authorization=Bearer ${CRON_SECRET}" \
    --location="$REGION" \
    --project="$PROJECT" \
    --description="NY Outreach morning digest to martez@bakedbot.ai"
echo "Morning digest job ready."

# Evening Digest — 5 PM EST
echo "Creating ny-outreach-digest-evening..."
gcloud scheduler jobs create http ny-outreach-digest-evening \
    --schedule="0 17 * * *" \
    --time-zone="America/New_York" \
    --uri="${BASE_URL}/api/cron/ny-outreach-digest" \
    --http-method=POST \
    --headers="Authorization=Bearer ${CRON_SECRET}" \
    --location="$REGION" \
    --project="$PROJECT" \
    --description="NY Outreach evening digest to martez@bakedbot.ai" \
    2>/dev/null || \
gcloud scheduler jobs update http ny-outreach-digest-evening \
    --schedule="0 17 * * *" \
    --time-zone="America/New_York" \
    --uri="${BASE_URL}/api/cron/ny-outreach-digest" \
    --http-method=POST \
    --headers="Authorization=Bearer ${CRON_SECRET}" \
    --location="$REGION" \
    --project="$PROJECT" \
    --description="NY Outreach evening digest to martez@bakedbot.ai"
echo "Evening digest job ready."
echo ""

# ============================================================================
# STEP 3: Verify
# ============================================================================
echo "--- Step 3: Verification ---"
echo ""

echo "Checking secret versions..."
gcloud secrets versions list QUICKEMAILVERIFICATION_API_KEY --project="$PROJECT" --format="table(name, state)" 2>/dev/null || true
echo ""

echo "Checking scheduler jobs..."
gcloud scheduler jobs list --location="$REGION" --project="$PROJECT" --format="table(name, schedule, state)" 2>/dev/null | grep "outreach" || true
echo ""

echo "============================================"
echo "  Provisioning Complete!"
echo "============================================"
echo ""
echo "Next steps:"
echo "  1. Deploy: git push origin main"
echo "  2. Test emails: POST ${BASE_URL}/api/outreach/test-emails"
echo "  3. Verify QEV: Settings > Integrations > QuickEmailVerification"
echo ""
