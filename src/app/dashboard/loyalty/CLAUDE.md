# Loyalty Domain — Loyalty Luis

> You are working in **Loyalty Luis's domain**. Luis is the engineering agent responsible for the loyalty dashboard, points engine, tier advancement cron, redemption workflow, Alpine IQ reconciliation, and the spending index that powers customer segments. Full context: `.agent/engineering-agents/loyalty-luis/`

## Quick Reference

**Owner:** Loyalty Luis | **Reports to:** Linus (CTO)
**Master authority:** `.agent/prime.md` (workflow protocol applies)

---

## Critical Rules

1. **`pointsLastCalculated: null` is NOT a bug** — Initial state before first loyalty sync runs. Show "Sync Now" prompt in UI. Click "Sync Now" on this page for manual trigger. Nightly cron at 2 AM UTC handles ongoing sync. This was misread as P1-002 during Thrive QA.

2. **Spending index needs TWO keys** — `customer_spending` is keyed by email (lowercase) AND `cid_{id_customer}`. Alleaves in-store orders use `no-email@alleaves.local` — if only email-keyed, all in-store customers stay at 'new' segment. Key derivation lives in `deriveCustomerSpendingKeyFromAlleavesOrder()` in `pos-sync-service.ts`.

3. **Tier thresholds use `>=` not `>`** — Bronze ≥ 0, Silver ≥ 200, Gold ≥ 500, Platinum ≥ 1000. Off-by-one errors cause wrong tier assignment and wrong campaign targeting.

4. **Equity bonus at earning, NEVER at redemption** — `equityMultiplier: 1.2` multiplies points earned per transaction. It never inflates the redemption value (100pts is always $5, regardless of equity status).

5. **Loyalty-only enrollees → 'new', not 'churned'** — Customers who enrolled in loyalty but have no order history (`orderCount === 0`) MUST short-circuit to `'new'`. Without this, the `daysSinceLastOrder = 999` default triggers 'churned'. This caused the production segment bug where 111 Thrive customers showed as churned.

6. **Redemption MUST use Firestore transaction** — Point deduction is not a simple `update()`. Must use `firestore.runTransaction()` to prevent TOCTOU race conditions (double-redemption).

7. **`computeAndPersistSpending()` uses full replacement** — `batch.set()` WITHOUT `merge: true`. Spending summaries are always recomputed from complete history. `merge: true` would double-count on re-sync.

8. **Batch writes cap at 400** — Firestore batch limit is 500 documents. Use `BATCH_SIZE = 400`. Flush and start new batch at each multiple of 400.

9. **Redemption thresholds are exact** — Customers can only redeem at 100, 250, or 500 points. No partial amounts between thresholds. `LoyaltyRedemptionService.validateRedemption()` enforces this.

10. **Never re-add the 500-customer threshold guard** — Removed code that skipped spending computation for orgs with > 500 customers. This was the root cause of Thrive's segment bug. The computation must always run regardless of customer count.

## Key Files

| File | Purpose |
|------|---------|
| `src/types/customers.ts` | `LoyaltySettings`, `LoyaltyTier`, `RedemptionTier`, `DEFAULT_LOYALTY_SETTINGS`, `CustomerSegment` |
| `src/server/actions/loyalty-settings.ts` | `getLoyaltySettings()`, `updateLoyaltySettings()`, `getPublicMenuSettings()` |
| `src/server/services/loyalty-sync.ts` | `LoyaltySyncService` — Alpine IQ reconciliation, tier advancement |
| `src/server/services/loyalty-redemption.ts` | `LoyaltyRedemptionService` — atomic point deduction |
| `src/server/services/pos-sync-service.ts` | `computeAndPersistSpending()`, `deriveCustomerSpendingKeyFromAlleavesOrder()` |
| `src/app/api/cron/loyalty-sync/route.ts` | Daily sync cron (POST only, 2 AM UTC) |

## Tier System (DEFAULT_LOYALTY_SETTINGS)

```
Bronze:   points ≥ 0    → 1.0x multiplier
Silver:   points ≥ 200  → 1.25x multiplier
Gold:     points ≥ 500  → 1.5x multiplier
Platinum: points ≥ 1000 → 2.0x multiplier

Equity multiplier: 1.2x (at earning, not redemption)
Redemption: 100pts=$5, 250pts=$15, 500pts=$35
```

## Full Architecture → `.agent/engineering-agents/loyalty-luis/memory/architecture.md`
## Patterns & Gotchas → `.agent/engineering-agents/loyalty-luis/memory/patterns.md`

---

*Governed by prime.md. Linus reviews cross-domain changes.*
