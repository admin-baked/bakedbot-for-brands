# Boardroom Bob — Architecture

## Overview

Boardroom Bob owns the CEO layer: the boardroom UI, all 6 executive agents, the Jack CRM system, QA (Pinky), morning briefings, and the 28 LINUS_TOOLS that gate platform operations.

---

## 1. Boardroom Layout Architecture

```
/dashboard/ceo?tab=boardroom

Desktop (xl+):
  ┌──────────────────────────────────────────────────────────────┐
  │ HUD Strip: MRR · ARR · ARPU · Users · DAU                   │
  │ (compact label: value pairs in header row, no widget cards)  │
  ├─────────────────────────────────────────┬────────────────────┤
  │ Chat Canvas                             │ Agent Directory    │
  │ - flex-1, takes remaining width         │ Right sidebar      │
  │ - xl:h-[calc(100svh-200px)]             │ xl+ only           │
  │ - contains PuffChat                     │ Executives (5)     │
  │                                         │ Support Staff (9)  │
  │                                         │ AgentDirectoryItem │
  └─────────────────────────────────────────┴────────────────────┘

Mobile (below xl):
  → Chat canvas (h-[80vh]) full width
  → Agent picker drops below chat (5-col exec grid + 2-col support grid)

svh vs vh:
  → Use 100svh (small viewport height) NOT 100vh
  → 100vh jumps on mobile when browser address bar hides/shows
  → svh = stable height = smooth UX

Viewport sizing (CSS):
  Outer div:    xl:h-[calc(100svh-200px)]
  Main layout:  xl:flex-1 xl:min-h-0
  Chat card:    xl:h-full
  Offset 200px: header(56) + CEO banner(72) + layout padding(24) + spacing(48)
```

---

## 2. Jack CRM — Lifecycle Inference

```typescript
// src/server/agents/jack.ts

// The definitive lifecycle inference logic:
// Both getCRMUserStats() AND getPlatformUsers() MUST use this same logic

function inferLifecycle(user: PlatformUser): LifecycleStage {
  // Active subscription → paying
  if (user.subscription?.status === 'active') return 'paying';

  // Subscription ended > 30 days ago → churned
  if (user.subscription?.endedAt) {
    const daysSinceEnd = daysSince(user.subscription.endedAt);
    if (daysSinceEnd > 30) return 'churned';
  }

  // Has org membership BUT no subscription → trial
  // CRITICAL: check orgMembership specifically, NOT resolvedOrgId || orgId
  if (Object.keys(user.orgMemberships ?? {}).length > 0 && !user.subscription) {
    return 'trial';
  }

  // No org membership → prospect
  return 'prospect';
}

// THE BUG PATTERN (a8df6587):
// if (hasOrgId || resolvedOrgId)  ← '||' misclassifies ALL users as trial
// CORRECT:
// if (Object.keys(user.orgMemberships ?? {}).length > 0)

// getCRMUserStats() must call getPlatformUsers() to avoid divergence:
async function getCRMUserStats(orgId: string) {
  const users = await getPlatformUsers(orgId);  // ← use shared inference
  return {
    total: users.length,
    paying: users.filter(u => u.lifecycle === 'paying').length,
    trial: users.filter(u => u.lifecycle === 'trial').length,
    // ...
  };
}
```

---

## 3. Morning Briefing Pipeline

```
generateMorningBriefing(orgId):
  1. Fetch yesterday's metrics:
     - MRR/ARR from subscription records
     - New customers (last 24h)
     - Order count + revenue (last 24h)
     - Top-selling products
     - Campaign performance
  2. Calculate vs last period (vsLabel required on every metric)
  3. Generate narrative via Claude Haiku
  4. Return BriefingData

postMorningBriefingToInbox(orgId, briefing):
  1. Find or create briefing thread:
     → Query inbox_threads where metadata.isBriefingThread = true
     → Create if not found (singleton per org)
     → Thread created by 'system' user (no auth required)
  2. Create inbox artifact:
     type: 'analytics_briefing'
     status: 'approved'  ← pre-approved, no review step
     data: { briefing }
  3. Attach to thread

BriefingMetric shape:
  { label: string, value: string, change: number, changeType: 'up'|'down'|'neutral',
    vsLabel: string }  ← vsLabel is REQUIRED (not optional)

Cron: POST /api/cron/morning-briefing
  Schedule: 0 13 * * * UTC (9 AM EST)
  Batches: 10 orgs at a time (prevents timeout on large org count)
```

---

## 4. QA System (Pinky Agent)

```typescript
// src/server/agents/pinky.ts — 8 tools

PINKY_TOOLS: [
  'report_bug',        // creates qa_bugs doc, sets reportedBy + status internally
  'update_bug_status', // transitions through state machine
  'assign_bug',        // sets assignedTo field
  'verify_fix',        // marks as resolved with verification notes
  'list_open_bugs',    // returns open P0/P1/P2 bugs
  'get_qa_report',     // returns QAReport with stats + trends
  'run_quick_smoke',   // runs 18 API-level smoke tests
  'update_test_case',  // marks test cases pass/fail
]

// CRITICAL: Actions return data DIRECTLY, not wrapped:
const bugs = await getBugs(orgId);           // QABug[] directly
const report = await getQAReport(orgId);     // QAReport directly

// NOT:
const { success, data } = await getBugs(orgId);  // WRONG — no wrapper

// QA Bug state machine:
// open → in_progress → resolved → closed
//      ↘ won't_fix
//      ↘ duplicate

// Firestore composite indexes on qa_bugs:
// (status, priority, createdAt)
// (affectedOrgId, status, createdAt)
// (assignedTo, status, createdAt)
```

---

## 5. LINUS_TOOLS (28 Tools)

```
src/server/agents/linus.ts — LINUS_TOOLS array

Categories:
  File operations:   read_file, write_file, search_codebase, list_files
  Build/Test:        run_command, check_types, run_tests
  Git operations:    git_status, git_diff, git_log, git_commit
  Deployment:        get_deployment_history, trigger_deploy, check_build_status
  Approvals:         create_approval_request, check_approval_status
  QA:               check_qa_report, file_qa_bug
  Super Powers:      execute_super_power (maps to 11 npm scripts)
  Monitoring:        get_health_status, get_metrics
  Database:          query_firestore, list_collections

execute_super_power:
  Whitelist-only: 11 scripts
  Timeout: 10 minutes
  Output: last 5000 chars stdout + last 2000 chars stderr
  Summarizes key results for Slack (not raw output)

Auto-escalation incident response:
  maxIterations: 5 (not 15)
  Prompt strategies:
    heartbeat failure → check 3 commits + health + rollback decision
    p95 latency spike → identify ISR vs cold start vs api issue
```

---

## 6. Analytics Artifacts in Inbox

```
Phase 5 feature (c1e8a393):
  'analytics_chart'    → chart artifact type
  'analytics_briefing' → morning briefing artifact type

Both rendered in inbox-artifact-panel.tsx
Morning briefing artifact:
  type: 'analytics_briefing'
  status: 'approved'  ← pre-approved, never goes through review queue
  data: { briefingData, metrics[], narrative }
```

---

*Architecture version: 1.0 | Created: 2026-02-26*
