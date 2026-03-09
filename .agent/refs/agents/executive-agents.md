# Executive Agents Reference

Use this file when the task touches executive orchestration, boardroom tooling, or top-level operational flows.

## Shared Rules

- Start with `.agent/refs/agents.md` for the broad executive architecture.
- Use `.agent/LINUS_CTO_AUTONOMY.md` when the task affects Linus powers, incident response, or autonomous shipping.
- If the change crosses into engineering-owned UI or shared runtime files, also load `.agent/refs/agents/engineering-agents.md` and `.agent/engineering-agents/CROSS_AGENT_PROTOCOL.md`.

## Roster

| Agent | Source File | Domain |
|-------|-------------|--------|
| Leo | `src/server/agents/leo.ts` | Operations, delegation, scheduling |
| Jack | `src/server/agents/jack.ts` | Revenue, sales, CRM |
| Linus | `src/server/agents/linus.ts` | Code evaluation, bug hunting, automated fixes |
| Glenda | `src/server/agents/glenda.ts` | Marketing, brand, content |
| Mike | `src/server/agents/mike.ts` | Finance, billing, pricing |

## Leo

- Role: COO and operational orchestrator.
- Primary refs: `src/server/agents/leo.ts`, `.agent/refs/agents.md`.
- Start with `jcodemunch`: `search_symbols(query="leo")`, `get_file_outline(file_path="src/server/agents/leo.ts")`.

## Jack

- Role: CRO, CRM and revenue pipeline owner.
- Primary refs: `src/server/agents/jack.ts`, `.agent/refs/agents.md`.
- Start with `jcodemunch`: `search_symbols(query="jack")`, `search_text(query="CRM")`, `get_file_outline(file_path="src/server/agents/jack.ts")`.

## Linus

- Role: CTO, code evaluator, fixer, deployment actor.
- Primary refs: `src/server/agents/linus.ts`, `.agent/LINUS_CTO_AUTONOMY.md`, `.agent/engineering-agents/CROSS_AGENT_PROTOCOL.md`, `.agent/refs/agents.md`.
- Start with `jcodemunch`: `search_symbols(query="linus")`, `search_text(query="/api/linus/fix")`, `search_text(query="Zero Bug Tolerance")`.

## Glenda

- Role: CMO, marketing and content orchestration.
- Primary refs: `src/server/agents/glenda.ts`, `.agent/refs/agents.md`.
- Start with `jcodemunch`: `search_symbols(query="glenda")`, `search_text(query="Brand Watch")`, `get_file_outline(file_path="src/server/agents/glenda.ts")`.

## Mike

- Role: CFO, finance, billing, pricing.
- Primary refs: `src/server/agents/mike.ts`, `.agent/refs/agents.md`.
- Start with `jcodemunch`: `search_symbols(query="mike")`, `search_text(query="billing")`, `get_file_outline(file_path="src/server/agents/mike.ts")`.
