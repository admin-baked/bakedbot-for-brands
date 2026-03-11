# Agent Virtual Machine

## Summary
Define one canonical agent operating model for BakedBot:

`agent = persona + memory + skills + tools + runtime backends + approvals + artifact contract`

This should apply across:

1. Super Users
2. Dispensaries
3. Brands
4. Growers

The goal is not "more agents." The goal is one consistent execution system that works in both Inbox and Agent Chat and can show live work while the agent is running and the finished product when it completes.

## Current Repo Anchors

The repo already has most of the raw pieces:

- Product context now lives in `agent/product.md`.
- Persona configuration exists in `src/app/dashboard/ceo/agents/personas.ts`.
- Skills already exist as modular packs in `src/skills/*` and load through `src/skills/loader.ts`.
- Tool execution already has a canonical router, permission checks, approval gating, and audit logging in `src/server/agents/tools/router.ts`.
- Inbox already models role-based thread types and artifact types in `src/types/inbox.ts`.
- Job progress already streams through `jobs/{jobId}` and `jobs/{jobId}/thoughts`, consumed by `src/hooks/use-job-poller.ts`.
- Agent Chat and Puff Chat already render thinking steps and use the shared `ArtifactPanel`.

What is missing is one explicit contract that ties these together and treats VM work as a first-class artifact instead of only a side effect of chat messages.

## Canonical Model

Every agent should be defined by seven layers.

### 1. Persona

Persona controls:

- identity
- tone
- role scope
- allowed domains
- escalation rules
- default artifact style

Canonical home:

- `src/app/dashboard/ceo/agents/personas.ts` for prompt/persona text
- new shared manifest layer for execution policy

Recommended addition:

- `src/types/agent-vm.ts`
- `src/server/agents/agent-manifests.ts`

Example shape:

```ts
type AgentExecutionProfile = {
  agentId: string;
  roleScopes: Array<'super_user' | 'dispensary' | 'brand' | 'grower'>;
  personaPrompt: string;
  defaultSkills: string[];
  defaultToolGroups: string[];
  runtimeBackends: RuntimeBackendId[];
  approvalPolicyId: string;
  memoryPolicyId: string;
  vmArtifactPolicyId: string;
};
```

### 2. Memory

Memory should be explicit and layered.

Memory layers:

- thread memory: conversation-local context
- org memory: brand/dispensary/grower/super-user account context
- agent memory: per-agent learned patterns and preferences
- execution memory: transient run state for the current VM session

Canonical sources already present:

- Letta / Hive Mind references
- Firestore persistence patterns
- inbox thread history

Recommended rule:

- Thread memory is always the first retrieval layer.
- Org memory is always role-scoped.
- Agent memory is reusable across threads for that org.
- Execution memory expires after the run and is persisted into the artifact summary, not hidden in logs only.

### 3. Skills

Skills should remain the modular capability layer.

Current fit:

- `src/skills/core/*`
- `src/skills/domain/*`
- injection through `agent-runner`

Recommended rule:

- Personas declare default skills.
- Roles can add or remove skill packs.
- Runtime backends are not skills. Skills request runtimes.

That keeps:

- `core/analysis` = reasoning capability
- `terminal.execute` = tool
- `browser` = capability layer
- `python sidecar` or `node runner` = runtime backend

### 4. Tools

Tools remain the concrete action surface.

Canonical home:

- `src/server/agents/tools/registry.ts`
- `src/server/agents/tools/router.ts`

Recommended rule:

- Agents never call runtimes directly from UI.
- Agents ask for tools.
- Tools resolve to a runtime backend if needed.
- Approvals happen at the tool layer, not ad hoc in each agent.

### 5. Runtime Backends

This is the missing explicit VM layer.

Backends should be modeled as named execution environments:

```ts
type RuntimeBackendId =
  | 'browser'
  | 'terminal'
  | 'analysis_js'
  | 'cloud_run_code_runner'
  | 'python_sidecar_notebooklm'
  | 'node_vm'
  | 'python_vm';
```

Current real backends in repo:

- `browser`
- `terminal`
- `analysis_js`
- `cloud_run_code_runner`
- `python_sidecar_notebooklm`

