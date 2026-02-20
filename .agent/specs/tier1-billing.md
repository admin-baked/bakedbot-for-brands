# Production Spec: Billing System

**Last updated:** 2026-02-19
**Spec status:** 🔴 Gaps Identified
**Owner agents:** Money Mike (CFO), Mike (CFO agent — executive)
**Tier:** 1 — Revenue

---

## 1. Feature Overview

The Billing System handles subscription management, payment processing, usage metering, and invoicing for BakedBot brands and dispensaries. Brands subscribe to tiered plans (Starter / Pro / Empire) that gate access to features (number of campaigns, playbooks, agent calls, image generations). Payments are processed via Authorize.net (credit/debit) and CannPay (cannabis-friendly debit). Usage is metered per org and checked against plan limits at the point of usage — not just at billing time.

---

## 2. Current State

### Shipped ✅
- Authorize.net payment processing integration (`src/server/services/authorize-net.ts`)
- CannPay integration for cannabis-friendly debit payments
- Subscription tier system: Starter / Pro / Empire
- Usage metering: campaigns sent, playbooks used, agent calls
- Billing settings tab in dashboard (`src/app/dashboard/settings/components/billing-form.tsx`)
- Financials dashboard (`src/app/dashboard/financials/page.tsx`)
- Cannabis-specific tax calculation (`src/server/services/cannabis-tax.ts`)
- Invoice generation + delivery
- Authorize.net webhook handler (`src/app/api/billing/authorize-net/route.ts`)
- Billing phases 1-10 shipped (per `prime.md`); tests passing
- Money Mike agent (profitability analysis, pricing strategy)
- Cost tracking for AI operations (image generation, API calls)

### Partially Working ⚠️
- Failed payment recovery workflow — exists but recovery retry cadence + user notification flow unclear
- Plan upgrade/downgrade logic — upgrade immediate, downgrade behavior (end of billing period? immediate?) not verified
- Usage metering accuracy — metered at time of use, but race conditions for concurrent actions not tested
- Cannabis-specific tax calculation — implementation exists but jurisdiction accuracy not independently verified

### Not Implemented ❌
- Prorated billing on mid-cycle plan upgrade
- Automatic dunning (payment failure recovery email sequence)
- Plan limit enforcement tested via automated test (not just UI gating)
- Webhook signature validation for Authorize.net (`X-AUTH-CODE` or equivalent)
- Usage overage behavior (soft vs hard limits when plan ceiling hit)

---

## 3. Acceptance Criteria

### Functional
- [ ] New subscription creates org plan record and grants correct feature access
- [ ] Plan gating enforced server-side on all metered actions (not just UI-disabled)
- [ ] Usage counter increments atomically with the action (not eventual/async)
- [ ] Usage limit reached → action blocked with clear error message + upgrade CTA
- [ ] Successful payment: Authorize.net webhook triggers `confirmed` status + feature unlock
- [ ] Failed payment: webhook triggers `suspended` status; brand owner notified (email + in-app)
- [ ] Plan upgrade: takes effect immediately
- [ ] Plan downgrade: takes effect at end of current billing period; user warned of feature loss
- [ ] Invoice generated for every successful charge; delivered to billing email on file
- [ ] CannPay and Authorize.net handle concurrent payments without double-charge

### Compliance / Security
- [ ] Authorize.net webhook validates signature before processing (prevent replay attacks)
- [ ] Payment card data never logged, never stored in Firestore (PCI-DSS)
- [ ] `requireSuperUser()` on billing admin endpoints (plan assignment, quota override)
- [ ] `requireUser()` + org ownership check on billing settings for brand users
- [ ] Tax calculation applied correctly per state (cannabis tax rates vary significantly by jurisdiction)

### Performance
- [ ] Payment webhook processing completes in < 5s (Authorize.net may retry if no 200 within 5s)
- [ ] Usage metering check adds < 50ms to any action (in-memory cache preferred over Firestore read)
- [ ] Plan limit check is consistent under concurrent requests (atomic Firestore transactions)

---

## 4. Known Gaps / Tech Debt

