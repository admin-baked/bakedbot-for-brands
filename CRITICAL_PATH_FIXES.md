# Critical Path Fixes - Investigation & Solutions

**Status:** Investigation Complete ✅
**Next:** Implement fixes in priority order

---

## ✅ COMPLETED: Priority Zero - Build Errors

**Status:** FIXED - 0 TypeScript errors

All 20 TypeScript errors have been resolved:
- Fixed driver authentication imports (`@/firebase/auth/client-auth` → `@/firebase/client`)
- Fixed delivery-driver server imports (`@/firebase/admin/server-client` → `@/firebase/server-client`)
- Fixed delivery.ts missing imports (DISPENSARY_ADMIN_ROLES, FieldValue)
- Fixed weekly-intel ChatMessage type mismatch

**Build Health:** 🟢 PASSING

---

## 🔍 Investigation Results - Critical Path Issues

### Issue #1: Bundle Editing - Product Selection ❌ CONFIRMED

**File:** [src/components/dispensary/bundle-builder.tsx](src/components/dispensary/bundle-builder.tsx)

**Problem:**
- Component uses hardcoded `MOCK_ELIGIBLE_PRODUCTS` (lines 21-26)
- No actual product fetching from Firestore or POS
- No filtering, search, or real inventory integration

**Root Cause:**
```typescript
// Line 21-26: Hardcoded mock data
const MOCK_ELIGIBLE_PRODUCTS = [
    { id: 'prod-1', name: 'Camino Midnight Blueberry', ... },
    { id: 'prod-2', name: 'Camino Wild Berry', ... },
    ...
];
```

**Fix Required:**
1. Create server action: `fetchEligibleBundleProducts(orgId, dealType, criteria)`
2. Query `publicViews/products/items` with deal criteria filters
3. Add product filtering UI (category, brand, price range, THC/CBD levels)
4. Display unit cost per product
5. Show price recommendations with margin calculation
6. Real-time inventory availability check

**Estimated Time:** 6-8 hours
**Priority:** P0 (BLOCKING CHECKOUT)

---

### Issue #2: Dynamic Pricing UI ⚠️ PARTIALLY WORKING

**Files:**
- [src/app/dashboard/pricing/page.tsx](src/app/dashboard/pricing/page.tsx)
- [src/app/dashboard/pricing/components/template-browser.tsx](src/app/dashboard/pricing/components/template-browser.tsx)
- [src/app/actions/dynamic-pricing.ts](src/app/actions/dynamic-pricing.ts)

**Current State:**
✅ Server actions work (`createPricingRule`, `getPricingRules`, `publishPricesToMenu`)
✅ Template Browser allows creating rules from templates
✅ "Create Rule" button exists (line 56)
❌ No manual rule creation form (routes to inbox instead)
❌ No "Preview Affected Products" before applying
❌ No product count badge showing impact

**Root Cause:**
```typescript
// Line 31-34: Routes to inbox instead of opening form
const handleCreateRule = () => {
    router.push('/dashboard/inbox?create=pricing'); // ← Should open dialog
};
```

**Fix Required:**
1. Add "Create Custom Rule" dialog with form
2. Add "Preview Impact" button that shows:
   - Number of products affected
   - Price changes before/after
   - Expected revenue impact
3. Add product count badges on template cards
4. Wire up "Apply to Menu" confirmation flow

**Estimated Time:** 4-6 hours
**Priority:** P0 (BLOCKING PRICING STRATEGY)

---

### Issue #3: Checkout Upsell ⚠️ NEEDS INVESTIGATION

**Files:**
- [src/components/upsell/product-upsell-row.tsx](src/components/upsell/product-upsell-row.tsx)
- [src/components/checkout/checkout-flow.tsx](src/components/checkout/checkout-flow.tsx)

**Current State:**
✅ `ProductUpsellRow` component exists and renders correctly
❌ Unknown: Whether upsell modal blocks checkout buttons (need to test live)
❌ Unknown: Z-index conflicts or click event issues

