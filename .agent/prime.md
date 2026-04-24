# BakedBot AI Builder Agent - Prime Context

**Loaded automatically on agent startup**

> "We're not just building agents. We're building agents that build themselves."

---

## STARTUP: Confirm jcodemunch

```bash
ls .w/ > /dev/null 2>&1 && cat ~/.code-index/_savings.json
```

| Result | Action |
|--------|--------|
| `.w/` exists + savings JSON | Report: "jcodemunch active Ã¢â‚¬â€ X tokens saved (~$Y)" |
| `.w/` missing | Prompt: "jcodemunch not detected. Run: `jcodemunch index`" |
| `_savings.json` missing | First session Ã¢â‚¬â€ report 0 tokens saved |

Dollar estimate: `total_tokens_saved Ãƒâ€” $0.000003`

---

## STARTUP: Agent Coordination Check (run after jcodemunch)

```bash
node scripts/agent-coord.mjs status
```

| Result | Action |
|--------|--------|
| Active locks on files you plan to touch | Check intent, send a message or wait |
| Messages in inbox | `node scripts/agent-coord.mjs inbox --agent <you>` |
| No conflicts | Proceed — claim files before touching shared primitives |

**Before modifying any shared primitive** (`auth.ts`, `roles.ts`, `campaign-sender.ts`, etc.):
```bash
node scripts/agent-coord.mjs claim <file> --agent <you> --intent "..."
# ... do the work ...
node scripts/agent-coord.mjs done --agent <you>
```

Agent IDs: `claude` | `codex` | `gemini` | `linus` | `fe` | `be` | `ux`

## STARTUP: Spin Up Builder Agents

On session load, spawn the BE agent to lead the workflow. It defines the contract, then FE and UX start in parallel.

**Spawn BE agent now:**

> You are the Backend (BE) builder agent for BakedBot. Load `.agent/be-context.md` — it contains your full reading list, domain orientation, and patterns. Feature to build: [describe feature here]. Write the API contract to `.agent/refs/agent-contract.md` when ready, then say "CONTRACT READY."

Once BE says CONTRACT READY, spawn FE and UX in parallel:

**FE prompt:** You are the Frontend (FE) builder agent for BakedBot. Load `.agent/fe-context.md` — it contains your full reading list, component patterns, and constraints. Feature to build: [describe feature here].

**UX prompt:** You are the UX reviewer for BakedBot. Load `.agent/ux-context.md` — it contains your review protocol, installed skills, and component checklist. Feature being reviewed: [describe feature here]. Begin review when FE output is ready in `src/components/`.

---

## PRIORITY ZERO: Build Health

```powershell
.\scripts\npm-safe.cmd run check:types
```

**Current Status:** local verified | CI unblocked: sync export in 'use server' fixed (`d10bfdaf2`); SMS/10DLC registration (`b1b0093ca`)
**Recent work (2026-04-24):** CI build fix — parseDeckScriptResponse extracted from powerpoint.ts 'use server' to powerpoint-utils.ts (`d10bfdaf2`); SMS/10DLC registration form + admin view (`b1b0093ca`).

---

**Session Status (2026-04-17):** local actor-context/org-scoping hardening, canonical `agent-contract.ts`, internal playbook readiness badges, stronger drift derivation, and Creative Center role-aware Remotion fixes are in progress in the working tree.

## Canonical Engineering Principles (MANDATORY)

`AGENTS.md` is the source of truth. Before writing code:
1. Choose the canonical home for the logic.
2. Reuse existing types, services, schemas, adapters, workflows before adding abstractions.
3. Set the risk tier and explicitly handle failure modes.
4. Preserve observability Ã¢â‚¬â€ billing, auth, integrations, automations must stay debuggable.
5. Keep code explainable: typed boundaries, no silent catches, no hidden UI business logic.

Full workflow protocol: `.agent/refs/workflow-protocol.md`

---

## Workflow Runtime (V1 vs V2)

**V2 stage-based is canonical. V1 step-based is legacy Ã¢â‚¬â€ maintenance only.**

| File | Role |
|------|------|
| `src/server/services/playbook-stage-runner.ts` | **CANONICAL** Ã¢â‚¬â€ all new playbook development |
| `src/server/services/playbook-executor.ts` | **LEGACY** Ã¢â‚¬â€ bug fixes only, no new action types |
| `src/config/workflow-runtime.ts` | Runtime constants + `PlaybookReadiness` type |
| `src/config/playbook-readiness.ts` | Classification map for all 37 playbooks |
| `.agent/refs/workflow-runtime-decision.md` | ADR for the V1/V2 split |

---

## Megacron Pattern (MANDATORY Ã¢â‚¬â€ read before creating any cron endpoint)

Before creating a new cron route, **always check if an existing cron can handle it via routing.**

| New need | Preferred approach |
|----------|-------------------|
| Same day, different agents | Add a section to the existing day's cron |
| New weekday (Tue or Thu) | Add day routing inside `weekly-executive-cadence` |
| New daily window | Add window routing inside `daily-executive-cadence` |
| Truly new independent schedule | New cron file Ã¢â‚¬â€ justify why existing crons can't serve it |

### Current megacrons

| File | Schedule | Routing |
|------|----------|---------|
| `weekly-monday-command` | Mon 7 AM EST | Full Monday Command Day (12 agents) |
| `weekly-wednesday-check` | Wed 2 PM EST | Full Wednesday Inspection Day (9 agents) |
| `weekly-friday-memo` | Fri 4 PM EST | Full Friday Truth Day (13 agents) |
| `weekly-executive-cadence` | Tue 9 AM + Thu 1 PM EST | `getDay()` Ã¢â€ â€™ Build Day or Proof Day |
| `daily-executive-cadence` | 8/12/6/10 PM EST | `getHours()` Ã¢â€ â€™ Morning/Midday/Closeout/Overnight |
| `generate-insights` | hourly/daily | `?type=` Ã¢â€ â€™ customer/velocity/regulatory/competitive-pricing/dynamic/goal-progress |
| `dayday` | 6/7/8 AM daily + Mon 8 AM | `?type=` Ã¢â€ â€™ discovery/international/seo-report/review |

