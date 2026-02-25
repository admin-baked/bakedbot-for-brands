# CLAUDE.md — BakedBot Codebase Context

> Official Claude Code context file. Loaded automatically on every interaction.

---

## 🚨 FIRST: Check Build Health

```powershell
npm run check:types
```

**If failing, fix build errors before any other work. No exceptions.**

**Current Status:** 🟢 Passing | **Last update:** 2026-02-24 (Brand Guide 2.0 Specs 01-05: archetype selector, budtender staff guide, vendor brand ingestion + Smokey wire-in, NY OCM compliance rules v2, packaging intelligence architecture stub)

---

## Quick Commands

| Command | Purpose |
|---------|---------|
| `npm run check:types` | TypeScript check (run before/after changes) |
| `npm test` | Run Jest tests |
| `npm test -- path/to/file.test.ts` | Test specific file |
| `npm run lint` | ESLint check |
| `npm run dev` | Local dev server |
| `git push origin main` | **Deploy to production** — triggers Firebase App Hosting CI/CD |

> **🚀 Deploy = Push to GitHub.** `git push origin main` automatically starts a Firebase build and deploys to production. Always push after committing finished work.

**Note:** Windows PowerShell — use `;` not `&&` for command chaining.

---

## 🚀 Developer Super Powers (11 Ready-to-Use Scripts)

**All 21 npm scripts deployed 2026-02-22** — Use these for automation, testing, compliance, and observability.

**Linus can execute any super power via Slack:** `@linus execute execute_super_power script=<script-name> options=<cli-options>`

### Tier 1: Foundational
| Command | Purpose |
|---------|---------|
| `npm run audit:indexes` | Report all 81 Firestore composite indexes |
| `npm run setup:secrets` | Audit GCP Secret Manager provisioning status |
| `npm run audit:schema` | Validate 8 collections against schema types |

### Tier 2: Acceleration
| Command | Purpose |
|---------|---------|
| `npm run seed:test` | Seed org_test_bakedbot with 10 customers, 5 playbooks, 3 campaigns |
| `npm run generate:component <Name>` | Scaffold React component + test |
| `npm run generate:action <name>` | Scaffold server action |
| `npm run generate:route <endpoint>` | Scaffold API route (GET/POST) |
| `npm run generate:cron <job-name>` | Scaffold cron job endpoint |
| `npm run fix:build` | Auto-fix TypeScript errors (import paths, console→logger) |

### Tier 3: Safety
| Command | Purpose |
|---------|---------|
| `npm run test:security` | Run 12 role-based security scenarios |
| `npm run check:compliance --text "..."` | Check content for compliance violations (Claude Haiku) |
| `npm run audit:consistency` | Validate 8 consistency rules across all orgs |

### Tier 4: Observability
| Command | Purpose |
|---------|---------|
| `npm run setup:monitoring` | Configure Cloud Monitoring alerts for Slack #ops |
| `npm run audit:costs` | Analyze Firestore query costs (scans $5-15/mo, optimal $0.10-0.50/mo) |

**Details:** See `.agent/specs/` for full super powers documentation.

**Linus Slack Usage Examples:**
```
@linus execute execute_super_power script=fix-build options=--apply
@linus execute execute_super_power script=audit-indexes
@linus execute execute_super_power script=audit-schema options=--orgId=org_thrive_syracuse
@linus execute execute_super_power script=setup-secrets options=--deploy
@linus execute execute_super_power script=check-compliance options=--text="Buy weed today"
```

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

## 🚀 Auto-Approved Operations (Production Automation)

### Claude Code (This Tool)
Claude can execute autonomously without asking:
- Cloud Scheduler job creation/modification/execution
- Backfill commands (90-day historical data import)
- Manual cron job triggers
- Deployment commands (`git push origin main`)
- Service account setup (IAM operations)

### Linus (CTO Agent)
Linus has **comprehensive CTO autonomy**. See `.agent/LINUS_CTO_AUTONOMY.md` for full charter.

**Core Autonomy:**
| Domain | Linus Can | Examples |
|--------|-----------|----------|
| **Code Management** | Push to main, create branches, revert | `git push`, `git commit`, `git revert` |
| **Build & Test** | Run full suite, analyze failures | `npm run check:types`, `npm test` |
| **Developer Productivity** | Execute super power scripts autonomously | `execute_super_power script=fix-build options=--apply` |
| **Deployment** | GO/NO-GO decisions, deploy to production | Firebase App Hosting push |
| **Incident Response** | Auto-revert failed deployments, fix issues | Deploy failure → auto-revert ✅ |
| **Cron Jobs** | Create/modify Cloud Scheduler | `gcloud scheduler jobs create http ...` |
| **Infrastructure** | Service accounts, IAM roles | Create automated deployment accounts |
| **Reporting** | Real-time Slack + dashboard updates | Auto-notify on deploy/incident |

**Safety Mechanisms:**
- ✅ Build must pass before push (hard gate)
- ✅ Deployment failure → auto-revert within 2 minutes
- ✅ Destructive ops (delete critical jobs) require human approval
- ✅ Full audit trail in Firestore (every action logged)
- ✅ Hive Mind memory (learns from incidents)

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
