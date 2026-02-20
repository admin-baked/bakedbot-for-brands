# Production Spec: POS Sync + Menu

**Last updated:** 2026-02-19
**Spec status:** 🔴 Gaps Identified
**Owner agents:** Smokey (Budtender), Leo (COO — sync orchestration)
**Tier:** 1 — Revenue + Compliance

---

## 1. Feature Overview

The POS Sync system connects dispensary brands to their Point-of-Sale systems (currently Alleaves for Thrive Syracuse) and synchronizes product catalogs into BakedBot's Firestore. The synced menu is the single source of truth — `syncMenu()` removes ALL non-POS products when a POS is connected. Products drive every downstream feature: public menu, Smokey recommendations, campaign targeting, analytics, and pricing. The Menu Command Center lets brand owners manage sort order, featured products, pricing, and get a live WYSIWYG preview.

---

## 2. Current State

### Shipped ✅
- Alleaves POS connector (`src/server/services/alleaves/`) — inventory sync for Thrive Syracuse (loc 1000)
- `syncMenu()` in `src/server/actions/pos-sync.ts` removes ALL non-POS products (POS = single source of truth)
- Product type (`src/types/products.ts`) includes: `brandName`, `sortOrder`, `featured`, `source`, `effects[]`
- `lastSyncCount` stored on each sync — mismatch banner shown in dashboard
- Menu Command Center: live WYSIWYG preview tab, drag-to-reorder (persists `sortOrder` to Firestore), featured pin, price sheet, full-screen mode
- Public menu sort: `popular` case respects `sortOrder ?? 9999` first, `likes` as tiebreaker
- Effects filter pills derived from real product data
- Brand name on product cards (from `brandName` POS field)
- Weight display on product cards
- CannMenus fallback connector (`src/server/services/cannmenus.ts`) for non-Alleaves dispensaries
- Batch `sortOrder` writes to both `tenants/{orgId}/products` and legacy collection paths
- `syncMenu()` cron route secured with `CRON_SECRET`

### Partially Working ⚠️
- CannMenus as primary source (Herbalist Samui uses demo menu — no live POS)
- Out-of-stock filtering on sync — filter exists but edge cases around mid-session removal unverified
- Alleaves location-specific sync (only `loc 1000` tested; multi-location untested)

### Not Implemented ❌
- Cart invalidation when a product is removed mid-sync (customer had product in cart, sync removes it)
- Retry logic for Alleaves API failures (transient 5xx)
- POS sync webhook trigger (currently cron-only; no event-driven sync on POS change)
- Multi-location Alleaves support (more than loc 1000)
- CannMenus as fallback when Alleaves is down (currently a separate connector, not a true fallback)

---

## 3. Acceptance Criteria

### Functional
- [ ] `syncMenu()` removes all products not returned by POS — no orphaned products in Firestore after sync
- [ ] Synced products include: name, price, THC%, CBD%, effects, weight, brandName, imageUrl
- [ ] `sortOrder` persisted on drag-to-reorder survives sync (POS-returned products retain custom order)
- [ ] Featured products (`featured: true`) float to top of public menu above sort order
- [ ] `lastSyncCount` is updated after every sync; dashboard shows sync status badge
- [ ] Product price updates in Menu Command Center write to both tenant + legacy Firestore paths
- [ ] Sync failure logs error and retains last successful product set (no wipe on error)

### Compliance / Security
- [ ] Sync cron endpoint requires valid `CRON_SECRET` Bearer token
- [ ] Alleaves API credentials never logged or exposed in client response
- [ ] `requireUser()` + org membership check on all Menu Command Center actions (sort, price, featured)
- [ ] Super user can trigger manual sync for any org; brand admin can only sync their own org

### Performance
- [ ] Full sync for a 500-product catalog completes in < 60s
- [ ] `syncMenu()` uses batch writes (Firestore batches of 500) to avoid per-document overhead
- [ ] Public menu page renders stale (ISR cached) menu within 200ms; cache invalidation < 4h after sync

---

## 4. Known Gaps / Tech Debt

