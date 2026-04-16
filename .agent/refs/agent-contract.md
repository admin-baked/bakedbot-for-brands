# BakedBot Canonical Agent Contract

> **This is the authoritative source of truth for all BakedBot agents.**
> `src/lib/agents/registry.ts`, `src/server/agents/agent-definitions.ts`, and `refs/agents.md`
> are all derived from or validated against this document.
>
> **When adding an agent:** update this file first, then add to all three of the above.
> **When removing an agent:** downgrade `status` to `retired` here; don't delete.
> **Drift check:** `npm run check:playbook-drift` validates registry ↔ agent-definitions alignment.

---

## Field Agents (AgentId in registry.ts + agent-definitions.ts)

| ID | Name | Role | Domain | File | Slack | AI Provider | Status |
|----|------|------|--------|------|-------|-------------|--------|
| `smokey` | Smokey | Budtender | commerce | `src/server/agents/smokey.ts` | DM / #smokey | Gemini (Genkit) | active |
| `craig` | Craig | Marketer | marketing | `src/server/agents/craig.ts` | DM / #campaigns | Claude | active |
| `pops` | Pops | Analyst | analytics | `src/server/agents/pops.ts` | #ops | Claude | active |
| `ezal` | Ezal | Competitive Lookout | competitive_intel | `src/server/agents/ezal.ts` | #competitive-intel | Claude | active |
| `money_mike` | Money Mike | Pricing Analyst | pricing | `src/server/agents/money-mike.ts` | #ops | Claude | active |
| `mrs_parker` | Mrs. Parker | Retention Hostess | loyalty | `src/server/agents/mrs-parker.ts` | #retention | Claude | active |
| `deebo` | Deebo | Compliance Enforcer | compliance | `src/server/agents/deebo.ts` | #compliance | Claude | active |
| `day_day` | Day Day | Growth / SEO | growth | `src/server/agents/day-day.ts` | #growth | Claude | active |
| `puff` | Puff | Media / Video | marketing | `src/server/agents/puff.ts` | #media | Claude | active |
| `general` | General | System Assistant | system | `src/server/agents/general.ts` | — | Claude | active |
| `big_worm` | Big Worm | Research | analytics | `src/server/agents/big-worm.ts` | #ops | Claude | active (registry gap — see below) |

---

## Executive Agents (ExecutiveAgentId in registry.ts; AgentId in agent-definitions.ts)

| ID | Name | Role | Domain | File | Slack | AI Provider | Status |
|----|------|------|--------|------|-------|-------------|--------|
| `marty` | Marty | CEO | operations | `src/server/agents/marty.ts` | DM / #ceo | Claude | active |
| `leo` | Leo | COO | operations | `src/server/agents/leo.ts` | DM / #ops | Claude | active |
| `linus` | Linus | CTO | technology | `src/server/agents/linus.ts` | DM / #eng | Claude | active |
| `jack` | Jack | CRO | revenue | `src/server/agents/jack.ts` | DM / #sales | Claude | active |
| `glenda` | Glenda | CMO | marketing | `src/server/agents/glenda.ts` | #marketing | Claude | active |
| `mike_exec` | Mike (Exec) | CFO | analytics | `src/server/agents/mike-exec.ts` | #finance | Claude | active |
| `roach` | Roach | Legal Counsel | compliance | `src/server/agents/roach.ts` | #legal | Claude | active |
| `felisha` | Felisha | Executive Ops | operations | `src/server/agents/felisha.ts` | #ops | Claude | active |
| `uncle_elroy` | Uncle Elroy | Data Auditor | analytics | `src/server/agents/uncle-elroy.ts` | #eng | Claude | active |
| `openclaw` | Openclaw | WhatsApp / Task | operations | `src/server/agents/openclaw.ts` | WhatsApp | Claude | active |

---

## Known Gaps

| Issue | Agent | Notes |
|-------|-------|-------|
| Registry gap | `big_worm` | Present in `agent-definitions.ts` AgentId but has no `AGENT_REGISTRY` entry in `registry.ts`. Intentional — no AGENT_CAPABILITY defined yet. Listed in `KNOWN_REGISTRY_GAPS` in the drift check. |
| ID duality | `money_mike` vs `mike_exec` | Intentionally distinct: `money_mike` = field pricing agent (customer-org scope); `mike_exec` = CFO (BakedBot corporate scope). Different prompts, different access. |

---

## ID Namespace Rules

- **Field agents** use snake_case IDs matching their character name
- **Executive agents** use the same convention; `mike_exec` is an exception to avoid collision with `money_mike`
- **IDs are permanent** — once assigned, never reuse. Retire by setting `status: retired` in this doc
- **All new agents** must be added here before being added to any TypeScript file

---

## Validation

The drift check script (`scripts/check-playbook-drift.mjs`) reads agent IDs directly from:
- `src/server/agents/agent-definitions.ts` — `AgentId` union type (all agents)
- `src/lib/agents/registry.ts` — `AgentId` + `ExecutiveAgentId` union types

It validates that both sets are in sync, flagging any agent present in one but not the other.
