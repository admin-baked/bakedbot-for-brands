# Cross-Agent Coordination Protocol

> When a change touches multiple agent domains, this protocol applies.
> Linus (CTO) is the final arbiter for all cross-domain conflicts.

---

## When Linus Arbitrates

Changes to these shared files affect multiple agent domains and require Linus sign-off
before merge:

| File | Domain Owners | Why Cross-Domain |
|------|--------------|-----------------|
| `src/proxy.ts` | Brand Pages Willie + Delivery Dante | Routing affects all public pages, subdomain handling, driver app, age gate |
| `src/server/agents/agent-runner.ts` | Inbox Mike | All agent requests flow through here; SKIP_ROUTING_PERSONAS list affects all behavioral agents |
| `src/server/services/alleaves/*.ts` | Sync Sam | Data is upstream of Loyalty Luis, Smokey (menu), analytics (Pops) |
| `firestore.indexes.json` | Platform Pat | Index changes affect all collection queries platform-wide |
| `src/types/inbox.ts` | Inbox Mike | Type changes ripple to artifact rendering, thread creation, all agent output |
| `src/server/agents/harness.ts` | Inbox Mike | OODA loop affects all behavioral + engineering agents |
| `src/types/products.ts` | Menu Maya + Sync Sam | Product type changes affect menu display + POS sync |
| `apphosting.yaml` | Platform Pat | Secret changes affect all services at build time |
| `src/lib/logger.ts` | Platform Pat | Logging changes affect all server-side code |

---

## Pull Request Protocol

When your PR touches a shared file:

1. **Identify affected domain owners** — use the table above
2. **Tag them in the PR description** with a cross-domain impact note
3. **Describe the behavioral change** — don't just say "updated proxy.ts"; say what routing behavior changed
4. **Linus reviews before merge** — CTO has final authority on shared infrastructure
5. **Golden sets must pass** — run `node scripts/run-golden-eval.mjs --all` before opening the PR

Example PR description:
```
## Cross-Domain Impact
This PR modifies `src/proxy.ts` to add a new subdomain `api.bakedbot.ai`.

- **Willie**: isMenuRoute regex unchanged — no public menu impact
- **Dante**: isDriverRoute unchanged — driver app unaffected
- **Linus review required**: shared routing file
```

---

## Behavioral Agent Changes

When an engineering agent changes behavioral agent code (`smokey.ts`, `craig.ts`, `deebo.ts`):

### Minimum Requirements
1. The behavioral agent's golden sets MUST still pass:
   ```bash
   node scripts/run-golden-eval.mjs --agent smokey   # deterministic
   node scripts/run-golden-eval.mjs --agent craig    # deterministic
   node scripts/run-golden-eval.mjs --agent deebo    # deterministic
   ```

2. For changes to agent instructions or grounding rules, also run full LLM eval:
   ```bash
   node scripts/run-golden-eval.mjs --agent smokey --full
   ```

3. If `agent-runner.ts` routing changes, Inbox Mike reviews the change.

### What Counts as a Behavioral Agent Change

- Modifying `system_instructions` content in any behavioral agent's `initialize()`
- Adding or removing tools from a behavioral agent
- Changing `SKIP_ROUTING_PERSONAS` list in `agent-runner.ts`
- Modifying `buildSmokeyContextBlock()`, `buildCraigContextBlock()` in org-profile service
- Editing rule packs (`src/server/agents/rules/*.json`)
- Changing `agent-router.ts` keyword lists

---

## Agent Bus

Behavioral agents communicate via the `agent_bus` Firestore collection.
Messages are consumed by `orient()` at the start of each `runAgent()` call:

```typescript
// harness.ts — checks agent bus during orient phase
const messages = await getPendingMessages(brandId, agentName);
if (messages.length > 0) {
    (agentMemory as any).pending_messages = messages;
}
```

**Rules:**
- Do not write directly to `agent_bus` except via the `sendAgentMessage()` helper in `src/server/intuition/agent-bus.ts`
- Never write cross-agent messages from client components
- Agent bus messages are consumed once and marked processed

---

