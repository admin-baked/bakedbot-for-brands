#!/bin/bash

# Setup Cloud Scheduler for Blog Scheduled Publishing
# Run this script once to create the hourly cron job

set -e

PROJECT_ID="studio-567050101-bc6e8"
CRON_SECRET="${CRON_SECRET}"

if [ -z "$CRON_SECRET" ]; then
  echo "Error: CRON_SECRET environment variable not set"
  echo "Usage: export CRON_SECRET=your_secret && bash scripts/setup-blog-scheduler.sh"
  exit 1
fi

echo "Setting up blog publishing scheduler for project: $PROJECT_ID"

# Create Cloud Scheduler job for publishing scheduled blog posts
gcloud scheduler jobs create http publish-scheduled-posts-cron \
  --project="$PROJECT_ID" \
  --location="us-central1" \
  --schedule="0 * * * *" \
  --uri="https://bakedbot.ai/api/cron/publish-scheduled-posts" \
  --http-method=POST \
  --headers="Authorization=Bearer ${CRON_SECRET}" \
  --time-zone="America/New_York" \
  --attempt-deadline="300s" \
  || echo "Job may already exist, updating instead..."

# Update if exists
gcloud scheduler jobs update http publish-scheduled-posts-cron \
  --project="$PROJECT_ID" \
  --location="us-central1" \
  --schedule="0 * * * *" \
  --uri="https://bakedbot.ai/api/cron/publish-scheduled-posts" \
  --http-method=POST \
  --headers="Authorization=Bearer ${CRON_SECRET}" \
  --time-zone="America/New_York" \
  --attempt-deadline="300s" \
  2>/dev/null || true

echo ""
echo "✅ Blog publishing scheduler configured!"
echo ""
echo "Schedule: Every hour at minute 0 (0 * * * *)"
echo "Endpoint: https://bakedbot.ai/api/cron/publish-scheduled-posts"
echo "Timezone: America/New_York (EST)"
echo ""
echo "To manually trigger:"
echo "gcloud scheduler jobs run publish-scheduled-posts-cron --project=$PROJECT_ID --location=us-central1"
