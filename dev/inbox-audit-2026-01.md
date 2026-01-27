# Inbox UX System Audit
**Date:** January 27, 2026
**Objective:** Compare current implementation against technical spec and identify optimization opportunities

---

## ✅ Core Paradigm: "Conversation → Artifact"

### IMPLEMENTED
- ✅ **UnifiedInbox Component** ([unified-inbox.tsx](../src/components/inbox/unified-inbox.tsx))
  - 3-column layout: Sidebar + Conversation + Artifact Panel
  - Slide-over animation for artifact panel (`initial={{ x: 100 }}`)
  - AnimatePresence for smooth transitions

- ✅ **64 Thread Types** ([types/inbox.ts](../src/types/inbox.ts))
  - Business Operations: carousel, bundle, creative, campaign, etc.
  - Super User Growth: growth_review, churn_risk, revenue_forecast, etc.
  - Super User Operations: daily_standup, sprint_planning, incident_response, etc.
  - Customer: product_discovery, support

- ✅ **37 Artifact Types** with polymorphic data structures
  - Business artifacts: carousel, bundle, creative_content, sell_sheet, report
  - Growth artifacts: growth_report, churn_scorecard, pipeline_report
  - Operations artifacts: standup_notes, sprint_plan, feature_spec, release_notes

- ✅ **Server Action Orchestration** ([server/actions/inbox.ts](../src/server/actions/inbox.ts))
  - `runInboxAgentChat()` routes to appropriate agent based on thread type
  - `buildThreadContext()` creates system prompts for 64 thread types
  - Artifact parsing from agent responses
  - Database persistence (Firestore: `inbox_threads`, `inbox_artifacts`)

### ⚠️ GAP: Feels "Bolted On"
**Issue:** The inbox uses a separate zustand store and separate Firestore collections, making it feel like an add-on rather than the core UX paradigm.

**Current Architecture:**
```
Dashboard Pages (standalone)  ──┐
  ├─ /creative (Creative Center) │  ← Legacy standalone pages
  ├─ /playbooks                  │
  └─ /projects                   │
                                 ├─ Both exist in parallel
Inbox (separate system)  ────────┘
  ├─ inbox_threads (Firestore)
  ├─ inbox_artifacts (Firestore)
  └─ inbox-store.ts (Zustand)
```

**User Journey Disconnect:**
- User creates carousel in `/creative` → Saved to `carousels` collection
- User creates carousel in `/inbox` → Saved to `inbox_artifacts` collection (different data!)
- No bridge between the two systems
- Duplicated UI components (CarouselGenerator vs. InboxCarouselCard)

---

## ✅ Transparency via Task Feed

### IMPLEMENTED
- ✅ **InboxTaskFeed Component** ([inbox-task-feed.tsx](../src/components/inbox/inbox-task-feed.tsx))
  ```tsx
  <motion.div
    animate={{ scale: [1, 1.2, 1], opacity: [0.7, 0, 0.7] }}
    transition={{ repeat: Infinity, duration: 2 }}
    className="absolute -inset-1 rounded-full bg-baked-green/30"
  />
  ```
- ✅ **Agent Pulse Config** with persona-specific animations
- ✅ **Integrated into InboxConversation** (lines 46, showing during agent processing)
- ✅ **Job Polling Hook** (`useJobPoller`) for long-running Genkit flows

### ⚠️ GAP: Not Used in Legacy Pages
- Creative Center has its own loading states (spinners, not TaskFeed)
- Playbooks page doesn't show agent activity
- No granular "Big Worm is analyzing competitive price gaps..." messaging outside inbox

---

## ✅ Human-in-the-Loop (HitL) Protocol

### IMPLEMENTED
- ✅ **InboxArtifactStatus Enum** ([types/inbox.ts](../src/types/inbox.ts:1050))
  ```ts
  export type InboxArtifactStatus =
    | 'draft'           // Agent created, not reviewed
    | 'pending_review'  // User requested review
    | 'approved'        // User approved
    | 'published'       // Deployed to destination
    | 'rejected';       // User rejected
  ```

