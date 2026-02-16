# Thrive Syracuse Production Readiness Plan

**Generated:** 2026-02-16
**Build Status:** 🔴 **FAILING** (20 TypeScript errors)
**Priority:** Build errors MUST be fixed before any feature work

---

## 🚨 PRIORITY ZERO: Fix Build Errors

**Current Status:** `npm run check:types` failing with 20 TypeScript errors

### Errors Breakdown

#### 1. Debug API Routes - Missing .js Files (8 errors)
```
.next/types/app/api/debug/auth/route.ts
.next/types/app/api/debug/customers/route.ts
.next/types/app/api/debug/env/route.ts
.next/types/app/api/debug/thrive-diagnostic/route.ts
```
**Fix:** These are debug routes that may need to be deleted or their build output verified.

#### 2. Page Props Type Mismatch (2 errors)
```
.next/types/app/dashboard/ceo/approvals/page.ts
.next/types/app/invite/[token]/page.ts
```
**Fix:** Next.js 15+ requires `params` to be wrapped in `Promise`. Update page components:
```typescript
// Before
export default function Page({ params }: { params: { token: string } })

// After
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
}
```

#### 3. Competitive Intel Type Errors (6 errors)
```
src/app/dashboard/competitive-intel/actions.ts(103,13)
src/app/dashboard/competitive-intel/actions.ts(123,9)
src/app/dashboard/competitive-intel/page.tsx(176-181)
```
**Fix:** Type mismatch between `"real-time" | "hourly"` and `"weekly" | "daily" | "live"`. Update `CompetitorConfig` type in `src/types/competitor.ts` or normalize values.

#### 4. Delivery Components Type Errors (4 errors)
```
src/app/dashboard/delivery/components/drivers-tab.tsx(55,24)
src/app/dashboard/delivery/components/zones-tab.tsx(49,30)
src/app/dashboard/delivery/components/zones-tab.tsx(110,51)
src/app/dashboard/delivery/components/zones-tab.tsx(112,59)
```
**Fix:**
- `isAvailable` type mismatch - ensure it's always `boolean`, not `boolean | undefined`
- `createDeliveryZone` signature mismatch - verify expected arguments
- Missing `description` property on `DeliveryZone` type

### Fix Strategy
1. **Debug routes:** Delete or fix (30 min)
2. **Page props:** Update async function signatures (30 min)
3. **Competitive intel:** Align frequency types (45 min)
4. **Delivery:** Fix type definitions and calls (45 min)

**Total Estimate:** 2.5 hours
**Assignee:** Dashon / Rishabh
**Blocker for:** ALL feature work

---

## 📋 Thrive Syracuse Issues (Post-Build Fix)

### Critical Path (Pre-Launch Blockers)

#### 1. Bundle Editing - Product Selection Broken
**File:** `src/components/dispensary/bundle-builder.tsx`
**Issue:** Product editing inside bundles is non-functional
**Current State:**
- Component uses `MOCK_ELIGIBLE_PRODUCTS` (hardcoded data)
- No actual product fetching from Firestore/POS
- No product filtering or search functionality

**Fix Required:**
```typescript
// Add server action to fetch eligible products
async function fetchEligibleProducts(
  orgId: string,
  dealType: BundleDeal['type'],
  criteria: BundleDeal['criteria']
): Promise<Product[]> {
  // Query publicViews/products/items with criteria filters
  // Return products matching category, brand, price range
}

// Add to BundleBuilder component:
- Product search/filter UI
- Real-time inventory sync
- Unit cost display per product
- Price recommendation logic (margin calculation)
```

**Testing:**
- [ ] Can add products to bundle slots
- [ ] Can remove products from bundle slots
- [ ] Pricing updates dynamically
- [ ] Inventory availability checked
- [ ] Saves to Firestore correctly

**Time Estimate:** 6-8 hours
**Priority:** P0 (blocking checkout)

---

