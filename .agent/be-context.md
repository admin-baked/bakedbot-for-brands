# BE Agent Context — BakedBot Backend

> Load this first. You are the Backend (BE) builder agent. You own `src/server/`, `src/app/api/`, `src/config/`. You define the API contract before FE or UX start.

---

## Step 1: Load These Refs (in order)

| Priority | File | Why |
|----------|------|-----|
| 1 | `.agent/refs/backend.md` | Full server architecture — services, actions, tools, Firestore patterns, Genkit lazy-init pattern |
| 2 | `.agent/refs/api.md` | 70+ existing endpoints — check before adding a new route |
| 3 | `.agent/refs/authentication.md` | Auth architecture, session management, role hierarchy, permission checks |
| 4 | `.agent/refs/roles.md` | RBAC matrix — every route and service must respect role scoping |
| 5 | `.agent/refs/integrations.md` | 27 external services — check here before writing any third-party call |
| 6 | `.agent/refs/agents.md` | Agent registry — if your feature touches an agent, check its tool contract |
| 7 | `.agent/refs/testing.md` | Test patterns for server actions, agents, and security scenarios |

**Load on demand:**
- `.agent/refs/playbooks-doctrine.md` — if touching playbook execution
- `.agent/refs/agent-task-queue.md` — if touching background jobs or cron
- `.agent/refs/firebase-secrets.md` — if touching environment vars or secrets
- `.agent/refs/delivery-system.md` — if touching order/delivery flows

---

## Step 2: Your Domain at a Glance

### Key Directories
```
src/server/
  agents/       15+ named agents (harness, runner, router)
  services/     Business logic (letta/, rtrvr/, ezal/, etc.)
  actions/      Server Actions ('use server') — mutations live here
  tools/        Genkit agent tools
src/app/api/    API routes (70+ endpoints)
src/config/     Runtime constants, playbook classification
```

### Canonical Patterns

**Server Actions (mutations):**
```typescript
'use server'
import { requireAuth } from '@/lib/auth'
import { logger } from '@/lib/logger'

export async function myAction(input: MyInput) {
  const session = await requireAuth()
  // role check first
  // business logic
  // return typed result
}
```

**API Routes:**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth()
    const body = await req.json()
    // validate with Zod
    // execute
    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error('route-name', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

**Firestore (always use admin SDK):**
```typescript
import { getFirestore } from 'firebase-admin/firestore'
// Never use client SDK in server code
// Always scope queries by orgId
```

**Genkit lazy-init (mandatory):**
```typescript
// NEVER initialize Genkit at module level — causes build failures
// Always lazy-init inside the function that needs it
```

### Writing the API Contract
When you have a clear feature scope, write `.agent/refs/agent-contract.md`:
```markdown
# Contract: <Feature Name>

## Types
\`\`\`typescript
// shared types FE will use
\`\`\`

## Endpoints / Server Actions
| Method | Path / Action | Input | Output | Auth |
|--------|--------------|-------|--------|------|

## Firestore Paths
| Collection | Doc pattern | Fields |
|------------|-------------|--------|
\`\`\`

Then broadcast: "CONTRACT READY — <summary>"
```

---

## Step 3: What to Avoid

| Mistake | Rule |
|---------|------|
| `console.log` | Use `logger` from `@/lib/logger` always |
| Untyped params | All inputs/outputs must be typed — prefer `unknown` over `any` |
| Silent catches | Always log the error; never swallow it |
| Client SDK in server | Always `firebase-admin/firestore`, never client Firestore |
| Module-level Genkit init | Lazy-init only — build will break otherwise |
| New route without checking api.md | 70+ routes exist — check for overlap first |
| `&&` in PowerShell | Use `;` for command chaining on this machine |
| New cron without checking megacron | Check `prime.md` megacron table — route into existing cron if possible |
| Business logic in UI | All mutations → server actions; all queries → server components or React Query |
