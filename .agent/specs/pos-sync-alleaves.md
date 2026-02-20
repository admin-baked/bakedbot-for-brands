# Task Spec: POS Sync System (Alleaves)

**Date:** 2026-02-20

**Requested by:** Self-initiated (Production spec for existing implementation)

**Spec status:** 🟢 Approved (Existing production system — spec documents current state)

---

## 1. Intent (Why)

Enable dispensary admins and BakedBot agents to keep product catalog, pricing, discounts, and customer/order data synchronized bidirectionally between Alleaves POS and the BakedBot platform to prevent out-of-stock hallucinations, maintain price accuracy, track sales history, and support intelligent clearance bundles.

---

## 2. Scope (What)

### Files affected:

**Core sync logic:**
- `src/server/actions/pos-sync.ts` — Main sync orchestrator: `syncPOSProducts()`, `syncPOSDiscounts()`, `getExpiringInventory()`, `syncPOSMetadata()`, `getCachedMetadata()`
- `src/server/services/pos-sync-service.ts` — Background sync service: `syncOrgPOSData()`, `syncAllPOSData()`, `persistOrdersToFirestore()`

**Alleaves API integration:**
- `src/lib/pos/adapters/alleaves.ts` — ALLeavesClient: JWT auth, menu fetch, discounts, batch enrichment, customers, orders, metadata (2,000+ lines, comprehensive)
- `src/lib/pos/types.ts` — Data types: `POSProduct`, `POSConfig`, `ALLeavesInventoryItem`, `ALLeavesDiscount`, `ALLeavesOrder`, `ALLeavesCustomer`

**API endpoints:**
- `src/app/api/cron/pos-sync/route.ts` — Cron-triggered sync for all orgs (5-minute timeout, requires CRON_SECRET)
- `src/app/api/pos/sync/route.ts` — Manual sync endpoint (session-authenticated, role-gated to dispensary_admin + brand_admin)

**Dashboard & UI:**
- `src/server/actions/vibe-pos-products.ts` — Fetch POS products for website builder
- Various dashboard integration pages (menu, products, integrations)

### Files explicitly NOT touched:

- Payment/billing system — POS sync is read-only on pricing
- Auth/permissions system — uses existing `requireUser()` and session validation
- METRC compliance — Alleaves handles state tracking; BakedBot only stores references (`metrcTag`)
- Loyalty system — SpringBig integration managed separately (Alleaves delegates to SpringBig)
- Customer PII beyond what Alleaves exposes — no direct customer data stores outside orders

### Estimated diff size:

~2,500 lines (existing production implementation, no new files requested)

---

## 3. Boundary Check

| Boundary | Yes/No | Notes |
|---|---|---|
| Touches auth or permissions? | No | Uses existing session validation + role checks (dispensary_admin, brand_admin, super_user) |
| Touches payment or billing? | No | POS pricing is read-only; pricing decisions remain in Alleaves |
| Modifies database schema? | No | Writes to existing collections: `products`, `orders`, `tenants/{orgId}/publicViews/products`, `tenants/{orgId}/integrations/pos` |
| Changes infra cost profile? | No | Existing Firebase Firestore, no new services |
| Modifies LLM prompts or agent behavior? | Yes | Indirect: Fresh product data prevents Smokey hallucinations on out-of-stock; Linus uses orders for compliance audits |
| Touches compliance logic (Deebo, age-gate, TCPA)? | No | Alleaves handles METRC compliance; BakedBot only stores tags for audit |
| Adds new external dependency? | No | Alleaves client is adapter; same model as Dutchie |

**Escalation needed?** No

---

## 4. Implementation Plan

### Phase 1: Alleaves API Integration (COMPLETE)
1. Implement `ALLeavesClient` with JWT authentication (username/password/pin)
2. Build `fetchMenu()` with inventory search (`/inventory/search`) + area lookup + batch detail enrichment
3. Implement discount fetch (`/discount`) with priority-based lookup (product > category > brand)
4. Build customer fetch (`/customer/search`) with pagination (max 30 pages per sync)
5. Implement order fetch (`/order`) with date range support (default: 2020-01-01 to today)
6. Cache JWT tokens with 5-min buffer; auto-refresh on expiry

### Phase 2: Product Sync (COMPLETE)
1. Create `syncPOSProducts(locationId, orgId)` action:
   - Fetch location POS config from Firestore `locations` collection
   - Initialize Alleaves client with config (API key or username/password/PIN fallback)
   - Call `client.fetchMenu()` to get all products
   - Transform to `RawProductData` format
   - Pass to `createImport()` pipeline (product dedup, pricing, image URL enrichment)
   - Return synced product count

