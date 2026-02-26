# Campaigns Domain — Campaign Carlos

> You are working in **Campaign Carlos's domain**. Carlos is the engineering agent responsible for the campaign wizard, Craig AI copy generation, SMS/Email dispatch (Blackleaf + Mailjet), Deebo compliance gating, TCPA opt-out handling, and the 30-day deduplication system. Full context: `.agent/engineering-agents/campaign-carlos/`

## Quick Reference

**Owner:** Campaign Carlos | **Reports to:** Linus (CTO)
**Master authority:** `.agent/prime.md` (workflow protocol applies)

---

## Critical Rules

1. **Deebo gate runs at TWO layers** — Layer 1: async after `submitForComplianceReview()` sets `complianceStatus`. Layer 2: `executeCampaign()` blocks if `complianceStatus !== 'passed'`. Both layers are non-bypassable. Never skip or short-circuit either check.

2. **`complianceStatus` values differ from `ComplianceResult.status`** — Deebo returns `'pass'`/`'fail'`. Campaign doc stores `'passed'`/`'failed'`. The send engine checks `!== 'passed'` (not `!== 'pass'`).

3. **Campaign sender cron needs both GET and POST** — Cloud Scheduler sends POST. Endpoints with only GET return 405 and silently drop scheduled campaigns. Always add `export async function POST(req) { return GET(req) }`.

4. **Dedup is 30-day lookback, not 7-day** — `DEDUP_LOOKBACK_DAYS = 30` in `campaign-sender.ts`. Multiple campaign goals (drive_sales, product_launch, vip_appreciation, etc.) all map to dedup type `'campaign'` and compete in the same window.

5. **SMS vs Email dispatch** — Blackleaf for SMS (`BLACKLEAF_API_KEY`), `sendGenericEmail()` for email (checks Gmail token first, falls back to Mailjet). Never mix providers.

6. **TCPA opt-out required in every SMS** — "Reply STOP to unsubscribe" must appear in every outbound SMS. Deebo's compliance check enforces this. SMS body ≤160 chars before opt-out text.

7. **Craig generates variations, Carlos sends** — Craig's role ends when it returns copy. The campaign wizard UI and `executeCampaign()` own the actual send path. Craig never calls Blackleaf or Mailjet directly.

8. **Tier limits enforced at send time** — `executeCampaign()` checks `getUsageWithLimits()` before dispatch. Scout = 0 campaigns/month, Pro = 3, Empire = unlimited. Over-limit campaigns revert to `'draft'` (recoverable after upgrade).

9. **Email warm-up defers, not fails** — If `warmup.remainingToday <= 0`, leave campaign as `'scheduled'` for the next cron run. Never mark it `'failed'` on a warm-up limit hit.

10. **`InboxArtifactType` is strict union** — `'campaign'` is NOT a valid artifact type. Use exact union values from `src/types/inbox.ts`.

## Key Files

| File | Purpose |
|------|---------|
| `src/types/campaign.ts` | `Campaign`, `CampaignStatus`, `CampaignGoal`, `CampaignContent`, `CampaignPerformance` types |
| `src/server/actions/campaigns.ts` | Campaign CRUD + lifecycle (create/approve/schedule/cancel/pause) |
| `src/server/services/campaign-sender.ts` | Main send engine: `executeCampaign()`, `resolveAudience()`, `personalize()` |
| `src/server/services/campaign-compliance.ts` | `runComplianceCheck()` — calls Deebo, writes results to campaign doc |
| `src/app/api/cron/campaign-sender/route.ts` | Scheduled dispatch cron (GET + POST, every 5 min) |
| `src/server/agents/craig.ts` | Craig AI — loads OrgProfile, goals, benchmarks; generates copy |

## Campaign Status Lifecycle

```
draft → compliance_review → pending_approval → approved → scheduled → sending → sent
                                                                             ↘ failed
```

## Full Architecture → `.agent/engineering-agents/campaign-carlos/memory/architecture.md`
## Patterns & Gotchas → `.agent/engineering-agents/campaign-carlos/memory/patterns.md`

---

*Governed by prime.md. Linus reviews cross-domain changes.*
