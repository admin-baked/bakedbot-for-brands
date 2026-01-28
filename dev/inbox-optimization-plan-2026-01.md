# Inbox Optimization Plan
**Date:** January 27, 2026
**Status:** ✅ **COMPLETED**
**Objective:** Align BakedBot Inbox with Technical Handover Brief specifications

---

## 🎉 Implementation Complete!

All optimizations from the Technical Handover Brief have been successfully implemented:
- ✅ Task Feed now persistent & prominent (sticky at top)
- ✅ Green Check approval button with animated gradient & glow
- ✅ Agent handoffs already integrated (discovered during audit)
- ✅ QR code feature fully implemented (types, server actions, UI)
- ✅ Remote sidecar routing for Big Worm & Roach
- ✅ Color palette matches brief exactly (already in place)

**Total Implementation Time:** ~8 hours
**Build Status:** ✅ All TypeScript checks passing

---

## 📋 Technical Brief Requirements

### 1. **Core Paradigm: "Conversation → Artifact"**
> "Do not build new standalone dashboard pages. Build Thread Types and Artifacts."

**Current State:** ✅ **FULLY IMPLEMENTED**
- UnifiedInbox component with 3-column layout
- 64 thread types, 37 artifact types
- Agent produces artifacts in conversation
- Artifact Panel for review/approval

**Optimization Needed:** ✨ **ENHANCEMENT**
- Ensure no new standalone pages are created
- All new features route through inbox threads

---

### 2. **Transparency via Task Feed**
> "Every long-running agent flow must report granular progress steps."

**Current State:** ✅ **MOSTLY IMPLEMENTED**
- InboxTaskFeed component exists
- Agent pulse animations with Framer Motion
- Displays agent name, avatar, current action
- Supports progress bar and thought stream

**Optimization Needed:** 🔧 **MEDIUM PRIORITY**

#### Issue: Task Feed is hidden/secondary
Currently shown at bottom of conversation, not always visible.

#### Solution: Make Task Feed persistent and prominent
```tsx
// Current: Task Feed at bottom (hidden until scrolling)
<InboxConversation>
  <ChatMessages />
  <InputArea />
  <TaskFeed /> {/* Hidden at bottom */}
</InboxConversation>

// Optimized: Task Feed always visible in sidebar or top
<InboxConversation>
  <TaskFeed /> {/* Persistent top banner OR left sidebar */}
  <ChatMessages />
  <InputArea />
</InboxConversation>
```

**Action Items:**
- [ ] Option A: Move TaskFeed to persistent top banner (sticky)
- [ ] Option B: Add TaskFeed to left sidebar below quick actions
- [ ] Option C: Floating overlay in bottom-right corner (like Intercom chat)
- [ ] Ensure TaskFeed updates in real-time during agent processing
- [ ] Connect TaskFeed to Genkit job polling for thought stream

---

### 3. **Human-in-the-Loop (HitL) Protocol**
> "High-risk actions must never be fully autonomous. Green Check is primary success action."

**Current State:** ✅ **IMPLEMENTED**
- Artifact status flow: draft → pending_review → approved → published
- ArtifactPipelineBar shows status progression
- Approve button exists in ArtifactPanel

**Optimization Needed:** 🔧 **HIGH PRIORITY**

#### Issue: Green Check not emphasized enough
Current approve button is standard green, doesn't stand out dramatically.

#### Solution: Make approval action unmissable
```tsx
// Current: Standard green button
<Button className="bg-baked-600">
  <CheckCircle2 /> Approve & Publish
</Button>

// Optimized: Gradient, shadow, animation, larger
<motion.div
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
>
  <Button className={cn(
    'w-full h-14 text-lg font-bold gap-3',
    'bg-gradient-to-r from-green-600 via-green-500 to-green-400',
    'hover:from-green-500 hover:via-green-400 hover:to-green-300',
    'shadow-xl shadow-green-500/50',
    'border-2 border-green-400',
    'relative overflow-hidden'
  )}>
    {/* Animated shine effect */}
    <motion.div
      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
      animate={{ x: ['-100%', '200%'] }}
      transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
    />
    <CheckCircle2 className="h-6 w-6 relative z-10" />
    <span className="relative z-10">Approve & Publish</span>
  </Button>
</motion.div>
```

**Action Items:**
- [ ] Redesign approval button with gradient + animation
- [ ] Add subtle pulsing glow when artifact is pending review
- [ ] Show confirmation dialog with final preview before publishing
- [ ] Log all approval actions with userId/timestamp for audit trail

---

### 4. **Multi-Agent Persona Switching**
> "When a handoff happens, icon/badge/indicator should instantly update."

**Current State:** ⚠️ **PARTIALLY IMPLEMENTED**
- Agent personas defined with colors/emojis/avatars
- AgentHandoff schema exists (handoffHistory in InboxThread)
- Server action `handoffToAgent()` implemented
- UI components created (AgentHandoffNotification, AgentHandoffMessage)

**Optimization Needed:** 🔧 **HIGH PRIORITY**

