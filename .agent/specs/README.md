# Production Specs — `.agent/specs/`

> Production specs document what each major feature **must** do to be considered production-ready.
> They are the authoritative reference for acceptance criteria, known gaps, and test coverage requirements.

---

## What is a Production Spec?

A production spec is different from a task spec (`.agent/spec-template.md`):

| | Task Spec | Production Spec |
|---|---|---|
| **Purpose** | Gate a specific implementation task | Define production readiness for a feature |
| **When written** | Before implementing something new | Once a feature ships; updated as it evolves |
| **Contains** | Implementation plan, rollback steps | Acceptance criteria, known gaps, test coverage |
| **Format** | `spec-template.md` | `PRODUCTION-SPEC-TEMPLATE.md` |

---

## Tier System

Features are grouped by business criticality:

| Tier | Focus | Specs |
|------|-------|-------|
| **Tier 1 — Revenue + Compliance** | Legal risk, revenue-blocking, customer-facing | Campaign System, POS/Menu Sync, Compliance, Billing, Public Menu |
| **Tier 2 — Core Product** | High daily usage, agent coordination | Inbox, Creative Studio, Brand Guide/Onboarding, Playbooks, Analytics |
| **Tier 3 — Supporting Systems** | Important but lower immediate risk | Drive, CRM/Loyalty, Competitive Intel, Delivery, Heartbeat |
| **Tier 4 — Growth** | Newer, lower risk | Vibe Builder, International ISR, Academy, Hero Personalization |

---

## Spec Index

### Tier 1 — Revenue + Compliance
| Feature | File | Status |
|---------|------|--------|
| Campaign System (Craig + SMS/Email) | `tier1-campaign-system.md` | 🟡 Draft |
| POS Sync + Menu | `tier1-pos-menu-sync.md` | 🟡 Draft |
| Compliance (Deebo + Regulation Monitor) | `tier1-compliance-deebo.md` | 🟡 Draft |
| Billing (Authorize.net + Tiers + Metering) | `tier1-billing.md` | 🟡 Draft |
| Public Menu Pages | `tier1-public-menu-pages.md` | 🟡 Draft |

### Tier 2 — Core Product
_Specs to be written in Session 2._

### Tier 3 — Supporting Systems
_Specs to be written in Session 3._

### Tier 4 — Growth
_Specs to be written in Session 4._

---

## Legend

| Status | Meaning |
|--------|---------|
| 🟡 Draft | Written, not yet reviewed |
| 🟢 Approved | Reviewed and accepted as authoritative |
| 🔴 Gaps Identified | Spec written; gaps must be resolved before feature is production-ready |
| ⚫ Deprecated | Feature removed or superseded |

---

## How to Use These Specs

1. **Starting work on a feature?** Read its production spec first.
2. **Adding a new capability?** Update the spec's "Known Gaps" section when resolved.
3. **Incident postmortem?** Use the spec's Acceptance Criteria to evaluate what was violated.
4. **Onboarding a new agent/dev?** Point them to the relevant spec — it's the authoritative description.

---

*For task-level specs (implementation gates), use `.agent/spec-template.md`.*
*For session workflow, see `.agent/prime.md`.*
