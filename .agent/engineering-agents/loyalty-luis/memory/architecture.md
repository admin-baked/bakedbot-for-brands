# Loyalty Luis — System Architecture

> Encoded from actual source code. Read before touching loyalty sync, points, tiers, or segments.

---

## Key Files Table

| File | Lines | What It Does |
|------|-------|--------------|
| `src/types/customers.ts` | 270+ | `LoyaltySettings`, `LoyaltyTier`, `RedemptionTier`, `SegmentThresholds`, `DEFAULT_LOYALTY_SETTINGS`, `CustomerSegment` |
| `src/server/actions/loyalty-settings.ts` | — | `getLoyaltySettings()`, `updateLoyaltySettings()`, `getPublicMenuSettings()` |
| `src/server/services/loyalty-sync.ts` | — | `LoyaltySyncService` — Alpine IQ reconciliation, tier advancement, batch processing |
| `src/server/services/loyalty-redemption.ts` | — | `LoyaltyRedemptionService` — atomic point deduction via Firestore transactions |
| `src/server/services/pos-sync-service.ts` | 400+ | `computeAndPersistSpending()`, `deriveCustomerSpendingKeyFromAlleavesOrder()` |
| `src/app/api/cron/loyalty-sync/route.ts` | — | Daily sync cron (2 AM UTC, POST only, CRON_SECRET auth) |
| `src/app/dashboard/loyalty/` | dir | Loyalty dashboard UI (tiers, settings, campaigns, sync status) |
| `src/app/dashboard/loyalty/actions.ts` | 76 | Mock settings + campaigns (MVP — will be replaced with Firestore reads) |
| `src/components/demo/menu-info-bar.tsx` | — | Public menu loyalty/discount bar (shared with Brand Pages Willie) |

---

## 1. Spending Index Architecture (Written by Sync Sam, Read by Luis)

The spending index is the shared data layer between POS sync and loyalty. It lives at:

```
tenants/{orgId}/customer_spending/{key}
  totalSpent: number
  orderCount: number
  avgOrderValue: number
  lastOrderDate: Timestamp
  firstOrderDate: Timestamp
  updatedAt: Timestamp
```

### Key Derivation Logic (from `deriveCustomerSpendingKeyFromAlleavesOrder()`)

```typescript
// pos-sync-service.ts
export function deriveCustomerSpendingKeyFromAlleavesOrder(ao: any): string | null {
  const email = (ao.customer?.email || ao.email || ao.customer_email || '')
    .toLowerCase().trim();

  // Prefer real email when available
  if (email && !email.includes('@alleaves.local')) {
    return email;  // e.g. "customer@example.com"
  }

  // In-store orders: use cid_ prefix + Alleaves customer ID
  const customerId = (ao.id_customer || ao.customer?.id)?.toString().trim();
  if (customerId) {
    return `cid_${customerId}`;  // e.g. "cid_12345"
  }

  return null;  // skip this order — no usable key
}
```

### Why Two Keys Are Required

```
Online order (with email):
  → customer_spending/jane@example.com

In-store Alleaves order (no email — placeholder):
  ao.customer.email = 'no-email@alleaves.local'
  ao.id_customer = '12345'
  → customer_spending/cid_12345

If ONLY email-keyed:
  → cid_ customers get NO spending doc
  → Tier 1 lookup finds nothing
  → Tier 2 fallback (live query) fires
  → All in-store customers show $0 spent → 'new' segment
```

---

## 2. `computeAndPersistSpending()` — Full Implementation

Called after every POS order sync. Takes raw Alleaves orders (in-memory, no extra API call):

```typescript
// pos-sync-service.ts ~line 237
async function computeAndPersistSpending(
  firestore: Firestore,
  orgId: string,
  orders: any[]   // raw Alleaves orders from same sync run
): Promise<void>

// Algorithm:
// 1. O(N) aggregation in memory — one pass over all orders
//    → Map<key, { totalSpent, orderCount, lastOrderDate, firstOrderDate }>
// 2. Batch-write to Firestore (full replacement, NOT merge)
//    → Each doc: batch.set(docRef, data) — no merge flag
//    → Summaries always recomputed from complete history
//    → BATCH_SIZE = 400 (Firestore limit is 500; 400 gives safety margin)
// 3. Logs: customersIndexed + ordersProcessed
```

**Full replacement semantics are intentional** — if a customer has 10 orders in history, all 10 contribute. Using `merge: true` would accumulate incorrectly on re-syncs.

---

## 3. Two-Tier Spending Lookup (Reading the Index)

When loading customer spending data for segment calculation:

```
Tier 1 (instant, O(1)):
  → Read tenants/{orgId}/customer_spending/{email}     ← try email key first
  → If not found: read tenants/{orgId}/customer_spending/cid_{id} ← try cid_ key
  → If found: return spending data immediately (no query)

Tier 2 (slow path, 8s timeout fallback):
  → Only runs when Tier 1 finds nothing (index hasn't been built yet)
  → Query orders collection directly: where('orgId', '==').where('customerId', '==')
  → Field projection (minimal data fetch)
  → Returns aggregate spending from raw orders
  → Once pos-sync cron runs and builds the index, Tier 2 no longer fires
```

