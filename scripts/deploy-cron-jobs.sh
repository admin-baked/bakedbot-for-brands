#!/bin/bash

# Deploy Cloud Scheduler Cron Jobs for Critical Revenue Systems
# Last updated: 2026-04-17

set -e  # Exit on error

PROJECT_ID="studio-567050101"
LOCATION="us-central1"
TIMEZONE="America/New_York"
BASE_URL="https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Deploying Cloud Scheduler Cron Jobs${NC}"
echo "Project: $PROJECT_ID"
echo "Location: $LOCATION"
echo "Base URL: $BASE_URL"
echo ""

# Check if CRON_SECRET is set
if [ -z "$CRON_SECRET" ]; then
  echo -e "${RED}Error: CRON_SECRET environment variable not set${NC}"
  echo "Run: export CRON_SECRET=\$(gcloud secrets versions access latest --secret=CRON_SECRET --project=$PROJECT_ID)"
  exit 1
fi

echo -e "${YELLOW}CRON_SECRET loaded from environment${NC}"
echo ""

# Function to create or update a cron job
create_or_update_job() {
  local job_name=$1
  local schedule=$2
  local uri=$3
  local description=$4
  local timeout=$5
  local max_retries=$6

  echo -e "${YELLOW}Configuring: $job_name${NC}"

  # Check if job exists
  if gcloud scheduler jobs describe "$job_name" \
      --location="$LOCATION" \
      --project="$PROJECT_ID" \
      --quiet &>/dev/null; then
    echo "  Job exists, updating..."
    gcloud scheduler jobs update http "$job_name" \
      --location="$LOCATION" \
      --schedule="$schedule" \
      --uri="$uri" \
      --http-method=POST \
      --headers="Content-Type=application/json" \
      --headers="Authorization=Bearer $CRON_SECRET" \
      --time-zone="$TIMEZONE" \
      --description="$description" \
      --attempt-deadline="$timeout" \
      --max-retry-attempts="$max_retries" \
      --project="$PROJECT_ID" \
      --quiet
    echo -e "${GREEN}  ✓ Updated successfully${NC}"
  else
    echo "  Job doesn't exist, creating..."
    gcloud scheduler jobs create http "$job_name" \
      --location="$LOCATION" \
      --schedule="$schedule" \
      --uri="$uri" \
      --http-method=POST \
      --headers="Content-Type=application/json" \
      --headers="Authorization=Bearer $CRON_SECRET" \
      --time-zone="$TIMEZONE" \
      --description="$description" \
      --attempt-deadline="$timeout" \
      --max-retry-attempts="$max_retries" \
      --min-backoff=10s \
      --max-backoff=60s \
      --project="$PROJECT_ID" \
      --quiet
    echo -e "${GREEN}  ✓ Created successfully${NC}"
  fi
  echo ""
}

# 1. Bundle Transitions Cron (Every 5 minutes)
create_or_update_job \
  "bundle-transitions-cron" \
  "*/5 * * * *" \
  "$BASE_URL/api/cron/bundle-transitions" \
  "Auto-activate/expire bundles every 5 minutes" \
  "60s" \
  "3"

# 2. Churn Prediction Cron (Weekly Sunday 2 AM)
create_or_update_job \
  "churn-prediction-cron" \
  "0 2 * * 0" \
  "$BASE_URL/api/cron/churn-prediction" \
  "Weekly churn prediction (Sunday 2 AM)" \
  "600s" \
  "2"

# ---------------------------------------------------------------------------
# DayDay Megacron — all jobs point to /api/cron/dayday with typed body
# ---------------------------------------------------------------------------

# 3. DayDay Discovery (Daily 6 AM ET)
create_or_update_job \
  "dayday-discovery" \
  "0 11 * * *" \
  "$BASE_URL/api/cron/dayday?type=discovery" \
  "DayDay domestic market discovery — daily 6 AM ET (5 markets/run)" \
  "300s" \
  "1"

# 4. DayDay International Discovery (Daily 7 AM ET)
create_or_update_job \
  "dayday-international-discovery" \
  "0 12 * * *" \
  "$BASE_URL/api/cron/dayday?type=international" \
  "DayDay international market discovery — daily 7 AM ET (2 markets/run)" \
  "300s" \
  "1"

# 5. DayDay SEO Report (Daily 8 AM ET)
create_or_update_job \
  "dayday-seo-report" \
  "0 13 * * *" \
  "$BASE_URL/api/cron/dayday?type=seo-report" \
  "DayDay GSC + GA4 SEO report → Slack — daily 8 AM ET" \
  "300s" \
  "1"

# 6. DayDay Weekly Review (Monday 8 AM ET)
create_or_update_job \
  "dayday-review" \
  "0 13 * * 1" \
  "$BASE_URL/api/cron/dayday?type=review" \
  "DayDay weekly discovery review — Monday 8 AM ET" \
  "300s" \
  "1"

# 7. DayDay Brand Page SEO Audit (Monday 9 AM ET)
create_or_update_job \
  "dayday-brand-page-seo" \
  "0 14 * * 1" \
  "$BASE_URL/api/cron/dayday?type=brand-page-seo" \
  "DayDay brand page SEO audit — weekly Monday 9 AM ET (GSC impressions/clicks for all brand+dispensary pages)" \
  "540s" \
  "1"

echo -e "${GREEN}All cron jobs deployed successfully!${NC}"
echo ""
echo "To verify:"
echo "  gcloud scheduler jobs list --location=$LOCATION --project=$PROJECT_ID"
echo ""
echo "To test manually:"
echo "  gcloud scheduler jobs run dayday-brand-page-seo --location=$LOCATION --project=$PROJECT_ID"
echo "  gcloud scheduler jobs run bundle-transitions-cron --location=$LOCATION --project=$PROJECT_ID"
echo "  gcloud scheduler jobs run churn-prediction-cron --location=$LOCATION --project=$PROJECT_ID"
