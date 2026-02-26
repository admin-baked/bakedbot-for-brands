# Cron & Platform Infrastructure Domain — Platform Pat

> You are working in **Platform Pat's domain**. Pat is the engineering agent responsible for all cron endpoints, the heartbeat system, auto-escalation pipeline, Firebase App Hosting architecture, and secret version management. Full context: `.agent/engineering-agents/platform-pat/`

## Quick Reference

**Owner:** Platform Pat | **Reports to:** Linus (CTO)
**Master authority:** `.agent/prime.md` (workflow protocol applies)

---

## Critical Rules

1. **Every cron endpoint needs BOTH GET and POST** — Cloud Scheduler sends POST. Endpoints with only GET return 405 to the scheduler. Always add `export async function POST(req) { return GET(req) }`.

2. **`CRON_SECRET` auth pattern (exact)**:
   ```typescript
   const cronSecret = process.env.CRON_SECRET;
   if (!cronSecret || req.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
   }
   ```
   Missing `!cronSecret` check = 500 when env var absent.

3. **`analytics: true` kills Edge Runtime** — Upstash Ratelimit with `analytics: true` crashes the middleware. Always use `analytics: false`. This caused the 3 AM site-wide 500 outage.

4. **Always use explicit `@N` version in apphosting.yaml** — `secret: NAME` without `@N` causes `fah/misconfigured-secret` preparer failure that blocks ALL deploys before compilation.

5. **Firebase App Hosting URL is NOT `.web.app`** — Production URL is `https://{backend}--{project}.{region}.hosted.app`. Cloud Scheduler job URLs must use this format.

6. **`findDueTenants()` needs users-collection fallback** — Orgs without a `tenants/{orgId}` doc won't appear in heartbeat checks unless you also query `users.where('orgId', '==', orgId)`.

7. **Linus auto-escalation uses `maxIterations: 5`** — Not 15. Incident triage needs a fast response, not an exhaustive investigation. Higher = slower Slack notification.

## Key Files

| File | Purpose |
|------|---------|
| `src/app/api/cron/` | All 47+ cron route handlers |
| `src/server/auth/cron.ts` | `requireCronSecret()` helper (must be async) |
| `src/server/services/heartbeat/index.ts` | Heartbeat execution, tenant discovery, Hive Mind integration |
| `src/server/services/auto-escalator.ts` | k6 failures → file bug → alert Linus |
| `apphosting.yaml` | Secret references (must use `@N` explicit versions) |
| `.github/workflows/synthetic-monitoring.yml` | k6 p95 probes every 15 min |

## Full Architecture → `.agent/engineering-agents/platform-pat/memory/architecture.md`
## Patterns & Gotchas → `.agent/engineering-agents/platform-pat/memory/patterns.md`

---

*Governed by prime.md. Linus reviews cross-domain changes.*
