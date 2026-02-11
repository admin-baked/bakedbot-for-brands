# CannPay Sandbox Credentials - Thrive Syracuse

**⚠️ INTERNAL DOCUMENT - DO NOT COMMIT TO PUBLIC REPO**

**Date:** 2026-02-11
**Account:** BakedBot WEB (Thrive Syracuse Sandbox)
**Environment:** Sandbox
**Status:** Active

---

## Credentials

| Field | Value |
|-------|-------|
| **Retailer** | BakedBot WEB |
| **Integrator ID** | `8954cd15` |
| **CanPay Internal Version** | `B4k3dBoT` |
| **App Key** | `BaKxozke8` |
| **API Secret** | `7acfs2il` |

---

## Test Consumer Accounts

Use these phone/PIN combinations for testing payments:

| Phone Number | PIN |
|--------------|-----|
| 555-779-4523 | 2222 |
| 555-448-9921 | 3333 |

---

## Firebase Secret Manager Setup Commands

Run these commands to configure production secrets:

```bash
# Set Integrator ID
echo -n "8954cd15" | gcloud secrets versions add CANPAY_INTEGRATOR_ID \
  --project=studio-567050101-bc6e8 \
  --data-file=-

# Set App Key
echo -n "BaKxozke8" | gcloud secrets versions add CANPAY_APP_KEY \
  --project=studio-567050101-bc6e8 \
  --data-file=-

# Set API Secret
echo -n "7acfs2il" | gcloud secrets versions add CANPAY_API_SECRET \
  --project=studio-567050101-bc6e8 \
  --data-file=-
```

---

## Local Development (.env.local)

For local testing, create `.env.local`:

```bash
# CannPay Sandbox Credentials
CANPAY_ENVIRONMENT=sandbox
CANPAY_INTEGRATOR_ID=8954cd15
CANPAY_INTERNAL_VERSION=B4k3dBoT
CANPAY_APP_KEY=BaKxozke8
CANPAY_API_SECRET=7acfs2il
```

---

## Testing Checklist

### 1. Test Payment Flow
- [ ] Visit: https://bakedbot.ai/thrivesyracuse
- [ ] Add product to cart
- [ ] Proceed to checkout
- [ ] Select "Smokey Pay" payment method
- [ ] Use test consumer phone: `5557794523`, PIN: `2222`
- [ ] Complete payment in CannPay widget
- [ ] Verify order confirmation received

### 2. Verify Backend
- [ ] Check webhook received at `/api/webhooks/cannpay`
- [ ] Verify HMAC signature validation passed
- [ ] Confirm order status updated to "Payment Confirmed"
- [ ] Check Firestore: `orders/{orderId}/paymentStatus`

### 3. Verify POS Integration
- [ ] Check order sent to Alleaves POS
- [ ] Verify order details match (items, total, customer)

---

## Webhook Configuration

**Webhook URL (Already Configured):**
```
https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app/api/webhooks/cannpay
```

**Webhook Verification:**
- Method: HMAC-SHA256
- Secret: Same as `CANPAY_API_SECRET` (7acfs2il)
- Implementation: `src/app/api/webhooks/cannpay/route.ts`

---

## Next Steps

1. **Configure Production Secrets** (run gcloud commands above)
2. **Test Sandbox Flow** (use test consumer accounts)
3. **Request Production Credentials** (when ready for go-live)
4. **Switch Environment** (change `CANPAY_ENVIRONMENT` to `live`)

---

## Support Contacts

**CannPay Support:**
- Email: support@canpayapp.com
- Phone: 1-844-4-CANPAY (1-844-422-6729)

**BakedBot Team:**
- Email: support@bakedbot.ai

---

## Security Notes

- ⚠️ **Never commit this file to version control**
- 🔒 All production secrets stored in Firebase Secret Manager
- 🔐 API Secret used for HMAC signature verification
- ✅ TLS/HTTPS for all API communications
- ✅ Constant-time signature comparison prevents timing attacks

---

**Document Updated:** 2026-02-11