#### 2. Dynamic Pricing - Non-Functional Rule Creation
**File:** `src/app/actions/dynamic-pricing.ts`
**Issue:** Pricing rule creation template system can't be created or applied
**Current State:**
- `createPricingRule()` exists and works ✅
- `getPricingRules()` exists and works ✅
- `publishPricesToMenu()` exists and works ✅
- **MISSING:** UI buttons/forms to trigger these actions

**Fix Required:**
```typescript
// src/app/dashboard/pricing/page.tsx
// Add:
// 1. "Create Rule" button → Dialog with form
// 2. "Preview Affected Products" before applying
// 3. "Apply to Menu" button → calls publishPricesToMenu()
// 4. Product count badge (e.g., "Will affect 23 products")

// Template system for common rules:
const CLEARANCE_TEMPLATE = {
  name: 'Clearance - 45+ Days Old',
  conditions: {
    inventoryAge: { min: 45 }
  },
  priceAdjustment: {
    type: 'percentage',
    value: 0.30 // 30% off
  }
};
```

**Testing:**
- [ ] Can create pricing rule from template
- [ ] Preview shows affected product count
- [ ] Applying rule updates product prices in `publicViews/products/items`
- [ ] Prices revert when rule is disabled
- [ ] Alleaves sync works (optional two-way sync)

**Time Estimate:** 4-6 hours
**Priority:** P0 (blocking pricing strategy)

---

#### 3. Checkout Flow - Upsell Blocking Progression
**File:** `src/components/checkout/checkout-flow.tsx`
**Issue:** Upsell features in cart preventing checkout completion
**Current State:**
- `ProductUpsellRow` component exists and works ✅
- **ISSUE:** Upsell modal/animation may be blocking checkout button clicks

**Fix Required:**
```typescript
// Investigate:
// 1. Z-index conflicts between upsell modal and checkout buttons
// 2. Click handlers on upsell cards preventing event propagation
// 3. Loading states blocking checkout progression

// Potential fixes:
// - Ensure upsell modals close on "Continue to Checkout"
// - Add dismissable upsell section (close button)
// - Prevent upsell from re-triggering after dismissed
// - Add proper loading states during add-to-cart from upsell
```

**Testing:**
- [ ] Can dismiss upsell without adding product
- [ ] Can add upsell product and continue checkout
- [ ] Checkout button always clickable
- [ ] No z-index conflicts
- [ ] Animation doesn't block UI

**Time Estimate:** 2-3 hours
**Priority:** P0 (blocking revenue)

---

#### 4. Order Sync - Only 51 Orders Visible
**File:** `src/server/actions/order-actions.ts`, POS sync logic
**Issue:** Historical order depth limited to last 51 orders
**Current State:**
- Firestore `orders` collection is empty for Thrive Syracuse
- Orders come from Alleaves POS API
- 3-minute cache in `getOrdersFromAlleaves()`
- **LIKELY:** Alleaves API pagination only returns 50-100 orders per call

**Fix Required:**
```typescript
// src/lib/pos/adapters/alleaves.ts
async function fetchAllOrders(
  startDate: Date,
  endDate: Date,
  options: { limit?: number; offset?: number } = {}
): Promise<Order[]> {
  // Add pagination loop:
  // 1. Fetch page 1 (limit 100, offset 0)
  // 2. If results.length === limit, fetch page 2 (offset 100)
  // 3. Continue until results.length < limit
  // 4. Merge all pages

  // Add Firestore caching:
  // - Save orders to tenants/{orgId}/orders/{orderId}
  // - Enable historical queries without POS API limits
}

// Add to CEO Dashboard:
// - Date range selector for order history
// - Export to CSV for full historical data
// - Infinite scroll pagination
```

**Testing:**
- [ ] Can fetch orders older than 51
- [ ] Date range filter works (e.g., last 90 days)
- [ ] Pagination shows all orders
- [ ] Export includes full history
- [ ] Performance stays under 3 seconds

