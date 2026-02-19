# Alleaves POS Integration Reference

> Alleaves is the POS for Thrive Syracuse (and future dispensary pilots).
> **Key files**: `src/lib/pos/adapters/alleaves.ts`, `src/lib/pos/types.ts`, `src/app/dashboard/menu/actions.ts`

---

## Authentication

- **Method**: JWT (POST `/api/auth` with username + password + optional pin)
- **Token cache**: 5-minute buffer before expiry; re-auths automatically
- **API base**: `https://app.alleaves.com/api`
- **Thrive location ID**: `1000`

---

## Core Endpoints in Use

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/auth` | Get JWT token |
| `POST` | `/inventory/search` | **Primary menu sync** — all products |
| `GET` | `/inventory/area` | Storage areas (id_area → name lookup) |
| `POST` | `/inventory/batch/search` | Bulk batch detail — traceability, status, mg |
| `GET` | `/inventory/batch/{id}` | Single batch detail (fallback) |
| `GET` | `/discount` | Active discount rules for On Sale badges |
| `GET` | `/location` | Validate connection + location metadata |
| `POST` | `/customer/search` | Paginated customer list |
| `GET` | `/order` | Paginated order history |
| `POST` | `/order/{id}/discount` | Apply discount to existing POS order |

---

## Data We Capture Per Product (`ALLeavesInventoryItem` → `POSProduct`)

### Always Present (P1)
| API Field | POSProduct Field | Notes |
|-----------|-----------------|-------|
| `id_item` | `externalId` | Primary product identifier |
| `item` | `name` | |
| `brand` | `brand` | |
| `category` | `category` | Stripped of "Category > " prefix |
| `sku` | `sku` | Barcode / SKU |
| `strain` | `strain` | Strain name |
| `uom` | `uom` | "Each", "g", "oz", "mg" |
| `on_hand` | `onHand` | Total stock including reserved |
| `available` | `stock` | Available for sale |
| `price_otd_*` / `price_retail_*` | `price` | Cascade priority: OTD adult > OTD med > OTD > retail |
| `cost_of_good` | `cost` | Item-level COGS |
| `batch_cost_of_good` | `batchCost` | Batch-level COGS |
| `thc` | `thcPercent` | THC percentage |
| `cbd` | `cbdPercent` | CBD percentage |
| `expiration_date` | `expirationDate` | ISO string → Date |
| `package_date` | `packageDate` | Harvest/package date — enables age calculation |
| `id_batch` | `batchId` | Batch identifier string |

### Possibly Present (P2 — multi-name fallback)
| Possible API Fields | POSProduct Field | Resolution Order |
|--------------------|-----------------|-----------------|
| `tag` / `metrc_tag` / `batch_tag` | `metrcTag` | item.tag → item.metrc_tag → batch.tag |
| `status` / `id_status` | `batchStatus` | "open", "closed" |
| `id_area` (joined) | `areaName` | areaLookup.get(id_area) → item.area → batch.area |
| `thc_mg` | `thcMg` | Absolute mg amount |
| `cbd_mg` | `cbdMg` | Absolute mg amount |
| `barcode` | `sku` | Fallback if `sku` empty |

### From Batch Enrichment (P3 — `fetchBatchDetails()`)
Traceability tag, batch status, area ID, mg potency, date fallbacks — all merged into the same `POSProduct` fields above.

---

## `fetchMenu()` Flow (as of 2026-02-18)

```
1. POST /inventory/search  ──┐  parallel
2. GET /inventory/area     ──┘
3. Collect unique id_batch values from step 1
4. POST /inventory/batch/search (all batch IDs in one call)
   → fallback: GET /inventory/batch/{id} (individual, capped 100)
   → fallback: skip (non-fatal)
5. mapInventoryItems(items, areaLookup, batchDetails)
```

**Performance note**: Area fetch is 1 call. Batch fetch is 1 call (search endpoint). Individual batch fallback is capped at 100 to avoid rate limiting.

---

## Firestore Persistence

All fields written on menu sync via `batch.set(ref, data, { merge: true })` in `src/app/dashboard/menu/actions.ts`.

**Spread pattern** (safe on merge — won't overwrite manually-entered values):
```typescript
...(item.metrcTag !== undefined ? { metrcTag: item.metrcTag } : {})
```

New fields added to Firestore schema (2026-02-18):
`sku`, `strain`, `uom`, `onHand`, `packageDate`, `expirationDate`, `batchId`, `batchCost`, `thcMg`, `cbdMg`, `metrcTag`, `batchStatus`, `areaName`

---

## Undocumented Endpoints (Not in Swagger)

These work in production but are absent from the public spec at `/api/documentation/`:
- `POST /inventory/search` — primary menu sync
- `POST /inventory/batch/search` — bulk batch detail
- `GET /inventory/batch/{id}` — single batch detail
- `GET /inventory/brand` — brand list
- `GET /inventory/category` — category list
- `GET /inventory/vendor` — vendor list
- `GET /order` — paginated order history
- `POST /customer/{id}/loyalty` — loyalty points update
- `POST /customer/{id}/credit` — store credit

---

## Key Client Methods

| Method | Purpose |
|--------|---------|
| `fetchMenu()` | Full sync with area + batch enrichment |
| `fetchAreas()` | Returns `Map<id_area, name>` |
| `fetchBatchDetails(ids[])` | Returns `Map<id_batch, ALLeavesBatchDetail>` |
| `fetchMenuWithDiscounts()` | Menu + On Sale badges |
| `getDiscounts()` | Active discount rules |
| `getAllCustomers()` / `getAllCustomersPaginated()` | Customer list |
| `getAllOrders()` | Paginated order history |
| `getCustomerSpending()` | Aggregates order history by customer |
| `searchBatches(query)` | Expiring inventory for clearance bundles |
| `getBrands()` / `getCategories()` / `getVendors()` | Metadata lists |
| `applyOrderDiscount()` | Two-way sync: apply discount to POS order |

---

## Common Patterns & Gotchas

- **`available` vs `on_hand`**: Use `available` for customer-facing stock; `on_hand` for backroom inventory counts.
- **Category format**: API returns `"Category > Flower"` — adapter strips the prefix.
- **Price cascade**: OTD adult-use → OTD medical → OTD → retail adult → retail medical → retail. If all zero, calculate from COGS with markup.
- **Area enrichment**: `id_area` in inventory item → look up in `fetchAreas()` map → human-readable name.
- **Traceability tag**: May be in `tag`, `metrc_tag`, or `batch_tag` field — all tried in order; also checked from batch detail endpoint.
- **Thrive tenant doc**: `tenants/org_thrive_syracuse` does NOT exist in Firestore. Always use `users.where('orgId', '==', orgId)` fallback.

---

## Alleaves API Audit (2026-02-18)

Full 128-endpoint spec fetched from `/api/documentation/swagger-ui-init.js`. Key findings:
- **60% of available inventory data** was previously unused
- P1/P2/P3 enrichment now captures ~95% of product-level data
- Remaining gaps: vendor/procurement data, SpringBig loyalty (separate API), METRC manifest generation
- Full spec archived: `dev/alleaves_spec.json`
