# Thrive Syracuse POS Integration - Deployment Guide

## 🎯 Overview

This document provides step-by-step instructions for deploying the Alleaves POS integration to production for Thrive Syracuse.

### What's Included

✅ **Live Customer Data** - 2,527 customers from Alleaves POS
✅ **Live Order Data** - Real-time order history and tracking
✅ **Smart Caching** - 3-5 minute cache for fast performance
✅ **Auto-Sync** - Background sync every 30 minutes
✅ **Customer Preferences** - AI-inferred shopping patterns
✅ **Real-time Webhooks** - Instant updates from POS
✅ **Manual Sync** - Dashboard button for on-demand refresh

---

## 📋 Pre-Deployment Checklist

### 1. Environment Variables

Add these to your hosting environment (Firebase App Hosting or similar):

```env
# Alleaves POS Credentials (if not in Firestore)
ALLEAVES_USERNAME=thrivesyracuse@bakedbot.ai
ALLEAVES_PASSWORD=***
ALLEAVES_PIN=***

# Cron Job Security
CRON_SECRET=<generate-secure-random-string>

# Webhook Security (Optional)
ALLEAVES_WEBHOOK_SECRET=<webhook-secret-from-alleaves>

# Public env for client-side sync button (Optional)
NEXT_PUBLIC_CRON_SECRET=<same-as-CRON_SECRET>
```

**Generate CRON_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. GitHub Secrets

Set these in your GitHub repository for automated sync:

1. Go to: **GitHub Repo → Settings → Secrets and variables → Actions**
2. Click **New repository secret**
3. Add:
   - Name: `CRON_SECRET`
   - Value: `<your-secure-random-string>`

### 3. Firestore POS Configuration

Verify the location document has correct POS config:

```javascript
// Collection: locations
// Document ID: <thrive-location-id>
{
  orgId: "org_thrive_syracuse",
  posConfig: {
    provider: "alleaves",
    status: "active",
    username: "thrivesyracuse@bakedbot.ai",
    password: "***",
    pin: "***",
    locationId: "***",
    storeId: "***",
    environment: "production"
  }
}
```

---

## 🚀 Deployment Steps

### Step 1: Run Verification Script

Before deploying, verify the integration works:

```bash
npx tsx dev/verify-pos-integration.ts
```

**Expected Output:**
```
✅ POS Config Found
✅ Authentication Successful
✅ Fetched 2527 customers
✅ Fetched 100 orders
✅ Cache is working
🎉 ALL CHECKS PASSED
```

### Step 2: Commit and Push

```bash
git add .
git commit -m "feat: complete Alleaves POS integration with caching, sync, and webhooks

- Add getAllCustomers and getAllOrders to Alleaves adapter
- Wire Customers and Orders dashboards to POS data
- Implement 5-minute cache layer for performance
- Add auto-sync cron job (every 30 minutes)
- Add customer preference analysis
- Add sync status indicator UI component
- Add real-time webhook handler for instant updates

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

git push origin main
```

### Step 3: Verify Deployment

After Firebase App Hosting auto-deploys:

1. **Test Customers Dashboard:**
   - Navigate to `/dashboard/customers`
   - Verify 2,527 customers appear
   - Check segmentation (VIP, loyal, new, etc.)

2. **Test Orders Dashboard:**
   - Navigate to `/dashboard/orders`
   - Verify orders appear with correct statuses
   - Check order details and customer info

3. **Test Cache:**
   - Reload page multiple times quickly
   - Check browser DevTools → Network → should be fast (<100ms)
   - Wait 5 minutes, reload again → should see brief delay

4. **Test Manual Sync:**
   - Click "Sync Now" button in dashboard
   - Verify spinner shows during sync
   - Verify page reloads with fresh data

---

## 🔄 Monitoring Auto-Sync

### View Sync Logs

**GitHub Actions:**
1. Go to: **GitHub Repo → Actions → POS Sync Cron**
2. Click latest run
3. Expand "Sync POS Data" step
4. Review sync results JSON

**Firebase Logs:**
```bash
firebase functions:log --only api/cron/pos-sync
```

### Manual Trigger

**Via GitHub Actions:**
1. Go to: **Actions → POS Sync Cron → Run workflow**
2. Optional: Enter specific `orgId` (or leave blank for all)
3. Click "Run workflow"

**Via cURL:**
```bash
# Sync all orgs
curl -X POST "https://bakedbot.ai/api/cron/pos-sync" \
  -H "Authorization: Bearer $CRON_SECRET"

# Sync specific org
curl -X POST "https://bakedbot.ai/api/cron/pos-sync?orgId=org_thrive_syracuse" \
  -H "Authorization: Bearer $CRON_SECRET"
```

---

## 📊 Performance Monitoring

### Cache Hit Rate

Check server logs for cache effectiveness:

```
[POS_CACHE] Cache hit - Served from cache
[POS_CACHE] Cache miss (expired) - Fetched from POS
```