#### Issue: Handoffs not integrated into conversation view
Schema and server actions exist, but InboxConversation doesn't render handoffs.

#### Solution: Show handoff transitions inline
```tsx
// In InboxConversation component:
messages.forEach((msg, i) => {
  const prevMsg = i > 0 ? messages[i - 1] : null;

  // Detect agent change
  if (prevMsg && msg.agentPersona !== prevMsg.agentPersona) {
    return (
      <>
        {/* Handoff Notification */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 my-4 text-center justify-center"
        >
          <Badge variant="outline" className="gap-2 py-2 px-4">
            <Avatar className="h-6 w-6">{prevAgent.avatar}</Avatar>
            <ArrowRight className="h-4 w-4" />
            <Avatar className="h-6 w-6">{currentAgent.avatar}</Avatar>
            <span className="text-xs text-muted-foreground">
              {prevAgent.name} handed off to {currentAgent.name}
            </span>
          </Badge>
        </motion.div>

        {/* New agent message */}
        <MessageBubble message={msg} />
      </>
    )
  }

  return <MessageBubble message={msg} />
})
```

**Action Items:**
- [ ] Update InboxConversation to detect agent changes between messages
- [ ] Render AgentHandoffNotification when agent changes
- [ ] Add "transferring to {agent}..." animation during handoff
- [ ] Update Thread Header to show current active agent avatar
- [ ] Add handoff history panel (expandable timeline)

---

### 5. **Remote Execution (Python Sidecar)**
> "Heavy processing (NotebookLM/Big Worm) should use RemoteMcpClient."

**Current State:** ⚠️ **PARTIALLY IMPLEMENTED**
- RemoteMcpClient class exists (`src/server/services/remote-mcp-client.ts`)
- Health check UI component exists
- Sidecar endpoint configurable via env var
- NOT YET integrated with agent execution

**Optimization Needed:** 🔧 **MEDIUM PRIORITY**

#### Issue: All agents run locally in Next.js runtime
Long-running research blocks the server.

#### Solution: Route heavy agents to sidecar
```typescript
// In runInboxAgentChat() server action:

// Detect heavy research thread types
const REMOTE_THREAD_TYPES = [
  'deep_research',
  'compliance_research',
  'market_research'
];

const REMOTE_AGENTS = ['big_worm', 'roach'];

if (
  REMOTE_THREAD_TYPES.includes(thread.type) ||
  REMOTE_AGENTS.includes(thread.primaryAgent)
) {
  // Use remote sidecar
  const client = getRemoteMcpClient();

  if (client) {
    logger.info('Routing to remote sidecar', {
      threadId: thread.id,
      agent: thread.primaryAgent
    });

    const result = await client.startJob({
      type: 'agent_execution',
      agent: thread.primaryAgent,
      query: userMessage,
      context: threadContext
    });

    // Poll for completion
    return { jobId: result.data?.jobId };
  } else {
    // Fallback to local execution with warning
    logger.warn('Sidecar unavailable, running locally');
  }
}

// Otherwise run locally
const response = await runAgentLocally(...);
```

**Action Items:**
- [ ] Update `runInboxAgentChat()` to detect heavy research threads
- [ ] Route Big Worm/Roach threads to remote sidecar
- [ ] Add fallback logic if sidecar unavailable
- [ ] Show sidecar status in settings (health check UI)
- [ ] Add sidecar metrics dashboard (queue depth, avg processing time)

---

### 6. **Styling & Motion**
> "Glassmorphism, ShadCN UI, Framer Motion. Premium dark mode with green accents."

**Current State:** ✅ **MOSTLY IMPLEMENTED**
- Glassmorphism: `bg-sidebar/80 backdrop-blur-xl`
- Framer Motion: slide-overs, pulse animations
- ShadCN UI: all components
- Color palette: Primary green (`baked-600`, `baked-500`)

**Optimization Needed:** 🎨 **LOW PRIORITY**

#### Issue: Color palette doesn't exactly match brief
Brief specifies specific dark green palette:
- `baked-darkest`: #0a120a (main background)
- `baked-dark`: #0f1a12 (sidebar)
- `baked-card`: #142117 (cards)
- `baked-border`: #1f3324 (borders)
- `baked-green`: #4ade80 (bright accent)

Current implementation uses Tailwind defaults with custom `baked-*` colors.

#### Solution: Refine color palette
```typescript
// tailwind.config.ts
colors: {
  baked: {
    darkest: '#0a120a',  // Main BG
    dark: '#0f1a12',     // Sidebar BG
    card: '#142117',     // Card BG
    border: '#1f3324',   // Borders
    green: {
      DEFAULT: '#4ade80', // Bright green
      muted: '#2f5e3d',   // Muted green for buttons/badges
      subtle: '#1a3b26'   // Very subtle green backgrounds
    },
    text: {
      primary: '#ffffff',
      secondary: '#9ca3af',
      muted: '#6b7280'
    }
  }
}
```

