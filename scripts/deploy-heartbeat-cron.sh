#!/bin/bash
# Deploy Heartbeat Cron Job to Google Cloud Scheduler
# Run this script after authenticating with: gcloud auth login

set -e

PROJECT_ID="bakedbot-prod"
REGION="us-central1"
SERVICE_URL="https://bakedbot.ai/api/cron/heartbeat"
SCHEDULE="*/5 * * * *"  # Every 5 minutes
JOB_NAME="heartbeat-cron"

echo "🚀 Deploying Heartbeat Cron Job..."
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo "Schedule: Every 5 minutes"
echo ""

# Check if job already exists
if gcloud scheduler jobs describe $JOB_NAME --location=$REGION --project=$PROJECT_ID &> /dev/null; then
    echo "⚠️  Job '$JOB_NAME' already exists. Updating..."

    gcloud scheduler jobs update http $JOB_NAME \
        --location=$REGION \
        --project=$PROJECT_ID \
        --schedule="$SCHEDULE" \
        --uri="$SERVICE_URL" \
        --http-method=POST \
        --headers="Content-Type=application/json" \
        --message-body='{"source":"cloud-scheduler"}' \
        --time-zone="America/New_York" \
        --attempt-deadline="540s" \
        --max-retry-attempts=3 \
        --max-backoff="3600s" \
        --min-backoff="5s"

    echo "✅ Heartbeat cron job updated successfully!"
else
    echo "📝 Creating new job '$JOB_NAME'..."

    gcloud scheduler jobs create http $JOB_NAME \
        --location=$REGION \
        --project=$PROJECT_ID \
        --schedule="$SCHEDULE" \
        --uri="$SERVICE_URL" \
        --http-method=POST \
        --headers="Content-Type=application/json" \
        --message-body='{"source":"cloud-scheduler"}' \
        --time-zone="America/New_York" \
        --attempt-deadline="540s" \
        --max-retry-attempts=3 \
        --max-backoff="3600s" \
        --min-backoff="5s"

    echo "✅ Heartbeat cron job created successfully!"
fi

echo ""
echo "📊 Job Details:"
gcloud scheduler jobs describe $JOB_NAME --location=$REGION --project=$PROJECT_ID

echo ""
echo "🧪 Testing with manual trigger..."
gcloud scheduler jobs run $JOB_NAME --location=$REGION --project=$PROJECT_ID

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Monitor executions:"
echo "  gcloud scheduler jobs describe $JOB_NAME --location=$REGION --project=$PROJECT_ID"
echo ""
echo "View logs:"
echo "  gcloud scheduler jobs logs read $JOB_NAME --location=$REGION --project=$PROJECT_ID --limit=50"