| Gap | Severity | Notes |
|-----|----------|-------|
| Cart invalidation on mid-sync product removal | 🔴 Critical | Customer could be charged for a product just removed from POS |
| No retry logic for Alleaves API transient failures | 🟡 High | Single failure wipes sync attempt; no backoff |
| Multi-location Alleaves untested | 🟡 High | Thrive is single-location — multi-location could break field mapping |
| CannMenus is not a true failover for Alleaves | 🟡 High | If Alleaves goes down, POS orgs have no automatic fallback |
| No unit test for "removes all non-POS products" invariant | 🟡 High | Core behavioral guarantee has no regression test |
| No unit test for drag-to-reorder survives sync | 🟢 Low | `sortOrder` fields need to be preserved on re-sync |
| ISR cache not invalidated on-demand after sync | 🟢 Low | Up to 4h staleness on public menu after product change |
| Alleaves rate limits undocumented | 🟢 Low | Unknown if heavy syncing could hit API throttle |

---

## 5. Test Coverage

### Existing Tests
| Test | Location | Coverage |
|------|----------|---------|
| Alleaves POS ref | `.agent/refs/alleaves-pos.md` | Architecture + field mapping (not test files) |

### Missing Tests (Required for Production-Ready)
- [ ] `pos-sync.unit.test.ts:removes-non-pos-products` — verifies products not in POS response are deleted from Firestore
- [ ] `pos-sync.unit.test.ts:preserves-sort-order` — verifies `sortOrder` on POS-matched products is retained after sync
- [ ] `pos-sync.unit.test.ts:sync-failure-no-wipe` — verifies Firestore is NOT updated when POS API returns error
- [ ] `pos-sync.unit.test.ts:batch-writes` — verifies batch write is used (not per-document) for catalogs > 100 items
- [ ] `menu-command-center.unit.test.ts:featured-float` — verifies `featured: true` products appear first in sort
- [ ] `cart-invalidation.integration.test.ts` — verifies cart items referencing removed products are flagged/cleared

### Golden Set Eval
_No LLM behavior in POS sync — no golden set required._

---

## 6. Dependencies

### Internal
| System | Why needed | Failure mode |
|--------|-----------|-------------|
| Firestore | Product catalog storage | Sync fails; retains stale products |
| Public menu ISR | Serves products to customers | Up to 4h staleness; not a blocking failure |
| Smokey agent | Uses product catalog for recommendations | Stale recommendations until next sync |
| Creative Studio | Uses products for campaign copy | Stale product list in campaign templates |

### External Services
| Service | Purpose | Fallback |
|---------|---------|---------|
| Alleaves POS API | Product catalog source | None — show last synced products with staleness warning |
| CannMenus API | Alternative catalog source (non-Alleaves orgs) | Static demo menu |

---

## 7. Degraded Mode

- **If Alleaves API is down:** Do NOT clear products. Show stale product set with "last synced X ago" banner. Send Slack alert if staleness > 24h.
- **If Firestore batch write fails mid-sync:** Transaction should roll back. If partial write, log and alert — do not leave Firestore in inconsistent state.
- **If `sortOrder` write fails:** Non-blocking — drag-to-reorder will revert on next page load. Log error.
- **Data loss risk:** A sync that deletes products and fails to write new ones = empty menu. Sync MUST be transactional or use read-then-write-with-guard pattern.

---

## 8. Open Questions

1. **Cart invalidation**: Is there an active cart system? If a customer has a product in cart and sync removes it, what should happen? (Remove from cart silently? Show "item unavailable" warning?)
2. **Multi-location Alleaves**: When a brand has multiple Alleaves locations, should each location have its own product set, or should they be merged? Behavior undefined.
3. **Sync trigger strategy**: Should we add a webhook from Alleaves to trigger sync on inventory change, or remain cron-only? Cron latency (up to 1h) means prices/stock can be stale.
4. **ISR on-demand invalidation**: After a sync, should we call `revalidatePath()` to flush the public menu ISR cache immediately? Current 4h window may be too long.

---

## Revision History

| Date | Author | Change |
|------|--------|--------|
| 2026-02-19 | Claude Code (audit) | Initial draft — based on codebase audit |