2. Create `syncPOSDiscounts(orgId)` action:
   - Find location with Alleaves config for org
   - Fetch active discounts from Alleaves (`/discount` endpoint)
   - Build lookup maps: product ID → discount, category → discount, brand → discount (sorted by priority)
   - Fetch all `publicViews/products/items` for tenant
   - Calculate sale prices (percent / amount / fixed_price / BOGO)
   - Batch update Firestore with `isOnSale`, `salePrice`, `saleBadgeText`, `discountId`, `saleEndsAt`
   - Clear sale fields on products no longer discounted

3. Implement `getExpiringInventory(orgId, daysThreshold=30)` action:
   - Call `client.searchBatches({ expiringWithinDays, minQuantity })`
   - Return expiring products with batch IDs for clearance bundle generation

4. Implement `syncPOSMetadata(orgId)` action:
   - Fetch brands, categories, vendors, location details in parallel
   - Cache in `tenants/{orgId}/metadata` collection for filter UIs
   - Return counts

### Phase 3: Order & Customer Sync (COMPLETE)
1. Create `syncOrgPOSData(orgId)` service:
   - Find location with active Alleaves config
   - Fetch customers (up to 30 pages, 100 per page) and orders (up to 10,000) in parallel
   - Persist orders to `orders` collection (batched, 400 per batch) with Firestore merge (idempotent)
   - Upsert integration status doc at `tenants/{orgId}/integrations/pos`
   - Invalidate products cache (`CachePrefix.PRODUCTS`)

2. Create `syncAllPOSData()` cron service:
   - Find all locations with active Alleaves config
   - Extract unique org IDs
   - Sync each org sequentially with 1-second delay between syncs
   - Return array of sync results

### Phase 4: API Endpoints (COMPLETE)
1. **Cron endpoint** (`/api/cron/pos-sync`):
   - Verify `CRON_SECRET` header
   - Optional query param: `?orgId=...` for single-org sync
   - Return results JSON (success count, failed count, details)
   - 5-minute timeout

2. **Manual endpoint** (`/api/pos/sync`):
   - Verify session cookie (`__session`)
   - Check user role: super_user, super_admin, or org membership (via `buildOrgIdCandidates()`)
   - Accept `orgId` from JSON body or query param
   - Call `syncOrgPOSData()`
   - Return result JSON

### Phase 5: Builder Integration (COMPLETE)
1. Implement `getBuilderProducts(userId, limit=12)`:
   - Fetch user's org from Firestore
   - Find location with POS config
   - Initialize Alleaves client
   - Fetch menu, transform to builder format
   - Return up to 12 products (with demo fallback if POS unavailable)

---

## 5. Test Plan

### Unit tests:

- [ ] `ALLeavesClient.authenticate()` — Validates JWT caching and token refresh
- [ ] `ALLeavesClient.fetchMenu()` — Maps inventory items to POSProduct with area/batch enrichment
- [ ] `ALLeavesClient.getDiscounts()` — Filters active discounts by date range
- [ ] `mapInventoryItems()` — Handles category name cleanup ("Category > " prefix stripping), price fallback strategy (OTD > retail > cost markup)
- [ ] `syncPOSDiscounts()` — Correctly applies product > category > brand priority, calculates sale prices (percent/amount/fixed/BOGO)
- [ ] `syncPOSProducts()` — Returns product count, handles missing config gracefully
- [ ] `persistOrdersToFirestore()` — Batches writes in 400-record chunks, maps Alleaves fields correctly (date_created → createdAt, etc.)
- [ ] `syncOrgPOSData()` — Fetches customers + orders in parallel, persists integration status
- [ ] `getExpiringInventory()` — Calculates days-until-expiry correctly
- [ ] `getCachedMetadata()` — Retrieves from Firestore cache with fallback to empty arrays

### Integration tests:

- [ ] `POST /api/cron/pos-sync` with valid CRON_SECRET — Syncs all orgs with active config
- [ ] `POST /api/cron/pos-sync?orgId=org_test` — Syncs single org only
- [ ] `POST /api/cron/pos-sync` without CRON_SECRET — Returns 401
- [ ] `POST /api/pos/sync` with session + dispensary_admin role — Syncs user's org
- [ ] `POST /api/pos/sync` with session + super_user role — Can sync any org
- [ ] `POST /api/pos/sync` without session — Returns 401
- [ ] `POST /api/pos/sync` with wrong org — Returns 403 (non-super users only)
- [ ] E2E: Sync products → verify count matches → check public menu shows discounts
- [ ] E2E: Sync orders → verify `orders` collection has entries keyed by `alleaves_{id_order}`

### Manual smoke test:

- [ ] Navigate to `/dashboard/products` → Click "Sync POS" button → Wait for results → Verify product count matches Alleaves
- [ ] Check `/dashboard/settings/loyalty` → Menu tab shows discounts applied from last sync
- [ ] Verify Thrive Syracuse menu displays correct sale badges on discounted products
- [ ] Check `tenants/{orgId}/integrations/pos` doc shows `lastSyncAt`, `customersCount`, `ordersCount`

---

## 6. Rollback Plan

| Strategy | Details |
|---|---|
| Single commit revert? | Yes — `git revert <commit>` if sync logic broken. Note: Product history persists; old products not auto-deleted. |
| Feature flag? | No flag currently; disable via removing POS config from location or setting `posConfig.status` to `inactive` |
| Data migration rollback needed? | No — Firestore writes are additive (merge). To purge test data: manual `deleteCollection('orders')` and clear `publicViews/products` sub-collection. |
| Downstream services affected? | **Smokey** (product search) — if sync disabled, returns stale menu. **Craig** (campaigns) — if discounts don't sync, sale badges won't display. **Public menus** (`bakedbot.ai/thrivesyracuse`) — will show last synced prices until next cron. |

### Recovery steps (if sync corrupts data):
1. Identify corruption scope (which products/orders affected)
2. Set `posConfig.status = 'inactive'` to stop auto-sync
3. Manually query Alleaves API for correct state
4. Batch-update Firestore with correct data
5. Re-enable sync once verified
6. Monitor logs for 24 hours

---

## 7. Success Criteria

- [ ] **Sync latency:** Products updated within 5 minutes of POS change (cron runs every 30 min)
- [ ] **Accuracy:** Product count in Firestore ≥ 95% match to Alleaves (allowing for draft/deleted items)
- [ ] **Discounts applied:** Sale badges visible on public menu within 30 minutes of discount creation
- [ ] **Orders persisted:** 100% of Alleaves orders (last 10k) stored in Firestore `orders` collection (keyed by `alleaves_{id}`)
- [ ] **No regressions:** All tests pass; no new errors in Cloud Logging over 24h post-deploy
- [ ] **Cache invalidation:** Products cache cleared on each sync (prevents stale data on public APIs)
- [ ] **Availability:** Sync completes even if Alleaves API slow (up to 5-minute timeout for cron)
- [ ] **Idempotency:** Running sync twice produces identical results (no duplicate orders, no price overwrite conflicts)

---

## Approval

- [x] **Spec reviewed by:** Production spec for existing implementation
- [x] **Approved to implement:** Yes (already implemented)
- [ ] **Modifications required:** None

---

## Additional Context

### Architecture Overview

```
Alleaves API (https://app.alleaves.com/api)
    ↓ JWT Auth (username/password/pin) — cached with 5-min buffer
    ↓
ALLeavesClient (src/lib/pos/adapters/alleaves.ts)
    ├─ fetchMenu() → POST /inventory/search → ALLeavesInventoryItem[]
    │                 + GET /inventory/area → area lookup map
    │                 + GET /inventory/batch/{id} → batch enrichment
    │                 → Maps to POSProduct (standard format)
    │
    ├─ getDiscounts() → GET /discount → Filter active → ALLeavesDiscount[]
    │
    ├─ getAllOrders() → GET /order?page=X → Paginate up to 10k → ALLeavesOrder[]
    │
    └─ getAllCustomersPaginated() → POST /customer/search → Page 1..N → any[]

Firestore Schema:
    collections:
        locations/{locationId}
            posConfig: { provider, apiKey, username, password, pin, storeId, locationId, status }

        tenants/{orgId}
            integrations/
                pos: { status, provider, lastSyncAt, lastError, customersCount, ordersCount }
            publicViews/
                products/
                    items/{productId}
                        externalId, name, price, category, isOnSale, salePrice, saleBadgeText, ...
            metadata/
                brands: { items: [], updatedAt }
                categories: { items: [], updatedAt }
                vendors: { items: [], updatedAt }
                location: { id, name, licenseNumber, timezone, updatedAt }

        products/{productId}
            (canonical product — single source of truth before sync)

        orders/{docId}
            id: "alleaves_{id_order}", brandId, retailerId, userId, status, customer, items, totals, source: "alleaves", ...
```

### Key Data Flow

**Product Sync (30-min cron):**
```
Cron → POST /api/cron/pos-sync (CRON_SECRET)
    → syncAllPOSData()
        → Find locations with posConfig.provider='alleaves' & status='active'
        → For each orgId: syncOrgPOSData(orgId)
            → ALLeavesClient.fetchMenu()
            → Transform + createImport() → Firestore products
            → invalidateCache(PRODUCTS, orgId)
            → Persist integration status (lastSyncAt, count)
```