**Time Estimate:** 4-6 hours
**Priority:** P0 (blocking analytics)

---

#### 5. Inventory Refresh - Stale Data (5-10 Min Polling)
**File:** `src/server/actions/pos-sync.ts`
**Issue:** Periodic polling causes 5-10 minute delays in inventory updates
**Current State:**
- `syncPOSProducts()` called manually or on cron schedule
- No real-time refresh mechanism
- No webhook integration with Alleaves

**Fix Required:**
```typescript
// Phase 1: Improve Polling (Quick Fix - 2 hours)
// - Reduce polling interval to 2 minutes
// - Add manual refresh button in product management UI
// - Add "Last synced X minutes ago" indicator

// Phase 2: Webhook Integration (High Priority - 8 hours)
// - Register webhook with Alleaves for inventory events
// - Create /api/webhooks/alleaves/inventory route
// - Verify HMAC signature (security)
// - Update Firestore on inventory change events
// - Trigger revalidatePath('/') to refresh menu

// Example webhook handler:
// POST /api/webhooks/alleaves/inventory
// { event: 'inventory.updated', product_id: '12345', quantity: 10 }
```

**Testing:**
- [ ] Inventory updates within 2 minutes (polling)
- [ ] Manual refresh button works
- [ ] Webhook receives events (if implemented)
- [ ] Menu reflects inventory changes
- [ ] Low-stock warnings appear

**Time Estimate:**
- Phase 1 (polling): 2 hours
- Phase 2 (webhooks): 8 hours

**Priority:** P0 (blocking real-time operations)

---

### High Priority (System Stability)

#### 6. Heartbeat System - Diagnostics & Auto-Fix
**File:** `src/server/services/heartbeat/index.ts`
**Issue:** Heartbeat monitor needs diagnostics, auto-fix, and Slack alerts
**Current State:**
- ✅ Heartbeat system runs every 5 minutes
- ✅ Checks run (system_errors, deployment_status, etc.)
- ✅ Notifications dispatch to dashboard
- ❌ No diagnostic capabilities when failures detected
- ❌ No automatic fix triggers
- ❌ No Slack alerts to #thrive-syracuse channel

**Fix Required:**
```typescript
// 1. Add Diagnostic Functions
interface HeartbeatDiagnostic {
  checkId: string;
  failureReason: string;
  diagnosticSteps: string[];
  autoFixAvailable: boolean;
  manualFixSteps: string[];
}

async function runDiagnostics(
  checkId: HeartbeatCheckId,
  context: HeartbeatCheckContext
): Promise<HeartbeatDiagnostic> {
  // Example: 'pos_sync' check failed
  // Diagnostics:
  // - Test Alleaves API connection
  // - Check credentials validity
  // - Verify firestore permissions
  // - Test network connectivity
}

// 2. Add Auto-Fix Capabilities
async function attemptAutoFix(
  checkId: HeartbeatCheckId,
  diagnostic: HeartbeatDiagnostic
): Promise<{ success: boolean; actionsTaken: string[] }> {
  switch (checkId) {
    case 'pos_sync':
      // Try refreshing token
      // Try re-authenticating
      // Try manual sync trigger
      break;
    case 'low_stock':
      // Try triggering restock alert
      // Try creating auto-order (if enabled)
      break;
  }
}

// 3. Add Slack Integration
// Install @slack/web-api
import { WebClient } from '@slack/web-api';

async function sendSlackAlert(
  channel: string,
  message: string,
  severity: 'info' | 'warning' | 'critical'
) {
  const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
  await slack.chat.postMessage({
    channel,
    text: message,
    blocks: [
      {
        type: 'section',
        text: { type: 'mrkdwn', text: message }
      }
    ]
  });
}
```

**Testing:**
- [ ] Diagnostics run when check fails
- [ ] Auto-fix attempts logged
- [ ] Slack alerts sent to #thrive-syracuse
- [ ] Green/yellow/red indicators in dashboard
- [ ] Manual fix button triggers diagnostic