- ✅ **ArtifactPipelineBar Component** ([artifact-pipeline-bar.tsx](../src/components/inbox/artifact-pipeline-bar.tsx))
  - Visual stepper: Draft → Review → Approved → Published
  - Used in artifact detail views and inline cards

- ✅ **Approval Workflow** ([server/actions/inbox.ts](../src/server/actions/inbox.ts))
  ```ts
  export async function approveAndPublishArtifact(
    artifactId: string,
    destination: 'live' | 'scheduled'
  ): Promise<{ success: boolean; publishedId?: string; error?: string }>
  ```

- ✅ **Status Gating in UI**
  - Artifact cards show status badges
  - "Green Check" approval button emphasized in artifact panel

### ⚠️ GAP: Inconsistent Enforcement
- Legacy pages (Creative Center, Playbooks) don't use HitL protocol
- Publish actions in legacy pages go directly to live collections without approval stage
- No unified approval queue across all artifact types

---

## ✅ Multi-Agent Persona Switching

### IMPLEMENTED
- ✅ **15 Agent Personas** with visual identities ([inbox-conversation.tsx](../src/components/inbox/inbox-conversation.tsx:53-79))
  ```ts
  const AGENT_NAMES: Record<InboxAgentPersona, {
    name: string;
    avatar: string;  // Emoji
    color: string;   // text-emerald-500, text-amber-500, etc.
    bgColor: string; // bg-emerald-500/10
    ringColor: string; // ring-emerald-500/50
  }>
  ```

- ✅ **Thread Primary Agent + Supporting Agents**
  - `thread.primaryAgent` determines main conversation partner
  - `thread.assignedAgents` array for multi-agent coordination
  - `THREAD_AGENT_MAPPING` auto-routes thread types to agents

- ✅ **Visual Persona in UI**
  - ThreadHeader shows agent avatar with colored ring (lines 169-176)
  - MessageBubble shows agent emoji and name (lines 100-142)
  - Agent badges update based on thread's primaryAgent

### ⚠️ GAP: Static UI, Not Dynamic Handoffs
**Current:** Primary agent is set at thread creation and doesn't change mid-conversation.

**Spec Expectation:** "When a handoff happens (e.g., from Mrs. Parker for loyalty to Money Mike for pricing), the icon, badge, and 'Agent Thinking' indicator should instantly update to show the persona swap."

**Missing:**
- No runtime agent handoff protocol
- No UI to visualize agent transitions within a single thread
- Messages show agent name but don't highlight transitions

**Example of what's needed:**
```
[Mrs. Parker]: Based on your loyalty data, I recommend a pricing adjustment.
[Handoff Notification]: Mrs. Parker is consulting Money Mike for pricing strategy...
[Money Mike]: Here's my analysis of competitive pricing...
```

---

## ❌ Local vs. Remote Execution (Sidecar)

### NOT IMPLEMENTED
**Spec Requirement:** "Heavy data processing and strategic research (NotebookLM/Big Worm) should be offloaded to the Remote Python Sidecar using the RemoteMcpClient."

**Current State:**
- ✅ Python sidecar exists ([python-sidecar/](../python-sidecar/))
  - MCP server setup
  - GCE deployment scripts
  - Jupyter notebook integration

- ❌ Not integrated with inbox
  - No `RemoteMcpClient` usage in inbox server actions
  - Agent calls all run locally in Next.js runtime
  - No differentiation between "light" agents (Smokey) and "heavy" agents (Big Worm, NotebookLM)

**Impact:**
- Long-running research tasks (Big Worm competitive analysis) block Next.js server
- No ability to run multi-hour strategic research
- Frontend can't be a "thin client" as specified

---

## ⚠️ Styling & Motion

### IMPLEMENTED
- ✅ **Glassmorphism** ([unified-inbox.tsx](../src/components/inbox/unified-inbox.tsx:312))
  ```tsx
  'bg-sidebar/80 backdrop-blur-xl',
  'supports-[backdrop-filter]:bg-sidebar/60'
  ```