## Behavioral vs Engineering Agent Bridge

| Change Type | Eval Required | Who Reviews |
|-------------|--------------|-------------|
| Engineering agent code only (Inbox Mike's domain files) | Engineering agent golden set (if exists) | Linus |
| Behavioral agent system prompt edit | Full LLM eval for that agent | Linus + product |
| Shared file (agent-runner.ts, proxy.ts) | All golden sets + type check | Linus + affected domain owners |
| Rule pack change (deebo rules/*.json) | `deebo --full` eval (100% threshold) | Linus + compliance review |
| New golden set case added | All existing cases must still pass | Linus |
| Agent tool added/removed | Fast eval for that agent | Domain owner |

---

## Specific Domain Boundaries

### Inbox Mike owns agent-runner.ts

`agent-runner.ts` is Inbox Mike's canonical file. All routing changes, persona
additions, and tool dispatch changes require Inbox Mike context. When other agents
need routing behavior changed (e.g., Campaign Carlos wants a new keyword), file the
request through Inbox Mike.

### Sync Sam is upstream of Loyalty Luis and Smokey

Data flowing from Alleaves through Sync Sam (product catalog, customers, orders)
powers Loyalty Luis (spending index, tier calculation) and Smokey (menu search, product
recommendations). Changes to sync output schema — especially `customer_spending` index
key format or product field names — require coordination with both Luis and Smokey owners.

Key interfaces to protect:
- `customer_spending/{email}` doc shape (`totalSpent`, `orderCount`, `avgOrderValue`, `lastOrderDate`)
- `tenants/{orgId}/publicViews/products/items/{id}` product fields
- `cid_{id_customer}` keying for email-less customers

### Brand Pages Willie and Delivery Dante share proxy.ts

Both own portions of `src/proxy.ts`:
- Willie: `isMenuRoute`, `isBookingRoute`, `isMetaPath`, subdomain routing for brand pages
- Dante: `isDriverRoute`, driver subdomain handling

When either modifies the file, the other must confirm their path is unaffected.

---

## Engineering Agent Self-Reporting

Engineering agents report to Linus on:

1. **Work completed**: commit hash, what changed, which files touched
2. **Blockers**: build failures, unclear requirements, ambiguous domain ownership
3. **Proactive flags**: upcoming technical debt, risky changes in their domain

Format for Linus reporting (Slack):
```
[Inbox Mike] Completed: Updated artifact rendering for analytics_briefing type.
Commit: abc1234. Modified: inbox-artifact-panel.tsx, types/inbox.ts.
No cross-domain impact. Type check passes.
```

---

## Adding a New Engineering Agent

1. Copy the `IDENTITY.md` template from any existing agent (e.g., `inbox-mike/IDENTITY.md`)
2. Create `{agent-name}/memory/architecture.md` — document the domain deeply
3. Create `{agent-name}/memory/patterns.md` — list every known gotcha
4. Create the domain-level CLAUDE.md in the source tree (e.g., `src/app/dashboard/newarea/CLAUDE.md`)
5. Add to `.agent/engineering-agents/README.md` roster table
6. Add agent section to `.agent/prime.md` engineering agents table
7. Optionally: add golden set in `{agent-name}/golden-sets/{domain}.json`

---

## Adding a New Behavioral Agent

1. Create agent file in `src/server/agents/{agentname}.ts`
2. Add persona ID to `SKIP_ROUTING_PERSONAS` in `agent-runner.ts` (requires Inbox Mike review)
3. Add to `agent-definitions.ts` squad roster
4. Add context block builder in `src/server/services/org-profile.ts` (follow `buildSmokeyContextBlock` pattern)
5. Create memory directory: `.agent/behavioral-agents/{agentname}/memory/architecture.md` + `patterns.md`
6. Add golden set: `.agent/golden-sets/{agentname}-qa.json` (follow `smokey-qa.json` format)
7. Update `AGENT_MAP` in `scripts/run-golden-eval.mjs`
8. Update `.agent/behavioral-agents/README.md` roster table

---

*Owned by: Linus (CTO) | Governed by: prime.md | Last updated: 2026-02-26*