**Time Estimate:** 8-10 hours
**Priority:** P1 (system monitoring critical)

---

#### 7. Real-Time Webhooks - Orders & Inventory
**File:** New - `src/app/api/webhooks/alleaves/route.ts` (partially exists for Aeropay)
**Issue:** Replace 5-10 min polling with instant webhook updates
**Current State:**
- ✅ Webhook infrastructure exists (Aeropay example)
- ❌ Alleaves webhooks not registered
- ❌ No webhook event handlers for orders/inventory

**Fix Required:**
```typescript
// 1. Register webhooks with Alleaves
// Contact Alleaves support, provide:
// - Webhook URL: https://bakedbot.ai/api/webhooks/alleaves
// - Events: order.created, order.updated, inventory.updated
// - HMAC secret for signature verification

// 2. Create webhook handler
// POST /api/webhooks/alleaves
export async function POST(req: Request) {
  // Verify HMAC signature
  const signature = req.headers.get('x-alleaves-signature');
  const isValid = verifyAlleavesSignature(req.body, signature);

  if (!isValid) return new Response('Unauthorized', { status: 401 });

  const event = await req.json();

  switch (event.type) {
    case 'order.created':
      await handleNewOrder(event.data);
      break;
    case 'inventory.updated':
      await handleInventoryUpdate(event.data);
      break;
  }

  return new Response('OK', { status: 200 });
}

// 3. Update handlers
async function handleInventoryUpdate(data: any) {
  // Update Firestore product quantity
  // Trigger revalidatePath('/menu')
  // Send low-stock alert if needed
  // Update heartbeat shared data
}
```

**Testing:**
- [ ] Webhook receives events from Alleaves
- [ ] Signature verification works
- [ ] Order created → appears in dashboard instantly
- [ ] Inventory updated → menu reflects change
- [ ] Failed webhooks logged

**Time Estimate:** 8-12 hours (includes Alleaves coordination)
**Priority:** P1 (critical for real-time ops)

---

#### 8. Agent-Based Data Extraction - Firecrawl + Advanced
**File:** Existing agent infrastructure
**Issue:** Ensure two-tier web crawlers stay operational
**Current State:**
- ✅ Firecrawl integration exists
- ✅ Advanced agents can simulate clicks
- ❌ No monitoring for crawler failures
- ❌ No alerts when agents go down

**Fix Required:**
```typescript
// Add to Heartbeat System:
const CRAWLER_CHECK: HeartbeatCheckRegistry = {
  checkId: 'crawler_health',
  execute: async (context) => {
    // Test Firecrawl API connection
    const firecrawlStatus = await testFirecrawl();

    // Test advanced agent availability
    const agentStatus = await testAdvancedAgents();

    if (!firecrawlStatus || !agentStatus) {
      return {
        status: 'error',
        title: 'Web Crawler Down',
        message: 'Data extraction agents are offline',
        priority: 'urgent',
        actionItems: [
          'Check Firecrawl API key',
          'Verify advanced agent server status',
          'Review error logs'
        ]
      };
    }

    return { status: 'ok' };
  }
};

// Add to Ezal agent:
// - Fallback to cached data when crawlers fail
// - Retry logic with exponential backoff
// - Manual trigger button in UI
```

**Testing:**
- [ ] Firecrawl failures detected
- [ ] Advanced agent failures detected
- [ ] Alerts sent within 5 minutes
- [ ] Manual retry works
- [ ] Cached data used as fallback

**Time Estimate:** 4-6 hours
**Priority:** P1 (data quality critical)

---

### Medium Priority (Feature Polish)

#### 9. Default Product Images
**File:** `src/components/product-card.tsx`, `src/components/product-detail-modal.tsx`
**Issue:** Missing product images show empty state instead of fallback
**Current State:**
- Products without `imageUrl` show leaf icon
- No brand-specific fallback images
- No category-specific fallback images

