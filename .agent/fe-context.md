# FE Agent Context — BakedBot Frontend

> Load this first. You are the Frontend (FE) builder agent. You own `src/components/` and `src/app/(pages)/`. You start after BE says "CONTRACT READY" — load `.agent/refs/agent-contract.md` before writing any code.

---

## Step 1: Load These Refs (in order)

| Priority | File | Why |
|----------|------|-----|
| 1 | `.agent/refs/agent-contract.md` | API contract from BE — your source of truth for types and endpoints |
| 2 | `.agent/refs/frontend.md` | Full frontend architecture — Next.js App Router, ShadCN, Tailwind, component patterns, state management |
| 3 | `.agent/refs/authentication.md` | Auth state in UI — how sessions work, role checks in components |
| 4 | `.agent/refs/roles.md` | RBAC — which UI elements render per role; use role guards correctly |
| 5 | `.agent/refs/api.md` | Existing endpoints — know what's already available before writing new fetches |

**Load on demand:**
- `.agent/refs/vibe-builder-spec.md` — if building page-editor UI
- `.agent/refs/playbook-architecture.md` — if building playbook-related UI
- `.agent/refs/ux-design-system.md` — Tailwind/ShadCN token reference

---

## Step 2: Your Domain at a Glance

### Key Directories
```
src/components/
  ui/           ShadCN primitives (Button, Card, Dialog, etc.) — use these first
  shared/       BakedBot shared components (PuffChat, ThinkingWindow, etc.)
  dashboard/    Role-specific dashboard components
src/app/
  (pages)/      Next.js page routes (App Router)
  dashboard/    Dashboard route group
src/lib/        Client-side utilities
```

### Canonical Patterns

**Server Component (default — no state, no hooks):**
```tsx
import { requireAuth } from '@/lib/auth'

export default async function MyPage() {
  const session = await requireAuth()
  const data = await fetchData(session.orgId) // server-side fetch
  return <MyComponent data={data} />
}
```

**Client Component (only when interactivity needed):**
```tsx
'use client'
import { useState } from 'react'
// No direct DB calls — use server actions or API routes
```

**Server Action call from client:**
```tsx
'use client'
import { myServerAction } from '@/server/actions/my-action'

const handleSubmit = async () => {
  const result = await myServerAction(input)
  // handle result
}
```

**Role guard in UI:**
```tsx
import { useSession } from '@/lib/auth'

const { role } = useSession()
if (role !== 'brand' && role !== 'super_user') return null
```

**ShadCN component usage:**
```tsx
// Always import from @/components/ui — never reimplement
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
```

**State management:**
- Local UI state → `useState` / `useReducer`
- Server state / caching → React Query (`useQuery`, `useMutation`)
- Global client state → Zustand (check existing stores before creating new)

### Existing Key Components (check before building new)
| Component | Location | Purpose |
|-----------|----------|---------|
| PuffChat | `src/components/shared/` | Agent chat interface |
| ThinkingWindow | `src/components/shared/` | AI reasoning display |
| Unified Inbox | `src/components/dashboard/` | Multi-agent inbox |
| Typewriter | `src/components/shared/` | Animated text output |

---

## Step 3: What to Avoid

| Mistake | Rule |
|---------|------|
| Business logic in components | All mutations → server actions; components only render and call actions |
| Custom UI when ShadCN exists | Check `src/components/ui/` first — never reinvent Button, Dialog, Card, etc. |
| Hardcoded colors | Tailwind tokens only — `bg-primary`, `text-muted-foreground`, etc. |
| `console.log` | Use `logger` from `@/lib/logger` |
| Client-side Firestore | Never — all DB access goes through server actions or API routes |
| `useEffect` for data fetching | Use React Query or server components instead |
| Missing loading/error/empty states | Every data-dependent component needs all three |
| Missing mobile breakpoints | Always add `sm:` and `md:` variants for layout-affecting styles |
| `any` type | Use types from `agent-contract.md` — never implicit `any` |
