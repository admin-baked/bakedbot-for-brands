## Task Spec: Inbox/AI Chat System — Multi-Agent Conversational Interface

**Date:** 2026-02-20
**Requested by:** Self-initiated (Tier 1 feature spec, 3 of 5)
**Spec status:** 🟢 Approved (foundation already implemented, this spec documents current architecture)

---

### 1. Intent (Why)

Enable BakedBot customers and super users to manage all AI agent interactions through a unified thread-based conversational interface, routing complex tasks intelligently across 20+ specialized agents (Smokey, Craig, Leo, Jack, etc.) while maintaining artifact workflows, agent handoffs, and real-time Firestore synchronization. This consolidates marketing, analytics, operations, and research work into a single inbox experience with <500ms message send and <15s agent response times.

---

### 2. Scope (What)

**Files affected:**

Core Data Models & Server Actions:
- `src/types/inbox.ts` — InboxThread, InboxArtifact, InboxAgentPersona, AgentHandoff types; 51 thread types + 20 artifacts; THREAD_AGENT_MAPPING (routing matrix)
- `src/server/actions/inbox.ts` — createInboxThread, getInboxThreads, createInboxArtifact, updateInboxArtifactStatus, approveAndPublishArtifact, runInboxAgentChat, injectAgentMessage (1,560 lines)
- `src/server/actions/inbox-handoff.ts` — handoffToAgent, getHandoffHistory (agent transitions)

Frontend UI Components:
- `src/app/dashboard/inbox/page.tsx` — Main inbox page with view toggle (Unified Inbox vs Agent Chat)
- `src/components/inbox/unified-inbox.tsx` — Main container, sidebar + conversation + artifact panel layout
- `src/components/inbox/inbox-conversation.tsx` — Message rendering, user input, agent responses
- `src/components/inbox/inbox-artifact-panel.tsx` — Draft/pending/approved/published artifact lifecycle
- `src/components/inbox/inbox-sidebar.tsx` — Thread list, quick actions, thread filters
- `src/components/inbox/artifacts/*.tsx` — Carousel, Bundle, Creative, QR Code, Integration card renderers (8 artifact types)
- `src/components/inbox/crm/crm-context-panel.tsx` — Customer context injection for crm_customer threads
- `src/components/inbox/inbox-task-feed.tsx` — Real-time artifact updates

State Management:
- `src/lib/store/inbox-store.ts` — Active thread, artifacts, sidebar state, thread hydration
- `src/lib/store/agent-chat-store.ts` — ChatMessage interface, attachment types, metadata

Agent Harness & Execution:
- `src/server/agents/harness.ts` — Standard agent harness (initialize → orient → act → persist)
- `src/server/agents/agent-definitions.ts` — 19 agent capabilities (craig, smokey, leo, jack, linus, roach, big_worm, etc.)
- `src/server/agents/[agent].ts` — Individual agent implementations (10+ files)

**Files explicitly NOT touched:**

- `src/server/services/` — POS sync, Letta memory, RTRVR browser automation (used by agents, not modified)
- `src/app/dashboard/creative/` — Separate Creative Studio (now feeds artifacts into inbox)
- `src/app/dashboard/carousels/` — Legacy carousel management (superseded by inbox carousel threads)
- `src/app/dashboard/bundles/` — Legacy bundle management (superseded by inbox bundle threads)
- `src/firebase/admin.ts` — Firebase auth and Firestore client (used, not modified)

**Estimated diff size:** 3,500+ lines (core implementation complete; this spec documents current stable system)

---

### 3. Boundary Check

| Boundary | Yes/No | Notes |
|---|---|---|
| Touches auth or permissions? | Yes | User ownership verified on all thread/artifact CRUD; executive agents (glenda, jack, mike) restricted to super_user role only; CRM threads validate customer access |
| Touches payment or billing? | No | Artifacts may reference pricing/bundles but no payment processing in inbox system |
| Modifies database schema? | Yes | inbox_threads, inbox_artifacts Firestore collections; composite index on (userId, lastActivityAt) required |
| Changes infra cost profile? | No | Uses existing Firebase/Genkit, Slack/MCP routing; remote sidecar optional for Big Worm/Roach (Python) |
| Modifies LLM prompts or agent behavior? | Yes | Thread context injected into agent prompts (buildThreadContext); agents have type-specific system prompts (carousel, hero, campaign, etc.); golden set eval required for major persona changes |
| Touches compliance logic? | Yes | Deebo agent integrated into artifact creation (flagged in outreach/blog threads); Cannabis advertising rules enforced (no medical claims, age-gate); TCPA validation in SMS drafts |
| Adds new external dependency? | No | Uses existing Claude API, Gemini, Slack, fal.ai for image generation |

