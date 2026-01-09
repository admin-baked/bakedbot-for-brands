# CLAUDE.md — BakedBot Codebase Context for AI Agents

> This file follows the official Claude Code convention. It provides context for Claude-based agents (like Linus) operating within this repository.

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start local dev server |
| `npm run check:types` | TypeScript check (production-safe) |
| `npm test` | Run Jest tests (dev only) |
| `npm run lint` | ESLint check |
| `git push origin main` | Deploy via Firebase App Hosting |

---

## Project Overview

**BakedBot AI** is an "Agentic Commerce OS" for the cannabis industry:
- Multi-agent platform keeping customers in brand's funnel
- Routes orders to retail partners for fulfillment
- Automates marketing, analytics, compliance, and competitive intelligence

**Tech Stack:**
- **Framework**: Next.js 15+ (App Router)
- **Backend**: Firebase (App Hosting, Firestore, Auth)
- **AI Core**: Genkit (Gemini), Claude (Anthropic SDK)
- **UI**: Tailwind CSS, ShadCN UI, Framer Motion

---

## Core Directory Map

```
src/
├── app/                     # Next.js pages
│   ├── api/                 # API routes
│   ├── dashboard/           # Role-based dashboards
│   └── (marketing)/         # Public pages
├── components/              # React components
├── server/
│   ├── agents/              # Agent definitions ⭐
│   ├── services/            # Business logic
│   │   ├── letta/           # BakedBot Intelligence (memory)
│   │   ├── rtrvr/           # BakedBot Discovery (browser)
│   │   └── ezal/            # Competitive intel
│   ├── actions/             # Server Actions
│   └── tools/               # Agent tools
├── ai/                      # AI wrappers (claude.ts)
└── lib/                     # Utilities

dev/                         # Development context
├── backlog.json             # Task backlog
├── progress_log.md          # Session logs
└── test_matrix.json         # Test commands

.agent/                      # Agent context
├── prime.md                 # Agent philosophy
├── refs/                    # Detailed references ⭐
└── workflows/               # Automation recipes
```

> ⭐ = Key integration points for agents

---

## Agent Squad

| Agent | Role | Domain |
|-------|------|--------|
| **Linus** | CTO | Code eval, deployment decisions |
| **Leo** | COO | Executive orchestration |
| **Mike** | CFO | Revenue, billing |
| **Craig** | CMO | Marketing automation |
| **Smokey** | Budtender | Product search |
| **Deebo** | Enforcer | Compliance |
| **Ezal** | Lookout | Competitive intel |

---

## Coding Standards

1. **TypeScript Only** — All code must be typed
2. **Server Actions** — Use `'use server'` for mutations
3. **Firestore Native** — Use `@google-cloud/firestore` (not client SDK)
4. **Error Handling** — Always wrap async in try/catch
5. **Logging** — Use `@/lib/logger` for structured logs
6. **Incremental Changes** — Small commits, frequent tests
7. **Plan First** — Create implementation plan before coding

---

## Key Files

| Purpose | Path |
|---------|------|
| Task Backlog | `dev/backlog.json` |
| Linus Agent | `src/server/agents/linus.ts` |
| Claude Wrapper | `src/ai/claude.ts` |
| Agent Harness | `src/server/agents/harness.ts` |
| App Secrets | `apphosting.yaml` |
| Agent Refs | `.agent/refs/` |

---

## Agentic Workflow

1. **Orient** — Read this file and relevant refs
2. **Plan** — Generate detailed plan, await approval
3. **Execute** — Implement in small increments
4. **Test** — Run tests after each change
5. **Commit** — Commit frequently for easy rollback

### For Complex Tasks
- Read detailed documentation: `.agent/refs/`
- Check backlog status: `dev/backlog.json`
- Run health check: `npm run check:types`

---

## Memory Systems

### BakedBot Intelligence (Letta)
- `letta_save_fact` — Persist important insights
- `letta_search_memory` — Query past decisions
- Shared Blocks — Hive Mind with Executive agents

### BakedBot Discovery
- Web search, Firecrawl scraping
- RTRVR browser automation
- Ezal competitive monitoring

---

## Task Statuses

| Status | Meaning |
|--------|---------|
| `pending` | Not started |
| `in_progress` | Being worked on |
| `passing` | Complete and verified |
| `failing` | Needs fix |

---

## Progressive Disclosure

For detailed documentation, see `.agent/refs/`:

| Topic | File |
|-------|------|
| BakedBot Intelligence | `refs/bakedbot-intelligence.md` |
| BakedBot Discovery | `refs/bakedbot-discovery.md` |
| Agentic Coding | `refs/agentic-coding.md` |
| API | `refs/api.md` |
| Backend | `refs/backend.md` |
| Testing | `refs/testing.md` |

Read these on-demand to avoid context window bloat.

---

*This file is read by Linus and other Claude-based agents to understand the codebase.*
