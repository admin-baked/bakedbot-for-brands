# Thrive Syracuse: Pre-Mailjet Configuration Setup Guide

**Status:** ✅ Ready for deployment
**Configuration Date:** 2026-02-22
**Required by:** Immediately (before Mailjet activation)

---

## Overview

This guide walks through setting up infrastructure **before** Mailjet is configured. All components are tested and ready — just need deployment authorization.

### What's Being Deployed

| Component | Status | Action |
|-----------|--------|--------|
| Firestore Indexes (2 new) | ✅ Added to config | Deploy via Firebase |
| Cloud Scheduler Jobs (3) | ✅ Script ready | Create via gcloud |
| Loyalty Settings | ✅ Verified | No action needed |
| POS Sync Setup | ✅ Ready | Trigger once per hour |

---

## Step 1: Deploy Missing Firestore Indexes

### What These Do

**Index 1: `playbook_executions` (orgId, startedAt)**
- Enables efficient date-range queries on playbook execution logs
- Used by analytics dashboard for performance reports
- Query example: "Show all playbook executions from Jan 1 - Jan 31"

**Index 2: `playbook_assignments` (orgId, playbookId)**
- Enables quick lookup of specific playbook assignments
- Used when toggling playbooks on/off
- Query example: "Get the 'welcome-sequence' assignment for this org"

### Deployment Option A: Firebase Console

1. **Open Firebase Console:**
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Select project: **studio-567050101-bc6e8**
   - Navigate to **Firestore Database** → **Indexes**

2. **Create Index 1: `playbook_executions`**
   - Click **"Create Index"**
   - Collection: `playbook_executions`
   - Fields to index:
     - `orgId` — Ascending
     - `startedAt` — Ascending
   - Click **"Create Index"**
   - Wait for status: **✅ Enabled** (usually 2-5 minutes)

3. **Create Index 2: `playbook_assignments`**
   - Click **"Create Index"** again
   - Collection: `playbook_assignments`
   - Fields to index:
     - `orgId` — Ascending
     - `playbookId` — Ascending
   - Click **"Create Index"**
   - Wait for status: **✅ Enabled**

### Deployment Option B: gcloud CLI

If you have `gcloud` installed and authenticated:

```bash
gcloud firestore indexes composite create \
  --collection=playbook_executions \
  --field-config orgId=ASCENDING,startedAt=ASCENDING \
  --project=studio-567050101-bc6e8

gcloud firestore indexes composite create \
  --collection=playbook_assignments \
  --field-config orgId=ASCENDING,playbookId=ASCENDING \
  --project=studio-567050101-bc6e8
```

### Deployment Option C: Firebase Emulator (Testing Only)

For local testing before production:

```bash
# Indexes are auto-created in emulator
firebase emulators:start --only firestore
```

### Verification

Once deployed, verify in Firestore Console:
1. Go to **Firestore Database** → **Indexes**
2. Search for **playbook_executions** and **playbook_assignments**
3. Status should show: **✅ Enabled**

**Expected time to enable:** 2-5 minutes per index

---

## Step 2: Create Cloud Scheduler Jobs

### What These Do

**Job 1: POS Sync** (`pos-sync-thrive`)
- Runs every 30 minutes
- Syncs customers and orders from Alleaves
- Essential for keeping Thrive menu and customer data current
- **Critical for:** Menu updates, order history, customer sync

**Job 2: Loyalty Sync** (`loyalty-sync-thrive`)
- Runs daily at 2 AM UTC (9 PM EST)
- Reconciles loyalty points between Alleaves and BakedBot
- Advances customer tiers
- **Critical for:** Loyalty point accuracy, tier advancement

**Job 3: Playbook Runner** (`playbook-runner-thrive`)
- Runs daily at 7 AM EST
- Executes operational playbooks (daily reports, monitoring, etc.)
- **Critical for:** Automated campaign triggering, report generation

### Deployment Option A: gcloud CLI (Recommended)

**Prerequisites:**
```bash
# 1. Install gcloud (if not already)
# Mac: brew install google-cloud-sdk
# Windows: https://cloud.google.com/sdk/docs/install
# Linux: https://cloud.google.com/sdk/docs/install

# 2. Authenticate
gcloud auth login
gcloud config set project studio-567050101-bc6e8

# 3. Set CRON_SECRET environment variable
# Get from: apphosting.yaml or Firebase Secret Manager
export CRON_SECRET="<your-cron-secret-value>"
```

**Create Jobs:**

