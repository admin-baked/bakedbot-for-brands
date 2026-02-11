# CannPay Sandbox Testing Checklist

**Environment:** Sandbox
**Integration Version:** CannPay RemotePay v1.4.0-dev
**Customer-Facing Name:** Smokey Pay
**Test URL:** https://bakedbot.ai/thrivesyracuse

---

## ✅ Pre-Testing Verification

### Configuration
- [x] Sandbox credentials configured in Firebase Secret Manager
  - [x] `CANPAY_INTEGRATOR_ID` = 8954cd15 (v4)
  - [x] `CANPAY_APP_KEY` = BaKxozke8 (v2)
  - [x] `CANPAY_API_SECRET` = 7acfs2il (v4)
- [x] `apphosting.yaml` environment set to `"sandbox"`
- [x] API endpoints corrected to `canpaydebit.com` domain
- [x] Widget script filename corrected to `cp-min.js`
- [x] Widget initialization uses lowercase `canpay` global
- [x] Callback structure matches official API spec

### Test Consumer Accounts
- **Account 1:** Phone `555-779-4523`, PIN `2222`
- **Account 2:** Phone `555-448-9921`, PIN `3333`

---

## 🧪 Test Scenarios

### Test 1: Basic Payment Flow (Guest Checkout)

**Objective:** Verify complete payment flow from cart to confirmation

**Steps:**
1. [ ] Navigate to https://bakedbot.ai/thrivesyracuse
2. [ ] Browse products and add 1-3 items to cart
3. [ ] Proceed to checkout
4. [ ] Select **"Smokey Pay"** as payment method
5. [ ] Verify CannPay widget loads correctly
   - [ ] Widget iframe/modal appears
   - [ ] No JavaScript console errors
   - [ ] Widget URL is `https://sandbox-remotepay.canpaydebit.com`
6. [ ] Enter test consumer credentials:
   - [ ] Phone: `555-779-4523`
   - [ ] PIN: `2222`
7. [ ] Complete payment in widget
8. [ ] Verify redirect back to confirmation page
9. [ ] Check order confirmation displays correctly
   - [ ] Order number shown
   - [ ] Payment status: "Payment Confirmed"
   - [ ] Subtotal, processing fee ($0.50), tax, total all correct

**Expected Result:**
- ✅ Payment completes successfully
- ✅ Order status updates to "Payment Confirmed"
- ✅ Customer receives confirmation screen

---

### Test 2: Backend Webhook Verification

**Objective:** Verify webhook receives payment confirmation from CannPay

**Steps:**
1. [ ] Complete Test 1 payment flow
2. [ ] Check Firebase logs for webhook receipt:
   ```bash
   gcloud app logs tail --project=studio-567050101-bc6e8
   ```
3. [ ] Verify webhook log entry contains:
   - [ ] `POST /api/webhooks/cannpay` request received
   - [ ] HMAC signature verification passed
   - [ ] Response parsed successfully
   - [ ] Order status updated to "Payment Confirmed"
4. [ ] Check Firestore for order document:
   - [ ] Navigate to Firestore → `orders` collection
   - [ ] Find order by ID
   - [ ] Verify `paymentStatus: "confirmed"`
   - [ ] Verify `paymentMethod: "cannpay"` or `"smokeypay"`
   - [ ] Verify `intentId` stored correctly

**Expected Result:**
- ✅ Webhook receives payment notification
- ✅ HMAC signature validates successfully
- ✅ Order document updated in Firestore

---

### Test 3: POS Integration (Alleaves)

**Objective:** Verify order syncs to Alleaves POS after payment

**Steps:**
1. [ ] Complete Test 1 payment flow
2. [ ] Wait 1-2 minutes for POS sync
3. [ ] Check Alleaves POS dashboard for new order:
   - [ ] Login to Alleaves (username: `bakedbotai@thrivesyracuse.com`)
   - [ ] Navigate to Orders section
   - [ ] Find order by BakedBot order ID or timestamp
4. [ ] Verify order details match:
   - [ ] Customer info correct
   - [ ] Line items match cart contents
   - [ ] Total matches (including tax)
   - [ ] Payment method shows "CanPay" or "Debit"
   - [ ] Order status is "Pending Fulfillment" or "Paid"

**Expected Result:**
- ✅ Order appears in Alleaves POS
- ✅ All order details match BakedBot order
- ✅ Payment status shows paid

