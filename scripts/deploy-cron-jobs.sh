#!/bin/bash

# Deploy Cloud Scheduler Cron Jobs for Critical Revenue Systems
# Last updated: 2026-02-20

set -e  # Exit on error

PROJECT_ID="studio-567050101-bc6e8"
LOCATION="us-central1"
TIMEZONE="America/Chicago"
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

echo -e "${GREEN}All cron jobs deployed successfully!${NC}"
echo ""
echo "To verify:"
echo "  gcloud scheduler jobs list --location=$LOCATION --project=$PROJECT_ID"
echo ""
echo "To test manually:"
echo "  gcloud scheduler jobs run bundle-transitions-cron --location=$LOCATION --project=$PROJECT_ID"
echo "  gcloud scheduler jobs run churn-prediction-cron --location=$LOCATION --project=$PROJECT_ID"