**Escalation needed?** No — current implementation is stable; no RFC needed for incremental improvements.

---

### 4. Implementation Plan

*(Current system is fully implemented; this describes the architecture)*

**Phase 1: Core Thread & Artifact Lifecycle** [COMPLETE]
1. Define InboxThread data model: id, orgId, userId, type, status, primaryAgent, assignedAgents, artifactIds, messages, createdAt
2. Define InboxArtifact data model: id, threadId, orgId, type (carousel/bundle/creative/etc), status (draft → pending_review → approved → published), data, createdBy, approvedBy, publishedAt
3. Implement createInboxThread (Zod validation, default agent assignment, initial message optional)
4. Implement getInboxThreads (cursor pagination, filter by type/status/orgId, Firestore composite index)
5. Implement createInboxArtifact (verify thread ownership, set to draft status)
6. Implement updateInboxArtifactStatus (draft → pending_review → approved → published state machine)
7. Implement approveAndPublishArtifact (publish to destination collection: carousels, bundles, tenants/{orgId}/creative_content, or blog_posts)

**Phase 2: Agent Routing & Chat Execution** [COMPLETE]
1. Define THREAD_AGENT_MAPPING: 51 thread types → primary + supporting agents
2. Implement runInboxAgentChat (message → agent → response → artifact detection → storage)
3. Build buildThreadContext: inject thread type, project, customer, and type-specific instructions
4. Integrate remote sidecar routing for Big Worm (deep_research), Roach (compliance_research)
5. Implement artifact extraction from agent response (parseArtifactsFromContent)
6. Implement tool call fallback (detect createCarouselArtifact, createBundleArtifact, createCreativeArtifact in tool results)

**Phase 3: Agent Handoffs & Multi-Agent Orchestration** [COMPLETE]
1. Implement handoffToAgent: fromAgent → toAgent with reason and messageId tracking
2. Update thread.primaryAgent when handoff occurs; append to handoffHistory
3. Update thread.assignedAgents (add new agent if not already assigned)
4. Support escalation patterns: Smokey → Deebo (compliance check), Craig → Deebo (copy review)

**Phase 4: Frontend UI & Real-Time Updates** [COMPLETE]
1. Build UnifiedInbox container (sidebar + conversation + artifact panel)
2. Build InboxConversation (message list, user input, loading states, thinking display)
3. Build InboxArtifactPanel (draft/pending/approved/published tabs, edit/approve/publish/delete actions)
4. Build artifact cards (carousel, bundle, creative, QR code, integration request)
5. Build InboxSidebar (thread list with filter, quick actions, thread creation)
6. Implement Firestore real-time subscriptions for thread messages and artifact updates (useEffect with onSnapshot)
7. View toggle (Unified Inbox vs traditional Agent Chat) with Framer Motion transitions

**Phase 5: Authorization & Role-Based Access** [COMPLETE]
1. Verify thread.userId === currentUser.uid on all mutations
2. Restrict executive agents (glenda, jack, mike) to super_user role only
3. Verify thread ownership before artifact mutations
4. Implement role-based quick actions (BRAND_ROLES, DISPENSARY_ROLES, ALL_BUSINESS_ROLES, customer, super_user)
5. Support CRM threads with customerId context (customer.segment, LTV, order history injected into prompts)

**Phase 6: Performance & Edge Cases** [COMPLETE]
1. Implement cursor-based pagination for getInboxThreads (50 docs per page)
2. Implement message append with FieldValue.arrayUnion (avoid full thread reload)
3. Implement artifact draft status before publishing (prevent race conditions)
4. Handle concurrent messages with optimistic UI updates
5. Implement agent timeout handling (15s default, fallback to job ID polling for remote agents)
6. Handle artifact failures gracefully (continue processing, log errors, surface to user)

---

### 5. Test Plan

**Unit tests:**

