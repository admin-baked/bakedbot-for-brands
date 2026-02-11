# Thrive Syracuse - CannPay (Smokey Pay) Onboarding Guide

**Last Updated:** 2026-02-11
**Status:** Ready for Production Setup
**Public URL:** https://bakedbot.ai/thrivesyracuse

---

## ✅ Confirmation: Smokey Pay is CannPay

**YES**, the checkout for `bakedbot.ai/thrivesyracuse` uses **Smokey Pay** by default, which is powered by **CannPay** integration behind the scenes.

### Customer-Facing vs Internal Naming
- **Customer sees:** "Smokey Pay" (friendly brand name for cannabis payments)
- **Internal/backend:** CannPay RemotePay API (official payment processor)
- **Implementation:** CannPay RemotePay Developer Guide v1.4.0

---

## 🎯 Current Implementation Status

### ✅ Already Built & Tested
- CannPay API client library (`src/lib/payments/cannpay.ts`)
- Payment widget integration (`src/components/checkout/cannpay-widget.tsx`)
- Webhook handler with HMAC-SHA256 signature verification (`src/app/api/webhooks/cannpay/route.ts`)
- Checkout flow with Smokey Pay option (`src/components/checkout/checkout-flow.tsx`)
- Order creation and payment processing
- $0.50 transaction fee handling (displayed to customers)
- Sandbox environment support

### ⚠️ Needs Configuration
- **CannPay credentials** (from CannPay account setup)
- **Production environment activation**
- **Webhook URL registration** with CannPay

---

## 📋 What's Needed: Checklist

### From Thrive Syracuse Owner

#### 1. **CannPay Account Setup**
Contact CannPay to establish a merchant account:
- **Company:** Thrive Syracuse
- **Entity Type:** Dispensary (Retail Cannabis)
- **Address:** [Thrive Syracuse physical location]
- **License:** NY Cannabis Retail License Number
- **Tax ID/EIN:** [Business tax identification]
- **Bank Account:** For payment settlements

**CannPay Contact:**
- Website: https://canpayapp.com
- Support: support@canpayapp.com
- Phone: 1-844-4-CANPAY (1-844-422-6729)

#### 2. **Documents to Provide to CannPay**
- [ ] State cannabis retail license (NY)
- [ ] Business formation documents (LLC, Corp, etc.)
- [ ] Tax ID/EIN documentation
- [ ] Voided check or bank letter for settlement account
- [ ] Government-issued ID for business owners
- [ ] Proof of business address

#### 3. **Information to Collect from CannPay**

Once your account is approved, CannPay will provide:

| Credential | Description | Where Used |
|------------|-------------|------------|
| **App Key** | Public identifier for your app | `CANPAY_APP_KEY` |
| **API Secret** | Private key for HMAC signatures | `CANPAY_API_SECRET` |
| **Integrator ID** | BakedBot's integrator identifier | `CANPAY_INTEGRATOR_ID` |
| **Merchant ID** | Your unique merchant identifier | Used in transactions |
| **Webhook Secret** | (Same as API Secret) | Webhook verification |

**⚠️ SECURITY:** Never share API Secret publicly. Store in Firebase Secret Manager only.

#### 4. **Webhook URL to Provide to CannPay**

CannPay needs this URL to send payment confirmations:

```
https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app/api/webhooks/cannpay
```

**Webhook Configuration:**
- **URL:** (above)
- **Method:** POST
- **Content-Type:** application/json
- **Authentication:** HMAC-SHA256 signature (we handle this)

---

### From BakedBot (Our Side)

#### 1. **Firebase Secret Manager Setup**

Store CannPay credentials securely:

```bash
# Set App Key
gcloud secrets create CANPAY_APP_KEY \
  --project=studio-567050101-bc6e8 \
  --replication-policy="automatic"

echo -n "YOUR_APP_KEY_HERE" | gcloud secrets versions add CANPAY_APP_KEY --data-file=-

# Set API Secret
gcloud secrets create CANPAY_API_SECRET \
  --project=studio-567050101-bc6e8 \
  --replication-policy="automatic"

echo -n "YOUR_API_SECRET_HERE" | gcloud secrets versions add CANPAY_API_SECRET --data-file=-

# Set Integrator ID (BakedBot's ID from CannPay)
gcloud secrets create CANPAY_INTEGRATOR_ID \
  --project=studio-567050101-bc6e8 \
  --replication-policy="automatic"

echo -n "YOUR_INTEGRATOR_ID_HERE" | gcloud secrets versions add CANPAY_INTEGRATOR_ID --data-file=-
```

