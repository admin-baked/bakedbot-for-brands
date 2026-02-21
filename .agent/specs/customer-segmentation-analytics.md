# Production Spec: Customer Segmentation & Analytics System

**Last updated:** 2026-02-20
**Spec status:** 🟡 Partial - Gaps Identified
**Owner agent(s):** Smokey (budtender), Leo (COO)
**Tier:** 3 Priority 4 (Revenue Features)

---

## 1. Intent (Why)

Enable brand and dispensary admins to understand customer behavior through automatic segmentation, revenue analytics, cohort retention analysis, and AI-generated insights. Support targeted retention campaigns, win-back initiatives, and data-driven merchandising decisions through 8 predefined behavioral segments (VIP, Loyal, New, At Risk, Slipping, Churned, High Value, Frequent).

---

## 2. Scope (What)

### Files Affected

#### Dashboard Pages
- `src/app/dashboard/segments/` — Segments page with cards and customer counts
- `src/app/dashboard/analytics/` — Analytics dashboard with KPIs, cohort heatmap, funnel tracking

#### Services & Tools
- `src/server/services/order-analytics.ts` — Product sales tracking, velocity calculation
- `src/server/services/insights/generators/customer-insights-generator.ts` — AI insight cards

#### Actions
- `src/app/dashboard/analytics/actions.ts` — Analytics data fetch, affinity pairs, cohort analysis
- `src/app/dashboard/segments/actions.ts` — Segment counts

#### Types
- `src/types/customers.ts` — `CustomerProfile`, `CustomerSegment`, `SegmentThresholds`, segment calculation logic

#### Tests
- `src/app/dashboard/segments/__tests__/orgid-resolution.test.ts` — 6 unit tests

### Files NOT Touched
- Campaign sender (segment targeting not wired)
- Machine learning models (churn prediction not implemented)

### Diff Size
**Total:** ~1,500 lines (pages + services + types + tests)

---

## 3. Boundary Check

| Domain | Status | Notes |
|--------|--------|-------|
| **Auth** | ✅ Complete | Role-based access (`brand`, `dispensary`, `super_user`) |
| **Payment** | ✅ N/A | Analytics affects strategy, not payments |
| **Schema** | ✅ Complete | Firestore orders, customers, analytics collections |
| **Cost** | ✅ Negligible | Firestore reads <$1/month for typical org |
| **LLM** | ✅ Complete | Claude API for insight generation (Smokey) |
| **Compliance** | ✅ N/A | No PII logged in insights |
| **Dependencies** | ✅ Complete | Firestore, Claude API (Smokey agent) |

---

## 4. Implementation Plan

### Phase 1: Core Foundation ✅ COMPLETE
- [x] Segment classification (8 types, configurable thresholds)
- [x] Segments page UI (cards, counts, AI suggestions stubbed)
- [x] Analytics dashboard (KPIs, cohort heatmap, funnel, channels)
- [x] Order analytics service (sales velocity, trending)
- [x] Customer insights generator (3 insight cards)
- [x] Affinity pair calculation
- [x] Repeat purchase rate
- [x] Authorization checks

### Phase 2: Segment Targeting ⚠️ IN PROGRESS
- [ ] Custom segment builder backend
- [ ] Campaign pre-population from segments
- [ ] Segment filter on customers page (fully functional)
- [ ] Custom thresholds per org

### Phase 3: Advanced Analytics ❌ PENDING
- [ ] Affinity pair UI (chart/table)
- [ ] Cohort enhancements (pagination, drill-down, CSV export)
- [ ] Churn rate definition + calculation
- [ ] Campaign performance metrics

### Phase 4: Predictive Analytics ❌ RESEARCH
- [ ] Churn prediction model
- [ ] LTV forecasting

### Phase 5: Real-time & Scale ❌ OPTIMIZATION
- [ ] Segment membership real-time updates
- [ ] Cohort calculation scale (24+ months)
- [ ] Caching strategy (segment counts)

