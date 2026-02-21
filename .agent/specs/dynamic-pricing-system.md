# Production Spec: Dynamic Pricing System

**Last updated:** 2026-02-20
**Spec status:** 🟡 Partial - Gaps Identified
**Owner agent(s):** Linus (code), Ezal (competitive intel), Smokey (execution)
**Tier:** 3 Priority 3 (Revenue Features)

---

## 1. Intent (Why)

Autonomous revenue optimization engine that adjusts product prices in real-time based on competitor intelligence, inventory age, demand signals, and margin targets. Enables dispensary brands to maintain competitive margins, respond to market shifts within minutes, and automate tactical pricing decisions without manual intervention.

---

## 2. Scope (What)

### Files Affected

#### Core Implementation
- `src/app/actions/dynamic-pricing.ts` (1,513 lines) — Rule CRUD, evaluation, price calculation, analytics
- `src/server/services/ezal/competitor-pricing.ts` (100+ lines) — Competitor price queries with fuzzy matching
- `src/server/services/alleaves/inventory-intelligence.ts` — Product age, velocity, turnover

#### Types
- `src/types/pricing.ts` + `src/types/dynamic-pricing.ts` (525 lines total)

#### Dashboard UI
- `src/app/dashboard/pricing/page.tsx` + components — KPI grid, rules list, analytics, inventory intelligence

#### Tests
- `src/app/actions/__tests__/dynamic-pricing.test.ts`
- `src/server/services/ezal/__tests__/competitor-pricing.test.ts`

### Files NOT Touched
- Cloud Scheduler (auto-pricing cron missing)
- Compliance system (state-level restrictions not enforced)

### Diff Size
**Total:** ~2,200 lines (actions + services + types + UI + tests)

---

## 3. Boundary Check

| Domain | Status | Notes |
|--------|--------|-------|
| **Auth** | ✅ Complete | Only brand/dispensary admins can create/edit rules |
| **Payment** | ✅ N/A | Pricing affects revenue, not payment flow |
| **Schema** | ✅ Complete | Firestore `pricing_rules`, `price_adjustments` collections |
| **Cost** | ✅ Budgeted | Claude Haiku for bundle pricing (~$0.01/call) |
| **LLM** | ✅ Complete | Claude Haiku for bundle price suggestions |
| **Compliance** | ❌ Partial | No state-level BOGO/tiered discount restrictions |
| **Dependencies** | ✅ Complete | Ezal, Alleaves POS, Firestore, Next.js ISR |

---

## 4. Implementation Plan

### Phase 1: Core Engine ✅ COMPLETE
- [x] Rule CRUD with 7 condition types
- [x] Price calculation with min/max constraints
- [x] Three adjustment types (percentage, fixed amount, set price)
- [x] 5-minute cache for inventory + competitor data

### Phase 2: Alleaves Integration ✅ COMPLETE
- [x] Two-way sync (BakedBot rules → Alleaves discounts)
- [x] Batch sync with error handling
- [x] Discount format conversion

### Phase 3: Public Menu Publishing ✅ COMPLETE
- [x] Single product price application
- [x] Batch apply all active rules
- [x] Revert functionality
- [x] ISR revalidation

### Phase 4: Competitive Intel ✅ COMPLETE
- [x] Ezal competitor pricing integration
- [x] Fuzzy product name matching
- [x] Price history extraction (7 days)

### Phase 5: Real-Time Automation ❌ INCOMPLETE
- [ ] Blackout period enforcement
- [ ] Auto-pricing cron job (hourly)
- [ ] Velocity signal detection

### Phase 6: Risk Management ❌ INCOMPLETE
- [ ] Approval workflow for high-impact changes
- [ ] Confidence scoring on opportunities
- [ ] Slack notifications for pending approvals

### Phase 7: Resilience ❌ NOT IMPLEMENTED
- [ ] Ezal fallback strategy (heuristic pricing)
- [ ] POS sync retry logic
- [ ] ISR cache optimization

---

## 5. Test Plan

### Unit Tests ✅
- [x] Dynamic pricing CRUD
- [x] Price calculation with caching
- [x] Rule evaluation (all 7 condition types)
- [x] Alleaves sync
- [x] Menu publishing
- [x] Competitive pricing with fuzzy matching

### Integration Tests (Missing)
- [ ] Blackout period enforcement
- [ ] Velocity signal detection
- [ ] Confidence scoring
- [ ] Approval workflow
- [ ] POS sync retry
- [ ] ISR cache invalidation
- [ ] Concurrent rule evaluation
- [ ] Price constraint enforcement
- [ ] Ezal fallback
- [ ] Bundle pricing

---

## 6. Rollback Plan

| Component | Strategy | RTO | Data Loss |
|-----------|----------|-----|-----------|
| Pricing rule | Single rule deactivation | <1 min | None |
| All menu prices | `revertAllPricesOnMenu(orgId)` | <1 min | None |
| Alleaves sync | `deactivateRuleInAlleaves(ruleId)` | 5-10 min | None |
| Broken cron job | Disable Cloud Scheduler | <1 min | None |
| Stale competitor data | Override to heuristic | <1 min | None |
| Full restore | Firestore point-in-time backup | 30 min | Possible if backup stale |

---

## 7. Success Criteria

### Functional
- [x] Rules evaluate conditions correctly
- [x] Price adjustments apply in priority order
- [x] Min/max constraints enforced
- [x] Three adjustment types supported
- [ ] Blackout periods enforced (MISSING)
- [ ] Real-time auto-pricing (MISSING)
- [ ] Velocity signals generated (MISSING)
- [x] Competitor pricing integrated
- [x] Alleaves POS sync
- [x] Public menu publishing
- [ ] Approval workflow (MISSING)
- [x] Bundle pricing suggestions

### Performance
- [x] Price calculation <100ms (cached)
- [x] Rule evaluation O(N) linear time
- [ ] Batch publish (1,000 products) <30s (MISSING)
- [ ] ISR cache invalidation <10s (MISSING)

### Reliability
- [x] Graceful degradation if Alleaves unavailable
- [x] Graceful degradation if Ezal unavailable
- [x] All changes audit-logged
- [x] Revert functionality
- [ ] POS sync retries (MISSING)

---

## Known Gaps

| Gap | Severity | Notes |
|-----|----------|-------|
| Blackout periods not enforced | 🟡 High | Add check to `evaluateRuleConditions()` |
| Real-time auto-pricing missing | 🟡 High | No cron job to execute `publishPricesToMenu()` |
| Velocity signals not wired | 🟡 High | `velocityTrend` not mapped to rule conditions |
| Approval workflow not implemented | 🟡 High | No Slack notification or UI form |
| Confidence scoring not populated | 🟢 Medium | Engine defines field but never calculates |
| Ezal fallback incomplete | 🟢 Medium | No heuristic if competitor data stale |
| ISR cache not optimized | 🟢 Medium | Only revalidates brand page, not sub-routes |
| POS sync failures not retried | 🟢 Low | No exponential backoff retry |
| Bundle pricing hardcoded 30% margin | 🟢 Low | No org-specific config |
| No A/B testing framework | 🟢 Low | All rules apply to 100% of traffic |

---

**Generated:** 2026-02-20
**Status:** 🟡 Partial (75% Complete)
**Critical Blockers:** 0
**High Priority Gaps:** 4 (Blackout, Auto-pricing, Velocity, Approval)