**Fix Required:**
```typescript
// 1. Add default image system
interface ProductImageFallback {
  brandLogo?: string; // tenants/{orgId}/branding/logo
  categoryDefault?: string; // e.g., /defaults/edibles.png
  globalDefault: string; // /defaults/cannabis-leaf.png
}

async function getProductImage(product: Product, orgId: string): Promise<string> {
  if (product.imageUrl) return product.imageUrl;

  // Try brand logo
  const brandLogo = await getBrandLogo(product.brandName, orgId);
  if (brandLogo) return brandLogo;

  // Try category default
  const categoryImage = getCategoryDefaultImage(product.category);
  if (categoryImage) return categoryImage;

  // Global fallback
  return '/defaults/cannabis-leaf.png';
}

// 2. Add upload UI for custom defaults
// /dashboard/settings/branding
// - "Default Product Image" upload
// - Preview with product grid
// - Save to tenants/{orgId}/branding/productDefault
```

**Testing:**
- [ ] Products without images show fallback
- [ ] Brand logos used when available
- [ ] Category defaults work
- [ ] Global default always works
- [ ] Custom upload works

**Time Estimate:** 3-4 hours
**Priority:** P2 (UX improvement)

---

#### 10. Add-to-Cart Animations
**File:** `src/components/add-to-cart-button.tsx`, `src/components/product-card.tsx`
**Issue:** No visual feedback on add-to-cart action
**Current State:**
- Button click adds to cart
- No animation
- No confirmation modal
- Cart icon doesn't animate

**Fix Required:**
```typescript
// Use Framer Motion for animations
import { motion, AnimatePresence } from 'framer-motion';

function AddToCartButton({ product }: { product: Product }) {
  const [added, setAdded] = useState(false);

  const handleClick = async () => {
    await addToCart(product);
    setAdded(true);

    // Trigger cart icon pulse
    triggerCartAnimation();

    // Reset after 2 seconds
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={handleClick}
    >
      <AnimatePresence mode="wait">
        {added ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <Check className="h-5 w-5 text-green-500" />
          </motion.div>
        ) : (
          <motion.div key="add">
            <ShoppingCart className="h-5 w-5" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

// Cart icon animation in header:
function CartIcon() {
  const [pulse, setPulse] = useState(false);

  // Listen for add-to-cart events
  useEffect(() => {
    const unsubscribe = cartStore.subscribe((state) => {
      if (state.items.length > prevCount) {
        setPulse(true);
        setTimeout(() => setPulse(false), 300);
      }
    });
    return unsubscribe;
  }, []);

  return (
    <motion.div
      animate={pulse ? { scale: [1, 1.2, 1] } : {}}
      transition={{ duration: 0.3 }}
    >
      <ShoppingCart />
      <Badge>{cartCount}</Badge>
    </motion.div>
  );
}
```

**Testing:**
- [ ] Button shows checkmark on add
- [ ] Cart icon pulses on add
- [ ] Animation smooth (60fps)
- [ ] Works on mobile
- [ ] Doesn't break accessibility

**Time Estimate:** 2-3 hours
**Priority:** P2 (UX improvement)

---

#### 11. Bundle Editor Enhancements
**File:** `src/components/dispensary/bundle-builder.tsx`
**Issue:** Missing product filtering, unit costs, price recommendations
**Current State:**
- Basic bundle builder exists
- No filtering
- No unit cost display
- No margin calculation

