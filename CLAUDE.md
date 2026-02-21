# CLAUDE.md — BakedBot Codebase Context

> Official Claude Code context file. Loaded automatically on every interaction.

---

## 🚨 FIRST: Check Build Health

```powershell
npm run check:types
```

**If failing, fix build errors before any other work. No exceptions.**

**Current Status:** 🟢 Passing | **Last update:** 2026-02-20 (Smokey FAB Positioning Fix — expanded BLOCKED_ROUTES to hide on content-heavy dashboard pages)

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

## 🔚 Session End: "Update recent work"

When the user says **"Update recent work"** (or similar), execute this checklist automatically — no questions:

### 1. `CLAUDE.md` — line 15: Current Status
Update the build status line with today's date and a brief summary:
```
**Current Status:** 🟢 Passing | **Last update:** YYYY-MM-DD (Feature A, Feature B)
```

### 2. `.agent/prime.md` — lines ~21–24: Recent work block
Update the 2-line recent work summary with the latest commit hashes:
```
**Recent work (YYYY-MM-DD):** See `memory/MEMORY.md` for full log.
Key completed: [Feature A] (`commitHash`), [Feature B] (`commitHash`)
```
**Rule:** Max 2 lines. No implementation details. Just feature names + commit hashes.

### 3. `memory/MEMORY.md` — add session entry
Prepend a brief session summary under a new `## Session: YYYY-MM-DD` heading (or append to latest).
- New architectural pattern / gotcha discovered → add inline
- New system built → 3–5 bullet points max, commit hash, ref pointer
- If topic already exists in a `memory/*.md` file → update that file instead, add a one-liner to MEMORY.md

### 4. Route to topic file if applicable
| What changed | Update this file |
|---|---|
| Heartbeat, cron, ISR, build monitor | `memory/platform.md` |
| Slack channels, routing, approvals | `memory/slack.md` |
| Agent tools, user promotion, audit | `memory/agents.md` |
| Playbooks, billing, webhooks | `memory/playbooks.md` |
| Thrive / Herbalist config | `memory/customers.md` |
| Competitive intel system | `memory/competitive-intel.md` |
| New pilot customer | `memory/customers.md` |
| Delivery system | `memory/delivery-system-2026-02-17.md` |

### 5. Commit
```bash
git add CLAUDE.md .agent/prime.md
git commit -m "docs: Update session notes YYYY-MM-DD - [brief summary]"
```
Memory files are local-only (not committed — `dev/` is git-ignored; `memory/` lives outside repo).

### ⚠️ What NOT to do
- Do NOT add full implementation details to `prime.md`
- Do NOT add more than 2–3 lines to the prime.md recent work block
- Do NOT let `memory/MEMORY.md` exceed 200 lines (split to topic file if needed)
- Do NOT commit `memory/` files (they're in the Claude projects folder, not the repo)

---

*For detailed context, load `.agent/prime.md` first, then relevant refs as needed.*