- ✅ **Slide-overs for Artifact Panel** (lines 149-162)
  ```tsx
  <motion.div
    initial={{ x: 100, opacity: 0 }}
    animate={{ x: 0, opacity: 1 }}
    exit={{ x: 100, opacity: 0 }}
    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
  >
  ```

- ✅ **Agent Pulse Animations** ([inbox-task-feed.tsx](../src/components/inbox/inbox-task-feed.tsx))
  ```tsx
  <motion.div
    animate={{ scale: [1, 1.2, 1], opacity: [0.7, 0, 0.7] }}
    transition={{ repeat: Infinity, duration: 2 }}
  />
  ```

- ✅ **Tailwind CSS + ShadCN UI + Framer Motion** stack

### ⚠️ INCONSISTENCY: Legacy Pages Don't Match
- Creative Center uses different styling patterns (glass-card utility)
- Playbooks page has different motion patterns
- Projects page feels like traditional dashboard, not "coordination layer"
- No unified design language across inbox vs. legacy pages

---

## 🔴 Critical Gaps Summary

### 1. **Inbox is Parallel, Not Primary**
**Problem:** Inbox exists alongside legacy standalone pages, creating two UX paradigms.

**Fix:**
- Deprecate standalone `/creative`, `/playbooks` pages
- Route all artifact creation through inbox threads
- Migrate existing collections to use inbox_artifacts schema

### 2. **No Runtime Agent Handoffs**
**Problem:** Agent personas are static per thread, not dynamic.

**Fix:**
- Add `handoffToAgent()` server action
- Update UI to show agent transition notifications
- Animate persona swap (icon, color, "thinking" indicator)

### 3. **Remote Sidecar Not Integrated**
**Problem:** Heavy research agents (Big Worm, NotebookLM) run locally, blocking server.

**Fix:**
- Create `RemoteMcpClient` wrapper for Python sidecar
- Route Big Worm, Roach (research) threads to remote execution
- Use job polling for multi-hour research tasks

### 4. **No Unified HitL Approval Queue**
**Problem:** Artifacts created outside inbox bypass approval workflow.

**Fix:**
- Create global approval queue view (`/dashboard/approvals`)
- Show all pending artifacts across all types (carousels, bundles, creative, etc.)
- Enforce approval gate before publishing to production

### 5. **Inconsistent Styling & Motion**
**Problem:** Inbox uses glassmorphism and slide-overs, but legacy pages don't.

**Fix:**
- Apply inbox styling patterns to all dashboard pages
- Use InboxTaskFeed universally (not just inbox)
- Standardize on "Agent Pulse" animations for all agent activity

---

## 📋 Recommended Migration Path

### Phase 1: Unify Artifact Storage (High Priority)
1. Create `artifacts` collection (replace separate carousel/bundle/creative collections)
2. Add `sourceType: 'inbox' | 'legacy'` flag during transition
3. Update legacy pages to save to unified artifact schema
4. Migrate existing data with script

### Phase 2: Deprecate Standalone Pages (Medium Priority)
1. Add "Create in Inbox" CTAs to legacy pages
2. Make legacy pages read-only (view/approve existing artifacts)
3. Redirect creation flows to inbox with pre-filled thread type
4. Remove legacy create pages after 2-week transition

### Phase 3: Implement Agent Handoffs (Medium Priority)
1. Add `handoffHistory` array to InboxThread
2. Create `handoffToAgent()` server action with transition message
3. Update ThreadHeader to show current agent + handoff history
4. Add transition animations (fade out old agent color, fade in new)

### Phase 4: Remote Sidecar Integration (Low Priority)
1. Build `RemoteMcpClient` class wrapping Python sidecar MCP calls
2. Update `runInboxAgentChat()` to route research threads to sidecar
3. Add sidecar health check UI in settings
4. Monitor sidecar usage metrics

