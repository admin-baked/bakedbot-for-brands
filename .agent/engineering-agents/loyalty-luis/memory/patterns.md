# Loyalty Luis — Patterns & Gotchas

> Encoded from production bug fixes and source code audits. Read before touching loyalty sync, points, or segments.

---

## Critical Rules

### Rule 1: Loyalty-only enrollees MUST short-circuit to 'new' — not 'churned'

This was a production bug at Thrive Syracuse: 111 enrolled customers all showed as 'churned' because `daysSinceLastOrder` defaulted to 999 for customers with no order history.

```typescript
// ✅ CORRECT — short-circuit BEFORE any daysSince calculation
function calculateSegment(customer: CustomerProfile): CustomerSegment {
  // Loyalty-only enrollees: enrolled but never ordered yet
  if (customer.orderCount === 0 || !customer.lastOrderDate) {
    return 'new';  // will self-populate as orders come in
  }

  const daysSince = daysSinceOrder(customer.lastOrderDate);
  if (daysSince >= segmentThresholds.churned_minDays) return 'churned';
  if (daysSince >= segmentThresholds.atRisk_minDays) return 'at_risk';
  // ... etc
}

// ❌ WRONG — default daysSince causes all no-order customers to be 'churned'
function calculateSegment(customer: CustomerProfile): CustomerSegment {
  const daysSince = customer.lastOrderDate
    ? daysSinceOrder(customer.lastOrderDate)
    : 999;  // 999 > churned_minDays(90) → always 'churned'!
  if (daysSince >= 90) return 'churned';
}
```

---

### Rule 2: Spending index needs TWO keys — write BOTH, read BOTH

Alleaves in-store transactions have `customer.email = 'no-email@alleaves.local'`. If the spending index is only keyed by email, every in-store customer has no spending doc, so all their segments default to 'new'.

```typescript
// ✅ CORRECT — from deriveCustomerSpendingKeyFromAlleavesOrder()
// Write path: use real email when present, cid_ for in-store
const email = (ao.customer?.email || '').toLowerCase().trim();
if (email && !email.includes('@alleaves.local')) {
  return email;             // "jane@example.com"
}
const id = ao.id_customer?.toString().trim();
if (id) return `cid_${id}`;  // "cid_12345"
return null;                  // skip — no key

// ❌ WRONG — email-only
const key = ao.customer?.email?.toLowerCase();
// In-store orders: key = 'no-email@alleaves.local' → meaningless; all in-store = 'new'
```

**Read path must also try both keys:**

```typescript
// ✅ CORRECT — two-tier lookup
const spendingRef = db.collection(`tenants/${orgId}/customer_spending`);

// Tier 1a: try email key
const emailDoc = await spendingRef.doc(customer.email.toLowerCase()).get();
if (emailDoc.exists) return emailDoc.data();

// Tier 1b: try cid_ key
if (customer.alleavesId) {
  const cidDoc = await spendingRef.doc(`cid_${customer.alleavesId}`).get();
  if (cidDoc.exists) return cidDoc.data();
}

// Tier 2: live orders fallback (only if index not yet built)
return await computeSpendingFromOrders(orgId, customer.id, 8000 /* 8s timeout */);
```

---

### Rule 3: Tier thresholds use `>=`, not `>`

Customers at exactly 200 points ARE Silver tier. Off-by-one sends them to the wrong tier and the wrong campaign audience.

```typescript
// ✅ CORRECT — inclusive thresholds (from DEFAULT_LOYALTY_SETTINGS)
// Bronze: threshold = 0  → points >= 0  (always true)
// Silver: threshold = 200 → points >= 200
// Gold:   threshold = 500 → points >= 500
// Platinum: threshold = 1000 → points >= 1000

const newTier =
  points >= 1000 ? 'platinum' :
  points >= 500  ? 'gold'     :
  points >= 200  ? 'silver'   : 'bronze';

// ❌ WRONG — exclusive thresholds
const newTier =
  points > 1000 ? 'platinum' :
  points > 500  ? 'gold'     :
  points > 200  ? 'silver'   : 'bronze';
// Customer with exactly 200 pts stays Bronze, blocks Silver campaigns
```

---

### Rule 4: Equity bonus applies at EARNING time, not redemption

The `equityMultiplier` (1.2x) multiplies how many points a customer earns per transaction. It never inflates the redemption discount value.

