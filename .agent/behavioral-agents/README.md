# BakedBot Behavioral Agent Memory

> Behavioral agents (Smokey, Craig, Deebo, Pops, Ezal, MoneyMike, MrsParker) serve
> dispensary customers through the inbox system. This directory is their memory store.

---

## Difference from Engineering Agents

| Dimension | Engineering Agents | Behavioral Agents |
|-----------|-------------------|-------------------|
| What they own | Code subsystems | User-facing behaviors |
| Report to | Linus (CTO) | Product decisions |
| Memory contents | Architecture + patterns | Prompt patterns + golden sets |
| "Deployment" | `git push origin main` | System prompt changes in agent files |
| Location | `.agent/engineering-agents/` | `.agent/behavioral-agents/` (this dir) |
| Testing | Unit + integration tests | Golden set eval (`run-golden-eval.mjs`) |

---

## Behavioral Agents Roster

| Agent | Persona ID | File | Role |
|-------|-----------|------|------|
| **Smokey** | `smokey` | `src/server/agents/smokey.ts` | Budtender, product expert, front-desk greeter |
| **Craig** | `craig` | `src/server/agents/craig.ts` | Growth engine, marketer, campaign strategist |
| **Deebo** | `deebo` | `src/server/agents/deebo.ts` | Chief compliance officer, shield |
| **Pops** | `pops` | `src/server/agents/pops.ts` | Analytics director |
| **Ezal** | `ezal` | `src/server/agents/ezal.ts` | Competitive intelligence lookout |
| **MoneyMike** | `money_mike` | `src/server/agents/moneyMike.ts` | Revenue and inventory officer |
| **MrsParker** | `mrs_parker` | `src/server/agents/mrsParker.ts` | Customer success, community voice |

---

## How Behavioral Agents Load Context

At `initialize()` time, each agent loads context in parallel via `Promise.all`:

```
1. OrgProfile (via getOrgProfileWithFallback)
     → getOrgProfile() reads org_profiles/{orgId}
     → fallback: reads brands/ + org_intent_profiles/ (legacy orgs)
     → builds agent-specific context block (buildSmokeyContextBlock, buildCraigContextBlock, etc.)

2. Active Goals (via loadActiveGoals)
     → reads orgs/{orgId}/goals where status IN ['active', 'at_risk']
     → buildGoalDirectives() formats as priority-ordered directive block

3. Market Benchmarks (via getMarketBenchmarks)
     → buildBenchmarkContextBlock() injects financial benchmarks

4. Agent-specific context (varies by agent):
     Smokey: vendorBrands (getVendorBrandSummary), marginProductContext (if margin goal active)
     Craig:  letta hive mind blocks, role-based ground truth
     Deebo:  rule packs loaded inline (imported JSON files, not Firestore)
```

All loads use `.catch(() => null)` — context loading is non-blocking and non-fatal.

---

## System Prompt Structure (all behavioral agents)

Behavioral agent system prompts follow this section order:

```
[CORE IDENTITY + ROLE]
[GOAL DIRECTIVES]             ← from loadActiveGoals + buildGoalDirectives
[MARGIN PRODUCT CONTEXT]      ← if active margin goal (Smokey + Craig only)
[ORG PROFILE CONTEXT BLOCK]   ← from buildSmokeyContextBlock / buildCraigContextBlock
[VENDOR BRANDS (SMOKEY ONLY)] ← from getVendorBrandSummary
[BENCHMARK CONTEXT]           ← from buildBenchmarkContextBlock
=== AGENT SQUAD ===           ← from buildSquadRoster('agentName')
=== GROUNDING RULES ===       ← agent-specific behavioral rules
```

The `=== AGENT SQUAD ===` section marker is the canonical injection point.
Context blocks are always injected BEFORE this section.

---

## OODA Loop Execution

Behavioral agents run inside the standard `runAgent()` harness (`src/server/agents/harness.ts`):

```
1. Load state (Letta memory adapter)
2. initialize()    ← Firestore context loads happen here
3. orient()        ← check agent bus for pending messages; select work target
4. act()           ← Claude tool calling + multi-step execution
5. Persist state   ← Letta memory adapter
6. Log to Intuition OS (Firestore)
```

For inbox requests, behavioral agents are invoked via `runMultiStepTask()` (harness) after
`runAgentCore()` in `agent-runner.ts` has resolved routing.

---

## SKIP_ROUTING_PERSONAS

When an explicit persona is passed to `runAgentCore()`, routing is bypassed:

```typescript
// src/server/agents/agent-runner.ts line 813
const SKIP_ROUTING_PERSONAS = [
  'leo', 'linus', 'jack', 'glenda', 'mike_exec', 'roach', 'craig',
  'ezal', 'pops', 'smokey', 'money_mike', 'mrs_parker', 'deebo',
  'day_day', 'felisha', 'big_worm'
];
```

All behavioral agents are in `SKIP_ROUTING_PERSONAS`. When a user explicitly selects
Smokey, Craig, or Deebo in the inbox, the `AgentRouter` is skipped entirely and the
agent receives the message directly.

---

## Cross-Agent Protocol

When an engineering agent touches behavioral agent code (`smokey.ts`, `craig.ts`, etc.):
- Inbox Mike must review if `agent-runner.ts` routing changes
- Linus arbitrates cross-domain conflicts
- Golden set eval MUST pass before merging

Full protocol: `.agent/engineering-agents/CROSS_AGENT_PROTOCOL.md`

---

## Golden Sets Location

`.agent/golden-sets/` — shared golden sets for behavioral agents:

| File | Agent | Cases | Notes |
|------|-------|-------|-------|
| `smokey-qa.json` | Smokey | 27 | 10 compliance-critical with `must_not_contain` |
| `craig-campaigns.json` | Craig | 15 | Compliance gate + TCPA + behavioral tests |
| `deebo-compliance.json` | Deebo | 23 | regex + llm + function; 100% required |

Run evals:
```bash
node scripts/run-golden-eval.mjs --all            # fast (deterministic only)
node scripts/run-golden-eval.mjs --all --full     # full (LLM tests, costs ~$0.05-0.15)
node scripts/run-golden-eval.mjs --agent deebo    # single agent fast
node scripts/run-golden-eval.mjs --agent smokey --full  # single agent full
```

Exit codes: `0` = pass, `1` = compliance failure (blocks commit), `2` = below threshold.

---

## Directory Structure

```
.agent/behavioral-agents/
  README.md               ← this file
  smokey/
    memory/
      architecture.md     ← initialize() context, tools, context blocks
      patterns.md         ← grounding rules, test isolation gotchas
  craig/
    memory/
      architecture.md     ← initialize() context, tools, brand brief
      patterns.md         ← Deebo gate, TCPA, Gmail dispatch patterns
  deebo/
    memory/
      architecture.md     ← regex fast-path, state packs, LLM fallback
      patterns.md         ← rule pack authoring, gotchas
```

---

*Owned by: Product | Governed by: prime.md | Last updated: 2026-02-26*
