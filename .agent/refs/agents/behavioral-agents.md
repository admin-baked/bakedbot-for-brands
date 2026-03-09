# Behavioral Agents Reference

Use this file when the task touches customer-facing agent behavior, prompts, agent routing, or golden-set-sensitive logic.

## Shared Rules

- Behavioral agent runtime is described in `.agent/behavioral-agents/README.md`.
- Routing and cross-agent boundaries are governed by `.agent/engineering-agents/CROSS_AGENT_PROTOCOL.md`.
- Shared runtime files worth opening early:
  - `src/server/agents/agent-runner.ts`
  - `src/server/agents/agent-router.ts`
  - `src/server/agents/harness.ts`
  - `src/server/agents/agent-definitions.ts`
  - `src/server/services/org-profile.ts`
- Start with `jcodemunch`: `search_text(query="SKIP_ROUTING_PERSONAS")`, `search_symbols(query="<agent name>")`, `get_file_outline` on the agent file, then `get_symbol`.

## Memory-Backed Agents

These agents have local memory docs plus golden sets:

| Agent | Source File | Memory Docs | Golden Set |
|-------|-------------|-------------|------------|
| Smokey | `src/server/agents/smokey.ts` | `.agent/behavioral-agents/smokey/memory/*.md` | `.agent/golden-sets/smokey-qa.json` |
| Craig | `src/server/agents/craig.ts` | `.agent/behavioral-agents/craig/memory/*.md` | `.agent/golden-sets/craig-campaigns.json` |
| Deebo | `src/server/agents/deebo.ts` | `.agent/behavioral-agents/deebo/memory/*.md` | `.agent/golden-sets/deebo-compliance.json` |

## Support Roster

| Agent | Source File | Role |
|-------|-------------|------|
| Smokey | `src/server/agents/smokey.ts` | Budtender, product search, recommendations, upsells |
| Craig | `src/server/agents/craig.ts` | Campaign strategist and lifecycle marketer |
| Deebo | `src/server/agents/deebo.ts` | Compliance officer and enforcement layer |
| Pops | `src/server/agents/pops.ts` | Analytics director |
| Ezal | `src/server/agents/ezal.ts` | Competitive intelligence lookout |
| Money Mike | `src/server/agents/moneyMike.ts` | Pricing, margin, profitability, 280E analysis |
| Mrs. Parker | `src/server/agents/mrsParker.ts` | Loyalty and win-back specialist |
| Day Day | `src/server/agents/dayday.ts` | Growth and SEO |
| Felisha | `src/server/agents/felisha.ts` | Scheduling and operational triage |
| Big Worm | `src/server/agents/bigworm.ts` | Deep research and archival recall |

## Smokey

- Role: Budtender, menu search, product recommendations, smart upsells.
- Read next: `.agent/behavioral-agents/smokey/memory/architecture.md`, `.agent/behavioral-agents/smokey/memory/patterns.md`, `.agent/golden-sets/smokey-qa.json`.
- Start with `jcodemunch`: `search_symbols(query="smokey")`, `search_text(query="buildSmokeyContextBlock")`, `search_text(query="suggestUpsells")`.

## Craig

- Role: Marketing automation, lifecycle campaigns, CRM segments, campaign strategy.
- Read next: `.agent/behavioral-agents/craig/memory/architecture.md`, `.agent/behavioral-agents/craig/memory/patterns.md`, `.agent/golden-sets/craig-campaigns.json`.
- Start with `jcodemunch`: `search_symbols(query="craig")`, `search_text(query="buildCraigContextBlock")`, `search_text(query="campaign")`.

## Deebo

- Role: Compliance officer, content review, policy enforcement, rule-pack-backed guardrails.
- Read next: `.agent/behavioral-agents/deebo/memory/architecture.md`, `.agent/behavioral-agents/deebo/memory/patterns.md`, `.agent/golden-sets/deebo-compliance.json`.
- Start with `jcodemunch`: `search_symbols(query="deebo")`, `search_text(query="rule packs")`, `search_text(query="deebo-compliance")`.

## Pops

- Role: Revenue analysis, segment trends, reporting.
- Primary refs: `src/server/agents/pops.ts`, `.agent/refs/agents.md`.
- Start with `jcodemunch`: `search_symbols(query="pops")`, `get_file_outline(file_path="src/server/agents/pops.ts")`.

## Ezal

- Role: Competitive intelligence, pricing and market lookup.
- Primary refs: `src/server/agents/ezal.ts`, `.agent/refs/agents.md`.
- Start with `jcodemunch`: `search_symbols(query="ezal")`, `search_text(query="CannMenus")`, `get_file_outline(file_path="src/server/agents/ezal.ts")`.

## Money Mike

- Role: Pricing strategist, profitability analyst, 280E and margin protection.
- Primary refs: `src/server/agents/moneyMike.ts`, `src/server/tools/profitability-tools.ts`, `src/server/services/cannabis-tax.ts`, `.agent/refs/agents.md`.
- Start with `jcodemunch`: `search_symbols(query="money mike")`, `search_symbols(query="analyze280ETax")`, `search_symbols(query="getProfitabilityMetrics")`.

## Mrs. Parker

- Role: Loyalty, retention, VIP treatment, win-back campaigns.
- Primary refs: `src/server/agents/mrsParker.ts`, `.agent/refs/agents.md`.
- Start with `jcodemunch`: `search_symbols(query="mrs parker")`, `search_text(query="loyalty")`, `get_file_outline(file_path="src/server/agents/mrsParker.ts")`.

## Day Day

- Role: Growth, SEO, ranking improvements.
- Primary refs: `src/server/agents/dayday.ts`, `.agent/refs/agents.md`.
- Start with `jcodemunch`: `search_symbols(query="dayday")`, `search_text(query="seo_audit")`, `get_file_outline(file_path="src/server/agents/dayday.ts")`.

## Felisha

- Role: Operations coordinator, scheduling, triage.
- Primary refs: `src/server/agents/felisha.ts`, `.agent/refs/agents.md`.
- Start with `jcodemunch`: `search_symbols(query="felisha")`, `search_text(query="Cal.com")`, `get_file_outline(file_path="src/server/agents/felisha.ts")`.

## Big Worm

- Role: Deep research and knowledge retrieval.
- Primary refs: `src/server/agents/bigworm.ts`, `.agent/refs/agents.md`.
- Start with `jcodemunch`: `search_symbols(query="big worm")`, `search_text(query="archival_search")`, `get_file_outline(file_path="src/server/agents/bigworm.ts")`.

