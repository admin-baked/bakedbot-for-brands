# Production Spec: CRM + Loyalty

**Last updated:** 2026-02-19
**Spec status:** 🔴 Gaps Identified
**Owner agent(s):** Craig (Marketer), Smokey (Budtender)
**Tier:** 3 — Supporting Systems

---

## 1. Feature Overview

CRM + Loyalty is the customer data platform for dispensaries and brands, combining customer profiling with points-based rewards and segmentation. It tracks customer order history, lifetime value, segments (Loyal/VIP/At-Risk/Churned), points accrual (from orders), tiers (Bronze/Silver/Gold based on spend thresholds), and SMS/email engagement. Hybrid system with dual sources of truth: Alpine IQ (for orgs with Alpine integration) and Firestore (`customers` collection, calculated from orders). Settings page (`/dashboard/settings/loyalty`) configures points earning rate (`pointsPerDollar`), tiers (spend thresholds + benefits), customer segments (thresholds for Loyal/VIP/At-Risk), redemption tiers (points → dollar value), and public menu display (loyalty tagline, discount programs, delivery info).

---

## 2. Current State

### Shipped ✅
- **Customer profiles**: `customers` Firestore collection with fields: `name`, `phone`, `email`, `orgId`, `tier`, `lifetimeValue`, `orderCount`, `avgOrderValue`, `segment`, `pointsFromOrders`, `lastOrderDate`, `tags` (`src/types/customers.ts:14-90`)
- **Points accrual**: Calculated from orders — `pointsPerDollar` setting (default 1pt/$1) with `equityMultiplier` for social equity license holders (`src/types/customers.ts:141-143`)
- **Loyalty tiers**: Configurable tiers (Bronze/Silver/Gold/Platinum) with spend thresholds, colors, benefits list (`src/types/customers.ts:105-113`)
- **Customer segments**: 9 segments (Loyal, VIP, High Value, Frequent, Slipping, At Risk, Churned, New, Casual) with configurable thresholds (`src/types/customers.ts:24-58, 92-103`)
- **Loyalty settings page**: 5 tabs (Points, Tiers, Segments, Redemptions, Menu Display) with save/reset functionality (`src/app/dashboard/settings/loyalty/page.tsx`)
- **Redemption tiers**: Points-to-dollar conversion tiers (e.g. 500pts = $25 off) with customizable `pointsCost`, `rewardValue`, `description` (`src/types/customers.ts:115-121`)
- **Menu display settings**: Public menu loyalty bar with configurable tagline, discount programs (Military/Senior/Student/Medical), delivery info (minimum, fee, radius, drive-thru), toggle for show/hide (`src/types/customers.ts:129-166`)
- **Loyalty tools**: `checkPoints()` hybrid lookup (Alpine IQ + Firestore calculated points), `sendSms()` via Blackleaf (`src/server/tools/loyalty.ts`)
- **CRM dashboard**: `/dashboard/customers` page loads customer list, segments, lifetime value, order counts (client-side load to avoid server timeout with 2500+ customers) (`src/app/dashboard/customers/page.tsx`)

### Partially Working ⚠️
- **Alpine IQ hybrid system**: `checkPoints()` fetches Alpine IQ + Firestore points, calculates discrepancy, but NO auto-sync or reconciliation logic (10% threshold exists but not acted upon)
- **Segment calculation**: Thresholds configurable but segment assignment logic NOT centralized — scattered across codebase with no single source of truth
- **Points redemption**: `redemptionTiers` defined in settings but NO checkout integration (no way for customers to actually redeem points)
- **Customer tags**: `tags` field exists on `CustomerProfile` type but NO UI to add/edit/filter by tags
- **Email engagement tracking**: `lastEmailOpen`, `lastEmailClick` fields on `CustomerProfile` but NO Mailjet webhook integration to populate them
- **SMS engagement tracking**: `lastSmsClick` field exists but NO Blackleaf webhook to track clicks
- **Tier benefits**: Tiers have `benefits` array but NO enforcement layer (no auto-discounts, no perks at checkout)