**Potential Issues:**
1. Z-index conflicts between upsell modal and checkout buttons
2. Upsell animation blocking UI interactions
3. Add-to-cart from upsell preventing checkout progression
4. Missing dismissable close button on upsell section

**Fix Required:**
1. Test checkout flow with upsells enabled
2. Add explicit close/dismiss button on upsell section
3. Ensure upsell modal closes on "Continue to Checkout"
4. Verify z-index hierarchy (upsells < checkout buttons)
5. Add loading states during add-to-cart from upsell

**Estimated Time:** 2-3 hours
**Priority:** P0 (BLOCKING REVENUE)

---

### Issue #4: Order History Limit ✅ CODE CORRECT, API ISSUE

**Files:**
- [src/lib/pos/adapters/alleaves.ts](src/lib/pos/adapters/alleaves.ts#L658)
- [src/app/dashboard/orders/actions.ts](src/app/dashboard/orders/actions.ts#L189)

**Current State:**
✅ Code fetches up to 10,000 orders (`getAllOrders(10000)`)
✅ Pagination logic implemented (100 orders per page)
✅ Date range: 2020-01-01 to present
❌ Only ~51 orders visible in UI

**Root Cause Analysis:**
```typescript
// Line 189: Fetches 10,000 orders
const alleavesOrders = await client.getAllOrders(10000);

// Line 658-696: Pagination loop
async getAllOrders(maxOrders: number = 100): Promise<any[]> {
    const pageSize = 100;
    for (let page = 1; page <= maxPages; page++) {
        // ... fetches page by page
    }
}
```

**Likely Issue:**
1. **ALLeaves API returning incomplete data** - The API might only be returning the first page (100 items) despite pagination
2. **UI rendering limit** - Frontend might have a display limit
3. **Cache poisoning** - 3-minute cache might have stale data with only 51 orders

**Fix Required:**
1. **Debug logging:** Add detailed logs to `getAllOrders()` to see actual page counts returned
2. **Manual cache clear:** Add "Refresh Orders" button that invalidates cache
3. **Pagination indicator:** Show "Page X of Y" or "Showing 51 of 1,234 orders"
4. **Date range filter:** Add UI date picker to filter order history
5. **Export to CSV:** Allow downloading full order history
6. **Contact ALLeaves:** Verify API pagination is working correctly

**Estimated Time:** 4-6 hours
**Priority:** P0 (BLOCKING ANALYTICS)

---

### Issue #5: Inventory Refresh Stale Data ⚠️ POLLING ISSUE

**Files:**
- [src/server/actions/pos-sync.ts](src/server/actions/pos-sync.ts)
- [src/app/dashboard/orders/actions.ts](src/app/dashboard/orders/actions.ts#L234) - 3-minute cache

**Current State:**
✅ Manual sync via `syncPOSProducts()` works
❌ 3-5 minute cache TTL causes stale data
❌ No real-time webhooks from ALLeaves
❌ No "Last synced" indicator in UI

**Root Cause:**
```typescript
// Line 234: 3-minute cache
posCache.set(cacheKey, orders, 3 * 60 * 1000);
```

**Fix Required:**

**Phase 1: Quick Fix (2 hours)**
1. Reduce cache TTL to 1 minute (from 3 minutes)
2. Add "Refresh Inventory" button in product management UI
3. Add "Last synced X minutes ago" indicator
4. Add auto-refresh toggle (refresh every 2 min)

**Phase 2: Webhook Integration (8 hours)**
1. Contact ALLeaves support to register webhook
2. Create `/api/webhooks/alleaves/inventory` endpoint
3. Verify HMAC signature for security
4. Update Firestore on inventory change events
5. Trigger `revalidatePath('/')` to refresh menu
6. Handle webhook events:
   - `inventory.updated` - Product quantity changed
   - `inventory.low_stock` - Low stock alert
   - `product.updated` - Product details changed
   - `product.deleted` - Product removed

**Example Webhook Handler:**
```typescript
// POST /api/webhooks/alleaves/inventory
export async function POST(req: Request) {
  const signature = req.headers.get('x-alleaves-signature');
  const isValid = verifySignature(req.body, signature);

  if (!isValid) return new Response('Unauthorized', { status: 401 });

  const event = await req.json();

  switch (event.type) {
    case 'inventory.updated':
      await updateProductInventory(event.data.product_id, event.data.quantity);
      revalidatePath('/menu');
      break;
    case 'inventory.low_stock':
      await sendLowStockAlert(event.data);
      break;
  }

  return new Response('OK');
}
```

**Estimated Time:**
- Phase 1 (polling): 2 hours
- Phase 2 (webhooks): 8 hours

**Priority:** P0 (BLOCKING REAL-TIME OPS)

---

## 📊 Summary & Recommended Fix Order

### Fix Priority (by Impact)

| # | Issue | Status | Impact | Time | Blocker |
|---|-------|--------|--------|------|---------|
| 1 | Bundle Editing | ❌ Broken | HIGH | 6-8h | Checkout |
| 2 | Checkout Upsell | ⚠️ Test Needed | HIGH | 2-3h | Revenue |
| 3 | Dynamic Pricing UI | ⚠️ Partial | MED | 4-6h | Pricing |
| 4 | Inventory Refresh (Quick) | ⚠️ Stale | MED | 2h | Operations |
| 5 | Order History | ⚠️ API Issue | MED | 4-6h | Analytics |
| 6 | Inventory Webhooks | ❌ Missing | LOW | 8h | Real-time |

### Recommended Execution Order

**Sprint 1 (Critical Blockers - 12-17 hours)**
1. ✅ **Bundle Editing** (6-8h) - Unblocks checkout funnel
2. ✅ **Checkout Upsell** (2-3h) - Unblocks revenue
3. ✅ **Inventory Refresh Quick Fix** (2h) - Improves accuracy
4. ✅ **Dynamic Pricing Preview** (4-6h) - Enables pricing strategy

**Sprint 2 (High Priority - 12-14 hours)**
5. ✅ **Order History Debug** (4-6h) - Unblocks analytics
6. ✅ **Inventory Webhooks** (8h) - Enables real-time ops

**Total Estimated Time:** 24-31 hours (3-4 days for 2 engineers)

---

## 🚀 Next Steps

1. **Dashon:** Start with Bundle Editing (highest impact)
2. **Rishabh:** Start with Checkout Upsell testing (quick validation)
3. **Both:** Coordinate on Inventory Refresh (quick win)
4. **Daily Standups:** Track progress, blockers, discoveries

---

## 🔧 Testing Checklist (Before Production)

### Bundle Editing
- [ ] Can add products to bundle slots
- [ ] Can remove products from bundle slots
- [ ] Pricing updates dynamically
- [ ] Inventory availability checked
- [ ] Saves to Firestore correctly
- [ ] Filters work (category, brand, price)
- [ ] Unit cost displayed
- [ ] Margin calculation accurate

### Checkout Upsell
- [ ] Can dismiss upsell without adding product
- [ ] Can add upsell product and continue checkout
- [ ] Checkout button always clickable
- [ ] No z-index conflicts
- [ ] Animation doesn't block UI
- [ ] Mobile responsive

### Dynamic Pricing
- [ ] Can create pricing rule from template
- [ ] Preview shows affected product count
- [ ] Applying rule updates prices in menu
- [ ] Prices revert when rule is disabled
- [ ] Manual rule creation works

### Order History
- [ ] Manual refresh works
- [ ] Date range filter works
- [ ] Pagination shows all orders
- [ ] Export CSV works
- [ ] Performance under 3 seconds

### Inventory Refresh
- [ ] Manual refresh button works
- [ ] "Last synced" indicator accurate
- [ ] Auto-refresh toggle works
- [ ] Webhooks receive events (if implemented)
- [ ] Menu updates on inventory change

---

**Generated:** 2026-02-16
**Build Status:** 🟢 PASSING (0 errors)
**Ready for:** Sprint Planning
