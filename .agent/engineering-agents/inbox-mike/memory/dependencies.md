# Inbox Mike — Dependency Map

> What my domain depends on. What depends on my domain. Cross-agent coordination points.

---

## What Inbox Depends On

| Dependency | Why | Risk if it changes |
|-----------|-----|-------------------|
| `src/server/agents/smokey.ts` | Smokey responds to product questions in inbox threads | Smokey API change → update agent-runner routing |
| `src/server/agents/craig.ts` | Craig handles creative/campaign threads | Craig tool changes → test inbox artifact creation |
| `src/server/agents/linus.ts` | Linus handles technical threads | Linus tool changes → test inbox super_user flows |
| `src/server/agents/goal-directive-builder.ts` | Injected into runAgentCore context | Goal shape change → update context injection |
| `src/server/services/letta/` | Persistent memory for executive agents | Letta API change → runAgent() breaks |
| `src/server/integrations/gmail/` | Gmail OAuth card in inbox threads | OAuth flow change → update requestIntegration() |
| `src/server/actions/org-profile.ts` | OrgProfile loaded for brand context | OrgProfile schema change → update buildThreadContext() |
| `src/types/unified-artifact.ts` | Newer artifact system (partially wired) | Evolving — coordinate before full wiring |
| `src/ai/claude.ts` | Direct Claude API calls in harness | Model change → update cost estimates |
| `src/server/services/research/` | Big Worm research pipeline | Research job schema → update job poller |

---

## What Depends on Inbox

| Consumer | What It Uses | Coordination Needed |
|---------|-------------|-------------------|
| `src/app/dashboard/inbox/page.tsx` | InboxConversation component | View mode changes |
| `src/components/inbox/unified-inbox.tsx` | `useInboxStore`, thread list | Store shape changes |
| `src/server/services/morning-briefing.ts` | `injectAgentMessage()` | Briefing format changes |
| `src/server/services/insight-generators/` | `injectAgentMessage()` | Insight thread creation |
| `src/server/services/executive-calendar/` | Inbox thread for Leo meeting prep | Calendar artifact types |
| `src/app/api/cron/` (many crons) | `injectAgentMessage()` for notifications | Cron payload shape |
| `src/components/dashboard/` (support FAB) | `createInboxThread()` for support | Support thread type |
| `src/server/agents/jack.ts` | CRM thread creation | `crm_customer` thread type |

---

## Cross-Agent Coordination

### When Craig changes tools
Craig's tools include `createCarouselArtifact`, `createBundleArtifact`, `createCreativeArtifact`. My artifact scanning in inbox.ts looks for these tool names by string. If Craig renames a tool, the fallback artifact detection silently breaks.

**Protocol:** Craig's tool engineer must notify me (Inbox Mike) when renaming artifact-creation tools. I update the tool name in `scanToolCallsForArtifacts()` in the same PR.

### When any agent adds a new artifact-creating tool
Same issue — I need to know about it. Any agent that can create artifacts must:
1. Use the `:::artifact:type:title\n{json}\n:::` marker format (preferred)
2. OR coordinate with me to add their tool name to the fallback scan list

### When Linus changes agent-runner.ts
Linus (CTO) reviews all changes to agent-runner.ts. But given I'm the domain expert, I should review as well. Any PR touching agent-runner.ts should get my attention flagged.

### When Platform Pat changes cron jobs
Many cron jobs call `injectAgentMessage()`. If the message payload format changes (new artifact types, different content shapes), Pat should coordinate with me to ensure my types accommodate the new shape.

---

## Firestore Index Dependencies

Changes to `inbox_threads` or `inbox_artifacts` query patterns require index updates in `firestore.indexes.json`:

```json
// Current indexes I depend on:
{ "collectionGroup": "inbox_threads",
  "fields": [{"fieldPath": "orgId"}, {"fieldPath": "lastActivityAt", "order": "DESCENDING"}] }
{ "collectionGroup": "inbox_threads",
  "fields": [{"fieldPath": "orgId"}, {"fieldPath": "assignedToRole"}, {"fieldPath": "lastActivityAt"}] }
{ "collectionGroup": "inbox_artifacts",
  "fields": [{"fieldPath": "threadId"}, {"fieldPath": "createdAt"}] }
```

If I add a new query that filters or orders by a new field, I add the index definition AND alert Linus to deploy it before the code ships.
