# Production Spec: Inbox + Artifact Pipeline

**Last updated:** 2026-02-19
**Spec status:** 🔴 Gaps Identified
**Owner agent(s):** All field agents (Smokey, Craig, Money Mike, Pops, Ezal, Deebo, Day Day, Mrs. Parker, Big Worm, Roach) + Executives (Leo, Jack, Linus, Glenda, Mike)
**Tier:** 2 — Core Product

---

## 1. Feature Overview

The Unified Inbox is the conversational workspace where users collaborate with BakedBot agents to create carousels, bundles, creative content, campaigns, and business artifacts. Each conversation (thread) is typed by intent (carousel, bundle, creative, campaign, etc.) and routed to a primary agent with supporting agents. Threads produce Artifacts (typed outputs like carousels, bundles, creative_content) that can be approved, published, or saved to Drive. The Inbox supports agent handoffs, CRM context (customer threads), and role-based quick actions for brands, dispensaries, and super users.

---

## 2. Current State

### Shipped ✅
- Thread CRUD via `src/server/actions/inbox.ts` (createInboxThread, updateInboxThread, getInboxThreads, addMessageToThread)
- 77 thread types covering business ops, customer support, growth management, company ops, and research
- Agent handoff system (`src/server/actions/inbox-handoff.ts`) with history tracking
- Quick actions system (823 lines in `src/types/inbox.ts`) with role-based filtering
- Artifact types (34 types from carousel to research_brief)
- Thread-agent mapping (THREAD_AGENT_MAPPING) for primary + supporting agents
- Firestore persistence: `inbox_threads` and `inbox_artifacts` collections
- UI components: `unified-inbox.tsx`, `inbox-conversation.tsx`, `inbox-artifact-panel.tsx`, `inbox-sidebar.tsx`
- Drive integration: `InboxArtifact.driveFileId` field + "Open in Drive" button
- CRM context fields: customerId, customerEmail, customerSegment on threads
- Auto-submit on new-thread screen (from MEMORY.md 2026-02-19)

### Partially Working ⚠️
- Artifact approval workflow exists but no enforcement layer preventing unapproved artifacts from going live
- Drive integration implemented but no automated Drive file creation for all artifact types (only some)
- Quick actions database migration (`NEXT_PUBLIC_USE_DB_QUICK_ACTIONS` feature flag) — tenant overrides not tested
- Agent auto-routing (primaryAgent: 'auto') — logic exists but routing algorithm not validated
- Thread search (`InboxFilter.searchQuery`) — frontend UI unclear if implemented
- Artifact deduplication for threads — no check preventing duplicate carousels/bundles per thread

### Not Implemented ❌
- Artifact version control (no drafts vs published versions tracked)
- Thread archiving automation (threads manually archived, no auto-archive after X days)
- Agent handoff approval (handoffs always succeed — no validation that toAgent is qualified for thread type)
- Artifact compliance gate integration (Deebo check exists for campaigns, not enforced for all artifact types)
- Inbox notifications (no alerts when agent hands off or artifact needs approval)
- Thread analytics (no tracking of resolution time, agent performance, artifact acceptance rate)
- Bulk operations (no multi-select for archiving/deleting threads)

---

## 3. Acceptance Criteria

### Functional
- [ ] User can create a thread with any of 77 thread types and see it routed to the correct primary agent
- [ ] Agent can hand off a thread to another agent with a reason — handoff recorded in `handoffHistory` array
- [ ] Thread messages persist to Firestore and survive page refresh
- [ ] Artifacts created in a thread appear in the artifact panel with correct type discrimination
- [ ] Artifacts can be approved, rejected, or saved to Drive (driveFileId populated)
- [ ] Quick actions filter correctly by role (brand/dispensary/super_user/customer)
- [ ] CRM threads (type: crm_customer) display customer context (ID, email, segment)
- [ ] Thread search filters threads by title, preview, or message content
- [ ] Thread status transitions (active → draft → completed → archived) update correctly
- [ ] Auto-submit on new-thread screen fires initial message when conversation opens

### Compliance / Security
- [ ] `requireUser()` + orgId check on all inbox server actions (no IDOR vulnerabilities)
- [ ] Artifacts with compliance-critical types (creative_content, outreach_draft, campaign) MUST pass Deebo gate before publishedAt is set
- [ ] Handoff to restricted agents (Glenda, executive team) blocked unless user has super_user role
- [ ] Drive file access enforced via `drive_files` Firestore collection (no orphaned artifacts)
- [ ] Thread messages never include secrets (API keys, tokens, passwords)

