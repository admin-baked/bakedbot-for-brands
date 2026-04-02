# CLAUDE.md — BakedBot Codebase Context

> Official Claude Code context file. Loaded automatically on every interaction.

---

## 🚨 FIRST: Check Build Health

```powershell
.\scripts\npm-safe.cmd run check:types
```

**If failing, fix build errors before any other work. No exceptions.**

**Current Status:** 🟢 Passing | **Last update:** 2026-04-02 (Deployment Slack routing fix — #linus-deployments)

---

## 🔄 Auto-Simplify Protocol (MANDATORY)

After completing ANY code modifications AND **before every `git push` / Firebase deploy**, you **MUST** run `/simplify`:

1. **Find changes:** Run `git diff HEAD` to capture all modified code. If empty, use `git diff HEAD~1`.
2. **3 parallel reviews against the diff:**
   - **Code Reuse:** Flag newly written code that duplicates existing utilities/helpers.
   - **Code Quality:** Flag redundant state, parameter sprawl, copy-paste, leaky abstractions, silent catches.
   - **Efficiency:** Flag redundant work, sequential calls that could be parallel, N+1 patterns, memory leaks.
3. **Fix every confirmed finding** directly in the code.
4. **Run `.\scripts\npm-safe.cmd run check:types`** to verify fixes don't break the build.
5. **Summarize** what was changed.

> This is NOT optional. Every code session ends with `/simplify`, and every `git push` is gated on it. See `.agent/workflows/simplify.md` for the full protocol.
> **Applies to all builder agents:** Claude Code, Codex, and Gemini — no exceptions.

---

## Quick Commands

| Command | Purpose |
|---------|---------|
| `.\scripts\npm-safe.cmd run check:types` | TypeScript check (run before/after changes) |
| `.\scripts\npm-safe.cmd test` | Run Jest tests |
| `.\scripts\npm-safe.cmd test -- path/to/file.test.ts` | Test specific file |
| `.\scripts\npm-safe.cmd run lint` | ESLint check |
| `.\scripts\npm-safe.cmd run dev` | Local dev server |
| `git push origin main` | **Deploy to production** — triggers Firebase App Hosting CI/CD |

> **🚀 Deploy = Push to GitHub.** `git push origin main` automatically starts a Firebase build and deploys to production. Always push after committing finished work.

**Note:** Windows PowerShell — use `;` not `&&` for command chaining.

---

## 🔴 PR Governance (MANDATORY — CI will fail without this)

Every PR body **must** include all 8 sections below. GitHub's PR template (`.github/PULL_REQUEST_TEMPLATE.md`) has the full checklist, but when creating PRs via API/MCP/CLI the template is NOT auto-applied — you must fill it in manually.

**Required sections** (CI governance check scans for these exact strings):

```
# Summary
# Risk Tier
# Canonical Reuse
# New Abstractions
# Failure Modes
# Verification
# Observability
# Explainability
```

**Also required:** exactly one label matching `risk:tier0`, `risk:tier1`, `risk:tier2`, or `risk:tier3`.

**Suppression rule:** if your diff contains `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, or `: any`, you must explicitly justify it in the PR body or the governance check will block the PR.

> **Tip:** Use `doc: any` patterns for firebase-admin/firestore callbacks (module resolution is broken in this tsconfig — established pattern since commit `6fc39372`). Justify in `# Failure Modes` or `# Explainability`.

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

### Tier 5: Infrastructure
| Command | Purpose |
|---------|---------|
| `npm run firebase:apphosting -- status` | List recent App Hosting rollouts (state, duration, commit) |
| `npm run firebase:apphosting -- logs <id>` | Stream build logs for a rollout or Cloud Build ID |
| `npm run firebase:apphosting -- rollout` | Trigger new rollout from main branch HEAD |
| `npm run firebase:apphosting -- cancel <id>` | Cancel an in-progress Cloud Build job |
| `npm run firebase:apphosting -- builds` | List raw Cloud Build jobs (lower level) |

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

## Builder AI Agents

These agents write and ship code in this repo. All follow the same `/simplify` + session-end protocol.

| Agent | Platform | Protocol |
|-------|----------|----------|
| **Claude Code** | Anthropic CLI / IDE | Primary — full CLAUDE.md protocol |
| **Codex** | OpenAI Codex | Same: `/simplify` pre-push, session-end update, no `console.log`, typed TS |
| **Gemini** | Google Gemini CLI / Code Assist | Same: `/simplify` pre-push, session-end update, no `console.log`, typed TS |

> When Codex or Gemini complete a coding session, they must run `/simplify` before pushing and update `CLAUDE.md` line 15 + `prime.md` recent work block. Memory archive auto-runs if MEMORY.md > 150 lines.

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

When the user says **"Update recent work"** (or similar), execute this checklist automatically — no questions.

> **Multi-tab reality:** Multiple sessions often run in parallel across different tabs and complete at different times. The protocol below handles this safely — each tab writes to its own isolated session file first, then a conflict-free merge updates the shared files.

---

### Step 1 — Write a session file (ALWAYS FIRST, every tab)

Write `memory/sessions/YYYY-MM-DD-HHMM-{slug}.md` before touching any shared file. This is your isolated record — safe to write even if other tabs have already updated CLAUDE.md.

```markdown
---
date: YYYY-MM-DD
time: HH:MM
slug: feature-a-feature-b
commits: [commitHash1, commitHash2]
features: [Feature A, Feature B]
---

## Session YYYY-MM-DD — Feature A + Feature B

- bullet summary (3–5 points max)
- Gotchas discovered
```

**Why first:** if anything fails later, this file ensures the session is never lost.

---

### Step 2 — Append to `memory/MEMORY.md`

Prepend your session block under a new `## Session YYYY-MM-DD` heading.
- 3–5 bullets max, commit hash, ref pointer
- If topic already has a `memory/*.md` file → update that instead, add a one-liner to MEMORY.md

**Safe for concurrent tabs:** each session gets its own dated block. Order by date, not write-time.

---

### Step 3 — Auto-Archive MEMORY.md (if > 150 lines)

**Every time you write to MEMORY.md**, check line count. If > 150:
1. Identify all `## Session` entries **older than the 3 most recent**.
2. Move them to `memory/archive/YYYY-MM.md` (append if file exists). Keep blocks intact.
3. Replace with a single pointer line: `→ Sessions before YYYY-MM-DD archived in memory/archive/YYYY-MM.md`
4. Verify ≤ 150 lines after.

**Permanent sections** (Startup Ritual, etc.) are never archived.

---

### Step 4 — Update shared files (date-gated)

**Only update CLAUDE.md and prime.md if this session's date ≥ the current "Last update" date.**

1. Read `CLAUDE.md` line 15. Parse the existing `YYYY-MM-DD`.
2. If **your session date is newer or equal** → update both files:
   - **`CLAUDE.md` line 15:** `**Current Status:** 🟢 Passing | **Last update:** YYYY-MM-DD (Feature A, Feature B)`
   - **`.agent/prime.md` lines ~41–44:** max 2-line block — feature names + commit hashes only
3. If **your session date is older** than what's already there → **skip both files**. Your session is already captured in MEMORY.md and `memory/sessions/`. Don't overwrite newer work.

---

### Step 5 — Route to topic file if applicable

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

---

### Step 6 — Commit

```bash
git add CLAUDE.md .agent/prime.md
git commit -m "docs: Update session notes YYYY-MM-DD - [brief summary]"
```
Memory files are local-only (not committed — `memory/` lives outside repo).

---

### "Consolidate sessions" — merge all pending tabs at once

When multiple tabs have pending session files in `memory/sessions/`, say **"Consolidate sessions"** to merge them all in one pass:

1. Read all `memory/sessions/*.md` files
2. Sort chronologically by `date` + `time` frontmatter
3. For each session (oldest → newest):
   - Append its block to MEMORY.md (skip if already present)
   - Route to topic file if applicable
4. Update CLAUDE.md line 15 + prime.md with the **most recent** session's data
5. Auto-archive MEMORY.md if > 150 lines
6. Delete all processed `memory/sessions/*.md` files
7. Commit: `docs: Consolidate N sessions YYYY-MM-DD`

> Use this after running "Update recent work" across multiple tabs, or when you remember sessions you forgot to update.

---

### ⚠️ What NOT to do
- Do NOT update CLAUDE.md/prime.md if your session is older than what's already there
- Do NOT add full implementation details to `prime.md`
- Do NOT add more than 2–3 lines to the prime.md recent work block
- Do NOT commit `memory/` files (they're in the Claude projects folder, not the repo)

---

*For detailed context, load `.agent/prime.md` first, then relevant refs as needed.*
