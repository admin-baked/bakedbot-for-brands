# Production Spec: Loyalty & Rewards System

**Last updated:** 2026-02-20
**Spec status:** 🟡 Partial - Gaps Identified
**Owner agent(s):** Craig (Marketer), Leo (Operations)
**Tier:** 3 Priority 2 (Revenue Features)

---

## 1. Intent (Why)

Enable cannabis dispensaries to manage sophisticated customer retention programs with multi-tiered benefits, points-based redemption, and AI-driven customer segmentation. Integrate with Alpine IQ (external loyalty source of truth) and Alleaves POS to calculate earned points, automatically assign loyalty tiers (Bronze/Silver/Gold/Platinum), and provide operators with granular controls over earning rates, tier benefits, segment definitions, and discount program visibility on public menus.

---

## 2. Scope (What)

### Files Affected

#### Settings & Configuration
- `src/app/dashboard/settings/loyalty/page.tsx` (880 lines) — 5-tab interface (Points, Tiers, Segments, Redemptions, Menu Display)
- `src/server/actions/loyalty-settings.ts` (217 lines) — CRUD + public settings fetch
- `src/app/actions/loyalty.ts` (52 lines) — Legacy actions

#### Dashboard & UI
- `src/app/dashboard/loyalty/page.tsx` (240 lines) — Loyalty dashboard, sync button, stats
- `src/components/dashboard/loyalty/badge-grid.tsx` (60 lines) — Badge display (mockup)
- `src/components/demo/menu-info-bar.tsx` (110 lines) — Public menu bar

#### Backend Services
- `src/app/api/loyalty/sync/route.ts` (635 lines) — POST/GET endpoints, auth, org resolution
- `src/server/services/loyalty-sync.ts` (100+ lines) — Core sync logic
- `src/server/services/gamification.ts` (100+ lines) — Streak tracking

#### Types & Configuration
- `src/types/customers.ts` (355 lines) — `LoyaltySettings`, `LoyaltyTier`, `RedemptionTier`, `CustomerProfile`, segment definitions

### Files NOT Touched
- Checkout system (redemption workflow incomplete)
- Campaign sender (segment targeting not wired)

### Diff Size
**Total:** ~2,600 lines (settings + services + components + types)

---

## 3. Boundary Check

| Domain | Status | Notes |
|--------|--------|-------|
| **Auth** | ✅ Complete | `dispensary_admin` or `super_user` required for settings |
| **Payment** | ✅ N/A | Loyalty programs affect retention, not payment flow |
| **Schema** | ✅ Complete | Firestore `tenants/{orgId}/settings/loyalty` |
| **Cost** | ✅ Negligible | Alpine IQ API calls <$0.01/month |
| **LLM** | ✅ Complete | Smart voice defaults via Gemini |
| **Compliance** | ✅ N/A | Internal program, no regulatory constraints |
| **Dependencies** | ✅ Complete | Alleaves POS, Alpine IQ, Firestore |

---

## 4. Implementation Plan

### Phase 1: Settings UI ✅ COMPLETE
- [x] 5-tab settings interface
- [x] Points earning configuration (1-10 pts/$, equity multiplier)
- [x] Tier management (4 default tiers + custom)
- [x] Segment thresholds (12 configurable)
- [x] Redemption tiers (points → dollar conversion)
- [x] Menu display configuration

### Phase 2: Dashboard & Sync ✅ COMPLETE
- [x] Loyalty dashboard with sync stats
- [x] "Sync Now" button
- [x] Badge grid (hardcoded mockup)
- [x] Last sync timestamp
- [x] Data source legend

### Phase 3: Menu Integration ✅ COMPLETE
- [x] MenuInfoBar component
- [x] Configurable loyalty tagline
- [x] Discount programs display
- [x] Delivery info section

### Phase 4: Points Calculation Engine ❌ INCOMPLETE
- [ ] Points formula: `spent * pointsPerDollar * equity_multiplier`
- [ ] Fractional points rounding
- [ ] Equity eligibility verification

### Phase 5: Tier Advancement Logic ❌ INCOMPLETE
- [ ] Automatic tier assignment based on spend thresholds
- [ ] Tier demotion after inactivity
- [ ] Scheduled tier recalculation

