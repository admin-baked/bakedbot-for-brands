# Thrive Syracuse: Playbook Activation Guide

**Quick reference:** How to activate all 22 paused playbooks once Mailjet is configured.

---

## TL;DR — 2-Minute Activation

### Step 1: Verify Mailjet is Configured

Check that the Mailjet API credentials are deployed to production:

```bash
# Verify apphosting.yaml has Mailjet secrets
cat apphosting.yaml | grep -i mailjet
```

Expected output:
```yaml
- variable: MAILJET_API_KEY
  secret: MAILJET_API_KEY@1
- variable: MAILJET_SECRET_KEY
  secret: MAILJET_SECRET_KEY@1
```

### Step 2: Activate Playbooks (Firestore Console)

1. Open [Firebase Console](https://console.firebase.google.com) → Studio Project
2. Navigate to **Firestore Database** → **Collections**
3. Find collection: `playbook_assignments`
4. Add filter:
   - Field: `subscriptionId`
   - Operator: `==`
   - Value: `org_thrive_syracuse-empire-subscription`
5. Result: 22 documents (all with `status: "paused"`)
6. **Bulk action:** Edit each document, change `status` from `"paused"` to `"active"`

#### Alternative: Direct Firestore Query

If you have admin SDK access:

```javascript
const db = admin.firestore();

const batch = db.batch();
const snapshot = await db.collection('playbook_assignments')
  .where('subscriptionId', '==', 'org_thrive_syracuse-empire-subscription')
  .where('status', '==', 'paused')
  .get();

snapshot.docs.forEach((doc) => {
  batch.update(doc.ref, {
    status: 'active',
    updatedAt: admin.firestore.Timestamp.now()
  });
});

await batch.commit();
console.log(`✅ Activated ${snapshot.size} playbooks`);
```

### Step 3: Verify Activation

1. Return to Firestore console
2. Add new filter: `status == "active"`
3. Result should show: **22 documents** (all active)

### Step 4: Test

- Create a new customer on Thrive Syracuse brand page
- Verify "Welcome Sequence" email arrives within 5 minutes
- ✅ Done!

---

## Detailed Activation Steps

### Prerequisites

- ✅ Mailjet subuser created for Thrive Syracuse
- ✅ API keys generated and stored in secrets
- ✅ `apphosting.yaml` updated with MAILJET_API_KEY + MAILJET_SECRET_KEY
- ✅ Application deployed to production
- ✅ 111 customers enrolled in Firestore with email addresses
- ✅ 22 playbook assignments in PAUSED state

### Activation Checklist

**Before activating, verify:**

- [ ] All 111 Thrive customers are in Firestore (`customers` collection)
- [ ] All 22 playbook assignments exist (`playbook_assignments` collection)
- [ ] All 22 are currently in `status: "paused"`
- [ ] `subscriptionId: "org_thrive_syracuse-empire-subscription"` for all
- [ ] Mailjet credentials are in Firebase Secret Manager
- [ ] Production build passes (no TypeScript or deployment errors)

### Step-by-Step Activation

#### Via Firebase Console UI

1. **Open Firestore:**
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Select project: "studio-567050101-bc6e8"
   - Click "Firestore Database"

2. **Navigate to playbook_assignments:**
   - Click "Collections" in left sidebar
   - Search for: `playbook_assignments`
   - Click to open collection

3. **Filter for Thrive playbooks:**
   - Click "Add filter" icon
   - Field: `subscriptionId`
   - Operator: `==`
   - Value: `org_thrive_syracuse-empire-subscription`
   - Click "Apply"
   - Result: 22 documents appear

4. **Edit each document:**
   - Click first document
   - Click "Edit" button
   - Find field: `status`
   - Change value: `"paused"` → `"active"`
   - Click "Update"
   - **Repeat for all 22 documents**

   Alternatively, select all documents and use bulk edit:
   - Select checkbox at top of list
   - Click "Edit multiple documents"
   - Change `status: "paused"` → `"active"`
   - Click "Apply"

5. **Verify all activated:**
   - Change filter: `status == "active"`
   - Result should show: **22 documents**

#### Via gcloud CLI

```bash
# Only if you have firestore write access via CLI
# (requires authentication setup)

gcloud firestore documents update \
  playbook_assignments \
  --field="status=active" \
  --where="subscriptionId=org_thrive_syracuse-empire-subscription"

# Verify
gcloud firestore documents list playbook_assignments \
  --filter="subscriptionId==org_thrive_syracuse-empire-subscription"
```

#### Via Admin SDK (Node.js)

Create temporary script `activate-playbooks.mjs`:

```javascript
import admin from 'firebase-admin';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

// Load service account
const keyPath = '.secrets/serviceAccountKey.json';
const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf-8'));

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
    projectId: 'studio-567050101-bc6e8',
  });
}

const db = getFirestore();

async function activatePlaybooks() {
  console.log('🔄 Activating Thrive Syracuse playbooks...\n');

  const batch = db.batch();
  const snapshot = await db.collection('playbook_assignments')
    .where('subscriptionId', '==', 'org_thrive_syracuse-empire-subscription')
    .where('status', '==', 'paused')
    .get();

  console.log(`📚 Found ${snapshot.size} paused playbooks\n`);

  snapshot.docs.forEach((doc) => {
    batch.update(doc.ref, {
      status: 'active',
      updatedAt: admin.firestore.Timestamp.now(),
    });
  });

  await batch.commit();

  console.log(`✅ Activated ${snapshot.size} playbooks!\n`);

  // Verify
  const verifySnapshot = await db.collection('playbook_assignments')
    .where('subscriptionId', '==', 'org_thrive_syracuse-empire-subscription')
    .where('status', '==', 'active')
    .get();

  console.log(`📊 Verification: ${verifySnapshot.size} playbooks now active`);

  if (verifySnapshot.size === 22) {
    console.log('✨ Success! All 22 playbooks activated.\n');
  } else {
    console.warn(`⚠️  Expected 22, found ${verifySnapshot.size}`);
  }
}

activatePlaybooks()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('❌ Activation failed:', e);
    process.exit(1);
  });
```

Run it:
```bash
node activate-playbooks.mjs
```

---

## Post-Activation: What Happens

### Immediate (Within 5 Minutes)

- ✅ Playbook triggers become active
- ✅ New customers trigger "Welcome Sequence" email
- ✅ Inbox threads show campaign executions
- ✅ Mailjet starts logging campaign metrics

### Daily (7 AM Local Time)

- 📧 "Daily Competitive Intel" email sent
- 📧 "Executive Daily Digest" email sent
- ✅ Dashboard shows competitive pricing updates

### Weekly (Monday 9 AM)

- 📧 "Pro Competitive Brief" email
- 📧 "Weekly Performance Snapshot"
- 📧 "Weekly Compliance Digest"

### Monthly (1st of month, 8 AM)

- 📧 "Birthday Loyalty Reminder" (if customer has birthday)
- 📧 "Campaign ROI Report"
- 📧 "VIP Customer Identification"
- 📊 "Multi-Location Rollup" (if multi-location)

### Quarterly (Jan 1, Apr 1, Jul 1, Oct 1)

- 📊 "Seasonal Template Pack"
- 🔒 "Audit Prep Automation"

### On Demand (Event-Triggered)

- 📧 "Post-Purchase Thank You" — After each order
- 📧 "Win-Back Sequence" — When customer 30+ days inactive
- 📧 "New Product Launch" — When inventory updated
- 🔴 "Real-Time Price Alerts" — SMS when competitor price drops >10%
- 📋 "Pre-Send Campaign Check" — Before customer campaigns send

---

## Testing Post-Activation

### Test 1: Welcome Sequence

**Setup:**
1. Go to Thrive Syracuse brand page (e.g., `https://thrivesynacuse.bakedbot.ai`)
2. Click "Join our loyalty" or create account
3. Fill in: Email, First Name, Last Name
4. Submit

**Expected:**
- ✅ Email arrives within 5 minutes with subject "Welcome to Thrive Syracuse!"
- ✅ Inbox thread created in dashboard with email preview
- ✅ `playbook_executions` collection updated with success log

**Verify in Firestore:**
```javascript
db.collection('playbook_executions')
  .where('playbookId', '==', 'welcome-sequence')
  .where('orgId', '==', 'org_thrive_syracuse')
  .orderBy('createdAt', 'desc')
  .limit(1)
  .get()
// Should show: { success: true, email: "customer@example.com", ... }
```

### Test 2: Competitive Intel

**Setup:**
1. Wait until next scheduled run (daily 7 AM)
2. OR manually trigger: `POST /api/cron/playbook-runner?playbookId=daily-competitive-intel`

**Expected:**
- ✅ Email arrives with competitor price data
- ✅ Dashboard shows recent competitive moves
- ✅ Inbox thread updated

### Test 3: Pre-Send Campaign Check

**Setup:**
1. Create new campaign in Thrive dashboard
2. Before sending, review "Pre-Send Campaign Check" step
3. Should show compliance review results

**Expected:**
- ✅ Campaign flagged if contains restricted medical claims
- ✅ Recommended disclaimers shown
- ✅ Approval required before send

---

## Troubleshooting Activation Issues

### Issue: Playbooks Still Show "paused"

**Cause:** Filter cache or reload issue

**Fix:**
1. Hard refresh browser: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. Close and reopen Firestore tab
3. Check filter is correctly applied

### Issue: Playbooks Updated But Emails Not Sending

**Cause:** Mailjet credentials not deployed or incorrect

**Fix:**
1. Verify Mailjet secrets in `apphosting.yaml`:
   ```bash
   cat apphosting.yaml | grep -i mailjet
   ```
2. Verify secret versions:
   ```bash
   gcloud secrets versions list MAILJET_API_KEY --project=studio-567050101-bc6e8
   ```
3. Check most recent deploy logs:
   ```bash
   gcloud app describe --project=studio-567050101-bc6e8
   ```
4. Re-deploy if needed:
   ```bash
   git push origin main  # Triggers Firebase App Hosting deploy
   ```

### Issue: Some Playbooks Still Paused

**Cause:** Filter applied incorrectly or bulk edit failed

**Fix:**
1. Manually edit remaining paused playbooks:
   - Click each one individually
   - Change `status: "paused"` → `"active"`
   - Click "Update"
2. Verify final count:
   - Filter: `status == "active"` AND `subscriptionId == org_thrive_syracuse-empire-subscription`
   - Should show exactly **22 documents**

---

## Rollback: Pausing Playbooks Again

If you need to pause playbooks temporarily:

1. Filter: `subscriptionId == org_thrive_syracuse-empire-subscription`
2. Change all `status: "active"` → `"paused"`
3. Campaigns will stop sending on next cron trigger

---

## Monitoring After Activation

### Key Metrics

Track in Firebase Console:

```javascript
// Playbook execution success rate
db.collection('playbook_executions')
  .where('orgId', '==', 'org_thrive_syracuse')
  .where('success', '==', true)
  .count()
  .get()
// Target: > 95%

// Email deliverability (via Mailjet dashboard)
// Target: > 98%

// Customer engagement
db.collection('playbook_executions')
  .where('playbookId', '==', 'welcome-sequence')
  .where('orgId', '==', 'org_thrive_syracuse')
// Check for consistent execution on new signups
```

### Alert Setup

If available, configure alerts for:
- Playbook execution failures > 5 per hour
- Email delivery failures > 2%
- Missing playbook triggers (none in 24 hours)

---

## Next Level: Custom Playbook Tuning

After 2-4 weeks of running, consider:

1. **Disable low-engagement playbooks**
   - Example: If "Birthday Loyalty Reminder" has <10% open rate, pause it

2. **Adjust execution frequency**
   - Example: If competitive intel creates too much email, reduce from daily to weekly

3. **Add custom playbooks**
   - Create custom campaign templates for seasonal promotions
   - Thrive-specific offers (e.g., "Flash Friday Deals")

---

## References

- **Loyalty Program:** See `THRIVE_ENROLLMENT_SETUP.md` § "Loyalty Program Configuration"
- **Playbook Architecture:** See `.agent/specs/loyalty-rewards-system.md`
- **Execution Schedule:** See `src/config/playbooks.ts`
- **Compliance Gates:** See `src/server/agents/deebo.ts`

---

**Activation Status: 🟢 READY**

*This guide is version 1.0. Last updated: 2026-02-21*
