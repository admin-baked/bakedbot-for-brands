# CannPay Smokey Pay - Quick Start Testing Guide

**Environment:** Sandbox
**Test Time:** ~5 minutes
**Goal:** Verify end-to-end payment flow works

---

## 🚀 Pre-Flight Check

Before testing, verify deployment is live:

```powershell
# Check latest deployment status
# Visit: https://console.firebase.google.com/project/studio-567050101-bc6e8/apphosting

# Or check the live site
curl -I https://bakedbot.ai/thrivesyracuse
# Should return: HTTP/2 200
```

✅ **Deployment successful?** Proceed to testing.

---

## 🧪 Test 1: Basic Payment Flow (5 minutes)

### Step 1: Add Products to Cart

1. Visit: **https://bakedbot.ai/thrivesyracuse**
2. Browse the menu
3. Add 1-3 products to cart (any products, any quantity)
4. **Total should be at least $5.00** (minimum for testing)

### Step 2: Proceed to Checkout

1. Click **"Checkout"** or cart icon
2. Fill out customer information:
   - Name: Test Customer
   - Email: test@example.com
   - Phone: 555-555-5555
3. Select **Pickup** (easier for testing than delivery)
4. Review order summary

### Step 3: Select Smokey Pay

1. In the payment section, select **"Smokey Pay"**
2. You should see:
   - Subtotal
   - **Processing Fee: $0.50** ← Verify this is shown
   - Tax (13% NY)
   - **Total**
3. Click **"Pay with Smokey Pay"** or similar button

### Step 4: Complete Payment in CannPay Widget

1. **Widget should load** (iframe or modal)
   - Widget URL should be: `https://sandbox-remotepay.canpaydebit.com`
   - If widget doesn't load, check browser console for errors

2. **Enter test consumer credentials:**
   - **Phone:** `555-779-4523`
   - **PIN:** `2222`
   - (Alternative: Phone `555-448-9921`, PIN `3333`)

3. **Complete payment** in widget
   - Follow prompts in CannPay's sandbox widget
   - Should take ~30-60 seconds

4. **Widget should close** automatically after payment

### Step 5: Verify Order Confirmation

1. You should be redirected to **order confirmation page**
2. Verify confirmation page shows:
   - ✅ Order number
   - ✅ Payment status: "Payment Confirmed" or "Paid"
   - ✅ Order details match cart
   - ✅ Total matches payment amount

**If you reach this step successfully:** ✅ **Basic payment flow works!**

---

## 🔍 Verification Steps

### Verify Webhook (Backend)

Check Firebase logs to confirm webhook was received:

```powershell
# View recent logs
gcloud app logs tail --project=studio-567050101-bc6e8

# Or filter for CannPay webhook
gcloud app logs tail --project=studio-567050101-bc6e8 | Select-String "cannpay"
```

**Look for:**
- `POST /api/webhooks/cannpay` received
- `Signature valid ✓` or similar
- `Payment confirmed for order: ORDER_ID`

### Verify Firestore (Database)

1. Open Firebase Console: https://console.firebase.google.com/project/studio-567050101-bc6e8/firestore
2. Navigate to `orders` collection
3. Find your order by timestamp or order ID
4. Verify fields:
   - `paymentStatus: "confirmed"` or `"paid"`
   - `paymentMethod: "cannpay"` or `"smokeypay"`
   - `intentId: "..."` (should be present)
   - `amount: [correct total]`

### Verify POS Sync (Alleaves)

**Note:** POS sync may take 1-2 minutes

1. Login to Alleaves POS dashboard
2. Navigate to **Orders** section
3. Find order by:
   - Customer name: "Test Customer"
   - Timestamp (last few minutes)
   - BakedBot order ID (if available)
4. Verify:
   - ✅ Order exists in POS
   - ✅ Line items match
   - ✅ Total matches
   - ✅ Payment method shows "CanPay" or "Debit"
   - ✅ Status is "Paid" or "Pending Fulfillment"

---

## ❌ Troubleshooting Quick Reference

### Widget Doesn't Load

**Symptoms:** No iframe/modal appears after clicking "Pay with Smokey Pay"

**Check:**
1. Browser console (F12) for JavaScript errors
2. Check network tab - is widget script loading?
   - Should load: `https://sandbox-remotepay.canpaydebit.com/cp-min.js`
3. Verify `CANPAY_ENVIRONMENT=sandbox` in deployment

**Fix:**
- Clear browser cache and retry
- Try different browser (Chrome recommended)
- Check if browser is blocking iframes/popups