### Not Implemented ❌
- **Points ledger**: No transaction log showing how points were earned/redeemed (no audit trail)
- **Points expiration**: No `expiresAt` field on points — points never expire
- **Manual points adjustment**: No admin tool to add/subtract points (e.g. compensate for issue)
- **Referral tracking**: No referral program (invite friend → earn bonus points)
- **Birthday/anniversary rewards**: No automated birthday/sign-up anniversary campaigns
- **Customer export**: No CSV export of customer list (for external analytics)
- **Customer import**: No CSV import to bulk-load customers
- **Merge duplicates**: No deduplication logic (same phone/email with different records)
- **Unsubscribe management**: No centralized opt-out tracking (SMS/email opt-outs scattered)
- **Segment-based campaigns**: No UI to "send campaign to all VIP customers" (segment→campaign bridge missing)

---

## 3. Acceptance Criteria

### Functional
- [ ] User can view customer list with segments, tiers, lifetime value, order counts, points balance
- [ ] User can configure points earning rate (`pointsPerDollar`) and equity multiplier
- [ ] User can configure loyalty tiers (name, threshold, color, benefits) and save changes
- [ ] User can configure segment thresholds (Loyal, VIP, At-Risk, etc.) and changes take effect on next sync
- [ ] User can configure redemption tiers (points cost, reward value, description)
- [ ] User can configure menu display settings (loyalty tagline, discount programs, delivery info) and changes appear on public menu
- [ ] Customer profiles auto-update on order sync (lifetimeValue, orderCount, lastOrderDate, points)
- [ ] Customer segments auto-assign based on configured thresholds (order count, lifetime value, AOV, days inactive)
- [ ] `checkPoints()` returns Alpine IQ points (if integrated) OR calculated Firestore points
- [ ] Public menu shows loyalty tagline and discount programs (if enabled in settings)

### Compliance / Security
- [ ] Customer PII (phone, email, name) MUST be encrypted at rest (Firestore security rules)
- [ ] Only dispensary/brand admin can access `/dashboard/customers` (budtender has read-only)
- [ ] Only org owner can edit loyalty settings (role gate on `/dashboard/settings/loyalty`)
- [ ] SMS opt-out status MUST be respected (no messages to opted-out customers)
- [ ] Email opt-out status MUST be respected (no emails to unsubscribed customers)
- [ ] Customer data MUST NOT be shared across orgs (orgId scoping on all queries)

### Performance
- [ ] Customer list loads in < 3s for orgs with < 1000 customers (client-side pagination)
- [ ] Customer list loads in < 10s for orgs with 2500+ customers (incremental fetch)
- [ ] Loyalty settings page loads in < 1s (single Firestore doc read)
- [ ] Points lookup (`checkPoints`) completes in < 2s (Alpine IQ API + Firestore query)
- [ ] Segment recalculation runs in background (no UI blocking during sync)

---

## 4. Known Gaps / Tech Debt

| Gap | Severity | Notes |
|-----|----------|-------|
| No points redemption at checkout | 🔴 Critical | Redemption tiers configured but no way for customers to actually redeem points |
| No points ledger/audit trail | 🔴 Critical | No transaction log — can't answer "how did customer earn 500 points?" |
| Segment logic scattered | 🟡 High | Segment assignment not centralized — inconsistent behavior across codebase |
| No Alpine IQ auto-sync | 🟡 High | Hybrid system detects discrepancies but doesn't reconcile (manual fix required) |
| No manual points adjustment UI | 🟡 High | No way for admin to compensate customer (add points for issue) |
| No tier benefit enforcement | 🟡 High | Tiers have benefits list but no auto-discounts or checkout perks |
| No customer tags UI | 🟡 High | Tags field exists but no way to add/edit/filter by tags in CRM dashboard |
| No email/SMS engagement webhooks | 🟡 High | `lastEmailOpen`/`lastSmsClick` fields exist but never populated |
| No CSV export | 🟡 High | No way to export customer list for external analytics |
| No referral program | 🟢 Low | No invite-friend mechanism to grow customer base |
| No birthday/anniversary rewards | 🟢 Low | No automated lifecycle campaigns |
| No duplicate merge tool | 🟢 Low | Same phone/email creates multiple records — no deduplication |
| No segment-based campaign UI | 🟢 Low | No "send to all VIP customers" bridge (Craig must manually filter) |

---

## 5. Test Coverage