Recommended policy:

- `analysis_js` for safe calculation and transformation
- `terminal` for super-user and admin-only shell tasks
- `cloud_run_code_runner` for isolated TS/JS code execution
- `python_sidecar_notebooklm` for Big Worm research workflows
- future `node_vm` and `python_vm` for broader agent execution

### 6. Approvals

Approvals should be role-aware and backend-aware.

Current fit:

- side-effect gating already exists in `src/server/agents/tools/router.ts`

Recommended approval dimensions:

- read-only
- internal write
- external write
- publish
- money/risk/compliance sensitive

Example policy:

```ts
type ApprovalPolicy = {
  id: string;
  autoApproveReadOnly: boolean;
  requireApprovalForExternalSend: boolean;
  requireApprovalForPublish: boolean;
  requireApprovalForShell: boolean;
  requireApprovalForBrowserSubmit: boolean;
  requireDeeboForComplianceTaggedContent: boolean;
};
```

### 7. Artifact Contract

This is where VM work becomes visible.

Every meaningful run should produce:

- a live artifact while work is being created
- a final artifact when the result is complete

The artifact is the user-facing execution record, not just the chat bubble.

## Role Rollout

Roll out by role in this order.

### 1. Super Users

Why first:

- already have the broadest agent set
- already use async jobs, orchestration, and richer tooling
- highest need for visible execution traces

Primary agents:

- Leo
- Jack
- Linus
- Glenda
- Mike
- Big Worm
- Roach

Default runtime profile:

- browser
- analysis_js
- terminal
- cloud_run_code_runner
- python_sidecar_notebooklm

Default approval profile:

- read-only auto-approved
- shell requires explicit approval
- external sends require approval unless the thread owner is a super user and the tool policy allows self-approval

### 2. Dispensaries

Primary agents:

- Smokey
- Pops
- Money Mike
- Craig
- Deebo
- Mrs. Parker
- Day Day
- Ezal

Default runtime profile:

- browser
- analysis_js
- selective domain runtimes only

Default approval profile:

- recommendations auto-approved
- menu/promo/publish actions require artifact approval
- compliance-sensitive content requires Deebo review

### 3. Brands

Primary agents:

- Craig
- Glenda
- Ezal
- Pops
- Deebo
- Mrs. Parker

Default runtime profile:

- browser
- analysis_js
- media generation backends
- domain integrations

Default approval profile:

- content drafts auto-approved
- sends, launches, and publish actions require approval
- partner-facing artifacts require review state before send

### 4. Growers

Good news: the role already exists in Inbox thread definitions.

Primary threads already modeled:

- `yield_analysis`
- `wholesale_inventory`
- `brand_outreach`

Recommended primary agents:

- Pops for yield and operational analysis
- Money Mike for wholesale economics
- Craig for partner outreach
- Deebo for transfer/compliance checks

Default runtime profile:

- analysis_js
- browser
- future lab-data / COA runtimes

Default approval profile:

- analysis artifacts auto-approved
- outbound partner outreach requires approval
- compliance exports require Deebo review

## VM UX Proposal

## Principle

If an agent is using a VM/runtime backend, the UI should show the work inside the artifact itself, not only in ephemeral thought bubbles.

That means:

1. create artifact at run start
2. stream progress into artifact while running
3. render final output in the same artifact when done

This should work in:

- Inbox
- Agent Chat

## New Artifact Type

Add a first-class VM artifact.

Inbox type:

- `vm_run`

Shared artifact type:

- `vm_run`

Suggested data model:

```ts
type VmRunArtifactData = {
  runId: string;
  threadId?: string;
  jobId?: string;
  agentId: string;
  roleScope: 'super_user' | 'dispensary' | 'brand' | 'grower';
  runtimeBackend: RuntimeBackendId;
  status: 'queued' | 'running' | 'awaiting_approval' | 'completed' | 'failed' | 'cancelled';
  title: string;
  summary?: string;
  plan?: string[];
  steps: Array<{
    id: string;
    title: string;
    detail?: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    startedAt?: string;
    completedAt?: string;
  }>;
  outputs: Array<{
    kind: 'markdown' | 'code' | 'image' | 'video' | 'json' | 'link' | 'file';
    title: string;
    content?: string;
    url?: string;
    language?: string;
  }>;
  approvals?: Array<{
    type: 'tool' | 'publish' | 'external_send' | 'shell' | 'browser_submit';
    status: 'pending' | 'approved' | 'rejected';
    requestedAt: string;
    resolvedAt?: string;
  }>;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
};
```

