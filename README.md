# BakedBot AI – Agentic Commerce OS for Cannabis

BakedBot AI is a multi-agent platform for cannabis brands and retailers built on Next.js and Firebase. It powers AI budtenders, lifecycle marketing, pricing intelligence, competitive monitoring, and compliance checks in a single operator experience.

Core idea: **keep the customer in the brand’s own funnel**, while routing orders to retail partners for fulfillment.

---

## 1. Features & Agents

The platform is organized around specialized AI agents:

- **Smokey – AI Budtender**
  - Semantic product search & recommendations
  - Headless, SEO-friendly menus (`/menu`, `/menu/[brandId]`)
- **Craig – Marketer**
  - Email/SMS campaigns, launches, flows
  - Uses product + event data for lifecycle automation
- **Pops – Analyst**
  - Tracks orders, revenue, funnels and retention
- **Ezal – Lookout**
  - Competitive price & inventory monitoring
- **Money Mike – Banker**
  - Pricing, margins, plans & billing logic
- **Mrs. Parker – Hostess**
  - Loyalty, points, tiers, VIP/win-back flows
- **Deebo – Enforcer**
  - Compliance guardrail / “Regulation OS” for content & experiences

Operator surfaces:

- **Dashboard** (`/dashboard`) – agent control center & analytics
- **Menu** (`/menu`, `/menu/[brandId]`) – Smokey-powered shopping
- **Onboarding** (`/onboarding`) – brand setup flow

---

## 2. Tech Stack

- **Frontend**
  - Next.js 14 (App Router, server & client components)
  - React + TypeScript
  - Tailwind CSS
  - ShadCN UI (Radix primitives)
- **Backend & Platform**
  - Firebase App Hosting (Next.js runtime)
  - Firebase Authentication
  - Firestore (Native mode)
  - Firebase Security Rules & App Check
- **AI / Agents**
  - Genkit (Google) for flows & tools
  - Gemini (`gemini-2.5-flash`) for chat/reasoning
  - `text-embedding-004` for embeddings & semantic search

---

## 3. Getting Started

### Prerequisites

- Node.js 20+ (the hosted runtime uses Node 22)
- npm 9+
- A Firebase project with:
  - App Hosting enabled
  - Firestore (Native) enabled
  - Firebase Auth configured (email/Google sign-in)

### Clone & install

```bash
git clone https://github.com/admin-baked/bakedbot-for-brands.git
cd bakedbot-for-brands

npm install
```

---

## 4. Environment Configuration

For local development, use `.env.local` in the repo root:

```bash
cp .env.example .env.local
```

Fill in at least:

```env
# Firebase Web config (client-side, safe to expose)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Optional: App Check for client
# NEXT_PUBLIC_RECAPTCHA_SITE_KEY=...

# Server-side Admin credential (local dev only; optional if using ADC)
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...","client_email":"...","token_uri":"https://oauth2.googleapis.com/token",...}

# Genkit / Gemini, etc.
GENKIT_API_KEY=...
```

> `NEXT_PUBLIC_*` variables are available in the browser; everything else is server-side only.

### App Hosting (Firebase)

For Firebase App Hosting, the service account JSON is stored in **Secret Manager** and mapped to an env variable via `apphosting.yaml`:

```yaml
# apphosting.yaml
env:
  - variable: FIREBASE_SERVICE_ACCOUNT_KEY
    secret: FIREBASE_SERVICE_ACCOUNT_KEY
    availability:
      - BUILD
      - RUNTIME
```

Steps (one-time per project):

1. Create a service account key JSON in GCP and store it in Secret Manager as `FIREBASE_SERVICE_ACCOUNT_KEY`.

2. Grant your backend access:

   ```bash
   firebase apphosting:secrets:grantaccess FIREBASE_SERVICE_ACCOUNT_KEY --backend studio
   ```

3. Commit `apphosting.yaml` and push to `main`. App Hosting will build from the new commit.

The server code (`src/firebase/server-client.ts`) reads that env var and initializes the Firebase Admin SDK with `cert(...)`, falling back to `applicationDefault()` only if the env var is missing.

---

## 5. Project Structure

All App Router code lives under `src/app`. The legacy root `app/` directory should **not** be used.

```text
src/
  app/                       # Next.js App Router (canonical)
    dashboard/               # Operator UI, agents, analytics
      page.tsx               # Dashboard shell
      ...                    # Playbooks, products, orders, content, etc.
    menu/                    # Headless menu + Smokey
      layout.tsx
      page.tsx
      [brandId]/page.tsx
    onboarding/              # Brand onboarding flow
    products/                # Product detail pages
    checkout/                # Checkout & order submission
    api/                     # Route handlers (agents, search, dev tools)
  firebase/
    client.ts                # Client-side Firebase init
    server-client.ts         # Admin app / Firestore / Auth
  ai/
    genkit.ts                # Genkit config
    flows/                   # Agent flows (Smokey, Craig, etc.)
  server/
    agents/                  # Server-side agent logic (Craig, Ezal, Pops, ...)
    auth/                    # Auth helpers & RBAC
    repos/                   # Firestore repositories
    events/                  # Event emitter / spine
  types/
    domain.ts                # Domain types (Brand, Product, Playbook, etc.)
```

> **Important:** All new routes must be added under `src/app`. Do **not** recreate a top-level `app/` folder.

---

## 6. Development Commands

Common npm scripts:

```bash
# Local development
npm run dev

# Type-check (no emit)
npx tsc --noEmit

# Production build (same as App Hosting)
npm run build

# Linting
npm run lint

# E2E tests (Playwright), if configured
npm run test:e2e
```

---

## 7. Deployment

This repo is deployed via **Firebase App Hosting**:

* Backend ID: `studio`
* Repository: `admin-baked/bakedbot-for-brands`
* Branch: `main`

Deployment flow:

1. Work in a feature branch locally.

2. Ensure `npx tsc --noEmit` and `npm run build` both succeed.

3. Merge to `main` and push:

   ```bash
   git push origin main
   ```

4. App Hosting backend `studio` automatically builds & rolls out the new version using:

   * `apphosting.yaml` for runtime env & secrets
   * `npm run build` as the framework build command

You can inspect builds and rollouts in the Firebase console under:

> App Hosting → Backends → `studio` → Builds / Rollouts

---

## 8. Conventions & Notes

* **Routing:** All Next.js routes belong in `src/app`. Avoid multiple app trees.
* **Types:** Domain types live in `src/types/domain.ts`. UI code (especially dashboards) may use looser types (`any[]`) while flows and repos stay strict.
* **Secrets:** Never commit raw service account JSON. Use:

  * `.env.local` for local dev (gitignored)
  * Secret Manager + `apphosting.yaml` for App Hosting
* **Agents:** Each agent (Smokey, Craig, Pops, Ezal, Money Mike, Mrs. Parker, Deebo) should have:

  * A Genkit flow definition in `src/ai/flows/`
  * Server-side handlers in `src/server/agents/`
  * UI entry points in `src/app/dashboard/*` where relevant

This README is meant as a **practical onboarding guide**. Detailed documentation can be found in the `docs/` directory.

If you’re adding new features or agents, update this document so the next engineer doesn’t have to reverse-engineer the architecture from the codebase.
