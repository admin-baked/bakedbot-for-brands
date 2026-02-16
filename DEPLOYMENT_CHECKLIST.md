# Super User Suite - Deployment Checklist

**Date:** 2026-02-15
**Status:** Ready for Deployment

---

## ✅ Already Deployed (Production)

These features are **live in production** right now:

### 1. Option Detection & Auto-Delegation
- ✅ Commit: `b305070a`
- ✅ Status: Production
- ✅ Test: Login to `/dashboard/inbox` and say "Let's connect integrations" → "Option A"

### 2. Google Integration Status Cards
- ✅ Commit: `b305070a`
- ✅ Status: Production
- ✅ Test: Ask "Check System Health Status" and see inline cards

### 3. New Chat Button (All Roles)
- ✅ Commit: `1c411897`
- ✅ Status: Production
- ✅ Test: Click "New Chat" button in inbox sidebar

---

## ⏳ Ready to Deploy (Operational Playbooks)

### Prerequisites

1. **gcloud CLI authenticated:**
   ```bash
   gcloud auth application-default login
   gcloud config set project studio-567050101-bc6e8
   ```

2. **CRON_SECRET available:**
   ```bash
   export CRON_SECRET=$(gcloud secrets versions access latest --secret=CRON_SECRET)
   echo $CRON_SECRET  # Verify it's set
   ```

3. **Firestore indexes deployed:**
   ```bash
   firebase deploy --only firestore:indexes
   ```

---

## Deployment Steps

### Step 1: Seed Operational Playbooks to Firestore

```bash
# Navigate to project directory
cd "c:\Users\admin\BakedBot for Brands\bakedbot-for-brands"

# Run seed script
npx tsx scripts/seed-operational-playbooks.ts
```

**Expected Output:**
```
[INFO] Starting operational playbooks import...

[INFO] ✨ Created: 🏥 Daily System Health Check
[INFO] ✨ Created: 📊 Weekly Growth Review
[INFO] ✨ Created: 🔗 Integration Health Monitor
[INFO] ✨ Created: 💬 Proactive Churn Prevention

======================================================================
✅ OPERATIONAL PLAYBOOKS SEEDED
======================================================================

Created: 4 playbooks
Updated: 0 playbooks
Total: 4 playbooks

Playbooks by Type:
  🏥 Daily System Health Check - 4 steps (Mon-Fri 9:00 AM)
  📊 Weekly Growth Review - 5 steps (Monday 8:00 AM)
  🔗 Integration Health Monitor - 4 steps (Every hour)
  💬 Proactive Churn Prevention - 5 steps (Daily 10:00 AM)
```

**Verify in Firestore:**
1. Open Firebase Console → Firestore
2. Navigate to `playbooks_internal` collection
3. Confirm 4 documents exist:
   - `ops_daily_health_check`
   - `ops_weekly_growth_review`
   - `ops_integration_monitor`
   - `ops_churn_prevention`

---

### Step 2: Set Up Cloud Scheduler Cron Jobs

```bash
# Ensure CRON_SECRET is set
export CRON_SECRET=$(gcloud secrets versions access latest --secret=CRON_SECRET)

# Run scheduler setup script
bash scripts/setup-operational-schedulers.sh
```

**Expected Output:**
```
============================================
Setting up Operational Playbook Schedulers
============================================

Project: studio-567050101-bc6e8
Region: us-central1
Base URL: https://bakedbot.ai/api/cron/playbook-runner

📅 Setting up: ops-daily-health-check
   Schedule: 0 14 * * 1-5
   Playbook: ops_daily_health_check
   Status: Creating new job...
   ✅ Done

📅 Setting up: ops-weekly-growth-review
   Schedule: 0 13 * * 1
   Playbook: ops_weekly_growth_review
   Status: Creating new job...
   ✅ Done

📅 Setting up: ops-integration-monitor
   Schedule: 0 * * * *
   Playbook: ops_integration_monitor
   Status: Creating new job...
   ✅ Done

📅 Setting up: ops-churn-prevention
   Schedule: 0 15 * * *
   Playbook: ops_churn_prevention
   Status: Creating new job...
   ✅ Done

============================================
✅ All scheduler jobs created successfully!
============================================
```