Tier 1 is the steady-state path. Tier 2 only runs on first deployment before the cron has populated the index.

---

## 4. Tier System — Default Configuration

From `DEFAULT_LOYALTY_SETTINGS` in `src/types/customers.ts`:

```
Bronze:   threshold ≥ 0    (1.0x multiplier)  → default for all new customers
Silver:   threshold ≥ 200  (1.25x multiplier) → "Early access to deals"
Gold:     threshold ≥ 500  (1.5x multiplier)  → "Birthday bonus, Free delivery"
Platinum: threshold ≥ 1000 (2.0x multiplier)  → "VIP events, Exclusive products"

equityMultiplier: 1.2  → applied at point EARNING time, not redemption
pointsPerDollar: 1     → $1 spent = 1 base point
```

Thrive Syracuse live config matches these defaults (confirmed from MEMORY.md: Bronze/Silver/Gold/Platinum, 1.0x–2.0x).

### Points Calculation Formula

```
basePoints = Math.floor(orderTotal * pointsPerDollar)
tierMultiplier = customer.tier.pointsMultiplier  (1.0/1.25/1.5/2.0)
equityBonus = customer.equityStatus ? settings.equityMultiplier : 1.0

finalPoints = Math.floor(basePoints × tierMultiplier × equityBonus)

Example (Platinum, equity-qualified, $50 order):
  basePoints = floor(50 × 1) = 50
  × 2.0 (Platinum) = 100
  × 1.2 (equity) = 120
  finalPoints = 120
```

---

## 5. Redemption Tiers — Exact Thresholds Only

```typescript
// DEFAULT_LOYALTY_SETTINGS.redemptionTiers:
{ id: 'small',  pointsCost: 100, rewardValue: 5,  description: '$5 off your order'  }
{ id: 'medium', pointsCost: 250, rewardValue: 15, description: '$15 off your order' }
{ id: 'large',  pointsCost: 500, rewardValue: 35, description: '$35 off your order' }
```

Rules:
- Customers can ONLY redeem at exact thresholds (100, 250, or 500)
- Cannot redeem 150 points for some partial value between thresholds
- Redemption uses Firestore **transaction** (atomic deduction — prevents double-redemption)
- Equity multiplier does NOT apply to redemption value (only to earning)
- Minimum redemption = lowest threshold the customer qualifies for

---

## 6. Customer Segment Thresholds

```typescript
// DEFAULT_LOYALTY_SETTINGS.segmentThresholds:
loyal_minOrders: 2         // orderCount >= 2 to be 'loyal'
vip_minLifetimeValue: 500  // totalSpent >= $500
vip_minOrders: 8           // orderCount >= 8
vip_minAOV: 50             // avgOrderValue >= $50
highValue_minAOV: 75       // avgOrderValue >= $75
highValue_maxOrders: 5     // orderCount <= 5 (high value, low frequency)
frequent_minOrders: 5      // orderCount >= 5
frequent_maxAOV: 60        // avgOrderValue <= $60 (frequent, lower basket)
slipping_minDays: 30       // daysSinceLastOrder >= 30
atRisk_minDays: 60         // daysSinceLastOrder >= 60
churned_minDays: 90        // daysSinceLastOrder >= 90
new_maxDays: 30            // daysSinceFirstOrder <= 30
```

### Special Case: Loyalty-Only Enrollees

```typescript
// CRITICAL: Must short-circuit before any daysSince calculation
function calculateSegment(customer: CustomerProfile): CustomerSegment {
  // Loyalty-only enrollees: enrolled but no purchase history yet
  if (customer.orderCount === 0 || !customer.lastOrderDate) {
    return 'new';  // NOT churned — daysSinceLastOrder would default to 999 without this
  }

  const daysSince = daysSinceOrder(customer.lastOrderDate);
  if (daysSince >= segmentThresholds.churned_minDays) return 'churned';
  if (daysSince >= segmentThresholds.atRisk_minDays) return 'at_risk';
  if (daysSince >= segmentThresholds.slipping_minDays) return 'slipping';
  // ... etc
}
```

This short-circuit was added to fix Thrive's production bug where 111 enrolled customers
(with `orderCount: 0`) all showed as 'churned' in segments.

---

## 7. LoyaltySyncService — Alpine IQ Reconciliation

```typescript
// loyalty-sync.ts
export class LoyaltySyncService {
  private readonly DISCREPANCY_THRESHOLD = 0.10; // 10% tolerance
  private readonly BATCH_SIZE = 50;              // Process 50 customers at a time

  async syncCustomer(customerId, orgId, loyaltySettings):
    1. Fetch customer from Alleaves
    2. Fetch customer orders from Alleaves (for calculated points)
    3. Calculate points from order history (BakedBot native calculation)
    4. Try to fetch Alpine IQ data (optional — graceful failure)
    5. Reconcile:
       - If |calculated - alpine| / alpine > 10% → action: 'alert_admin'
       - Otherwise: reconciled = true, discrepancy = 0
    6. Update Firestore customer doc:
       - pointsFromOrders: calculated
       - pointsFromAlpine: alpine (if available)
       - loyaltyReconciled: true/false
       - loyaltyDiscrepancy: difference
       - pointsLastCalculated: now
       - tier: newTier (based on points)
       - tierUpdatedAt: now (if tier changed)
}
```

