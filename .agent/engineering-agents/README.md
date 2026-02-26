# BakedBot Engineering Agent Squad

> All engineering agents inherit from `prime.md`. This document is the squad roster.

---

## What Engineering Agents Are

Engineering agents are **codebase specialists** — they own specific subsystems, maintain versioned memory about their domain, and report to Linus (CTO). They are distinct from product agents (Smokey, Craig, Deebo) who serve dispensary customers.

**The hierarchy:**
```
prime.md (master authority)
    └── Linus (CTO, orchestrator)
            └── Engineering Agents (domain owners)
```

**The prime.md contract applies to all of them:**
- PRD → Spec → Build → Review → Ship workflow
- Build must pass before any commit
- Golden sets must pass before merging domain changes
- Archive decisions after significant work

---

## How They Load in the IDE

Claude Code auto-loads CLAUDE.md files up the directory tree. Each engineering agent has a domain-level CLAUDE.md that activates automatically when you work in their files:

| Agent | Auto-Loads When You Open |
|-------|--------------------------|
| Inbox Mike | `src/app/dashboard/inbox/**` |
| Onboarding Jen | `src/app/dashboard/settings/**` |
| Sync Sam | `src/server/services/alleaves/**` |
| Creative Larry | `src/app/dashboard/creative/**` |
| Brand Pages Willie | `src/app/[brand]/**` |
| Menu Maya | `src/app/dashboard/menu/**` |
| Campaign Carlos | `src/app/dashboard/campaigns/**` |
| Loyalty Luis | `src/app/dashboard/loyalty/**` |
| Intel Ivan | `src/app/dashboard/intelligence/**` |
| Platform Pat | `src/app/api/cron/**` |
| Playbook Pablo | `src/app/dashboard/playbooks/**` |
| Drive Dana | `src/app/dashboard/drive/**` |
| Delivery Dante | `src/app/dashboard/delivery/**` |
| Boardroom Bob | `src/app/dashboard/ceo/**` |

---

## Active Engineering Agent Roster

| # | Agent | Domain | Primary Path | Memory | Status |
|---|-------|--------|-------------|--------|--------|
| 1 | **Inbox Mike** | Inbox system, agent-runner, artifacts, thread routing, PuffChat | `src/app/dashboard/inbox/` | `inbox-mike/` | ✅ Active |
| 2 | **Onboarding Jen** | Brand guide wizard, settings, slug mgmt, brand extractor, org setup | `src/app/dashboard/settings/` | `onboarding-jen/` | ✅ Active |
| 3 | **Sync Sam** | Alleaves POS, sync pipeline, product catalog, customer segments | `src/server/services/alleaves/` | `sync-sam/` | ✅ Active |
| 4 | **Creative Larry** | Creative Studio, fal.ai/FLUX.1, brand images, campaign templates, Deebo gate | `src/app/dashboard/creative/` | `creative-larry/` | ✅ Active |
| 5 | **Brand Pages Willie** | Public brand/dispensary menus, ISR, proxy/middleware, age gate, AI crawlers | `src/app/[brand]/` | `brand-pages-willie/` | ✅ Active |
| 6 | **Menu Maya** | Menu Command Center, products table, COGS, drag-reorder, staff guide | `src/app/dashboard/menu/` | `menu-maya/` | ✅ Active |
| 7 | **Campaign Carlos** | Campaign wizard, Craig tools, SMS/Email dispatch, Deebo gate, TCPA dedup | `src/app/dashboard/campaigns/` | `campaign-carlos/` | ✅ Active |
| 8 | **Loyalty Luis** | Loyalty dashboard, points engine, tier advancement, spending index | `src/app/dashboard/loyalty/` | `loyalty-luis/` | ✅ Active |
| 9 | **Intel Ivan** | Competitive intelligence, Ezal, CannMenus, Jina tools, weekly CI reports | `src/app/dashboard/intelligence/` | `intel-ivan/` | ✅ Active |
| 10 | **Platform Pat** | Crons (47+), heartbeat, auto-escalation, Firebase App Hosting, secrets | `src/app/api/cron/` | `platform-pat/` | ✅ Active |
| 11 | **Playbook Pablo** | Playbook templates (23), trigger editor, execution cron, cron utilities | `src/app/dashboard/playbooks/` | `playbook-pablo/` | ✅ Active |
| 12 | **Drive Dana** | BakedBot Drive UI, file viewer/editor, AI Magic Button, Drive-inbox bridge | `src/app/dashboard/drive/` | `drive-dana/` | ✅ Active |
| 13 | **Delivery Dante** | Delivery dashboard, driver app, QR check-in, ETA calc, NY OCM compliance | `src/app/dashboard/delivery/` | `delivery-dante/` | ✅ Active |
| 14 | **Boardroom Bob** | CEO boardroom, executive agents (Leo/Linus/Jack), CRM, QA, morning briefing | `src/app/dashboard/ceo/` | `boardroom-bob/` | ✅ Active |

---

## Engineering Agent Memory Format

Each agent has:
```
{agent-name}/
  IDENTITY.md          ← who they are, what they own, how to invoke
  memory/
    architecture.md    ← system design, key files, data flow
    patterns.md        ← conventions, gotchas, recurring mistakes to avoid
  golden-sets/
    {domain}.json      ← behavioral regression tests they own
```

---

## Invoking an Engineering Agent

**Option 1 — Automatic (IDE)**
Open any file in their domain directory. Their CLAUDE.md auto-loads.

**Option 2 — Explicit (Slack via Linus)**
```
@linus delegate to inbox-mike: [task description]
```

**Option 3 — Direct invocation (Claude Code)**
Start your message with:
```
Working as Inbox Mike. [task]
```
Claude Code loads this file + the agent's IDENTITY.md as context.

---

## Reporting Structure

Engineering agents report to Linus on:
- Work completed (commit hash, what changed)
- Blockers (build failures, unclear requirements)
- Proactive flags (upcoming technical debt, risky changes in their domain)

Linus reviews cross-domain changes (e.g., Inbox Mike changing `agent-runner.ts` affects Campaign Carlos's dispatch pipeline — Linus arbitrates).

**Cross-domain examples:**
- `proxy.ts` changes → Willie + Dante must both sign off (shared file)
- `agent-runner.ts` changes → Inbox Mike owns, but Carlos + Dante may be affected
- `spending index` changes → Sync Sam owns, but Luis is downstream consumer

---

## Adding a New Engineering Agent

1. Copy the `IDENTITY.md` template from any existing agent
2. Create `{agent-name}/memory/architecture.md` — document the domain deeply
3. Create `{agent-name}/memory/patterns.md` — list every known gotcha
4. Create the domain-level CLAUDE.md in the source tree
5. Add to this README roster table
6. Add agent section to `prime.md` engineering agents table

---

*Owned by: Linus (CTO) | Governed by: prime.md | Last updated: 2026-02-26*
