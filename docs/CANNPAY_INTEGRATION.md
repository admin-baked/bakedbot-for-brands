# CannPay Payment Integration

**Status:** ✅ Complete
**Version:** 1.4.0-dev
**Last Updated:** November 30, 2025
**Owner:** Dev 1 (Implementation), Dev 2 (Secrets), Dev 4 (Testing)

---

## Overview

BakedBot AI integrates **CannPay RemotePay** as the primary online payment processor for cannabis transactions. CannPay provides compliant, bank-to-bank payment processing specifically designed for the cannabis industry.

### Payment Flow Options

Customers have **three payment methods** to choose from:

1. **Dispensary Direct (Default)** - Pay at pickup (cash or card at location)
2. **CannPay (Option #1)** - Online payment with $0.50 platform fee
3. **Stripe (Option #2)** - Traditional credit card payment (optional fallback)

### Key Features

- ✅ Secure HMAC-SHA256 signature verification for API requests
- ✅ Webhook signature verification for payment notifications
- ✅ $0.50 platform transaction fee per CannPay payment
- ✅ Sandbox and live environment support
- ✅ Full integration with Deebo compliance engine
- ✅ Automatic Firestore order tracking

---

## Architecture

### Payment Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ Customer Checkout                                                │
└────────────┬────────────────────────────────────────────────────┘
             │
             ├─→ Option 1: Dispensary Direct
             │   └─→ No payment processing
             │       └─→ Order status: pending_pickup
             │
             ├─→ Option 2: CannPay (+$0.50 fee)
             │   │
             │   ├─→ 1. POST /api/checkout/cannpay/authorize
             │   │      - Server calls CannPay /integrator/authorize
             │   │      - Returns { intent_id, widget_url }
             │   │
             │   ├─→ 2. Launch CannPay Widget
             │   │      - Customer completes payment in widget
             │   │      - Widget calls JavaScript callback
             │   │
             │   ├─→ 3. JavaScript Callback
             │   │      - Receives { status, transaction_number }
             │   │      - POST /api/checkout/process-payment
             │   │
             │   └─→ 4. Webhook (Optional)
             │          - POST /api/webhooks/cannpay
             │          - Signature verification with HMAC-SHA256
             │          - Updates order status
             │
             └─→ Option 3: Stripe
                 └─→ Traditional credit card processing
```

---

## Implementation Details

### 1. Files Created

#### API Client Library
- **File:** [`src/lib/payments/cannpay.ts`](../src/lib/payments/cannpay.ts)
- **Functions:**
  - `authorizePayment(request)` - Get intent_id for widget
  - `getTransactionDetails(intentId)` - Query transaction status
  - `reverseTransaction(request)` - Refund a transaction
- **Constants:**
  - `CANNPAY_TRANSACTION_FEE_CENTS = 50` ($0.50 platform fee)

#### API Endpoints
- **Authorization:** [`src/app/api/checkout/cannpay/authorize/route.ts`](../src/app/api/checkout/cannpay/authorize/route.ts)
  - `POST /api/checkout/cannpay/authorize`
  - Authorizes payment and returns intent_id
  - Validates order ownership and payment status
  - Updates Firestore with intent_id and pending status

- **Payment Processing:** [`src/app/api/checkout/process-payment/route.ts`](../src/app/api/checkout/process-payment/route.ts)
  - `POST /api/checkout/process-payment`
  - Handles all three payment methods
  - Integrates with Deebo compliance engine
  - Updates order payment status in Firestore

- **Webhook Handler:** [`src/app/api/webhooks/cannpay/route.ts`](../src/app/api/webhooks/cannpay/route.ts)
  - `POST /api/webhooks/cannpay`
  - Verifies HMAC-SHA256 signature
  - Updates order with final payment status
  - **Status:** ✅ Already implemented (P0-SEC-CANNPAY-WEBHOOK)

#### UI Components
- **Payment Selection:** [`src/components/checkout/payment-selection.tsx`](../src/components/checkout/payment-selection.tsx)
  - Radio button UI for three payment options
  - Displays transaction fee for CannPay
  - Shows totals for each option

- **CannPay Widget:** [`src/components/checkout/cannpay-widget.tsx`](../src/components/checkout/cannpay-widget.tsx)
  - Loads CannPay JavaScript widget from CDN
  - Initializes widget with intent_id
  - Handles success/error/cancel callbacks

---

## Configuration

### Environment Variables

All secrets are managed in **Google Cloud Secret Manager** and referenced in [`apphosting.yaml`](../apphosting.yaml):

```yaml
# CannPay (Primary Payment Partner)
- variable: CANPAY_ENVIRONMENT
  value: "sandbox"  # Change to "live" for production
- variable: CANPAY_APP_KEY
  secret: CANPAY_APP_KEY
- variable: CANPAY_API_SECRET
  secret: CANPAY_API_SECRET
- variable: CANPAY_INTEGRATOR_ID
  secret: CANPAY_INTEGRATOR_ID
- variable: CANPAY_INTERNAL_VERSION
  value: "1.4.0"
```

### Required Secrets (GCP Secret Manager)

| Secret Name | Description | Where to Get |
|-------------|-------------|--------------|
| `CANPAY_APP_KEY` | CannPay application key | CannPay dashboard |
| `CANPAY_API_SECRET` | API secret for HMAC signing | CannPay dashboard |
| `CANPAY_INTEGRATOR_ID` | Integrator merchant ID | CannPay dashboard |

### Sandbox vs Live

**Sandbox:**
- API Base URL: `https://sandbox-api.canpayapp.com`
- Widget URL: `https://sandbox-widget.canpayapp.com`
- Test credentials required

**Live (Production):**
- API Base URL: `https://api.canpayapp.com`
- Widget URL: `https://widget.canpayapp.com`
- Production credentials required
- Change `CANPAY_ENVIRONMENT=live` before deployment

---

## Usage

### Frontend Integration Example

```tsx
'use client';

import { useState } from 'react';
import { PaymentSelection } from '@/components/checkout/payment-selection';
import { CannPayWidget } from '@/components/checkout/cannpay-widget';

export function CheckoutPage() {
  const [paymentMethod, setPaymentMethod] = useState('dispensary_direct');
  const [intentId, setIntentId] = useState(null);
  const [widgetUrl, setWidgetUrl] = useState(null);

  const subtotal = 10000; // $100.00 in cents

  async function handleCheckout() {
    if (paymentMethod === 'dispensary_direct') {
      // No payment processing needed
      await fetch('/api/checkout/process-payment', {
        method: 'POST',
        body: JSON.stringify({
          orderId: 'order_123',
          amount: subtotal,
          paymentMethod: 'dispensary_direct',
        }),
      });
    } else if (paymentMethod === 'cannpay') {
      // Step 1: Authorize payment
      const authResponse = await fetch('/api/checkout/cannpay/authorize', {
        method: 'POST',
        body: JSON.stringify({
          orderId: 'order_123',
          amount: subtotal,
        }),
      });
      const { intentId, widgetUrl } = await authResponse.json();

      // Step 2: Launch widget
      setIntentId(intentId);
      setWidgetUrl(widgetUrl);
    }
  }

  function handleCannPaySuccess(result) {
    // Step 3: Confirm payment
    fetch('/api/checkout/process-payment', {
      method: 'POST',
      body: JSON.stringify({
        orderId: 'order_123',
        amount: subtotal,
        paymentMethod: 'cannpay',
        paymentData: {
          intentId: result.intentId,
          transactionNumber: result.transactionNumber,
          status: result.status,
        },
      }),
    });
  }

  return (
    <div>
      <PaymentSelection
        value={paymentMethod}
        onChange={setPaymentMethod}
        subtotal={subtotal}
      />

      {intentId && (
        <CannPayWidget
          intentId={intentId}
          widgetUrl={widgetUrl}
          onSuccess={handleCannPaySuccess}
          onError={(error) => console.error(error)}
          onCancel={() => console.log('Payment cancelled')}
        />
      )}

      <button onClick={handleCheckout}>Complete Checkout</button>
    </div>
  );
}
```

---

## Database Schema

### Firestore Orders Collection

```typescript
interface Order {
  id: string;
  customerId: string;
  organizationId: string;
  total: number; // in cents

  // Payment method selection
  paymentMethod: 'dispensary_direct' | 'cannpay' | 'stripe';
  paymentStatus: 'pending_pickup' | 'pending' | 'paid' | 'failed';

  // CannPay-specific fields (only populated if paymentMethod === 'cannpay')
  canpay?: {
    intentId: string;
    transactionNumber: string;
    amount: number; // Total paid including fee (e.g., 10050 for $100.50)
    fee: number; // Platform transaction fee (50 cents)
    tipAmount?: number;
    deliveryFee?: number;
    status: 'Success' | 'Settled' | 'Failed' | 'Voided' | 'Pending';
    authorizedAt: string; // ISO 8601 timestamp
    completedAt?: string; // ISO 8601 timestamp
  };

  // Timestamps
  createdAt: string;
  updatedAt: string;
}
```

---

## Transaction Fee

### Fee Structure

- **Amount:** $0.50 per CannPay transaction
- **Applied:** When customer selects CannPay payment method
- **Collection:** Added to `deliveryFee` parameter in authorize request
- **Tracking:** Stored in `order.canpay.fee` field
- **Display:** Shown to customer in payment selection UI

### Example Calculation

```
Order Subtotal:          $100.00
CannPay Transaction Fee: + $0.50
─────────────────────────────────
Customer Pays:           $100.50
```

```typescript
const subtotal = 10000; // $100.00 in cents
const transactionFee = 50; // $0.50 in cents
const totalCharged = subtotal + transactionFee; // $100.50

await authorizePayment({
  amount: subtotal,
  deliveryFee: transactionFee, // CannPay fee parameter
});
```

---

## Security

### API Request Signature

All CannPay API requests require **HMAC-SHA256 signature** in the `X-CannPay-Signature` header:

```typescript
const signature = crypto
  .createHmac('sha256', CANPAY_API_SECRET)
  .update(JSON.stringify(payload))
  .digest('hex');

fetch('https://api.canpayapp.com/integrator/authorize', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CannPay-Signature': signature,
  },
  body: JSON.stringify(payload),
});
```

### Webhook Signature Verification

Webhook handler verifies signatures using **constant-time comparison** to prevent timing attacks:

```typescript
const receivedSignature = request.headers.get('x-cannpay-signature');
const calculatedSignature = crypto
  .createHmac('sha256', CANPAY_API_SECRET)
  .update(requestBody)
  .digest('hex');

const isValid = crypto.timingSafeEqual(
  Buffer.from(receivedSignature),
  Buffer.from(calculatedSignature)
);
```

**Status:** ✅ Implemented in `P0-SEC-CANNPAY-WEBHOOK`

---

## Testing

### Sandbox Testing

1. **Set Environment:**
   ```bash
   export CANPAY_ENVIRONMENT=sandbox
   ```

2. **Use Sandbox Credentials:**
   - Get sandbox credentials from CannPay dashboard
   - Create secrets in GCP Secret Manager

3. **Test Payment Flow:**
   - Select CannPay payment method
   - Complete payment in sandbox widget
   - Verify webhook signature
   - Check order status in Firestore

### E2E Tests

**File:** `tests/e2e/checkout-cannpay.spec.ts` (To be created by Dev 4)

Test scenarios:
- [ ] Dispensary direct checkout (no payment)
- [ ] CannPay authorization returns intent_id
- [ ] Widget loads successfully
- [ ] Payment success updates order status
- [ ] Payment failure handled gracefully
- [ ] Webhook signature verification
- [ ] Transaction fee calculation
- [ ] Deebo compliance integration

---

## Compliance Integration

### Deebo Validation

All payments (including dispensary_direct) go through **Deebo compliance validation** before processing:

```typescript
const complianceResult = await deeboCheckCheckout({
  customer: {
    uid: customer.uid,
    dateOfBirth: customer.dateOfBirth,
    hasMedicalCard: customer.hasMedicalCard,
    state: customer.state,
  },
  cart: cart,
  dispensaryState: dispensaryState,
});

if (!complianceResult.allowed) {
  return { error: 'Compliance validation failed', errors: complianceResult.errors };
}
```

**Checks performed:**
1. Legal status (state allows cannabis sales)
2. Age verification (21+ or 18+ with medical card)
3. Medical card requirement (for medical-only states)
4. Purchase limits (flower, concentrate, edibles)

**See:** [`docs/COMPLIANCE.md`](./COMPLIANCE.md)

---

## Monitoring

### Logging

All CannPay operations use structured logging with `[P0-PAY-CANNPAY]` prefix:

```typescript
logger.info('[P0-PAY-CANNPAY] Authorized payment', {
  orderId,
  intentId,
  amount,
  fee: CANNPAY_TRANSACTION_FEE_CENTS,
});
```

### Sentry Integration

Payment errors are automatically sent to Sentry:

```typescript
logger.error('[P0-PAY-CANNPAY] Payment failed', { error, orderId });
// Sentry automatically captures ERROR and CRITICAL logs
```

**See:** [`docs/LOGGING.md`](./LOGGING.md)

---

## Troubleshooting

### Common Issues

#### 1. Missing Secrets Error

**Error:** `CANPAY_APP_KEY environment variable is required`

**Fix:**
1. Verify secrets exist in GCP Secret Manager
2. Check `apphosting.yaml` secret bindings
3. Redeploy application

#### 2. Signature Verification Failed

**Error:** `403 Forbidden` from CannPay API

**Fix:**
1. Verify `CANPAY_API_SECRET` is correct
2. Check request payload matches signature
3. Ensure no whitespace in JSON payload

#### 3. Widget Not Loading

**Error:** `Failed to load CannPay widget`

**Fix:**
1. Check `CANPAY_ENVIRONMENT` matches widget URL
2. Verify intent_id is valid and not expired
3. Check browser console for CORS errors

#### 4. Order Already Paid

**Error:** `Order has already been paid`

**Fix:**
1. Check `order.paymentStatus` in Firestore
2. Prevent double-submission in frontend
3. Use idempotency for authorization requests

---

## Production Checklist

Before deploying to production:

- [ ] **Secrets:** All 3 CannPay secrets created in GCP Secret Manager
- [ ] **Environment:** `CANPAY_ENVIRONMENT=live` in `apphosting.yaml`
- [ ] **Credentials:** Production CannPay credentials (not sandbox)
- [ ] **Webhook URL:** Register production webhook URL with CannPay
- [ ] **Testing:** All E2E tests passing
- [ ] **Compliance:** Deebo validation integrated
- [ ] **Monitoring:** Sentry configured for payment errors
- [ ] **Legal:** Transaction fee disclosed to customers
- [ ] **Firestore Rules:** `orders` collection secured (P0-SEC-FIRESTORE-RULES ✅)

---

## References

- **CannPay API Docs:** `docs/CanPay RemotePay Integration - Developers Guide 1.4.0-dev (2).pdf`
- **Webhook Security:** Ticket `P0-SEC-CANNPAY-WEBHOOK`
- **Compliance Engine:** [`src/server/agents/deebo.ts`](../src/server/agents/deebo.ts)
- **State Rules:** [`src/lib/compliance/compliance-rules.ts`](../src/lib/compliance/compliance-rules.ts)

---

**AI-THREAD:** [Dev1-Claude @ 2025-11-30] P0-PAY-CANNPAY-INTEGRATION
Complete CannPay integration documentation created covering architecture, implementation, security, testing, and production deployment.
