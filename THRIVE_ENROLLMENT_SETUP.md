# Thrive Syracuse: Loyalty & Playbooks Enrollment Setup

**Date:** 2026-02-21
**Organization:** Thrive Syracuse (`org_thrive_syracuse`)
**Tier:** Empire
**Status:** ✅ Setup Complete (Paused awaiting Mailjet configuration)

---

## Executive Summary

Thrive Syracuse has been enrolled in:
- ✅ **Loyalty Program** — 111 customers with email addresses, Bronze tier, 0 initial points
- ✅ **22 Empire Tier Playbooks** — All created in PAUSED (draft) state pending Mailjet subuser setup
- ⏳ **Email Campaigns** — Ready to activate once email credentials are configured

### What's Ready Now

| Component | Status | Count |
|-----------|--------|-------|
| Customers enrolled | ✅ Ready | 111 |
| Loyalty tier | ✅ Bronze | 0 points each |
| Playbook assignments | ⏳ Paused | 22 playbooks |
| Automation | ⏳ Awaiting Mailjet | Multiple triggers |

---

## What's Included: 22 Empire Tier Playbooks

### Onboarding (4 playbooks)
- **Welcome Sequence** — 3-touch email: Day 0 welcome, Day 3 tips, Day 7 value check-in
- **Owner Quickstart Guide** — Day 3 email with personalized setup checklist
- **Menu Health Scan** — Day 2 audit after menu import (flags missing descriptions, images, prices)
- **White-Glove Onboarding** — 14-day guided setup with AI-generated checklist emails

### Engagement (5 playbooks)
- **Post-Purchase Thank You** — Thank you email after each order + review request
- **Birthday Loyalty Reminder** — Monthly birthday cohort email with loyalty reward
- **Win-Back Sequence** — 3-touch re-engagement when customer inactive 30+ days
- **New Product Launch** — Automated announcement when new products added
- **VIP Customer Identification** — Monthly report identifying top spenders for VIP recognition

### Competitive Intelligence (4 playbooks)
- **Pro Competitive Brief** — Weekly brief with full pricing for up to 3 competitors (email + dashboard)
- **Daily Competitive Intel** — Daily 7 AM report covering up to 10 competitors
- **Real-Time Price Alerts** — SMS to staff when competitor drops price ≥10% or shakes up menu ≥20%
- (Scout playbook "Weekly Competitive Snapshot" excluded — Enterprise-only higher tier)

### Compliance (4 playbooks)
- **Weekly Compliance Digest** — Monday morning summary of compliance posture
- **Pre-Send Campaign Check** — Compliance review before campaigns send
- **Jurisdiction Change Alert** — Alert when regulatory rules change in operating state
- **Audit Prep Automation** — Quarterly audit package with immutable compliance logs

### Analytics & Reporting (4 playbooks)
- **Weekly Performance Snapshot** — Monday 9 AM email: top products, conversion rates, SMS/email performance
- **Campaign ROI Report** — Per-campaign revenue attribution report at month-end
- **Executive Daily Digest** — Daily multi-agent rollup: revenue, compliance, competitor moves
- **Multi-Location Rollup** — Monthly cross-location performance report

### Seasonal (1 playbook)
- **Seasonal Template Pack** — Quarterly AI-generated campaign template pack

---

## Current Status: PAUSED ⏸️

All playbook assignments are currently in **PAUSED** (draft) state. This means:

✅ **What's configured:**
- Customers synced and loyalty enrolled
- Playbooks defined and ready to activate
- Triggers configured
- Schedules prepared

⏳ **What's blocked:**
- Email campaigns won't send until playbooks are ACTIVE
- Compliance gates will not block on pre-send checks (non-critical)
- Insights won't notify via email (dashboards still work)

---

## Activation Roadmap

### Phase 1: Mailjet Subuser Setup (YOUR ACTION NEEDED)

**What you need to do:**
1. Log into Mailjet dashboard → Settings → Accounts & Subaccounts
2. Create new subuser for Thrive Syracuse with:
   - Name: "Thrive Syracuse"
   - Email: thrive-admin@thrivemail.com (or your preference)
   - Permissions: Sending + statistics