### Payment Fails in Widget

**Symptoms:** Widget loads but payment doesn't complete

**Check:**
1. Are you using correct test credentials?
   - Phone: `555-779-4523`, PIN: `2222`
2. Is the order total too low? (Minimum $1.00)
3. Check Firebase logs for errors from `/api/checkout/smokey-pay`

**Fix:**
- Verify test account credentials
- Try alternative test account: `555-448-9921`, PIN `3333`
- Contact CannPay support if widget shows error

### Webhook Not Received

**Symptoms:** Order stuck on "Processing payment..." or "Pending"

**Check:**
1. Firebase logs: `gcloud app logs tail --project=studio-567050101-bc6e8 | Select-String "webhooks/cannpay"`
2. Is webhook URL registered with CannPay?
   - URL: `https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app/api/webhooks/cannpay`
3. Check Firestore - does order exist with `intentId`?

**Fix:**
- Webhook registration may be missing - contact CannPay to register URL
- Check if webhook signature validation is failing (logs will show)
- Manually mark order as paid in Firestore if payment succeeded in CannPay

### Order Not in POS

**Symptoms:** Payment confirmed but order missing from Alleaves

**Check:**
1. Wait 2-3 minutes (sync may be delayed)
2. Check Firestore - is `syncedToPOS: true`?
3. Check Firebase logs for POS sync errors

**Fix:**
- Verify Alleaves credentials are configured
- Check network connectivity to Alleaves API
- Manually sync order: Call `POST /api/pos/sync/{orderId}`

---

## ✅ Success Criteria

You've successfully validated CannPay integration if:

- ✅ Widget loads from `sandbox-remotepay.canpaydebit.com`
- ✅ Test payment completes without errors
- ✅ Order confirmation page displays
- ✅ Webhook received (logs show signature validation passed)
- ✅ Order in Firestore with `paymentStatus: "confirmed"`
- ✅ Order synced to Alleaves POS
- ✅ $0.50 processing fee correctly applied

**If all checks pass:** 🎉 **CannPay integration is working correctly!**

---

## 📊 Test Results Template

```
Date/Time: _______________
Tester: _______________

✅/❌ Widget loaded successfully
✅/❌ Test payment completed
✅/❌ Order confirmation received
✅/❌ Webhook processed (logs verified)
✅/❌ Order in Firestore (payment confirmed)
✅/❌ Order synced to Alleaves POS
✅/❌ Processing fee ($0.50) applied

Order ID: _______________
Total Amount: $_______________
Intent ID: _______________

Notes: _______________________________________________
```

---

## 🚀 Next Steps After Successful Test

### 1. Test Additional Scenarios (Optional)

- **Multiple payments:** Place 2-3 orders back-to-back
- **Different amounts:** Try $5, $50, $100 orders
- **Cancellation:** Start payment, then cancel in widget
- **Alternative test account:** Use phone `555-448-9921`, PIN `3333`

### 2. Request Production Credentials

Once sandbox testing is complete and working:

1. Contact CannPay: support@canpayapp.com
2. Request production credentials for Thrive Syracuse
3. Provide webhook URL (already configured)
4. Complete any required compliance documentation

### 3. Deploy to Production

After receiving production credentials:

1. Update Firebase Secret Manager with production credentials
2. Change `apphosting.yaml`: `CANPAY_ENVIRONMENT: "live"`
3. Deploy to production
4. Make small real test transaction ($5 minimum)
5. Verify settlement arrives in bank (T+1 or T+2 days)

---

## 📞 Support Contacts

### CannPay Support
- **Email:** support@canpayapp.com
- **Phone:** 1-844-4-CANPAY (1-844-422-6729)
- **Hours:** M-F 9am-6pm ET

### BakedBot Support
- **Email:** support@bakedbot.ai
- **Developer:** martez@bakedbot.ai

### Thrive Syracuse
- **Contact:** [Owner Name]
- **Email:** [Owner Email]

---

## 📚 Additional Resources

- **Full Testing Checklist:** `docs/CANNPAY-TESTING-CHECKLIST.md`
- **Onboarding Guide:** `docs/THRIVE-SYRACUSE-CANNPAY-ONBOARDING.md`
- **Sandbox Credentials:** `docs/CANNPAY-SANDBOX-CREDENTIALS.md` (DO NOT COMMIT)
- **Official Documentation:** `docs/CanPay RemotePay Integration - Developers Guide 1.4.0-dev (2).pdf`

---

**Ready to test? Wait for deployment to complete, then start with Test 1!** 🚀
