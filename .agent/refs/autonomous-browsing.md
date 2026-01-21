# Autonomous Browsing Reference

## Overview
**BakedBot AI in Chrome** is the browser automation capability for Super Users, powered by RTRVR MCP infrastructure. It enables autonomous web browsing, workflow recording, site permissions management, and scheduled browser tasks.

**Access**: `/dashboard/ceo?tab=browser` (Super Users only)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│            CEO Dashboard (/dashboard/ceo?tab=browser)       │
│                                                              │
│  ┌──────────────────┐  ┌─────────────────────────────────┐  │
│  │ Browser Session  │  │ Controls Panel                  │  │
│  │ Panel            │  │  • Site Permissions             │  │
│  │  • Tab List      │  │  • Workflow Recorder            │  │
│  │  • URL Bar       │  │  • Scheduled Tasks              │  │
│  │  • Action Tools  │  │                                 │  │
│  └──────────────────┘  └─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    Server Actions                           │
│              src/server/actions/browser-automation.ts       │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                   Core Services                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐ │
│  │ Session      │ │ Permission   │ │ Action               │ │
│  │ Manager      │ │ Guard        │ │ Validator            │ │
│  └──────────────┘ └──────────────┘ └──────────────────────┘ │
│  ┌──────────────┐ ┌──────────────┐                         │
│  │ Workflow     │ │ Task         │                         │
│  │ Recorder     │ │ Scheduler    │                         │
│  └──────────────┘ └──────────────┘                         │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    RTRVR MCP                                │
│             src/server/services/rtrvr/mcp.ts                │
│  • getBrowserTabs    • takePageAction                       │
│  • getPageData       • executeMCPTool                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Features

### 1. Browser Sessions
Manage real browser tabs via RTRVR Chrome extension.

| Action | Description |
|--------|-------------|
| `createSession` | Initialize browser automation session |
| `executeAction` | Run navigate/click/type/screenshot |
| `getTabs` | List current browser tabs |
| `pauseSession` | Pause session (preserves state) |
| `resumeSession` | Resume paused session |
| `endSession` | Terminate session |

**Session Timeout**: 30 minutes of inactivity

### 2. Site Permissions
Explicit domain-level access control.

| Access Level | Allowed Actions |
|--------------|-----------------|
| `full` | All actions (navigate, click, type, submit, screenshot, scroll, execute_script) |
| `read-only` | navigate, screenshot, scroll only |
| `blocked` | No access |

**Auto-Blocked Domains**:
- Banking: chase.com, wellsfargo.com, bankofamerica.com, etc.
- Payment: paypal.com, venmo.com

### 3. Workflow Recording
Record browser actions into reusable automation scripts.

```typescript
// Recording flow
startRecording(name, description) → record actions → stopRecording() → workflow saved

// Playback with variables
runWorkflow(workflowId, { email: 'user@example.com' })
```

**Variable Detection**: Automatically detects email patterns, URLs during recording.

### 4. Scheduled Tasks
Run workflows on a schedule.

| Schedule Type | Example |
|--------------|---------|
| `once` | Run at specific time |
| `daily` | Every day at 9:00 AM |
| `weekly` | Monday/Wednesday at 10:00 AM |
| `monthly` | 1st of month at 8:00 AM |

### 5. High-Risk Action Detection
Automatic detection and confirmation for sensitive actions.

| Risk Type | Trigger Patterns |
|-----------|-----------------|
| `purchase` | checkout, buy now, place order, pay now |
| `payment` | credit card, cvv, card number |
| `delete` | delete, remove, trash, destroy |
| `publish` | publish, post, submit, send, tweet |
| `login` | log in, sign in, password |
| `share` | share, invite, grant access |

---

## Implementation Files

### Services
| File | Purpose |
|------|---------|
| `src/server/services/browser-automation/index.ts` | Barrel exports |
| `src/server/services/browser-automation/session-manager.ts` | Session lifecycle, RTRVR integration |
| `src/server/services/browser-automation/permission-guard.ts` | Domain permissions, action confirmation |
| `src/server/services/browser-automation/action-validator.ts` | Risk detection, action validation |
| `src/server/services/browser-automation/workflow-recorder.ts` | Recording, playback, variable substitution |
| `src/server/services/browser-automation/task-scheduler.ts` | Cron scheduling, task execution |

### Server Actions
| File | Purpose |
|------|---------|
| `src/server/actions/browser-automation.ts` | All browser automation server actions |