Thread Management:
- [ ] `test_createInboxThread_validatesInput` — Zod validation rejects invalid thread types
- [ ] `test_createInboxThread_setsPrimaryAgent` — Default agent assigned from THREAD_AGENT_MAPPING
- [ ] `test_createInboxThread_generatesThreadId` — Unique ID created (no collisions)
- [ ] `test_getInboxThreads_filtersByType` — WHERE type == 'carousel' returns only carousel threads
- [ ] `test_getInboxThreads_paginatesWithCursor` — Second page starts after cursor doc
- [ ] `test_updateInboxThread_verifiesOwnership` — Unauthorized user cannot update other's thread

Artifact Lifecycle:
- [ ] `test_createInboxArtifact_setsDraftStatus` — New artifact is always 'draft'
- [ ] `test_updateInboxArtifactStatus_transitionsStates` — draft → pending_review → approved → published
- [ ] `test_approveAndPublishArtifact_publishesToCarousels` — Carousel artifact → carousels collection
- [ ] `test_approveAndPublishArtifact_publishesToBundles` — Bundle artifact → bundles collection
- [ ] `test_approveAndPublishArtifact_publishesToCreativeContent` — Creative → tenants/{orgId}/creative_content
- [ ] `test_approveAndPublishArtifact_updatesThreadStatus` — Thread status = 'completed' when all artifacts published
- [ ] `test_deleteInboxArtifact_removesFromThread` — artifact removed from thread.artifactIds

Agent Chat & Routing:
- [ ] `test_runInboxAgentChat_routesBySmokey` — carousel thread → smokey agent
- [ ] `test_runInboxAgentChat_restrictExecutiveAgents` — Non-super-user cannot invoke glenda/jack/mike
- [ ] `test_runInboxAgentChat_remoteRoutingForBigWorm` — deep_research thread routes to Python sidecar if available
- [ ] `test_runInboxAgentChat_parseArtifactsFromResponse` — Agent response with :::artifact: markers creates InboxArtifacts
- [ ] `test_runInboxAgentChat_fallsBackToToolResults` — createCarouselArtifact tool result detected even without response marker
- [ ] `test_buildThreadContext_injectsProjectInstructions` — Project context appended when thread.projectId set
- [ ] `test_buildThreadContext_injectsCRMCustomer` — Customer data (LTV, segment, lastOrder) injected for crm_customer threads

Handoff Management:
- [ ] `test_handoffToAgent_updatesPrimaryAgent` — thread.primaryAgent = toAgent
- [ ] `test_handoffToAgent_appendsToHistory` — handoffHistory includes all transitions
- [ ] `test_getHandoffHistory_returnsChronological` — Handoffs sorted by timestamp

Message Persistence:
- [ ] `test_addMessageToInboxThread_appendsToMessages` — Message array grows on each add
- [ ] `test_addMessageToInboxThread_serializesTimestamp` — Date converted to ISO string for Firestore
- [ ] `test_addMessageToInboxThread_updatesPreview` — thread.preview = first 50 chars of message
- [ ] `test_addMessageToInboxThread_updatesLastActivityAt` — lastActivityAt = now

**Integration tests:**

End-to-End Artifact Workflow:
- [ ] `test_e2e_carouselWorkflow` — Create carousel thread → run agent → artifact in draft → approve → published to carousels collection
- [ ] `test_e2e_bundleWorkflow` — Create bundle thread → Money Mike generates bundle → approve → published to bundles collection
- [ ] `test_e2e_creativeWorkflow` — Create creative thread → Craig generates post + image → approve → published to creative_content
- [ ] `test_e2e_handoffAndEscalation` — Create carousel thread (Smokey) → handoff to Deebo (compliance) → approve both artifacts

Multi-User Concurrent Threads:
- [ ] `test_e2e_multiUserThreads` — User A and User B have separate threads (no cross-contamination)
- [ ] `test_e2e_orgIsolation` — Brand A and Brand B threads isolated by orgId

**Golden set eval (LLM/prompt change):**
- [ ] Run `golden-sets/inbox-agent-qa.json` — 50 test cases (carousel suggestions, bundle pricing, creative compliance)
- [ ] Target: ≥90% accuracy for all agents, 100% on compliance-sensitive outputs (Deebo)
- [ ] Compare before/after scores when THREAD_AGENT_MAPPING or agent prompts change

