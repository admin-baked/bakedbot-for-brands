# Universal Heartbeat System - The Pulse of BakedBot

**Playbook Type:** Super User
**Frequency:** Every 10 minutes (automatic)
**Owner:** CEO / Platform Engineering
**Status:** Active
**Inspired By:** OpenClaw's "alive" feeling

---

## 🎯 Objective

Create a universal synchronization mechanism - a heartbeat - that keeps the entire BakedBot platform alive and coordinated across all roles, tasks, and systems.

**Core Principle:** Time produces events → System responds proactively

---

## 💓 What Is The Heartbeat?

The heartbeat is a **10-minute pulse** that:
1. ✅ Proves the system is alive
2. 🔄 Executes scheduled tasks (playbooks, automation, batches)
3. 📊 Records health metrics
4. 🟢 Shows visual status to all users
5. 🔁 Coordinates all automated work

**Think of it like a human heartbeat:**
- Between beats: Blood flows, organs work, body functions
- Each beat: Confirms life, coordinates rhythm, maintains health

**BakedBot's heartbeat:**
- Between pulses: Playbooks run, emails queue, content optimizes
- Each pulse: Confirms system alive, coordinates tasks, records metrics

---

## 📊 Current State (February 2026)

| Metric | Value |
|--------|-------|
| **Pulse Frequency** | Every 10 minutes |
| **Execution Time** | <60 seconds |
| **Tasks Per Pulse** | Variable (0-10+) |
| **Visual Indicator** | ✅ Live in all dashboards |
| **Health Check** | Public API available |

---

## 🔄 How It Works

### 1. GitHub Actions Pulse (Every 10 min)

**Workflow:** `.github/workflows/pulse.yaml`

```yaml
schedule:
  - cron: '*/10 * * * *'  # Every 10 minutes

jobs:
  pulse:
    - Send heartbeat to https://bakedbot.ai/api/cron/tick
    - Verify 200 response
    - Log success or failure
```

**What Triggers:**
- Scheduled: Every 10 minutes (GitHub Actions cron)
- Manual: Can be triggered manually for testing

### 2. Pulse Endpoint Processing

**Endpoint:** `/api/cron/tick`
**Auth:** Requires `CRON_SECRET`
**Timeout:** 60 seconds max

**What It Does:**
```
1. Fetch active schedules from Firestore
2. Check which tasks are due (based on cron expressions)
3. Execute due tasks:
   - Playbooks (marketing, analytics, operations)
   - Browser automation (RTRVR scraping)
   - Custom scheduled tasks
4. Record execution results
5. Update heartbeat status in Firestore
6. Return pulse confirmation
```

**Example Response:**
```json
{
  "success": true,
  "pulse": "alive",
  "processed": 3,
  "details": [
    { "id": "playbook-123", "task": "weekly-deals-video", "status": "executed" },
    { "id": "browser-456", "task": "competitor-scrape", "status": "executed" },
    { "id": "schedule-789", "task": "seo-optimization", "status": "skipped", "nextRun": "..." }
  ],
  "browserTasks": [...],
  "heartbeat": {
    "timestamp": "2026-02-15T12:00:00Z",
    "nextExpected": "2026-02-15T12:10:00Z"
  }
}
```

### 3. Heartbeat Status Recording

**Firestore Collection:** `system/heartbeat`

**Document Structure:**
```typescript
{
  timestamp: Timestamp,
  status: 'healthy' | 'error',
  schedulesProcessed: number,
  schedulesExecuted: number,
  browserTasksProcessed: number,
  browserTasksExecuted: number,
  errors: Array<{ id, error }>,
  nextPulseExpected: Date
}
```

### 4. System Health API

**Endpoint:** `/api/system/health` (public, no auth)

**Returns:**
```json
{
  "pulse": "alive" | "warning" | "error" | "unknown",
  "timestamp": "2026-02-15T12:00:00Z",
  "nextExpected": "2026-02-15T12:10:00Z",
  "healthy": true,
  "schedulesExecuted": 2,
  "browserTasksExecuted": 1,
  "errors": 0
}
```