### Phase 6: Redemption Workflow ❌ INCOMPLETE
- [ ] Checkout integration
- [ ] Points deduction on redemption
- [ ] Partial redemption support
- [ ] Insufficient points handling

### Phase 7: Gamification ⚠️ PARTIAL
- [x] Streak tracking (current, longest)
- [ ] Badge earning logic (6 badges defined, not wired)
- [ ] Event listeners for milestones

### Phase 8: Campaign Integration ❌ NOT IMPLEMENTED
- [ ] Segment-based auto-triggers
- [ ] Birthday bonus automation
- [ ] Referral points awarding

---

## 5. Test Plan

### Unit Tests ✅
- [x] `GamificationService` streak tracking
- [x] Segment calculation (8 types)

### Integration Tests (Missing)
- [ ] Points calculation with equity multiplier
- [ ] Tier advancement boundary conditions
- [ ] Tier demotion after inactivity
- [ ] Redemption point deduction
- [ ] Partial redemption
- [ ] Negative balance prevention
- [ ] Alpine IQ sync override
- [ ] Segment reassignment on order
- [ ] Badge earning on milestone

---

## 6. Rollback Plan

| Component | Strategy | Effort | Impact |
|-----------|----------|--------|--------|
| Settings UI | Single commit revert | 5 min | Config changes lost; loyalty program continues with defaults |
| Sync API | Disable cron endpoint | 2 min | Points don't update; manual sync required |
| Menu bar | Feature flag `showBar: false` | 1 min | Loyalty info hidden on public menu |
| Gamification | Remove event listeners | 5 min | Streaks/badges stop updating |

---

## 7. Success Criteria

### Functional
- [ ] Points earning rate applies correctly on every order
- [ ] Equity multiplier applies to eligible applicants
- [ ] Tier advancement triggers automatically when spend crosses threshold
- [ ] Tier benefits display correctly on public menu
- [ ] Discount programs render with correct icon + description
- [ ] Redemption exchange rates calculate correctly
- [ ] Segment reassignment runs on every order sync
- [ ] Alpine IQ sync overrides calculated points if discrepancy >10%
- [ ] Delivery info bar shows min/fee/radius when enabled

### Performance
- [x] Loyalty settings fetch <500ms (cached)
- [ ] Batch customer sync (1,000 customers) <60s
- [x] Menu info bar renders <100ms
- [ ] Tier advancement check <1s on order completion

### Reliability
- [x] Only dispensary_admin can modify settings
- [x] Cron endpoint validates Bearer token
- [x] Public endpoint returns no customer data
- [ ] Points history logged to customer_activities
- [ ] Equity multiplier never revealed in UI
- [ ] Discrepancy alerts logged (not sent to customers)

---

## Known Gaps

| Gap | Severity | Notes |
|-----|----------|-------|
| Points calculation engine incomplete | 🔴 Critical | Core formula not visible in reviewed code |
| Tier advancement logic not documented | 🔴 Critical | Backend logic missing for tier assignment |
| Redemption workflow incomplete | 🔴 Critical | Checkout integration not found |
| Badge earning hardcoded mockup | 🟡 High | Real earning logic depends on event listeners |
| Alpine IQ integration stubbed | 🟡 High | Fallback behavior if Alpine down not specified |
| Missing reconciliation workflow for discrepancies | 🟡 High | No UI to resolve conflicts |
| Bulk redemption reporting unavailable | 🟡 High | No dashboard tab for redemption metrics |
| Loyalty pause feature missing | 🟡 High | Cannot disable without deleting settings |
| Tier demotion not implemented | 🟡 High | Customers stuck in tier after reaching threshold |
| Points deduction on redemption missing | 🟡 High | Customers can redeem infinite times |
| Referral rewards not wired | 🟡 High | `referralCode` field exists, no logic |
| Campaign automation for segments missing | 🟡 High | Segments calculated, no auto-triggers |

---

**Generated:** 2026-02-20
**Status:** 🟡 Partial (60% Complete)
**Critical Blockers:** 3 (Points calc, Tier advancement, Redemption)
**Estimated Effort:** 3-4 weeks (80-120 eng hours)
