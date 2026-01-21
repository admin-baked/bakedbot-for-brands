# Ecstatic Edibles Pilot Customer Testing Guide

## Overview
This document outlines the test cases for verifying the Ecstatic Edibles hemp e-commerce pilot customer setup.

**Test Account**: `ecstaticedibles@bakedbot.ai`
**Brand ID**: `brand_ecstatic_edibles`
**Org ID**: `org_ecstatic_edibles`
**Purchase Model**: Online Only (Shipping)
**Theme**: Red (#DC2626), Black (#000000), White (#FFFFFF)

---

## Pre-Test Setup

### 1. Run Configuration Script
```bash
cd dev
npx ts-node configure-ecstatic-edibles.ts
```

**Expected Output**:
- User found or created
- Brand created with red/white/black theme
- Organization created with pilot plan
- Custom claims set (role: brand, approvalStatus: approved)

### 2. Verify Firestore Data
Check these collections in Firebase Console:

| Collection | Document ID | Key Fields |
|------------|-------------|------------|
| `users` | `{user_uid}` | `role: 'brand'`, `approvalStatus: 'approved'`, `brandId: 'brand_ecstatic_edibles'` |
| `brands` | `brand_ecstatic_edibles` | `theme.primaryColor: '#DC2626'`, `purchaseModel: 'online_only'` |
| `organizations` | `org_ecstatic_edibles` | `billing.planId: 'pilot'`, `settings.purchaseModel: 'online_only'` |

---

## Test Cases

### TC-001: Authentication & Dashboard Access

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/brand-login` | Login page loads |
| 2 | Enter `ecstaticedibles@bakedbot.ai` | Email accepted |
| 3 | Complete authentication | Redirects to `/dashboard` |
| 4 | Verify dashboard loads | Brand Console visible, no white screen |
| 5 | Check sidebar | All brand features accessible (Products, Orders, Menu, etc.) |

**Pass Criteria**: Dashboard loads without errors, sidebar shows brand navigation

---

### TC-002: Brand Theme Configuration

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/dashboard/settings` | Settings page loads |
| 2 | Click "Theming" tab | Brand theming options visible |
| 3 | Verify primary color | Should be `#DC2626` (red) |
| 4 | Verify secondary color | Should be `#000000` (black) |
| 5 | Verify accent color | Should be `#FFFFFF` (white) |

**Pass Criteria**: Colors match red/white/black theme

---

### TC-003: Product Creation (Hemp)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/dashboard/products` | Products page loads |
| 2 | Click "Add Product" | Product form opens |
| 3 | Fill required fields: | |
| | - Name: "Delta-8 Gummies" | |
| | - Category: "Edible" | |
| | - Price: 29.99 | |
| 4 | Fill hemp-specific fields: | |
| | - Weight: 100 (grams) | |
| | - Servings: 10 | |
| | - mg Per Serving: 25 | |
| | - Shippable: checked | |
| 5 | Save product | Success toast, product in list |

**Pass Criteria**: Product created with hemp fields saved correctly

---

### TC-004: Menu Display

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/dashboard/menu` | Menu page loads |
| 2 | Add product to menu | Product appears in menu |
| 3 | Visit `/ecstaticedibles` (public page) | Brand page loads |
| 4 | Verify product displays | Product visible with price |
| 5 | Verify theme colors | Red/black/white theme applied |

**Pass Criteria**: Product visible on public brand page with correct theme

---

### TC-005: Shipping Checkout Flow

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | On brand page, click "Add to Cart" | Product added, cart updates |
| 2 | Click "Checkout" | Redirects to `/checkout` |
| 3 | Verify shipping mode | Shows "Complete your order for shipping" with truck icon |
| 4 | Fill shipping address: | |
| | - Name: Test Customer | |
| | - Email: test@example.com | |
| | - Street: 123 Main St | |
| | - City: Denver | |
| | - State: CO | |
| | - Zip: 80202 | |
| 5 | Verify "FREE SHIPPING" badge | Should display prominently |
| 6 | Proceed to payment | Authorize.net form appears |

**Pass Criteria**: Shipping checkout flow works with free shipping

---

### TC-006: State Restriction Validation

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | In checkout, enter restricted state | |
| | - State: ID (Idaho) | |
| 2 | Attempt to proceed | Error message displayed |
| 3 | Verify error text | "Sorry, we cannot ship to ID due to state regulations." |

**Restricted States to Test**:
- ID (Idaho)
- MS (Mississippi)
- SD (South Dakota)
- NE (Nebraska)
- KS (Kansas)

**Pass Criteria**: Order blocked for restricted states with clear error message

---

### TC-007: Payment Processing (Sandbox)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Complete shipping form with valid state | Payment form visible |
| 2 | Enter test card details: | |
| | - Card: 4111 1111 1111 1111 | |
| | - Exp: 12/25 | |
| | - CVV: 123 | |
| 3 | Click "Complete Order" | Processing indicator shown |
| 4 | Verify success | Order confirmation displayed |
| 5 | Check order in `/dashboard/orders` | Order visible with "submitted" status |

**Note**: Requires Authorize.net sandbox credentials configured

**Pass Criteria**: Payment processed, order created in Firestore

---

### TC-008: Order Management

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/dashboard/orders` | Orders page loads |
| 2 | Find test order | Order visible in list |
| 3 | Click order to view details | Order details modal/page opens |
| 4 | Verify order data: | |
| | - Customer info correct | |
| | - Shipping address correct | |
| | - Payment status: paid | |
| | - Purchase model: online_only | |

**Pass Criteria**: Order details accurate and complete

---

### TC-009: Error Handling (Dashboard)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as Ecstatic Edibles | Dashboard loads |
| 2 | If any component fails | ErrorBoundary catches error |
| 3 | Verify error UI | "Something went wrong" card with retry options |
| 4 | Click "Try again" | Component attempts reload |

**Pass Criteria**: Errors handled gracefully, no white screen

---

### TC-010: Playbook Seeding

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/dashboard/playbooks` | Playbooks page loads |
| 2 | Verify default playbooks seeded | At least 5 playbooks visible |
| 3 | Toggle a playbook on | Status changes to "active" |
| 4 | Click "Run" on a playbook | Test run executes, toast shown |

**Pass Criteria**: Default playbooks available and functional

---

## Environment Variables Required

```env
# Authorize.net (Sandbox)
AUTHNET_API_LOGIN_ID=your_sandbox_login
AUTHNET_TRANSACTION_KEY=your_sandbox_key
AUTHNET_ENV=sandbox

# Firebase
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
```

---

## Known Issues / Limitations

1. **First Login Delay**: Custom claims may require user to log out and back in after running config script
2. **Email Confirmation**: Order confirmation email requires Mailjet to be configured
3. **Theme Preview**: Theme changes may require page refresh to reflect

---

## Rollback Procedure

If testing reveals critical issues:

1. **Reset User Claims**:
```javascript
// In Firebase Console > Authentication > Users
// Find user and clear custom claims
```

2. **Delete Test Data**:
```javascript
// Firestore collections to clean:
// - brands/brand_ecstatic_edibles
// - organizations/org_ecstatic_edibles
// - users/{uid}
// - orders (filter by brandId)
// - products (filter by brandId)
```

---

## Sign-Off

| Tester | Date | Version | Result |
|--------|------|---------|--------|
| | | | |

---

*Last Updated: January 2025*