| Gap | Severity | Notes |
|-----|----------|-------|
| Authorize.net webhook signature not validated | 🔴 Critical | Any actor can send fake payment confirmations — security hole |
| Plan limit enforcement not tested at API layer (UI-only gate suspected) | 🔴 Critical | Metered limits could be bypassed via direct API calls |
| Failed payment recovery: no dunning email sequence | 🟡 High | Churning customers due to failed payments — no automated recovery |
| Usage metering race condition: concurrent actions may both pass limit check | 🟡 High | Two simultaneous campaign sends could both pass if counter hasn't incremented yet |
| Cannabis tax accuracy not independently verified | 🟡 High | Tax rates change; states have different rules for medical vs recreational |
| Plan downgrade behavior undefined | 🟡 High | What happens to features when downgrading mid-cycle? Data preserved? |
| CannPay integration depth unclear | 🟢 Low | Is CannPay actively used by any pilot customer? |
| Prorated billing on mid-cycle upgrade not implemented | 🟢 Low | Customers charged full month even if upgrading on day 28 |

---

## 5. Test Coverage

### Existing Tests
| Test | Location | Coverage |
|------|----------|---------|
| Billing tests (phases 1-10) | `tests/` (various) | Phases 1-10 per prime.md; specific files unknown |

### Missing Tests (Required for Production-Ready)
- [ ] `authorize-net-webhook.unit.test.ts:signature-validation` — verifies webhook rejects requests without valid signature
- [ ] `billing-gate.integration.test.ts:plan-limit-api-layer` — verifies direct API call beyond plan limit returns 403
- [ ] `usage-metering.unit.test.ts:atomic-increment` — verifies concurrent requests don't both pass same limit check
- [ ] `plan-downgrade.unit.test.ts` — verifies feature access correctly restricted after downgrade
- [ ] `cannabis-tax.unit.test.ts` — verifies tax rates for NY, CA, IL, CO, WA, TX match current rates

### Golden Set Eval
_No LLM behavior in billing — no golden set required. Money Mike agent behavior is separate._

---

## 6. Dependencies

### Internal
| System | Why needed | Failure mode |
|--------|-----------|-------------|
| Firestore | Subscription + usage records | Plan check fails open or closed — must define explicit degraded behavior |
| Campaign System | Metered resource (campaigns/mo) | Campaigns blocked when limit reached |
| Playbooks | Metered resource (playbooks/mo) | Playbooks blocked when limit reached |
| Creative Studio | Metered resource (image generations/mo) | Image gen blocked when limit reached |

### External Services
| Service | Purpose | Fallback |
|---------|---------|---------|
| Authorize.net | Credit/debit payment processing | None — payments fail gracefully, subscription stays in pending |
| CannPay | Cannabis-friendly debit | Fallback to Authorize.net |
| Mailjet | Invoice delivery + payment failure notifications | Invoice not delivered; in-app notification fallback |

---

## 7. Degraded Mode

- **If Authorize.net is down:** Queue payment attempt, retry on recovery. Do NOT block existing subscribers from using features while payment is pending.
- **If Firestore usage check fails:** Fail open (allow action) but log error. Prefer false negative (allowing a slightly-over-limit action) to blocking paying customers.
- **If webhook delivery delayed:** Authorize.net retries webhook up to X times. Handler must be idempotent (same payment confirmation processed twice = no double-unlock).
- **Data loss risk:** Payment records are critical. Authorize.net is authoritative — Firestore is a derived view. If Firestore diverges, resync from Authorize.net transaction history.

---

## 8. Open Questions

1. **Plan limits by tier**: What are the exact limits for Starter/Pro/Empire? (campaigns/month, playbooks, image gens, agent calls) — need a formal tier definition table.
2. **Overage behavior**: When an Empire org exceeds limits, is it a soft block (warning) or hard block (action denied)? Currently undefined.
3. **Tax jurisdiction for Herbalist Samui (Thailand)**: Thai cannabis regulations are different — does the cannabis tax module apply? Or is international billing a separate case?
4. **Authorize.net webhook signature**: What signature method does Authorize.net use? (`X-AUTH-CODE`? HMAC?) This needs to be confirmed and implemented immediately.
5. **CannPay active usage**: Is CannPay being used by any pilot customer today? If not, should it be in a feature flag?

---

## Revision History

| Date | Author | Change |
|------|--------|--------|
| 2026-02-19 | Claude Code (audit) | Initial draft — based on codebase audit |
