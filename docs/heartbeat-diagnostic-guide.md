# Heartbeat Diagnostic & Fix Guide

Quick guide to diagnose and fix heartbeat system issues.

## Using the Dashboard (Recommended)

The **Heartbeat Diagnostic Panel** component provides a UI for diagnosing and fixing heartbeat issues.

### Integration

Add to any dashboard page (recommended: System Settings or CEO Dashboard):

```tsx
import { HeartbeatDiagnosticPanel } from '@/components/system/heartbeat-diagnostic-panel';

export default function SystemPage() {
    return (
        <div>
            <HeartbeatDiagnosticPanel />
        </div>
    );
}
```

### Features

1. **Run Diagnostic** - Check heartbeat system health
2. **Magic Fix** ✨ - Automatically resolve common issues
3. **Real-time Status** - See issues categorized by severity
4. **Auto-fixable Indicators** - Shows which issues can be auto-fixed

### What the Magic Fix Does

The magic fix button automatically:

1. ✅ Sets tenant status to "active" if disabled
2. ✅ Enables heartbeat if disabled
3. ✅ Resets lastRun timestamp to allow immediate execution
4. ✅ Creates default configuration if missing
5. ✅ Enables default checks for your role
6. ✅ Triggers immediate heartbeat execution

## Using Scripts (Local Development)

**Note**: Scripts require Google Application Default Credentials.

### Diagnose

```bash
npx tsx scripts/diagnose-heartbeat.ts org_thrive_syracuse
```

Shows:
- ✅ Tenant status (active/inactive)
- ✅ Heartbeat configuration
- ✅ Recent executions
- ✅ Active hours vs current time
- ✅ Primary user setup
- ✅ System errors
- ✅ Cloud Scheduler (CRON_SECRET)

### Fix

```bash
npx tsx scripts/fix-heartbeat.ts org_thrive_syracuse
```

Applies fixes automatically and triggers immediate heartbeat.

## Common Issues & Solutions

### Issue: "Heartbeat is disabled"
**Severity**: Critical
**Auto-fixable**: Yes
**Fix**: Click "Magic Fix" or enable in settings

### Issue: "Tenant status is not active"
**Severity**: Critical
**Auto-fixable**: Yes
**Fix**: Magic fix sets status to "active"

### Issue: "No executions in last 15 minutes"
**Severity**: Warning
**Auto-fixable**: Yes
**Fix**: Magic fix triggers immediate execution

### Issue: "Next heartbeat due in X minutes"
**Severity**: Info
**Auto-fixable**: Yes
**Fix**: Magic fix resets lastRun to execute immediately

### Issue: "Outside active hours"
**Severity**: Warning
**Auto-fixable**: No
**Fix**: Manually adjust active hours in settings (default: 9am-9pm)

### Issue: "CRON_SECRET not configured"
**Severity**: Critical
**Auto-fixable**: No
**Fix**: Add CRON_SECRET to Google Secret Manager

## Manual Heartbeat Trigger

Via Dashboard:
```tsx
import { triggerHeartbeat } from '@/server/actions/heartbeat';

const result = await triggerHeartbeat();
// result.results contains check results
```

Via API (requires CRON_SECRET):
```bash
curl -X POST https://bakedbot.ai/api/cron/heartbeat \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "org_thrive_syracuse",
    "userId": "user_123",
    "role": "dispensary",
    "force": true
  }'
```

## Monitoring

### Health Endpoint (Public)

```bash
curl https://bakedbot.ai/api/system/health
```

Returns:
```json
{
  "pulse": "alive" | "warning" | "error" | "unknown",
  "timestamp": "2026-02-16T...",
  "status": "all_clear",
  "schedulesExecuted": 5,
  "errors": 0,
  "uptime": "99.9%",
  "healthy": true
}
```

### Heartbeat History

```tsx
import { getHeartbeatHistory } from '@/server/actions/heartbeat';

const history = await getHeartbeatHistory(20);
// history.executions contains last 20 executions
```

## Server Actions

All server actions in `src/server/actions/heartbeat.ts`:

- `getHeartbeatConfig()` - Get current configuration
- `updateHeartbeatConfig(updates)` - Update settings
- `toggleHeartbeatCheck(checkId, enabled)` - Toggle specific check
- `triggerHeartbeat()` - Manual trigger (force=true)
- `getHeartbeatHistory(limit)` - Get execution history
- `getRecentAlerts(limit)` - Get recent alerts
- **`diagnoseHeartbeat()`** - Run diagnostic (NEW)
- **`fixHeartbeat()`** - Auto-fix issues (NEW)

## Firestore Collections

- `tenants/{id}/settings/heartbeat` - Configuration
- `heartbeat_executions` - Execution history
- `heartbeat_notifications` - Notification history

## Role-Specific Checks

### Super User (30 min interval)
- system_errors, deployment_status, new_signups, churn_risk
- leads, gmail, calendar

### Dispensary (15 min interval)
- low_stock, expiring_batches, margins, competitors
- at_risk_customers, birthdays, license_expiry, pos_sync

### Brand (60 min interval)
- content_pending, campaign_performance, competitor_launches
- partner_performance, seo_rankings, traffic

## Troubleshooting

1. **Green indicator but no notifications?**
   - Check `suppressAllClear` setting (may hide OK results)
   - Check quiet hours (22:00-7:00 by default)
   - Check enabled notification channels

2. **Red indicator with no issues in diagnostic?**
   - Check system_logs collection for errors (last 24h)
   - May be stale executions (>15 min ago)

3. **Magic fix doesn't help?**
   - Check Cloud Scheduler is running
   - Verify CRON_SECRET in Google Secret Manager
   - Check Firestore security rules allow writes
   - Review Cloud Scheduler logs for errors

4. **Heartbeat runs but checks return nothing?**
   - Verify tenant has data (orders, products, etc.)
   - Check active hours match your timezone
   - Increase `interval` for less frequent checks

## Quick Start for Thrive Syracuse

```bash
# 1. Run diagnostic
npx tsx scripts/diagnose-heartbeat.ts org_thrive_syracuse

# 2. If issues found, run fix
npx tsx scripts/fix-heartbeat.ts org_thrive_syracuse

# 3. Verify fix
npx tsx scripts/diagnose-heartbeat.ts org_thrive_syracuse

# 4. Check public health endpoint
curl https://bakedbot.ai/api/system/health | jq
```

Or use the Dashboard component (recommended for non-technical users).

---

Need help? Check `src/server/services/heartbeat/` for implementation details.
