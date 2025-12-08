# BakedBot AI Copilot Instructions

## Project Overview

**BakedBot** is an Agentic Commerce OS for cannabis brands and retailers. It's a Next.js 14 + Firebase + Genkit monorepo that powers AI agents (Smokey, Craig, Pops, Ezal, Money Mike, Mrs. Parker, Deebo) and operator dashboards.

**Core Mission**: Keep customers in the brand's funnel while routing orders to retail partners.

---

## Architecture & Key Patterns

### Stack
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, ShadCN UI (Radix)
- **Backend**: Firebase App Hosting, Firestore (Native mode), Firebase Auth with custom claims (RBAC)
- **AI**: Genkit (Google) + Gemini 1.5 Flash + `text-embedding-004` for semantic search
- **Payments**: Stripe (webhooks at `src/app/api/payments/webhooks/route.ts`)
- **External**: CannMenus API, SendGrid, Sentry

### Directory Structure
```
src/
  app/              # Next.js App Router (canonical; legacy root/app/ unused)
    dashboard/      # Operator UI: analytics, marketing, inventory, distribution
    menu/           # Smokey-powered shopping & menu
    onboarding/     # Brand setup flow
    checkout/       # Order submission
    api/            # Route handlers
  firebase/         # Client (client.ts) and server (server-client.ts, admin.ts)
  ai/               # Genkit config (genkit.ts), agent flows, tools
  server/           # Server actions, repos, auth middleware, services
  components/       # ShadCN UI + custom React components
  types/            # Domain types (domain.ts, products.ts, cannmenus.ts, etc.)
  lib/              # Utilities, demo data, logger, hooks
  context/          # React context providers
  stores/           # Zustand stores (cart, UI state with persist)
```

### Data & Authentication Flow
1. **Client Auth**: Firebase Web SDK → sign-in modal → session cookie (`__session`)
2. **Server Auth**: `requireUser()` in `src/server/auth/auth.ts` validates `__session`, enforces role-based access
3. **Dev Bypass**: Set `x-simulated-role` cookie in dev to test different personas without full Firebase flow
4. **Firestore Queries**: Use **converters** (`src/firebase/converters.ts`) to hydrate domain types with nested data
5. **Server Actions**: All data mutations use `'use server'` in `src/app/*/actions.ts` files

### Key Integration Points
- **Genkit Flows** (`src/ai/flows/`): Entry point from server actions → AI model calls
- **Agent Config** (`src/config/agents.ts`): Centralized agent definitions & behavior rules
- **Firestore Rules** (`firestore.rules`): Enforced at read/write; rules override API calls
- **API Routes** (`src/app/api/`): Webhooks (Stripe, CannPay), agent dispatch, search endpoints

---

## Critical Developer Workflows

### Build & Validation
```bash
npm run build:embed      # Build TypeScript/Genkit code to dist/ (tsup)
npm run check:structure  # Validate app directory structure
npm run check:types      # tsc --noEmit (strict TypeScript)
npm run check:lint       # next lint (ESLint)
npm run check:all        # Run all checks in sequence
npm run build            # Full production build (embed + structure + types + next build)
```

### Testing
```bash
npm test                 # Run Jest (unit/integration) from tests/
npm test:watch          # Watch mode
npm test:e2e            # Playwright E2E from e2e/ directory (uses Chromium by default)
npm run test:coverage   # Coverage report (thresholds: 70% branches/functions/lines)
```
**Playwright Config**: `playwright.config.ts` — baseURL is `http://localhost:3000`; run `npm run dev` to start server before E2E tests.

### Local Development
```bash
npm run dev             # Next.js dev server on :3000
npm run dev:with-sa     # PowerShell script to start dev with Firebase service account
npm run lint            # Fix linting issues
```

### Deployment
- **Firebase App Hosting**: Deployments triggered via GitHub Actions (`.github/workflows/`)
- **Firestore Indexes**: Must be deployed manually or via `firebase deploy --only firestore:indexes`
- **Sentry**: Integrated via `sentry.client.config.ts` and `sentry.server.config.ts`

---

## Code Patterns & Conventions

### Server Actions (Data Layer)
- **File Pattern**: `src/app/[feature]/actions.ts` — always mark `'use server'` at top
- **Auth Check**: Call `requireUser(roles?)` first; throws if unauthorized
- **Firestore Client**: Use `const { firestore } = await createServerClient()`
- **Validation**: Use Zod schemas for form inputs
- **Example**:
  ```typescript
  // src/app/dashboard/inventory/actions.ts
  'use server';
  import { createServerClient } from '@/firebase/server-client';
  import { requireUser } from '@/server/auth/auth';
  
  export async function getInventoryData(brandId: string) {
    const user = await requireUser(['brand', 'owner']);
    const { firestore } = await createServerClient();
    // Query, validate, return
  }
  ```