---

## 5. Test Plan

### Unit Tests ✅
- [x] orgId resolution (6 test cases)

### Integration Tests (Missing)
- [ ] `calculateSegment()` — all 8 segment classifications
- [ ] Affinity pair generation
- [ ] Cohort retention calculation
- [ ] `recordProductSale()` — velocity calc, trending flag
- [ ] Churn Risk insight — severity escalation
- [ ] Analytics page — fetch data, render KPIs
- [ ] Segments page — load counts, AI suggestions
- [ ] Cohort heatmap — render table, color coding
- [ ] Segment targeting flow — campaign pre-populate
- [ ] Multi-brand isolation — verify org B data blocked
- [ ] Large order history — 10k orders <3s

---

## 6. Rollback Plan

| Component | Strategy | Effort | Impact |
|-----------|----------|--------|--------|
| Segments page | Single commit revert | 5 min | Segments not visible; analytics unaffected |
| Analytics dashboard | Single commit revert | 5 min | Dashboard unavailable; segments still work |
| Order analytics | Disable cron rollup | 2 min | Velocity/trending stops updating |
| Insights generator | Disable Smokey API calls | 1 min | AI suggestions empty; manual insights required |

---

## 7. Success Criteria

### Functional
- [x] Segments page displays 8 segments with counts
- [x] Analytics dashboard shows revenue, orders, AOV
- [x] Order analytics tracks sales velocity and trending
- [x] Smokey generates 3 insight cards
- [x] Affinity pairs calculated (top 5)
- [x] Repeat purchase rate calculated
- [ ] Custom segments UI functional (STUBBED)
- [ ] Churn rate calculated (HARDCODED 0)
- [ ] Affinity pair visualization (DATA EXISTS, UI MISSING)
- [ ] Campaign targeting pre-populated (LINK EXISTS, NO PRE-FILL)
- [ ] Churn prediction (NOT IMPLEMENTED)
- [ ] LTV forecasting (NOT IMPLEMENTED)
- [ ] Real-time segment updates (PAGE REFRESH REQUIRED)

### Performance
- [x] Segments page loads <1.5s
- [x] Analytics dashboard renders <2s for <10k orders
- [x] Cohort heatmap renders instantly
- [ ] Cohort calculation scales to 24+ months (CURRENTLY 12)
- [ ] Affinity analysis <500ms (MAY EXCEED ON 100K ORDERS)

### Reliability
- [x] Error handling returns safe defaults
- [x] Authorization enforced (multi-brand isolation)
- [x] Edge cases handled (no data, cohort <2)
- [ ] Real-time updates (STALE COUNTS)
- [ ] Failover (PARTIAL IMPLEMENTATION)

---

## Known Gaps

| Gap | Severity | Notes |
|-----|----------|-------|
| Custom segment creation backend | 🟡 High | UI stubbed ("Coming Soon") |
| Churn rate metric | 🟡 High | Hardcoded to 0 |
| Affinity pair UI missing | 🟡 High | Data calculated, no visualization |
| Cohort pagination / expansion | 🟡 High | Table shows last 12 months only |
| Segment-based campaign pre-population | 🟡 High | Intent clear, segment not passed |
| Churn prediction model | 🔴 Critical | No ML/feature engineering |
| LTV forecasting | 🟡 High | Only historical LTV |
| Real-time segment updates | 🟢 Low | Page refresh required |
| Cohort drill-down UI | 🟢 Low | Can't see customer list |
| Custom thresholds per org | 🟡 High | Hardcoded in defaults |
| Affinity pair filtering | 🟡 High | No min threshold |
| Campaign ROI metrics | 🟡 High | No conversion tracking |

---

**Generated:** 2026-02-20
**Status:** 🟡 Partial (65% Complete)
**Critical Blockers:** 1 (Churn prediction)
**High Priority Gaps:** 8