**Discount Sync (via syncPOSDiscounts - triggered manually or on demand):**
```
Dashboard/Cron → syncPOSDiscounts(orgId)
    → ALLeavesClient.getDiscounts()
    → Build lookup: product → discount (priority-sorted)
    → Fetch publicViews/products/items
    → Calculate sale prices (percent/amount/fixed/BOGO)
    → Batch update with isOnSale, salePrice, saleBadgeText, saleEndsAt
```

**Order Sync (cron/manual):**
```
syncOrgPOSData(orgId)
    → ALLeavesClient.getAllOrders(10000)
    → persistOrdersToFirestore(firestore, orgId, locationId, orders)
        → Batch write 400 at a time (Firestore limit 500)
        → Merge by Alleaves order ID (idempotent — status updates preserved)
        → Firestore doc ID: "alleaves_{order.id_order}"
```

### Authentication & Security

**Alleaves Auth:**
- JWT-based: POST `/api/auth` with `{ username, password, pin }`
- Response: `{ token: "eyJ...", expires_at: 1234567890 }`
- Cached in `ALLeavesClient` with 5-minute refresh buffer
- Token embedded in `Authorization: Bearer {token}` header for all API calls

**BakedBot Auth:**
- **Cron endpoint**: Verify `Authorization: Bearer {CRON_SECRET}` env var
- **Manual endpoint**: Verify Firebase session cookie (`__session`)
  - Extract `decodedToken.role` (super_user, dispensary_admin, brand_admin, etc.)
  - Check org membership via `buildOrgIdCandidates()` helper
  - Super users can sync any org; dispensary admins can only sync their own

### Error Handling & Resilience

**Network failures:**
- Alleaves API timeout → ALLeavesClient throws → `syncOrgPOSData()` catches → logs error → persists error status to Firestore
- Partial batch writes → Firestore batch commit fails → rollback automatic (no orphaned docs)
- Cron timeout (5 min) → Cloud Tasks auto-retries (check `apphosting.yaml` retry policy)

**Data inconsistencies:**
- Category/brand lookup fallback — if metadata endpoint down, ALLeavesClient.fetchMenu() parses from menu
- Missing price → Markup applied based on category (industry standard markups: 2.0–2.4x)
- Duplicate orders → Firestore merge prevents overwrite of status changes (preserve both BakedBot + POS updates)

**Logging:**
- All actions logged to Cloud Logging with `[POS_SYNC]` prefix
- Errors include orgId, error message, duration
- Integration status doc tracks last error message for dashboard visibility

---

### Known Limitations

1. **Loyalty Management:** Alleaves delegates to SpringBig (3rd-party loyalty platform). `updateLoyaltyPoints()` method included but may require separate SpringBig API integration.

2. **Price Updates:** Alleaves is source of truth for retail pricing. BakedBot cannot push price changes back; use DISCOUNTS to adjust displayed prices instead.

3. **Inventory Reserves:** Alleaves `available` field excludes reserved inventory. On-hand `on_hand` includes reserves. BakedBot uses `available` for public menu.

4. **Two-way Sync Scope:**
   - ✅ Read: Products, discounts, customers, orders, metadata
   - ✅ Write: Customer creation, order submission, discount application (with caveats)
   - ❌ Not supported: Inventory quantity edits, price edits (POS-only), loyalty program creation

5. **Batch Enrichment:** Batch details (METRC tags, expiration dates) require additional API calls. Implemented with best-effort parallel fetching (up to 100 batches individually). Fallback: skip enrichment if batch endpoint unavailable.

---

### Performance Characteristics

- **Sync time per org:** 5-15 seconds (menu fetch + discount apply + order persist)
- **Batch size for Firestore writes:** 400 records (Firestore limit is 500; margin for safety)
- **Cron timeout:** 5 minutes (covers 10+ orgs with margin)
- **Token cache:** 5-minute refresh buffer (avoids auth failures mid-sync)
- **Product cache invalidation:** Immediate (cache prefix invalidated post-sync)

---

### Future Enhancements

- [ ] **P2:** Webhook support — Listen for real-time Alleaves updates (product, discount, order events)
- [ ] **P2:** Batch enrichment optimization — Cache batch details for 24h to reduce API calls
- [ ] **P3:** Loyalty sync — SpringBig integration for bidirectional loyalty points
- [ ] **P3:** Menu preview — Real-time Alleaves menu on dashboard (currently cached)
- [ ] **P4:** Comparative pricing — Track price changes over time (Alleaves historical pricing)

---

**End of Spec**
