# Slack #alerts Channel Setup Guide

## Quick Setup (5 minutes)

### Step 1: Create #alerts Channel in Slack

1. Go to [BakedBot Slack workspace](https://bakedbot.slack.com)
2. Click **+ Create a channel**
3. Name: `#alerts`
4. Description: `🚨 Automated system alerts - Template health, failures, etc.`
5. Make it **Public**
6. Click **Create**

### Step 2: Invite the BakedBot App

1. In #alerts, type: `/invite @bakedbot`
2. This adds the app to the channel so it can post messages

### Step 3: Verify Configuration

The template alert system will now automatically post to #alerts when:
- Template success rate drops below 80%
- Template hasn't executed in 24+ hours
- 10+ failed retries detected

**Alert Format Example:**
```
🚨 *Playbook Template Alerts*
Critical: 2 | Warnings: 3

• *pro-daily-competitive-intel*: Template has 45.2% success rate (3/18 in last 24h)
• *enterprise-realtime-intel*: Daily template last executed 28.3 hours ago

View Dashboard →
```

### Step 4: Test the Alert System

Run a manual test:
```bash
# Manually trigger health check
gcloud scheduler jobs run template-health-check --location=us-central1

# Or curl directly:
curl -X POST https://bakedbot.ai/api/cron/template-health-check \
  -H "x-cron-secret: $CRON_SECRET" \
  -H "Content-Type: application/json"
```

You should see an alert appear in #alerts within seconds.

### Step 5: Configure Notification Preferences (Optional)

**To get notified for critical alerts:**

1. Go to #alerts channel
2. Click **channel details** (top right)
3. Under **Notification preferences**:
   - Set to **All messages** or **Highlights only**
4. Customize which keywords trigger notifications:
   - Critical messages include `🚨`
   - Set notification rule: "Contains 🚨"

**For ops team:**
1. Create a user group: `@ops-alerts`
2. In #alerts, ops can get mentioned: `@ops-alerts check this template`

### Step 6: Archive Old Alerts (Optional)

Messages over 90 days old are less useful. Set up auto-cleanup:
```bash
# View all alerts from last 7 days
/search in:#alerts after:2024-02-11

# Create workflow (if Slack Pro+):
# Workflow → Run workflow on schedule → Delete messages older than 90 days
```

---

## Advanced: Custom Alert Rules

### Mute Specific Templates
If a template frequently alerts but is being worked on:
```
In #alerts, set channel topic:
"Alerts: All templates EXCEPT pro-daily-intel (maintenance mode)"
```

### Route to Different Channels
Want critical alerts in #critical-ops, warnings in #ops-monitor?

Update `template-alert-service.ts`:
```typescript
// Around line 180
if (alert.severity === 'critical') {
  slackService.postMessage({
    channel: '#critical-ops',  // Critical alerts here
    text: summaryText
  });
} else {
  slackService.postMessage({
    channel: '#ops-monitor',   // Warnings here
    text: summaryText
  });
}
```

### Daily Summary Instead of Real-Time
Want one digest at end-of-day instead of individual alerts?

Update cron schedule:
```bash
gcloud scheduler jobs update http template-health-check \
  --schedule="0 17 * * *" \
  # 5 PM EST daily digest
```

---

## Troubleshooting

### Alerts not appearing in Slack?
1. ✅ Check BakedBot app is in #alerts: `/invite @bakedbot`
2. ✅ Check CRON_SECRET is set correctly in Cloud Scheduler
3. ✅ Check logs:
   ```bash
   gcloud logging read "resource.type=cloud_scheduler_job AND
   resource.labels.job_id=template-health-check" --limit 20 --format=json
   ```
4. ✅ Test manually: run the cron job from Cloud Scheduler console

### App not found?
1. Go to [Slack App Management](https://api.slack.com/apps)
2. Find "BakedBot" app
3. Go to **OAuth & Permissions**
4. Verify it has `chat:write` scope
5. Verify it's installed to workspace
6. Re-invite: `/invite @bakedbot` in #alerts

### Wrong channel?
Update `slackService.postMessage()` call in `template-alert-service.ts`:
```typescript
// Change from:
channel: '#alerts'

// To:
channel: '#ops-team'  // or any other channel
```

---

## What Happens Next

1. **Every day at 9 AM EST:** Cloud Scheduler triggers health check
2. **Within seconds:** Alert system queries last 24h of template executions
3. **If issues found:** Post to #alerts with summary + drill-down link
4. **Ops team:** Gets notified, clicks link to investigate in dashboard

**Result:** Proactive alerting instead of reactive debugging 🎯