**Pulse Status Rules:**
- **alive (🟢):** Last heartbeat < 15 minutes ago, no errors
- **warning (🟡):** Last heartbeat 15+ minutes ago (stale)
- **error (🔴):** System encountered error during pulse
- **unknown (⚪):** Never initialized or no data

### 5. Visual Indicator

**Component:** `<HeartbeatIndicator />`
**Location:** Top-right of all dashboards
**Appearance:** Slow pulsing dot with tooltip

**Visual States:**
- 🟢 **Green Pulse (2s):** System healthy, slow rhythmic flash
- 🟡 **Yellow Pulse:** Heartbeat delayed, system may be slow
- 🔴 **Red Pulse:** System error, immediate attention needed
- ⚪ **Gray Pulse:** Status unknown, initializing

**Tooltip Shows:**
- Status label
- Last pulse time ("2 minutes ago")
- Tasks executed this pulse
- Next expected pulse time

**Refresh:** Polls `/api/system/health` every 30 seconds

---

## 🛠️ Between Heartbeats: What Gets Done

The heartbeat is NOT just a "hello, I'm alive" ping. Between pulses (10 min windows), the system actively works:

### Marketing & Content
- **Day Day SEO Review:** Weekly optimization of low-CTR pages
- **Craig Campaigns:** Scheduled SMS/email sends
- **Content Generation:** AI-created social posts, captions
- **Approval Queues:** Compliance review processing

### Operations & Data
- **POS Sync:** Customer/order data from Alleaves (every 30 min)
- **Inventory Intelligence:** Stock levels, expiration tracking
- **Analytics Processing:** Traffic, conversion, engagement metrics

### Browser Automation (RTRVR)
- **Competitor Scraping:** Menu prices, product changes
- **SEO Monitoring:** Keyword rankings, SERP positions
- **Market Research:** Industry trends, news monitoring

### Playbook Execution
- **Weekly Deals Video:** Every Monday 9am
- **Birthday Campaigns:** Daily at 8am
- **Loyalty Rewards:** Point expiration reminders
- **Compliance Audits:** License expiry checks

### Batch Processing
- **Email Queues:** Personalized 1-1 emails prepared
- **SMS Batches:** Customer segment messages
- **Push Notifications:** App alerts compiled
- **Report Generation:** Daily/weekly summaries

---

## 📋 Task Scheduling

Tasks are scheduled using cron expressions in Firestore:

**Collection:** `schedules`

**Document Structure:**
```typescript
{
  enabled: boolean,
  cron: string,  // e.g., "0 9 * * 1" (Mondays 9am)
  task: string,  // Task name
  lastRun: Timestamp,
  lastResult: object,
  params: {
    playbookId?: string,  // For playbook execution
    // ... other params
  }
}
```

**Example Schedule:**
```javascript
{
  enabled: true,
  cron: "0 9 * * 1",  // Every Monday at 9am
  task: "weekly-deals-video",
  params: {
    playbookId: "weekly-deals-template"
  }
}
```

**Cron Expression Examples:**
```
*/10 * * * *  → Every 10 minutes
0 * * * *     → Every hour
0 9 * * *     → Every day at 9am
0 9 * * 1     → Every Monday at 9am
0 0 1 * *     → First day of every month
```

---

## 🎯 Who Sees The Heartbeat?

### Super Users (CEO Dashboard)
- **Full visibility:** All metrics, error details
- **Control:** Can manually trigger pulse
- **Alerts:** Email/SMS if heartbeat fails

### Dispensaries (Thrive Syracuse)
- **Status indicator:** Green/yellow/red dot
- **Tooltip:** Basic health info
- **Confidence:** System is working

### Brands (Melanie's Ecstatic Edibles)
- **Status indicator:** Green/yellow/red dot
- **Tooltip:** Basic health info
- **Peace of mind:** Tasks running

### Customers
- **Hidden by default:** Not shown on public pages
- **Optional:** Can be shown for transparency
- **Example:** "System last updated 2 minutes ago"

---

## 🚨 Troubleshooting

### Issue: Heartbeat shows "Warning" (yellow)

