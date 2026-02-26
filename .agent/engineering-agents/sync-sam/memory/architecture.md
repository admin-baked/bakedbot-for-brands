# Sync Sam — System Architecture

---

## POS Sync Pipeline (Full Detail)

```
Cloud Scheduler → POST /api/cron/pos-sync (every 30 min)
  → CRON_SECRET auth check
  → findSyncablOrgs() — orgs with active POS connections
  → for each org: syncOrgPOSData(orgId)

syncOrgPOSData(orgId)
  ├── 1. Alleaves auth: POST /api/auth → JWT token (15-min TTL)
  ├── 2. syncPOSCustomers(locationId, orgId)
  │       GET /api/customers?locationId=X (paginated, all pages)
  │       For each customer:
  │         upsert tenants/{orgId}/customers/{alleaves_customer_id}
  │         build emailToIdMap: email → BakedBot customer.id
  │         build alleavesIdToCustomerIdMap: alleaves_userId → BakedBot customer.id
  │       Batch writes (400 docs/batch)
  │
  ├── 3. syncPOSOrders(locationId, orgId, emailToIdMap, alleavesIdToCustomerIdMap)
  │       GET /api/orders?locationId=X&startDate=90daysAgo (paginated)
  │       For each order:
  │         customer = emailToIdMap[order.customer.email]
  │         if (!customer && order.customer.email === 'no-email@alleaves.local'):
  │           customer = alleavesIdToCustomerIdMap[order.userId]
  │         if (!customer): SKIP — no ghost records
  │         upsert tenants/{orgId}/orders/{order_id}
  │       Batch writes (400 docs/batch)
  │
  ├── 4. computeAndPersistSpending(orders, orgId)
  │       aggregate per customer:
  │         totalSpent, orderCount, avgOrderValue, lastOrderDate, firstOrderDate
  │       write keys:
  │         tenants/{orgId}/customer_spending/{email.toLowerCase()}
  │         tenants/{orgId}/customer_spending/cid_{id_customer}
  │       Batch writes (400 docs/batch, non-blocking setImmediate)
  │
  └── 5. syncPOSProducts(locationId, orgId)
          POST /inventory/search { query: '' }
          For each product:
            includes: cost, batchCost (for COGS)
            includes: thc, cbd (sparse — only if COA uploaded)
            includes: strainType (from Alleaves or inferred)
          upsert tenants/{orgId}/publicViews/products/items/{product_id}
          upsert tenants/{orgId}/products/{product_id} (legacy path)
          ⚠️ Removes products NOT in this response (POS = single source of truth)
          Update sync_status: { lastSyncAt, customerCount, orderCount, menuProductsCount }
```

---

## Alleaves API Reference

```
Base URL: https://api.alleaves.com (or configured endpoint)
Auth: Bearer JWT from POST /api/auth

Endpoints:
  POST /api/auth
    body: { username, password, pin }
    returns: { token, locationId }
    ⚠️ PIN is separate from password — never concatenate

  GET /api/customers?locationId={id}&page={n}&pageSize=100
    returns: { customers: AleavesCustomer[], total, page }
    AleavesCustomer: { id_customer, email, first_name, last_name, phone, userId }

  GET /api/orders?locationId={id}&startDate={ISO}&page={n}&pageSize=100
    returns: { orders: AlleavesOrder[], total }
    AlleavesOrder: {
      id_transaction, customer: { email, userId }, items: [...],
      total, created_at, type: 'in_store' | 'delivery' | 'pickup'
    }

  POST /inventory/search
    body: { query: '', locationId: {id} }
    returns: { products: AlleavesProduct[] }
    AlleavesProduct: {
      id_product, name, brand, category, subcategory,
      price, cost, batchCost,
      thc, cbd, strainType,
      available, has_inventory, quantity
    }
```

---

## Customer Segmentation Engine

### Segment Calculation

