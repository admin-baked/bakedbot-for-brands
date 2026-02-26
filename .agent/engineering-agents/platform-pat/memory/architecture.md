# Platform Pat — Architecture

## Overview

Platform Pat owns the reliability layer: 47+ cron jobs, heartbeat monitoring, auto-escalation pipeline (k6 → auto-escalator → Linus), Firebase App Hosting deploy infrastructure, and secret version management.

---

## 1. Cron Security Pattern (Exact Implementation)

```typescript
// src/server/auth/cron.ts — centralized helper (must be async)
export async function requireCronSecret(req: NextRequest): Promise<NextResponse | null> {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }
  const authHeader = req.headers.get('authorization');  // lowercase — Next.js normalizes headers
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;  // null = authorized
}

// Usage in every cron endpoint:
export async function GET(req: NextRequest) {
  const authError = await requireCronSecret(req);
  if (authError) return authError;
  // ... actual cron logic
}
export async function POST(req: NextRequest) { return GET(req); }
```

---

## 2. Heartbeat System

```
/api/cron/heartbeat (every 5 min)
  → imports: processDueHeartbeats() from src/server/services/heartbeat/index.ts
  → executeHeartbeat() per tenant
      Heartbeat checks split into 4 registries:
        SUPER_USER_CHECKS  (checks/super-user.ts)
        DISPENSARY_CHECKS  (checks/dispensary.ts)
        BRAND_CHECKS       (checks/brand.ts)
        PLAYBOOK_CHECKS    (checks/playbooks.ts)
      Checks run in parallel via Promise.all
      Active hours + quiet hours respected (per tenant timezone)

  → Org discovery fallback:
      Without tenants/{orgId} doc → fallback to users collection query
      Without fallback: Thrive (no tenant doc) never gets checked

  → integrateWithHiveMind(tenantId, role, results):
      Posts to Agent Bus, persists to Letta memory, triggers sleep-time consolidation

  → Auto-recovery:
      Stale execution detected (>24h) → force re-run
      Linus escalated if recovery fails
      Slack #ops alert on degraded status
```

---

## 3. Auto-Escalation Pipeline

```
k6 Synthetic Monitoring (GitHub Actions, every 15 min):
  .github/workflows/synthetic-monitoring.yml
  → 3 probes:
    /api/health: p95 < 200ms
    /thrivesyracuse: p95 < 600ms
    /llm.txt: p95 < 600ms

On probe failure:
  → POST /api/cron/auto-escalate
  → Returns 202 immediately (GHA doesn't wait)
  → Async: runAutoEscalation()

runAutoEscalation():
  1. Dedup check (same bug type filed recently? skip)
  2. File QA bug (P0 for heartbeat, P1 for latency)
  3. Slack alert #linus-incidents (immediate)
  4. setImmediate(() => runLinus({ maxIterations: 5 }))
  5. Linus posts analysis ~60s later
```

---

## 4. Firebase App Hosting Architecture

```
Production URL:
  https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app
  NOT: https://studio-567050101-bc6e8.web.app (Firebase Hosting, not App Hosting)

Deploy flow:
  git push origin main
  → GitHub triggers Firebase App Hosting CI/CD
  → Preparer step: resolves secrets from GCP Secret Manager
  → Build step: Next.js build
  → Deploy step: Cloud Run container

Preparer step failures (blocks ALL deploys):
  1. Secret doesn't exist in GCP Secret Manager
  2. Secret has 0 versions (created but empty)
  3. No IAM binding for Firebase App Hosting service account

Secret management:
  # Step 1: Create + populate
  echo -n "value" | gcloud secrets versions add SECRET_NAME --data-file=-

  # Step 2: Grant IAM (Firebase CLI only, not gcloud)
  firebase apphosting:secrets:grantaccess SECRET_NAME --backend=bakedbot-prod

  # Step 3: Reference with explicit version
  # apphosting.yaml: secret: SECRET_NAME@1  (NOT just SECRET_NAME)
```

---

## 5. Secret Version Rules

```yaml
# apphosting.yaml — ALWAYS use explicit @N version

# ✅ CORRECT
runConfig:
  env:
    - variable: CLAUDE_API_KEY
      secret: CLAUDE_API_KEY@1  # explicit version number

# ❌ WRONG — preparer can't resolve 'latest' without extra IAM
    - variable: CLAUDE_API_KEY
      secret: CLAUDE_API_KEY  # no version = fah/misconfigured-secret build failure
```

---

## 5b. Auth Pattern Reality Check

```
Two auth patterns coexist (both correct, helper is preferred for new routes):

CENTRALIZED (preferred): requireCronSecret() from src/server/auth/cron.ts
  Used by: tick, collect-metrics, pricing-alerts, dayday-international-discovery,
           morning-briefing, auto-reject-expired-approvals

INLINE (legacy, still correct): manual CRON_SECRET check in route file
  Used by: heartbeat, pos-sync, playbook-runner, campaign-sender, and many others

Both implement the same pattern — inline just hasn't been migrated to the helper.
When adding new routes: always use requireCronSecret().
When reading existing routes: both patterns are valid.
```