**Manual smoke test (UI change):**
- [ ] Create carousel thread → verify sidebar adds thread to list
- [ ] Send message to agent → verify response appears in conversation
- [ ] Agent generates artifact → verify artifact card appears in panel with draft status
- [ ] Approve artifact → verify status changes to approved + publish button enabled
- [ ] Publish artifact → verify artifact disappears from panel + success toast
- [ ] Handoff thread → verify agent name changes + handoff notification shows
- [ ] Filter by thread type → verify only carousel threads show
- [ ] Pagination → load 50 threads, scroll, load next 50 with cursor

---

### 6. Rollback Plan

| Strategy | Details |
|---|---|
| Single commit revert? | Yes — `git revert <commit>` if critical bugs discovered within 24h of deploy |
| Feature flag? | Flag name: `NEXT_PUBLIC_INBOX_ENABLED` (env var; default true). If false, redirect /inbox to legacy views (/dashboard/carousels, /dashboard/bundles) |
| Data migration rollback needed? | No — inbox_threads and inbox_artifacts are additive (legacy carousels/bundles unaffected); Firestore collections can be deleted without side effects |
| Downstream services affected? | Slack agent bridge (`slack-agent-bridge.ts`) may reference inbox threads; revert with notification to Slack users that inbox unavailable |

**Fallback scenario:** If remote sidecar unavailable, system falls back to local execution automatically. If local execution fails, return job ID for polling (user sees "Agent working..." with retry option).

---

### 7. Success Criteria

- [ ] All tests pass (zero regressions): unit (45 tests), integration (8 tests), golden set (50 test cases ≥90% accuracy)
- [ ] Message send latency <500ms (Firestore write + UI update): measured via browser DevTools Network tab on 3G throttle
- [ ] Agent response latency <15s (default timeout): measured from message submit to first agent response character appearing
- [ ] Thread creation visible in sidebar within 1s of clicking "New Thread"
- [ ] Artifact publication (draft → approved → published) completes within 3s
- [ ] No console errors on 10-minute manual test session (carousel → bundle → creative → handoff flow)
- [ ] Concurrent messages (2 users, same org) do NOT corrupt thread state (verified via Firestore audit log)
- [ ] CRM thread properly injects customer context (LTV, segment, lastOrder visible in prompts)
- [ ] Executive agent access (glenda/jack/mike) blocked for non-super-user; error message clear
- [ ] Artifact types route correctly: carousel → carousels collection, bundle → bundles, creative → tenants/{orgId}/creative_content
- [ ] Handoff history persists and displays chronologically
- [ ] Mobile UI functional (sidebar collapse, message input on small screens, artifact panel scrollable)
- [ ] Artifact panel properly displays all 9 artifact types (carousel, bundle, creative, QR code, blog post, report, outreach draft, event promo, integration request)
- [ ] No new errors in Sentry within 24h post-deploy
- [ ] Slack heartbeat notification includes inbox stats (threads created, agents invoked, artifacts published today)

---

### Approval

- [ ] **Spec reviewed by:** _Self-initiated (current implementation documented)_
- [ ] **Approved to implement:** Yes (already in production)
- [ ] **Modifications required:** None — this spec captures current stable system

---

---

## Architecture Deep Dive

### Data Model Overview

