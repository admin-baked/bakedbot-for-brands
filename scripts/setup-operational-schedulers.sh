#!/bin/bash

# Setup Cloud Scheduler Jobs for Operational Playbooks
#
# Prerequisites:
# 1. gcloud CLI installed and authenticated
# 2. CRON_SECRET environment variable set
# 3. Operational playbooks seeded to Firestore
#
# Usage:
#   export CRON_SECRET="your-secret-from-secret-manager"
#   bash scripts/setup-operational-schedulers.sh

set -e

# Configuration
PROJECT_ID="studio-567050101-bc6e8"
REGION="us-central1"
BASE_URL="https://bakedbot.ai/api/cron/playbook-runner"

# Check for CRON_SECRET
if [ -z "$CRON_SECRET" ]; then
    echo "❌ Error: CRON_SECRET environment variable not set"
    echo "Run: export CRON_SECRET=\$(gcloud secrets versions access latest --secret=CRON_SECRET)"
    exit 1
fi

echo "============================================"
echo "Setting up Operational Playbook Schedulers"
echo "============================================"
echo ""
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo "Base URL: $BASE_URL"
echo ""

# Function to create or update scheduler job
create_or_update_job() {
    local JOB_NAME=$1
    local SCHEDULE=$2
    local PLAYBOOK_ID=$3
    local DESCRIPTION=$4

    echo "📅 Setting up: $JOB_NAME"
    echo "   Schedule: $SCHEDULE"
    echo "   Playbook: $PLAYBOOK_ID"

    # Check if job exists
    if gcloud scheduler jobs describe "$JOB_NAME" --location="$REGION" --project="$PROJECT_ID" &>/dev/null; then
        echo "   Status: Updating existing job..."
        gcloud scheduler jobs update http "$JOB_NAME" \
            --location="$REGION" \
            --project="$PROJECT_ID" \
            --schedule="$SCHEDULE" \
            --uri="${BASE_URL}?playbookId=${PLAYBOOK_ID}" \
            --http-method=POST \
            --headers="Authorization=Bearer ${CRON_SECRET}" \
            --description="$DESCRIPTION" \
            --quiet
    else
        echo "   Status: Creating new job..."
        gcloud scheduler jobs create http "$JOB_NAME" \
            --location="$REGION" \
            --project="$PROJECT_ID" \
            --schedule="$SCHEDULE" \
            --uri="${BASE_URL}?playbookId=${PLAYBOOK_ID}" \
            --http-method=POST \
            --headers="Authorization=Bearer ${CRON_SECRET}" \
            --description="$DESCRIPTION" \
            --quiet
    fi

    echo "   ✅ Done"
    echo ""
}

# Create scheduler jobs
echo "Creating Cloud Scheduler jobs..."
echo ""

# 1. Daily System Health Check (Mon-Fri 9:00 AM EST = 14:00 UTC)
create_or_update_job \
    "ops-daily-health-check" \
    "0 14 * * 1-5" \
    "ops_daily_health_check" \
    "Daily system health monitoring (Mon-Fri 9:00 AM EST)"

# 2. Weekly Growth Review (Monday 8:00 AM EST = 13:00 UTC)
create_or_update_job \
    "ops-weekly-growth-review" \
    "0 13 * * 1" \
    "ops_weekly_growth_review" \
    "Weekly growth analytics and insights (Monday 8:00 AM EST)"

# 3. Integration Health Monitor (Every hour)
create_or_update_job \
    "ops-integration-monitor" \
    "0 * * * *" \
    "ops_integration_monitor" \
    "Hourly integration health monitoring"

# 4. Customer Churn Prevention (Daily 10:00 AM EST = 15:00 UTC)
create_or_update_job \
    "ops-churn-prevention" \
    "0 15 * * *" \
    "ops_churn_prevention" \
    "Daily inactive customer detection and re-engagement (10:00 AM EST)"

echo "============================================"
echo "✅ All scheduler jobs created successfully!"
echo "============================================"
echo ""
echo "Created/Updated Jobs:"
echo "  1. ops-daily-health-check (Mon-Fri 9:00 AM EST)"
echo "  2. ops-weekly-growth-review (Monday 8:00 AM EST)"
echo "  3. ops-integration-monitor (Every hour)"
echo "  4. ops-churn-prevention (Daily 10:00 AM EST)"
echo ""
echo "Verify jobs:"
echo "  gcloud scheduler jobs list --location=$REGION --project=$PROJECT_ID"
echo ""
echo "Test a job manually:"
echo "  gcloud scheduler jobs run ops-daily-health-check --location=$REGION --project=$PROJECT_ID"
echo ""
echo "View logs:"
echo "  gcloud logging read 'resource.type=cloud_scheduler_job' --limit=50 --project=$PROJECT_ID"
echo ""
echo "Next Steps:"
echo "  1. Create API endpoint: /api/cron/playbook-runner/route.ts"
echo "  2. Implement playbook executor service"
echo "  3. Test each job manually before relying on cron"
echo "  4. Monitor execution in Firestore: heartbeat_executions collection"
echo ""
