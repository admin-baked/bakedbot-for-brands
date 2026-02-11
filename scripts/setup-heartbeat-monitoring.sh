#!/bin/bash
# Set up Cloud Monitoring alerts for Heartbeat system
# Monitors cron job failures, execution time, and notification delivery

set -e

PROJECT_ID="bakedbot-prod"
NOTIFICATION_CHANNEL="your-email@bakedbot.ai"  # Update with actual email

echo "🔔 Setting up Heartbeat Monitoring Alerts..."
echo "Project: $PROJECT_ID"
echo ""

# Create notification channel (if not exists)
echo "📧 Creating notification channel..."
CHANNEL_ID=$(gcloud alpha monitoring channels create \
    --display-name="Heartbeat Alerts" \
    --type=email \
    --channel-labels=email_address=$NOTIFICATION_CHANNEL \
    --project=$PROJECT_ID \
    --format="value(name)" 2>/dev/null || echo "")

if [ -z "$CHANNEL_ID" ]; then
    echo "⚠️  Notification channel may already exist. Fetching existing..."
    CHANNEL_ID=$(gcloud alpha monitoring channels list \
        --filter="displayName='Heartbeat Alerts'" \
        --project=$PROJECT_ID \
        --format="value(name)" \
        --limit=1)
fi

echo "Channel ID: $CHANNEL_ID"
echo ""

# Alert 1: Cron Job Failures
echo "🚨 Creating alert: Heartbeat Cron Failures..."
gcloud alpha monitoring policies create \
    --notification-channels=$CHANNEL_ID \
    --display-name="Heartbeat: Cron Job Failures" \
    --condition-display-name="Cron failures > 3 in 30 minutes" \
    --condition-threshold-value=3 \
    --condition-threshold-duration=1800s \
    --condition-threshold-comparison=COMPARISON_GT \
    --condition-filter='resource.type="cloud_scheduler_job" AND resource.labels.job_id="heartbeat-cron" AND metric.type="logging.googleapis.com/user/heartbeat_cron_error"' \
    --aggregation-alignment-period=300s \
    --aggregation-per-series-aligner=ALIGN_RATE \
    --project=$PROJECT_ID 2>/dev/null || echo "⚠️  Alert may already exist"

# Alert 2: Slow Execution Time
echo "🚨 Creating alert: Heartbeat Slow Execution..."
gcloud alpha monitoring policies create \
    --notification-channels=$CHANNEL_ID \
    --display-name="Heartbeat: Slow Execution (>30s)" \
    --condition-display-name="Execution time > 30 seconds" \
    --condition-threshold-value=30000 \
    --condition-threshold-duration=0s \
    --condition-threshold-comparison=COMPARISON_GT \
    --condition-filter='resource.type="cloud_run_revision" AND metric.type="run.googleapis.com/request_latencies" AND resource.labels.service_name="bakedbot-prod"' \
    --aggregation-alignment-period=60s \
    --aggregation-per-series-aligner=ALIGN_DELTA \
    --project=$PROJECT_ID 2>/dev/null || echo "⚠️  Alert may already exist"

# Alert 3: No Executions (Cron stopped)
echo "🚨 Creating alert: Heartbeat No Executions..."
gcloud alpha monitoring policies create \
    --notification-channels=$CHANNEL_ID \
    --display-name="Heartbeat: No Executions (15+ min)" \
    --condition-display-name="No heartbeat executions in 15 minutes" \
    --condition-absence-duration=900s \
    --condition-filter='resource.type="cloud_scheduler_job" AND resource.labels.job_id="heartbeat-cron" AND metric.type="logging.googleapis.com/user/heartbeat_execution"' \
    --project=$PROJECT_ID 2>/dev/null || echo "⚠️  Alert may already exist"

echo ""
echo "✅ Monitoring setup complete!"
echo ""
echo "📊 View alerts in Cloud Console:"
echo "  https://console.cloud.google.com/monitoring/alerting/policies?project=$PROJECT_ID"
echo ""
echo "📈 Create custom dashboard:"
echo "  https://console.cloud.google.com/monitoring/dashboards?project=$PROJECT_ID"
echo ""
echo "Recommended metrics to monitor:"
echo "  - Heartbeat execution count (per tenant, per role)"
echo "  - Check success/failure rates"
echo "  - Notification delivery success rate"
echo "  - Average execution time"
echo "  - Cost per execution"
