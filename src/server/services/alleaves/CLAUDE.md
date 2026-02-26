# Alleaves / POS Sync Domain — Sync Sam

> You are working in **Sync Sam's domain**. Sam is the engineering agent responsible for the POS integration and data pipeline. Full context is in `.agent/engineering-agents/sync-sam/`.

## Quick Reference

**Owner:** Sync Sam | **Reports to:** Linus (CTO)
**Master authority:** `.agent/prime.md` (workflow protocol applies)

---

## Critical Rules for This Domain

1. **In-store POS customers have placeholder emails** — `customer.email = 'no-email@alleaves.local'` for all Alleaves POS terminal transactions. Always build `alleavesIdToCustomerIdMap` alongside `emailToIdMap` and try userId fallback before giving up.

2. **Spending index needs TWO keys** — write AND read using both `email` (lowercase) AND `cid_{id_customer}`. If only email key exists, email-less customers never get spending data.

3. **No Firestore multi-field inequality** — can only apply range/inequality filter on ONE field per query. Add secondary filters in-memory after the Firestore query returns.

4. **Alleaves inventory is `POST /inventory/search`** — not GET. Body: `{ query: '' }`.

5. **PIN is a SEPARATE auth field** — never concatenate with password. `POST /api/auth` body: `{ username, password, pin }`.

6. **POS is single source of truth** — `syncMenu()` removes ALL non-POS products. CannMenus, manual entries, everything gone when POS syncs.

7. **Loyalty-only enrollees short-circuit** — `orderCount === 0 && !lastOrderDate` must return `'new'` immediately. Without this, `daysSinceLastOrder` defaults to 999 → everyone classified as 'churned'.

## Key Files

| File | Purpose |
|------|---------|
| `src/server/services/alleaves/` | Alleaves API client + auth + sync orchestration |
| `src/server/services/pos-sync-service.ts` | Core sync logic (customers, orders, products) |
| `src/server/services/customer-segmentation.ts` | Segment calculation engine |
| `src/server/services/spending-sync.ts` | `computeAndPersistSpending()` |
| `src/server/actions/customers.ts` | Customer CRUD + segment actions |
| `src/app/api/cron/pos-sync/route.ts` | Sync cron endpoint (every 30 min) |

## Full Architecture

→ `.agent/engineering-agents/sync-sam/memory/architecture.md`

## Patterns & Gotchas

→ `.agent/engineering-agents/sync-sam/memory/patterns.md`

## The Critical Alleaves In-Store Problem

Alleaves in-store transactions store:
- `customer.email: 'no-email@alleaves.local'` ← placeholder, NOT real email
- `userId: '{alleaves_customer_id}'` ← this IS the real key

**Before fix (`99f205f0`):** All 3,004 Thrive in-store customers showed as 'new' because email match failed for every single order. The userId fallback fixed segment accuracy.

---

*Governed by prime.md. Linus reviews cross-domain changes from this area.*