**Already Configured in `apphosting.yaml`:**
```yaml
- variable: CANPAY_ENVIRONMENT
  value: sandbox  # Change to "live" for production
  availability:
    - RUNTIME

- variable: CANPAY_APP_KEY
  secret: CANPAY_APP_KEY
  availability:
    - RUNTIME

- variable: CANPAY_API_SECRET
  secret: CANPAY_API_SECRET
  availability:
    - RUNTIME

- variable: CANPAY_INTEGRATOR_ID
  secret: CANPAY_INTEGRATOR_ID
  availability:
    - RUNTIME

- variable: CANPAY_INTERNAL_VERSION
  value: 1.4.0
  availability:
    - RUNTIME
```

#### 2. **Switch to Production Environment**

Update `apphosting.yaml`:

```yaml
- variable: CANPAY_ENVIRONMENT
  value: live  # Changed from "sandbox"
```

Then deploy:
```bash
git add apphosting.yaml
git commit -m "feat(payments): Enable CannPay production environment"
git push origin main
```

---

## 🔄 End-to-End Payment Flow

### 1. Customer Checkout
1. Customer adds products to cart on `bakedbot.ai/thrivesyracuse`
2. Proceeds to checkout
3. Sees payment options:
   - **Cash** (pay at pickup)
   - **Smokey Pay** (pay now with cannabis payment processor) ← CannPay
4. Selects "Smokey Pay"

### 2. Payment Authorization
1. BakedBot backend calls CannPay API: `POST /remote-pay/authorize-payment`
   - Sends: amount, order ID, delivery fee ($0.50)
   - Receives: `intent_id` and `widget_url`
2. Customer redirected to CannPay widget (opens in modal/new tab)
3. Customer enters payment info in CannPay's secure widget
4. CannPay processes payment

### 3. Payment Confirmation
1. CannPay sends webhook to: `/api/webhooks/cannpay`
   - Payload: `{ response: "<JSON>", signature: "<HMAC>" }`
2. BakedBot verifies HMAC-SHA256 signature (prevents fraud)
3. BakedBot updates order status to "Payment Confirmed"
4. Customer redirected back to confirmation page
5. Order sent to Alleaves POS for fulfillment

### 4. Settlement
- CannPay batches daily settlements to Thrive Syracuse's bank account
- Typically T+1 or T+2 business days
- Fees deducted before settlement (negotiate with CannPay)

---

## 💰 Fees & Pricing

### CannPay Fees (Standard Rates)
- **Transaction Fee:** ~2.9% + $0.30 per transaction (negotiate with CannPay)
- **Monthly Fee:** May apply (negotiate with CannPay)
- **Chargeback Fee:** Varies (ask CannPay)

### BakedBot Platform Fee
- **$0.50 per Smokey Pay transaction** (displayed to customer as "processing fee")
- Covers: API costs, webhook processing, order management, POS integration

### Customer Sees
```
Subtotal:        $45.00
Discount:        -$5.00
----------------------------
Subtotal:        $40.00
Processing Fee:   $0.50  ← Smokey Pay fee
Tax (13% NY):     $5.27
----------------------------
Total:           $45.77
```

---

## 🧪 Testing in Sandbox Mode

### Current Configuration
- **Environment:** `sandbox` (safe for testing)
- **Sandbox Widget:** https://sandbox-widget.canpayapp.com
- **Sandbox API:** https://sandbox-api.canpayapp.com

### Test Payment Flow
1. Visit: https://bakedbot.ai/thrivesyracuse
2. Add products to cart
3. Checkout → Select "Smokey Pay"
4. Use CannPay's test credentials (they will provide)
5. Complete test transaction
6. Verify webhook received at `/api/webhooks/cannpay`
7. Check order status in Firestore and Alleaves POS

### CannPay Test Data
CannPay will provide test debit card numbers and credentials for sandbox testing.

