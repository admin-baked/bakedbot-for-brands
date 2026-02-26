# Inbox Mike — Patterns & Gotchas

> The hard-won knowledge. Read this before touching anything in my domain.

---

## THE BIG ONES (Read First)

### 1. agent-runner.ts branch ordering is load-bearing

The 13-branch if-else chain in `runAgentCore()` is NOT arbitrary. Priority order matters:

```
✅ Playbook creation BEFORE routing (playbooks have keywords that confuse router)
✅ Media detection BEFORE Claude tools (with source === 'inbox' skip)
✅ Gmail sentinel BEFORE Gmail action (connect intent must catch __connect__ first)
✅ Claude tool calling AFTER all specialized handlers (it's the expensive fallback)
```

**Never insert a new branch without reading the full chain and understanding what comes before and after it.** A new "Instagram tool" detection at the wrong position will silently eat messages that should go to Craig.

---

### 2. `source === 'inbox'` is the master gate

This string appears in 6+ places in agent-runner.ts and controls completely different behavior from other entry points (Slack, direct API):

| Condition | When source === 'inbox' |
|-----------|------------------------|
| Media generation | SKIPPED |
| Claude tool calling | ENABLED (normally super_user only) |
| Gmail OAuth artifact | Creates inbox_artifact + attaches to thread |
| Context | `extraOptions.context.threadId` always present |

**If you add a new capability that should behave differently in inbox vs Slack, gate it on `source === 'inbox'` and document why.**

---

### 3. Adding a new thread type requires 4 coordinated changes

You MUST update all 4 or things break silently:

```typescript
// 1. src/types/inbox.ts — add to InboxThreadType union
type InboxThreadType = 'general' | 'carousel' | ... | 'your_new_type';

// 2. src/types/inbox.ts — add to THREAD_AGENT_MAPPING
const THREAD_AGENT_MAPPING = {
  'your_new_type': { primary: 'smokey', supporting: [] }
};

// 3. src/server/actions/inbox.ts — add to buildThreadContext()
case 'your_new_type':
  return `You are helping with [purpose].`;

// 4. src/components/inbox/inbox-conversation.tsx — add keyword detection
const isYourNewType = /your keywords/.test(lowerMessage);
if (isYourNewType) setShowYourNewGenerator(true);
```

---

### 4. Artifact double-creation guard is fragile

Two ways artifacts are created — the fallback logic MUST NOT run if the first succeeds:

```typescript
// parseArtifactsFromContent() looks for :::artifact: markers
const markers = parseArtifactsFromContent(content);

// Fallback: scan toolCalls — ONLY if marker parsing found nothing
if (markers.length === 0) {
  const fromTools = scanToolCallsForArtifacts(toolCalls);
  // ...
}
```

**Risk:** If an agent emits both a marker AND calls the tool, and marker parsing partially fails (e.g., malformed JSON in one artifact), the fallback runs and creates the tool-called artifacts — but the valid markers are lost. The result is missing artifacts, not duplicates. Always test with intentionally malformed artifact JSON when changing parseArtifactsFromContent().

---

### 5. Messages array will eventually hit 1MB

`inbox_threads.messages` is an embedded Firestore array. Firestore docs max at 1MB. A long thread with tool call results, artifact data, and agent thinking blocks can balloon fast.

**Current risk level:** Low for typical threads. High for:
- Big Worm research threads (multiple large tool outputs)
- Support threads that run for weeks
- Debug threads where devs dump large context

**No mitigation exists yet.** If you're building anything that adds large payloads to messages (embedded images, full HTML, large JSON), consider a subcollection or Drive save instead.

---

## Patterns to Follow

### Adding a new inline generator (8th generator)

Copy the exact pattern from an existing one (e.g., QR generator):