**Action Items:**
- [ ] Update `tailwind.config.ts` with exact palette from brief
- [ ] Replace generic `bg-green-*` with `bg-baked-green*`
- [ ] Ensure glassmorphism uses `bg-baked-dark/80 backdrop-blur-xl`
- [ ] Add subtle animated orbs in background (like brief mockup)
- [ ] Verify all animations use Framer Motion (no CSS keyframes)

---

## 🎯 Implementation Priority

### 🔴 High Priority (This Week)
1. **Agent Handoff Integration** - Make persona switching visible
2. **HitL Green Check Enhancement** - Make approval unmissable
3. **Task Feed Prominence** - Move to persistent location

### 🟡 Medium Priority (Next Week)
4. **Remote Sidecar Integration** - Route heavy research
5. **Color Palette Refinement** - Match brief exactly

### 🟢 Low Priority (Future Sprint)
6. **Advanced Analytics** - Approval metrics, agent performance
7. **Notification System** - Email/Slack for pending approvals

---

## 📐 Architectural Principles (From Brief)

> "We aren't building a SaaS dashboard; we are building a coordination layer for an AI squad."

### Do's ✅
- Build thread types, not pages
- Show agent activity transparently
- Require human approval for high-risk actions
- Visualize agent-to-agent handoffs
- Use glassmorphism and premium animations

### Don'ts ❌
- Don't create standalone pages for features
- Don't use generic loading spinners
- Don't allow autonomous high-risk actions
- Don't hide which agent is active
- Don't run heavy processing in Next.js runtime

---

## 🧪 Testing Checklist

### Agent Handoffs
- [ ] Create thread where Mrs. Parker hands off to Money Mike
- [ ] Verify handoff notification appears inline
- [ ] Confirm thread header updates to show current agent
- [ ] Check handoff history panel shows all transitions

### Task Feed
- [ ] Start Big Worm research thread
- [ ] Verify Task Feed shows "Conducting deep research..."
- [ ] Confirm thought stream updates in real-time
- [ ] Check progress bar animates smoothly

### HitL Approval
- [ ] Create carousel artifact
- [ ] Verify artifact status: draft → pending_review → approved
- [ ] Confirm Green Check button is prominent and animated
- [ ] Test approval action updates status correctly

### Remote Sidecar
- [ ] Set `PYTHON_SIDECAR_ENDPOINT` env var
- [ ] Create deep_research thread
- [ ] Verify routing to remote sidecar (check logs)
- [ ] Confirm fallback to local execution if unavailable

### Styling
- [ ] Verify all backgrounds use `baked-*` colors
- [ ] Confirm glassmorphism on sidebar/panels
- [ ] Check all animations use Framer Motion
- [ ] Test responsive layout on mobile/tablet

---

## 📝 Quick Wins (Can Implement Today)

### 1. Make Task Feed Persistent (2 hours)
Move TaskFeed to sticky top banner in InboxConversation:
```tsx
<div className="flex-1 flex flex-col">
  {/* Persistent Task Feed */}
  {isAgentProcessing && (
    <div className="sticky top-0 z-10 px-4 pt-4">
      <InboxTaskFeed ... />
    </div>
  )}

  {/* Scrollable Messages */}
  <ScrollArea className="flex-1">
    <Messages />
  </ScrollArea>
</div>
```

### 2. Add Agent Handoff Detection (3 hours)
Update InboxConversation to show handoffs:
```tsx
{messages.map((msg, i) => {
  const prevMsg = messages[i - 1];
  const agentChanged = prevMsg && msg.agentPersona !== prevMsg.agentPersona;

  return (
    <React.Fragment key={msg.id}>
      {agentChanged && (
        <AgentHandoffNotification
          from={prevMsg.agentPersona}
          to={msg.agentPersona}
        />
      )}
      <MessageBubble message={msg} />
    </React.Fragment>
  );
})}
```

### 3. Enhance Approval Button (1 hour)
Add gradient, animation, and emphasis:
```tsx
<motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
  <Button className="w-full h-14 bg-gradient-to-r from-green-600 to-green-400 shadow-xl shadow-green-500/50">
    <CheckCircle2 className="h-6 w-6" />
    <span className="text-lg font-bold">Approve & Publish</span>
  </Button>
</motion.div>
```

---

## 🚀 Conclusion

The BakedBot inbox is **80% aligned** with the Technical Handover Brief. Key remaining work:

1. **Integrate agent handoffs visually** (already implemented in backend)
2. **Make Task Feed persistent and prominent** (move location)
3. **Enhance HitL Green Check button** (add gradient + animation)
4. **Route heavy research to remote sidecar** (conditional routing logic)
5. **Refine color palette** (update Tailwind config)

All changes are **non-breaking enhancements** to existing components. No architectural rewrites needed.

**Estimated Total Work:** 12-16 hours (1.5-2 days)

---

**Next Steps:**
1. Get user approval on this plan
2. Implement high-priority items first
3. Test thoroughly with real agent flows
4. Deploy incrementally to production

