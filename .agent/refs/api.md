# API Reference

## Overview
BakedBot uses Next.js App Router API routes located in `src/app/api/`.

---

## Route Structure

```
src/app/api/
├── auth/                 # Authentication
│   ├── google/           # Google OAuth
│   └── session/          # Session management
├── chat/                 # Main chat endpoint (Genkit flows)
├── demo/                 # Demo endpoints (unauthenticated)
│   ├── agent/            # Homepage demo agent
│   ├── lead/             # Lead capture
│   └── import-menu/      # Menu import demo
├── agents/               # Agent dispatch
│   ├── dispatch/         # General agent dispatch
│   └── craig/dispatch/   # Craig-specific dispatch
├── jobs/                 # Background processing
│   ├── process/          # Job processor
│   └── agent/            # Agent job handler
├── cron/                 # Scheduled tasks
│   ├── tick/             # 10-minute pulse
│   ├── evaluate-alerts/  # Alert evaluation
│   ├── brand-pilot/      # Brand pilot automation
│   ├── seo-pilot/        # SEO pilot automation
│   ├── dayday-discovery/ # Day Day discovery
│   ├── dayday-review/    # Day Day review
│   └── cleanup-brands/   # Brand cleanup
├── webhooks/             # External webhooks
│   ├── agent/[id]/       # Agent webhooks
│   ├── cannpay/          # CannPay payments
│   └── error-report/     # Error reporting (Linus interrupt)
├── cannmenus/            # CannMenus integration
│   ├── retailers/        # Retailer search
│   ├── products/         # Product lookup
│   ├── brands/           # Brand search
│   ├── sync/             # Menu sync
│   ├── product-search/   # Product search
│   └── semantic-search/  # Vector search
├── billing/              # Payments
│   └── authorize-net/    # Authorize.net
├── checkout/             # E-commerce
│   ├── cannpay/          # CannPay checkout
│   ├── smokey-pay/       # Smokey Pay
│   └── process-payment/  # Payment processing
├── ezal/                 # Competitive intelligence
│   ├── competitors/      # Competitor data
│   ├── discovery/        # Market discovery
│   └── insights/         # Intel insights
├── smokey/               # Smokey (Budtender)
│   ├── find/             # Product finder
│   ├── alert/create/     # Alert creation
│   └── cart/prepare/     # Cart preparation
├── admin/                # Admin operations
│   ├── seed/             # Data seeding
│   ├── enrich/           # Data enrichment
│   └── fix-essex/        # Data fixes
├── dev/                  # Development routes
│   ├── crawl/            # Test crawling
│   ├── normalize/        # Data normalization
│   ├── run-pilot/        # Pilot testing
│   ├── verify-pilot/     # Pilot verification
│   └── seed-*/           # Seeding utilities
└── ... (more routes)
```

---

## Key Endpoints

### Chat API
**Path**: `POST /api/chat`

Handles all agent conversations. Routes to appropriate Genkit flow based on context.

```typescript
interface ChatRequest {
  message: string;
  agentId?: string;
  sessionId?: string;
  brandId?: string;
  tools?: string[];       // Tool names to enable
  intelligenceLevel?: 'standard' | 'advanced' | 'expert' | 'genius';
}

interface ChatResponse {
  content: string;
  agentId: string;
  toolCalls?: ToolExecution[];
  thinkingSteps?: ThinkingStep[];
}
```

### Demo Agent
**Path**: `POST /api/demo/agent`

Unauthenticated agent for homepage playground. Limited tools, no persistence.

### Job Processor
**Path**: `POST /api/jobs/process`

Handles async background tasks:
- `product_sync` — Menu hydration waterfall
- `competitor_scan` — Ezal intelligence
- `email_campaign` — Craig automations

### Cron Tick (Always-On Pulse)
**Path**: `POST /api/cron/tick`

Triggered every 10 minutes by GitHub Actions. Activates agent protocols:
- Linus: Zero Bug Tolerance (Hourly)
- Leo: Operations Heartbeat (Hourly)
- Jack: Revenue Pulse (Daily)
- Glenda: Brand Watch (Daily)

### Agent Dispatch
**Path**: `POST /api/agents/dispatch`

General-purpose agent dispatch endpoint for programmatic agent invocation.

### CannMenus Endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/cannmenus/retailers` | GET | Search dispensaries |
| `/api/cannmenus/products` | GET | Get menu products |
| `/api/cannmenus/brands` | GET | Search brands |
| `/api/cannmenus/sync` | POST | Trigger menu sync |
| `/api/cannmenus/semantic-search` | POST | Vector-based search |

### Ezal (Competitive Intel)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/ezal/competitors` | GET | Get competitor data |
| `/api/ezal/discovery` | POST | Discover new competitors |
| `/api/ezal/insights` | GET | Get market insights |

### Smokey (Product Search)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/smokey/find` | POST | Find products |
| `/api/smokey/alert/create` | POST | Create price/stock alert |
| `/api/smokey/cart/prepare` | POST | Prepare cart |

### Webhooks
| Endpoint | Purpose |
|----------|---------|
| `/api/webhooks/error-report` | Linus interrupt trigger |
| `/api/webhooks/cannpay` | Payment webhooks |
| `/api/webhooks/agent/[id]` | Agent-specific webhooks |

---

## Authentication Patterns

### Protected Routes
```typescript
import { getServerSession } from '@/lib/auth';

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ...
}
```

### Service Account Routes (Internal)
```typescript
// For cron jobs and internal services
const authHeader = req.headers.get('Authorization');
const expectedToken = process.env.INTERNAL_API_KEY;
```

---

## Error Handling

All API routes follow this pattern:

```typescript
try {
  // ... logic
  return Response.json({ success: true, data });
} catch (error) {
  logger.error('API error', { error, route: '/api/...' });
  return Response.json(
    { error: error instanceof Error ? error.message : 'Unknown error' },
    { status: 500 }
  );
}
```

---

## Rate Limiting

- Demo endpoints: 10 req/min per IP
- Authenticated: 100 req/min per user
- Super Users: Unlimited

---

## Related Files
- `src/app/api/chat/route.ts` — Main chat logic
- `src/ai/genkit-flows.ts` — AI flow definitions
- `src/server/agents/` — Agent implementations