**InboxThread Collection (inbox_threads)**
```typescript
{
  id: "inbox-thread-1708346800123-abc123def456",
  orgId: "org_thrive_syracuse",  // Brand/Dispensary ID
  userId: "user-firebase-uid",    // Thread owner

  // Metadata
  type: "carousel" | "bundle" | "creative" | ... (51 types),
  status: "active" | "draft" | "completed" | "archived",
  title: "New carousel for Sativas",
  preview: "Help me create a carousel...",

  // Agent context
  primaryAgent: "smokey",  // Current agent
  assignedAgents: ["smokey", "ezal", "pops"],  // All agents touched
  handoffHistory?: [
    {
      id: "handoff_...",
      fromAgent: "smokey",
      toAgent: "deebo",
      reason: "Compliance review needed",
      timestamp: Date,
      messageId?: "msg-1234"
    }
  ],

  // Artifacts
  artifactIds: ["artifact-1", "artifact-2"],

  // Messages
  messages: [
    {
      id: "msg-1",
      type: "user",
      content: "Create a carousel...",
      timestamp: Date,
      attachments?: [{ id, name, type, url, preview }]
    },
    {
      id: "msg-2",
      type: "agent",
      content: "I'll create...",
      timestamp: Date,
      thinking?: { isThinking, steps, plan },
      metadata?: { type, data, brandId, agentName, model }
    }
  ],

  // Optional context
  projectId?: "proj-123",
  brandId?: "brand-123",
  dispensaryId?: "disp-456",
  customerId?: "customer-alleaves-123",  // CRM context
  customerEmail?: "email@example.com",
  customerSegment?: "VIP",

  // Organization
  isPinned?: true,
  tags?: ["high-priority", "sativa"],
  color?: "#4CAF50",

  // Timestamps
  createdAt: Timestamp,
  updatedAt: Timestamp,
  lastActivityAt: Timestamp  // For sorting
}
```

**InboxArtifact Collection (inbox_artifacts)**
```typescript
{
  id: "inbox-artifact-1708346800123-xyz789",
  threadId: "inbox-thread-...",
  orgId: "org_thrive_syracuse",

  // Type & Status
  type: "carousel" | "bundle" | "creative_content" | "qr_code" | "blog_post" | "report" | ... (18 types),
  status: "draft" | "pending_review" | "approved" | "published" | "rejected",

  // Polymorphic data (union of all artifact types)
  data: Carousel | BundleDeal | CreativeContent | QRCode | ... {
    // Example Carousel:
    {
      id: "",
      orgId: "org_thrive_syracuse",
      title: "Morning Energizers",
      description: "Uplifting sativas for your morning routine",
      productIds: ["product-123", "product-456"],
      active: false,
      displayOrder: 0,
      createdAt: Date,
      updatedAt: Date
    }
  },

  // Agent rationale
  rationale?: "Created based on inventory analysis and customer preferences",

  // Drive integration
  driveFileId?: "drive-file-123",  // Links to BakedBot Drive file

  // Approval tracking
  createdAt: Timestamp,
  updatedAt: Timestamp,
  createdBy: "user-uid",
  approvedBy?: "user-uid",
  approvedAt?: Timestamp,
  publishedAt?: Timestamp
}
```

### Agent Routing Matrix

**THREAD_AGENT_MAPPING** (51 thread types → agent assignment):

| Thread Type | Primary Agent | Supporting Agents |
|---|---|---|
| carousel | smokey | ezal, pops |
| bundle | money_mike | smokey, pops |
| creative | craig | deebo, ezal |
| campaign | craig | money_mike, pops, deebo |
| qr_code | craig | linus |
| hero | craig | deebo, ezal |
| blog | craig | deebo |
| launch | leo | smokey, money_mike, craig |
| performance | linus | pops, ezal |
| outreach | craig | deebo |
| inventory_promo | money_mike | day_day, smokey |
| event | craig | glenda, deebo |
| product_discovery | smokey | ezal |
| support | smokey | deebo |
| general | auto | (routes via Puff) |
| **Growth Management** | | |
| growth_review | jack | linus, pops |
| churn_risk | jack | pops, leo |
| revenue_forecast | money_mike | jack, linus |
| pipeline | jack | glenda, leo |
| customer_health | jack | pops, leo |
| market_intel | ezal | jack, glenda |
| bizdev | glenda | jack, craig |
| experiment | linus | jack, pops |
| **Company Operations** | | |
| daily_standup | leo | linus, jack, glenda |
| sprint_planning | linus | leo, pops |
| incident_response | linus | leo, deebo |
| feature_spec | linus | glenda, smokey |
| code_review | linus | roach |
| release | linus | leo, craig |
| customer_onboarding | mrs_parker | jack, smokey |
| customer_feedback | jack | mrs_parker, linus |
| support_escalation | leo | jack, linus |
| content_calendar | glenda | craig, day_day |
| launch_campaign | glenda | craig, linus |
| seo_sprint | day_day | glenda, roach |
| partnership_outreach | glenda | jack, craig |
| billing_review | mike | jack, leo |
| budget_planning | mike | leo, jack |
| vendor_management | mike | linus, leo |
| compliance_audit | deebo | roach, leo |
| weekly_sync | leo | jack, linus, glenda, mike |
| quarterly_planning | leo | jack, linus, glenda, mike |
| board_prep | mike | jack, leo |
| hiring | leo | linus, glenda |
| **Research** | | |
| deep_research | big_worm | roach, ezal |
| compliance_research | roach | deebo, big_worm |
| market_research | big_worm | ezal, jack |
| **CRM** | | |
| crm_customer | mrs_parker | craig, money_mike, smokey |

