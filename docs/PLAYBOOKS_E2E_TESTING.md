# Playbooks Path 1 — End-to-End Testing Guide

## Overview

This guide walks through testing the complete Playbooks automation system from event trigger through revenue attribution.

**Estimated Time**: 1-2 hours (depending on POS/ecommerce platform setup)

---

## Prerequisites

1. ✅ All secrets created in Secret Manager
2. ✅ Firebase App Hosting deployment complete
3. ✅ Access to test Alleaves account (Thrive Syracuse or similar)
4. ✅ (Optional) Shopify/WooCommerce test store

---

## Test Scenarios

### Scenario 1: Alleaves Order → Craig Email + Mrs. Parker Loyalty

**Goal**: Verify real-time order triggering and agent execution

**Setup**:
1. Create test playbook in UI:
   - Name: "Test Order Welcome"
   - Trigger: Event `order.created`
   - Steps:
     - Step 1: Craig → Send email
     - Step 2: Mrs. Parker → Award 10 points

2. Verify playbook is active and saved

**Test Execution**:
```bash
# Option A: Use Alleaves UI
1. Create test order in Alleaves for existing customer
2. Verify customer email received within 30 seconds
3. Check Firestore: /customers/{customerId}/loyalty_transactions
   - Should show +10 points record with "Test Order Welcome" reason

# Option B: Simulate webhook
curl -X POST https://bakedbot-prod.us-central1.hosted.app/api/webhooks/alleaves \
  -H "Content-Type: application/json" \
  -H "x-alleaves-signature: {signature}" \
  -d '{
    "event": "order.created",
    "data": {
      "id": "test-order-123",
      "orgId": "org_thrive_syracuse",
      "locationId": "1000",
      "customer_id": "cust-123",
      "customer_email": "test@example.com",
      "total": 45.99,
      "items": [...]
    },
    "timestamp": "2026-02-17T22:00:00Z"
  }'
```

**Verification Checklist**:
- [ ] Email sent to customer (check Mailjet/SendGrid logs)
- [ ] Loyalty points recorded in Firestore
- [ ] Execution logged in `playbook_executions` collection
- [ ] Analytics dashboard shows +1 execution count

---

### Scenario 2: Shopify Cart Abandoned → Craig SMS Reminder

**Goal**: Verify multi-platform ecommerce webhook integration

**Setup**:
1. Create test Shopify store (or use test environment)
2. Generate Shopify webhook secret (from Shopify Admin)
3. Create playbook:
   - Trigger: Event `cart.abandoned`
   - Delay: 1 hour
   - Steps: Craig → Send SMS

**Test Execution**:
```bash
# 1. Register webhook endpoint in Shopify Admin
# Settings → Webhooks → Create → cart/abandoned
# Endpoint: https://bakedbot-prod.us-central1.hosted.app/api/webhooks/ecommerce?orgId=your-org-id

# 2. Test webhook from Shopify:
curl -X POST https://bakedbot-prod.us-central1.hosted.app/api/webhooks/ecommerce?orgId=org_test \
  -H "Content-Type: application/json" \
  -H "x-shopify-hmac-sha256: {computed-signature}" \
  -H "x-shopify-topic: carts/update" \
  -d '{
    "topic": "carts/update",
    "id": 12345678901,
    "email": "test@example.com",
    "customer": {
      "id": 98765432,
      "email": "test@example.com"
    },
    "line_items": [...],
    "abandoned_checkout_url": "https://example.myshopify.com/...",
    "total_price": "99.99"
  }'

# 3. Wait 1 hour OR manually trigger playbook
curl -X POST https://bakedbot-prod.us-central1.hosted.app/api/playbooks/test-playbook-id/execute \
  -H "Authorization: Bearer {user-token}" \
  -H "Content-Type: application/json"
```

**Verification Checklist**:
- [ ] Customer resolved by email in `customers` collection
- [ ] Playbook execution created with `triggeredBy: 'event'`
- [ ] SMS sent via Blackleaf API
- [ ] Analytics dashboard shows ecommerce event count

---

### Scenario 3: Multi-Step Attribution & ROI

**Goal**: Verify revenue attribution and analytics calculations

**Setup**:
1. Create 5-10 test orders via Alleaves with different customers
2. Ensure playbooks execute for each order
3. Create corresponding orders in same time window

**Test Execution**:
```bash
# 1. Create test orders in Alleaves
for i in {1..5}; do
  # Order via Alleaves API
  curl -X POST https://alleaves.com/api/orders \
    -H "Authorization: Bearer {jwt-token}" \
    -d "{customer_id: customer-$i, total: $((RANDOM % 100 + 10))}"
done

# 2. Create corresponding customer orders in Firestore
# (Simulate orders placed after campaign email)
# Write to: /orders/{orderId}
# With: customerId, createdAt, total

# 3. Wait 5-10 minutes for attribution cron job
# Or manually trigger: POST /api/cron/playbook-attribution?orgId=org_test

# 4. View Analytics Dashboard
# Open: /dashboard/playbooks/analytics?orgId=org_test
```

**Verification Checklist**:
- [ ] Overview tab shows execution count > 0
- [ ] Revenue Attributed > $0
- [ ] Playbooks tab shows per-playbook metrics
- [ ] Success rate calculated (successful / total)
- [ ] Events tab shows `order.created` distribution
- [ ] Top 5 tab shows playbooks sorted by revenue
- [ ] Daily trend shows execution/revenue correlation

---

