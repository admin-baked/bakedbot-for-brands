## Task Spec: Agent Virtual Machine Phase 1 - Shared Types + vm_run Artifact

**Date:** 2026-03-10
**Requested by:** User
**Spec status:** Approved

---

### 1. Intent (Why)

Make VM-backed agent work visible and durable across Inbox and Agent Chat by introducing one canonical `vm_run` artifact contract and the shared type surface needed to support role-scoped agent packages.

### 2. Scope (What)

**Files affected:**
- `src/types/agent-vm.ts` - new shared VM manifest, runtime, approval, and artifact data types
- `src/types/artifact.ts` - add `vm_run` to shared artifact model and metadata
- `src/types/inbox.ts` - add `vm_run` to inbox artifact union and reuse shared VM artifact data
- `src/components/artifacts/artifact-renderer.tsx` - render live/final VM artifacts in shared artifact panel
- `src/components/inbox/inbox-artifact-panel.tsx` - render VM artifacts in inbox panel
- `src/components/inbox/inbox-conversation.tsx` - surface VM artifacts inline in thread conversation and map job progress into them
- `src/app/dashboard/playbooks/components/agent-chat.tsx` - create/update `vm_run` artifacts for async jobs
- `src/server/actions/inbox.ts` - allow VM artifact creation through canonical inbox artifact action

**Files explicitly NOT touched:**
- `src/server/agents/tools/router.ts` - approval enforcement already exists; Phase 1 reuses it
- `src/server/agents/agent-runner.ts` - no execution-path refactor in this slice
- `src/hooks/use-job-poller.ts` - reuse current polling contract unless a minimal extension is required by integration

**Estimated diff size:** ~450-700 lines

### 3. Boundary Check

| Boundary | Yes/No | Notes |
|---|---|---|
| Touches auth or permissions? | Yes | Inbox artifact creation still relies on existing thread ownership checks; no permission weakening |
| Touches payment or billing? | No | |
| Modifies database schema? | No | Extends artifact type unions only; Firestore documents remain schemaless |
| Changes infra cost profile (new service, higher tier, etc.)? | No | Reuses current jobs/thoughts and runtime backends |
| Modifies LLM prompts or agent behavior? | No | This slice changes visibility and contracts, not prompts |
| Touches compliance logic (Deebo, age-gate, TCPA)? | No | Reuses existing approval/compliance paths |
| Adds new external dependency? | No | |

**Escalation needed?** No
**If yes, RFC location:** `docs/rfcs/RFC-XXX.md`

### 4. Implementation Plan

1. Add a shared `agent-vm` type module for runtime backend ids, approval classes, execution profiles, VM steps, outputs, and artifact payload.
2. Extend shared artifact types to support `vm_run` and add a renderer for progress timeline, approvals, and outputs.
3. Extend inbox artifact types and server action unions so `vm_run` can be stored without parallel schemas.
4. Update Agent Chat async-job flow to create a `vm_run` artifact when a `jobId` is returned, then map job thoughts and final results back into that artifact.
5. Update Inbox conversation flow to create a `vm_run` artifact when async jobs begin, update it from job progress, and render it inline and in the inbox artifact panel.
6. Verify typecheck-sensitive paths and confirm no existing artifact types regress.

### 5. Test Plan

**Unit tests:**
- [ ] `agent-vm-types.unit.test.ts` - validates `vm_run` payload shape and status transitions
- [ ] `artifact-renderer-vm-run.test.tsx` - validates progress, output, and approval rendering

**Integration tests (if applicable):**
- [ ] `agent-chat-vm-run.integration.test.tsx` - validates async job -> vm artifact lifecycle in Agent Chat
- [ ] `inbox-vm-run.integration.test.tsx` - validates async inbox job -> vm artifact lifecycle

**Golden set eval (if LLM/prompt change):**
- [ ] Not applicable - no prompt change in Phase 1

**Manual smoke test (if UI change):**
- [ ] Start an async Agent Chat task and confirm `vm_run` appears immediately, updates during run, and shows final output
- [ ] Start an async Inbox task and confirm the same `vm_run` artifact behavior in-thread and in the artifact panel
- [ ] Confirm existing artifact types still render correctly

### 6. Rollback Plan

| Strategy | Details |
|---|---|
| Single commit revert? | Yes |
| Feature flag? | No - additive UI/type change |
| Data migration rollback needed? | No |
| Downstream services affected? | None - existing jobs and inbox actions remain canonical |

### 7. Success Criteria

- [ ] Async job-backed tasks create a visible `vm_run` artifact immediately in Agent Chat
- [ ] Async job-backed tasks create a visible `vm_run` artifact immediately in Inbox
- [ ] `vm_run` artifacts update as thoughts arrive and show final output on completion
- [ ] Existing non-VM artifacts remain functional in both shared and inbox panels
- [ ] No type regressions are introduced in touched files

---

### Approval

- [x] **Spec reviewed by:** User request on 2026-03-10
- [x] **Approved to implement:** Yes
- [ ] **Modifications required:** none

---

_Proceeding with implementation for Phase 1._
