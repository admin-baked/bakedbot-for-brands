# CLAUDE.md — BakedBot Codebase Context for AI Agents

> This file follows the official Claude Code convention. It provides context for Claude-based agents (like Linus) operating within this repository.

---

## Project Overview

**BakedBot AI** is an "Agentic Commerce OS" for the cannabis industry. It is a multi-agent platform that:
- Keeps customers in a brand's own funnel
- Routes orders to retail partners for fulfillment
- Automates marketing, analytics, compliance, and competitive intelligence

**Tech Stack:**
- **Framework**: Next.js 15+ (App Router)
- **Backend/Infra**: Firebase (App Hosting, Functions, Firestore, Auth)
- **AI Core**: Google Genkit (Gemini) for general flows, Claude (Anthropic SDK) for agentic coding
- **UI**: Tailwind CSS, ShadCN UI (Radix), Framer Motion
- **Integrations**: Stripe, Authorize.net, SendGrid, Twilio, CannMenus, Firecrawl

---

## Project Structure

```
bakedbot-for-brands/
├── src/
│   ├── app/                  # Next.js App Router pages
│   │   ├── api/              # API routes (chat, jobs, webhooks)
│   │   ├── dashboard/        # Role-based dashboards (ceo, dispensary, brand, customer)
│   │   └── (marketing)/      # Public marketing pages
│   ├── components/           # React components (ShadCN + custom)
│   ├── server/
│   │   ├── agents/           # Agent definitions (linus.ts, harness.ts, schemas.ts)
│   │   ├── services/         # Business logic services (letta/, ezal/, rtrvr/)
│   │   ├── actions/          # Server Actions
│   │   └── tools/            # Agent tools (letta-memory.ts, etc.)
│   ├── ai/                   # AI model wrappers (claude.ts, genkit-flows.ts)
│   ├── config/               # App configuration
│   └── lib/                  # Utilities (firebase/, store/, logger.ts)
├── dev/                      # Development context
│   ├── backlog.json          # Task backlog with status tracking
│   ├── progress_log.md       # Session-by-session progress notes
│   └── test_matrix.json      # Test commands by area
├── tests/                    # Jest unit tests
├── .agent/                   # Agent memory files (prime.md, CHEATSHEET.md)
└── apphosting.yaml           # Firebase App Hosting config (secrets)
```

---

## Agent Squad

| Agent | Role | File |
|-------|------|------|
| **Linus** | AI CTO, Code Eval, Deployment | `src/server/agents/linus.ts` |
| **Leo** | CEO, Executive Orchestration | `src/app/dashboard/ceo/agents/` |
| **Mike** | CFO, Revenue & Billing | `src/app/dashboard/ceo/agents/` |
| **Craig** | CMO, Marketing Automation | `src/app/dashboard/ceo/agents/` |
| **Smokey** | Budtender, Product Search | `defaultSmokeyTools` |
| **Deebo** | Compliance Enforcer | Gauntlet evaluators |

---

## Common Commands

```bash
# Development
npm run dev              # Start local dev server
npm run check:types      # TypeScript type check (production-safe)
npm test                 # Run Jest tests (dev only)

# Deployment
git push origin main     # Triggers Firebase App Hosting auto-deploy

# Health Check (for Linus)
npm run check:types      # Safe in production (typescript in dependencies)
cat dev/backlog.json     # Check task status
```

---

## Key Files for Code Tasks

| Purpose | File |
|---------|------|
| **Task Backlog** | `dev/backlog.json` |
| **Progress Log** | `dev/progress_log.md` |
| **App Secrets** | `apphosting.yaml` |
| **Claude Wrapper** | `src/ai/claude.ts` |
| **Linus Agent** | `src/server/agents/linus.ts` |
| **Agent Harness** | `src/server/agents/harness.ts` |

---

## Coding Standards

1. **TypeScript Only** — All code must be typed.
2. **Server Actions** — Use `'use server'` for mutations.
3. **Firestore Native** — Use `@google-cloud/firestore` (not Firebase client SDK).
4. **Error Handling** — Always wrap async operations in try/catch.
5. **Logging** — Use `@/lib/logger` for structured logs.

---

## Current Priorities (from dev/backlog.json)

Check `dev/backlog.json` for the live task list. Common statuses:
- `pending` — Not started
- `in_progress` — Being worked on
- `passing` — Complete and verified
- `failing` — Needs fix

---

## Memory Integration

Linus has access to:
- **Letta Memory** — Long-term archival via `letta_save_fact`, `letta_search_memory`
- **Shared Blocks** — Hive Mind with other Executive agents
- **This File** — Codebase context for orientation

---

*This file is read by Linus and other Claude-based agents to understand the codebase structure and conventions.*
