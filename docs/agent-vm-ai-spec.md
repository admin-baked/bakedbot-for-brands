# AI Spec - Agent Virtual Machine

## Document Control
- **Owner:** AI/Platform Engineering
- **Status:** Draft v1
- **Depends on:** `docs/agent-vm-prd.md`, `agent/virtual-machine.md`, `agent/product.md`

---

## 1) Purpose
Define the canonical AI contract for BakedBot's Agent Virtual Machine so every supported agent is assembled from the same layers and every VM-backed run is explainable, tenant-safe, approval-aware, and visible in both Inbox and Agent Chat.

---

## 2) Scope

## In Scope
1. Agent package contract: persona, memory, skills, tools, runtime backends, approvals.
2. Role-scoped defaults for Super Users, Dispensaries, Brands, and Growers.
3. Shared VM artifact contract for live progress plus final output.
4. Inbox and Agent Chat behavior for VM-backed runs.
5. Observability, failure handling, and rollout sequencing for VM work.

## Out of Scope
1. Replacing existing agent personas or tool router architecture wholesale.
2. Rebuilding deterministic business logic as model-only behavior.
3. Exposing private prompts or raw chain-of-thought to end users.
4. Broad in-process Python or Node VM execution before approval of the backend model.

---

## 3) Canonical Homes
Implementation must extend existing surfaces first.

1. **Persona source:** `src/app/dashboard/ceo/agents/personas.ts`
2. **Skill loading:** `src/skills/loader.ts`
3. **Agent execution:** `src/server/agents/agent-runner.ts`
4. **Tool registry + approvals:** `src/server/agents/tools/registry.ts`, `src/server/agents/tools/router.ts`
5. **Inbox threads/artifacts:** `src/types/inbox.ts`, `src/server/actions/inbox.ts`
6. **Shared artifact UI:** `src/types/artifact.ts`, `src/components/artifacts/artifact-panel.tsx`, `src/components/artifacts/artifact-renderer.tsx`
7. **Live progress source:** `src/hooks/use-job-poller.ts`, `src/server/jobs/thought-stream.ts`
8. **Existing runtime backends:** `src/skills/core/terminal/index.ts`, `src/skills/core/analysis/index.ts`, `src/app/api/training/execute/route.ts`, `cloud-run/code-runner/src/*`, `src/server/services/python-sidecar.ts`

---

## 4) Canonical Agent Model
Every VM-capable agent must resolve through this contract:

`agent = persona + memory + skills + tools + runtime backends + approvals + artifact contract`

### Required fields
- `agentId`
- `roleScopes`
- `personaId` or `personaPrompt`
- `memoryPolicyId`
- `defaultSkills`
- `defaultToolGroups`
- `runtimeBackends`
- `approvalPolicyId`
- `artifactPolicyId`

### Behavioral requirements
1. Persona defines role, voice, boundaries, and default output style.
2. Memory policy defines what can be loaded from thread, org, agent, and transient execution state.
3. Skills define reusable capabilities, not direct execution environments.
4. Tools remain the concrete action surface.
5. Runtime backends are explicit and selected through tools, not ad hoc UI logic.
6. Approval policy governs side effects at the tool/runtime boundary.

---

## 5) Role Packages

## 5.1 Super Users
Primary rollout group and highest-capability package.

### Default agents
- Leo
- Jack
- Linus
- Glenda
- Mike
- Big Worm
- Roach

### Default package
- **Memory:** thread + org + reusable agent memory + transient execution memory
- **Skills:** analysis, research, orchestration, planning, code-aware workflows
- **Tool groups:** browser, terminal, structured analysis, admin/research tooling
- **Runtime backends:** `browser`, `terminal`, `analysis_js`, `cloud_run_code_runner`, `python_sidecar_notebooklm`
- **Approvals:** read-only auto-approved; shell, browser submit, external send, and publish require explicit approval unless policy allows self-approval

## 5.2 Dispensaries

### Default agents
- Smokey
- Pops
- Money Mike
- Craig
- Deebo
- Mrs. Parker
- Day Day
- Ezal

### Default package
- **Memory:** thread + org + selective agent memory
- **Skills:** menu, promos, analytics, customer, content, compliance-aware operations
- **Tool groups:** browser, analysis, internal merchandising/content tools
- **Runtime backends:** `browser`, `analysis_js`, selective domain runtimes only
- **Approvals:** recommendations auto-approved; publish, external send, and compliance-sensitive actions require approval

## 5.3 Brands

### Default agents
- Craig
- Glenda
- Ezal
- Pops
- Deebo
- Mrs. Parker

### Default package
- **Memory:** thread + org brand memory + selective agent memory
- **Skills:** content, research, launch planning, brand voice, reporting
- **Tool groups:** browser, analysis, media/content generation, outreach support
- **Runtime backends:** `browser`, `analysis_js`, content/media generation backends, selected integration runtimes
- **Approvals:** drafts auto-approved; sends, launches, partner-facing actions, and publish steps require approval

## 5.4 Growers

### Default threads
- `yield_analysis`
- `wholesale_inventory`
- `brand_outreach`

### Default package
- **Primary agents:** Pops, Money Mike, Craig, Deebo by workflow
- **Memory:** thread + org grower memory + operational history
- **Skills:** yield analysis, wholesale economics, outreach drafting, compliance checks
- **Tool groups:** analysis, browser, future COA/lab-data integrations
- **Runtime backends:** `analysis_js`, `browser`, grower-specific data backends when available
- **Approvals:** analysis artifacts auto-approved; outreach and compliance exports require approval

---

## 6) Memory Rules