---

## 5c. Cron Job Catalog (44 endpoints at time of writing)

```
SYNC (POS + loyalty):
  pos-sync             → every 30 min → syncAllPOSData()
  loyalty-sync         → daily 2 AM   → loyalty points recalculation

ANALYTICS:
  analytics-rollup     → daily 3 AM   → runAnalyticsRollup() (decay + trending)
  backfill-sales       → on-demand    → backfillHistoricalSalesData()
  collect-metrics      → scheduled    → platform metrics aggregation
  morning-briefing     → daily 1 PM UTC (8 AM EST) → per-org AnalyticsBriefing artifact

PLAYBOOKS:
  playbook-runner      → daily (Cloud Scheduler) → reads playbooks_internal, executes steps
  playbook-retries     → scheduled    → retry failed executions
  tick                 → scheduled    → runs enabled schedules (cron-parser based)

HEARTBEAT + MONITORING:
  heartbeat            → every 5 min  → processDueHeartbeats() (role-based check registry)
  heartbeat-recovery   → scheduled    → force-recover stale executions
  auto-escalate        → on-demand (GHA triggers) → P0/P1 bug + Slack + Linus
  firebase-build-monitor → scheduled → build failure detection + auto-revert
  system-health-checks → scheduled    → platform-wide health
  qa-smoke             → post-deploy  → 18-endpoint smoke tests

COMPETITIVE INTEL:
  competitive-intel    → per org frequency setting → Ezal pipeline
  pricing-alerts       → every 2h    → competitor price drop alerts
  generate-insights-competitive-pricing → every 2h :10

INSIGHTS:
  generate-insights-velocity    → hourly :00 → inventory velocity (Money Mike)
  generate-insights-customer    → hourly :05 → churn risk (Smokey)
  generate-insights-regulatory  → daily 2 AM → compliance changes (Deebo)
  generate-insights-goal-progress → scheduled → goal metric tracking
  evaluate-alerts      → scheduled   → alert evaluation

COMPLIANCE:
  check-regulations    → weekly      → regulation monitor (SHA-256 diff → Deebo)
  auto-reject-expired-approvals → daily → 7-day approval auto-expiration

CAMPAIGNS:
  campaign-sender      → daily 7 AM  → Craig executes due campaigns
  dayday-discovery     → scheduled   → DayDay competitive discovery
  dayday-review        → scheduled   → DayDay competitive review
  dayday-international-discovery → scheduled

MEETINGS:
  meeting-prep         → every 15 min → Leo meeting brief
  meeting-followup     → every 15 min → Craig follow-up emails

BUNDLES + BUNDLES:
  bundle-transitions   → every 5 min → scheduled bundle activate/expire
  promo-decrement      → scheduled   → bundle/promo countdown
  publish-scheduled-posts → scheduled → scheduled social posts

PLATFORM:
  slack-reports        → scheduled   → Slack digest
  usage-alerts         → scheduled   → plan usage threshold alerts
  churn-prediction     → weekly Sunday 2 AM → ML churn scoring
  brand-pilot          → scheduled   → brand SEO pilot
  seo-pilot            → scheduled   → SEO automation
  cleanup-brands       → scheduled   → orphan brand cleanup
  brand-website-image-sync → scheduled → brand image refresh
  weedmaps-image-sync  → scheduled   → Weedmaps image sync
  template-health-check → scheduled  → playbook template integrity
```

---

## 6. Edge Runtime Constraints

```
src/middleware.ts + src/proxy.ts run in Edge Runtime

Edge Runtime restrictions:
  - No Node.js libraries (fs, path, crypto, etc.)
  - Only Web APIs (fetch, URL, Headers, etc.)
  - No console statements → use console (not logger, which chains to Node.js)

Known landmine:
  @upstash/ratelimit with analytics: true → crashes Edge Runtime
  Fix: always use analytics: false
  Without fail-safe in proxy.ts → site-wide 500

Fail-safe pattern:
  try {
    const result = await ratelimit.limit(identifier);
    if (!result.success) return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
  } catch (e) {
    // Rate limit crashed — fail OPEN (allow request) to prevent outage
    console.error('Rate limit error:', e);
  }
```

---

## 7. Linus Auto-Escalation Config

```
runLinus({ maxIterations: 5 })  ← ALWAYS 5 for incidents, not 15

Why 5?
  Each iteration = ~10-30s Claude API call
  5 iterations = 50-150s max
  Slack posts analysis within ~60-90s of alert

  15 iterations = 150-450s = 7+ min delay to Slack
  Incidents need immediate response, not exhaustive investigation

Linus prompt strategy:
  heartbeat failure → "check last 3 commits, run health check, rollback-or-wait"
  latency spike → distinguish cold start vs ISR storm vs llm.txt issue
```

---

*Architecture version: 1.0 | Created: 2026-02-26*