### Existing Tests
| Test | Location | Coverage |
|------|----------|---------|
| Customer types | `src/types/__tests__/customers.test.ts` | Validates `CustomerProfile`, `LoyaltySettings` types |
| Loyalty tools | `tests/server/tools/loyalty.test.ts` | Validates `checkPoints()`, `sendSms()` functions |
| Loyalty actions | `tests/actions/loyalty.test.ts` | Validates `updateLoyaltySettings()`, `updateSegmentThresholds()` |

### Missing Tests (Required for Production-Ready)
- [ ] `crm-segment-assignment.unit.test.ts` — validates segment logic (Loyal/VIP/At-Risk) for given customer data
- [ ] `crm-points-accrual.unit.test.ts` — validates `pointsPerDollar` calculation with equity multiplier
- [ ] `crm-tier-assignment.unit.test.ts` — validates tier assignment based on `lifetimeValue` vs thresholds
- [ ] `crm-alpine-hybrid.integration.test.ts` — validates Alpine IQ + Firestore reconciliation logic
- [ ] `crm-loyalty-settings.integration.test.ts` — validates settings page save/load flow
- [ ] `crm-menu-display.e2e.test.ts` — validates public menu shows loyalty tagline + discount programs

### Golden Set Eval
Not applicable (CRM is primarily data management — no LLM/agent behavior to test).

---

## 6. Dependencies

### Internal
| System | Why needed | Failure mode |
|--------|-----------|-------------|
| Firestore `customers` collection | Stores customer profiles, points, segments | CRM dashboard empty (no customer data) |
| Firestore `tenants/{orgId}` doc | Stores loyalty settings (tiers, thresholds, redemptions) | Settings page loads defaults (no customization) |
| Orders sync | Updates customer profiles (lifetimeValue, orderCount, lastOrderDate) | Customer data stale (no points accrual, no segment updates) |
| requireUser | Auth gate for CRM dashboard | Public access to customer PII (CRITICAL security failure) |

### External Services
| Service | Purpose | Fallback |
|---------|---------|---------|
| Alpine IQ | Hybrid loyalty source of truth (if integrated) | Firestore-only mode — use calculated points from orders |
| Blackleaf | SMS sending for loyalty campaigns | None — `sendSms()` fails, no SMS outreach |
| Mailjet | Email sending for loyalty campaigns | None — no email campaigns possible |

---

## 7. Degraded Mode

- **If Alpine IQ is down:** Fall back to Firestore-calculated points. `checkPoints()` returns `source: 'calculated'` only. NO reconciliation data.
- **If Firestore `customers` collection unavailable:** CRM dashboard shows "Customer data unavailable" error. Settings page loads but can't fetch existing settings (shows defaults).
- **If orders sync fails:** Customer profiles NOT updated with latest purchases. Points, lifetimeValue, segment data stale until sync recovers.
- **If Blackleaf API down:** SMS campaigns fail silently. `sendSms()` returns `{ success: false }`. No retry logic.
- **Data loss risk:** If segment thresholds changed without customer recalculation, segments stale. Mitigation: background job to recalculate all customers on threshold update.

---

## 8. Open Questions

1. **Points redemption at checkout**: Should we integrate with POS (Alleaves, Dutchie) or build our own checkout flow?
2. **Points ledger**: Should we create separate `loyalty_transactions` collection (high write volume) or embed ledger in `customers` doc (simpler, limited size)?
3. **Segment recalculation**: Should segment updates happen real-time (on every order) or batch (nightly cron)? Real-time → higher Firestore costs.
4. **Alpine IQ reconciliation**: Should we auto-sync discrepancies (overwrite Firestore with Alpine) or flag for manual review?
5. **Tier benefits enforcement**: Should tier benefits auto-apply as discounts at checkout, or just show as "perks" (manual validation by budtender)?
6. **Customer export format**: CSV only, or also JSON/Excel? Should export include PII (phone, email) or be anonymized?
7. **Referral tracking**: Should referrals grant points to both referrer + referee? What's the points amount (fixed or % of first order)?
8. **Duplicate merge**: Should we auto-merge on phone/email match, or require manual admin approval?

---

## Revision History

| Date | Author | Change |
|------|--------|--------|
| 2026-02-19 | Claude Code (audit) | Initial draft — based on codebase audit |
