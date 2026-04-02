---
date: 2026-04-02
time: 00:11
slug: thrive-online-order-checkin
commits: []
features: [Visitor check-in online-order recognition, returning-customer resolution]
---

## Session 2026-04-02 - Thrive online-order returning check-in

- Extended the canonical `src/server/actions/visitor-checkin.ts` resolver to treat scoped prior `orders` history as a returning-customer signal when there is no existing CRM profile yet.
- Reused exact phone and email matching with a small set of normalized/raw phone candidates instead of auto-merging on phone last-4, which is too collision-prone to be authoritative.
- Seeded new customer profiles with known order totals, order count, and last-order date when the first check-in match comes from prior online orders.
- Prevented the check-in flow from dispatching `customer.signup` again for returning online-order customers; those visits now dispatch `customer.checkin`.
- Added focused Jest coverage for online-order context resolution and online-order capture behavior in `src/server/actions/__tests__/visitor-checkin.test.ts`.

### Verification

- `.\scripts\npm-safe.cmd test -- --runInBand "src/server/actions/__tests__/visitor-checkin.test.ts"` passed.
- Scoped TypeScript verification for the touched files passed via a temporary `tsc` project check.
- Repo-wide `.\scripts\npm-safe.cmd run check:types` timed out in both sandboxed and elevated runs, so full-project type health remains worth rerunning in a longer-lived shell before push.

### Gotchas

- The orders collection stores `customer.phone` in more than one shape, so the resolver now checks a few exact raw/normalized phone variants rather than assuming a single canonical serialized form.
- Online-order email can safely improve recognition and profile seeding, but it should not silently count as fresh marketing consent.
