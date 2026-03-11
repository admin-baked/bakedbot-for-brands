# PRD - Agent Virtual Machine

## Document Control
- **Owner:** Product + AI/Platform Engineering
- **Status:** Draft v1
- **Scope window:** Next 3-4 sprints
- **Related docs:**
  - `agent/product.md`
  - `agent/virtual-machine.md`
  - `docs/agent-vm-ai-spec.md`

---

## 1) Problem Statement
BakedBot already has strong agents, tools, jobs, and artifacts, but the execution model is fragmented. Personas live in one place, skills in another, tool approvals in another, and live work often appears only as chat narration or thought logs instead of a first-class work product.

### Current pain
1. Agents do not share one explicit operating contract for persona, memory, skills, tools, runtimes, and approvals.
2. Inbox and Agent Chat expose execution differently, which makes async work feel inconsistent.
3. VM-style work such as research, browsing, shell tasks, code execution, and approval-gated actions is not represented as one durable artifact from start to finish.
4. Role packages are implicit instead of intentional, so Super Users, Dispensaries, Brands, and Growers do not have clearly bounded default capabilities.

### Product objective
Define one canonical Agent Virtual Machine so every agent runs through the same contract and every meaningful VM run is visible as a live artifact while work is happening and as a finished artifact when complete.

---

## 2) Goals & Non-Goals

## Goals
1. Standardize every agent as `persona + memory + skills + tools + runtime backends + approvals`.
2. Roll out role-scoped agent packages in this order: Super Users, Dispensaries, Brands, Growers.
3. Make VM work visible in a single artifact that streams progress and preserves final output.
4. Use the same VM artifact experience in both Inbox and Agent Chat.
5. Reuse the repo's existing canonical systems instead of creating a parallel agent stack.

## Non-Goals
1. Replacing the current tool router, job system, or artifact panel from scratch.
2. Giving every role the same runtime power or approval policy.
3. Exposing raw chain-of-thought or hidden prompt internals to end users.
4. Shipping every runtime backend on day one.

---

## 3) Personas & Jobs-to-be-Done

### Persona A - Super User Operator
- **JTBD:** Run multi-step work across research, browser actions, shell/code execution, and business orchestration from one thread.
- **Success:** Can see what the agent is doing, what needs approval, and the final output without digging through logs.

### Persona B - Dispensary Team
- **JTBD:** Generate compliant merchandising, campaign, menu, and operations outputs with clear review gates.
- **Success:** Can review drafts, approve risky actions, and trust that compliance-sensitive work is gated.

### Persona C - Brand Team
- **JTBD:** Generate content, launches, insights, and partner-facing outputs with reusable brand memory and explicit publishing flow.
- **Success:** Drafts appear quickly, context is retained, and outbound/publish actions are clearly separated from ideation.

### Persona D - Grower Team
- **JTBD:** Analyze yield and wholesale opportunities, then move into outreach or transfer workflows with the right context and controls.
- **Success:** Analysis artifacts are fast and readable, while outbound or compliance-sensitive actions require explicit review.

---

## 4) Product Principles
1. **One contract:** Agent capability is declared, not implied.
2. **One artifact path:** VM work should not disappear into chat-only narration.
3. **One approval layer:** Risky actions are gated consistently at the tool/runtime boundary.
4. **Role-scoped power:** Capabilities depend on user role and thread type.
5. **Canonical reuse:** Build on personas, skills, tools, job polling, thought streams, and shared artifact UI already in the repo.

---

## 5) User Flows (MVP)

## Flow A - Super User VM Run
1. User asks Linus, Leo, Jack, Glenda, Mike, Big Worm, or Roach to perform a multi-step task.
2. System resolves the agent package and starts a VM run.
3. A VM artifact appears immediately in the thread.
4. The artifact streams plan, steps, backend activity, and approvals while the run is active.
5. The same artifact promotes the final result when complete.

### Acceptance criteria
- Artifact appears before the final answer is ready.
- Active steps update while the job is running.
- Approval blocks are visible in the artifact.
- Final output replaces "working" state without creating a second artifact.

## Flow B - Dispensary Draft-to-Approval
1. User asks for a menu, promo, or campaign task.
2. Agent uses role-scoped skills and tools.
3. Draft outputs stream into the VM artifact.
4. Publish or external-send actions pause for approval.
5. Approved result remains attached to the thread as the durable record.