### Components & Pages
- **Async Pages**: Fetch data in `page.tsx` with `export const dynamic = 'force-dynamic'` for live data
- **Suspense Boundaries**: Wrap slow data fetches in `<Suspense>` with fallback skeleton
- **Client Components**: Use `'use client'` sparingly; prefer server components + progressive enhancement
- **State Management**: Zustand for cart, UI preferences; React Context for auth/theme

### Genkit Flows
- **Location**: `src/ai/flows/*.ts`
- **Pattern**: Define flow + prompt with `ai.definePrompt()` → `ai.defineFlow()` → server action wrapper
- **Models**: Default to `gemini-1.5-flash`; use `gemini-1.0-pro` for cost optimization on simple tasks
- **Schemas**: Use Zod for input/output with `.describe()` for LLM context
- **Compliance**: Add guardrails in prompts (e.g., "No medical claims," "MUST NOT diagnose")
- **Example**:
  ```typescript
  // src/ai/flows/generate-product-description.ts
  'use server';
  import { ai } from '@/ai/genkit';
  import { z } from 'zod';
  
  const inputSchema = z.object({
    productName: z.string().describe('Product name'),
    features: z.string().describe('Key features'),
  });
  
  const prompt = ai.definePrompt({
    name: 'generateProductPrompt',
    input: { schema: inputSchema },
    output: { schema: outputSchema },
    prompt: `You are a copywriter. Generate descriptions WITHOUT medical claims...`,
  });
  
  const generateFlow = ai.defineFlow(
    { name: 'generateFlow', inputSchema, outputSchema },
    async (input) => {
      const { output } = await prompt(input);
      return output!;
    }
  );
  
  export async function generateProductDescription(input) {
    return generateFlow(input);
  }
  ```

### Types & Domain
- **File**: `src/types/domain.ts` — single source of truth for app entities (Brand, Product, Order, etc.)
- **Converters**: `src/firebase/converters.ts` — Firestore document → domain type transformation
- **Zod Schemas**: Validate API inputs, form data; colocate with actions
- **Avoid**: Spreading raw Firestore docs; always hydrate via converters

### Error Handling
- **Logger**: `src/lib/logger.ts` — use `logger.error()`, `logger.critical()` with tags like `[P0-SEC-CANNPAY-WEBHOOK]`
- **Sentry**: Auto-integrated; no explicit SDK calls needed for Next.js server errors
- **User Feedback**: Return `{ error?: boolean; message: string }` from server actions; UI maps to toast/form errors

---

## Project-Specific Rules

### Firestore Schema Conventions
- **Collections**: Singular naming (e.g., `brands`, `products`, `orders`)
- **Document IDs**: UUIDs generated by client/server; avoid auto-IDs for cross-references
- **Nested Arrays vs Subcollections**: Use subcollections for > 5–10 items (e.g., `orders/{id}/items`)
- **Timestamps**: Always use server-side `serverTimestamp()` for `createdAt`, `updatedAt`

### Compliance & Deebo (Enforcer Agent)
- **Age Verification**: Server-side check in checkout flow; never trust client-side verification
- **Cannabis Regulations**: Deebo agent reviews content before outbound campaigns; tag sensitive features with `[COMPLIANCE]`
- **State-by-State Rules**: `firestore.rules` encodes core policies; Deebo adds contextual logic

### Cart & Checkout Flow
- **State**: Zustand store (`src/stores/cart.ts`) with `persist` middleware
- **Server Validation**: Re-validate inventory, pricing, age before charge in `src/app/checkout/actions.ts`
- **Payment**: Stripe webhooks at `src/app/api/payments/webhooks/route.ts`; validate signature with `Stripe-Signature` header

### Environment & Secrets
- **Client Env**: Prefix `NEXT_PUBLIC_*` (e.g., `NEXT_PUBLIC_FIREBASE_API_KEY`) — safe to expose
- **Server Env**: Plain `FIREBASE_SERVICE_ACCOUNT_KEY` (base64-encoded JSON) for admin SDK
- **Local Dev**: Use `.env.local`; service account key loaded from PowerShell script

---

---

## Agent Personas & Implementation Status

