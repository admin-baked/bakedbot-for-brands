#!/bin/bash

# Setup Weekly Nurture Email Cloud Schedulers
#
# Creates Cloud Scheduler jobs for each user segment's weekly nurture emails.
# Run with: bash scripts/setup-weekly-nurture-schedulers.sh

set -e

PROJECT_ID="studio-567050101-bc6e8"
LOCATION="us-central1"
BASE_URL="https://bakedbot.ai"

# Get CRON_SECRET (must be set in environment or Secret Manager)
if [ -z "$CRON_SECRET" ]; then
    echo "❌ CRON_SECRET not set. Please set it first:"
    echo "   export CRON_SECRET=\$(gcloud secrets versions access latest --secret=CRON_SECRET)"
    exit 1
fi

echo "🚀 Creating Weekly Nurture Cloud Scheduler Jobs..."
echo ""

# 1. Customer Weekly Nurture (Every Monday 9am EST)
echo "📧 Creating Customer Weekly Nurture..."
gcloud scheduler jobs create http customer-weekly-nurture \
    --project=$PROJECT_ID \
    --location=$LOCATION \
    --schedule="0 9 * * 1" \
    --time-zone="America/New_York" \
    --uri="$BASE_URL/api/jobs/weekly-nurture" \
    --http-method=POST \
    --headers="Authorization=Bearer $CRON_SECRET,Content-Type=application/json" \
    --message-body='{"segment":"customer","playbookId":"welcome_customer"}' \
    --description="Weekly nurture emails for customers (deals, education, loyalty)" \
    || echo "⚠️  Job already exists or failed"

# 2. Super User Weekly Update (Every Monday 8am EST)
echo "🚀 Creating Super User Weekly Update..."
gcloud scheduler jobs create http super-user-weekly-update \
    --project=$PROJECT_ID \
    --location=$LOCATION \
    --schedule="0 8 * * 1" \
    --time-zone="America/New_York" \
    --uri="$BASE_URL/api/jobs/weekly-nurture" \
    --http-method=POST \
    --headers="Authorization=Bearer $CRON_SECRET,Content-Type=application/json" \
    --message-body='{"segment":"super_user","playbookId":"welcome_super_user"}' \
    --description="Weekly company updates for BakedBot team (growth, wins, competitive intel)" \
    || echo "⚠️  Job already exists or failed"

# 3. Dispensary Weekly Insights (Every Monday 10am EST)
echo "💼 Creating Dispensary Weekly Insights..."
gcloud scheduler jobs create http dispensary-weekly-insights \
    --project=$PROJECT_ID \
    --location=$LOCATION \
    --schedule="0 10 * * 1" \
    --time-zone="America/New_York" \
    --uri="$BASE_URL/api/jobs/weekly-nurture" \
    --http-method=POST \
    --headers="Authorization=Bearer $CRON_SECRET,Content-Type=application/json" \
    --message-body='{"segment":"dispensary_owner","playbookId":"welcome_dispensary"}' \
    --description="Weekly insights for dispensaries (inventory, compliance, retention)" \
    || echo "⚠️  Job already exists or failed"

# 4. Brand Weekly Marketing Tips (Every Monday 11am EST)
echo "🎨 Creating Brand Weekly Marketing Tips..."
gcloud scheduler jobs create http brand-weekly-marketing \
    --project=$PROJECT_ID \
    --location=$LOCATION \
    --schedule="0 11 * * 1" \
    --time-zone="America/New_York" \
    --uri="$BASE_URL/api/jobs/weekly-nurture" \
    --http-method=POST \
    --headers="Authorization=Bearer $CRON_SECRET,Content-Type=application/json" \
    --message-body='{"segment":"brand_marketer","playbookId":"welcome_brand"}' \
    --description="Weekly marketing tips for brands (campaigns, content ideas, competitive intel)" \
    || echo "⚠️  Job already exists or failed"

# 5. Lead Weekly Value Emails (Every Wednesday 10am EST)
echo "🧲 Creating Lead Weekly Value Emails..."
gcloud scheduler jobs create http lead-weekly-value \
    --project=$PROJECT_ID \
    --location=$LOCATION \
    --schedule="0 10 * * 3" \
    --time-zone="America/New_York" \
    --uri="$BASE_URL/api/jobs/weekly-nurture" \
    --http-method=POST \
    --headers="Authorization=Bearer $CRON_SECRET,Content-Type=application/json" \
    --message-body='{"segment":"lead","playbookId":"welcome_lead"}' \
    --description="Weekly value emails for leads (education, case studies, demo invites)" \
    || echo "⚠️  Job already exists or failed"

echo ""
echo "✅ Weekly Nurture Schedulers Created!"
echo ""
echo "Schedule Summary:"
echo "  🌿 Customer: Every Monday 9am EST"
echo "  🚀 Super User: Every Monday 8am EST"
echo "  💼 Dispensary: Every Monday 10am EST"
echo "  🎨 Brand: Every Monday 11am EST"
echo "  🧲 Lead: Every Wednesday 10am EST"
echo ""
echo "Verify jobs:"
echo "  gcloud scheduler jobs list --location=$LOCATION --filter='name:nurture OR name:update OR name:insights OR name:marketing OR name:value'"
echo ""
echo "Test a job manually:"
echo "  gcloud scheduler jobs run customer-weekly-nurture --location=$LOCATION"
echo ""