### Phase 5: Global Approval Queue (Low Priority)
1. Create `/dashboard/approvals` page
2. Query all artifacts with `status: 'pending_review'` across types
3. Show unified list with bulk approve/reject actions
4. Add approval analytics dashboard

---

## 🎯 Quick Wins (Can Do Today)

### 1. Add Agent Handoff Notifications (4 hours)
Even without runtime handoffs, we can improve messaging:
```tsx
// In InboxConversation, when agent changes between messages:
{previousMessage.agent !== currentMessage.agent && (
  <div className="text-center text-xs text-muted-foreground my-2">
    <Badge variant="outline">
      Handoff: {previousAgent.name} → {currentAgent.name}
    </Badge>
  </div>
)}
```

### 2. Apply Inbox Styling to Legacy Pages (2 hours each)
- Add `bg-sidebar/80 backdrop-blur-xl` to Creative Center sidebar
- Use slide-over animations for artifact preview panels
- Replace loading spinners with InboxTaskFeed component

### 3. Add "Open in Inbox" Buttons (1 hour)
On Creative Center, Playbooks, Projects:
```tsx
<Button variant="outline" onClick={() => router.push('/dashboard/inbox?type=carousel')}>
  <InboxIcon className="h-4 w-4 mr-2" />
  Open in Inbox
</Button>
```

### 4. Create Unified Artifact Card Component (3 hours)
Merge `CarouselCard` (Creative Center) + `InboxCarouselCard` into single component:
```tsx
<ArtifactCard
  artifact={artifact}
  mode="inline" | "detail" | "grid"
  showApprovalActions={true}
  onApprove={handleApprove}
/>
```

---

## 💡 Architectural Recommendation

**Thesis:** The inbox should BE the dashboard, not a section of it.

**New Mental Model:**
```
Dashboard = Inbox
  ├─ Sidebar: Thread Types (Quick Actions)
  ├─ Main: Active Conversation
  └─ Right Panel: Artifact Preview

Navigation:
  ├─ /dashboard/inbox (default view)
  ├─ /dashboard/inbox?type=carousel (filtered view)
  ├─ /dashboard/artifacts (gallery view of all approved artifacts)
  └─ /dashboard/approvals (approval queue)
```

**Benefits:**
1. Single source of truth for artifact creation
2. Consistent HitL approval workflow
3. All agent activity visible via TaskFeed
4. Natural multi-agent coordination
5. Unified styling and motion patterns

**Migration:**
- Keep legacy URLs working (redirect to inbox with pre-filled type)
- Show migration banner: "Now using Inbox for all artifact creation"
- Provide "Classic View" toggle during transition period

---

## 📊 Measurement & Success Criteria

### Pre-Migration Metrics (Baseline)
- [ ] Average time from idea → published artifact
- [ ] % of artifacts that require revision after first review
- [ ] Number of clicks to create carousel/bundle/creative
- [ ] User satisfaction score (NPS)

### Post-Migration Targets
- [ ] Reduce creation time by 40% (via inline artifact creation in threads)
- [ ] Reduce revision rate by 30% (via agent collaboration)
- [ ] Reduce clicks to create by 60% (quick actions → thread → artifact)
- [ ] Increase NPS by 15 points (unified, premium UX)

---

## 🚀 Conclusion

The current inbox implementation has **excellent foundations** (thread types, artifact types, agent personas, HitL protocol), but it's **architecturally isolated** from the rest of the dashboard.

**Key Insight:** The spec describes the inbox as "a coordination layer for an AI squad," but the current UX treats it as "another section" alongside traditional pages.

**Recommendation:** Embrace the inbox as the **primary UX paradigm** and migrate all artifact creation workflows into it. This will:
1. Eliminate duplication (separate collections, components, stores)
2. Enforce consistent HitL approval workflow
3. Make multi-agent coordination natural and visible
4. Create a cohesive "premium" feel across the entire dashboard

The work is **not a rewrite**—it's a **reorganization** of existing, high-quality components into a unified system.