### Scenario 4: Event Deduplication (24h Window)

**Goal**: Verify double-trigger prevention

**Setup**:
1. Create simple playbook: trigger on `customer.updated`
2. Send two Alleaves webhooks for same customer

**Test Execution**:
```bash
# 1. First webhook - should execute
curl -X POST /api/webhooks/alleaves \
  -d '{"event": "customer.updated", "data": {"id": "cust-123", "orgId": "org_test"}}'

# Check Firestore: playbook_executions should have 1 record

# 2. Second webhook (5 minutes later) - should be dedupped
curl -X POST /api/webhooks/alleaves \
  -d '{"event": "customer.updated", "data": {"id": "cust-123", "orgId": "org_test"}}'

# Check Firestore:
# - playbook_executions: still 1 record
# - customer_communications: 1 record with type="playbook_event_customer.updated"
```

**Verification Checklist**:
- [ ] First webhook triggers execution
- [ ] Second webhook logs dedup (no second execution)
- [ ] Dedup entry in `customer_communications` with 24h TTL concept
- [ ] Cloud Logging shows "[EventDispatcher] Event dedupped (24h window)" message

---

## Manual Verification Checklist

### Collections to Inspect

```
Firestore Collections:
├── customers/
│   └── {customerId}/
│       ├── Basic info (email, phone, etc)
│       └── loyalty_transactions/ (points awarded)
├── playbook_executions/
│   └── {executionId}
│       ├── status: "completed" | "failed"
│       ├── triggeredBy: "event" | "manual" | "schedule"
│       ├── revenueAttributed: number
│       └── eventData: {...}
├── playbook_event_listeners/
│   └── Active playbooks registered for events
├── customer_communications/
│   └── Dedup records + delivery history
└── orders/
    └── Revenue data for attribution
```

### Logging

**Cloud Logging Queries**:

```
# View all playbook dispatcher events
resource.type="cloud_function" OR resource.type="cloud_run_revision"
jsonPayload.message=~"EventDispatcher"

# View webhook events
resource.type="cloud_run_revision"
httpRequest.path=~"/api/webhooks/(alleaves|ecommerce)"

# View playbook executions
jsonPayload.message=~"executePlaybook"

# View dedup events
jsonPayload.message=~"dedupped"
```

### API Endpoints to Test

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/webhooks/alleaves` | POST | Alleaves event webhook |
| `/api/webhooks/ecommerce` | POST | Ecommerce webhook (Shopify/WooCommerce) |
| `/api/playbooks/{id}/execute` | POST | Manual playbook execution |
| `/dashboard/playbooks/analytics` | GET | ROI analytics dashboard |

---

## Performance Baselines

| Metric | Target | Unit |
|--------|--------|------|
| Webhook to Execution | < 5 | seconds |
| Email Delivery | < 30 | seconds |
| SMS Delivery | < 60 | seconds |
| Analytics Dashboard Load | < 3 | seconds |
| Loyalty Points Update | < 10 | seconds |

---

## Troubleshooting

### Playbook Not Triggering

1. Check `playbook_event_listeners` collection
   - Is listener registered with correct `eventName` and `status: 'active'`?
2. Check Cloud Logging for dispatcher errors
   - Search: `[EventDispatcher] Error`
3. Verify webhook signature
   - If signature fails, webhook returns 401

### Email Not Sent

1. Verify Craig handler is wired
2. Check Mailjet/SendGrid logs
3. Look for `sendGenericEmail()` errors in logs
4. Verify `orgId` matches email configuration

### Analytics Dashboard Empty

1. Wait 5-10 minutes for data propagation
2. Check `playbook_executions` collection has records
3. Verify `orgId` parameter in URL
4. Check browser console for errors

### Revenue Not Attributed

1. Verify orders exist in `/orders` collection
2. Check attribution window (7 days by default)
3. Ensure `customerId` matches between execution and order
4. Check `playbook-attribution.ts` cron job logs

---

## Load Testing (Optional)

For stress testing, use Artillery or Locust:

```bash
# Artillery load test (100 RPS for 5 minutes)
artillery quick --count 100 --num 500 \
  https://bakedbot-prod.us-central1.hosted.app/api/webhooks/alleaves

# Monitor:
# - Firebase function concurrency limits
# - Firestore write throughput
# - Cloud Logging message rate
```

---

## Sign-Off Checklist

- [ ] Unit tests passing (52 tests)
- [ ] Type check passing (`npm run check:types`)
- [ ] Alleaves webhook tested
- [ ] Ecommerce webhook tested
- [ ] Analytics dashboard populated with real data
- [ ] Revenue attribution verified
- [ ] Deduplication working
- [ ] Email/SMS delivery confirmed
- [ ] Loyalty points updating
- [ ] Performance baselines met
- [ ] Production secrets configured
- [ ] No 5xx errors in logs

---

## Deployment Confirmation

Once all checks pass:

```bash
# 1. Verify production deployment
gcloud app describe --project=studio-567050101-bc6e8

# 2. Check Firebase App Hosting
firebase apphosting:backends:describe bakedbot-prod

# 3. Verify secrets are active
gcloud secrets list | grep -E "SHOPIFY|WOOCOMMERCE|ECOMMERCE"

# 4. Monitor initial traffic
# Cloud Logging → Filter for webhook events
# Expected: 0 errors for first 24 hours
```

---

**Ready to deploy to production?** 🚀

All tests passing → All E2E scenarios verified → Secrets configured → **GO LIVE**

