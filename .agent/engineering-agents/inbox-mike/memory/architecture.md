# Inbox Mike — System Architecture

> Deep reference for the inbox subsystem. Updated when architecture changes.

---

## Data Flow: User Message → Agent Response

```
User types in InboxConversation.tsx
  → handleSubmit() [~line 280 in 1,404-line component]
    → 7 keyword detection checks (short-circuits BEFORE API call):
        "qr code" / "qr"          → setShowQRGenerator(true)
        carousel keywords          → setShowCarouselGenerator(true)
        "hero" + action words      → setShowHeroGenerator(true)
        "publish hero" / "go live" → direct publishHero()
        bundle keywords            → setShowBundleGenerator(true)
        social post keywords       → setShowSocialPostGenerator(true)
        pricing keywords           → setShowPricingGenerator(true)
    → no keyword match → API path:
        addMessageToInboxThread(threadId, userMessage)    [persist first]
        runInboxAgentChat(threadId, message, persona, orgId, userId)
          → returns { jobId?, message?, artifacts? }
        if jobId → setCurrentJobId(jobId) → useJobPoller activates
        if message → addMessageToThread (optimistic update)
```

---

## Server-Side: runInboxAgentChat

**File:** `src/server/actions/inbox.ts`

```
runInboxAgentChat(threadId, userMessage, persona, orgId, userId)
  1. Load thread from Firestore
  2. buildThreadContext(thread, orgId)
       → 51+ thread-type-specific system prompt injections
       → if customerId present: fetch CRM data → inject customer context
  3. Persona resolution:
       'mike'  → 'mike_exec'
       'auto'  → 'puff'
       else    → use as-is
  4. Python sidecar check:
       if persona === 'big_worm' || 'roach' || isDeepResearch
         → fetch(PYTHON_SIDECAR_ENDPOINT)
         → return sidecar response directly (skip runAgentChat)
  5. runAgentChat(message, persona, extraOptions, user)
  6. parseArtifactsFromContent(result.content)
       → fallback: scan toolCalls if no markers found
  7. createInboxArtifact() for each artifact found
  8. addMessageToInboxThread(agentResponseMessage)
  9. return { message, artifacts, jobId? }
```

---

## Core Engine: runAgentCore (agent-runner.ts)

The 13-branch execution chain. **ORDER IS CRITICAL.**

```
runAgentCore(userMessage, personaId, extraOptions, injectedUser, jobId)
  1.  validateInput(userMessage)                      [security]
  2.  load user, resolve orgId, load brand context
  3.  fast path: isSimpleGreeting() → skip KB/routing
  4.  model tier enforcement (guest/paid/super_user)
  5.  inject custom AI instructions (Firestore per-tenant)
  6.  load Talk Tracks from Firestore (if not fast path)
      ↓ ROUTING PRIORITY ORDER:
  7.  Playbook creation detection (regex match)
  8.  Playbook execution (named playbook lookup)
  9.  Media generation detection — SKIPPED if source === 'inbox'
  10. SKIP_ROUTING_PERSONAS check (explicit IDs bypass routing)
  11. routeToAgent() → AgentRouter.route()
  12. Knowledge Base search (LRU cached, Firestore kb_articles)
  13. Deep research detection
  14. Specialized agent handoff (confidence > 0.6 + KB match)
  15. Gmail integration:
        extractGmailParams() → sentinel { action: 'list', query: '__connect__' }
        connect sentinel → requestIntegration() → OAuth artifact
        else → gmailAction()
  16. Calendar integration
  17. Ezal competitive intel
  18. Claude tool calling (if isSuperUser || source === 'inbox')
        → runMultiStepTask(context) via harness.ts
  19. Gemini fallback (multimodal)
      ↓ POST-PROCESSING:
  20. validateOutput(result.content)                  [canary + sanitize]
  21. Gauntlet verification (feature-flagged ENABLE_GAUNTLET_VERIFICATION)
  22. return AgentResult
```

---

## Harness: runMultiStepTask / runAgent

**File:** `src/server/agents/harness.ts`

### Hybrid Execution Mode (default)
```
1. Gemini Flash → generate step-by-step plan
2. Loop (maxIterations):
   a. pick next tool from plan
   b. HITL checkpoint: ['sendSms', 'rtrvrAgent', 'createPlaybook', 'sendEmail']
        → pause + request human approval if triggered
   c. executeWithTools(step)  [Claude + tools]
   d. PEI drift detection:
        errors > 2 || successRate < 50% || sameTool 3x → ABORT
   e. validation hooks (pre/post)
   f. persist step to Firestore job doc
3. Claude synthesis of all step results
4. if ≥2 successful steps → persistWorkflowFromHarness() [procedural memory]
5. sleepTimeService.shouldTrigger() → memory consolidation
```