**Fix Required:**
```typescript
// Add filter panel
interface BundleFilters {
  category?: string[];
  brand?: string[];
  priceRange?: { min: number; max: number };
  thcRange?: { min: number; max: number };
  inStock?: boolean;
}

// Add to BundleBuilder:
function BundleBuilder() {
  const [filters, setFilters] = useState<BundleFilters>({});
  const [products, setProducts] = useState<Product[]>([]);

  // Fetch eligible products with filters
  const eligibleProducts = products
    .filter(p => !filters.category || filters.category.includes(p.category))
    .filter(p => !filters.brand || filters.brand.includes(p.brandName))
    .filter(p => !filters.priceRange || (
      p.price >= filters.priceRange.min &&
      p.price <= filters.priceRange.max
    ))
    .filter(p => !filters.inStock || p.stock > 0);

  // Calculate bundle pricing
  const selectedProducts = slots.filter(s => s !== null);
  const originalTotal = selectedProducts.reduce((sum, p) => sum + p.price, 0);
  const bundlePrice = deal.bundlePrice;
  const savings = originalTotal - bundlePrice;
  const margin = ((originalTotal - bundlePrice) / originalTotal) * 100;

  return (
    <div>
      {/* Filter Panel */}
      <FilterPanel filters={filters} onChange={setFilters} />

      {/* Product Grid with Unit Costs */}
      {eligibleProducts.map(product => (
        <ProductCard
          product={product}
          unitCost={product.price}
          bundleDiscount={savings / selectedProducts.length}
        />
      ))}

      {/* Pricing Summary */}
      <PricingSummary
        originalTotal={originalTotal}
        bundlePrice={bundlePrice}
        savings={savings}
        margin={margin}
        recommendation={
          margin < 10
            ? 'Low margin - consider increasing bundle price'
            : margin > 40
            ? 'High margin - could offer better deal'
            : 'Balanced pricing'
        }
      />
    </div>
  );
}
```

**Testing:**
- [ ] Filters work correctly
- [ ] Unit costs displayed
- [ ] Margin calculation accurate
- [ ] Price recommendations helpful
- [ ] Performance with 400+ products

**Time Estimate:** 6-8 hours
**Priority:** P2 (feature enhancement)

---

#### 12. Inventory Level Tracking & Low-Stock Alerts
**File:** `src/server/services/heartbeat/checks/dispensary.ts`
**Issue:** No real-time stock level indicators or low-stock warnings
**Current State:**
- ✅ Heartbeat check `low_stock` exists
- ❌ No UI indicators on product cards
- ❌ No brand-facing alerts

**Fix Required:**
```typescript
// 1. Add stock level badges to products
interface StockLevelBadge {
  level: 'high' | 'medium' | 'low' | 'out';
  color: string;
  text: string;
  threshold: number;
}

function getStockLevel(quantity: number, velocity: number): StockLevelBadge {
  const daysOfInventory = quantity / (velocity || 1);

  if (quantity === 0) {
    return { level: 'out', color: 'red', text: 'Out of Stock', threshold: 0 };
  } else if (daysOfInventory < 3) {
    return { level: 'low', color: 'orange', text: 'Low Stock', threshold: 3 };
  } else if (daysOfInventory < 7) {
    return { level: 'medium', color: 'yellow', text: 'Limited Stock', threshold: 7 };
  } else {
    return { level: 'high', color: 'green', text: 'In Stock', threshold: Infinity };
  }
}

// 2. Add to ProductCard component
<Badge variant={stockLevel.color}>
  {stockLevel.text}
</Badge>

// 3. Add brand-facing low-stock dashboard
// /dashboard/inventory/low-stock
// - Shows products with < 3 days of inventory
// - "Request Restock" button → Sends alert to dispensary
// - Historical stock-out data (days out of stock)
```

**Testing:**
- [ ] Stock badges appear on products
- [ ] Low stock alerts sent
- [ ] Brand dashboard shows accurate data
- [ ] Restock requests work
- [ ] Historical data tracks stock-outs

**Time Estimate:** 6-8 hours
**Priority:** P2 (operational improvement)

---

#### 13. Customer Email Capture Gap
**File:** Order flow, loyalty system
**Issue:** Many orders lack customer emails, blocking marketing
**Current State:**
- Orders from Alleaves POS may not include emails
- No email capture at store entry
- Loyalty system requires email

