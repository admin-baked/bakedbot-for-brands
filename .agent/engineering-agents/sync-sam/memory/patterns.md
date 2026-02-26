# Sync Sam — Patterns & Gotchas

> Encoded knowledge from hard-won debugging. Read before touching sync code.

---

## Critical Rules

### Rule 1: Never use email as sole match key
Alleaves in-store POS customers always have `customer.email = 'no-email@alleaves.local'`. Using email alone silently fails to match them → ghost 'new' segments.

**Always build both maps:**
```typescript
const emailToIdMap: Record<string, string> = {};
const alleavesIdToCustomerIdMap: Record<string, string> = {};

for (const customer of customers) {
  if (customer.email && customer.email !== 'no-email@alleaves.local') {
    emailToIdMap[customer.email.toLowerCase()] = customer.id;
  }
  if (customer.alleavesId) {
    alleavesIdToCustomerIdMap[customer.alleavesId] = customer.id;
  }
}
```

**Order merge must try both:**
```typescript
const email = order.customer?.email?.toLowerCase();
const alleavesId = order.userId?.replace('{', '').replace('}', '');
const isPlaceholderEmail = email === 'no-email@alleaves.local';

const customerId = isPlaceholderEmail
  ? alleavesIdToCustomerIdMap[alleavesId ?? '']
  : emailToIdMap[email ?? ''];

if (!customerId && isPlaceholderEmail) {
  // No matching customer found, skip this order
  continue;
}
```

---

### Rule 2: Spending index uses TWO keys
Every write to `customer_spending` must write BOTH `email` (lowercase) AND `cid_{id_customer}`:

```typescript
// ✅ CORRECT — two keys per customer
const docs: Record<string, SpendingData> = {};
for (const [email, data] of Object.entries(byEmail)) {
  docs[email] = data;
}
for (const [cidKey, data] of Object.entries(byCid)) {
  docs[cidKey] = data;  // key format: cid_12345
}
await batchWrite(orgId, 'customer_spending', docs);
```

Every READ from `customer_spending` must try BOTH:
```typescript
// Tier 1 spending lookup — try email first, then cid_ key
const emailDoc = await spendingRef.doc(email.toLowerCase()).get();
if (emailDoc.exists) return emailDoc.data() as SpendingData;

const cidKey = `cid_${customer.id_customer}`;
const cidDoc = await spendingRef.doc(cidKey).get();
if (cidDoc.exists) return cidDoc.data() as SpendingData;

// Tier 2: live orders fallback
```

---

### Rule 3: Firestore multi-field inequality — filter in memory
**NEVER** combine `status != X` with a date range filter on a DIFFERENT field in one Firestore query.
This silently returns wrong or empty results depending on SDK version.

```typescript
// ❌ BROKEN — multi-field inequality on different fields
db.collection('orders')
  .where('status', '!=', 'cancelled')      // inequality on 'status'
  .where('startAt', '>=', startOfDay)      // range on 'startAt' — SILENTLY FAILS

// ✅ CORRECT — filter secondary condition in memory
const orders = await db.collection('orders')
  .where('startAt', '>=', startOfDay)
  .where('startAt', '<', endOfDay)
  .get();

const activeOrders = orders.docs
  .map(d => d.data())
  .filter(o => o.status !== 'cancelled');  // in-memory filter
```

---

### Rule 4: Alleaves inventory is POST, not GET
```typescript
// ❌ WRONG
const response = await fetch(`${baseUrl}/inventory`, { method: 'GET' });

// ✅ CORRECT
const response = await fetch(`${baseUrl}/inventory/search`, {
  method: 'POST',
  body: JSON.stringify({ query: '' }),
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
});
```

---

### Rule 5: Loyalty-only enrollees must short-circuit to 'new'
Customers who enrolled in loyalty but have no POS order history will have:
- `orderCount: 0`
- `lastOrderDate: undefined`

Without a short-circuit, `daysSinceLastOrder` defaults to 999 → they get classified as 'churned'.

```typescript
export function calculateSegment(customer: Customer): CustomerSegment {
  const { orderCount, lastOrderDate, totalSpent } = customer;

  // SHORT-CIRCUIT: loyalty-only enrollees with no order history
  if (orderCount === 0 && !lastOrderDate) {
    return 'new';
  }

  // ... rest of segment logic
}
```

