# Spec: Product Sync Cleanup & COGS Reconciliation

**Status:** 🔴 URGENT | **Severity:** HIGH | **Impact:** Data Integrity

---

## Problem Statement

**Issue:** Thrive Syracuse has **1,178 products** in Firestore, but only **~190 products** in Alleaves POS.
- 988+ orphaned/stale products with **missing COGS** data
- Products exist in BakedBot but not in POS (impossible state)
- Menu dashboard shows incorrect product counts
- COGS field critical for pricing/profitability calculations

**Root Cause:**
- Historical product imports from multiple sources (CannMenus, manual uploads)
- No cleanup/deduplication on POS sync
- Products never deleted when removed from POS

**Business Impact:**
- Menu shows 1,178 products but POS only has ~190
- Revenue calculations broken (missing COGS)
- Customer confusion (products don't exist)
- Pricing strategy impossible (no cost data)

---

## Scope

### What We'll Fix
1. **Audit:** Quantify orphaned products by source
2. **Identify:** Which products exist in Alleaves (keep) vs orphaned (delete)
3. **Clean:** Remove products with:
   - Missing COGS (and not in current Alleaves sync)
   - Stale timestamps (last sync >30 days ago)
   - Duplicate source entries
4. **Verify:** Post-cleanup product count = Alleaves count
5. **Prevent:** Add guards to auto-clean stale products on future syncs

### What We Won't Touch
- Products currently in Alleaves (even if COGS missing—will re-sync)
- Customer order history (don't modify `orders` collection)
- Bundle/deal configurations (different table)

---

## Implementation Plan

### Phase 1: Analysis (Non-Destructive)

**Step 1.1:** Count products by source + COGS status
```typescript
// Query: products WHERE orgId = 'org_thrive_syracuse'
// Aggregate by:
//   - source (pos, canmenus, manual, stripe, etc.)
//   - cogs (exists, null, 0, undefined)
//   - lastSyncAt (recent vs stale)
```

**Step 1.2:** Identify Alleaves source-of-truth
```typescript
// Products with source='pos' AND orgId='org_thrive_syracuse'
// These are the authoritative set to keep
```

**Step 1.3:** Build orphan list
```typescript
// Products with source != 'pos' OR lastSyncAt < 30_days_ago
// These are candidates for deletion
```

**Deliverable:** Report showing:
- Total products: X
- Alleaves products (keep): Y
- Orphaned products (delete): X - Y
- Missing COGS by source
- Breakdown by lastSyncAt age

### Phase 2: Cleanup (Destructive)

**Step 2.1:** Delete orphaned products
```typescript
const batch = db.batch();
orphanedProducts.forEach(doc => {
  batch.delete(doc.ref);
});
await batch.commit();
```

**Step 2.2:** Re-sync from Alleaves
```typescript
// Trigger: POST /api/cron/pos-sync
// Result: Fresh product import with COGS for all Alleaves items
```

**Step 2.3:** Verify counts
```typescript
// Assert: products.count(orgId='org_thrive_syracuse') ≈ Alleaves location 1000 count
```

### Phase 3: Prevention

**Step 3.1:** Update `syncMenu()` service
```typescript
// After Alleaves sync, delete any products NOT in current sync:
const alleavesSources = new Set(syncedProducts.map(p => p.id));
const orphans = await db.collection('products')
  .where('orgId', '==', orgId)
  .where('source', '==', 'pos')
  .where('externalId', 'not-in', [...alleavesSources])
  .get();

// Delete orphans (auto-cleanup on each sync)
```

**Step 3.2:** Add guard to prevent stale products
```typescript
// Before returning products in getMenu():
// Filter out products with lastSyncAt < NOW - 7_days
```

**Step 3.3:** Firestore rule enforcement
```
// Security rule: Products can only be created if:
//   - orgId matches session org
//   - source in ['pos', 'bundle', 'manual']
//   - cogs > 0 OR source != 'pos'
```

---

## Files to Modify

| File | Change | Lines |
|------|--------|-------|
| `src/server/services/pos-sync-service.ts` | Add cleanup logic after sync | +30 |
| `src/server/actions/menu.ts` | Add stale product filter | +5 |
| `firestore.rules` | Add COGS validation rule | +10 |
| `scripts/cleanup-orphaned-products.mjs` | One-time cleanup script | 100 |

---

## Testing Plan

### Unit Tests
- [ ] Orphan detection logic (source != 'pos' AND old lastSyncAt)
- [ ] Cleanup batch delete (doesn't delete Alleaves products)
- [ ] Re-sync correctly repopulates products

### Integration Tests
- [ ] Full flow: audit → cleanup → sync → verify
- [ ] Product counts match Alleaves
- [ ] COGS populated for all Alleaves products
- [ ] Menu displays correct count

### Manual QA
- [ ] Visit Thrive menu dashboard: product count = Alleaves count
- [ ] Search for deleted product: returns 0 results
- [ ] Category breakdown accurate

### Golden Set
N/A (no LLM changes)

---

## Rollback Plan

**If cleanup breaks things:**
1. Stop production traffic to menu
2. Restore Firestore from backup (2026-02-21 @ 12:00 UTC)
3. Run `git revert <cleanup-commit>`
4. Investigate root cause

**Backup Strategy:**
- Firestore auto-backups enabled
- Export products collection before cleanup: `gcloud firestore export gs://bakedbot-backups/products-2026-02-21`

---

## Success Criteria

| Criterion | Target | Acceptance |
|-----------|--------|-----------|
| **Product count** | ~190 | Matches Alleaves location 1000 |
| **Products with COGS** | 100% | All products have `cogs > 0` |
| **Menu load time** | <1s | No regression |
| **Search accuracy** | 100% | No false results |
| **Customer experience** | Unaffected | No lost orders/favorites |

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| **Delete wrong products** | Low | HIGH | Dry-run first, verify filters |
| **Break menu display** | Low | HIGH | Test locally, rollback ready |
| **Lose customer data** | Very low | CRITICAL | Backup first, don't touch orders |
| **Alleaves sync fails** | Low | MEDIUM | Manual re-import script ready |

---

## Timeline

| Phase | Effort | Duration |
|-------|--------|----------|
| Analysis (Phase 1) | 2h | Today |
| Cleanup + Testing (Phase 2-3) | 4h | Today + tomorrow |
| Deployment | 1h | After approval |
| **Total** | **7h** | **1-2 days** |

---

## Approval Gate

**Before proceeding, confirm:**
- [ ] Understand we'll delete 988+ products
- [ ] Backup strategy approved
- [ ] Rollback plan acceptable
- [ ] Timeline OK
- [ ] Can test on staging first (optional)

---

## Questions for User

1. **Should we test on staging first?** (recommended but adds 2h)
2. **Are there bundles/deals using deleted products?** (we'll check)
3. **Any products manually created that we should preserve?** (send list)
4. **Who should be notified if cleanup fails?** (for escalation)

---

**Prepared by:** Claude Code | **Date:** 2026-02-21
