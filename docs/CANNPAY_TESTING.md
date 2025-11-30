# CannPay Sandbox Testing Guide

**For:** Dev 4 - P0-CANNPAY-INTEGRATION-TEST  
**Purpose:** Test CannPay payment flow end-to-end in sandbox environment  
**Time:** 3 hours

---

## Quick Start

```bash
# 1. Set up environment variables
# Add to .env.local:
CANPAY_APP_KEY=your_sandbox_app_key
CANPAY_API_SECRET=your_sandbox_secret
CANPAY_INTEGRATOR_ID=your_integrator_id
CANPAY_INTERNAL_VERSION=1.0.0
CANPAY_ENVIRONMENT=sandbox

# 2. Start local tunnel for webhook testing
npx ngrok http 3001

# 3. Update webhook URL in CannPay dashboard
# Set to: https://YOUR_NGROK_URL.ngrok.io/api/webhooks/cannpay

# 4. Run integration tests
npm test -- tests/integration/cannpay.spec.ts
```

---

## CannPay Credentials

### Sandbox Environment
- **API Base URL:** `https://sandbox.canpay.com`
- **Widget URL:** `https://widget-sandbox.canpay.com`

### Required Secrets (from GCP Secret Manager)
```bash
# View secrets
gcloud secrets versions access latest --secret="CANPAY_APP_KEY"
gcloud secrets versions access latest --secret="CANPAY_API_SECRET"
gcloud secrets versions access latest --secret="CANPAY_INTEGRATOR_ID"
gcloud secrets versions access latest --secret="CANPAY_INTERNAL_VERSION"
```

---

## Test Scenarios

### 1. Payment Intent Creation
**Endpoint:** POST `/integrator/authorize`

```typescript
// Test: Create payment intent with valid order
const response = await cannpay.authorizePayment({
  amount: 10050, // $100.50 in cents
  deliveryFee: 50, // $0.50 transaction fee
  merchantOrderId: 'test-order-123',
  passthrough: JSON.stringify({
    orderId: 'order-abc',
    organizationId: 'org-xyz'
  })
});

expect(response.intent_id).toBeDefined();
expect(response.widget_url).toContain('widget-sandbox.canpay.com');
```

### 2. Payment Processing (Sandbox)
CannPay sandbox allows test transactions without real money:

**Test Card (Sandbox):**
- **Card Number:** Provided by CannPay support
- **Amount:** Any amount (will always succeed in sandbox)

**Expected Flow:**
1. Widget launches with intent_id
2. User enters test card details
3. Payment processes successfully
4. Webhook fired to `/api/webhooks/cannpay`
5. Order status updated

### 3. Webhook Handling
**Webhook Event:**
```json
{
  "type": "transaction.completed",
  "data": {
    "intent_id": "int_abc123",
    "transaction_number": "txn_456",
    "amount": 10050,
    "tip_amount": 0,
    "delivery_fee": 50,
    "status": "Success",
    "passthrough": "{\"orderId\":\"order-abc\",\"organizationId\":\"org-xyz\"}"
  },
  "signature": "sha256_hmac_signature"
}
```

**Verification Test:**
```typescript
// Test: Webhook signature verification
const isValid = await verifyCannPayWebhook(
  webhookBody,
  signature,
  process.env.CANPAY_API_SECRET
);

expect(isValid).toBe(true);
```

### 4. Edge Cases to Test

**Duplicate Webhook:**
```typescript
// Test: Idempotency - same webhook sent twice
await handleWebhook(webhookPayload); // First call
await handleWebhook(webhookPayload); // Second call (should not duplicate)

// Verify order only updated once
const order = await getOrder(orderId);
expect(order.canpay.processedWebhooks).toHaveLength(1);
```

**Out-of-Order Webhooks:**
```typescript
// Test: Handle webhooks arriving in wrong order
await handleWebhook({ type: 'transaction.settled', ... }); // Arrives first
await handleWebhook({ type: 'transaction.completed', ... }); // Arrives second

// Verify correct final state
```

**Invalid Signature:**
```typescript
// Test: Reject webhook with bad signature
const response = await POST('/api/webhooks/cannpay', {
  body: webhookPayload,
  headers: { 'x-cannpay-signature': 'invalid_signature' }
});

expect(response.status).toBe(403);
```

---

## Webhook Testing with ngrok

### Setup
```bash
# 1. Install ngrok (if not installed)
npm install -g ngrok

# 2. Start Next.js dev server
npm run dev # Runs on port 3001

# 3. Start ngrok tunnel
ngrok http 3001

# You'll get a URL like: https://abc123.ngrok.io
```

### Configure Webhook URL
Update CannPay dashboard webhook settings:
```
https://abc123.ngrok.io/api/webhooks/cannpay
```

### Test Webhook Locally
```bash
# Trigger test webhook from CannPay dashboard
# OR manually test with curl:

curl -X POST https://abc123.ngrok.io/api/webhooks/cannpay \
  -H "Content-Type: application/json" \
  -H "x-cannpay-signature: YOUR_HMAC_SIGNATURE" \
  -d '{
    "type": "transaction.completed",
    "data": {
      "intent_id": "int_test123",
      "transaction_number": "txn_test456",
      "amount": 10000,
      "status": "Success"
    }
  }'
```

---