**Symptom:** Yellow pulsing dot, "Heartbeat Delayed" tooltip
**Cause:** Last pulse > 15 minutes ago (GitHub Actions delayed or failed)

**Check:**
1. GitHub Actions: https://github.com/admin-baked/bakedbot-for-brands/actions
2. Look for failed "ALWAYS ON - Pulse Heartbeat" runs
3. Check error logs

**Fix:**
```bash
# Manual trigger via GitHub Actions
1. Go to Actions tab
2. Click "ALWAYS ON - Pulse Heartbeat"
3. Click "Run workflow"
4. Should turn green within 2 minutes
```

### Issue: Heartbeat shows "Error" (red)

**Symptom:** Red pulsing dot, "System Error" tooltip
**Cause:** Pulse endpoint returned error or 500 status

**Check:**
1. Firestore: `system/heartbeat` document
2. Look at `error` field
3. Check Cloud Logs: https://console.cloud.google.com/logs

**Common Causes:**
- `CRON_SECRET` misconfigured
- Firestore permission error
- Timeout (task took > 60s)
- Playbook execution failure

**Fix:**
```bash
# Verify CRON_SECRET
firebase apphosting:secrets:grantaccess CRON_SECRET --backend=bakedbot-prod

# Check recent deployments
firebase apphosting:rollouts:list --backend=bakedbot-prod

# Manual test
curl -X GET https://bakedbot.ai/api/cron/tick \
  -H "Authorization: Bearer [CRON_SECRET]"
```

### Issue: Heartbeat shows "Unknown" (gray)

**Symptom:** Gray dot, "Status Unknown" tooltip
**Cause:** `system/heartbeat` document doesn't exist

**Check:**
1. Firestore Console: Look for `system` collection
2. Check if heartbeat document exists
3. Review recent deployments

**Fix:**
```bash
# Manually trigger pulse to initialize
curl -X GET https://bakedbot.ai/api/cron/tick \
  -H "Authorization: Bearer [CRON_SECRET]"

# Should create heartbeat document
```

### Issue: Tasks not executing

**Symptom:** Green heartbeat but scheduled tasks not running
**Cause:** Schedule configuration issue

**Check:**
1. Firestore: `schedules` collection
2. Verify `enabled: true`
3. Check `cron` expression is valid
4. Review `lastRun` timestamp

**Debug:**
```javascript
// In Firestore console
db.collection('schedules')
  .where('enabled', '==', true)
  .get()
  .then(snapshot => {
    snapshot.forEach(doc => {
      console.log(doc.id, doc.data());
    });
  });
```

**Fix:**
```javascript
// Update schedule
db.collection('schedules').doc('my-task').update({
  enabled: true,
  lastRun: null  // Force re-execution
});
```

---

## 📊 Monitoring & Analytics

### Key Metrics to Track

**Heartbeat Health:**
- ✅ Pulse success rate (target: >99%)
- ⏱️ Average execution time (target: <30s)
- 🚨 Error rate (target: <1%)
- 📈 Tasks executed per pulse (varies)

**Task Execution:**
- 📊 Playbooks run per day
- 🤖 Browser tasks completed
- 📧 Emails/SMS sent
- 💰 Revenue attributed to automation

**System Performance:**
- 🕐 Time between pulses (should be ~10 min)
- 📉 Stale heartbeat incidents per week
- 🔴 Critical errors per month

### Dashboard Widgets (CEO Dashboard)

**Heartbeat Status Card:**
```
💓 System Heartbeat
Status: ✅ Healthy
Last Pulse: 2 minutes ago
Next Pulse: 8 minutes
Tasks Executed: 147 (today)
Success Rate: 99.2%
```

**Recent Pulses Timeline:**
```
12:00 PM - ✅ 3 tasks executed
11:50 AM - ✅ 2 tasks executed
11:40 AM - ⚠️  1 task failed (retry scheduled)
11:30 AM - ✅ 5 tasks executed
```

**Task Execution Trends:**
```
[Chart: Tasks per hour over last 24h]
Peak: 9am (12 tasks)
Average: 4.2 tasks/hour
Total: 101 tasks today
```