3. Generate API keys for the subuser
4. Provide keys to BakedBot team (or configure in apphosting.yaml)

**Estimated time:** 5-10 minutes

### Phase 2: Activate Playbooks (BakedBot Team)

Once Mailjet subuser is configured:

```bash
# Update playbook_assignments to ACTIVE
db.collection('playbook_assignments')
  .where('subscriptionId', '==', 'org_thrive_syracuse-empire-subscription')
  .update({ status: 'active' })
```

Or using the Firestore UI:
1. Go to Firestore → Collections → `playbook_assignments`
2. Filter: `subscriptionId == org_thrive_syracuse-empire-subscription`
3. Bulk update: `status = 'active'`

### Phase 3: Email Campaigns Begin

Once activated, campaigns will trigger on:
- **Welcome Sequence** — Immediately when customer is marked new
- **Birthday Loyalty Reminder** — 1st of month at 8 AM
- **Daily Competitive Intel** — Every day at 7 AM
- **[20 more playbooks with staggered triggers]**

---

## Loyalty Program Configuration

### Enrollment Details

**Customers:** 111 with email addresses
**Initial Tier:** Bronze
**Initial Points:** 0
**Tier Structure:**

| Tier | Points Threshold | Benefits |
|------|------------------|----------|
| Bronze | 0+ | 1x points |
| Silver | 200+ | 1.25x points, Early access to deals |
| Gold | 500+ | 1.5x points, Birthday bonus, Free delivery |
| Platinum | 1000+ | 2x points, VIP events, Exclusive products |

### Points Calculation

- **Base Rate:** 1 point per $1 spent
- **Equity Bonus:** +20% points for equity applicants
- **Redemption:** 100 points = $5 (standard rate)

### Activation

Points will begin accumulating on next order. See `loyalty-sync.ts` for full implementation.

---

## Customer Data Structure

Customers are stored in Firestore at:

```
collections/customers/{docId}
  id: "org_thrive_syracuse_1001"
  orgId: "org_thrive_syracuse"
  email: "customer@example.com"
  firstName: "John"
  lastName: "Doe"
  tier: "bronze"
  points: 0
  segment: "new"
  totalSpent: 0
  orderCount: 0
  source: "pos_alleaves"
  loyaltyEnrolledAt: <timestamp>
```

### Sync Triggers

Customer data syncs from Alleaves POS via:
- **Manual sync:** `POST /api/cron/pos-sync` (on demand)
- **Automatic sync:** Every 6 hours via Cloud Scheduler
- **Real-time:** Order capture via Alleaves webhooks

---

## Playbook Assignment Structure

Playbooks are assigned at the **subscription** level (not per-customer):

```
collections/playbook_assignments/{docId}
  subscriptionId: "org_thrive_syracuse-empire-subscription"
  orgId: "org_thrive_syracuse"
  playbookId: "welcome-sequence"
  status: "paused"  // → change to "active" to enable
  createdAt: <timestamp>
  updatedAt: <timestamp>
  lastTriggered: null
  triggerCount: 0
```

### Status Meanings

- **active** — Playbook triggers normally on configured schedule/events
- **paused** — Triggers are blocked (awaiting setup)
- **completed** — Playbook runs once and stops (e.g., onboarding sequences)

---

## Execution Schedule Reference

Once activated, playbooks run on this schedule:

| Frequency | Execution Time | Examples |
|-----------|-----------------|----------|
| **one_time** | On trigger event | Welcome, Menu Health Scan, White-Glove Onboarding |
| **daily** | 7 AM local timezone | Daily Competitive Intel, Executive Daily Digest |
| **weekly** | Monday 9 AM local tz | Weekly Performance, Competitive Brief, Compliance Digest |
| **monthly** | 1st of month 8 AM | Birthday Loyalty, Campaign ROI, VIP Identification |
| **quarterly** | Jan 1, Apr 1, Jul 1, Oct 1 | Seasonal Pack, Audit Prep |
| **event_driven** | Within 5 min of trigger | Post-Purchase Thank You, Pre-Send Compliance, Real-Time Alerts |

