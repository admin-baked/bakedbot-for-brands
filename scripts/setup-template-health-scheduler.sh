#!/bin/bash

# Set up Cloud Scheduler for daily template health checks
# Run this script to configure automated daily health monitoring

PROJECT_ID="studio-567050101-bc6e8"
REGION="us-central1"
SCHEDULE="0 9 * * *"  # 9 AM EST (daily)
TIMEZONE="America/New_York"
JOB_NAME="template-health-check"
ENDPOINT="https://bakedbot.ai/api/cron/template-health-check"

# Get CRON_SECRET from environment or Secret Manager
if [ -z "$CRON_SECRET" ]; then
  echo "📋 Getting CRON_SECRET from Secret Manager..."
  CRON_SECRET=$(gcloud secrets versions access latest --secret=CRON_SECRET --project=$PROJECT_ID)
fi

echo "🔧 Setting up Cloud Scheduler job..."
echo "   Project: $PROJECT_ID"
echo "   Schedule: $SCHEDULE ($TIMEZONE)"
echo "   Endpoint: $ENDPOINT"

# Create Cloud Scheduler job (HTTP POST)
gcloud scheduler jobs create http $JOB_NAME \
  --schedule="$SCHEDULE" \
  --timezone="$TIMEZONE" \
  --uri="$ENDPOINT" \
  --http-method=POST \
  --location=$REGION \
  --headers="x-cron-secret:$CRON_SECRET,Content-Type:application/json" \
  --message-body='{}' \
  --project=$PROJECT_ID \
  --oidc-service-account-email=cloud-scheduler@$PROJECT_ID.iam.gserviceaccount.com \
  --oidc-token-audience=$ENDPOINT

if [ $? -eq 0 ]; then
  echo "✅ Cloud Scheduler job created successfully!"
  echo ""
  echo "📊 Job Details:"
  echo "   Name: $JOB_NAME"
  echo "   Schedule: Daily at 9 AM EST"
  echo "   Endpoint: $ENDPOINT"
  echo ""
  echo "📝 Next steps:"
  echo "   1. View job: gcloud scheduler jobs describe $JOB_NAME --location=$REGION"
  echo "   2. Test manually: gcloud scheduler jobs run $JOB_NAME --location=$REGION"
  echo "   3. View logs: gcloud logging read \"resource.type=cloud_scheduler_job AND resource.labels.job_id=$JOB_NAME\" --limit 50"
else
  echo "⚠️  Job may already exist. Updating..."
  gcloud scheduler jobs update http $JOB_NAME \
    --schedule="$SCHEDULE" \
    --timezone="$TIMEZONE" \
    --uri="$ENDPOINT" \
    --http-method=POST \
    --location=$REGION \
    --headers="x-cron-secret:$CRON_SECRET,Content-Type:application/json" \
    --message-body='{}' \
    --project=$PROJECT_ID || echo "❌ Update failed. Please check manually."
fi

echo ""
echo "💡 To manually test the job right now:"
echo "   gcloud scheduler jobs run $JOB_NAME --location=$REGION --project=$PROJECT_ID"