---

## 🎓 Best Practices

### Creating New Scheduled Tasks

1. **Plan the schedule:** Choose appropriate cron expression
2. **Create in Firestore:** Add to `schedules` collection
3. **Test manually:** Trigger pulse, verify execution
4. **Monitor first runs:** Check logs for errors
5. **Document:** Add to this playbook

**Example:**
```javascript
// Add new schedule
db.collection('schedules').add({
  enabled: true,
  cron: "0 8 * * *",  // Every day at 8am
  task: "birthday-emails",
  params: {
    playbookId: "birthday-campaign-template"
  },
  createdAt: new Date(),
  lastRun: null
});
```

### Optimizing Pulse Performance

1. **Keep tasks short:** <30s each if possible
2. **Batch operations:** Group similar tasks
3. **Async when possible:** Don't block on long operations
4. **Error handling:** Always catch and log errors
5. **Idempotency:** Tasks should be safe to retry

### Debugging Pulse Issues

1. **Check GitHub Actions first:** Most failures here
2. **Review Cloud Logs:** Look for errors in `/api/cron/tick`
3. **Inspect Firestore:** Check `system/heartbeat` for details
4. **Manual trigger:** Use curl to test endpoint directly
5. **Isolate failures:** Disable schedules to find culprit

---

## 🔗 Related Systems

### Day Day Weekly Review
- **Frequency:** Mondays at 9am UTC
- **Triggered by:** Separate GitHub Action (not pulse)
- **Heartbeat integration:** Could be moved to pulse system

### POS Sync
- **Frequency:** Every 30 minutes
- **Triggered by:** Separate GitHub Action
- **Heartbeat integration:** Could be moved to pulse system

### Playbook Templates
- **Storage:** `playbook_templates` collection
- **Execution:** Via pulse when scheduled
- **Examples:** Weekly deals video, birthday campaigns

### Browser Automation (RTRVR)
- **Service:** OpenClaw integration
- **Tasks:** Competitor scraping, SEO monitoring
- **Execution:** Via `taskScheduler.getDueTasks()` in pulse

---

## 📖 Reference Documents

- **Pulse Workflow:** `.github/workflows/pulse.yaml`
- **Pulse Endpoint:** `src/app/api/cron/tick/route.ts`
- **Health API:** `src/app/api/system/health/route.ts`
- **Heartbeat Component:** `src/components/system/heartbeat-indicator.tsx`
- **Dashboard Header:** `src/components/dashboard/header.tsx`

---

## 🎯 Success Metrics

**Weekly:**
- ✅ 99%+ heartbeat success rate
- ✅ <1 minute average between expected/actual pulse
- ✅ All scheduled tasks executing on time
- ✅ <5 error incidents requiring manual intervention

**Monthly:**
- ✅ 100+ playbooks executed automatically
- ✅ 1000+ browser automation tasks completed
- ✅ 10,000+ emails/SMS sent via batches
- ✅ Zero critical system downtime

**Quarterly:**
- ✅ ROI positive (automation saves > infrastructure costs)
- ✅ 50%+ of marketing work automated
- ✅ Response time to opportunities <1 hour (proactive)
- ✅ User confidence high (visible green heartbeat)

---

## 🚀 Future Enhancements

### Phase 1: Smart Scheduling (Month 1-2)
- **AI-powered scheduling:** Tasks learn optimal run times
- **Load balancing:** Distribute tasks across pulses
- **Priority queues:** Critical tasks jump ahead

### Phase 2: Predictive Alerts (Month 3-4)
- **Anomaly detection:** Alert before failures occur
- **Performance trends:** Warn when slowing down
- **Capacity planning:** Predict when to scale

### Phase 3: Self-Healing (Month 6+)
- **Auto-retry:** Failed tasks retry with backoff
- **Graceful degradation:** Non-critical tasks skip when overloaded
- **Circuit breakers:** Stop cascading failures

---

**Last Updated:** February 15, 2026
**Version:** 1.0
**Next Review:** March 15, 2026

---

**The heartbeat is the pulse of BakedBot. As long as it beats, the system lives.**
