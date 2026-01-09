# Backend Reference

## Overview
Backend logic lives in `src/server/` with services, actions, tools, and agents.

---

## Directory Structure

```
src/server/
├── actions/              # Server Actions (63 files)
│   ├── createClaimSubscription.ts
│   ├── createHireSubscription.ts
│   ├── menu-sync.ts
│   └── ... (60+ actions)
├── agents/               # Agent implementations (68 files)
│   ├── linus.ts          # AI CTO (Claude)
│   ├── harness.ts        # Agent harness framework
│   ├── schemas.ts        # Zod schemas
│   ├── router.ts         # Agent routing
│   └── tools/            # Agent-specific tools
├── services/             # Business logic (81 files)
│   ├── cannmenus.ts      # CannMenus API integration
│   ├── crm-service.ts    # Customer management
│   ├── playbook-executor.ts
│   ├── context-os/       # Decision lineage
│   ├── ezal/             # Competitive intelligence
│   ├── letta/            # Memory service
│   ├── rtrvr/            # Browser automation
│   └── vector-search/    # Firestore vector search
├── tools/                # Agent tools (32 files)
│   ├── tool-registry.ts  # Tool discovery
│   ├── letta-memory.ts   # Memory tools
│   ├── email-tool.ts     # Email sending
│   └── web-search.ts     # Serper integration
├── integrations/         # External APIs (16 files)
├── intuition/            # Proactive intelligence
├── jobs/                 # Background job handlers
├── middleware/           # Request middleware
├── repos/                # Data repositories
└── treasury/             # Crypto trading (experimental)
```

---

## Key Services

### CannMenus Service
**File**: `src/server/services/cannmenus.ts`

Cannabis data API integration for menu hydration.

```typescript
class CannMenusService {
  searchDispensaries(query: string, geo?: GeoLocation): Promise<Dispensary[]>
  getDispensaryMenu(slug: string): Promise<MenuItem[]>
  getDispensaryDetails(slug: string): Promise<DispensaryDetails>
}
```

### CRM Service
**File**: `src/server/services/crm-service.ts`

Customer relationship management.

```typescript
class CRMService {
  getCustomers(brandId: string): Promise<Customer[]>
  getCustomerProfile(customerId: string): Promise<CustomerProfile>
  trackCustomerEvent(event: CustomerEvent): Promise<void>
}
```

### Playbook Executor
**File**: `src/server/services/playbook-executor.ts`

Automation playbook engine.

```typescript
class PlaybookExecutor {
  executePlaybook(playbookId: string, context: ExecutionContext): Promise<PlaybookResult>
  schedulePlaybook(playbookId: string, schedule: CronSchedule): Promise<void>
}
```

### Letta Memory
**File**: `src/server/services/letta/`

Long-term agent memory via Letta Cloud.

```typescript
// Block Manager
lettaBlockManager.getOrCreateBlock(tenantId, label)
lettaBlockManager.appendToBlock(tenantId, label, content)

// Memory Search
lettaSearchMemory({ query: string }): Promise<MemoryResult[]>
```

### Ezal (Competitive Intel)
**File**: `src/server/services/ezal/`

Competitor monitoring and market intelligence.

```typescript
ezalService.scanCompetitor(url: string): Promise<CompetitorData>
ezalService.generateReport(brandId: string): Promise<CompetitorReport>
```

---

## Server Actions

Server Actions use `'use server'` directive for mutations.

**Location**: `src/server/actions/`

### Common Patterns

```typescript
'use server';

import { getServerSession } from '@/lib/auth';
import { getFirestore } from '@/lib/firebase/server-client';

export async function myAction(input: Input): Promise<Result> {
  const session = await getServerSession();
  if (!session) throw new Error('Unauthorized');
  
  const db = getFirestore();
  // ... business logic
}
```

### Key Actions
| Action | Description |
|--------|-------------|
| `createClaimSubscription` | Authorize.net ARB subscription |
| `createHireSubscription` | Brand subscription setup |
| `menu-sync` | Trigger menu hydration |
| `saveIntegrationConfig` | Store POS credentials |

---

## Agent Tools

Tools are Zod-schematized functions agents can call.

**Registry**: `src/server/tools/tool-registry.ts`

### Tool Pattern

```typescript
const myTool = defineTool({
  name: 'my_tool',
  description: 'What it does',
  inputSchema: z.object({
    param: z.string().describe('Description')
  }),
  execute: async (input) => {
    // ... implementation
    return result;
  }
});
```

### Key Tools
| Tool | Description |
|------|-------------|
| `letta_save_fact` | Save to long-term memory |
| `letta_search_memory` | Query memory |
| `web_search` | Serper search |
| `send_email` | SendGrid email |
| `browser_navigate` | RTRVR automation |

---

## Firebase (Firestore)

### Client Pattern
```typescript
import { getFirestore } from '@/lib/firebase/server-client';

const db = getFirestore();
const docRef = db.collection('brands').doc(brandId);
const snapshot = await docRef.get();
```

### Key Collections
| Collection | Description |
|------------|-------------|
| `brands` | Brand accounts |
| `retailers` | Dispensary locations |
| `products` | Brand products |
| `orders` | Transaction records |
| `customers` | CRM profiles |
| `playbooks` | Automation recipes |
| `memory_blocks` | Letta agent memory |

---

## Related Files
- `src/lib/firebase/server-client.ts` — Firestore initialization
- `src/ai/genkit-flows.ts` — AI flow definitions
- `CLAUDE.md` — Codebase context for Linus