---

### Test 4: Transaction Fees

**Objective:** Verify $0.50 processing fee is applied correctly

**Steps:**
1. [ ] Add product(s) totaling exactly $50.00 to cart
2. [ ] Proceed to checkout
3. [ ] Select "Smokey Pay"
4. [ ] Review order summary before payment:
   - [ ] Subtotal: $50.00
   - [ ] Processing Fee: $0.50
   - [ ] Tax (13% NY): $6.57 (on $50.50)
   - [ ] **Total: $57.07**
5. [ ] Complete payment with test account
6. [ ] Verify charged amount matches total

**Expected Result:**
- ✅ $0.50 processing fee displayed to customer
- ✅ Fee included in total charged amount
- ✅ Fee labeled as "Processing Fee" or "Smokey Pay Fee"

---

### Test 5: Payment Failure Handling

**Objective:** Verify graceful handling of payment failures

**Steps:**
1. [ ] Add products to cart
2. [ ] Proceed to checkout, select "Smokey Pay"
3. [ ] Enter test account credentials
4. [ ] In CannPay widget, trigger failure scenario:
   - [ ] Cancel payment mid-flow
   - [ ] Close widget/modal
5. [ ] Verify error handling:
   - [ ] Error message displayed to user
   - [ ] User can retry payment
   - [ ] Order status remains "Pending Payment"
6. [ ] Check Firebase logs for error logging

**Expected Result:**
- ✅ Error displayed clearly to user
- ✅ User can retry without creating duplicate order
- ✅ Order status correctly reflects pending state

---

### Test 6: HMAC Signature Verification

**Objective:** Verify signature validation prevents tampering

**Steps:**
1. [ ] Complete a test payment
2. [ ] In Firebase logs, find webhook payload
3. [ ] Verify log shows:
   - [ ] `Verifying HMAC signature...`
   - [ ] `Signature valid ✓`
   - [ ] `Processing payment confirmation...`
4. [ ] **Security Test:** Manually trigger webhook with invalid signature:
   ```bash
   curl -X POST https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app/api/webhooks/cannpay \
     -H "Content-Type: application/json" \
     -d '{"response":"{\"intent_id\":\"test\"}","signature":"invalid_signature_12345"}'
   ```
5. [ ] Verify webhook **rejects** invalid signature:
   - [ ] Returns 401 Unauthorized or 400 Bad Request
   - [ ] Logs show "Invalid signature" error
   - [ ] Order status does NOT update

**Expected Result:**
- ✅ Valid signatures accepted
- ✅ Invalid signatures rejected
- ✅ No orders processed with bad signatures

---

### Test 7: Multiple Payments (Stress Test)

**Objective:** Verify system handles multiple concurrent payments

**Steps:**
1. [ ] Complete 3-5 test payments in quick succession:
   - [ ] Use different product combinations
   - [ ] Use both test accounts
   - [ ] Vary cart totals ($10, $50, $100)
2. [ ] Verify all payments process correctly:
   - [ ] Each gets unique `intent_id`
   - [ ] Each order created in Firestore
   - [ ] All webhooks received
   - [ ] All orders sync to Alleaves POS
3. [ ] Check for any race conditions or conflicts

**Expected Result:**
- ✅ All payments process independently
- ✅ No intent_id collisions
- ✅ All orders created successfully

---

### Test 8: Edge Cases

**Objective:** Test boundary conditions and unusual scenarios

#### 8a. Minimum Payment Amount
- [ ] Create cart with $1.00 total
- [ ] Add $0.50 processing fee = $1.50 + tax
- [ ] Complete payment
- [ ] Verify payment succeeds (no minimum amount error)

#### 8b. Large Payment Amount
- [ ] Create cart with $500+ total
- [ ] Complete payment with test account
- [ ] Verify no maximum amount restrictions in sandbox

#### 8c. Zero Tip Amount
- [ ] Complete payment with tip_amount = $0.00
- [ ] Verify order processes correctly

#### 8d. With Tip Amount (if applicable)
- [ ] Complete payment with tip_amount > $0
- [ ] Verify tip stored separately in order
- [ ] Verify total includes tip

#### 8e. Expired intent_id
- [ ] Generate intent_id via API
- [ ] Wait 10+ minutes (intent expires)
- [ ] Try to use expired intent_id
- [ ] Verify error: "Intent ID validation failed"

