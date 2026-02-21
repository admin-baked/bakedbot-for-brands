# Cloud Scheduler Setup Guide

> **Critical Revenue Systems Cron Jobs**
> Last updated: 2026-02-20

## Overview

This guide covers the setup of 2 Cloud Scheduler jobs for the critical revenue systems:
1. **Bundle Transitions** - Every 5 minutes
2. **Churn Prediction** - Weekly (Sunday 2 AM)

---

## Prerequisites

- Google Cloud CLI (`gcloud`) installed and authenticated
- Project ID: `studio-567050101-bc6e8`
- Backend: `bakedbot-prod`
- CRON_SECRET configured in Secret Manager (already done)

---

## 1. Bundle Transitions Cron (Every 5 Minutes)

### Purpose
Auto-activate/expire bundles based on:
- Start/end dates
- Time windows (daysOfWeek, timeStart/timeEnd)
- Redemption limits (maxRedemptions)

### Configuration

```bash
gcloud scheduler jobs create http bundle-transitions-cron \
  --location=us-central1 \
  --schedule="*/5 * * * *" \
  --uri="https://bakedbot-prod.web.app/api/cron/bundle-transitions" \
  --http-method=POST \
  --headers="Content-Type=application/json,Authorization=Bearer ${CRON_SECRET}" \
  --time-zone="America/Chicago" \
  --description="Auto-activate/expire bundles every 5 minutes" \
  --attempt-deadline=60s \
  --max-retry-attempts=3 \
  --min-backoff=10s \
  --max-backoff=60s \
  --project=studio-567050101-bc6e8
```

### Manual Test

```bash
# Trigger manually to verify
gcloud scheduler jobs run bundle-transitions-cron \
  --location=us-central1 \
  --project=studio-567050101-bc6e8
```

### Expected Response

```json
{
  "success": true,
  "jobDuration": 1234,
  "schedulerDuration": 987,
  "transitions": [
    {
      "bundleId": "bundle-123",
      "from": "scheduled",
      "to": "active",
      "reason": "Start date reached and within time window"
    }
  ],
  "errors": [],
  "summary": {
    "transitionsPerformed": 1,
    "errorsEncountered": 0
  }
}
```

---

## 2. Churn Prediction Cron (Weekly Sunday 2 AM)

### Purpose
Batch predict churn risk for all active customers using Claude API:
- RFM feature engineering
- Risk classification (low/medium/high/critical)
- Store predictions on CustomerProfile

### Configuration

```bash
gcloud scheduler jobs create http churn-prediction-cron \
  --location=us-central1 \
  --schedule="0 2 * * 0" \
  --uri="https://bakedbot-prod.web.app/api/cron/churn-prediction" \
  --http-method=POST \
  --headers="Content-Type=application/json,Authorization=Bearer ${CRON_SECRET}" \
  --time-zone="America/Chicago" \
  --description="Weekly churn prediction (Sunday 2 AM)" \
  --attempt-deadline=600s \
  --max-retry-attempts=2 \
  --min-backoff=60s \
  --max-backoff=300s \
  --project=studio-567050101-bc6e8
```

**Note:** 10-minute timeout (600s) because Claude API calls take time.

### Manual Test

```bash
# Trigger manually to verify
gcloud scheduler jobs run churn-prediction-cron \
  --location=us-central1 \
  --project=studio-567050101-bc6e8
```

### Expected Response

```json
{
  "success": true,
  "jobDuration": 45678,
  "results": [
    {
      "orgId": "org_thrive_syracuse",
      "success": true,
      "predictions": 123,
      "highRisk": 15,
      "errors": 0,
      "duration": 42000
    }
  ],
  "summary": {
    "totalOrgs": 1,
    "successfulOrgs": 1,
    "totalPredictions": 123,
    "totalHighRisk": 15,
    "totalErrors": 0
  }
}
```

---

## 3. Monitoring & Alerts

### Cloud Logging Filters

**Bundle Transitions - Failures:**
```
resource.type="cloud_run_revision"
resource.labels.service_name="bakedbot-prod"
jsonPayload.message=~"^\[Cron\] Bundle transitions job failed"
severity>=ERROR
```

**Churn Prediction - Failures:**
```
resource.type="cloud_run_revision"
resource.labels.service_name="bakedbot-prod"
jsonPayload.message=~"^\[Cron\] Churn prediction job failed"
severity>=ERROR
```