---

## Testing & Verification

### Verify Setup (Pre-Activation)

```bash
# 1. Check customers are enrolled
db.collection('customers')
  .where('orgId', '==', 'org_thrive_syracuse')
  .count()
// Expected: 111

# 2. Check playbooks are assigned
db.collection('playbook_assignments')
  .where('subscriptionId', '==', 'org_thrive_syracuse-empire-subscription')
  .count()
// Expected: 22

# 3. Check status is PAUSED
db.collection('playbook_assignments')
  .where('subscriptionId', '==', 'org_thrive_syracuse-empire-subscription')
  .where('status', '==', 'paused')
  .count()
// Expected: 22 (all paused initially)
```

### Test Post-Activation

After Mailjet setup and playbook activation:

1. **Test Welcome Sequence:**
   - Create new test customer in Thrive Syracuse brand page
   - Verify email arrives within 5 minutes
   - Check email preview in Inbox thread

2. **Test Birthday Reminder:**
   - Create customer with `birthDate` in 1-2 days
   - Wait for next monthly trigger (or manually test via `POST /api/cron/playbook-runner`)
   - Verify email preview in thread

3. **Test Competitive Intel:**
   - Verify email arrives daily at 7 AM
   - Check dashboard for intel visibility

---

## Troubleshooting

### Playbooks Not Triggering After Activation

**Possible causes:**
1. Playbook status still "paused" (check Firestore)
2. Mailjet subuser API keys not configured
3. CRON_SECRET not matching Cloud Scheduler
4. Email service outage

**Steps to diagnose:**
```bash
# Check playbook status
db.collection('playbook_assignments')
  .where('subscriptionId', '==', 'org_thrive_syracuse-empire-subscription')
  .where('status', '==', 'active')
  .count()
// Should be 22

# Check trigger counts (should increase over time)
db.collection('playbook_assignments')
  .where('subscriptionId', '==', 'org_thrive_syracuse-empire-subscription')
  .get()
// Look at triggerCount field

# Check execution logs
db.collection('playbook_executions')
  .where('orgId', '==', 'org_thrive_syracuse')
  .orderBy('createdAt', 'desc')
  .limit(10)
// Look for success/error logs
```

### Customer Data Out of Sync

If customer counts don't match Alleaves:

```bash
# Manually trigger POS sync
curl -X POST https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app/api/cron/pos-sync \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"orgId": "org_thrive_syracuse", "full_sync": true}'
```

---

## Files Created

| File | Purpose |
|------|---------|
| `scripts/enroll-thrive-customers.mjs` | Initial enrollment (loyalty + paused playbooks) |
| `scripts/sync-and-enroll-thrive.mjs` | Full sync from Alleaves + enrollment (production) |
| `scripts/explore-thrive-customers.mjs` | Data structure exploration/debugging |
| `THRIVE_ENROLLMENT_SETUP.md` | This documentation |

### Running Scripts

```bash
# Quick verification
node scripts/explore-thrive-customers.mjs

# Full production sync (requires Alleaves API integration)
node scripts/sync-and-enroll-thrive.mjs

# One-time enrollment (already run)
node scripts/enroll-thrive-customers.mjs
```

---

## Next Steps Checklist

- [ ] **Mailjet Setup** — Create subuser account + API keys
- [ ] **Configuration** — Provide credentials to BakedBot team
- [ ] **Activation** — Update playbook_assignments status to `active`
- [ ] **Testing** — Run test campaigns (welcome, competitive intel, etc.)
- [ ] **Monitoring** — Check email deliverability + engagement metrics
- [ ] **Optimization** — Adjust playbook triggers based on Thrive's needs

---

## Questions?

For detailed integration help:
- See `.agent/specs/loyalty-rewards-system.md` for Loyalty Program architecture
- See `.agent/prime.md` for Playbook engine reference
- Contact: engineering@bakedbot.ai

**Enrollment Status:** 🟢 READY TO ACTIVATE

---

*Last updated: 2026-02-21*
*Enrollment version: 1.0*
