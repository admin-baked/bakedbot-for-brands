# Agent Work-In-Progress

> Check this file before modifying any shared primitive (auth, billing, cron, types).
> Claim your file, state intent, mark done. TTL: 2 hours — stale entries can be cleared.

## Active Claims

| Agent | File(s) | Intent | Claimed | Status |
|-------|---------|--------|---------|--------|
| — | — | — | — | — |

## Protocol

1. **Before touching a shared file**: add a row to Active Claims
2. **If you see a conflict**: abort, leave a note in the row, ping #agent-coordination in Slack
3. **When done**: mark Status → `done` (or delete the row)

## Shared Primitives (high conflict risk — always claim first)

| File | Owner | Notes |
|------|-------|-------|
| `src/server/auth/auth.ts` | Linus | throws intentionally — pages catch at boundary; API routes/actions need catchable errors |
| `src/server/services/campaign-sender.ts` | Carlos | Deebo gate is non-bypassable at two layers |
| `src/types/roles.ts` | Linus | Role hierarchy — changes affect all auth checks |
| `src/lib/billing.ts` | Linus | Tier limits enforced at send time |
| `src/config/playbook-readiness.ts` | Linus | V2 canonical — V1 is maintenance-only |