**Verify in Cloud Console:**
1. Open [Cloud Scheduler](https://console.cloud.google.com/cloudscheduler?project=studio-567050101-bc6e8)
2. Filter by region: `us-central1`
3. Confirm 4 jobs exist and are **enabled** (not paused)

---

### Step 3: Test Each Playbook Manually

**Test 1: Daily Health Check**
```bash
gcloud scheduler jobs run ops-daily-health-check \
  --location=us-central1 \
  --project=studio-567050101-bc6e8
```

**Test 2: Weekly Growth Review**
```bash
gcloud scheduler jobs run ops-weekly-growth-review \
  --location=us-central1 \
  --project=studio-567050101-bc6e8
```

**Test 3: Integration Monitor**
```bash
gcloud scheduler jobs run ops-integration-monitor \
  --location=us-central1 \
  --project=studio-567050101-bc6e8
```

**Test 4: Churn Prevention**
```bash
gcloud scheduler jobs run ops-churn-prevention \
  --location=us-central1 \
  --project=studio-567050101-bc6e8
```

**Expected Response:**
```
Job run successfully!
```

---

### Step 4: Verify Execution Records

**Check Firestore:**
1. Navigate to `playbook_executions` collection
2. Confirm 4 new documents (one for each test)
3. Verify fields:
   - `playbookId`: "ops_daily_health_check"
   - `success`: true
   - `duration`: <5000ms
   - `stepsExecuted`: 4

**Check Logs:**
```bash
# View Cloud Scheduler logs
gcloud logging read 'resource.type=cloud_scheduler_job' \
  --limit=20 \
  --project=studio-567050101-bc6e8 \
  --format=json

# View API endpoint logs
gcloud logging read 'resource.type=cloud_run_revision AND textPayload:"PlaybookRunner"' \
  --limit=20 \
  --project=studio-567050101-bc6e8
```

---

### Step 5: Monitor Email Notifications

**Daily Health Check should send email to:**
- martez@bakedbot.ai
- rishabh@bakedbot.ai

**Check inbox for:**
- Subject: "Daily System Health Report - [date]"
- Body: Markdown report with system status + platform metrics

---

## Post-Deployment Validation

### Manual Stress Testing

**Login to Dashboard:**
```
URL: https://bakedbot.ai/dashboard/inbox
User: martez@bakedbot.ai
```

**Run Quick Test (5 min):**

1. **Test Option Detection:**
   ```
   User: "Let's connect integrations"
   Expected: See Options A/B/C + Google integration cards

   User: "Option A"
   Expected: Auto-delegates to Linus (NOT generic dashboard)
   ```

2. **Test New Chat Button:**
   ```
   Click "New Chat" in sidebar (both collapsed + expanded)
   Expected: Active thread clears, empty state shows
   ```

3. **Test Integration Cards:**
   ```
   User: "Check System Health Status"
   Expected: Inline cards for Gmail/Calendar/Drive/Sheets with status badges
   ```

4. **Test Multi-Agent Orchestration:**
   ```
   User: "Run weekly growth review"
   Expected: Leo coordinates Pops + Jack + Mrs. Parker
   ```

---

## Rollback Plan

If something goes wrong, rollback in reverse order:

### Rollback Cloud Scheduler Jobs
```bash
gcloud scheduler jobs delete ops-daily-health-check --location=us-central1 --quiet
gcloud scheduler jobs delete ops-weekly-growth-review --location=us-central1 --quiet
gcloud scheduler jobs delete ops-integration-monitor --location=us-central1 --quiet
gcloud scheduler jobs delete ops-churn-prevention --location=us-central1 --quiet
```

### Rollback Firestore Playbooks
```bash
# Delete playbooks manually in Firebase Console
# OR run:
npx tsx -e "
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
initializeApp();
const db = getFirestore();
['ops_daily_health_check', 'ops_weekly_growth_review', 'ops_integration_monitor', 'ops_churn_prevention']
  .forEach(async id => await db.collection('playbooks_internal').doc(id).delete());
"
```

### Rollback Git Commits (If Needed)
```bash
# Already deployed commits are safe, but if new issues arise:
git revert 1c411897  # New Chat button
git revert b305070a  # Option detection
git push origin main
```

---

## Success Criteria

### ✅ Deployment Successful If:

1. **Firestore:**
   - [ ] 4 playbooks in `playbooks_internal/` collection
   - [ ] All playbooks have `enabled: true`

2. **Cloud Scheduler:**
   - [ ] 4 jobs created in `us-central1`
   - [ ] All jobs are enabled (not paused)
   - [ ] Jobs have correct schedules

3. **Manual Tests:**
   - [ ] Each playbook runs successfully via `gcloud scheduler jobs run`
   - [ ] Execution records appear in `playbook_executions` collection
   - [ ] No errors in Cloud Scheduler logs

4. **Email Notifications:**
   - [ ] Daily health check email received
   - [ ] Email contains system status + metrics

5. **Dashboard Tests:**
   - [ ] "Option A" delegates to Linus correctly
   - [ ] New Chat button clears active thread
   - [ ] Integration cards render inline

---

## Monitoring & Alerts

### Daily (First Week)
- [ ] Check `playbook_executions` collection for failures
- [ ] Verify emails arrive on schedule
- [ ] Review Cloud Scheduler logs for errors

### Weekly (Ongoing)
- [ ] Review playbook success rate (target: 100%)
- [ ] Check execution duration (target: <5 min)
- [ ] Monitor integration uptime (target: >99.5%)
- [ ] Review re-engagement campaigns created

### Set Up Alerts
```bash
# Create alert policy for failed executions
gcloud alpha monitoring policies create \
  --notification-channels=email:martez@bakedbot.ai \
  --display-name="Playbook Execution Failures" \
  --condition-display-name="Failed playbook execution" \
  --condition-threshold-value=1 \
  --condition-threshold-duration=300s
```

---

## Next Steps After Deployment

### Immediate (This Week)
1. [ ] Monitor playbook execution for 7 days
2. [ ] Verify all step executors work correctly
3. [ ] Check email deliverability (inbox vs spam)
4. [ ] Collect feedback from super users

### Short-Term (Next Sprint)
1. [ ] Implement real tool execution (getSystemHealth, crmGetStats)
2. [ ] Add Slack integration for alerts
3. [ ] Create playbook analytics dashboard
4. [ ] Add retry logic for failed steps

### Long-Term (Future)
1. [ ] Visual playbook builder UI
2. [ ] User-defined playbooks
3. [ ] Playbook marketplace
4. [ ] A/B testing framework

---

## Support

| Issue | Contact |
|-------|---------|
| Deployment questions | martez@bakedbot.ai |
| Technical errors | rishabh@bakedbot.ai |
| Cloud Scheduler issues | [Cloud Console Support](https://console.cloud.google.com/support) |
| Firestore permissions | Check IAM roles for service account |

**Documentation:**
- Option Detection: `SUPER_USER_OPTION_FIX.md`
- New Chat Button: `NEW_CHAT_FIX.md`
- Stress Tests: `SUPER_USER_STRESS_TEST.md`
- Operational Playbooks: `OPERATIONAL_PLAYBOOKS.md`
- Complete Suite: `SUPER_USER_SUITE_COMPLETE.md`

---

**Last Updated:** 2026-02-15
**Deployment Status:** ⏳ Ready for Production
**Estimated Deployment Time:** 15-20 minutes