```typescript
// ✅ CORRECT — equity applied when recording earned points
function calculateEarnedPoints(
  orderTotal: number,
  tier: LoyaltyTier,
  equityStatus: boolean,
  settings: LoyaltySettings,
): number {
  const base = Math.floor(orderTotal * settings.pointsPerDollar);
  const withTier = Math.floor(base * tier.multiplier);
  const withEquity = equityStatus
    ? Math.floor(withTier * settings.equityMultiplier)
    : withTier;
  return withEquity;
}

// ❌ WRONG — equity applied at redemption (inflates discount)
function calculateRedemptionValue(
  pointsRedeemed: number,
  equityStatus: boolean,
  settings: LoyaltySettings,
): number {
  const tier = getRedemptionTier(pointsRedeemed, settings.redemptionTiers);
  return tier.rewardValue * (equityStatus ? settings.equityMultiplier : 1);
  // WRONG: 100pts → $5 becomes $6 for equity customers
}
```

---

### Rule 5: `computeAndPersistSpending()` uses full-replacement writes, not merge

Spending summaries are always recomputed from complete history each sync run. Using `merge: true` would accumulate duplicate data across sync runs.

```typescript
// ✅ CORRECT — batch.set() without merge (full replacement)
batch.set(docRef, {
  totalSpent: s.totalSpent,
  orderCount: s.orderCount,
  avgOrderValue: s.orderCount > 0 ? s.totalSpent / s.orderCount : 0,
  lastOrderDate: Timestamp.fromDate(s.lastOrderDate),
  firstOrderDate: Timestamp.fromDate(s.firstOrderDate),
  updatedAt: Timestamp.now(),
});

// ❌ WRONG — merge: true would double-count on re-sync
batch.set(docRef, spendingData, { merge: true });
// Re-run of same orders: totalSpent doubles, orderCount doubles
```

---

### Rule 6: Batch writes cap at 400 per batch — Firestore hard limit is 500

```typescript
// ✅ CORRECT — from computeAndPersistSpending() in pos-sync-service.ts
const BATCH_SIZE = 400;  // 100 below Firestore's 500-document limit
let batch = firestore.batch();
let count = 0;

for (const [key, data] of spending) {
  const docRef = spendingRef.doc(key);
  batch.set(docRef, data);
  count++;

  if (count % BATCH_SIZE === 0) {
    await batch.commit();
    batch = firestore.batch();  // fresh batch
  }
}

// Commit remaining (if total isn't a clean multiple of 400)
if (count % BATCH_SIZE !== 0) {
  await batch.commit();
}

// ❌ WRONG — one batch for all
const batch = firestore.batch();
for (const [key, data] of spending) {
  batch.set(spendingRef.doc(key), data);
}
await batch.commit();  // throws if > 500 documents
```

---

### Rule 7: `pointsLastCalculated: null` is NOT a bug — show "Sync Now", not an error

First-time setup state. Normal for new orgs before the first loyalty sync runs.

```typescript
// ✅ CORRECT — show sync prompt in UI
function LoyaltySyncStatus({ customer }: { customer: CustomerProfile }) {
  if (!customer.pointsLastCalculated) {
    return (
      <Alert variant="info">
        Loyalty sync hasn't run yet.
        <Button onClick={() => triggerLoyaltySync()}>Sync Now</Button>
      </Alert>
    );
  }
  return <span>Last synced: {formatDate(customer.pointsLastCalculated)}</span>;
}

// ❌ WRONG — treating null as an error
if (!customer.pointsLastCalculated) {
  throw new Error('Loyalty sync failed — pointsLastCalculated is null');
}
```

---

### Rule 8: Redemption MUST use Firestore transaction — never a simple update

Redemption deducts points atomically. A simple `update()` has a TOCTOU race condition where a customer can redeem the same points twice if two requests hit simultaneously.

```typescript
// ✅ CORRECT — Firestore transaction (from LoyaltyRedemptionService)
await firestore.runTransaction(async (transaction) => {
  const customerRef = firestore.collection('customers').doc(`${orgId}_${customerId}`);
  const customerDoc = await transaction.get(customerRef);

  if (!customerDoc.exists) throw new Error('Customer not found');

  const currentPoints = customerDoc.data()!.points || 0;
  if (currentPoints < pointsToRedeem) throw new Error('Insufficient points');

  // Atomic deduction inside transaction
  transaction.update(customerRef, {
    points: currentPoints - pointsToRedeem,
    updatedAt: new Date(),
  });

  // Redemption history record also inside same transaction
  const historyRef = firestore.collection('redemptions').doc();
  transaction.set(historyRef, { customerId, orgId, pointsRedeemed, dollarValue, orderId, ...});
});

// ❌ WRONG — read then update (race condition)
const doc = await customerRef.get();
const currentPoints = doc.data()!.points;
if (currentPoints < pointsToRedeem) return error;
await customerRef.update({ points: currentPoints - pointsToRedeem });
// Two simultaneous requests can both pass the check and both deduct
```

---

### Rule 9: `getLoyaltySettings()` merges with defaults — new tier config fields always present

