# Playbook Pablo — Architecture

## Overview

Playbook Pablo owns the automation playbook system: 23 pre-built Empire templates, the Zapier-like trigger editor, per-org assignment with custom config overrides, execution cron, and the pure-JS cron utilities that power scheduling.

---

## 1. Two PlaybookTrigger Types (Critical Distinction)

```
src/config/playbooks.ts → PlaybookTrigger (config type)
  Uses: frequency field ('daily' | 'weekly' | 'monthly' | 'hourly' | 'realtime')
  Purpose: Template definitions
  Example: { type: 'scheduled', frequency: 'weekly' }

src/types/playbook.ts → PlaybookTrigger (editable type)
  Uses: cron field (standard cron string '0 9 * * 1')
  Purpose: Saved/executed assignments
  Example: { type: 'scheduled', cron: '0 9 * * 1' }

Conversion: configTriggerToPlaybookTrigger(configTrigger) → editableTrigger
  → Translates frequency → cron expression using FREQ_TO_CRON map:
    'hourly'  → '0 * * * *'
    'daily'   → '0 9 * * *'
    'weekly'  → '0 9 * * 1'
    'monthly' → '0 9 1 * *'
```

---

## 2. Playbook Templates (23 Empire Templates)

```
Template structure:
  src/config/playbooks.ts
    PLAYBOOKS: PlaybookConfig[]
      id: string (slug)
      name: string
      description: string
      category: 'loyalty' | 'marketing' | 'retention' | 'operations' | 'compliance'
      trigger: PlaybookConfig trigger (uses frequency field)
      actions: PlaybookAction[]
      requiredTier: 'empire' | 'enterprise' | 'pro'

Empire templates (23 total):
  Loyalty: Birthday Rewards, Win-Back Sequence, Loyalty Milestone, Tier Upgrade
  Marketing: New Arrival Announcement, Flash Sale, Weekly Newsletter, Social Proof
  Retention: Churn Prevention, Re-Engagement, High-Value Customer Care
  Operations: Daily Report, Weekly Intelligence, Inventory Alert, Low-Stock Warning
  Compliance: NY Delivery Reminder, Age Verification Follow-up
  ... (23 total)
```

---

## 3. Playbook Assignment with Custom Config

```
When org activates a playbook:
  1. Creates assignment: playbook_assignments/{id}
     {
       orgId, playbookId, status: 'active' | 'paused',
       trigger: EditablePlaybookTrigger (cron-based),
       customConfig: {
         delivery: { channels: ['inbox', 'email'], emailRecipients: [] },
         schedule: { timezone: 'America/New_York' }
       }
     }
  2. Template at playbooks/{id} is NEVER modified (shared across orgs)
  3. Per-org overrides live in assignment.customConfig

PlaybookEditSheet saves to:
  - Assignment trigger (for scheduling)
  - Assignment metadata.delivery (for notification channels)
  - NOT to the template
```

---

## 4. Execution Cron

```
POST /api/cron/playbook-runner (Cloud Scheduler, daily)
  → Reads playbook from: playbooks_internal/{playbookId} (Firestore)
  → Executes steps sequentially (tool_call, delegate, synthesize, notify, create_thread, condition)
  → Records execution: playbook_executions/{autoId} (TOP-LEVEL collection, not subcollection)
       { playbookId, playbookName, startedAt, completedAt, duration, stepsExecuted, success }
  → Note: step executors (tool_call, delegate, synthesize) have TODO stubs — not yet fully wired
  → Accepts ?playbookId= query param to run specific playbook

Execution log path:
  playbook_executions/{autoId}  ← top-level collection (confirmed in route.ts line 316-318)
  NOT a subcollection of playbook_assignments
  ⚠️ Memory patterns.md Rule 4 has this inverted — trust the route.ts over the docs
```

---

## 5. Pure-JS Cron Utilities

```typescript
// src/app/dashboard/playbooks/components/trigger-editor-panel.tsx
// Functions are exported directly from this component file — no separate cron-utils.ts

buildCron(s: ScheduleState): string
  → Converts ScheduleState UI struct to cron expression
  → ScheduleState: { frequency: 'daily'|'weekly'|'monthly', dayOfWeek, monthDay, hour, minute, ampm }
  → Examples:
    { frequency: 'daily', hour: 9, minute: '00', ampm: 'am' } → '0 9 * * *'
    { frequency: 'weekly', dayOfWeek: 1, hour: 9, ... } → '0 9 * * 1'
    { frequency: 'monthly', monthDay: 1, hour: 9, ... } → '0 9 1 * *'
  → Note: dayOfWeek 7=Sun in UI, maps to cron 0=Sun

parseCron(cron: string): ScheduleState
  → Parses cron string back to ScheduleState
  → Wrapped in try/catch — returns { frequency:'daily', hour:7, ... } defaults on exception
  → < 5 parts → returns defaults immediately
  → ≥ 5 parts → always attempts parse (won't throw)

describeSchedule(s: ScheduleState, timezone: string): string
  → Takes ScheduleState (not cron string) — call parseCron first if you have a cron string
  → Human-readable: 'Weekly on Mondays at 9:00 AM ET'

// Note: configTriggerToPlaybookTrigger() may be defined in dispensary-playbooks-view.tsx
// or in-lined at call sites — search before assuming a standalone utility exists
```

---

## 6. TriggerEditorPanel

```
3 tabs:
  Scheduled → buildCron() UI with frequency pills (Daily/Weekly/Monthly/Custom)
              + H:MM AM/PM time picker + timezone selector
              + Live human-readable preview via describeSchedule()

  Event-Driven → trigger type (new_customer, new_order, loyalty_milestone, etc.)
                 + conditions (value thresholds, segment filters)

  Manual → no automatic execution; Slack @linus trigger or dashboard button

Saves to:
  PlaybookEditSheet.onSave() → updatePlaybookAssignmentConfig(assignmentId, config)
  → config: { trigger: EditablePlaybookTrigger, metadata: { delivery } }
```

---

*Architecture version: 1.0 | Created: 2026-02-26*