## UX Behavior

### While Running

When a run starts:

- create a `vm_run` artifact immediately
- attach it to the thread
- open the artifact panel automatically
- render:
  - runtime badge
  - status badge
  - live step timeline
  - partial outputs as they arrive
  - approval gates if blocked

### When Complete

When a run finishes:

- preserve the same artifact id
- switch status to `completed`
- collapse noisy progress logs
- promote the final output to the top
- keep an execution timeline below the final result

### If Failed

If a run fails:

- keep the artifact
- mark failed step
- show error summary
- allow retry from the artifact

## Inbox Integration

Inbox already has the stronger domain model for thread types and artifacts.

Recommended changes:

1. Add `vm_run` to `InboxArtifactType`.
2. Add `VmRunArtifactData` to `InboxArtifact.data`.
3. Create `createVmRunArtifact`, `appendVmRunStep`, `completeVmRunArtifact`, and `failVmRunArtifact` server actions.
4. Link `jobId` to the artifact at run creation time.
5. Update thread previews to reflect active VM status when a live run exists.

Important:

- use the existing `jobs/{jobId}/thoughts` stream as the first event source
- do not create a second live-progress transport

## Agent Chat Integration

Agent Chat already uses:

- `useJobPoller`
- `ArtifactPanel`
- parsed artifacts

Recommended changes:

1. When `response.metadata.jobId` exists, create a temporary `vm_run` artifact in chat state immediately.
2. Map `thoughts` into artifact steps, not only message thinking steps.
3. When the job completes, populate the artifact outputs from `job.result`.
4. Auto-open the panel on first VM event if the user has not manually closed it.

This makes Agent Chat and Inbox share the same mental model:

- chat bubble = narration
- artifact = work product and execution trace

## Renderer Changes

The shared artifact system needs one new renderer path.

Recommended updates:

- add `vm_run` to `src/types/artifact.ts`
- add `VmRunRenderer` to `src/components/artifacts/artifact-renderer.tsx`
- support:
  - live step list
  - status chips
  - runtime/backend chip
  - output tabs
  - approval card
  - retry button hook

## Canonical Execution Flow

```text
User request
-> thread routing
-> agent manifest resolved
-> memory loaded
-> skills loaded
-> tool selected
-> tool resolves runtime backend
-> vm_run artifact created
-> job starts
-> thoughts stream into artifact steps
-> approvals appear in artifact if needed
-> outputs accumulate in artifact
-> final output promoted when complete
```

## Recommended Implementation Phases

### Phase 1: Canonical manifests

- add `agent-vm` shared types
- create agent execution manifests by role
- make runtime backends explicit

### Phase 2: VM artifact model

- add `vm_run` artifact types
- add Firestore persistence and chat-state mapping
- add renderer support

### Phase 3: Super User rollout

- wire Linus, Leo, Jack, Glenda, Mike, Big Worm first
- stream shell/browser/research/code-runner work into artifacts

### Phase 4: Dispensary and Brand rollout

- wire publish/send/compliance approvals into artifact state
- use the same artifact contract for menu, campaign, and research tasks

### Phase 5: Grower rollout

- extend grower threads into full VM-aware artifacts
- add COA / wholesale / outreach execution policies

## Guardrails

- Do not let each agent invent its own approval model.
- Do not let chat and inbox diverge on artifact schema.
- Do not model runtime backends as prompts only.
- Do not hide execution state in thoughts when it should be visible in the artifact.
- Do not create separate artifact systems for research vs build vs browser tasks.

## Immediate Next Step

Implement the VM artifact contract first for Super User agents.

That gives one vertical slice:

- one manifest model
- one runtime backend registry
- one approval policy layer
- one artifact streaming pattern

After that, apply the same contract to Dispensaries, Brands, and Growers without creating parallel systems.