---

## 🔐 Security & Compliance

### ✅ Already Implemented
- [x] HMAC-SHA256 signature verification for webhooks
- [x] Constant-time comparison (prevents timing attacks)
- [x] TLS/HTTPS for all API calls
- [x] Secrets stored in Firebase Secret Manager (never in code)
- [x] PCI compliance (customer payment data never touches our servers)
- [x] Order verification before processing

### 🔒 Best Practices
- Rotate API Secret every 90 days (coordinate with CannPay)
- Monitor webhook failures (we log to Firestore)
- Set up fraud alerts with CannPay
- Review transactions daily for chargebacks

---

## 📊 Monitoring & Support

### Logging
- **Payment attempts:** Logged to Firestore (`orders` collection)
- **Webhook events:** Logged to Firestore (`payment_events` collection)
- **Errors:** Logged via `@/lib/logger` (Sentry integration)

### Troubleshooting Checklist

#### Customer says "Payment failed"
1. Check Firestore `orders/{orderId}` → `paymentStatus`
2. Check `/api/webhooks/cannpay` logs for signature errors
3. Verify `CANPAY_API_SECRET` is correct
4. Contact CannPay support with `intent_id`

#### Webhook not received
1. Verify webhook URL registered with CannPay
2. Check Firebase logs: `firebase functions:log`
3. Test webhook manually:
   ```bash
   curl -X POST https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app/api/webhooks/cannpay \
     -H "Content-Type: application/json" \
     -d '{"response":"{...}","signature":"..."}'
   ```

#### Order stuck in "Pending Payment"
1. Check CannPay dashboard for transaction status
2. Look up by `intentId` or `merchantOrderId`
3. If paid but webhook missed, manually trigger webhook or mark order paid

---

## 📞 Support Contacts

### CannPay Support
- **Email:** support@canpayapp.com
- **Phone:** 1-844-4-CANPAY (1-844-422-6729)
- **Portal:** https://merchant.canpayapp.com
- **Hours:** M-F 9am-6pm ET

### BakedBot Support
- **Email:** support@bakedbot.ai
- **Slack:** #thrive-syracuse (if integrated)
- **On-Call:** [Your emergency contact]

---

## ✅ Production Go-Live Checklist

### Pre-Launch
- [ ] CannPay account approved and active
- [ ] Received all credentials (App Key, API Secret, Integrator ID)
- [ ] Credentials stored in Firebase Secret Manager
- [ ] Webhook URL registered with CannPay
- [ ] Completed sandbox testing (end-to-end)
- [ ] Verified webhook signature verification works
- [ ] Tested refund/void flow (if applicable)
- [ ] Updated `CANPAY_ENVIRONMENT` to `live`

### Launch Day
- [ ] Deploy with production credentials
- [ ] Make test purchase with real payment ($5 minimum)
- [ ] Verify order appears in Alleaves POS
- [ ] Verify webhook received and processed
- [ ] Check settlement arrives in bank account (T+1 or T+2)

### Post-Launch
- [ ] Monitor transactions daily for first week
- [ ] Review webhook success rate
- [ ] Set up automated alerts for failed payments
- [ ] Document any issues and resolutions

---

## 🚀 Next Steps

1. **Thrive Syracuse Owner:**
   - Contact CannPay to initiate merchant account setup
   - Gather required documents (license, tax ID, bank info)
   - Share credentials with BakedBot securely (never via email!)

2. **BakedBot Team:**
   - Once credentials received, configure Firebase Secret Manager
   - Run sandbox tests with Thrive Syracuse team
   - Schedule go-live date after successful testing

3. **Go-Live:**
   - Switch environment to `live`
   - Deploy to production
   - Monitor first 10 transactions closely
   - Celebrate 🎉

---

## 📚 Additional Resources

- **CannPay Developer Guide:** `docs/CanPay RemotePay Integration - Developers Guide 1.4.0-dev (2).pdf`
- **BakedBot Payment Implementation:** `src/lib/payments/cannpay.ts`
- **Webhook Handler:** `src/app/api/webhooks/cannpay/route.ts`
- **Checkout Flow:** `src/components/checkout/checkout-flow.tsx`

---

**Questions? Contact support@bakedbot.ai**