### Acceptance criteria
- Draft generation can proceed without publish permission.
- Compliance-sensitive outputs require the correct approval path.
- The final artifact shows both what was produced and what approvals occurred.

## Flow C - Brand Production Run
1. Brand user requests content, launch support, or research.
2. Agent loads brand memory and brand-approved skills.
3. Artifact shows progress and partial outputs.
4. Publish/send actions require approval while ideation stays fast.

### Acceptance criteria
- Brand memory is scoped to the org and thread.
- Partial content is visible during generation.
- The final artifact shows outputs and publishing status.

## Flow D - Grower Analysis and Outreach
1. Grower user requests yield analysis, wholesale inventory help, or brand outreach.
2. Agent package is chosen based on grower thread type.
3. Analysis results stream live.
4. Outbound outreach or compliance-sensitive exports require approval.

### Acceptance criteria
- Analysis-only work can complete without unnecessary approval.
- Outbound work is blocked until explicitly approved.
- Artifact history remains visible after completion.

---

## 6) Requirements

## Functional
1. Every supported agent must resolve to a declared package with persona, memory policy, skill set, tool set, runtime backends, and approval policy.
2. VM runs must create a first-class artifact at run start and update that artifact through completion or failure.
3. Inbox and Agent Chat must use the same VM artifact contract and renderer behavior.
4. Runtime activity must map into user-readable steps instead of raw internal logs.
5. Approval requests must appear inside the artifact and be tied to the blocked step.

## Data/Contract
1. VM artifact must carry agent id, role scope, runtime backend, status, steps, outputs, approvals, timestamps, and job linkage.
2. Thread-level and org-level memory must remain scoped by role and tenant.
3. Existing job/thought infrastructure should remain the primary progress source.
4. No separate progress transport should be introduced for the same run.

## Reliability
1. Partial outputs must survive long-running or multi-stage jobs.
2. Failed runs must keep their artifact and surface a useful error summary.
3. Retry behavior should reuse the artifact context or create a linked rerun, not silently discard history.

---

## 7) Success Metrics

## North-star
- **Visible Work Completion Rate:** percentage of VM-backed runs where users can see active progress and a final artifact in the same thread.

## Supporting
1. Reduction in "what is the agent doing?" support/debug questions from Super Users.
2. Approval completion rate for blocked publish/send/shell actions.
3. Artifact open rate during long-running jobs.
4. Time from run start to first visible artifact update.
5. Completion rate for Super User VM tasks in Inbox and Agent Chat.

---

## 8) Rollout Plan

### Phase 1
- Super User role packages
- VM artifact contract
- Shared renderer in Inbox and Agent Chat
- Shell/browser/research/code-runner visibility

### Phase 2
- Dispensary role packages
- Publish/compliance approval UX
- Menu/promo/campaign workflows on VM artifact contract

### Phase 3
- Brand role packages
- Brand memory and publishing workflows
- Partner-facing approval flows

### Phase 4
- Grower role packages
- Yield, wholesale, and outreach workflows
- Grower-specific analysis/export approvals

---

## 9) Risks & Mitigations
1. **Risk:** Parallel contracts emerge between Inbox and Agent Chat.
   - **Mitigation:** One shared VM artifact schema and one shared renderer path.
2. **Risk:** Agents gain runtime power without enough approval controls.
   - **Mitigation:** Keep approvals at the tool/runtime boundary and declare role-specific defaults.
3. **Risk:** Live progress becomes noisy and unreadable.
   - **Mitigation:** Store detailed event data but render a compressed, user-readable step timeline.
4. **Risk:** New VM work bypasses existing job/thought infrastructure.
   - **Mitigation:** Reuse current job ids and `jobs/{jobId}/thoughts` as the default streaming source.
5. **Risk:** Memory leaks across orgs or roles.
   - **Mitigation:** Make memory policies explicit and tenant-scoped in the agent package.

---

## 10) Open Questions
1. Should reruns update the original VM artifact or create a linked child artifact?
2. Which approval actions can Super Users self-approve by default versus still requiring a second confirmation?
3. Do we want one `vm_run` artifact type for all runtimes, or subtypes for research/build/browser later while keeping one top-level contract?
4. How much backend detail should be visible to non-technical roles without making the artifact noisy?