| Agent | Role | Key Flows | Status |
|-------|------|-----------|--------|
| **Smokey** | AI Budtender | Product recommendations (RAG), semantic search, menu UI | ✅ Online |
| **Craig** | Marketer | Email/SMS campaigns, lifecycle flows, draft copy generation | ✅ Online |
| **Pops** | Analyst | Order aggregation, revenue dashboards, cohort analysis | 🔄 Training |
| **Deebo** | Enforcer | Content compliance checks, state-by-state rules review, pre-flight approval | ✅ Online |
| **Money Mike** | Pricing Brain | Margin analysis, competitor pricing, reorder recommendations | ⏸️ Paused |
| **Ezal** | Competitive Monitor | Price/inventory tracking, competitor menu scraping, alerts | 🔄 Training |
| **Mrs. Parker** | Loyalty Host | VIP tiers, points tracking, retention campaigns | 🔄 Training |

**How to extend**: Add agent config to `src/config/agents.ts`; define flows in `src/ai/flows/[agent-name]-*.ts`; wire into dashboard at `src/app/dashboard/agents/[agent-id]/`.

---

## Advanced Patterns

### Creating AI Flows with Tools (Multi-step Reasoning)

Some flows need external tools (document search, API calls, db queries). Pattern:

```typescript
// src/ai/flows/analyze-competitor.ts
'use server';
import { ai } from '@/ai/genkit';

const analyzeTool = ai.defineTool(
  {
    name: 'lookupCompetitorPrices',
    description: 'Fetch competitor pricing from Ezal database',
    inputSchema: z.object({ productId: z.string() }),
    outputSchema: z.object({ competitors: z.array(z.object({ name: z.string(), price: z.number() })) }),
  },
  async (input) => {
    // Implement tool: call Firestore, external API, etc.
    const { firestore } = await createServerClient();
    const snap = await firestore.collection('competitor_prices').doc(input.productId).get();
    return { competitors: snap.data()?.prices || [] };
  }
);

const analyzeFlow = ai.defineFlow(
  { name: 'analyzeCompetitor', inputSchema, outputSchema },
  async (input) => {
    // Flow can call tools, reason, and synthesize results
    const priceData = await analyzeTool(input);
    const { output } = await analyzePrompt({ ...input, priceData });
    return output!;
  }
);
```

### Compliance & Deebo Integration

Deebo must pre-approve **all outbound content** (emails, SMS, menu copy, social posts). Pattern:

1. **Content Generation** (Craig, Smokey, etc.) → produces draft
2. **Compliance Check** (Deebo) → reviews against `firestore.rules` + state-specific rules
3. **Approval / Rejection** → operator can override (logged to audit trail)

```typescript
// src/app/dashboard/marketing/actions.ts
export async function draftEmailCampaign(input) {
  const draft = await generateCampaignContent(input); // Craig flow
  
  // Deebo pre-flight check
  const complianceResult = await checkComplianceDeebo({
    content: draft.emailBody,
    contentType: 'email',
    state: 'CA',
    age_gate: false,
  });
  
  if (!complianceResult.approved) {
    throw new Error(`Compliance issue: ${complianceResult.issues.join(', ')}`);
  }
  
  return draft; // Safe to send
}
```

Key Deebo rules (enforced in `firestore.rules`):
- **No health claims**: "Cure," "treat," "diagnose" forbidden
- **Age gate required**: All cannabis content must route through age verification
- **State rules**: NY ≠ CA ≠ CO; each has different compliance levels
- **Pricing transparency**: Dosage/mg must be clear in product listings

---

## Debugging & Troubleshooting

### Common Issues & Solutions

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| "Forbidden" errors in dashboard | `requireUser()` role mismatch | Check Firestore custom claims; set `x-simulated-role` cookie in dev |
| Genkit flow returns `null` output | Prompt schema mismatch or LLM rejection | Add `.describe()` to all schema fields; log `output` before returning |
| Firestore reads return empty | Rules deny access or data doesn't exist | Check `firestore.rules` match conditions; verify `brandId` matches custom claim |
| Playwright E2E fails locally | Wrong baseURL or server not running | Run `npm run dev` first; ensure `http://localhost:3000` is accessible |
| Sentry not capturing server errors | Dynamic import of `@google-cloud/logging` fails | Check `FIREBASE_PROJECT_ID` env var set; Sentry fallback logs to console |

### Genkit Flow Tracing

Enable detailed Genkit logs for debugging:

```bash
DEBUG=genkit:* npm run dev
```

Watch flow execution, tool calls, and LLM reasoning in console. For production, logs stream to Google Cloud Logging and Sentry.

### Firestore Rules Testing Locally

```bash
firebase emulators:start --import=./firestore-seed
# In another terminal:
npm run test:firestore-rules
```

Test rules changes before deployment; rules are **enforce-at-read/write**, not in app logic.

---

## Testing Patterns & Examples

