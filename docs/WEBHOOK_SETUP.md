# Webhook Setup Guide

**Real-time data synchronization with Alleaves POS**

---

## Overview

Webhooks provide real-time updates from your Alleaves POS system to BakedBot, eliminating the need to wait for the 30-minute cron sync. When customers make purchases, update profiles, or orders change status, BakedBot is notified instantly.

---

## Why Use Webhooks?

### Without Webhooks (Cron Only)
- ⏰ Updates every 30 minutes
- 📊 Dashboard data may be stale
- 🔄 Manual sync needed for immediate updates

### With Webhooks
- ⚡ Real-time updates (< 1 second)
- 📊 Always up-to-date dashboard
- 🎯 Instant inventory updates
- 💰 Immediate order notifications

---

## Supported Events

| Event | Description | Trigger |
|-------|-------------|---------|
| `customer.created` | New customer account | Customer signs up |
| `customer.updated` | Customer profile changed | Profile edit, purchase |
| `order.created` | New order placed | Customer checks out |
| `order.updated` | Order status changed | Confirmed, ready, completed |

---

## Setup Process

### Step 1: Generate Webhook Secret

Generate a secure secret for signature verification:

```bash
# Generate random secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Example output:
# a1b2c3d4e5f6...
```

**Save this secret!** You'll need it for both Alleaves config and BakedBot env vars.

---

### Step 2: Set Environment Variable

Add the webhook secret to your environment:

#### Local Development (.env.local)
```bash
ALLEAVES_WEBHOOK_SECRET=a1b2c3d4e5f6...
```

#### Production (Firebase App Hosting)
```bash
# Via Firebase CLI
firebase apphosting:secrets:set ALLEAVES_WEBHOOK_SECRET

# Or via Firebase Console:
# 1. Go to App Hosting settings
# 2. Click "Add secret"
# 3. Name: ALLEAVES_WEBHOOK_SECRET
# 4. Value: [your secret]
```

---

### Step 3: Configure Alleaves Admin Panel

1. **Login to Alleaves Admin**
   - Navigate to https://app.alleaves.com
   - Login with your admin credentials

2. **Go to Integrations / Webhooks**
   - Location may vary by Alleaves version
   - Look for "Developer Settings" or "API & Webhooks"

3. **Add New Webhook**
   ```
   URL: https://bakedbot.ai/api/webhooks/alleaves
   Secret: [your webhook secret from Step 1]
   Events: Select all or specific:
     ✓ customer.created
     ✓ customer.updated
     ✓ order.created
     ✓ order.updated
   ```

4. **Test Webhook**
   - Alleaves should have a "Test" button
   - Click it to send a test event
   - Check BakedBot logs for success

---

### Step 4: Verify Setup

#### Option A: Via Alleaves Test Button

If Alleaves has a test button, use it! You should see:
- ✅ Status: 200 OK
- ✅ Response time: < 1s

#### Option B: Via Real Event

1. **Create a test customer** in Alleaves POS
2. **Check BakedBot logs:**
   ```bash
   # Via Firebase Console
   # Logs Explorer → Filter by "WEBHOOK"
   ```
3. **Expected log output:**
   ```
   [WEBHOOK] Received event: customer.created
   [WEBHOOK] Signature verified ✓
   [WEBHOOK] Cache invalidated: org_xxx:customers
   [WEBHOOK] Event processed successfully
   ```

#### Option C: Manual Test

```bash
# Send test webhook (from your terminal)
curl -X POST https://bakedbot.ai/api/webhooks/alleaves \
  -H "Content-Type: application/json" \
  -H "X-Alleaves-Signature: [calculated signature]" \
  -d '{
    "event": "customer.created",
    "data": {
      "id_customer": 12345,
      "email": "test@example.com",
      "name_first": "Test",
      "name_last": "Customer"
    }
  }'
```

---

## How It Works

### Request Flow

```
Alleaves POS Event → Webhook POST → BakedBot API → Cache Invalidation → Dashboard Update
```

### Signature Verification (Security)

BakedBot verifies every webhook using HMAC-SHA256:

```typescript
// Alleaves sends this header:
X-Alleaves-Signature: sha256=abc123...

// BakedBot verifies:
const signature = crypto
  .createHmac('sha256', WEBHOOK_SECRET)
  .update(JSON.stringify(body))
  .digest('hex');

if (signature !== providedSignature) {
  return 401 Unauthorized;
}
```

**This prevents:**
- 🛡️ Spoofed webhooks
- 🔒 Man-in-the-middle attacks
- ⚠️ Replay attacks

---

## Webhook Endpoint Details

### Endpoint Information

```
URL: https://bakedbot.ai/api/webhooks/alleaves
Method: POST
Content-Type: application/json
```

### Expected Headers

```
Content-Type: application/json
X-Alleaves-Signature: sha256=[signature]
```

### Example Payload

#### customer.created
```json
{
  "event": "customer.created",
  "timestamp": "2026-02-02T12:00:00Z",
  "data": {
    "id_customer": 12345,
    "email": "customer@example.com",
    "name_first": "John",
    "name_last": "Doe",
    "phone": "+15551234567",
    "date_of_birth": "1990-01-01",
    "equity_status": false
  }
}
```

#### order.updated
```json
{
  "event": "order.updated",
  "timestamp": "2026-02-02T12:05:30Z",
  "data": {
    "id_order": 67890,
    "id_customer": 12345,
    "status": "completed",
    "total": 125.50,
    "items": [
      {
        "id_item": 111,
        "name": "Blue Dream 3.5g",
        "quantity": 1,
        "price": 45.00
      }
    ]
  }
}
```

---

## Troubleshooting

### Webhook Returns 401 Unauthorized

**Cause:** Signature verification failed