### Memory layers
1. **Thread memory:** current thread messages, thread metadata, attached artifacts.
2. **Org memory:** brand, dispensary, grower, or super-user organization context.
3. **Agent memory:** reusable preferences and prior learnings scoped to org plus agent.
4. **Execution memory:** transient state for the current run only.

### Rules
1. Thread memory loads first.
2. Org and agent memory must always be tenant-scoped.
3. Execution memory expires with the run and is summarized into the final artifact or audit record.
4. Missing auth or org context is a hard failure, not a fallback to global memory.

---

## 7) Runtime Backend Registry

### Current backends to support
- `browser`
- `terminal`
- `analysis_js`
- `cloud_run_code_runner`
- `python_sidecar_notebooklm`

### Backend rules
1. Tools choose or request a backend; agents should not directly call backend services from UI state.
2. Backend usage must emit a user-readable step and a structured audit/log event.
3. Expensive or long-running backends should attach a `jobId` and stream progress through the canonical job/thought path.
4. New backends must be added to the registry and approval policy before agent use.

---

## 8) Approval Model

### Approval classes
- `read_only`
- `internal_write`
- `external_write`
- `publish`
- `shell`
- `browser_submit`
- `compliance_sensitive`

### Rules
1. Read-only actions can auto-approve when allowed by role policy.
2. Shell access is never implied by persona alone.
3. Browser form submission is distinct from browser read actions and must be separately approvable.
4. Publish and external-send steps must remain blocked until approval resolves.
5. Compliance-sensitive outputs must support Deebo review or an equivalent gate where required.

---

## 9) VM Artifact Contract
All VM-backed work must use one shared artifact type.

### Artifact type
- `vm_run`

### Required fields
- `runId`
- `jobId` when async
- `threadId`
- `agentId`
- `roleScope`
- `runtimeBackend`
- `status`
- `title`
- `plan`
- `steps`
- `outputs`
- `approvals`
- `summary`
- `createdAt`
- `updatedAt`
- `completedAt` when finished

### Statuses
- `queued`
- `running`
- `awaiting_approval`
- `completed`
- `failed`
- `cancelled`

### Behavioral requirements
1. Artifact must be created immediately when the VM run starts.
2. In-progress steps must update in place while the run is active.
3. Partial outputs may appear before completion.
4. Final output must be promoted inside the same artifact, not a different one.
5. Failed runs must retain their step history and error summary.

---

## 10) Inbox and Agent Chat UX Contract

## Inbox
1. Add `vm_run` to `InboxArtifactType`.
2. Persist VM artifacts with the same thread linkage as other artifact types.
3. Reuse the existing artifact panel instead of a separate execution UI.
4. If a run is active, the artifact should open automatically unless the user explicitly closed it.

## Agent Chat
1. When a response starts an async job, create a local VM artifact immediately.
2. Map `jobs/{jobId}/thoughts` into artifact steps, not just chat thinking rows.
3. Promote final outputs into the same artifact when the job resolves.
4. Keep the chat message as narration; treat the artifact as the work product.

### Shared rendering rules
1. Show runtime/backend chip, status chip, and current step.
2. Collapse noisy event detail behind a cleaner step timeline.
3. Display approval cards inline with the blocked step.
4. Support final output views for markdown, code, JSON, images, links, and files.

---

## 11) Decisioning Rules
1. Choose the smallest role-scoped package that can complete the request.
2. Prefer existing tools and skills before introducing a new backend-specific path.
3. If the request requires a side effect without approval, pause at `awaiting_approval`.
4. If data quality is low or context is incomplete, emit a caveat in the artifact summary and choose the safer path.
5. Never allow artifact creation to imply publish/send completion; approvals remain explicit.

---

## 12) Failure Modes
1. **Missing manifest mapping:** fail fast with a visible configuration error; do not silently route to a generic package.
2. **Job stream unavailable:** keep the artifact, mark degraded progress mode, and surface polling status from the last known event.
3. **Backend failure:** preserve completed steps, mark the failed step, and attach error summary plus retry affordance.
4. **Approval timeout:** keep the artifact in `awaiting_approval` with clear blocked-action messaging.
5. **Artifact persistence failure:** log with `orgId`, `threadId`, `jobId`, `agentId`; do not pretend the run is fully visible.
6. **Cross-tenant memory leakage risk:** hard fail and audit; no fallback.

---

## 13) Observability
Structured logs and audit events must include:
- `orgId`
- `userId` when available
- `threadId`
- `artifactId`
- `jobId`
- `runId`
- `agentId`
- `roleScope`
- `runtimeBackend`
- `approvalType`
- `status`
- `failureReason`

### Recommended metrics
1. `agent_vm.run_started`
2. `agent_vm.run_completed`
3. `agent_vm.run_failed`
4. `agent_vm.awaiting_approval_count`
5. `agent_vm.time_to_first_artifact_update_ms`
6. `agent_vm.time_to_completion_ms`
7. `agent_vm.artifact_render_open_rate`
8. `agent_vm.backend_failure_rate`

---

## 14) Evaluation Plan

## Offline checks
1. Schema validation for manifest definitions and `vm_run` artifacts.
2. Role-policy tests proving runtime backends and approvals are correctly bounded.
3. Golden-set checks for agent outputs that now depend on role/package changes.

## Online checks
1. Compare long-running task completion and approval completion before and after VM artifact rollout.
2. Monitor artifact open rate and retry rate for Super User tasks.
3. Review failure logs for missing step updates, orphaned job ids, or stuck approval states.

---

## 15) Rollout Strategy
1. Ship the shared VM manifest and artifact schema first.
2. Roll out Super User agents and VM-backed renderer changes in Inbox and Agent Chat.
3. Add dispensary approval-heavy workflows next.
4. Add brand content/publish workflows after shared approval UX stabilizes.
5. Add grower workflows once analysis and outreach packages are proven.
