# Agent Task Queue

> How agents file findings, hand off work, and track resolution.

---

## Overview

The **agent task queue** (`agent_tasks` Firestore collection) is the standard way for any agent, cron job, or external tool to say "something needs fixing" and have it picked up by Linus or another builder agent.

Tasks are stored as **markdown-friendly documents** — both humans (via the Mission Control dashboard) and agents (via tools or API) can read them naturally.

---

## Architecture

```
                                 ┌──────────────────┐
  Opencode / CLI ──POST──────→  │  /api/agent-tasks │
  Daily Audit Cron ─auto-file→  │  (REST endpoint)  │
  Any Agent ──────────────────→  └────────┬─────────┘
                                          │
                                          ▼
                              ┌─────────────────────┐
                              │  agent_tasks (Fstore)│
                              │  status: open        │
                              └────────┬────────────┘
                                       │
                      ┌────────────────┼────────────────┐
                      ▼                ▼                 ▼
              Linus tool       Dashboard panel     GET ?format=markdown
           check_task_queue    AgentTaskBoard       (any consumer)
              claim → fix      claim / complete
              complete
```

---

## Key Files

| File | Purpose |
|------|---------|
| `src/types/agent-task.ts` | Types + markdown rendering (`renderTaskMarkdown`, `renderTaskBoardMarkdown`) |
| `src/server/actions/agent-tasks.ts` | Server actions: `createTaskInternal`, `listAgentTasks`, `claimTask`, `updateTaskStatus`, `getTaskBoardMarkdown` |
| `src/app/api/agent-tasks/route.ts` | REST API (POST/GET/PATCH, `CRON_SECRET` auth) |
| `src/app/api/cron/daily-response-audit/route.ts` | Auto-files tasks for agents scoring poor/fail |
| `src/server/agents/linus.ts` | `check_task_queue` tool (list/claim/complete/markdown) |
| `src/app/dashboard/ceo/components/agent-task-board.tsx` | Dashboard UI with expandable cards |
| `src/app/dashboard/ceo/components/mission-control-tab.tsx` | Task board integrated into Mission Control |

---

## Firestore Schema

Collection: `agent_tasks`

```typescript
interface AgentTask {
    id: string;
    title: string;
    body: string;              // Markdown — the finding, context, suggestion
    status: 'open' | 'claimed' | 'in_progress' | 'done' | 'wont_fix';
    priority: 'critical' | 'high' | 'normal' | 'low';
    category: 'bug' | 'feature' | 'refactor' | 'performance' | 'security'
            | 'compliance' | 'infra' | 'data' | 'agent_quality' | 'other';
    reportedBy: string;        // 'opencode', 'daily-response-audit', 'pinky', 'manual'
    assignedTo: string | null; // 'linus', 'opencode', 'claude-code', or null
    filePath?: string;
    errorSnippet?: string;
    relatedCommit?: string;
    resolvedCommit?: string;
    resolutionNote?: string;   // Markdown
    createdAt: string;         // ISO
    updatedAt: string;         // ISO
    claimedAt?: string;
    resolvedAt?: string;
}
```

---

## How to File a Task

### From an agent (server-side)

```typescript
import { createTaskInternal } from '@/server/actions/agent-tasks';

await createTaskInternal({
    title: 'Gmail token refresh failing in prod',
    body: 'getCeoGmailClient() returns null because...',
    priority: 'high',
    category: 'bug',
    reportedBy: 'opencode',
    filePath: 'src/server/agents/marty.ts',
});
```

### From CLI / Opencode (REST API)

```bash
curl -X POST https://bakedbot.ai/api/agent-tasks \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Gmail token refresh failing",
    "body": "getCeoGmailClient() returns null because...",
    "priority": "high",
    "category": "bug",
    "reportedBy": "opencode",
    "filePath": "src/server/agents/marty.ts"
  }'
```

### From Linus (tool call)

Linus doesn't typically file tasks (he fixes them), but can via `createTaskInternal` in any tool executor.

---

## How to Read / Claim / Complete Tasks

### Linus tool: `check_task_queue`

| Action | Input | Effect |
|--------|-------|--------|
| `list` | — | Returns open/claimed tasks as JSON |
| `markdown` | — | Returns full board as readable markdown |
| `claim` | `taskId` | Sets status=claimed, assignedTo=linus |
| `complete` | `taskId`, `resolutionNote?`, `resolvedCommit?` | Sets status=done |

### REST API

```bash
# List open tasks as JSON
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://bakedbot.ai/api/agent-tasks?status=open"

# Full board as markdown
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://bakedbot.ai/api/agent-tasks?format=markdown"

# Claim a task
curl -X PATCH -H "Authorization: Bearer $CRON_SECRET" \
  -d '{"taskId":"abc123","action":"claim","claimedBy":"opencode"}' \
  https://bakedbot.ai/api/agent-tasks

# Complete a task
curl -X PATCH -H "Authorization: Bearer $CRON_SECRET" \
  -d '{"taskId":"abc123","status":"done","resolutionNote":"Fixed in commit abc"}' \
  https://bakedbot.ai/api/agent-tasks
```

### Dashboard

Super users see the **Agent Task Board** on Mission Control (`/dashboard/ceo`). Cards are expandable with claim/complete buttons.

---

## Auto-Filing Sources

| Source | When | What gets filed |
|--------|------|-----------------|
| `daily-response-audit` cron | 7 AM CST daily | One task per agent scoring poor/fail, assigned to linus |
| Manual (dashboard/API) | Anytime | Whatever the user or agent describes |

---

## Design Principles

1. **Markdown-first** — tasks render as readable markdown for both humans and agents
2. **Lightweight** — no complex workflow states. Open -> Claimed -> Done.
3. **Agent-native** — tools and API endpoints so any agent can participate
4. **Dashboard-visible** — super users see everything on Mission Control
5. **Auto-filing** — crons create tasks automatically, no human needed to notice problems
