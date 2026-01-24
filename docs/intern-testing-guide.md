# Intern Testing Guide: Ecstatic Edibles Checkout Flow

## Overview
This guide walks you through testing the complete customer journey on the Ecstatic Edibles pilot site. We're using **sandbox mode** so no real charges will occur.

---

## Test Environment

| Item | Value |
|------|-------|
| **Site URL** | https://ecstaticedibles.bakedbot.ai |
| **Environment** | Sandbox (test mode) |
| **Payment Provider** | Authorize.net |

---

## Test Credit Cards

Use these card numbers for testing. **These only work in sandbox mode.**

### Approved Transactions

| Card Type | Card Number | CVV | Expiration |
|-----------|-------------|-----|------------|
| **Visa** | `4242424242424242` | `123` | Any future date (e.g., `12/26`) |
| **MasterCard** | `5424000000000015` | `123` | Any future date |
| **American Express** | `370000000000002` | `1234` | Any future date |
| **Discover** | `6011000000000012` | `123` | Any future date |

### Declined Transactions (for error handling tests)

| Scenario | Card Number | Expected Result |
|----------|-------------|-----------------|
| Decline | `4000000000000002` | Card declined |
| Invalid Card | `4000000000000069` | Expired card |

### Zip Codes for AVS Testing

| Zip Code | AVS Response |
|----------|--------------|
| `46282` | AVS Match |
| `46201` | AVS No Match |

---

## Step-by-Step Test Scenarios

### Scenario 1: Happy Path - Complete Purchase

**Goal:** Successfully complete a purchase from browse to confirmation.

1. **Navigate to the store**
   - Go to https://ecstaticedibles.bakedbot.ai
   - Verify the page loads with the red/black/white brand theme

2. **Browse products**
   - You should see 3 products:
     - Snicker Doodle Bites ($10)
     - Berry Cheesecake Gummies ($10)
     - "If You Hit This We Go Together" Hoodie ($40)
   - Click on a product to view details

3. **Add to cart**
   - Click "Add to Cart" on any product
   - Verify the cart icon updates with item count
   - Add multiple items to test cart functionality

4. **Proceed to checkout**
   - Click the cart icon or "Checkout" button
   - Complete age verification (confirm you are 21+)

5. **Enter customer details**
   ```
   Name: Test Customer
   Email: test@example.com
   Phone: (555) 123-4567
   ```

6. **Enter shipping address**
   ```
   Street: 123 Test Street
   City: Los Angeles
   State: CA
   Zip: 90210
   ```

7. **Enter payment information**
   ```
   Card Number: 4242424242424242
   Expiration: 12/26
   CVV: 123
   Zip: 46282
   ```

8. **Submit order**
   - Click "Pay $XX.XX" button
   - Wait for processing (sandbox may take a few seconds)

9. **Verify confirmation**
   - You should see an order confirmation page
   - Note the Order ID for records

**Expected Result:** Order completes successfully, confirmation page displays.

---

### Scenario 2: Declined Card

**Goal:** Verify the app handles declined cards gracefully.

1. Follow steps 1-6 from Scenario 1
2. Enter this payment info:
   ```
   Card Number: 4000000000000002
   Expiration: 12/26
   CVV: 123
   Zip: 90210
   ```
3. Submit the order

**Expected Result:**
- Error message displays: "Payment declined" or similar
- User stays on payment page
- Can retry with different card

---

### Scenario 3: Smokey AI Chatbot

**Goal:** Test the AI budtender assistant.

1. Go to https://ecstaticedibles.bakedbot.ai
2. Look for the chat widget (usually bottom-right corner)
3. Click to open the chat
4. Test these prompts:
   - "What products do you have?"
   - "Tell me about the gummies"
   - "What's the difference between the edibles?"
   - "Do you ship to California?"
   - "How much THC is in the Snicker Doodle Bites?"

**Expected Result:**
- Smokey responds with relevant product information
- Responses are friendly and knowledgeable
- Can answer questions about shipping and products

---

### Scenario 4: Empty Cart Checkout Attempt

**Goal:** Verify users can't checkout with empty cart.

1. Go to the site with no items in cart
2. Try to access checkout directly

**Expected Result:**
- Redirected to shop or shown "Cart is empty" message
- Cannot proceed without items

---

### Scenario 5: Mobile Responsiveness

**Goal:** Verify the site works on mobile devices.

1. Open Chrome DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Select "iPhone 12 Pro" or similar
4. Navigate through:
   - Homepage
   - Product pages
   - Cart
   - Checkout flow

**Expected Result:**
- All elements are visible and accessible
- Buttons are tappable
- Forms are usable
- No horizontal scrolling

---

## Bug Report Template

If you find an issue, document it using this format:

```markdown
## Bug Report

**Date:** [Today's date]
**Tester:** [Your name]
**Environment:** Sandbox / ecstaticedibles.bakedbot.ai

### Summary
[One-line description]

### Steps to Reproduce
1. [Step 1]
2. [Step 2]
3. [Step 3]

### Expected Result
[What should happen]

### Actual Result
[What actually happened]

### Screenshots
[Attach any relevant screenshots]

### Device/Browser
- Browser: [Chrome/Safari/Firefox]
- Version: [Browser version]
- Device: [Desktop/Mobile]
- OS: [Windows/Mac/iOS/Android]
```

---

## Test Checklist

Use this checklist to track your testing progress:

### Core Functionality
- [ ] Site loads with correct branding (red/black/white)
- [ ] All 3 products display correctly
- [ ] Product images load (if added)
- [ ] Add to cart works
- [ ] Cart updates correctly
- [ ] Remove from cart works
- [ ] Quantity update works

### Checkout Flow
- [ ] Age verification displays
- [ ] Customer details form validates
- [ ] Shipping address form works
- [ ] Credit card form accepts test cards
- [ ] Successful payment processes
- [ ] Order confirmation displays
- [ ] Declined card shows error message

### Smokey Chatbot
- [ ] Chat widget appears
- [ ] Chat opens/closes properly
- [ ] Smokey responds to questions
- [ ] Product recommendations work

### Responsive Design
- [ ] Desktop layout correct
- [ ] Tablet layout correct
- [ ] Mobile layout correct

---

## Questions?

Contact the engineering team if you encounter issues not covered in this guide.

**Last Updated:** January 2026