### runAgent (OODA loop)
```
1. Load state from Letta memory adapter
2. implementation.initialize()  ← Firestore context (goals, brand guide, etc.)
3. orient()  ← check agent bus for pending messages
4. implementation.act(state, tools, stimulus)
5. Persist state via adapter
6. Log to Intuition OS (Firestore)
```

---

## Agent Routing

**File:** `src/server/agents/agent-router.ts`

```
AgentRouter.route(message)
  → normalize (lowercase, trim, max 200 chars)
  → LRU cache check (500 entries, 5-min TTL)
  → if miss:
      score each agent's keywords
      score += keyword.length per match (longer = stronger)
      if single winner: confidence = min(0.95, 0.6 + score*0.05)
      if tie: confidence = 0.6
      if no match: { primaryAgent: 'puff', confidence: 0.5 }
  → cache + return RoutingResult

⚠️ AI fallback routing is DISABLED (commented out — caused empty response issues)
⚠️ confidence 0.5 = "no match" AND "weak match" — callers cannot distinguish
```

---

## Artifact Lifecycle

```
Agent response
  → parseArtifactsFromContent()
      looks for: :::artifact:type:title\n{json}\n:::
  → fallback: scan toolCalls for named tool calls
  → createInboxArtifact(threadId, orgId, userId, type, data)
      writes inbox_artifacts (status: 'draft' or 'approved')
      updates thread.artifactIds via FieldValue.arrayUnion

User clicks "Approve & Publish"
  → approveAndPublishArtifact(artifactId, orgId, userId)
      carousel         → write to carousels collection
      bundle           → write to bundles collection
      creative_content → write to tenants/{orgId}/creative_content
      blog_post        → createBlogPost()
      analytics_*      → status: 'approved' only (no publish target)
      research_report  → status: 'approved' only
  → update artifact: status = 'published'
  → if all thread artifacts published → thread status = 'completed'
```

---

## Firestore Schema

### inbox_threads
```typescript
{
  id: string,
  orgId: string,
  userId: string,
  type: InboxThreadType,              // 51+ values
  status: 'active' | 'draft' | 'completed' | 'archived',
  primaryAgent: InboxAgentPersona,    // 15 agents + 'auto'
  assignedAgents: InboxAgentPersona[],
  messages: ChatMessage[],            // EMBEDDED ARRAY — not subcollection
  artifactIds: string[],
  metadata?: Record<string, unknown>, // isBriefingThread: true for daily briefing
  customerId?: string,
  customerEmail?: string,
  customerSegment?: string,
  assignedToRole?: 'super_user',      // support routing
  isPinned?: boolean,
  tags?: string[],
  projectId?: string,
  createdAt: Timestamp,
  updatedAt: Timestamp,
  lastActivityAt: Timestamp
}
```

### inbox_artifacts
```typescript
{
  id: string,
  threadId: string,
  orgId: string,
  userId: string,
  type: InboxArtifactType,           // 30+ values
  status: 'draft' | 'pending_review' | 'approved' | 'published' | 'rejected',
  title: string,
  data: CarouselData | BundleData | CreativeContentData | ... (union),
  reviewedBy?: string,
  approvedBy?: string,
  publishedAt?: Timestamp,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

---

## Thread→Agent Mapping

| Thread Type | Primary Agent | Supporting |
|------------|---------------|-----------|
| `carousel` | `craig` | `smokey` |
| `bundle` | `mike_exec` | `smokey` |
| `creative` | `craig` | — |
| `qr_code` | `craig` | — |
| `inventory_promo` | `mike_exec` | — |
| `performance` | `pops` | — |
| `crm_customer` | `jack` | — |
| `general` | `puff` | — |

---

## State Management

| Layer | Tool | What It Holds |
|-------|------|---------------|
| Server | Firestore via server actions | Threads, artifacts, messages |
| Client (global) | Zustand `useInboxStore` | `viewMode`, `activeThreadId`, `threads` |
| Client (local) | React useState in InboxConversation | 7 generator show/hide booleans, 7 `hasAutoShownX` refs |
| Cross-component | Module-level `_pendingInputs: Map<threadId, string>` | Pre-populated input for new threads |
| Async jobs | `useJobPoller(jobId)` + Firestore real-time | Big Worm research, long tasks |

---

## Security Boundaries

- All server actions call `requireUser()` internally
- `injectAgentMessage()` is the ONLY auth-bypass — background services only
- `getInboxThread()` enforces: `thread.userId === user.uid || thread.assignedToRole === 'super_user'`
- `validateInput()` sanitizes user messages before processing
- `validateOutput()` checks for canary tokens + content sanitization
- Gauntlet (Deebo audit on outputs) is feature-flagged via `ENABLE_GAUNTLET_VERIFICATION`
