# Production Spec: Heartbeat Monitor

**Last updated:** 2026-02-19
**Spec status:** 🔴 Gaps Identified
**Owner agent(s):** Linus (CTO)
**Tier:** 3 — Supporting Systems

---

## 1. Feature Overview

Heartbeat Monitor is the platform health and auto-recovery system that ensures all tenant-specific cron jobs (POS sync, email warmup, competitive intel, etc.) execute successfully. Core cron endpoint `POST /api/cron/tick` runs every 60 minutes (Cloud Scheduler), queries `schedules` collection for due tenants, executes playbook templates, writes `heartbeat_executions` logs, and updates `system/heartbeat` doc with last pulse timestamp. Public health endpoint `GET /api/system/health` returns pulse status (healthy/warning/unknown) consumed by `<HeartbeatIndicator />` component (green pulsing dot on all dashboards). Auto-recovery cron runs every 5 minutes, detects 24h execution gaps, force-recovers stuck schedules, and dispatches Linus agent if recovery fails. Linus has 3 tools: `heartbeat_diagnose()`, `heartbeat_trigger()`, `heartbeat_configure()`. Gray pulse fix (`92d8345f`) added fallback to users collection for orgs without tenant docs (Thrive).

---

## 2. Current State

### Shipped ✅
- **Heartbeat tick cron**: `POST /api/cron/tick` runs every 60 min via Cloud Scheduler, queries `schedules` collection for `nextRun <= now`, executes playbook templates, writes `heartbeat_executions` log (`memory/platform.md:3-7`)
- **Health endpoint**: `GET /api/system/health` public endpoint returns `{ pulse: 'healthy' | 'warning' | 'unknown', lastPulse: Date }` (`memory/platform.md:4`)
- **HeartbeatIndicator component**: Green pulsing dot (Framer Motion) on all dashboards, polls `/api/system/health` every 60s, turns yellow/gray on warning/unknown (`memory/platform.md:6`)
- **Firestore collections**: `schedules` (per-tenant cron config), `heartbeat_executions` (execution logs), `system/heartbeat` (last pulse timestamp), `system_logs` (errors) (`memory/platform.md:5`)
- **Tenant discovery**: `findDueTenants()` queries `tenants.where('status','==','active')` with fallback to `users.where('role','in',['brand_admin','brand','dispensary_admin','dispensary'])` for orgs without tenant docs (`memory/platform.md:9-10`)
- **Auto-recovery cron**: `POST /api/cron/heartbeat-recovery` runs every 5 min, checks all tenants for 24h execution gap, force-recovers stuck schedules, dispatches Linus if recovery fails (`memory/platform.md:12-23`)
- **Linus agent tools**: `heartbeat_diagnose()` (analyzes health), `heartbeat_trigger()` (manual fire), `heartbeat_configure()` (update schedule) (`memory/platform.md:7`)
- **Auto-recovery retry logic**: Cloud Scheduler job retries 5x with exponential backoff (`memory/platform.md:17`)

### Partially Working ⚠️
- **Gray pulse root cause**: Fixed for orgs without tenant docs (Thrive) but NOT fully tested with orgs that have tenant docs + inactive status (may skip healthy orgs)
- **Linus dispatch on recovery failure**: Auto-recovery dispatches Linus but NO verification Linus actually receives/acts on dispatch (silent failure possible)
- **Schedule conflict detection**: Multiple schedules can have same `nextRun` time (race condition possible)
- **Execution log retention**: `heartbeat_executions` never purged (grows unbounded)
- **Error log aggregation**: `system_logs` collection exists but NO dashboard to view errors

