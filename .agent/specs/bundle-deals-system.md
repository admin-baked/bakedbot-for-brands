# Production Spec: Bundle Deals System

**Last updated:** 2026-02-20
**Spec status:** 🟡 Partial - Gaps Identified
**Owner agent(s):** Leo (Operations), Craig (Marketing)
**Tier:** 3 - Priority 1 (Revenue Features)

---

## 1. Intent (Why)

Enable brands and dispensaries to create promotional bundles that increase average order value (AOV) and drive inventory turnover through five bundle types: BOGO, Mix & Match, Percentage discounts, Fixed-price bundles, and Tiered volume discounts. Support scheduled promotions with date/time ranges, redemption limits (global + per-customer), brand contribution tracking for co-op programs, and AI-assisted bundle suggestions based on inventory analysis and margin protection.

---

## 2. Scope (What)

### Files Affected

#### Core Implementation
- `src/types/bundles.ts` (119 lines) — Core types: `BundleDeal`, `BundleProduct`, `BrandBundleProposal`
- `src/app/actions/bundles.ts` (292 lines) — CRUD: create/read/update/delete bundles; image selection; active bundles query
- `src/app/actions/bundle-products.ts` (320 lines) — Fetch eligible products by criteria; scoring algorithm
- `src/app/actions/bundle-suggestions.ts` (613 lines) — Natural language rule parsing; AI suggestion generation; price recommendation

#### UI Components
- `src/components/dashboard/bundles/bundle-form.tsx` (236 lines) — Create/edit form
- `src/components/dashboard/bundles/bundle-rule-builder.tsx` (815 lines) — Natural language input, smart presets, manual builder
- `src/components/dashboard/bundles/bundle-preview.tsx` (121 lines) — Card display
- `src/components/demo/bundle-deals-section.tsx` (166 lines) — Public menu carousel

#### Tests
- `tests/actions/bundles.test.ts` (128 lines) — Jest unit tests for CRUD operations

### Files NOT Touched
- Order confirmation system (redemption tracking incomplete)
- Cloud Scheduler (cron jobs for scheduled transitions missing)

### Diff Size
**Total:** ~2,600 lines (types + actions + components + tests)

---

## 3. Boundary Check

| Domain | Status | Notes |
|--------|--------|-------|
| **Auth** | ✅ Complete | `requireUser()` + org validation on all actions |
| **Payment** | ✅ N/A | Bundle pricing affects revenue but not payment flow |
| **Schema** | ✅ Complete | Firestore `bundles/{id}` with `orgId` + `status` indexing |
| **Cost** | ✅ Budgeted | Gemini API for bundle suggestions (~$0.01/call) |
| **LLM** | ✅ Complete | Genkit/Gemini for natural language parsing + suggestions |
| **Compliance** | ❌ Partial | No state-level BOGO restrictions enforced |
| **Dependencies** | ✅ Complete | Firestore, Genkit, Product sync (publicViews) |

---

## 4. Implementation Plan

### Phase 1: Core Bundle CRUD ✅ COMPLETE
- [x] 5 bundle types (BOGO, mix-match, percentage, fixed-price, tiered)
- [x] CRUD operations with validation
- [x] Firestore schema + indexing
- [x] Bundle preview card UI

### Phase 2: AI-Powered Suggestions ✅ COMPLETE
- [x] Natural language rule parsing (Gemini)
- [x] AI bundle suggestions (inventory analysis)
- [x] Price recommendation engine
- [x] Manual bundle builder with AI assist

### Phase 3: Public Menu Display ✅ COMPLETE
- [x] Bundle carousel with smooth scroll
- [x] Savings badges and CTAs
- [x] Active bundles query (composite index)

### Phase 4: Scheduling & Automation ❌ INCOMPLETE
- [ ] Cron job for scheduled→active→expired transitions
- [ ] Time/day-of-week window enforcement
- [ ] Auto-expiration of bundles

### Phase 5: Redemption Tracking ❌ INCOMPLETE
- [ ] Firestore trigger on order confirmation
- [ ] Atomic increment of redemption counts
- [ ] Per-customer limit enforcement
- [ ] Redemption history audit trail

### Phase 6: Co-op Proposals ❌ NOT IMPLEMENTED
- [ ] Brand proposal UI
- [ ] Dispensary accept/reject workflow
- [ ] Brand contribution tracking

### Phase 7: Analytics ❌ NOT IMPLEMENTED
- [ ] Redemption rate tracking
- [ ] AOV impact analysis
- [ ] Revenue/margin trends by bundle

---

## 5. Test Plan

### Unit Tests ✅
- [x] Create bundle with valid data
- [x] Get bundles filtered by orgId
- [x] Update bundle (partial update)
- [x] Delete bundle

### Integration Tests (Missing)
- [ ] Scheduled bundle transitions (cron)
- [ ] Redemption limit enforcement (global + per-customer)
- [ ] Natural language complex rules (multi-condition)
- [ ] Price recommendation edge cases
- [ ] State compliance checks
- [ ] Co-op proposal workflow

---

## 6. Rollback Plan

| Component | Strategy | Effort | Impact |
|-----------|----------|--------|--------|
| Core CRUD | Single commit revert | 5 min | Bundle creation disabled; existing data intact |
| AI features | Feature flag `ENABLE_AI_BUNDLE_SUGGESTIONS` | 2 min | Users fall back to manual builder |
| Public carousel | Feature flag `SHOW_BUNDLE_DEALS` | 1 min | Menu shows without bundles |
| Cron job | Disable Cloud Scheduler | 1 min | Bundles don't auto-transition |
| Redemption tracking | Disable Firestore trigger | 1 min | Limits never enforced |

---

## 7. Success Criteria

### Functional
- [x] Create bundles via form (5 types, scheduling, limits)
- [x] Fetch bundles on dashboard
- [x] Display bundles on public menu (carousel)
- [x] AI rule parsing generates suggestions
- [x] Manual bundle builder with price recommendation
- [ ] Scheduled bundles auto-activate at startDate (MISSING)
- [ ] Redemption limits enforced at checkout (MISSING)
- [ ] Co-op bundle proposals (MISSING)

### Performance
- [x] `getActiveBundles(orgId)` <500ms with composite index
- [x] `fetchEligibleBundleProducts()` <1s for 1000 products
- [ ] Cron transitions 100 bundles <5s (MISSING)
- [ ] Redemption atomic increment <100ms (MISSING)

### Reliability
- [x] Firestore index created
- [x] Timestamp serialization handled
- [x] Error handling on CRUD
- [ ] Redemption trigger has retry logic (MISSING)
- [ ] Scheduled transition cron logs failures (MISSING)

---

## Known Gaps

| Gap | Severity | Notes |
|-----|----------|-------|
| Cron job missing for auto-transitioning bundle status | 🔴 Critical | Scheduled bundles never activate; expired bundles never hide |
| Redemption tracking incomplete | 🔴 Critical | `maxRedemptions` + `perCustomerLimit` fields ignored at checkout |
| Price recommendation sometimes returns out-of-range values | 🟡 High | Edge case when AI confidence low |
| Natural language rule parsing fails silently on complex constraints | 🟡 High | Multi-condition rules only parse first condition |
| Co-op bundle proposal workflow not implemented | 🟡 High | Revenue-blocking for brand-led programs |
| No analytics dashboard | 🟡 High | No visibility into bundle performance |
| State-level compliance restrictions missing | 🟡 High | Legal risk in multi-state deployments |

---

**Generated:** 2026-02-20
**Status:** 🟡 Partial (70% Complete)
**Critical Blockers:** 2 (Scheduling, Redemption tracking)
