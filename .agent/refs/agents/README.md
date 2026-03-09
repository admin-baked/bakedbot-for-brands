# Agent References

Use this folder when the task touches any agent, agent-owned subsystem, or cross-agent boundary.

This is the detailed agent entrypoint layer. The older `.agent/refs/agents.md` remains the broad architecture overview, but this folder is the faster operational map for day-to-day work.

## Load Order

1. Read `.agent/prime.md`.
2. Open the matching category doc in this folder.
3. Follow that doc's links into the agent's `IDENTITY.md`, memory files, source roots, and golden sets.
4. Use `jcodemunch` to inspect named symbols before reading whole files.

## Category Map

| Category | Read This | Use It For |
|----------|-----------|------------|
| Executive boardroom agents | `executive-agents.md` | Leo, Jack, Linus, Glenda, Mike, and boardroom orchestration |
| Behavioral/support agents | `behavioral-agents.md` | Smokey, Craig, Deebo, Pops, Ezal, Money Mike, Mrs. Parker, Day Day, Felisha, Big Worm |
| Engineering agents | `engineering-agents.md` | Inbox Mike, Playbook Pablo, Platform Pat, and the rest of the engineering squad |

## jcodemunch Workflow

Use `jcodemunch` in this order:

1. `get_repo_outline` if you do not know the area yet.
2. `get_file_tree(path_prefix=...)` for the agent's owned directory.
3. `search_symbols` for named implementations.
4. `get_file_outline` on the most relevant file.
5. `get_symbol` for the exact function/class you need.
6. `search_text` for strings, Firestore collections, routes, env vars, or prompt markers.

## Cross-Agent Boundaries

- Engineering cross-domain changes: `.agent/engineering-agents/CROSS_AGENT_PROTOCOL.md`
- Behavioral runtime and memory loading: `.agent/behavioral-agents/README.md`
- Legacy architecture overview: `.agent/refs/agents.md`

## Playbook Example

If the task says "Playbook actions":

1. Open `engineering-agents.md`.
2. Jump to `Playbook Pablo`.
3. Read:
   - `.agent/engineering-agents/playbook-pablo/IDENTITY.md`
   - `.agent/engineering-agents/playbook-pablo/memory/architecture.md`
   - `.agent/engineering-agents/playbook-pablo/memory/patterns.md`
4. Use `search_symbols` for:
   - `createPlaybook`
   - `updatePlaybookAssignmentConfig`
   - `executePlaybook`
5. Load those exact implementations with `get_symbol`.