**Fix Required:**
```typescript
// 1. Add email field validation in checkout
// src/components/checkout/customer-info-form.tsx
function CustomerInfoForm() {
  return (
    <form>
      <Input
        type="email"
        required
        placeholder="Email (required for order updates)"
        validate={(email) => {
          if (!email.includes('@')) return 'Valid email required';
          return true;
        }}
      />
      <Checkbox>
        <label>
          I agree to receive order updates and promotional emails
        </label>
      </Checkbox>
    </form>
  );
}

// 2. Support loyalty tablet flow
// /loyalty-signup?location=thrive-syracuse
// - Displays on tablet at store entry
// - QR code for customers to scan
// - Captures: email, phone, birthday (optional)
// - Instant loyalty account creation
// - Associates with POS order if email matches

// 3. Backfill missing emails
// - Match phone numbers between orders and loyalty accounts
// - Show "Complete Profile" prompt in customer portal
// - Offer incentive (5% off) for adding email
```

**Testing:**
- [ ] Checkout requires email
- [ ] Loyalty tablet captures emails
- [ ] Order-email matching works
- [ ] Backfill process runs
- [ ] Marketing emails send successfully

**Time Estimate:** 8-10 hours
**Priority:** P2 (marketing enablement)

---

### Lower Priority (Post-Stabilization)

#### 14. Email Domain Warm-Up Infrastructure
**File:** `src/server/services/email-warmup.ts` (new)
**Issue:** Need automated 3-4 week domain warm-up before bulk campaigns
**Current State:**
- Email sending works via Mailjet
- No warm-up automation
- Gated by menu payment completion

**Fix Required:**
```typescript
// Automated warm-up schedule:
// Week 1: 50 emails/day
// Week 2: 200 emails/day
// Week 3: 500 emails/day
// Week 4: 1000+ emails/day

interface WarmUpSchedule {
  week: number;
  dailyLimit: number;
  recipientTypes: ('internal' | 'test' | 'engaged' | 'full')[];
}

async function executeWarmUp(schedule: WarmUpSchedule) {
  // Send to progressively larger segments
  // Monitor bounce rates, spam reports
  // Automatically adjust if issues detected
}

// Integration:
// - Starts when first payment received
// - Shows progress in CEO dashboard
// - Blocks bulk sends until complete
```

**Testing:**
- [ ] Warm-up schedule executes
- [ ] Daily limits enforced
- [ ] Bounce rates monitored
- [ ] Progress visible in UI
- [ ] Bulk sends blocked until complete

**Time Estimate:** 6-8 hours
**Priority:** P3 (marketing infrastructure)

---

#### 15. Loyalty Program Customization
**File:** `src/server/services/loyalty-sync.ts`
**Issue:** Need configurable loyalty thresholds and retention scoring
**Current State:**
- ✅ BakedBot native loyalty (not SpringBig)
- ❌ Hardcoded 5-purchase threshold
- ❌ No retention score tracking

**Fix Required:**
```typescript
// Add configurable thresholds
interface LoyaltyConfig {
  loyalThreshold: number; // Default: 5 purchases
  vipThreshold: number; // Default: 20 purchases
  retentionWindow: number; // Days since last purchase
  retentionScoreWeights: {
    frequency: number; // 0-1
    recency: number; // 0-1
    value: number; // 0-1
  };
}

// Calculate retention score
function calculateRetentionScore(customer: Customer): number {
  const frequency = customer.orderCount / 20; // Normalized to 20 orders
  const recency = 1 - (daysSinceLastOrder / 90); // 90 day window
  const value = customer.lifetimeValue / 500; // Normalized to $500

  return (
    frequency * weights.frequency +
    recency * weights.recency +
    value * weights.value
  ) * 100;
}

// Gamification elements:
// - Progress bars ("3 more orders to VIP!")
// - Badges (Early Adopter, Top Spender, etc.)
// - Leaderboard (opt-in, anonymous)
```

**Testing:**
- [ ] Custom thresholds work
- [ ] Retention scores accurate
- [ ] Gamification displays
- [ ] Opt-in privacy respected
- [ ] Leaderboard updates

