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
| `addCustomDomain` | Register custom domain for brand or dispensary |
| `verifyCustomDomain` | Verify DNS records for domain |
| `removeCustomDomain` | Remove custom domain configuration |
| `getDomainStatus` | Get current domain verification status |

---

## Custom Domain Management

**Location**: `src/server/actions/domain-management.ts`

Allows brands and dispensaries to connect custom domains (e.g., `shop.mybrand.com` or `menu.dispensary.com`) to their BakedBot menu.

### Connection Types
| Type | Use Case | DNS Record |
|------|----------|------------|
| CNAME | Subdomains (shop.mybrand.com) | CNAME → cname.bakedbot.ai |
| Nameserver | Full domains (mybrandmenu.com) | NS → ns1/ns2.bakedbot.ai |

### Verification Flow
1. Brand/dispensary adds domain in dashboard settings
2. System generates TXT verification token
3. User adds TXT record to DNS
4. User adds CNAME or updates nameservers
5. System verifies DNS records
6. Domain mapping created for routing

### Key Files
| File | Purpose |
|------|---------|
| `src/server/actions/domain-management.ts` | Server actions |
| `src/lib/dns-verify.ts` | DNS verification utilities |
| `src/lib/domain-cache.ts` | In-memory domain→tenant cache |
| `src/app/api/domain/resolve/route.ts` | Domain resolution API |

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
| `tenants` | Tenant configurations (includes customDomain) |
| `domain_mappings` | Custom domain → tenant ID lookup |

---

## Next.js + Firebase App Hosting Patterns

### The Build-Time vs Runtime Problem

**Context:** Firebase App Hosting marks certain environment variables as `RUNTIME` only (like `GEMINI_API_KEY`). These variables are available at runtime but NOT during the Next.js build phase. Next.js 16 performs static analysis by evaluating modules during build, even for routes marked with `export const dynamic = 'force-dynamic'`.

**The Failure Mode:**
```typescript
// ❌ This breaks Firebase builds:
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// This code runs at module import time (build-time)
const apiKey = process.env.GEMINI_API_KEY; // undefined during build!
if (!apiKey) {
  throw new Error('Missing API key'); // Build fails here
}

export const ai = genkit({ plugins: [googleAI({ apiKey })] });
```

**Why `export const dynamic = 'force-dynamic'` doesn't help:**
- ✅ **Does:** Prevents static generation, forces server-side rendering
- ❌ **Doesn't:** Prevent module evaluation during Next.js build-time analysis
- The route directive only affects rendering strategy, not import-time code execution

### Lazy Initialization Pattern (Solution)

**Implementation:** `src/ai/genkit.ts`

```typescript
import { genkit, Genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Private instance holder (not initialized yet)
let _ai: Genkit | null = null;

// Initialization function (only called at runtime)
function getAiInstance(): Genkit {
  if (_ai) return _ai; // Cached

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error('[Genkit] API key required at runtime');
  }

  _ai = genkit({
    plugins: [googleAI({ apiKey })],
    model: 'googleai/gemini-2.5-flash-lite',
  });

  return _ai;
}

// Proxy that handles build-time vs runtime gracefully
export const ai = new Proxy({} as Genkit, {
  get(_target, prop) {
    // Handle introspection properties (build-time analysis)
    if (typeof prop === 'string') {
      if (prop === 'then' || prop === 'toJSON' || prop === 'constructor') {
        return undefined; // Not a Promise/JSON object
      }
    }
    if (prop === Symbol.toStringTag) {
      return 'Genkit'; // Type hint for debuggers
    }

    // Check if we're in build mode (no API key)
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      // Return mock functions that allow top-level definePrompt() calls
      return function(..._args: any[]) {
        return {
          name: String(prop),
          render: () => ({ prompt: '' }),
          stream: async function*() {},
        };
      };
    }

    // At runtime with API key, initialize real Genkit
    const instance = getAiInstance();
    const value = (instance as any)[prop];
    return typeof value === 'function' ? value.bind(instance) : value;
  }
});
```

**How it works:**
1. **Build Time (no GEMINI_API_KEY):**
   - Proxy returns mock functions
   - Allows `ai.definePrompt()` calls at module top-level to succeed
   - No actual Genkit initialization happens

2. **Runtime (with GEMINI_API_KEY):**
   - First property access triggers `getAiInstance()`
   - Real Genkit instance created and cached
   - All subsequent calls use the real instance

### Why This Pattern is Necessary

**Top-Level SDK Calls in Codebase:**
```typescript
// These are called at module import time across 13+ files:
const analyzeQueryPrompt = ai.definePrompt({ ... });
const generateChatResponsePrompt = ai.definePrompt({ ... });
const generateCampaignPrompt = ai.definePrompt({ ... });
```

**Without lazy initialization:**
- Next.js build evaluates these modules
- `ai.definePrompt()` is called during build
- Genkit initialization requires GEMINI_API_KEY
- Build fails with "environment variable required" error

**With lazy initialization:**
- `ai.definePrompt()` gets a mock function during build
- Build succeeds (mocks return placeholder objects)
- At runtime, first actual use initializes real Genkit
- All prompts work correctly in production

### When to Use This Pattern

Apply lazy initialization for:
- **AI SDKs:** Genkit, OpenAI, Anthropic, etc.
- **Database clients:** If credentials are runtime-only
- **Third-party APIs:** Any service with `RUNTIME`-only secrets in `apphosting.yaml`
- **Any top-level initialization:** That requires environment variables

### Post-Mortem: Creative Center Build Failures (2026-01-27)

**Timeline:**
1. Implemented QR codes, social media integration, production polish
2. Pushed to GitHub → Firebase App Hosting build triggered
3. Build failed: "GEMINI_API_KEY environment variable is required"
4. Added `export const dynamic = 'force-dynamic'` to 15 API routes → Still failed
5. Root cause: `src/ai/genkit.ts` initialized Genkit at module import time
6. Solution: Implemented lazy initialization with Proxy pattern → Build succeeded

**Key Commits:**
- `58f03be4` — Initial lazy initialization
- `77c7c6e0` — Handle build-time property introspection (`then`, `Symbol.toStringTag`)
- `4c3bbe24` — Return mocks during build, real instance at runtime

**Lesson:** `export const dynamic = 'force-dynamic'` only affects rendering strategy, not module evaluation. Any code that runs during module import must be safe to run at build time without runtime-only environment variables.

---

## Related Files
- `src/lib/firebase/server-client.ts` — Firestore initialization
- `src/ai/genkit.ts` — Genkit lazy initialization pattern (reference implementation)
- `src/ai/genkit-flows.ts` — AI flow definitions
- `CLAUDE.md` — Codebase context for Linus
- `apphosting.yaml` — Environment variable availability configuration