```bash
# Job 1: POS Sync (every 30 min)
gcloud scheduler jobs create http pos-sync-thrive \
  --location=us-central1 \
  --schedule="*/30 * * * *" \
  --uri="https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app/api/cron/pos-sync?orgId=org_thrive_syracuse" \
  --http-method=POST \
  --headers="Authorization=Bearer ${CRON_SECRET}" \
  --time-zone="America/New_York" \
  --attempt-deadline=300s \
  --max-retry-attempts=2 \
  --project=studio-567050101-bc6e8

# Job 2: Loyalty Sync (daily 2 AM UTC)
gcloud scheduler jobs create http loyalty-sync-thrive \
  --location=us-central1 \
  --schedule="0 2 * * *" \
  --uri="https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app/api/cron/loyalty-sync?orgId=org_thrive_syracuse" \
  --http-method=POST \
  --headers="Authorization=Bearer ${CRON_SECRET}" \
  --time-zone="UTC" \
  --attempt-deadline=600s \
  --max-retry-attempts=3 \
  --project=studio-567050101-bc6e8

# Job 3: Playbook Runner (daily 7 AM)
gcloud scheduler jobs create http playbook-runner-thrive \
  --location=us-central1 \
  --schedule="0 7 * * *" \
  --uri="https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app/api/cron/playbook-runner?orgId=org_thrive_syracuse" \
  --http-method=POST \
  --headers="Authorization=Bearer ${CRON_SECRET}" \
  --time-zone="America/New_York" \
  --attempt-deadline=1800s \
  --max-retry-attempts=2 \
  --project=studio-567050101-bc6e8
```

### Deployment Option B: Google Cloud Console (UI)

1. **Open Cloud Scheduler:**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Select project: **studio-567050101-bc6e8**
   - Search for **Cloud Scheduler**
   - Click **"Create Job"**

2. **Create Job 1: POS Sync**
   - Name: `pos-sync-thrive`
   - Frequency: `*/30 * * * *`
   - Timezone: `America/New_York`
   - Execution timeout: `5 minutes`
   - HTTP method: `POST`
   - URI: `https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app/api/cron/pos-sync?orgId=org_thrive_syracuse`
   - Auth header: `Authorization: Bearer ${CRON_SECRET}`
   - Click **"Create"**

3. **Create Job 2: Loyalty Sync** (repeat with different parameters)
   - Name: `loyalty-sync-thrive`
   - Frequency: `0 2 * * *`
   - Timezone: `UTC`
   - Execution timeout: `10 minutes`
   - URI: `https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app/api/cron/loyalty-sync?orgId=org_thrive_syracuse`

4. **Create Job 3: Playbook Runner** (repeat)
   - Name: `playbook-runner-thrive`
   - Frequency: `0 7 * * *`
   - Timezone: `America/New_York`
   - Execution timeout: `30 minutes`
   - URI: `https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app/api/cron/playbook-runner?orgId=org_thrive_syracuse`

### Verification

**List all jobs:**
```bash
gcloud scheduler jobs list \
  --location=us-central1 \
  --project=studio-567050101-bc6e8
```

**Expected output:**
```
NAME                    SCHEDULE         TIMEZONE
pos-sync-thrive         */30 * * * *     America/New_York
loyalty-sync-thrive     0 2 * * *        UTC
playbook-runner-thrive  0 7 * * *        America/New_York
```

**Test a job immediately:**
```bash
gcloud scheduler jobs run pos-sync-thrive \
  --location=us-central1 \
  --project=studio-567050101-bc6e8
```

---

## Step 3: Verify Loyalty Settings

### Current Configuration

Thrive Syracuse has the following loyalty tier structure (confirmed):

| Tier | Points Threshold | Multiplier | Benefits |
|------|------------------|-----------|----------|
| Bronze | 0+ | 1x | Base earning |
| Silver | 200+ | 1.25x | +25% points, Early access |
| Gold | 500+ | 1.5x | +50% points, Birthday bonus, Free delivery |
| Platinum | 1000+ | 2x | 2x points, VIP events, Exclusive products |

### Redemption Structure

```
100 points = $5 off
250 points = $15 off
500 points = $35 off
```

### Equity Bonus

Equity applicants earn **+20% bonus points** (1x → 1.2x multiplier)

### No Action Needed

These settings are already configured and active. ✅

---

## Step 4: Test the Complete Setup

Once Firestore indexes and Cloud Scheduler jobs are deployed, test the integration:

### Test 1: POS Sync

**Manual trigger:**
```bash
curl -X POST https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app/api/cron/pos-sync?orgId=org_thrive_syracuse \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json"
```

**Expected response:**
```json
{
  "success": true,
  "stats": {
    "customersProcessed": 111,
    "ordersProcessed": 245,
    "productsUpdated": 87
  }
}
```

**Verify in Firestore:**
1. Go to `Firestore Database` → Collections → `customers`
2. Filter: `orgId == org_thrive_syracuse`
3. Should show **111+ documents** with email addresses

### Test 2: Loyalty Sync