```typescript
// 1. State declarations (at top of component, before any returns)
const [showNewGenerator, setShowNewGenerator] = useState(false);
const hasAutoShownNewGenerator = useRef(false);

// 2. Keyword detection in handleSubmit() — insert in correct priority order
const isNewGeneratorTrigger = /your keywords/i.test(lowerMessage);
if (isNewGeneratorTrigger && !hasAutoShownNewGenerator.current) {
  hasAutoShownNewGenerator.current = true;
  setShowNewGenerator(true);
  return; // short-circuit — don't send to API
}

// 3. Reset on thread change
useEffect(() => {
  setShowNewGenerator(false);
  hasAutoShownNewGenerator.current = false;
}, [activeThreadId]);

// 4. Render block (near bottom of JSX, before the input area)
{showNewGenerator && (
  <NewGeneratorComponent
    orgId={orgId}
    threadId={threadId}
    onClose={() => setShowNewGenerator(false)}
    onComplete={(result) => {
      setShowNewGenerator(false);
      // handle result
    }}
  />
)}
```

---

### Creating a new artifact type

```typescript
// 1. src/types/inbox.ts — add to InboxArtifactType
type InboxArtifactType = 'carousel' | ... | 'your_type';

// 2. src/types/inbox.ts — add data shape to InboxArtifact.data union
interface InboxArtifact {
  data: CarouselData | ... | YourTypeData; // MUST explicitly include
}

// 3. src/server/actions/inbox.ts — handle in approveAndPublishArtifact()
case 'your_type':
  await writeToYourCollection(artifact.data as YourTypeData);
  break;

// 4. src/components/inbox/inbox-artifact-panel.tsx — add renderer
case 'your_type':
  return <YourTypeCard artifact={artifact} />;

// 5. Don't forget: createInboxArtifact accepts the data union —
//    TypeScript WILL reject it if your type isn't in the union explicitly.
//    The `as never` hack doesn't work here.
```

---

### Cross-thread message injection (background services)

Use `injectAgentMessage()` — it's the only auth-bypass:

```typescript
import { injectAgentMessage } from '@/server/actions/inbox';

// For a morning briefing, proactive insight, etc.
await injectAgentMessage(
  threadId,
  'pops',                          // agentId
  'Your daily briefing: ...',      // content
  { type: 'analytics_briefing', data: { ... } }  // optional artifact
);
```

**Never call this from a client component.** It bypasses auth and must only run server-side in background services/crons.

---

### Finding the daily briefing thread

The briefing thread is identified by `metadata.isBriefingThread: true`:

```typescript
const briefingThread = threads.find(t => t.metadata?.isBriefingThread === true);
// If it doesn't exist, create it with metadata: { isBriefingThread: true }
// Created by 'system' user (bypasses auth requirement)
```

---

## Common Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| Reading thread data inside a client component | TypeScript error: `firebase/admin` in client bundle | Use server actions only — never import inbox.ts directly in client |
| Forgetting `source: 'inbox'` in extraOptions | Claude tools don't fire, media detection triggers | Pass `extraOptions: { source: 'inbox', context: { threadId } }` |
| Adding artifact type without updating union | `Type 'your_type' is not assignable to type...` | Add to `InboxArtifactType` AND `InboxArtifact.data` union |
| Setting `_pendingInputs` from a component that unmounts before InboxConversation mounts | Input lost | Set `_pendingInputs` synchronously before navigation completes |
| Calling `addMessageToInboxThread` with Timestamp objects from client | Serialization error | Use `new Date().toISOString()` or let the server action handle timestamp creation |
| Thread status not updating after all artifacts published | Thread stuck in 'active' | `approveAndPublishArtifact()` updates thread status — check if it's being awaited |

---

## Performance Notes

- `buildThreadContext()` runs on EVERY message — keep cases O(1), no Firestore calls unless `customerId` is set
- AgentRouter has LRU cache (500 entries, 5-min TTL) — don't bypass it for hot paths
- `runMultiStepTask()` is expensive — only triggers for `isSuperUser || source === 'inbox'`
- Job polling uses Firestore real-time listener — clean up on component unmount
- `getInboxThread()` loads the entire document including ALL messages — avoid calling in loops
