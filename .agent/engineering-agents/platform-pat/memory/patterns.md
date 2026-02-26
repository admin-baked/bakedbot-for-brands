# Platform Pat — Patterns & Gotchas

## Critical Rules

### Rule 1: Every cron endpoint needs GET + POST
```typescript
// ✅ CORRECT — Cloud Scheduler sends POST
export async function GET(req: NextRequest) {
  const authError = await requireCronSecret(req);
  if (authError) return authError;
  // actual logic
}
export async function POST(req: NextRequest) { return GET(req); }

// ❌ WRONG — Cloud Scheduler gets 405, silently fails
export async function GET(req: NextRequest) { /* logic */ }
// Missing POST
```

### Rule 2: `!cronSecret` check before comparison
```typescript
// ✅ CORRECT — handles missing env var explicitly
const cronSecret = process.env.CRON_SECRET;
if (!cronSecret) return NextResponse.json({ error: 'Not configured' }, { status: 500 });
if (authHeader !== `Bearer ${cronSecret}`) return unauthorized;

// ❌ WRONG — if CRON_SECRET is undefined, comparison silently passes
if (req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) { ... }
// "Bearer undefined" !== "Bearer undefined" is false → auth bypassed!
```

### Rule 3: Never use `analytics: true` with Upstash in proxy.ts
```typescript
// ✅ CORRECT
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
  analytics: false,  // ALWAYS false in Edge Runtime
});

// ❌ WRONG — caused the 3 AM site-wide 500 outage
const ratelimit = new Ratelimit({
  analytics: true,  // CRASHES Edge Runtime
});
```

### Rule 4: Explicit `@N` version in apphosting.yaml
```yaml
# ✅ CORRECT
env:
  - variable: MY_SECRET
    secret: MY_SECRET@1

# ❌ WRONG — fah/misconfigured-secret preparer failure
env:
  - variable: MY_SECRET
    secret: MY_SECRET  # preparer can't resolve without explicit version
```

### Rule 5: Fail-safe for rate limiting
```typescript
// ✅ CORRECT — fail OPEN to prevent outage
try {
  const { success } = await ratelimit.limit(identifier);
  if (!success) return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
} catch (e) {
  console.error('Rate limit error:', e);
  // Allow request through — stability > protection
}

// ❌ WRONG — unhandled throw = 500 = site down
const { success } = await ratelimit.limit(identifier);  // throws if Upstash unreachable
```

### Rule 6: `maxDuration` export for long-running crons
```typescript
// Cron routes must declare maxDuration to avoid premature termination
// Default Next.js route timeout may be 60s — override for heavy work:

export const maxDuration = 300; // 5 minutes — POS sync, batch analytics
export const maxDuration = 120; // 2 minutes — heartbeat processing
export const maxDuration = 60;  // 1 minute  — tick, quick checks

// Without maxDuration, routes default to platform timeout (Cloud Run 60s)
// Always set this for any cron that processes multiple orgs
```

### Rule 7: `export const dynamic = 'force-dynamic'` for cron routes
```typescript
// Prevents Next.js from caching the response (crons must always run fresh)
export const dynamic = 'force-dynamic';

// Without this, Next.js may serve a cached response and skip actual execution
// All cron routes should have this — it's a safety guard
```

---

## Common Mistakes

| Symptom | Root Cause | Fix |
|---------|-----------|-----|
| Cloud Scheduler job always returns 405 | Endpoint has only GET handler | Add `export async function POST(req) { return GET(req) }` |
| Site-wide 500 with Edge Runtime error | `analytics: true` in Upstash | Change to `analytics: false` |
| Deploy fails at preparer step | Secret missing version or IAM | Use explicit `@N` + `firebase apphosting:secrets:grantaccess` |
| `CRON_SECRET` auth bypass | Missing `!cronSecret` null check | Add null check before comparison |
| Heartbeat not checking Thrive | No tenant doc = findDueTenants() skips org | Add users-collection fallback |
| Auto-escalation too slow | `maxIterations: 15` | Use `maxIterations: 5` for incident triage |
| Firebase URL wrong in Cloud Scheduler | Using `.web.app` URL | Use `https://{backend}--{project}.{region}.hosted.app` |

---

## Diagnosing Preparer-Step Failures

```bash
# Check if secret exists and has versions:
gcloud secrets versions list MY_SECRET --project=studio-567050101-bc6e8

# If missing:
echo -n "value" | gcloud secrets create MY_SECRET --data-file=- --project=studio-567050101-bc6e8

# If exists but no versions (empty):
echo -n "value" | gcloud secrets versions add MY_SECRET --data-file=- --project=studio-567050101-bc6e8

# Grant Firebase access (must use Firebase CLI, not gcloud):
firebase apphosting:secrets:grantaccess MY_SECRET --backend=bakedbot-prod
```

---

## Cron Job URL Format

```
Firebase App Hosting URL pattern:
  https://{backend}--{project}.{region}.hosted.app/api/cron/{job}

BakedBot example:
  https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app/api/cron/heartbeat

Cloud Scheduler HTTP header:
  Authorization: Bearer {CRON_SECRET}
```

---

*Patterns version: 1.0 | Created: 2026-02-26*