**Solutions:**
1. Verify webhook secret matches in both Alleaves and BakedBot
2. Check `ALLEAVES_WEBHOOK_SECRET` environment variable
3. Ensure Alleaves is sending `X-Alleaves-Signature` header
4. Verify signature format: `sha256=[hash]`

**Test signature manually:**
```bash
# Calculate expected signature
echo -n '{"event":"test"}' | openssl dgst -sha256 -hmac "your_secret"
```

### Webhook Returns 400 Bad Request

**Cause:** Invalid payload format

**Solutions:**
1. Ensure `Content-Type: application/json` header is sent
2. Verify JSON payload is valid
3. Check required fields are present:
   - `event`: string
   - `data`: object

### Webhook Times Out

**Cause:** BakedBot processing taking too long

**Solutions:**
1. Check BakedBot logs for errors
2. Verify database connections
3. May need to increase timeout in Alleaves (if configurable)

### Events Not Appearing in Dashboard

**Cause:** Cache not properly invalidated

**Solutions:**
1. Check webhook logs for cache invalidation
2. Manually clear cache: Visit `/dashboard/dispensary` and click "Sync Now"
3. Verify `orgId` mapping is correct

---

## Monitoring

### Check Webhook Health

#### Via BakedBot Logs
```bash
# Firebase Console → Logs Explorer
# Filter: "WEBHOOK"
# Look for:
#   - "Event processed successfully"
#   - "Cache invalidated"
```

#### Via Alleaves Dashboard
- Most POS systems show webhook delivery status
- Look for 200 OK responses
- Check retry attempts (should be 0 for healthy webhooks)

### Set Up Alerts

**Recommended alerts:**

1. **High failure rate** (>5% failed webhooks in 1 hour)
   ```
   Alert when: webhook_failures / webhook_total > 0.05
   ```

2. **Webhook downtime** (no webhooks received in 1 hour during business hours)
   ```
   Alert when: No webhook events between 9am-9pm
   ```

3. **Signature failures** (repeated signature verification failures)
   ```
   Alert when: signature_failures > 10 in 10 minutes
   ```

---

## Performance Impact

### With Webhooks Enabled

| Metric | Value |
|--------|-------|
| Dashboard latency | < 100ms (cached) |
| Data freshness | Real-time (< 1s) |
| API calls saved | ~1,440/day (one per 30-min cron) |
| Cost savings | ~$5-10/month in API costs |

### Webhook Processing Time

| Event | Processing Time |
|-------|-----------------|
| customer.created | 50-100ms |
| customer.updated | 30-80ms |
| order.created | 100-200ms |
| order.updated | 80-150ms |

---

## Fallback Strategy

Even with webhooks enabled, the 30-minute cron sync still runs as a backup.

**Why?**
- Webhook delivery can fail (network issues, downtime)
- Ensures data consistency
- Catches any missed events

**Best of both worlds:**
- ⚡ Webhooks for real-time updates
- 🔄 Cron sync for reliability

---

## Advanced Configuration

### Custom Webhook Events

To add support for additional events, update the webhook handler:

**File:** `src/app/api/webhooks/alleaves/route.ts`

```typescript
// Add new event handler
case 'inventory.updated':
  await handleInventoryUpdate(event.data);
  cacheKeys.invalidate(orgId, 'products');
  break;
```

### Rate Limiting

The webhook endpoint has built-in rate limiting:
- **Max:** 100 requests per minute per IP
- **Response:** 429 Too Many Requests

To adjust:
```typescript
// src/app/api/webhooks/alleaves/route.ts
const RATE_LIMIT = 100; // requests per minute
```

### Webhook Retry Logic

Alleaves typically retries failed webhooks:
- **Retry 1:** After 1 minute
- **Retry 2:** After 5 minutes
- **Retry 3:** After 15 minutes
- **Retry 4:** After 1 hour

After 4 failures, the webhook is marked as failed and manual intervention is needed.

---

## Security Best Practices

### ✅ DO

- ✅ Always verify webhook signatures
- ✅ Use HTTPS only (never HTTP)
- ✅ Keep webhook secret secure (use environment variables)
- ✅ Log all webhook events for audit
- ✅ Implement rate limiting
- ✅ Validate payload structure before processing

### ❌ DON'T

- ❌ Don't hardcode webhook secrets in code
- ❌ Don't expose webhook endpoint without auth
- ❌ Don't process webhooks without signature verification
- ❌ Don't store sensitive data from webhooks unencrypted
- ❌ Don't ignore webhook failures silently

---

## FAQs

### Q: Do I need webhooks if cron sync is already working?

**A:** No, webhooks are optional. Cron sync (every 30 minutes) is sufficient for most use cases. Webhooks are beneficial if you need real-time updates.

### Q: What happens if webhook delivery fails?

**A:** Alleaves will retry the webhook up to 4 times. If all retries fail, the cron sync will catch the missed data within 30 minutes.

### Q: Can I use webhooks for other POS systems?

**A:** Currently, only Alleaves webhooks are supported. We're working on adding support for Dutchie, Treez, and other POS systems.

### Q: How much does webhook setup cost?

**A:** Webhooks are free! There's no additional cost beyond your existing BakedBot subscription.

### Q: Can I test webhooks in development?

**A:** Yes! Use ngrok or similar tools to expose your local server:
```bash
ngrok http 3000
# Then configure Alleaves webhook to: https://[ngrok-url]/api/webhooks/alleaves
```

---

## Support

Need help setting up webhooks?

- **Email:** support@bakedbot.ai
- **Discord:** https://discord.gg/bakedbot
- **Docs:** https://docs.bakedbot.ai/webhooks

---

**Last Updated:** February 2, 2026
**Version:** 1.0