**Time Estimate:** 8-10 hours
**Priority:** P3 (engagement feature)

---

#### 16. Segment Deduplication & Campaign Sync
**File:** `src/server/actions/segments.ts`, Craig agent
**Issue:** Customer segments are duplicative, not synced with campaigns
**Current State:**
- Multiple overlapping segments
- Manual campaign creation
- No auto-sync

**Fix Required:**
```typescript
// 1. Deduplicate segments
interface SegmentRule {
  conditions: Array<{
    field: string;
    operator: 'equals' | 'contains' | 'greater_than' | 'less_than';
    value: any;
  }>;
  priority: number; // Higher priority wins in case of overlap
}

async function deduplicateSegments() {
  // Find customers in multiple segments
  // Assign to highest-priority segment
  // Log changes for review
}

// 2. Auto-sync with campaigns
async function createCampaignFromSegment(segmentId: string) {
  const segment = await getSegment(segmentId);
  const customers = await getSegmentCustomers(segmentId);

  // Generate AI content via Craig
  const content = await generateCampaignContent({
    segment: segment.name,
    customerCount: customers.length,
    tone: 'personalized',
    goal: segment.campaignGoal
  });

  // Create campaign
  await createCampaign({
    name: `${segment.name} - ${new Date().toLocaleDateString()}`,
    segmentId,
    content,
    scheduledFor: segment.nextSendDate
  });
}
```

**Testing:**
- [ ] Deduplication runs successfully
- [ ] Segment priorities respected
- [ ] Campaign auto-creation works
- [ ] Content quality high
- [ ] Send scheduling accurate

**Time Estimate:** 8-10 hours
**Priority:** P3 (marketing automation)

---

## 📊 Summary & Deployment Plan

### Fix Order
1. **BUILD ERRORS** (2.5 hrs) - Dashon/Rishabh
2. **Bundle Editing** (6-8 hrs) - Dashon
3. **Dynamic Pricing UI** (4-6 hrs) - Rishabh
4. **Checkout Upsell** (2-3 hrs) - Dashon
5. **Order History** (4-6 hrs) - Rishabh
6. **Inventory Polling** (2 hrs quick fix) - Dashon
7. **Heartbeat Diagnostics** (8-10 hrs) - Rishabh
8. **Webhooks** (8-12 hrs) - Both (coordinate with Alleaves)
9. **Crawler Monitoring** (4-6 hrs) - Rishabh
10. **Medium Priority** - Schedule post-launch

### Time Estimates
- **Critical Path:** 25-34 hours
- **High Priority:** 20-28 hours
- **Medium Priority:** 25-33 hours
- **Lower Priority:** 22-28 hours

**Total:** 92-123 hours (11-15 days for 2 engineers)

### Testing Strategy
1. **Unit Tests:** Each fix requires tests
2. **Integration Tests:** Order flow, checkout flow, pricing flow
3. **E2E Tests:** Full customer journey (browse → cart → checkout → payment)
4. **Load Tests:** 100 concurrent users on menu
5. **Staging Deploy:** Test on `staging.bakedbot.ai` before production

### Deployment Phases
**Phase 1:** Build Fix + Critical Path (Week 1)
**Phase 2:** High Priority (Week 2)
**Phase 3:** Medium Priority (Week 3)
**Phase 4:** Lower Priority (Week 4+)

### Rollback Plan
- All changes behind feature flags
- Database migrations reversible
- POS sync can revert to polling
- Webhooks have manual fallback

---

## 🚀 Next Steps

1. **Dashon:** Fix build errors (debug routes + page props)
2. **Rishabh:** Fix build errors (competitive intel + delivery)
3. **Both:** Review plan, estimate accuracy
4. **Martez:** Approve priority order
5. **Team:** Daily standups to track progress
6. **QA:** Smoke tests after each fix

---

**Generated by Claude Code**
**Last Updated:** 2026-02-16
