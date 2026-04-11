#!/bin/bash
# create-qa-scheduler-jobs.sh — Create Cloud Scheduler jobs for autonomous QA
#
# Usage:
#   bash scripts/create-qa-scheduler-jobs.sh
#   CRON_SECRET=xxx bash scripts/create-qa-scheduler-jobs.sh
#
# Creates two jobs:
#   1. nightly-qa-suite   — Full QA suite at 2 AM CST, reports to #ceo
#   2. post-deploy-qa     — Triggered manually after deploys (paused by default)

set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-studio-567050101}"
LOCATION="us-central1"
BASE_URL="${PROD_URL:-https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app}"

# CRON_SECRET from env or .env.local
if [ -z "${CRON_SECRET:-}" ]; then
    if [ -f .env.local ]; then
        CRON_SECRET=$(grep '^CRON_SECRET=' .env.local | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")
    fi
fi

if [ -z "${CRON_SECRET:-}" ]; then
    echo "ERROR: CRON_SECRET not set. Export it or add to .env.local"
    exit 1
fi

echo "=== Creating QA Scheduler Jobs ==="
echo "Project: $PROJECT_ID | Location: $LOCATION"
echo "Base URL: $BASE_URL"
echo ""

# ============================================================================
# Job 1: Nightly QA Suite — 2 AM CST daily
# ============================================================================

JOB_NAME="nightly-qa-suite"
SCHEDULE="0 2 * * *"
ENDPOINT="/api/cron/qa-suite"
DESCRIPTION="Nightly QA suite — smoke tests + Slack report + auto-file bugs. Ralph Wiggum loop."

echo "Creating: $JOB_NAME ($SCHEDULE)"

gcloud scheduler jobs create http "$JOB_NAME" \
  --location="$LOCATION" \
  --schedule="$SCHEDULE" \
  --uri="${BASE_URL}${ENDPOINT}" \
  --http-method=POST \
  --headers="Authorization=Bearer ${CRON_SECRET},Content-Type=application/json" \
  --message-body='{"trigger":"nightly","fileBugsOnFailure":true}' \
  --time-zone="America/Chicago" \
  --description="$DESCRIPTION" \
  --attempt-deadline=120s \
  --max-retry-attempts=1 \
  --project="$PROJECT_ID" \
  2>/dev/null || gcloud scheduler jobs update http "$JOB_NAME" \
    --location="$LOCATION" \
    --schedule="$SCHEDULE" \
    --uri="${BASE_URL}${ENDPOINT}" \
    --http-method=POST \
    --headers="Authorization=Bearer ${CRON_SECRET},Content-Type=application/json" \
    --message-body='{"trigger":"nightly","fileBugsOnFailure":true}' \
    --time-zone="America/Chicago" \
    --description="$DESCRIPTION" \
    --attempt-deadline=120s \
    --max-retry-attempts=1 \
    --project="$PROJECT_ID"

echo "  -> Done"

# ============================================================================
# Job 2: Post-Deploy QA (paused — triggered by deploy pipeline or Linus)
# ============================================================================

JOB_NAME="post-deploy-qa"
SCHEDULE="0 0 1 1 *"  # Never runs on schedule — manual trigger only
ENDPOINT="/api/cron/qa-suite"
DESCRIPTION="Post-deploy QA suite — triggered manually by deploy pipeline or Linus"

echo "Creating: $JOB_NAME (paused — manual trigger)"

gcloud scheduler jobs create http "$JOB_NAME" \
  --location="$LOCATION" \
  --schedule="$SCHEDULE" \
  --uri="${BASE_URL}${ENDPOINT}" \
  --http-method=POST \
  --headers="Authorization=Bearer ${CRON_SECRET},Content-Type=application/json" \
  --message-body='{"trigger":"post-deploy","fileBugsOnFailure":true}' \
  --time-zone="America/Chicago" \
  --description="$DESCRIPTION" \
  --attempt-deadline=120s \
  --max-retry-attempts=1 \
  --project="$PROJECT_ID" \
  2>/dev/null || gcloud scheduler jobs update http "$JOB_NAME" \
    --location="$LOCATION" \
    --schedule="$SCHEDULE" \
    --uri="${BASE_URL}${ENDPOINT}" \
    --http-method=POST \
    --headers="Authorization=Bearer ${CRON_SECRET},Content-Type=application/json" \
    --message-body='{"trigger":"post-deploy","fileBugsOnFailure":true}' \
    --time-zone="America/Chicago" \
    --description="$DESCRIPTION" \
    --attempt-deadline=120s \
    --max-retry-attempts=1 \
    --project="$PROJECT_ID"

# Pause the post-deploy job (it's manually triggered)
gcloud scheduler jobs pause "$JOB_NAME" \
  --location="$LOCATION" \
  --project="$PROJECT_ID" 2>/dev/null || true

echo "  -> Done (paused)"

# ============================================================================
# Job 3: Nightly Security Scan — 3 AM CST daily (Red Agent — RARV patrol)
# ============================================================================

JOB_NAME="nightly-security-scan"
SCHEDULE="0 3 * * *"
ENDPOINT="/api/cron/security-scan"
DESCRIPTION="Nightly security scan — OWASP checks, auth probes, header audit, injection tests. Red agent RARV patrol."

echo "Creating: $JOB_NAME ($SCHEDULE)"

gcloud scheduler jobs create http "$JOB_NAME" \
  --location="$LOCATION" \
  --schedule="$SCHEDULE" \
  --uri="${BASE_URL}${ENDPOINT}" \
  --http-method=POST \
  --headers="Authorization=Bearer ${CRON_SECRET},Content-Type=application/json" \
  --message-body='{"scanType":"full"}' \
  --time-zone="America/Chicago" \
  --description="$DESCRIPTION" \
  --attempt-deadline=120s \
  --max-retry-attempts=1 \
  --project="$PROJECT_ID" \
  2>/dev/null || gcloud scheduler jobs update http "$JOB_NAME" \
    --location="$LOCATION" \
    --schedule="$SCHEDULE" \
    --uri="${BASE_URL}${ENDPOINT}" \
    --http-method=POST \
    --headers="Authorization=Bearer ${CRON_SECRET},Content-Type=application/json" \
    --message-body='{"scanType":"full"}' \
    --time-zone="America/Chicago" \
    --description="$DESCRIPTION" \
    --attempt-deadline=120s \
    --max-retry-attempts=1 \
    --project="$PROJECT_ID"

echo "  -> Done"

echo ""
echo "=== QA & Security Scheduler Jobs Created ==="
echo ""
echo "Nightly QA:     2 AM CST daily (active)"
echo "Post-Deploy QA: Manual trigger (paused)"
echo ""
echo "To trigger post-deploy QA manually:"
echo "  gcloud scheduler jobs run post-deploy-qa --location=$LOCATION --project=$PROJECT_ID"
echo ""
echo "To test nightly QA now:"
echo "  gcloud scheduler jobs run nightly-qa-suite --location=$LOCATION --project=$PROJECT_ID"
