# API Reference

## Overview
BakedBot uses Next.js App Router API routes located in `src/app/api/`.

---

## Route Structure

```
src/app/api/
├── chat/
│   └── route.ts          # Main chat endpoint (Genkit flows)
├── demo/
│   └── agent/
│       └── route.ts      # Demo agent for homepage playground
├── jobs/
│   └── process/
│       └── route.ts      # Background job processor
├── webhooks/
│   ├── stripe/           # Stripe payment webhooks
│   └── pos/              # POS integration webhooks
├── auth/
│   └── [...nextauth]/    # NextAuth.js routes
└── cron/
    └── route.ts          # Scheduled task handlers
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