### What `pointsLastCalculated: null` Means

```typescript
// NOT a bug — initial state before first sync run
// UI should show "not yet synced" message, not an error

// ✅ CORRECT UI handling:
if (!customer.pointsLastCalculated) {
  return (
    <Alert>
      Loyalty sync hasn't run yet.
      <Button onClick={() => triggerSync()}>Sync Now</Button>
    </Alert>
  );
}

// Manual trigger: POST /api/cron/loyalty-sync (with CRON_SECRET)
// Automatic: nightly cron 2 AM UTC
```

---

## 8. Loyalty Sync Cron

```
POST /api/cron/loyalty-sync
  Schedule: 0 2 * * * (2 AM UTC daily)
  Auth: Bearer CRON_SECRET
  Returns: { success, processed, errors, duration }

Steps per org:
  1. Verify CRON_SECRET in Authorization header
  2. Query all orgs from tenants collection
  3. For each org: load LoyaltySettings (or use DEFAULT_LOYALTY_SETTINGS)
  4. LoyaltySyncService.syncBatch(customers, orgId, settings)
     → Process 50 customers at a time
     → For each: calculate points + reconcile Alpine IQ + advance tier
  5. computeAndPersistSpending() (refreshes spending index if orders changed)
  6. Log results per org
```

Note: The loyalty-sync cron uses **POST only** (not GET+POST dual pattern) — it's Cloud Scheduler only, no manual GET.

---

## 9. Loyalty Settings Storage

```
tenants/{orgId}/settings/loyalty
  pointsPerDollar: number
  equityMultiplier: number        (default: 1.2)
  tiers: LoyaltyTier[]
    id, name, threshold, color, benefits[]
  redemptionTiers: RedemptionTier[]
    id, pointsCost, rewardValue, description
  segmentThresholds: SegmentThresholds
    loyal_minOrders, vip_minLifetimeValue, vip_minOrders, ...
  discountPrograms: DiscountProgram[]
    id, enabled, name, description, icon
  menuDisplay: LoyaltyMenuDisplay
    showBar, loyaltyTagline, showDiscountPrograms, showDeliveryInfo
    deliveryMinimum, deliveryFee, deliveryRadius, showDriveThru
  enableGamification: boolean
```

`getLoyaltySettings(orgId)` merges saved data with `DEFAULT_LOYALTY_SETTINGS` — new fields added to the default type are always present even for orgs that haven't explicitly saved them.

`getPublicMenuSettings(orgId)` — unauthenticated version, returns only menu-display-relevant fields. Called from public menu pages.

---

## 10. Alpine IQ Integration

Alpine IQ is an external loyalty platform used by some dispensary chains. BakedBot operates as a **hybrid system**:

```
Points calculation flow:
  1. BakedBot calculates points natively from Alleaves order history
     → pointsFromOrders (source: 'orders')
  2. Alpine IQ queried for authoritative point balance
     → pointsFromAlpine (source: 'alpine_iq')
  3. If Alpine data available and discrepancy < 10%:
     → Use Alpine as source of truth (tierSource: 'alpine_iq')
  4. If discrepancy >= 10%:
     → Alert admin (action: 'alert_admin')
     → Don't auto-correct — requires manual review
  5. If Alpine unavailable:
     → Use BakedBot calculated points (graceful degradation)
     → tierSource: 'calculated'

Alpine IQ user code: customer.alpineUserId (from Alleaves id_customer field)
Client: src/server/integrations/alpine-iq/client.ts (AlpineIQClient)
```

---

## 11. Firestore Schema (Customer Loyalty Fields)

```
customers/{orgId_customerId}                    ← doc ID is orgId + "_" + customerId
  points: number                                ← current balance
  lifetimeValue: number                         ← total spent
  tier: 'bronze'|'silver'|'gold'|'platinum'
  tierProgress?: number                         ← 0-100 % to next tier
  pointsFromOrders?: number                     ← BakedBot-calculated
  pointsFromAlpine?: number                     ← Alpine IQ source of truth
  pointsLastCalculated?: Date                   ← null = first sync not yet run
  tierSource?: 'calculated'|'alpine_iq'
  loyaltyReconciled?: boolean
  loyaltyDiscrepancy?: number
  alpineUserId?: string
  equityStatus?: boolean                        ← qualifies for 1.2x equity bonus

tenants/{orgId}/customer_spending/{key}         ← key = email or cid_{id}
  totalSpent: number
  orderCount: number
  avgOrderValue: number
  lastOrderDate: Timestamp
  firstOrderDate: Timestamp
  updatedAt: Timestamp

tenants/{orgId}/settings/loyalty                ← per-org loyalty config
  (see section 9 above)
```

---

*Architecture version: 2.0 | Updated: 2026-02-26 | Based on actual source code audit*
