#!/bin/bash

# Create Cloud Scheduler Jobs for Thrive Syracuse
# These 3 jobs handle: POS sync, Loyalty sync, and Playbook execution

set -e

PROJECT_ID="studio-567050101-bc6e8"
LOCATION="us-central1"
BASE_URL="https://bakedbot-prod--${PROJECT_ID}.${LOCATION}.hosted.app"
CRON_SECRET="${CRON_SECRET:-}"

if [ -z "$CRON_SECRET" ]; then
  echo "❌ Error: CRON_SECRET environment variable not set"
  echo "   Run: export CRON_SECRET='<your-secret-value>'"
  exit 1
fi

echo "🔄 Creating Cloud Scheduler jobs for Thrive Syracuse..."
echo "   Project: $PROJECT_ID"
echo "   Location: $LOCATION"
echo "   Base URL: $BASE_URL"
echo ""

# ==========================================
# Job 1: POS Sync (every 30 minutes)
# ==========================================

JOB_NAME="pos-sync-thrive"
SCHEDULE="*/30 * * * *"
ENDPOINT="/api/cron/pos-sync"
DESCRIPTION="Sync customer and order data from Alleaves POS for Thrive Syracuse (every 30 min)"

echo "📝 Creating Job 1: $JOB_NAME"
echo "   Schedule: $SCHEDULE"
echo "   Endpoint: $ENDPOINT"

gcloud scheduler jobs create http "$JOB_NAME" \
  --location="$LOCATION" \
  --schedule="$SCHEDULE" \
  --uri="${BASE_URL}${ENDPOINT}?orgId=org_thrive_syracuse" \
  --http-method=POST \
  --headers="Authorization=Bearer\ ${CRON_SECRET}" \
  --time-zone="America/New_York" \
  --description="$DESCRIPTION" \
  --attempt-deadline=300s \
  --max-retry-attempts=2 \
  --project="$PROJECT_ID" \
  2>/dev/null || gcloud scheduler jobs update http "$JOB_NAME" \
    --location="$LOCATION" \
    --schedule="$SCHEDULE" \
    --uri="${BASE_URL}${ENDPOINT}?orgId=org_thrive_syracuse" \
    --http-method=POST \
    --headers="Authorization=Bearer\ ${CRON_SECRET}" \
    --time-zone="America/New_York" \
    --description="$DESCRIPTION" \
    --attempt-deadline=300s \
    --max-retry-attempts=2 \
    --project="$PROJECT_ID"

echo "✅ Job 1 created/updated"
echo ""

# ==========================================
# Job 2: Loyalty Sync (daily 2 AM UTC)
# ==========================================

JOB_NAME="loyalty-sync-thrive"
SCHEDULE="0 2 * * *"
ENDPOINT="/api/cron/loyalty-sync"
DESCRIPTION="Daily loyalty points and tier synchronization from Alleaves for Thrive Syracuse"

echo "📝 Creating Job 2: $JOB_NAME"
echo "   Schedule: $SCHEDULE (2 AM UTC = 9 PM ET)"
echo "   Endpoint: $ENDPOINT"

gcloud scheduler jobs create http "$JOB_NAME" \
  --location="$LOCATION" \
  --schedule="$SCHEDULE" \
  --uri="${BASE_URL}${ENDPOINT}?orgId=org_thrive_syracuse" \
  --http-method=POST \
  --headers="Authorization=Bearer\ ${CRON_SECRET}" \
  --time-zone="UTC" \
  --description="$DESCRIPTION" \
  --attempt-deadline=600s \
  --max-retry-attempts=3 \
  --project="$PROJECT_ID" \
  2>/dev/null || gcloud scheduler jobs update http "$JOB_NAME" \
    --location="$LOCATION" \
    --schedule="$SCHEDULE" \
    --uri="${BASE_URL}${ENDPOINT}?orgId=org_thrive_syracuse" \
    --http-method=POST \
    --headers="Authorization=Bearer\ ${CRON_SECRET}" \
    --time-zone="UTC" \
    --description="$DESCRIPTION" \
    --attempt-deadline=600s \
    --max-retry-attempts=3 \
    --project="$PROJECT_ID"

echo "✅ Job 2 created/updated"
echo ""

# ==========================================
# Job 3: Playbook Runner (daily reports)
# ==========================================

JOB_NAME="playbook-runner-thrive"
SCHEDULE="0 7 * * *"
ENDPOINT="/api/cron/playbook-runner"
DESCRIPTION="Execute daily operational playbooks for Thrive Syracuse (7 AM local)"

echo "📝 Creating Job 3: $JOB_NAME"
echo "   Schedule: $SCHEDULE (7 AM UTC)"
echo "   Endpoint: $ENDPOINT"

gcloud scheduler jobs create http "$JOB_NAME" \
  --location="$LOCATION" \
  --schedule="$SCHEDULE" \
  --uri="${BASE_URL}${ENDPOINT}?orgId=org_thrive_syracuse" \
  --http-method=POST \
  --headers="Authorization=Bearer\ ${CRON_SECRET}" \
  --time-zone="America/New_York" \
  --description="$DESCRIPTION" \
  --attempt-deadline=1800s \
  --max-retry-attempts=2 \
  --project="$PROJECT_ID" \
  2>/dev/null || gcloud scheduler jobs update http "$JOB_NAME" \
    --location="$LOCATION" \
    --schedule="$SCHEDULE" \
    --uri="${BASE_URL}${ENDPOINT}?orgId=org_thrive_syracuse" \
    --http-method=POST \
    --headers="Authorization=Bearer\ ${CRON_SECRET}" \
    --time-zone="America/New_York" \
    --description="$DESCRIPTION" \
    --attempt-deadline=1800s \
    --max-retry-attempts=2 \
    --project="$PROJECT_ID"

echo "✅ Job 3 created/updated"
echo ""

# ==========================================
# Verify All Jobs Created
# ==========================================

echo "🔍 Verifying jobs..."
gcloud scheduler jobs list \
  --location="$LOCATION" \
  --project="$PROJECT_ID" \
  --format="table(name,schedule,lastExecutionTime)" \
  --filter="name:(${JOB_NAME} OR loyalty-sync-thrive OR pos-sync-thrive)"

echo ""
echo "✨ All Cloud Scheduler jobs created successfully!"
echo ""
echo "📋 Summary:"
echo "  • pos-sync-thrive      → Every 30 minutes (Alleaves POS sync)"
echo "  • loyalty-sync-thrive  → Daily 2 AM UTC (Loyalty points sync)"
echo "  • playbook-runner-thrive → Daily 7 AM (Operational playbooks)"
echo ""
echo "🚀 Jobs will automatically execute on their schedule."
echo "   To test immediately: gcloud scheduler jobs run <job-name> --location=$LOCATION --project=$PROJECT_ID"