### Not Implemented ❌
- **Heartbeat dashboard**: No admin UI to view execution history, health trends, or error logs (data exists but invisible)
- **Alerting on failures**: Auto-recovery runs but NO Slack/email alerts when schedules fail repeatedly (silent failures)
- **Schedule prioritization**: All schedules treated equally (no high/low priority queue)
- **Manual schedule override**: No UI to pause/resume individual schedules (must edit Firestore directly)
- **Execution time tracking**: No metrics on how long each schedule takes to execute
- **Dependency tracking**: No way to express "Schedule B depends on Schedule A" (can't enforce execution order)
- **Regional scheduling**: All cron jobs use single timezone (America/New_York) — no per-org timezone support
- **Health check webhooks**: No external uptime monitoring (Pingdom, UptimeRobot) integration
- **Schedule templates**: No UI to create reusable schedule templates (must copy Firestore docs)

---

## 3. Acceptance Criteria

### Functional
- [ ] Heartbeat tick cron runs every 60 minutes and executes ALL due schedules (nextRun <= now)
- [ ] Execution logs written to `heartbeat_executions` with status (success/failure), duration, error message
- [ ] `system/heartbeat` doc updated with last pulse timestamp after each tick
- [ ] Public health endpoint returns `pulse: 'healthy'` if last pulse within 90 minutes
- [ ] Public health endpoint returns `pulse: 'warning'` if last pulse 90-120 minutes ago
- [ ] Public health endpoint returns `pulse: 'unknown'` if last pulse >120 minutes ago OR no executions exist
- [ ] HeartbeatIndicator component shows green pulsing dot when `pulse: 'healthy'`
- [ ] HeartbeatIndicator component shows yellow pulsing dot when `pulse: 'warning'`
- [ ] HeartbeatIndicator component shows gray pulsing dot when `pulse: 'unknown'`
- [ ] Auto-recovery cron detects 24h execution gaps and force-recovers stuck schedules
- [ ] Auto-recovery dispatches Linus agent if recovery fails after 3 attempts
- [ ] `findDueTenants()` finds ALL active tenants (with or without tenant doc)

### Compliance / Security
- [ ] Heartbeat tick endpoint MUST require `CRON_SECRET` Bearer token (no public access)
- [ ] Auto-recovery endpoint MUST require `CRON_SECRET` header (no public access)
- [ ] Health endpoint MUST be public (no auth) for uptime monitoring
- [ ] Execution logs MUST NOT contain customer PII (org IDs only)
- [ ] Linus tools MUST require `super_user` role (no tenant access to heartbeat controls)

### Performance
- [ ] Heartbeat tick completes in < 60s for < 100 active tenants
- [ ] Health endpoint responds in < 200ms (single Firestore doc read)
- [ ] Auto-recovery cron completes in < 30s for < 100 tenants
- [ ] `findDueTenants()` completes in < 5s (Firestore compound query with index)
- [ ] HeartbeatIndicator polling does NOT impact dashboard load time (async background fetch)

---

## 4. Known Gaps / Tech Debt

| Gap | Severity | Notes |
|-----|----------|-------|
| No heartbeat dashboard | 🔴 Critical | Execution history, health trends, error logs invisible to admins |
| No alerting on failures | 🔴 Critical | Auto-recovery runs but no Slack/email alerts when schedules fail repeatedly |
| Execution log retention unbounded | 🟡 High | `heartbeat_executions` never purged (grows unbounded) |
| No manual schedule override UI | 🟡 High | Must edit Firestore directly to pause/resume schedules |
| Linus dispatch unverified | 🟡 High | Auto-recovery dispatches Linus but no confirmation Linus acts on it |
| No execution time tracking | 🟡 High | Can't measure how long each schedule takes (no performance monitoring) |
| Schedule conflict detection missing | 🟡 High | Multiple schedules can have same nextRun (race condition possible) |
| No dependency tracking | 🟢 Low | Can't express "Schedule B depends on Schedule A" (execution order not enforced) |
| No regional scheduling | 🟢 Low | All cron jobs use America/New_York timezone (no per-org timezone) |
| No health check webhooks | 🟢 Low | No external uptime monitoring integration (Pingdom, UptimeRobot) |
| No schedule templates UI | 🟢 Low | Must copy Firestore docs to create reusable templates |
| Error log aggregation dashboard missing | 🟢 Low | `system_logs` collection exists but no UI to view errors |

---

## 5. Test Coverage

### Existing Tests
| Test | Location | Coverage |
|------|----------|---------|
| None | — | No tests exist for heartbeat monitor |

### Missing Tests (Required for Production-Ready)
- [ ] `heartbeat-tick.integration.test.ts` — validates cron executes due schedules + writes execution logs
- [ ] `heartbeat-health-endpoint.unit.test.ts` — validates pulse status calculation (healthy/warning/unknown)
- [ ] `heartbeat-auto-recovery.integration.test.ts` — validates 24h gap detection + force-recovery
- [ ] `heartbeat-tenant-discovery.unit.test.ts` — validates `findDueTenants()` fallback logic (tenant doc + users collection)
- [ ] `heartbeat-linus-tools.integration.test.ts` — validates `heartbeat_diagnose()`, `heartbeat_trigger()`, `heartbeat_configure()`
- [ ] `heartbeat-indicator.e2e.test.ts` — validates UI component shows correct pulse color (green/yellow/gray)

### Golden Set Eval
Not applicable (Heartbeat is infrastructure — no LLM/agent behavior to test, except Linus tools).

---

## 6. Dependencies

### Internal
| System | Why needed | Failure mode |
|--------|-----------|-------------|
| Firestore `schedules` collection | Stores per-tenant cron config | Heartbeat tick runs but finds no schedules (no executions) |
| Firestore `heartbeat_executions` collection | Logs execution history | Health endpoint returns `pulse: 'unknown'` (no proof of life) |
| Firestore `system/heartbeat` doc | Stores last pulse timestamp | Health endpoint fails (500 error) |
| Linus agent | Dispatched on auto-recovery failure | Recovery failures silent (no human intervention) |
| Cloud Scheduler | Triggers `/api/cron/tick` every 60 min | Heartbeat stops completely (gray pulse) |

### External Services
| Service | Purpose | Fallback |
|---------|---------|---------|
| None | Heartbeat is self-contained | — |

---

## 7. Degraded Mode

- **If Cloud Scheduler is down:** Heartbeat tick never fires. Health endpoint eventually returns `pulse: 'unknown'` (>120 min). HeartbeatIndicator shows gray dot. Auto-recovery can't run (also depends on Cloud Scheduler).
- **If Firestore `schedules` collection unavailable:** Heartbeat tick runs but finds no schedules. Execution log writes fail. Health endpoint returns `pulse: 'unknown'`.
- **If Linus agent unavailable:** Auto-recovery can't dispatch Linus on failure. Recovery failures silent (no human intervention).
- **If `findDueTenants()` query times out:** Heartbeat tick incomplete (some tenants skipped). Partial execution logs. Health endpoint may show `pulse: 'healthy'` despite missing executions.
- **Data loss risk:** If heartbeat tick executes schedules but execution log write fails, no proof of execution. Health endpoint returns `pulse: 'unknown'` despite successful runs. Mitigation: write execution log BEFORE executing schedule (optimistic logging).

---

## 8. Open Questions

1. **Heartbeat dashboard**: Should we build admin UI for execution history + health trends, or rely on Linus agent queries?
2. **Alerting on failures**: Should alerts send to Slack (Super Users), email (org admins), or both?
3. **Execution log retention**: Should we purge logs older than 30 days, 90 days, or keep forever?
4. **Schedule prioritization**: Should we add high/low priority queues, or keep FIFO?
5. **Manual schedule override UI**: Should we allow pausing schedules via admin dashboard, or keep Firestore-only?
6. **Execution time tracking**: Should we track duration per schedule, or is success/failure sufficient?
7. **Dependency tracking**: Should we support "Schedule B depends on Schedule A" execution order, or keep independent?
8. **Regional scheduling**: Should we support per-org timezone configuration, or keep America/New_York for all?
9. **Health check webhooks**: Should we integrate Pingdom/UptimeRobot for external monitoring, or keep internal-only?
10. **Linus dispatch verification**: Should Linus confirm receipt of auto-recovery dispatch, or assume silent success?

---

## Revision History

| Date | Author | Change |
|------|--------|--------|
| 2026-02-19 | Claude Code (audit) | Initial draft — based on memory/platform.md |
