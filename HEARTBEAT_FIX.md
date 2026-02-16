# Heartbeat "Status Unknown" Fix

## Problem

The heartbeat indicator was showing "Status Unknown" because the health endpoint (`/api/system/health`) was looking for a `system/heartbeat` document that didn't exist.

## Root Cause

The heartbeat cron job writes to:
- `heartbeat_executions` collection (execution records)
- `tenants/{tenantId}/settings/heartbeat` (lastRun timestamp)

But the health endpoint was expecting:
- `system/heartbeat` document ← **This was never created**

## Solution

### 1. Updated Health Endpoint

Changed `/api/system/health/route.ts` to:
- Query `heartbeat_executions` collection for recent activity (last 15 minutes)
- Check `system_logs` for errors (last 24 hours)
- Calculate pulse status based on actual execution data

**Status Logic:**
- `alive` (green): Executions exist, <5 errors in 24h
- `warning` (yellow): 5-9 errors OR heartbeat is stale (>15 min)
- `error` (red): 10+ errors in 24h
- `unknown` (gray): No heartbeat executions found

### 2. Initialize Script

Created `scripts/initialize-heartbeat.ts` to manually create an initial execution record.

## How to Fix "Status Unknown"

### Option 1: Run Initialization Script (Quick Fix)

```powershell
npx tsx scripts/initialize-heartbeat.ts
```

This creates an initial `heartbeat_executions` record so the indicator shows "alive".

### Option 2: Set Up Cloud Scheduler (Permanent Fix)

1. **Create the cron job:**

```bash
gcloud scheduler jobs create http heartbeat-cron \
  --schedule="*/5 * * * *" \
  --uri="https://bakedbot.ai/api/cron/heartbeat" \
  --http-method=GET \
  --headers="Authorization=Bearer $(gcloud secrets versions access latest --secret=CRON_SECRET)" \
  --location=us-central1
```

2. **Verify it's running:**

```bash
gcloud scheduler jobs describe heartbeat-cron --location=us-central1
```

3. **Manually trigger to test:**

```bash
gcloud scheduler jobs run heartbeat-cron --location=us-central1
```

### Option 3: Manual Trigger via API

```bash
curl -X GET https://bakedbot.ai/api/cron/heartbeat \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## What the Heartbeat Does

The heartbeat system runs role-specific proactive checks:

### Super User (every 30 min)
- System errors
- Deployment status
- New signups
- Churn risk
- Leads
- Gmail/Calendar events

### Dispensary (every 15 min)
- Low stock warnings
- Expiring batches
- Margin compression
- Competitor activity
- At-risk customers
- License expiry

### Brand (every 60 min)
- Content pending approval
- Campaign performance
- Competitor launches
- Partner performance
- SEO rankings
- Traffic alerts

## Files Changed

1. `src/app/api/system/health/route.ts` - Updated to query `heartbeat_executions`
2. `scripts/initialize-heartbeat.ts` - New initialization script
3. `src/app/api/system/health/__tests__/route.test.ts` - Updated tests (Note: Tests have Next.js/Jest compatibility issues, need fixing separately)

## Next Steps

1. Run initialization script OR set up Cloud Scheduler
2. Verify heartbeat shows "alive" (green) in dashboard header
3. Monitor `heartbeat_executions` collection to ensure cron job is running
4. Check Super User insights dashboard for system health metrics

## Firestore Collections

- `heartbeat_executions` - Execution audit trail
- `heartbeat_notifications` - Notification history
- `tenants/{id}/settings/heartbeat` - Per-tenant config
- `system_logs` - Error logs (used for pulse status)

## Testing

The heartbeat indicator should now show:
- **Green (Alive)**: Recent executions, <5 errors
- **Yellow (Warning)**: 5-9 errors OR stale heartbeat (>15 min)
- **Red (Error)**: 10+ errors in last 24h
- **Gray (Unknown)**: No executions found (needs initialization)

Poll interval: Every 30 seconds
Cron interval: Every 5 minutes
Stale threshold: 15 minutes
