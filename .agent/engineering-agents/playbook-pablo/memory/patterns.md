# Playbook Pablo — Patterns & Gotchas

## Critical Rules

### Rule 1: Two PlaybookTrigger types are NOT interchangeable
```typescript
// ✅ CORRECT — use converter when crossing types
import type { PlaybookTrigger as ConfigTrigger } from '@/config/playbooks';
import type { PlaybookTrigger as EditableTrigger } from '@/types/playbook';

const editableTrigger = configTriggerToPlaybookTrigger(configTrigger);

// ❌ WRONG — spreading a ConfigTrigger as EditableTrigger
const trigger: EditableTrigger = {
  ...configTrigger,  // has 'frequency' field, not 'cron' — TypeScript will lie about this
};
```

### Rule 2: `parseCron()` doesn't throw on invalid input
```typescript
// ✅ CORRECT — validate cron string before parsing
function isCronValid(cron: string): boolean {
  const parts = cron.split(' ');
  return parts.length === 5 && parts.every(p => /^[\d*,/-]+$/.test(p));
}
if (!isCronValid(cronString)) return defaultSchedule;

// ❌ WRONG — expecting parseCron to throw on garbage input
try {
  const config = parseCron('not a cron at all');  // doesn't throw, returns weird config
} catch (e) {
  return defaultSchedule;  // catch never fires
}
```

### Rule 3: `customConfig` on assignment, never on template
```typescript
// ✅ CORRECT — save overrides to assignment
await updatePlaybookAssignmentConfig(assignmentId, {
  trigger: editableTrigger,
  metadata: { delivery: { channels, emailRecipients } }
});

// ❌ WRONG — modifying the shared template
await updatePlaybook(playbookId, {
  trigger: editableTrigger,  // changes this for ALL orgs using the template!
});
```

### Rule 4: Execution log is the top-level `playbook_executions` collection
```typescript
// ✅ CORRECT — confirmed in playbook-runner/route.ts
const executionRef = await db.collection('playbook_executions').add({
  playbookId,
  playbookName,
  startedAt,
  completedAt,
  duration,
  stepsExecuted,
  success: true,
});

// ❌ WRONG — subcollection does NOT exist in the current implementation
const executionRef = db
  .collection('playbook_assignments')
  .doc(assignmentId)
  .collection('executions')
  .doc();
```

### Rule 5: Thrive's playbooks are PAUSED, not broken
```typescript
// ✅ CORRECT — check status before diagnosing
const assignment = await getPlaybookAssignment(id);
if (assignment.status === 'paused') {
  return 'Awaiting activation — email provider not connected yet';
}

// ❌ WRONG — treating paused as an error
if (!assignment.lastRunAt) {
  throw new Error('Playbook never ran — possible bug');  // paused playbooks never run
}
```

---

## Common Mistakes

| Symptom | Root Cause | Fix |
|---------|-----------|-----|
| Playbook runs at wrong time | Wrong cron expression from `buildCron()` | Test with `describeSchedule()` to verify human-readable output |
| `parseCron` returns unexpected config | Input has < 5 parts → falls to default | Validate before parsing; isCronValid check |
| All orgs' playbook schedules changed | Saving trigger to template instead of assignment | Always use `updatePlaybookAssignmentConfig()` |
| Execution history not loading | Querying wrong collection path | Use top-level: `playbook_executions` (filter by `playbookId`) |
| TypeScript passes but runtime fails | Mixed ConfigTrigger/EditableTrigger types | Always use `configTriggerToPlaybookTrigger()` to convert |
| Thrive playbooks show "never run" | All 44 are PAUSED status | Expected — they activate when Mailjet is connected |

### Rule 6: buildCron/parseCron live in trigger-editor-panel.tsx, not a lib file
```typescript
// ✅ CORRECT — import from the component file directly
import { buildCron, parseCron, describeSchedule } from
  '@/app/dashboard/playbooks/components/trigger-editor-panel';

// ❌ WRONG — this file does not exist
import { buildCron } from '@/lib/cron-utils';
```

### Rule 7: parseCron takes ScheduleState-based output, not raw cron string to describeSchedule
```typescript
// ✅ CORRECT — two-step: parse cron → describe
const scheduleState = parseCron(cron);
const label = describeSchedule(scheduleState, 'America/New_York');

// ❌ WRONG — describeSchedule takes ScheduleState, not cron string
const label = describeSchedule(cron, 'America/New_York');
```

---

## Cron Expression Quick Reference

```
Format: minute hour day-of-month month day-of-week
         *       *    *            *     *

Common patterns:
  '0 9 * * *'     → Daily at 9 AM UTC
  '0 9 * * 1'     → Weekly Monday at 9 AM UTC
  '0 9 1 * *'     → Monthly 1st at 9 AM UTC
  '0 * * * *'     → Every hour
  '0 13 * * *'    → Daily at 1 PM UTC (9 AM EST / used for morning briefing)

Day of week:
  0 = Sunday, 1 = Monday, ..., 6 = Saturday
```

---

## PlaybookEditSheet Integration Pattern

```typescript
// How the edit sheet wires to the trigger editor:
<PlaybookEditSheet
  assignment={assignment}
  onSave={async (config) => {
    await updatePlaybookAssignmentConfig(assignment.id, {
      trigger: config.trigger,           // EditableTrigger (cron-based)
      metadata: {
        delivery: config.delivery,        // channels, recipients
      }
    });
  }}
/>
```

---

*Patterns version: 1.0 | Created: 2026-02-26*
