# Workflows Reference

## Overview
Workflows (Playbooks) are reusable automation recipes that chain agent actions.

---

## Playbook Architecture

```
src/
├── server/
│   ├── services/
│   │   └── playbook-executor.ts    # Execution engine
│   └── playbooks/
│       └── registry.ts              # Playbook definitions
├── app/dashboard/playbooks/         # UI components
└── config/
    └── default-playbooks.ts         # Default playbook configs
```

---

## Playbook Schema

```typescript
interface Playbook {
  id: string;
  name: string;
  description: string;
  category: 'marketing' | 'inventory' | 'loyalty' | 'intel';
  trigger: PlaybookTrigger;
  steps: PlaybookStep[];
  enabled: boolean;
  brandId?: string;
  retailerId?: string;
}

interface PlaybookTrigger {
  type: 'schedule' | 'event' | 'manual';
  schedule?: string;    // Cron expression
  eventName?: string;   // e.g., 'inventory.low'
}

interface PlaybookStep {
  id: string;
  action: string;       // Tool name
  params: Record<string, any>;
  condition?: string;   // Optional condition
}
```

---

## Trigger Types

### Schedule (Cron)
```typescript
trigger: {
  type: 'schedule',
  schedule: '0 9 * * 1'  // Every Monday at 9am
}
```

### Event
```typescript
trigger: {
  type: 'event',
  eventName: 'inventory.low'
}
```

### Manual
```typescript
trigger: {
  type: 'manual'
}
```

---

## Natural Language Triggers

Users can set triggers via natural language:

| User Says | System Creates |
|-----------|----------------|
| "Run this every Monday at 9am" | Cron: `0 9 * * 1` |
| "Alert me when stock < 10" | Event: `inventory.low` |
| "Check competitors daily at 3pm" | Cron: `0 15 * * *` |

---

## Default Playbooks

See `src/config/default-playbooks.ts`:

| Playbook | Category | Description |
|----------|----------|-------------|
| Competitor Price Alert | intel | Monitor competitor pricing |
| Low Stock Alert | inventory | Notify on low inventory |
| Weekly Report | marketing | Send performance summary |
| Win-Back Campaign | loyalty | Re-engage inactive customers |

---

## Playbook Executor

**File**: `src/server/services/playbook-executor.ts`

```typescript
import { PlaybookExecutor } from '@/server/services/playbook-executor';

const executor = new PlaybookExecutor();
const result = await executor.executePlaybook(playbookId, context);
```

---

## Agent Workflows

Agents can be chained via workflows:

```
Smokey (Recs) → Money Mike (Margin Check) → Ezal (Competitor Check)
```

---

## Related Files
- `src/server/services/playbook-executor.ts`
- `src/config/default-playbooks.ts`
- `src/app/dashboard/playbooks/`
- `.agent/workflows/` — Agent-specific workflows
