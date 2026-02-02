# Daily Loyalty Sync Cron Job Setup

## Overview

Automatic daily sync of loyalty points from Alleaves + Alpine IQ at 2 AM.

**Endpoint**: `/api/cron/loyalty-sync`
**Schedule**: `0 2 * * *` (2 AM daily, UTC)
**Created**: [src/app/api/cron/loyalty-sync/route.ts](../src/app/api/cron/loyalty-sync/route.ts)

---

## Option 1: Firebase Cloud Scheduler (Recommended)

Since you're using Firebase App Hosting, use Cloud Scheduler.

### Step 1: Enable Cloud Scheduler API

```bash
gcloud services enable cloudscheduler.googleapis.com
```

### Step 2: Create Cron Job

```bash
gcloud scheduler jobs create http loyalty-sync-daily \
  --location=us-central1 \
  --schedule="0 2 * * *" \
  --uri="https://your-app-domain.com/api/cron/loyalty-sync" \
  --http-method=POST \
  --headers="Content-Type=application/json,Authorization=Bearer YOUR_CRON_SECRET" \
  --time-zone="America/New_York"
```

**Replace:**
- `your-app-domain.com` → Your actual domain
- `YOUR_CRON_SECRET` → Generate a secret (see below)
- `America/New_York` → Your timezone

### Step 3: Generate Cron Secret

```bash
# Generate a random secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Add to Firebase App Hosting secrets:

```bash
firebase apphosting:secrets:set CRON_SECRET
# Paste the generated secret when prompted
```

Or add to `apphosting.yaml`:

```yaml
env:
  - variable: CRON_SECRET
    secret: CRON_SECRET
```

### Step 4: Test the Cron Job

```bash
# Manual trigger
gcloud scheduler jobs run loyalty-sync-daily --location=us-central1

# Check logs
gcloud scheduler jobs describe loyalty-sync-daily --location=us-central1
```

---

## Option 2: Vercel Cron (If using Vercel)

If deploying to Vercel, add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/loyalty-sync",
      "schedule": "0 2 * * *"
    }
  ]
}
```

Deploy:

```bash
vercel deploy --prod
```

Vercel automatically authenticates cron jobs, no secret needed.

---

## Option 3: GitHub Actions (Alternative)

Create `.github/workflows/loyalty-sync-cron.yml`:

```yaml
name: Daily Loyalty Sync
on:
  schedule:
    - cron: '0 2 * * *'  # 2 AM UTC
  workflow_dispatch:  # Allow manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Loyalty Sync
        run: |
          curl -X POST https://your-app-domain.com/api/cron/loyalty-sync \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

Add `CRON_SECRET` to GitHub repository secrets.

---

## Option 4: Manual Trigger (Testing)

For testing or one-off syncs:

```bash
# Using curl
curl -X POST http://localhost:3000/api/cron/loyalty-sync \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_cron_secret"

# Or use the setup script
npx tsx dev/run-initial-loyalty-sync.ts
```

---

## Cron Schedule Reference

| Schedule | Description |
|----------|-------------|
| `0 2 * * *` | 2 AM daily (Recommended) |
| `0 */6 * * *` | Every 6 hours |
| `0 0 * * 0` | Weekly (Sunday midnight) |
| `0 1 1 * *` | Monthly (1st at 1 AM) |

---

## Monitoring

### Check Logs

**Firebase:**
```bash
gcloud logging read "resource.type=cloud_scheduler_job AND resource.labels.job_id=loyalty-sync-daily" --limit 50
```

**Application Logs:**
```bash
# Search for cron-related logs
firebase apphosting:logs --filter="[Cron]"
```

### Success Indicators

Look for these log entries:
```
[Cron] Starting daily loyalty sync
[Cron] Found brands to sync { count: X }
[Cron] Brand sync completed { brandId, customersProcessed, discrepancies }
[Cron] Daily loyalty sync completed { successful, failed }
```

### Alert Conditions

The cron job logs warnings for:
- ❌ **Unauthorized access attempts**
- ⚠️  **High discrepancy count** (>10 per brand)
- ❌ **Sync failures** (per brand)

---

## Environment Variables

Ensure these are set:

```env
# Required
CRON_SECRET=your_generated_secret_here
NEXT_PUBLIC_APP_URL=https://your-app-domain.com

# Already configured (from POS setup)
ALLEAVES_USERNAME=xxx
ALLEAVES_PASSWORD=xxx
ALLEAVES_PIN=xxx

# Optional (Alpine IQ)
ALPINE_IQ_API_KEY=xxx
```

---

## Testing

### 1. Test Locally

Start dev server:
```bash
npm run dev
```

Trigger sync:
```bash
curl -X POST http://localhost:3000/api/cron/loyalty-sync \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test_secret"
```

### 2. Test in Production

```bash
# Manual trigger via Cloud Scheduler
gcloud scheduler jobs run loyalty-sync-daily --location=us-central1

# Or direct HTTP call
curl -X POST https://your-app-domain.com/api/cron/loyalty-sync \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CRON_SECRET"
```

### 3. Verify Results

Check Firestore:
```javascript
// In Firebase Console or via Admin SDK
firestore.collection('customers')
  .where('orgId', '==', 'your_brand_id')
  .where('pointsLastCalculated', '>=', new Date('2026-01-30'))
  .get()
  .then(snapshot => console.log(`${snapshot.size} customers synced today`))
```

---

## Troubleshooting

### Issue: 401 Unauthorized

**Cause**: Invalid or missing CRON_SECRET

**Fix**:
1. Verify secret is set: `firebase apphosting:secrets:list`
2. Update cron job header with correct secret
3. Redeploy if secret was just added

### Issue: 500 Server Error

**Cause**: Missing Alleaves POS config or Firebase credentials

**Fix**:
1. Check brand document has `posConfig.provider = 'alleaves'`
2. Verify Firebase Admin SDK is initialized
3. Check logs for specific error message

### Issue: No Brands Found

**Cause**: No brands have Alleaves configured

**Fix**:
1. Ensure brand documents have correct `posConfig`:
   ```javascript
   {
     posConfig: {
       provider: 'alleaves',
       username: 'xxx',
       password: 'xxx',
       locationId: '1000'
     }
   }
   ```

### Issue: Timeout (Function exceeded time limit)

**Cause**: Too many customers to sync in one run

**Fix**:
1. Increase Cloud Function timeout (default 60s)
2. Or batch process brands over multiple cron jobs
3. Or sync only customers with recent orders

---

## Next Steps

1. **Choose your deployment option** (Firebase/Vercel/GitHub Actions)
2. **Generate CRON_SECRET** and add to environment
3. **Create the cron job** using commands above
4. **Test manually** to verify it works
5. **Monitor first automated run** (next day at 2 AM)
6. **Set up alerts** (optional) for failures/discrepancies

---

## Security

- ✅ CRON_SECRET prevents unauthorized access
- ✅ Only processes brands with Alleaves configured
- ✅ Logs all sync attempts
- ✅ Rate-limited by cron schedule (1x daily max)

**DO NOT** expose the `/api/cron/loyalty-sync` endpoint publicly without auth.

---

## Cost Estimate

**Firebase Cloud Scheduler:**
- $0.10 per job per month (1 job = $0.10/mo)
- API calls: Included in Firestore pricing

**Total**: ~$0.10/month + Firestore read/write costs

---

## Success Metrics

Monitor these over time:
- ✅ Sync success rate (should be >99%)
- ✅ Average sync duration per brand
- ✅ Discrepancy rate (should be <5%)
- ✅ Customer coverage (% with calculated points)

---

**Ready to set up?** Choose your option and follow the steps above! 🚀