## Integration Test Template

Create `tests/integration/cannpay.spec.ts`:

```typescript
import { describe, test, expect, beforeAll } from '@jest/globals';
import { authorizePayment, getTransactionDetails } from '@/lib/payments/cannpay';
import { verifyCannPayWebhook } from '@/app/api/webhooks/cannpay/route';

describe('CannPay Integration Tests', () => {
  let testIntentId: string;

  beforeAll(() => {
    // Ensure sandbox environment
    expect(process.env.CANPAY_ENVIRONMENT).toBe('sandbox');
  });

  test('should create payment intent successfully', async () => {
    const intent = await authorizePayment({
      amount: 10050,
      deliveryFee: 50,
      merchantOrderId: 'test-order-' + Date.now()
    });

    expect(intent.intent_id).toBeDefined();
    expect(intent.widget_url).toContain('widget-sandbox');
    
    testIntentId = intent.intent_id;
  });

  test('should verify webhook signature', async () => {
    const webhookBody = JSON.stringify({
      type: 'transaction.completed',
      data: { intent_id: testIntentId, status: 'Success' }
    });

    const signature = generateHMACSignature(
      webhookBody,
      process.env.CANPAY_API_SECRET
    );

    const isValid = await verifyCannPayWebhook(webhookBody, signature);
    expect(isValid).toBe(true);
  });

  test('should reject invalid webhook signature', async () => {
    const webhookBody = JSON.stringify({});
    const invalidSignature = 'invalid_signature';

    const isValid = await verifyCannPayWebhook(webhookBody, invalidSignature);
    expect(isValid).toBe(false);
  });

  test('should handle webhook idempotency', async () => {
    // Test that duplicate webhooks don't create duplicate processing
    const webhook = {
      type: 'transaction.completed',
      data: { intent_id: testIntentId }
    };

    // Send same webhook twice
    const result1 = await processWebhook(webhook);
    const result2 = await processWebhook(webhook);

    expect(result1.processed).toBe(true);
    expect(result2.alreadyProcessed).toBe(true);
  });
});

// Helper to generate HMAC signature for testing
function generateHMACSignature(payload: string, secret: string): string {
  const crypto = require('crypto');
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}
```

---

## CannPay Widget Integration

### Frontend Component
```typescript
// src/components/checkout/cannpay-widget.tsx
'use client';

import { useEffect, useRef } from 'react';

interface CannPayWidgetProps {
  intentId: string;
  onSuccess: (data: any) => void;
  onFailure: (error: any) => void;
}

export function CannPayWidget({ intentId, onSuccess, onFailure }: CannPayWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load CannPay widget script
    const script = document.createElement('script');
    script.src = 'https://widget-sandbox.canpay.com/widget.js';
    script.async = true;
    document.body.appendChild(script);

    script.onload = () => {
      // Initialize widget
      (window as any).CannPayWidget.init({
        intentId,
        container: containerRef.current,
        onSuccess,
        onFailure
      });
    };

    return () => {
      document.body.removeChild(script);
    };
  }, [intentId, onSuccess, onFailure]);

  return <div ref={containerRef} id="cannpay-widget-container" />;
}
```

---

## Troubleshooting

### Webhook Not Receiving Events
1. **Check ngrok status:** `ngrok http 3001`
2. **Verify webhook URL** in CannPay dashboard matches ngrok URL
3. **Check firewall:** Ensure port 3001 is open
4. **View ngrok requests:** Visit http://localhost:4040 for request inspector

### Signature Verification Failing
1. **Check secret:** Ensure `CANPAY_API_SECRET` matches sandbox account
2. **Body format:** Webhook body must be raw JSON string (not parsed)
3. **Signature header:** Check exact header name from CannPay docs

### Payment Intent Creation Fails
1. **Check credentials:** All 4 secrets must be set correctly
2. **Environment:** Ensure using sandbox, not production URLs
3. **Amount format:** Must be in cents (e.g., $10.00 = 1000)

---

## Success Criteria (Definition of Done)

- [ ] Successful test payment in CannPay sandbox
- [ ] Webhook received and verified with valid signature
- [ ] Order status updated correctly after payment
- [ ] Integration tests passing
- [ ] Documentation complete with sandbox credentials
- [ ] Error handling tested (declined payment, timeout, cancellation)
- [ ] Idempotency verified (duplicate webhooks handled)
- [ ] Invalid signature returns 403

---

## Related Files

- `/app/api/webhooks/cannpay/route.ts` - Webhook handler (✅ signature verification done)
- `/lib/payments/cannpay.ts` - CannPay API client (to be created)
- `/components/checkout/cannpay-widget.tsx` - Widget wrapper (to be created)
- `docs/ROADMAP_PHASE0.md` - P0-PAY-CANNPAY-INTEGRATION ticket

---

**Next Steps:**
1. Get sandbox credentials from CannPay support
2. Add credentials to `.env.local` and GCP Secret Manager
3. Set up ngrok tunnel for local webhook testing
4. Create integration test file
5. Run through all test scenarios
6. Document any issues found

**Support:** Dev 2 (Infrastructure) - available for ngrok setup and webhook debugging

---

*Created: November 30, 2025*  
*Sprint 4: P0-CANNPAY-INTEGRATION-TEST*  
*Estimated Time: 3 hours*
