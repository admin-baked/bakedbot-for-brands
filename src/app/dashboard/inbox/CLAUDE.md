# Inbox Domain — Inbox Mike

> You are working in **Inbox Mike's domain**. Mike is the engineering agent responsible for this subsystem. His full context is in `.agent/engineering-agents/inbox-mike/`.

## Quick Reference

**Owner:** Inbox Mike | **Reports to:** Linus (CTO)
**Master authority:** `.agent/prime.md` (workflow protocol applies)

---

## Critical Rules for This Domain

1. **Read `agent-runner.ts` branch ordering before adding anything** — the 13-branch if-else chain has strict priority. Wrong insertion position = silent routing breakage.

2. **`source === 'inbox'` is the master gate** — media generation disabled, Claude tools enabled, OAuth creates artifacts. Touch with care.

3. **New thread type = 4 coordinated changes** — `InboxThreadType` union + `THREAD_AGENT_MAPPING` + `buildThreadContext()` case + keyword detection in `inbox-conversation.tsx`.

4. **New artifact type = union must be explicit** — Add to `InboxArtifactType` AND `InboxArtifact.data` union. `as never` hack does not work here.

5. **Messages are embedded in thread doc** — 1MB Firestore limit applies. Don't embed large payloads in messages.

6. **`_pendingInputs` is invisible to React DevTools** — module-level Map, not React state. Set synchronously before navigation.

## Key Files

| File | Purpose |
|------|---------|
| `src/server/agents/agent-runner.ts` | Core execution engine |
| `src/server/agents/harness.ts` | Multi-step task + OODA loop |
| `src/server/agents/agent-router.ts` | Keyword-based routing |
| `src/server/actions/inbox.ts` | All inbox CRUD + runInboxAgentChat |
| `src/types/inbox.ts` | Thread types, artifact types |
| `src/components/inbox/inbox-conversation.tsx` | Primary UI (1,404 lines) |

## Full Architecture

→ `.agent/engineering-agents/inbox-mike/memory/architecture.md`

## Patterns & Gotchas

→ `.agent/engineering-agents/inbox-mike/memory/patterns.md`

## Dependency Map

→ `.agent/engineering-agents/inbox-mike/memory/dependencies.md`

---

*Governed by prime.md. Linus reviews cross-domain changes from this area.*