### Performance
- [ ] getInboxThreads() returns results in < 500ms for users with 100+ threads
- [ ] createInboxThread() completes in < 1s including Firestore write
- [ ] Agent handoff writes complete in < 500ms
- [ ] Artifact panel loads all artifacts for a thread (up to 50) in < 1s

---

## 4. Known Gaps / Tech Debt

| Gap | Severity | Notes |
|-----|----------|-------|
| No artifact approval enforcement layer | 🔴 Critical | Artifacts can be published without approval — relies on UI-only blocking |
| Deebo compliance gate not enforced for all artifact types | 🔴 Critical | Only campaigns check Deebo — creative_content, outreach_draft skip gate |
| Auto-routing algorithm ('auto' agent) not validated | 🟡 High | Unclear how it decides which agent to route to — may route incorrectly |
| Drive file creation not automated for all artifacts | 🟡 High | Only some artifact types auto-create Drive file — others missing driveFileId |
| No thread archiving automation | 🟡 High | Completed threads remain in active list indefinitely — UI clutter |
| Agent handoff validation missing | 🟡 High | Any agent can hand off to any other agent — no role/skill check |
| Quick actions database migration untested | 🟡 High | Feature flag exists but tenant overrides never tested in production |
| No artifact version control | 🟢 Low | Can't roll back to previous artifact version if user rejects new one |
| No inbox notifications | 🟢 Low | Users unaware of handoffs or artifacts needing approval unless they check manually |
| No thread analytics | 🟢 Low | Can't measure agent performance, resolution time, or artifact acceptance rate |

---

## 5. Test Coverage

### Existing Tests
| Test | Location | Coverage |
|------|----------|---------|
| Inbox conversation thinking | `src/components/inbox/__tests__/inbox-conversation-thinking.test.tsx` | Validates loading state UI |

### Missing Tests (Required for Production-Ready)
- [ ] `inbox-thread-crud.integration.test.ts` — validates createInboxThread, updateInboxThread, getInboxThreads server actions
- [ ] `inbox-agent-handoff.integration.test.ts` — validates handoffToAgent() writes to handoffHistory + updates primaryAgent
- [ ] `inbox-artifact-approval.unit.test.ts` — validates artifacts cannot transition to 'published' without approval
- [ ] `inbox-compliance-gate.integration.test.ts` — validates Deebo gate blocks creative_content/outreach_draft if non-compliant
- [ ] `inbox-quick-actions-role-filter.unit.test.ts` — validates getQuickActionsForRole() returns correct actions for each role
- [ ] `inbox-drive-integration.unit.test.ts` — validates driveFileId is set when artifact is saved to Drive
- [ ] `inbox-crm-context.unit.test.ts` — validates customerId/email/segment fields persist correctly

### Golden Set Eval
Not applicable — Inbox is a UI framework, not an agent. Agent behavior covered by individual agent golden sets (Smokey, Craig, etc.).

---

## 6. Dependencies

### Internal
| System | Why needed | Failure mode |
|--------|-----------|-------------|
| Agent harness | Executes agent requests in threads | Thread cannot process messages — stuck in "thinking" state |
| Drive system | Stores artifacts as files | Artifacts saved but not visible in Drive UI |
| Deebo (compliance agent) | Gates artifact publishing | Artifacts published without compliance check — legal risk |
| Firestore | Persists threads + artifacts | Inbox data lost on page refresh |

### External Services
None — Inbox is a pure internal system.

---

## 7. Degraded Mode

- **If Firestore is down:** Queue thread/artifact writes in-memory, sync when restored. Show "Offline mode" banner.
- **If agent harness times out:** Show "Agent is thinking..." state, allow user to retry or cancel after 60s.
- **If Drive save fails:** Artifact saved to Firestore but driveFileId remains null — user can manually retry Drive save.
- **Data loss risk:** If Firestore write fails mid-conversation, messages lost. Mitigation: client-side localStorage cache of unsent messages.

---

## 8. Open Questions

1. **Artifact approval workflow**: Should all artifacts require approval, or only customer-facing ones (creative_content, outreach_draft, campaign)?
2. **Agent handoff validation**: Should handoffs to executive agents (Glenda, Mike, Jack) require confirmation or be auto-allowed for super_users?
3. **Thread archiving policy**: Auto-archive threads after X days of inactivity? If yes, what's the threshold?
4. **Artifact deduplication**: Should the system prevent creating duplicate carousels/bundles in the same thread, or allow it?
5. **Quick actions tenant overrides**: Should brands be able to customize quick action labels/prompts per-org, or is global config sufficient?

---

## Revision History

| Date | Author | Change |
|------|--------|--------|
| 2026-02-19 | Claude Code (audit) | Initial draft — based on codebase audit |