### UI Components
| File | Purpose |
|------|---------|
| `src/app/dashboard/ceo/components/bakedbot-browser-tab.tsx` | Main tab component |
| `src/app/dashboard/ceo/components/browser-automation/browser-session-panel.tsx` | Browser view, tab list |
| `src/app/dashboard/ceo/components/browser-automation/site-permissions-card.tsx` | Permission management |
| `src/app/dashboard/ceo/components/browser-automation/workflow-recorder-card.tsx` | Recording controls |
| `src/app/dashboard/ceo/components/browser-automation/scheduled-tasks-card.tsx` | Task scheduling |
| `src/app/dashboard/ceo/components/browser-automation/action-confirmation-modal.tsx` | High-risk confirmation |

### Types
| File | Purpose |
|------|---------|
| `src/types/browser-automation.ts` | All TypeScript interfaces |

### Tests
| File | Tests |
|------|-------|
| `src/server/services/browser-automation/__tests__/session-manager.test.ts` | 20 tests |
| `src/server/services/browser-automation/__tests__/permission-guard.test.ts` | 19 tests |
| `src/server/services/browser-automation/__tests__/action-validator.test.ts` | 23 tests |
| `src/server/services/browser-automation/__tests__/workflow-recorder.test.ts` | 17 tests |
| `src/server/services/browser-automation/__tests__/task-scheduler.test.ts` | 23 tests |

**Total**: 102 unit tests

---

## Firestore Collections

### `browser_sessions`
```typescript
interface BrowserSession {
  id: string;
  userId: string;
  status: 'active' | 'paused' | 'completed' | 'failed';
  deviceId?: string;
  tabs: BrowserTab[];
  taskDescription?: string;
  startedAt: Timestamp;
  lastActivityAt: Timestamp;
}
```

### `site_permissions`
```typescript
interface SitePermission {
  id: string;
  userId: string;
  domain: string;
  accessLevel: 'full' | 'read-only' | 'blocked';
  allowedActions: AllowedAction[];
  requiresConfirmation: HighRiskAction[];
  grantedAt: Timestamp;
  expiresAt?: Timestamp;
}
```

### `recorded_workflows`
```typescript
interface RecordedWorkflow {
  id: string;
  userId: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  variables: WorkflowVariable[];
  status: 'draft' | 'active' | 'paused';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  runCount: number;
}
```

### `recording_sessions`
```typescript
interface RecordingSession {
  id: string;
  userId: string;
  name: string;
  description?: string;
  status: 'recording' | 'paused' | 'stopped';
  steps: WorkflowStep[];
  startedAt: Timestamp;
}
```

### `browser_tasks`
```typescript
interface BrowserTask {
  id: string;
  userId: string;
  workflowId?: string;
  name: string;
  description?: string;
  schedule: TaskSchedule;
  status: TaskStatus;
  enabled: boolean;
  nextRunAt?: Timestamp;
  lastRunAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  runCount: number;
}
```

---

## Firestore Indexes

Required composite indexes (defined in `firestore.indexes.json`):

| Collection | Fields |
|------------|--------|
| `site_permissions` | userId + grantedAt DESC |
| `site_permissions` | userId + domain |
| `browser_sessions` | userId + status + startedAt DESC |
| `browser_sessions` | userId + startedAt DESC |
| `recording_sessions` | sessionId + status |
| `recording_sessions` | userId + status |
| `recorded_workflows` | userId + updatedAt DESC |
| `browser_tasks` | userId + createdAt DESC |
| `browser_tasks` | status + enabled + nextRunAt |

---

## Security

### Authentication
- All actions require `requireSuperUser()` check
- Session cookie validation via Firebase Admin SDK

### Permission Enforcement
1. **Domain allowlist** - Must explicitly grant access
2. **Auto-blocked domains** - Financial sites always blocked
3. **Action validation** - Type-specific requirements checked
4. **High-risk confirmation** - Modal approval for sensitive actions

### Audit Logging
All browser actions logged via `@/lib/logger`:
- Session create/end
- Permission grant/revoke
- Workflow run start/complete
- Task execution

---

## Agent Integration

Executive agents have browser tools available:

```typescript
const browserTools = [
  { name: "browser.navigate", description: "Navigate to URL" },
  { name: "browser.interact", description: "Click, type, select" },
  { name: "browser.screenshot", description: "Capture page" },
  { name: "browser.extract", description: "Extract data" },
];
```

**Tool Executor**: `src/server/agents/tool-executor.ts` handles browser.* tool calls.

---

## Cron Integration

Browser tasks execute via the cron tick endpoint:

**File**: `src/app/api/cron/tick/route.ts`

```typescript
// Check for due browser tasks
const browserTasks = await taskScheduler.getDueTasks();
for (const task of browserTasks) {
  await taskScheduler.executeTask(task.id);
}
```

---

## Related Documentation
- `refs/bakedbot-discovery.md` — RTRVR/Firecrawl infrastructure
- `refs/super-users.md` — Super User privileges
- `refs/tools.md` — Agent tool definitions