```typescript
calculateSegment(customer: Customer): CustomerSegment
  const { orderCount, lastOrderDate, totalSpent, loyaltyPoints } = customer;
  const daysSinceLastOrder = lastOrderDate
    ? Math.floor((Date.now() - lastOrderDate.toMillis()) / 86400000)
    : undefined;

  // CRITICAL: loyalty enrollees with no purchase history → 'new', not 'churned'
  if (orderCount === 0 && !lastOrderDate) return 'new';

  if (totalSpent >= 1000 && orderCount >= 10) return 'vip';
  if (orderCount >= 5 && daysSinceLastOrder !== undefined && daysSinceLastOrder < 60) return 'loyal';
  if (daysSinceLastOrder !== undefined && daysSinceLastOrder > 90) return 'churned';
  if (daysSinceLastOrder !== undefined && daysSinceLastOrder > 45) return 'at_risk';
  if (orderCount >= 2) return 'returning';
  if (orderCount === 1) return 'new';
  return 'new';
```

### Spending Lookup (Two-Tier)

```typescript
// Tier 1: Pre-computed index (fast path)
const emailKey = customer.email.toLowerCase();
const cidKey = `cid_${customer.id}`;

let spending = await db
  .collection(`tenants/${orgId}/customer_spending`)
  .doc(emailKey)
  .get();

if (!spending.exists) {
  spending = await db
    .collection(`tenants/${orgId}/customer_spending`)
    .doc(cidKey)
    .get();
}

// Tier 2: Live query fallback (first sync, 8s timeout)
if (!spending.exists) {
  const orders = await Promise.race([
    db.collection(`tenants/${orgId}/orders`)
      .where('customerId', '==', customer.id)
      .select('total', 'createdAt')
      .get(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000))
  ]);
  // aggregate from orders...
}
```

---

## Firestore Schema

### tenants/{orgId}/customers/{id}
```typescript
{
  id: string,                    // Alleaves id_customer
  email: string,                 // May be placeholder 'no-email@alleaves.local'
  userId?: string,               // Alleaves userId — key for in-store matching
  firstName: string,
  lastName: string,
  phone?: string,
  loyaltyPoints: number,
  loyaltyTier: 'bronze' | 'silver' | 'gold' | 'platinum',
  segment: CustomerSegment,
  orderCount: number,
  totalSpent: number,
  lastOrderDate?: Timestamp,
  firstOrderDate?: Timestamp,
  orgId: string,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### tenants/{orgId}/customer_spending/{emailOrCidKey}
```typescript
{
  email?: string,                // lowercase
  customerId?: string,           // for cid_ keyed docs
  totalSpent: number,
  orderCount: number,
  avgOrderValue: number,
  lastOrderDate: Timestamp,
  firstOrderDate: Timestamp,
  updatedAt: Timestamp
}
```

### tenants/{orgId}/publicViews/products/items/{id}
```typescript
{
  id: string,
  name: string,
  brand?: string,
  category: string,
  subcategory?: string,
  price: number,
  cost?: number,               // COGS — from Alleaves, may be null
  batchCost?: number,
  thcPercent?: number,         // sparse — only if COA uploaded
  cbdPercent?: number,
  strainType?: 'Sativa' | 'Indica' | 'Hybrid' | 'CBD',
  imageUrl?: string,           // Firebase Storage URL after migration
  imageSource?: 'dispense' | 'alleaves' | 'manual',
  sortOrder?: number,
  isFeatured?: boolean,
  available: boolean,
  source: 'pos',
  orgId: string,
  updatedAt: Timestamp
}
```

---

## Indexes Required

```json
// customer_spending lookup by orgId
{ "collectionGroup": "customer_spending",
  "fields": [{"fieldPath": "orgId"}, {"fieldPath": "updatedAt", "order": "DESCENDING"}] }

// customers by segment for segmentation queries
{ "collectionGroup": "customers",
  "fields": [{"fieldPath": "orgId"}, {"fieldPath": "segment"}, {"fieldPath": "totalSpent", "order": "DESCENDING"}] }

// orders by customer for live spending fallback
{ "collectionGroup": "orders",
  "fields": [{"fieldPath": "orgId"}, {"fieldPath": "customerId"}, {"fieldPath": "createdAt", "order": "DESCENDING"}] }
```
