---
date: 2026-04-02
time: 02:28
slug: thrive-staff-last4-checkin
commits: [a5bdcb8ab]
features: [Visitor check-in staff last-4 lookup, phoneLast4 backfill and indexing]
---

## Session 2026-04-02 - Thrive staff-assisted last-4 check-in

- Extended the canonical `src/server/actions/visitor-checkin.ts` flow with a staff-confirmed returning-customer lookup that accepts first name plus phone last 4, returns masked candidates, and resolves the real phone only on the server from an opaque candidate reference (`a5bdcb8ab`).
- Kept full phone entry as the authoritative low-friction path and intentionally avoided auto-merging on last 4 alone; staff lookup only narrows and confirms candidates.
- Persisted `phoneLast4` on new and synced order writes, added a scoped `POST /api/admin/backfill-phone-last4` route, and surfaced `phoneLast4` in check-in visit feed data so older records can be backfilled without exposing full numbers.
- Added Firestore indexes for `customers.orgId + phoneLast4` and the `orders` scope-field plus `phoneLast4` lookups so the staff-assisted path can stay on the fast scoped queries instead of relying on the fallback path.
- Added focused Jest coverage for the new server candidate lookup path, staff-assisted UI flow, and Firestore index config guardrails.

### Verification

- `.\scripts\npm-safe.cmd test -- --runInBand "src/server/actions/__tests__/visitor-checkin.test.ts"` passed.
- `.\scripts\npm-safe.cmd test -- --runInBand "src/components/checkin/__tests__/visitor-checkin-card.test.tsx"` passed.
- `.\scripts\npm-safe.cmd test -- --runInBand "tests/config/firestore-indexes-thrive.test.ts"` passed.
- Repo-wide `.\scripts\npm-safe.cmd run check:types` timed out in both sandboxed and elevated runs, so broad type health still needs a longer-lived shell outside this session.

### Gotchas

- Last-4 lookup is only safe as a staff-confirmed narrowing step; collisions are expected, so the flow intentionally returns a short candidate list instead of an automatic merge.
- The new scoped Firestore lookups need both data backfill and deployed indexes before they can consistently avoid the fallback query path in production.