### Playwright E2E Selectors

Use `data-testid` for reliable, intentional element selection (avoid fragile CSS selectors):

```tsx
// src/components/product-card.tsx
<div data-testid={`product-card-${product.id}`}>
  <h2>{product.name}</h2>
  <button data-testid={`add-to-cart-${product.id}`}>Add</button>
</div>

// e2e/shopping.spec.ts
await page.click('[data-testid="add-to-cart-abc123"]');
await expect(page.locator('[data-testid="cart-count"]')).toHaveText('1');
```

**Multi-step E2E flows**:

```typescript
// e2e/checkout-happy.spec.ts
test('Complete checkout flow', async ({ page }) => {
  await page.goto('/menu/my-brand');
  
  // Browse & add product
  await page.click('[data-testid="product-filter-category-flower"]');
  await page.click('[data-testid="add-to-cart-sku123"]');
  
  // Checkout
  await page.click('[data-testid="checkout-button"]');
  await page.fill('[data-testid="age-verification-input"]', '1990-05-15');
  await page.click('[data-testid="confirm-age"]');
  
  // Payment (Stripe mock in test env)
  await page.fill('[data-testid="card-number"]', '4242424242424242');
  await page.click('[data-testid="submit-payment"]');
  
  // Verify success
  await expect(page).toHaveURL(/\/order-confirmation/);
  await expect(page.locator('[data-testid="order-id"]')).toBeVisible();
});
```

### Jest Unit Tests

Test server actions, repos, and utilities without needing browser:

```typescript
// tests/server/repos/brandRepo.spec.ts
import { makeBrandRepo } from '@/server/repos/brandRepo';
import { mockFirestore } from '@/__mocks__/firestore';

jest.mock('@/firebase/server-client', () => ({
  createServerClient: async () => ({ firestore: mockFirestore }),
}));

describe('BrandRepo', () => {
  it('should fetch brand by ID', async () => {
    const repo = makeBrandRepo();
    const brand = await repo.getById('brand-123');
    
    expect(brand).toEqual(expect.objectContaining({
      id: 'brand-123',
      name: 'Green Valley',
    }));
  });
});
```

---

## Compliance Deep Dive

### Cannabis-Specific Rules Enforced at Multiple Layers

**1. Firestore Rules** (`firestore.rules`):
- Age gate verification fields checked before order creation
- Brand ownership verified for product writes
- Customer data only readable by brand/dispensary/self

**2. Server Actions** (data validation layer):
```typescript
// Validate age server-side BEFORE charging payment
const dateOfBirth = new Date(input.dateOfBirth);
const age = new Date().getFullYear() - dateOfBirth.getFullYear();
if (age < 21) throw new Error('Age verification failed');

// Server-side inventory re-check (prevent double-orders)
const stock = await repo.getProduct(productId);
if (stock.quantity < quantity) throw new Error('Out of stock');
```

**3. Deebo Agent** (pre-flight content approval):
- Scans outbound email/SMS for medical claims
- Validates product descriptions for compliance
- Checks state-specific regulations (NY = stricter than CA)

**4. Middleware** (`src/middleware.ts`):
- Enforces HTTPS, secure headers
- Firestore App Check validates client certificate

---

## Production Readiness Checklist

Before deploying to production:

- [ ] TypeScript compiles: `npm run check:types` ✅
- [ ] Linting passes: `npm run check:lint` ✅
- [ ] Structure valid: `npm run check:structure` ✅
- [ ] E2E tests pass: `npm run test:e2e` (Chromium) ✅
- [ ] Firestore rules deployed: `firebase deploy --only firestore:rules`
- [ ] Sentry initialized (check `sentry.server.config.ts` + `sentry.client.config.ts`)
- [ ] Environment vars set: `FIREBASE_SERVICE_ACCOUNT_KEY`, `STRIPE_SECRET_KEY`, `CANPAY_API_SECRET`
- [ ] Age verification tested in checkout (dev mode: set `x-simulated-role=customer` + DOB)
- [ ] Deebo compliance checks enabled for outbound campaigns
- [ ] Lighthouse score > 90 (check with `npm run audit`)

---

## References

- **Main README**: `README.md` — features, tech stack, getting started
- **Architecture**: `docs/ARCHITECTURE.md` — CI/CD pipelines, file organization
- **Source README**: `src/README.md` — detailed component breakdown
- **Type Definitions**: `src/types/domain.ts` — canonical entity shapes
- **Config**: `src/config/agents.ts` — agent definitions; `next.config.js` — CSP headers, image domains
- **Compliance**: `firestore.rules` — role-based access control; `src/server/auth/auth.ts` — authentication