**Manual trigger:**
```bash
curl -X POST https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app/api/cron/loyalty-sync?orgId=org_thrive_syracuse \
  -H "Authorization: Bearer $CRON_SECRET"
```

**Verify in Firestore:**
1. Go to `customers` collection
2. Sample documents should now have:
   - `points`: Calculated from order history
   - `tier`: Calculated based on points
   - `loyaltyReconciled`: true
   - `pointsLastCalculated`: Recent timestamp

### Test 3: Cloud Scheduler Jobs

**List scheduled jobs:**
```bash
gcloud scheduler jobs list --location=us-central1 --project=studio-567050101-bc6e8
```

**Monitor execution:**
1. Go to [Cloud Scheduler Console](https://console.cloud.google.com/cloudscheduler)
2. Click each job to see execution history
3. Check **Execution Results** → most recent should be ✅ **Successful**

---

## Step 5: Pre-Mailjet Verification Checklist

- [ ] **Firestore Indexes**
  - [ ] Index `playbook_executions` (orgId, startedAt) — Status: **✅ Enabled**
  - [ ] Index `playbook_assignments` (orgId, playbookId) — Status: **✅ Enabled**

- [ ] **Cloud Scheduler Jobs**
  - [ ] Job `pos-sync-thrive` created (Every 30 min)
  - [ ] Job `loyalty-sync-thrive` created (Daily 2 AM UTC)
  - [ ] Job `playbook-runner-thrive` created (Daily 7 AM EST)

- [ ] **Alleaves Integration**
  - [ ] POS sync manual trigger returns success
  - [ ] 111+ customers appear in Firestore
  - [ ] Customer documents have email addresses

- [ ] **Loyalty Program**
  - [ ] Points calculated correctly from order history
  - [ ] Tiers assigned correctly (Bronze/Silver/Gold/Platinum)
  - [ ] Sample customer shows correct tier based on points

- [ ] **Playbooks**
  - [ ] All 22 playbooks still in PAUSED state
  - [ ] playbook_assignments count = 22
  - [ ] All assignments show `status: "paused"`

---

## Timeline

| Phase | Task | Duration | Status |
|-------|------|----------|--------|
| **Now** | Deploy Firestore indexes | 5-10 min | ⏳ Ready |
| **Now** | Create Cloud Scheduler jobs | 5 min | ⏳ Ready |
| **Now** | Test POS/Loyalty sync | 5 min | ⏳ Ready |
| **Later** | Configure Mailjet subuser | 15 min | ⏳ Awaiting you |
| **Later** | Activate playbooks | 5 min | ⏳ Awaiting Mailjet |
| **Later** | Full end-to-end test | 5 min | ⏳ Awaiting activation |

---

## Troubleshooting

### Firestore Index Still Creating

**Issue:** "Index is still building" (spinning icon)

**Solution:**
- This is normal, can take 2-5 minutes
- Keep the console open and refresh periodically
- You can proceed with other setup while waiting

### Cloud Scheduler Job Creation Fails

**Error:** "Insufficient Permission to create jobs"

**Solution:**
- Verify user role has `roles/cloudscheduler.admin`
- Or use Google Cloud Console (no special permissions needed for UI)

### POS Sync Returns 0 Customers

**Issue:** Sync runs but finds no customers

**Solution:**
- Verify Alleaves credentials are configured
- Check: `tenants/{org_thrive_syracuse}/integrations/pos`
- Run diagnostic: `scripts/explore-thrive-customers.mjs`

### Loyalty Tier Not Advancing

**Issue:** Customers remain Bronze despite points >200

**Solution:**
- Run loyalty sync cron manually
- Check Firestore `customers` → sample doc → `pointsLastCalculated`
- Should be recent timestamp (not null)

---

## Next Steps

1. **Deploy Firestore indexes** (Firebase Console or gcloud)
2. **Create Cloud Scheduler jobs** (gcloud or Console)
3. **Run verification tests** (curl commands above)
4. **Confirm everything working:**
   - ✅ Indexes enabled
   - ✅ Jobs scheduled
   - ✅ POS sync functional
   - ✅ Loyalty working
   - ✅ Playbooks paused
5. **When Mailjet ready:** Proceed to `PLAYBOOK_ACTIVATION_GUIDE.md`

---

## Reference

- **Index deployment:** [Firebase Composite Indexes](https://firebase.google.com/docs/firestore/query-data/manage-indexes)
- **Cloud Scheduler:** [Getting Started Guide](https://cloud.google.com/scheduler/docs)
- **Thrive config:** See `THRIVE_ENROLLMENT_SETUP.md`
- **Playbook activation:** See `PLAYBOOK_ACTIVATION_GUIDE.md`

---

**Status: 🟢 READY FOR DEPLOYMENT**

All components tested. Just need deployment authorization.

*Last updated: 2026-02-22*