### Artifact Lifecycle State Machine

```
draft
  ↓ (user edits in panel)
pending_review (optional)
  ↓ (user clicks "Approve")
approved
  ↓ (user clicks "Publish")
published → destination collection

Alternative paths:
draft → rejected (user clicks "Reject")
rejected → (cycle returns to draft if re-edited)
```

### Real-Time Update Architecture

**Client-side subscription (inbox-store.ts):**
```typescript
// Watch active thread for new messages
useEffect(() => {
  if (!activeThreadId) return;
  const unsubscribe = db.collection('inbox_threads')
    .doc(activeThreadId)
    .onSnapshot((doc) => {
      const thread = doc.data();
      updateThread(thread);  // Update store
    });
  return unsubscribe;
}, [activeThreadId]);

// Watch artifacts for status changes
useEffect(() => {
  if (!activeThreadId) return;
  const unsubscribe = db.collection('inbox_artifacts')
    .where('threadId', '==', activeThreadId)
    .onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'modified') {
          updateArtifact(change.doc.id, change.doc.data());
        }
      });
    });
  return unsubscribe;
}, [activeThreadId]);
```

### Remote Sidecar Routing (Big Worm & Roach)

For expensive research agents, system can route to Python sidecar:

```typescript
// In runInboxAgentChat:
const REMOTE_AGENTS = ['big_worm', 'roach'];
const REMOTE_THREAD_TYPES = ['deep_research', 'compliance_research', 'market_research'];

if (REMOTE_AGENTS.includes(thread.primaryAgent) && process.env.PYTHON_SIDECAR_ENDPOINT) {
  // Start async job on remote sidecar
  const jobResult = await sidecarClient.startJob({
    method: 'agent.execute',
    params: { agent: thread.primaryAgent, query: userMessage, context: { threadId, ... } }
  });
  // Return jobId for client polling
  return { success: true, jobId: jobResult.data.jobId };
}
```

Client polls `/api/inbox/job/{jobId}` to check remote job status.

### Authorization Model

**Thread Ownership:**
- `thread.userId === currentUser.uid` required for all mutations
- Cross-user access blocked at Firestore level

**Role-Based Access:**
- Executive agents (glenda, jack, mike) restricted to `super_user` role
- Brand/dispensary quick actions available to `brand`, `brand_admin`, `dispensary_admin`
- Customer threads available to `customer` role

**CRM Threads:**
- customerId must match currentUser's organization
- Customer segment/LTV fetched from Letta memory and injected into prompts

### Error Handling & Edge Cases

**Concurrent Messages:**
- Messages appended with `FieldValue.arrayUnion` (atomic, no read-before-write)
- UI optimistically adds message; Firestore confirms on success

**Agent Timeout:**
- Default 15-second timeout for agent response
- If timeout, return `jobId` for polling (user sees "Still working..." message)
- Polling endpoint checks remote sidecar or job queue status

**Artifact Failures:**
- If artifact creation fails mid-stream, log error but continue (don't block user)
- User sees "Artifact creation failed" error badge on card
- Artifact remains in draft state for user to retry/edit

**Firestore Composite Index:**
- Required: `(userId, lastActivityAt, desc)` for getInboxThreads sorting
- Auto-created by Firebase on first query; verify in Firestore console

---

### Performance Targets

| Metric | Target | Measurement |
|---|---|---|
| Message send latency | <500ms | Time from user press Enter to message appearing in conversation |
| Agent response time | <15s | Time from message submit to first character of agent response |
| Thread list load | <2s | Time to display 50 threads in sidebar |
| Artifact publication | <3s | Time from "Publish" click to artifact visible in destination collection |
| Real-time update | <1s | Time from agent message in Firestore to appearing in browser |
| Pagination load (next page) | <1s | Time to load next 50 threads via cursor |
