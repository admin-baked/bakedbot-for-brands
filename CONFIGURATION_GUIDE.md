# Configuration Guide - Revenue Systems

## ✅ Completed Steps

1. ✅ **Firestore Indexes Deployed**
   - Tier Advancement Index (customers: orgId, tierUpdatedAt, __name__)
   - Churn Prediction Index (customers: orgId, daysSinceLastOrder, __name__)
   - Status: Building (typically 2-5 minutes)
   - Verify: https://console.firebase.google.com/project/studio-567050101-bc6e8/firestore/indexes

---

## ⏳ Remaining Step: Configure Loyalty Settings

### Option 1: Firebase Console (Easiest - 2 minutes)

1. Open Firebase Console:
   https://console.firebase.google.com/project/studio-567050101-bc6e8/firestore/databases/-default-/data

2. Navigate to: `tenants` → `org_thrive_syracuse` → `settings`

3. Click **"Add document"** or **"Start collection"** (if settings doesn't exist)

4. Document ID: `loyalty`

5. Add these fields:

```json
{
  "enabled": true,
  "programName": "Rewards Program",
  "pointsPerDollar": 1,
  "dollarPerPoint": 0.01,
  "minPointsToRedeem": 100,
  "maxPointsPerOrder": 5000,
  "tiers": [
    {
      "name": "Bronze",
      "requiredSpend": 0,
      "multiplier": 1,
      "benefits": ["Earn 1 point per dollar"]
    },
    {
      "name": "Silver",
      "requiredSpend": 500,
      "multiplier": 1.2,
      "benefits": ["Earn 1.2 points per dollar", "Birthday bonus"]
    },
    {
      "name": "Gold",
      "requiredSpend": 1000,
      "multiplier": 1.5,
      "benefits": ["Earn 1.5 points per dollar", "Birthday bonus", "Exclusive deals"]
    },
    {
      "name": "Platinum",
      "requiredSpend": 2500,
      "multiplier": 2,
      "benefits": ["Earn 2 points per dollar", "Birthday bonus", "Exclusive deals", "VIP events"]
    }
  ],
  "tierInactivityDays": 180
}
```

**How to add in Console:**
- Click "String" for text fields (`programName`)
- Click "Number" for numeric fields (`pointsPerDollar`, `dollarPerPoint`, etc.)
- Click "Boolean" for `enabled` (set to `true`)
- Click "Array" for `tiers`, then add each object with its fields
- Click "Array" for `benefits` within each tier object

---

### Option 2: Quick Copy-Paste (Advanced Users)

If you're comfortable with the Firebase Console's "Import" feature:

1. Copy the JSON above
2. In Firestore Console, click the "•••" menu → "Import/Export"
3. Paste the JSON and import

---

## ✅ Verify Configuration

After adding the loyalty settings, run the production tests again:

```bash
export CRON_SECRET=$(gcloud secrets versions access latest --secret=CRON_SECRET --project=studio-567050101-bc6e8)
node scripts/test-production-revenue-systems.mjs --org=org_thrive_syracuse
```

**Expected Result:** 10/10 tests passing ✅

---

## 📊 What This Enables

Once configured, customers will earn points automatically:

| Tier | Spend Required | Multiplier | Example |
|------|----------------|------------|---------|
| Bronze | $0 (default) | 1x | $100 order = 100 points |
| Silver | $500+ lifetime | 1.2x | $100 order = 120 points |
| Gold | $1000+ lifetime | 1.5x | $100 order = 150 points |
| Platinum | $2500+ lifetime | 2x | $100 order = 200 points |

**Redemption:** 100 points = $1.00 discount

---

## 🔄 Index Build Status

Check if indexes are ready:
```bash
gcloud firestore indexes list --project=studio-567050101-bc6e8
```

Look for:
- `customers` (orgId, tierUpdatedAt, __name__) → **READY**
- `customers` (orgId, daysSinceLastOrder, __name__) → **READY**

Indexes typically take 2-5 minutes to build.

---

## 🎯 Final Checklist

- [x] Firestore indexes deployed
- [ ] Wait 2-5 minutes for indexes to build
- [ ] Configure loyalty settings (Firebase Console)
- [ ] Run production tests
- [ ] Verify 10/10 passing

**When complete, all 6 revenue systems will be fully operational!** 🚀