**Expected:**
- 80%+ cache hits during normal usage
- Cache miss after 5 minutes (customers) or 3 minutes (orders)

### API Response Times

Monitor dashboard load times:

**With Cache (Target):**
- Customers page: < 500ms
- Orders page: < 300ms

**Without Cache (Cold Start):**
- Customers page: 2-4 seconds (fetching 2,527 customers)
- Orders page: 1-2 seconds (fetching 100 orders)

### Sync Duration

Check sync job duration in logs:

**Expected:**
- Single org sync: 5-15 seconds
- Batch sync (all orgs): 30-90 seconds

---

## 🔔 Setting Up Webhooks (Optional)

For real-time updates instead of 30-minute sync:

### 1. Get Webhook URL

```
https://bakedbot.ai/api/webhooks/alleaves
```

### 2. Configure in Alleaves Admin

1. Log into Alleaves POS admin
2. Navigate to Settings → Webhooks
3. Add webhook URL: `https://bakedbot.ai/api/webhooks/alleaves`
4. Select events:
   - `customer.created`
   - `customer.updated`
   - `order.created`
   - `order.updated`
5. Copy the webhook secret
6. Add to environment: `ALLEAVES_WEBHOOK_SECRET=<secret>`

### 3. Verify Webhook

```bash
# Test webhook endpoint
curl https://bakedbot.ai/api/webhooks/alleaves

# Expected response:
{
  "status": "ready",
  "endpoint": "/api/webhooks/alleaves",
  "events": [...]
}
```

### 4. Test Webhook

Create a test customer or order in Alleaves POS and verify:
- Webhook received in logs
- Cache invalidated
- Dashboard shows new data without waiting for sync

---

## 🐛 Troubleshooting

### Issue: "No customers showing in dashboard"

**Check:**
1. POS config exists in Firestore location document
2. Credentials are correct (username/password/pin)
3. `posConfig.status === 'active'`
4. Run verification script: `npx tsx dev/verify-pos-integration.ts`

**Fix:**
```bash
# Test auth manually
npx tsx dev/test-alleaves-working-endpoints.ts
```

### Issue: "Cache not working"

**Check:**
1. Multiple page loads within 5 minutes should be instant
2. Check server logs for "Cache hit" messages

**Fix:**
- Cache is in-memory, restarts clear it
- For production, consider upgrading to Redis

### Issue: "Sync job failing"

**Check:**
1. GitHub Actions → POS Sync Cron → Latest run
2. Check error message in logs
3. Verify CRON_SECRET matches

**Fix:**
```bash
# Test sync manually
curl -X POST "http://localhost:3000/api/cron/pos-sync?orgId=org_thrive_syracuse" \
  -H "Authorization: Bearer dev-secret-change-in-production"
```

### Issue: "Orders showing wrong status"

**Check:**
- [src/app/dashboard/orders/actions.ts:229](src/app/dashboard/orders/actions.ts#L229) - `mapAlleavesStatus()` function
- Alleaves may use different status values

**Fix:**
```typescript
// Update status mapping in mapAlleavesStatus()
const statusMap: Record<string, OrderStatus> = {
  'new_alleaves_status': 'preparing', // Add new mapping
  // ...
};
```

---

## 📈 Future Enhancements

### Upgrade to Redis Cache

For production-grade caching across multiple server instances:

```bash
# Install Redis
npm install redis

# Update cache implementation
# Replace: src/lib/cache/pos-cache.ts
# With: Redis client instead of in-memory Map
```

### Add Real-time Dashboard Updates

Use Server-Sent Events or WebSockets for live updates:

```typescript
// src/app/dashboard/customers/page.tsx
useEffect(() => {
  const eventSource = new EventSource('/api/events/customers');
  eventSource.onmessage = (event) => {
    const newCustomer = JSON.parse(event.data);
    // Update UI in real-time
  };
}, []);
```

### Enhanced Customer Insights

Analyze order history for deeper insights:

```typescript
// Full order history analysis
const preferences = analyzeCustomerPreferences(orders);
// Returns: preferredCategories, favoriteProducts, purchasePatterns
```

### Multi-POS Support

Extend to support multiple POS systems:

- Dutchie
- Jane
- Treez
- Flowhub

All using the same caching and sync infrastructure!

---

## 📞 Support

**Issues?**
- GitHub: https://github.com/anthropics/bakedbot/issues
- Email: support@bakedbot.ai

**Questions?**
- Check logs: `firebase functions:log`
- Run verification: `npx tsx dev/verify-pos-integration.ts`
- Review this guide

---

## ✅ Deployment Complete!

Your Thrive Syracuse dashboard now shows **live POS data** with:
- 2,527 real customers
- 100+ recent orders
- Auto-refresh every 30 minutes
- Manual sync on demand
- Smart caching for fast loads
- Customer preference insights

🎉 **Ready for production!**