### Alert Policies

**Bundle Transitions Alert:**
- **Condition:** Error logs > 0 in 10-minute window
- **Notification:** Slack webhook (SLACK_WEBHOOK_URL)
- **Severity:** P2 (High)
- **Auto-resolve:** After 30 minutes without errors

**Churn Prediction Alert:**
- **Condition:** Error logs > 0 in 1-hour window
- **Notification:** Slack webhook (SLACK_WEBHOOK_URL)
- **Severity:** P3 (Medium)
- **Auto-resolve:** After 24 hours without errors

---

## 4. Health Checks

### Bundle Transitions Health Check (GET endpoint)

```bash
curl "https://bakedbot-prod.web.app/api/cron/bundle-transitions?secret=${CRON_SECRET}"
```

### Churn Prediction Health Check (GET endpoint)

```bash
curl "https://bakedbot-prod.web.app/api/cron/churn-prediction?secret=${CRON_SECRET}&orgId=org_thrive_syracuse"
```

---

## 5. Verification Checklist

After deploying cron jobs:

### Bundle Transitions
- [ ] Cron job created in Cloud Scheduler
- [ ] Manual test returns 200 OK
- [ ] Logs show `[Cron] Bundle transitions job started`
- [ ] Test bundle transitions (scheduled → active)
- [ ] Test bundle expiration (active → expired)
- [ ] Test redemption limit expiration
- [ ] Verify time window enforcement

### Churn Prediction
- [ ] Cron job created in Cloud Scheduler
- [ ] Manual test returns 200 OK
- [ ] Logs show `[Cron] Churn prediction job started`
- [ ] Test prediction for single customer
- [ ] Verify risk levels stored on CustomerProfile
- [ ] Verify batch processing for org
- [ ] Check Claude API rate limits

---

## 6. Rollback Procedure

### Disable Bundle Transitions Cron
```bash
gcloud scheduler jobs pause bundle-transitions-cron \
  --location=us-central1 \
  --project=studio-567050101-bc6e8
```

### Disable Churn Prediction Cron
```bash
gcloud scheduler jobs pause churn-prediction-cron \
  --location=us-central1 \
  --project=studio-567050101-bc6e8
```

### Delete Jobs (if needed)
```bash
gcloud scheduler jobs delete bundle-transitions-cron \
  --location=us-central1 \
  --project=studio-567050101-bc6e8

gcloud scheduler jobs delete churn-prediction-cron \
  --location=us-central1 \
  --project=studio-567050101-bc6e8
```

---

## 7. Troubleshooting

### Common Issues

**401 Unauthorized:**
- Verify CRON_SECRET matches in Secret Manager and Cloud Scheduler
- Check Authorization header format: `Bearer ${CRON_SECRET}`

**Timeout (504):**
- Bundle transitions: Increase `--attempt-deadline` if processing >1000 bundles
- Churn prediction: Already set to 600s (10 min), may need to batch orgs

**Rate Limit (Claude API):**
- Churn prediction: Reduce batch size in `churn-prediction.ts` (currently 10 concurrent)
- Add delay between batches (currently 1 second)

**No Bundles Transitioning:**
- Check bundle time window logic (`isWithinTimeWindow`)
- Verify bundle `startDate`/`endDate` are Firestore Timestamps
- Check Firestore index exists for `status` + `where` queries

---

## 8. Cost Estimates

### Bundle Transitions (Every 5 Minutes)
- **Invocations:** 288/day (12/hour × 24 hours)
- **Duration:** ~1-2s per invocation
- **Firestore reads:** ~10-50 reads/invocation (depends on active bundles)
- **Monthly cost:** ~$0.05 (Cloud Scheduler) + ~$0.10 (Firestore) = **$0.15/month**

### Churn Prediction (Weekly)
- **Invocations:** 4/month (once per week)
- **Duration:** ~40-60s per org (Claude API latency)
- **Claude API:** ~10-100 calls per org (depends on customer count)
- **Monthly cost:** ~$0.05 (Cloud Scheduler) + ~$5-50 (Claude API) = **$5-50/month**

**Total estimated cost:** $5-50/month (dominated by Claude API usage)

---

**Last updated:** 2026-02-20
**Status:** Ready for production deployment