---

## Auto-Approved Operations

Claude can execute without asking:
- Cloud Scheduler job creation/modification/execution
- Backfill commands (`POST /api/cron/backfill-*`)
- Cron job triggers (`POST /api/cron/*`)
- Deployments (`git push origin main` Ã¢â‚¬â€ after build passes)
- Service account setup (IAM operations)

**Linus CTO full autonomy:** `.agent/LINUS_CTO_AUTONOMY.md`

---

## Security: Never Commit These Files

| File | Why |
|------|-----|
| `.env` | Real API keys Ã¢â‚¬â€ use `.env.local` (gitignored) |
| `service-account.json` | GCP service account private key |
| `PRODUCTION_SETUP.md` | Contained plain-text secrets |
| `.codex-firebase-deploy.{out,err}.log` | Firebase output includes API keys |
| `.claude/settings.local.json` | Can include tokens |

All 5 in `.gitignore`. For secret management: `.agent/refs/firebase-secrets.md`

---

## Essential Commands

| Command | Purpose |
|---------|---------|
| `.\scripts\npm-safe.cmd run check:types` | TypeScript check |
| `.\scripts\npm-safe.cmd test` | Run tests |
| `npm run lint` | ESLint |
| `git push origin main` | Deploy to production |
| `npm run gh:checks` | CI status for HEAD |
| `npm run simplify:record` | Record pre-push simplify review |

**Shell Note:** Windows PowerShell Ã¢â‚¬â€ use `;` not `&&`

---


---

## Version Bump (MANDATORY on every push)

Before every , bump  + kiosk footer () using format ****.

| Agent | Suffix | Example |
|-------|--------|---------|
| Claude Code |  |  |
| Gemini |  |  |
| Codex |  |  |

Patch bump guide: +1 small fix · +2 multi-file · +3 new feature · +5 refactor · +7-10 subsystem overhaul

**Current version: 4.10.38-COD** — Full rules: AGENTS.md Versioning Convention

## Key Directories

```
src/server/agents/     Agent implementations
src/server/services/   Business logic (letta/, rtrvr/, ezal/)
src/server/tools/      Agent tools (Genkit)
src/server/actions/    Server Actions ('use server')
src/app/api/cron/      All 47+ cron routes
src/components/        React components
src/config/            Runtime constants + playbook classification
.agent/refs/           Reference docs (read on demand)
```

---

## Agent Squad

| Agent | Role |
|-------|------|
| Marty (CEO) | Strategy, executive orchestration |
| Leo (COO) | Operations |
| Linus (CTO) | Code, deployment, infra |
| Craig (Marketer) | Campaigns, SMS/Email |
| Smokey (Budtender) | Product recommendations |
| Ezal (Lookout) | Competitive intel |
| Deebo (Enforcer) | Compliance |
| Mrs. Parker (Retention) | CRM, loyalty, churn |
| Pops (Analyst) | Revenue analysis |

Full roster + engineering agents: `.agent/refs/agents.md`

---

## Reference Files (load on demand)

| Topic | File |
|-------|------|
| Workflow protocol (PRD/Spec/Build) | `.agent/refs/workflow-protocol.md` |
| Post-deploy protocol | `.agent/refs/post-deploy.md` |
| Workflow runtime (V1 vs V2 ADR) | `.agent/refs/workflow-runtime-decision.md` |
| PR governance | CLAUDE.md Ã¢â€ â€™ PR Governance section |
| **Agent contract (canonical)** | `.agent/refs/agent-contract.md` |
| Agents & architecture | `.agent/refs/agents.md` |
| Slack operations | `.agent/refs/slack-operations.md` |
| Infrastructure gotchas | `.agent/refs/infrastructure-gotchas.md` |
| Firebase secrets | `.agent/refs/firebase-secrets.md` |
| Auth/sessions | `.agent/refs/authentication.md` |
| Roles/permissions | `.agent/refs/roles.md` |
| Integrations | `.agent/refs/integrations.md` |
| Playbook architecture | `.agent/refs/playbook-architecture.md` |
| Memory/Letta | `.agent/refs/bakedbot-intelligence.md` |
| Browser automation | `.agent/refs/autonomous-browsing.md` |
| Super Powers | CLAUDE.md Ã¢â€ â€™ Super Powers section |
| Super users | `.agent/refs/super-users.md` |
| Session history | `memory/MEMORY.md` |

---

## Completed Systems

| System | Status | Key Ref |
|--------|--------|---------|
| Campaign System (Craig) | SMS+Email+Deebo gate | `.agent/refs/agents.md` |
| Compliance (Deebo) | NY/CA/IL rules + monitor | `.agent/refs/agents.md` |
| Public Menu Pages | Brand + Dispensary + ISR | `.agent/refs/pages-brand.md` |
| Thrive Syracuse | Production pilot | `.agent/refs/pilot-setup.md` |
| Herbalist Samui | International (Thailand) | `HERBALIST_SAMUI_SETUP.md` |
| Alleaves POS Sync | Customer + order data | `.agent/refs/alleaves-pos.md` |
| Agent Training | Grok loop + audit dashboard | `memory/MEMORY.md` |

---

*Full domain details: `.agent/refs/`. Linus charter: `.agent/LINUS_CTO_AUTONOMY.md`. Session history: `memory/MEMORY.md`.*
