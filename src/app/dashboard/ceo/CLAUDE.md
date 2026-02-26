# CEO Boardroom Domain — Boardroom Bob

> You are working in **Boardroom Bob's domain**. Bob is the engineering agent responsible for the CEO Boardroom, executive agents (Leo/Linus/Jack/Glenda/MoneyMike/MrsParker/Pinky), the Jack CRM system, morning briefings, QA tab, and all 28 super user tools. Full context: `.agent/engineering-agents/boardroom-bob/`

## Quick Reference

**Owner:** Boardroom Bob | **Reports to:** Linus (CTO)
**Master authority:** `.agent/prime.md` (workflow protocol applies)

---

## Critical Rules

1. **`getCRMUserStats()` and `getPlatformUsers()` must share logic** — If they use different lifecycle inference, the CRM stats and user list will never agree. The `|| resolvedOrgId` bug caused Jack to show 25→0 users (all users with any orgId classified as trial).

2. **Use `100svh` not `100vh` for boardroom chat canvas** — `100svh` prevents the jump on mobile when the browser address bar hides. Chat canvas: `xl:h-[calc(100svh-200px)]`; offset 200px = header(56) + CEO banner(72) + padding(24) + spacing(48).

3. **`BriefingMetric.vsLabel` is required** — Typed as `string`, not optional. Missing it causes a TypeScript error on every push to the metrics array in `morning-briefing.ts`.

4. **`getBugs()` and `getQAReport()` return data directly** — NOT `{ success, data }` wrappers. Don't try to access `.data` on the return value.

5. **Morning briefing thread is a singleton per org** — Identified by `metadata.isBriefingThread: true`. One thread per org. Find-or-create pattern. Creating a new thread daily floods the inbox.

6. **`reportBug()` sets `reportedBy` and `status` internally** — Never pass these fields from callers. The server action sets them for security.

7. **Linus `maxIterations=5` for auto-escalation incidents** — The auto-escalator passes `maxIterations: 5` to `runLinus()`. Higher iterations = slower Slack notification = longer incident response.

## Key Files

| File | Purpose |
|------|---------|
| `src/app/dashboard/ceo/` | CEO boardroom — all executive tabs |
| `src/app/dashboard/ceo/components/boardroom-tab.tsx` | HUD strip + chat canvas + agent directory sidebar |
| `src/server/agents/linus.ts` | CTO agent with 28 LINUS_TOOLS |
| `src/server/agents/jack.ts` | CRM agent — `getPlatformUsers()`, lifecycle inference |
| `src/server/services/morning-briefing.ts` | Daily briefing generation + inbox posting |
| `src/server/actions/qa.ts` | QA CRUD (returns data directly, not wrapped) |
| `src/server/agents/pinky.ts` | QA agent with 8 tools |

## Full Architecture → `.agent/engineering-agents/boardroom-bob/memory/architecture.md`
## Patterns & Gotchas → `.agent/engineering-agents/boardroom-bob/memory/patterns.md`

---

*Governed by prime.md. Linus reviews cross-domain changes.*
