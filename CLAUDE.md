# CLAUDE.md — BakedBot Codebase Context

> Official Claude Code context file. Loaded automatically on every interaction.

---

## 🚨 FIRST: Check Build Health

```powershell
npm run check:types
```

**If failing, fix build errors before any other work. No exceptions.**

**Current Status:** 🟢 Passing | **Last update:** 2026-02-18 (Billing Phase 8-10 tests + Creative Studio Canva redesign — 46 new tests, 0 TS errors)

---

## Quick Commands

| Command | Purpose |
|---------|---------|
| `npm run check:types` | TypeScript check (run before/after changes) |
| `npm test` | Run Jest tests |
| `npm test -- path/to/file.test.ts` | Test specific file |
| `npm run lint` | ESLint check |
| `npm run dev` | Local dev server |
| `git push origin main` | Deploy via Firebase App Hosting |

**Note:** Windows PowerShell — use `;` not `&&` for command chaining.

---

## Project Overview

**BakedBot AI** — Agentic Commerce OS for cannabis industry
- Multi-agent platform keeping customers in brand's funnel
- Routes orders to retail partners for fulfillment
- Automates marketing, analytics, compliance, competitive intelligence

**Tech Stack:**
- Next.js 15+ (App Router) | Firebase (Firestore, Auth, App Hosting)
- AI: Genkit (Gemini), Claude (Anthropic SDK)
- UI: Tailwind CSS, ShadCN UI, Framer Motion

---

## Directory Structure

```
src/
├── app/                     # Next.js pages & API routes
│   ├── api/                 # API routes
│   └── dashboard/           # Role-based dashboards
├── components/              # React components
├── server/
│   ├── agents/              # Agent implementations ⭐
│   ├── services/            # Business logic
│   │   ├── letta/           # Memory service
│   │   ├── rtrvr/           # Browser automation
│   │   └── ezal/            # Competitive intel
│   ├── actions/             # Server Actions ('use server')
│   └── tools/               # Agent tools (Genkit)
├── ai/                      # AI wrappers (claude.ts)
└── lib/                     # Utilities

.agent/
├── prime.md                 # Agent startup context (READ FIRST)
├── refs/                    # Detailed reference docs ⭐
└── workflows/               # Automation recipes

dev/
├── work_archive/            # Historical decisions
├── backlog.json             # Task tracking
└── progress_log.md          # Session logs
```

---

## Coding Standards

| Standard | Rule |
|----------|------|
| **TypeScript** | All code must be typed. Prefer `unknown` over `any`. |
| **Server Actions** | Use `'use server'` directive for mutations |
| **Firestore** | Use `@google-cloud/firestore` (not client SDK) |
| **Error Handling** | Always wrap async in try/catch |
| **Logging** | Use `@/lib/logger` (never `console.log`) |
| **Changes** | Small, incremental. Test after each change. |

---

## Workflow

### Simple Task (1-2 files)
1. Read the file(s) you're changing
2. Make the change
3. Run `npm run check:types`
4. Run tests if applicable
5. Commit

### Complex Task (3+ files, new feature)
1. Run `npm run check:types` — ensure build is healthy
2. Query work history: `query_work_history({ query: "area/file" })`
3. Read relevant refs from `.agent/refs/`
4. Create plan, get user approval
5. Implement incrementally (test after each change)
6. Archive decisions: `archive_work({ ... })`
7. Commit and push

---

## Reference Documentation

Load from `.agent/refs/` on-demand (conserve context):

| Topic | File |
|-------|------|
| **Start here** | `.agent/prime.md` |
| Agents & Architecture | `refs/agents.md` |
| Memory/Letta | `refs/bakedbot-intelligence.md` |
| Browser Automation | `refs/autonomous-browsing.md` |
| Auth & Sessions | `refs/authentication.md` |
| Roles & Permissions | `refs/roles.md` |
| Backend Services | `refs/backend.md` |
| API Routes | `refs/api.md` |
| Frontend/UI | `refs/frontend.md` |
| Testing | `refs/testing.md` |
| Integrations | `refs/integrations.md` |
| Work Archive | `refs/work-archive.md` |

**Full index:** `.agent/refs/README.md`

---

## Agent Squad

| Agent | Role | Domain |
|-------|------|--------|
| **Linus** | CTO | Code eval, deployment, bug fixing |
| **Leo** | COO | Operations orchestration |
| **Smokey** | Budtender | Product search, recommendations |
| **Craig** | Marketer | Campaigns (SMS: Blackleaf, Email: Mailjet) |
| **Ezal** | Lookout | Competitive intelligence |
| **Deebo** | Enforcer | Compliance |

> Full details: `.agent/refs/agents.md`

---

## Key Files

| Purpose | Path |
|---------|------|
| Agent startup context | `.agent/prime.md` |
| Claude wrapper | `src/ai/claude.ts` |
| Agent harness | `src/server/agents/harness.ts` |
| Linus agent | `src/server/agents/linus.ts` |
| Work archive | `dev/work_archive/` |
| App secrets | `apphosting.yaml` |

---

## Memory & History

### Work Archive (Local)
- `query_work_history` — Check before modifying files
- `archive_work` — Record decisions after changes
- Location: `dev/work_archive/`

### Letta Memory (Persistent)
- `letta_save_fact` — Store important insights
- `letta_search_memory` — Query past decisions
- Shared across Executive agents (Hive Mind)

---

## Common Pitfalls

| Mistake | Fix |
|---------|-----|
| Editing without reading | Always Read file first |
| Skipping build check | Run `npm run check:types` before/after |
| Large unplanned changes | Break into increments, get approval |
| Using `&&` in PowerShell | Use `;` instead |
| Using `console.log` | Use `logger` from `@/lib/logger` |
| Forgetting to archive | Call `archive_work` after significant changes |

---

*For detailed context, load `.agent/prime.md` first, then relevant refs as needed.*