When the code adds new fields to `DEFAULT_LOYALTY_SETTINGS`, orgs that haven't explicitly saved settings still get them.

```typescript
// ✅ CORRECT — merge saves with defaults
const merged: LoyaltySettings = {
  ...DEFAULT_LOYALTY_SETTINGS,     // all defaults
  ...saved,                         // override with saved values
  tiers: saved.tiers?.length        // don't use empty [] override
    ? saved.tiers
    : DEFAULT_LOYALTY_SETTINGS.tiers,
  redemptionTiers: saved.redemptionTiers?.length
    ? saved.redemptionTiers
    : DEFAULT_LOYALTY_SETTINGS.redemptionTiers,
  segmentThresholds: {
    ...DEFAULT_LOYALTY_SETTINGS.segmentThresholds!,
    ...(saved.segmentThresholds || {}),
  },
};

// ❌ WRONG — return only what's in Firestore
const saved = doc.data() as LoyaltySettings;
return saved;  // missing new fields added to default after org was created
```

---

## Common Mistakes

| Symptom | Root Cause | Fix |
|---------|-----------|-----|
| All loyalty enrollees show 'churned' | `daysSinceLastOrder = 999` default for no-order customers | Short-circuit: `if (orderCount === 0 \|\| !lastOrderDate) return 'new'` |
| All in-store Alleaves customers show 'new' | Spending index email-only; in-store orders have placeholder email | Add `cid_{id}` key to spending index via `deriveCustomerSpendingKeyFromAlleavesOrder()` |
| Customer with 200 pts still shown as Bronze | `>` instead of `>=` in tier threshold comparison | Use `>=` in all tier threshold checks |
| Equity customers get inflated redemption value | `equityMultiplier` applied at redemption | Only apply equity bonus when calculating points earned per order |
| Double redemption possible in high traffic | Simple `update()` for point deduction | Use Firestore `runTransaction()` |
| `pointsLastCalculated: null` shows as error | Null treated as failure state | Show "Sync Now" prompt — it's normal pre-first-sync state |
| Spending index doubles on re-sync | `merge: true` on `batch.set()` | Remove `merge: true` — full replacement is correct |
| 111 enrollees all in 'new' segment (not a bug) | They genuinely have no order history yet | Expected — will advance to other segments as orders come in |
| Alpine IQ points differ from BakedBot | Reconciliation discrepancy > 10% | Check reconciliation result + `loyaltyDiscrepancy` field; manual review needed |
| Batch write fails for large org | > 500 documents in single batch | Cap at `BATCH_SIZE = 400`; flush and start new batch when count hits limit |

---

## Old Bug Reference: The 500-Customer Threshold

A now-removed code path in `getCustomersFromAlleaves` had a guard:

```typescript
// ❌ DELETED — this was the 500-customer threshold bug
if (alleavesCustomers.length < 500) {
  // Only compute spending for small orgs
  await computeSpending(customers, orders);
}
// Thrive has 3,000+ customers → always skipped → segments always 'churned'
```

This has been removed. The spending computation now always runs. Do NOT re-add any size threshold guard.

---

## Diagnosing Loyalty Issues

Check in this order:

1. **Is `pointsLastCalculated` populated?** — If null, first sync hasn't run. Trigger manually.
2. **Is `customer_spending` index populated?** — Check `tenants/{orgId}/customer_spending/` in Firestore. If empty, run `POST /api/cron/pos-sync?orgId={orgId}`.
3. **Are there both email and cid_ keys?** — Check for both `customer@email.com` and `cid_12345` in spending index.
4. **Is Alpine IQ reconciled?** — Check `customer.loyaltyReconciled` and `loyaltyDiscrepancy` fields.
5. **Are tier thresholds using `>=`?** — Search for hardcoded comparisons in tier advancement code.
6. **Does `calculateSegment()` short-circuit at `orderCount === 0`?** — Check the first lines of the segment function.

---

## Thrive Syracuse Live Config (Quick Reference)

```
Org: org_thrive_syracuse
POS: Alleaves (locationId: 1000)

Loyalty tiers:
  Bronze:   threshold ≥ 0,    1.0x multiplier
  Silver:   threshold ≥ 200,  1.25x multiplier
  Gold:     threshold ≥ 500,  1.5x multiplier
  Platinum: threshold ≥ 1000, 2.0x multiplier

Equity multiplier: 1.2x (applied at earning, NOT redemption)

Redemption thresholds (exact only):
  100 pts → $5 off
  250 pts → $15 off
  500 pts → $35 off

Cron: Daily loyalty-sync at 2 AM UTC
Status: 111 customers enrolled, loyalty sync needs first run on fresh installs
```

---

*Patterns version: 2.0 | Updated: 2026-02-26 | Based on actual source code audit*