**Expected Results:**
- ✅ Edge cases handled gracefully
- ✅ Appropriate error messages shown
- ✅ No crashes or unhandled exceptions

---

## 🔍 Monitoring & Debugging

### Firebase Logs
```bash
# Real-time log monitoring
gcloud app logs tail --project=studio-567050101-bc6e8

# Filter for CannPay events
gcloud app logs tail --project=studio-567050101-bc6e8 | grep -i cannpay

# Filter for webhook events
gcloud app logs tail --project=studio-567050101-bc6e8 | grep -i "/api/webhooks/cannpay"
```

### Firestore Queries
- **Orders:** `orders` collection, filter by `paymentMethod: "cannpay"`
- **Payment Events:** `payment_events` collection (if logging enabled)
- **Logs:** `system_logs` collection, filter by tag `cannpay`

### Browser Console Debugging
```javascript
// Enable verbose CannPay widget logging
localStorage.setItem('CANNPAY_DEBUG', 'true');

// Check if widget loaded
console.log('CannPay widget:', window.canpay);

// Monitor widget callbacks
window.addEventListener('message', (e) => {
  console.log('Widget message:', e.data);
});
```

---

## 📊 Success Criteria

### Must Pass (Blocking)
- ✅ Basic payment flow completes end-to-end
- ✅ Webhook receives payment confirmations
- ✅ HMAC signature verification works correctly
- ✅ Orders sync to Alleaves POS
- ✅ Processing fee ($0.50) applied correctly

### Should Pass (High Priority)
- ✅ Error handling displays clear messages
- ✅ Multiple payments process without conflicts
- ✅ Edge cases handled gracefully
- ✅ Logs show proper event flow

### Nice to Have (Monitoring)
- ✅ Performance: Payment completes within 5 seconds
- ✅ No JavaScript console errors
- ✅ Widget UI loads within 2 seconds

---

## 🚨 Known Issues / Limitations

### Sandbox Environment
- **Test Data Only:** All transactions use fake data
- **No Real Money:** Cannot test actual bank transfers
- **No Settlements:** Sandbox doesn't simulate T+1/T+2 settlement cycles
- **Test Accounts:** Only 2 test consumer accounts available

### Production Differences
- **Live Environment:** Requires production credentials from CannPay
- **Real Banks:** Consumer must link real bank account
- **Settlements:** Takes 1-2 business days for merchant to receive funds
- **Fees:** Real CannPay fees apply (~2.9% + $0.30 per transaction)

---

## 📝 Post-Testing Actions

### If All Tests Pass ✅
1. [ ] Document test results and screenshots
2. [ ] Request production credentials from CannPay
3. [ ] Schedule go-live date with Thrive Syracuse owner
4. [ ] Update `apphosting.yaml` to `environment: "live"`
5. [ ] Configure production secrets in Firebase Secret Manager
6. [ ] Deploy to production
7. [ ] Make test purchase with real payment ($5 minimum)
8. [ ] Monitor first 10 transactions closely
9. [ ] Verify settlement arrives in bank account (T+1 or T+2)

### If Tests Fail ❌
1. [ ] Document failure details:
   - [ ] Test scenario that failed
   - [ ] Error messages
   - [ ] Screenshots/videos
   - [ ] Firebase logs excerpt
2. [ ] Check common issues:
   - [ ] Incorrect API endpoints
   - [ ] Invalid credentials
   - [ ] HMAC signature mismatch
   - [ ] Widget script not loading
   - [ ] Callback functions not firing
3. [ ] Contact CannPay support if needed:
   - **Email:** support@canpayapp.com
   - **Phone:** 1-844-4-CANPAY (1-844-422-6729)
   - Provide: intent_id, transaction_number, timestamp, error logs

---

## 📞 Support Contacts

### CannPay Support
- **Email:** support@canpayapp.com
- **Phone:** 1-844-4-CANPAY (1-844-422-6729)
- **Portal:** https://merchant.canpayapp.com
- **Hours:** M-F 9am-6pm ET

### BakedBot Support
- **Email:** support@bakedbot.ai
- **Developer:** martez@bakedbot.ai

### Thrive Syracuse
- **Contact:** [Owner Name]
- **Email:** [Owner Email]
- **Phone:** [Owner Phone]

---

**Testing Date:** _____________
**Tester Name:** _____________
**Test Results:** PASS / FAIL
**Notes:** _____________________________________________