---

### Rule 6: Batch writes cap at 400 per batch
Firestore batch writes have a 500-document limit. Keep batches at 400 to stay safe.

```typescript
const BATCH_SIZE = 400;
const chunks = chunkArray(items, BATCH_SIZE);

for (const chunk of chunks) {
  const batch = db.batch();
  for (const item of chunk) {
    batch.set(ref.doc(item.id), item);
  }
  await batch.commit();
}
```

---

## Common Mistakes

| Symptom | Root Cause | Fix |
|---------|-----------|-----|
| All POS customers show as 'new' segment | Email matching only; Alleaves in-store orders have placeholder email | Build `alleavesIdToCustomerIdMap`, try userId fallback |
| `customer_spending` index empty after sync | Only keyed by email; placeholder email customers have no email key | Also write `cid_{id_customer}` key |
| All loyalty enrollees show as 'churned' | `daysSinceLastOrder = 999` default for no lastOrderDate | Short-circuit: `if (orderCount === 0 && !lastOrderDate) return 'new'` |
| `getBookingsForDate` returns empty | Multi-field Firestore inequality on `status` + `startAt` | Remove status filter from query, filter in memory |
| Alleaves auth fails | Wrong endpoint or PIN concatenated with password | Use `POST /api/auth` with PIN as separate field |
| Menu not updating after POS sync | `syncOrgPOSData` wasn't calling `syncPOSProducts` | POS sync must call all 3: customers, orders, products |
| Ghost customer records | Orders with placeholder email AND no userId match being written | SKIP orders where email is placeholder AND no userId match |
| Segment query returns wrong counts | `getCustomersFromAlleaves` spending lookup only tried email | Check both email AND `cid_` key in Tier 1 lookup |

---

## Patterns

### Adding a new sync stage

1. Add to `syncOrgPOSData()` in `pos-sync-service.ts` as a non-fatal try/catch block:
```typescript
try {
  const result = await syncNewThing(locationId, orgId);
  syncResult.newThingCount = result.count;
} catch (err) {
  logger.error(`[pos-sync] new thing sync failed: ${String(err)}`);
  // non-fatal — other stages continue
}
```

2. Add the count to `SyncResult` interface
3. Update `sync_status` doc to include the new count field
4. Add a cron endpoint if this needs independent scheduling

---

### Diagnosing segment issues

When segments look wrong, check in this order:

1. **Is there a spending index?** Check `tenants/{orgId}/customer_spending/` — if empty, sync hasn't populated it yet
2. **Are orders matching?** Check `tenants/{orgId}/orders/` — look for `customerId` field on orders; if null, email match failed
3. **Is the spending lookup using both keys?** Add debug log to `getCustomersFromAlleaves` to see which path hits
4. **Is the segmentation function short-circuiting loyalty enrollees?** Check `calculateSegment()` — `orderCount === 0 && !lastOrderDate` must return 'new'
5. **Run a manual sync** via `POST /api/cron/pos-sync?orgId={orgId}` to refresh data

---

### Reading Alleaves credentials

```bash
# Alleaves credentials live in GCP Secret Manager
gcloud secrets versions access latest --secret=ALLEAVES_PASSWORD --project=studio-567050101-bc6e8
gcloud secrets versions access latest --secret=ALLEAVES_PIN --project=studio-567050101-bc6e8
gcloud secrets versions access latest --secret=ALLEAVES_USERNAME --project=studio-567050101-bc6e8
gcloud secrets versions access latest --secret=ALLEAVES_LOCATION_ID --project=studio-567050101-bc6e8
# PIN is SEPARATE from password — do NOT concatenate
```

---

## Alleaves API Quick Reference

```
POST /api/auth
  body: { username, password, pin }  ← pin is separate field
  returns: { token, locationId }

GET /api/customers?locationId={id}&page={n}&pageSize=100
  returns: paginated customer list

GET /api/orders?locationId={id}&startDate={date}&endDate={date}
  returns: paginated order list

POST /inventory/search
  body: { query: '' }
  headers: Authorization Bearer {token}
  returns: full active inventory list
```

---

*Patterns version: 1.0 | Created: 2026-02-26*
