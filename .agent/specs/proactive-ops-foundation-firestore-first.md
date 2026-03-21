# AI-Executable Spec: Proactive Ops Foundation (Firestore-First)
**PRD:** `dev/prds/2026-03-20-proactive-ops-foundation.md`
**Status:** Approved 2026-03-20
**Scope:** Sequential PRs, each targeting a narrow diff and existing canonical surfaces

---

## 1. Intent (Why)

Bring BakedBot's current proactive pieces fully online for pilot expansion by adding durable proactive task state, write-back, commitments, and outcomes on top of the existing Firestore + workflow + inbox + approval stack.

---

## 2. Canonical Reuse (Must Reuse, Not Replace)

The implementation MUST extend these existing modules before introducing anything new:

* `src/types/workflow.ts` - workflow definitions, compliance gates, workflow execution model
* `src/types/playbook-v2.ts` - trigger specs, approval policy, deterministic stage transitions
* `src/types/inbox.ts` - thread and artifact contracts
* `src/types/agent-toolkit.ts` - business-agent tool + approval contracts
* `src/server/services/workflow-registry.ts`
* `src/server/services/workflow-runtime.ts`
* `src/server/services/workflow-definitions/index.ts`
* `src/server/actions/inbox.ts`
* `src/server/agents/tools/router.ts`
* `src/server/agents/approvals/service.ts`
* `src/server/services/morning-briefing.ts`
* `src/app/api/cron/executive-proactive-check/route.ts`

Explicit non-goals:

* do not migrate to Postgres
* do not create `/apps` and `/packages`
* do not replace `inbox_threads` / `inbox_artifacts`
* do not collapse Linus infra approvals into business-agent approvals

---

## 3. Repository-Native Architecture Decision

### 3A. Runtime shape

Phase 1 remains inside the current repo shape:

* `src/types/*` for domain contracts
* `src/server/services/*` for Firestore-backed runtime services
* `src/server/services/workflow-definitions/*` for explicit proactive workflows
* `src/app/api/cron/*` for scheduled entrypoints where needed
* `src/server/actions/inbox.ts` for user-facing write-back into the current inbox model

### 3B. Storage decision

Firestore remains the operational source of truth.

New proactive runtime collections SHOULD be root collections with explicit `tenantId` and `organizationId` fields, matching the repo's current cross-org query patterns for:

* `workflow_executions`
* `playbook_runs`
* `inbox_threads`
* `inbox_artifacts`

Root collections to add:

* `proactive_tasks`
* `proactive_task_evidence`
* `proactive_commitments`
* `proactive_events`
* `proactive_outcomes`

Do NOT create Postgres tables in Phase 1.

### 3C. Inbox decision

User-facing proactive output continues to use:

* `inbox_threads`
* `inbox_artifacts`
* thread messages

Do NOT create a second `inbox_items` product surface in Phase 1.

### 3D. Approval decision

Two approval domains stay separate:

* Business-agent approvals: `src/server/agents/approvals/service.ts` + `src/server/agents/tools/router.ts`
* Linus/infra approvals: `src/server/services/approval-queue.ts`

Business proactive workflows MUST reuse the business-agent approval path.

---

## 4. New Domain Types

### 4A. `src/types/proactive.ts` (NEW)

Create a new type file specifically for durable proactive runtime state. This file is an extension layer, not a replacement for `src/types/task.ts`.

```ts
export type ProactiveWorkflowKey =
  | 'daily_dispensary_health'
  | 'vip_retention_watch'
  | 'competitor_pricing_watch';

export type ProactiveTaskStatus =
  | 'detected'
  | 'triaged'
  | 'investigating'
  | 'draft_ready'
  | 'awaiting_approval'
  | 'approved'
  | 'executing'
  | 'executed'
  | 'blocked'
  | 'resolved'
  | 'expired'
  | 'dismissed';

export type ProactiveSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ProactiveTaskRecord {
  id: string;
  tenantId: string;
  organizationId: string;
  workflowKey: ProactiveWorkflowKey;
  agentKey: string;
  status: ProactiveTaskStatus;
  priority: number;
  severity: ProactiveSeverity;
  title: string;
  summary: string;
  businessObjectType: string;
  businessObjectId: string;
  dedupeKey: string;
  workflowExecutionId?: string;
  threadId?: string;
  artifactId?: string;
  approvalId?: string;
  dueAt?: Date;
  createdBy: 'system' | 'agent' | 'user';
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}

export interface ProactiveTaskEvidenceRecord {
  id: string;
  taskId: string;
  tenantId: string;
  evidenceType: string;
  refId?: string;
  payload: Record<string, unknown>;
  createdAt: Date;
}

export interface ProactiveCommitmentRecord {
  id: string;
  tenantId: string;
  organizationId: string;
  taskId: string;
  commitmentType: 'approval_wait' | 'follow_up' | 'deadline' | 'blocked_issue';
  title: string;
  state: 'open' | 'resolved' | 'expired' | 'dismissed';
  dueAt?: Date;
  payload: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProactiveEventRecord {
  id: string;
  tenantId: string;
  organizationId?: string;
  taskId?: string;
  actorType: 'user' | 'agent' | 'system';
  actorId?: string;
  eventType: string;
  businessObjectType?: string;
  businessObjectId?: string;
  payload: Record<string, unknown>;
  createdAt: Date;
}

export interface ProactiveOutcomeRecord {
  id: string;
  tenantId: string;
  organizationId?: string;
  taskId?: string;
  workflowKey: ProactiveWorkflowKey;
  outcomeType: 'opened' | 'dismissed' | 'approved' | 'rejected' | 'executed' | 'resolved' | 'business_lift';
  score?: number;
  payload: Record<string, unknown>;
  createdAt: Date;
}
```

### 4B. `src/types/agent-toolkit.ts` (MODIFY)

Extend `ApprovalRequest` for business-agent approvals only:

```ts
status: 'pending' | 'approved' | 'rejected' | 'expired';
taskId?: string;
requestedByAgent?: string;
rationale?: string;
riskClass?: 'low' | 'medium' | 'high' | 'critical';
evidenceRefs?: string[];
expiresAt?: number;
decisionReason?: string;
```

Do NOT remove existing fields:

* `toolName`
* `payloadRef`
* `requestedBy`
* exact payload linkage

### 4C. `src/types/inbox.ts` (MODIFY)

Add proactive metadata to `InboxArtifact`:

```ts
proactive?: {
  taskId: string;
  workflowKey: ProactiveWorkflowKey;
  severity: ProactiveSeverity;
  evidence: Array<{ label: string; value: string }>;
  requiresApproval?: boolean;
  nextActionLabel?: string;
};
```

Do NOT add a second user-facing inbox model.

---

## 5. Firestore Runtime Services

### 5A. `src/server/services/proactive-task-service.ts` (NEW)

Exports:

```ts
createOrReuseProactiveTask(input: {
  tenantId: string;
  organizationId: string;
  workflowKey: ProactiveWorkflowKey;
  agentKey: string;
  title: string;
  summary: string;
  severity: ProactiveSeverity;
  businessObjectType: string;
  businessObjectId: string;
  dedupeKey: string;
  priority?: number;
  dueAt?: Date;
  createdBy?: 'system' | 'agent' | 'user';
}): Promise<ProactiveTaskRecord>

transitionProactiveTask(
  taskId: string,
  nextStatus: ProactiveTaskStatus,
  reason?: string
): Promise<ProactiveTaskRecord>

attachProactiveTaskEvidence(
  taskId: string,
  evidence: Omit<ProactiveTaskEvidenceRecord, 'id' | 'createdAt'>
): Promise<ProactiveTaskEvidenceRecord>

linkTaskToInbox(
  taskId: string,
  input: { threadId?: string; artifactId?: string; approvalId?: string; workflowExecutionId?: string }
): Promise<void>
```

Collection names:

* `proactive_tasks`
* `proactive_task_evidence`

Firestore fields for `proactive_tasks`:

* `tenantId: string`
* `organizationId: string`
* `workflowKey: string`
* `agentKey: string`
* `status: string`
* `priority: number`
* `severity: string`
* `title: string`
* `summary: string`
* `businessObjectType: string`
* `businessObjectId: string`
* `dedupeKey: string`
* `workflowExecutionId?: string`
* `threadId?: string`
* `artifactId?: string`
* `approvalId?: string`
* `dueAt?: Timestamp`
* `createdBy: string`
* `createdAt: Timestamp`
* `updatedAt: Timestamp`
* `resolvedAt?: Timestamp`

Dedupe rule:

* if a task exists for the same `tenantId + dedupeKey` and its status is not `resolved`, `dismissed`, or `expired`, return it instead of creating a new one

Allowed state transitions:

```text
detected -> triaged
triaged -> investigating | dismissed | blocked
investigating -> draft_ready | awaiting_approval | executing | blocked | resolved
draft_ready -> awaiting_approval | executing | dismissed
awaiting_approval -> approved | blocked | expired
approved -> executing
executing -> executed | blocked
executed -> resolved
blocked -> investigating | dismissed | resolved
```

### 5B. `src/server/services/proactive-event-log.ts` (NEW)

Exports:

```ts
appendProactiveEvent(input: Omit<ProactiveEventRecord, 'id' | 'createdAt'>): Promise<ProactiveEventRecord>
listRecentProactiveEvents(input: { tenantId: string; taskId?: string; limit?: number }): Promise<ProactiveEventRecord[]>
```

Collection:

* `proactive_events`

### 5C. `src/server/services/proactive-commitment-service.ts` (NEW)

Exports:

```ts
upsertCommitment(input: {
  tenantId: string;
  organizationId: string;
  taskId: string;
  commitmentType: 'approval_wait' | 'follow_up' | 'deadline' | 'blocked_issue';
  title: string;
  state?: 'open' | 'resolved' | 'expired' | 'dismissed';
  dueAt?: Date;
  payload: Record<string, unknown>;
}): Promise<ProactiveCommitmentRecord>

resolveCommitment(commitmentId: string, resolution: 'resolved' | 'expired' | 'dismissed'): Promise<void>
listOpenCommitments(input: { tenantId: string; organizationId?: string; taskId?: string }): Promise<ProactiveCommitmentRecord[]>
```

Collection:

* `proactive_commitments`

### 5D. `src/server/services/proactive-outcome-service.ts` (NEW)

Exports:

```ts
recordProactiveOutcome(input: Omit<ProactiveOutcomeRecord, 'id' | 'createdAt'>): Promise<ProactiveOutcomeRecord>
```

Collection:

* `proactive_outcomes`

---

## 6. Approval Boundary Implementation

### 6A. `src/server/agents/approvals/service.ts` (MODIFY)

Extend existing business-agent approval creation to accept optional metadata:

```ts
createApprovalRequest(
  tenantId: string,
  toolName: string,
  inputs: Record<string, unknown>,
  actorId: string,
  actorRole: UserRole,
  options?: {
    taskId?: string;
    requestedByAgent?: string;
    rationale?: string;
    riskClass?: 'low' | 'medium' | 'high' | 'critical';
    evidenceRefs?: string[];
    expiresAt?: number;
  }
): Promise<ApprovalRequest>
```

Firestore path remains:

* `tenants/{tenantId}/approvals/{approvalId}`
* `tenants/{tenantId}/approvals/{approvalId}/payload/data`

Do NOT move this approval path into `linus-approvals`.

### 6B. `src/server/agents/tools/router.ts` (MODIFY)

When a side-effect tool is blocked for approval:

1. preserve current exact-payload approval behavior
2. accept optional proactive metadata on the request
3. return `approvalId` and write audit telemetry as today

Add optional request fields:

```ts
taskId?: string;
requestedByAgent?: string;
approvalRationale?: string;
riskClass?: 'low' | 'medium' | 'high' | 'critical';
evidenceRefs?: string[];
```

Do NOT weaken:

* permission checks
* idempotency checks
* approval/tool binding

---

## 7. Workflow Integration

### 7A. `src/server/services/workflow-runtime.ts` (MODIFY)

Extend execution options:

```ts
interface ExecuteWorkflowOptions {
  orgId?: string;
  userId?: string;
  triggeredBy?: string;
  dryRun?: boolean;
  proactiveTaskId?: string;
}
```

When `proactiveTaskId` is present:

1. append a proactive event at workflow start
2. append a proactive event on step completion/failure
3. transition proactive task state on major boundaries:
   * workflow start -> `triaged` or `investigating`
   * output requiring approval -> `awaiting_approval`
   * execution in progress -> `executing`
   * execution success -> `executed`
   * workflow success with no more work -> `resolved`
4. never mark the task `resolved` if approval is still pending

### 7B. `src/server/services/workflow-definitions/index.ts` (MODIFY)

Register three new workflows:

* `daily-dispensary-health`
* `vip-retention-watch`
* `competitor-pricing-watch`

### 7C. `src/server/services/workflow-definitions/daily-dispensary-health.workflow.ts` (NEW)

Pattern source to reuse:

* `src/server/services/workflow-definitions/morning-briefing.workflow.ts`
* `src/server/services/morning-briefing.ts`

Primary agent:

* `pops`

Required behavior:

1. load org/store metrics and open issues
2. create or reuse proactive tasks for:
   * margin drop
   * inventory anomaly
   * compliance deadline
   * campaign underperformance
3. write an inbox artifact into the current Daily Briefing thread pattern
4. create commitments for unresolved items

Dedupe keys:

* `daily_health:{orgId}:{yyyy_mm_dd}`
* `margin_drop:{orgId}:{yyyy_mm_dd}`
* `inventory_anomaly:{productId}:{yyyy_mm_dd}`
* `compliance_deadline:{requirementId}:{yyyy_ww}`

### 7D. `src/server/services/workflow-definitions/vip-retention-watch.workflow.ts` (NEW)

Pattern source to reuse:

* `src/server/services/retention-score.ts`
* `src/server/services/crm-service.ts`
* existing outreach draft + inbox artifact patterns

Primary agents:

* `mrs_parker`
* `deebo` gate before any send or publish action

Required behavior:

1. identify at-risk VIP customers or cohorts
2. create or reuse a proactive task per customer/week
3. draft outreach payload
4. if communication requires approval, create business-agent approval
5. create or update an `outreach_draft` inbox artifact linked to the task
6. write a commitment while approval or follow-up is pending

Dedupe key:

* `vip_retention:{customerId}:{yyyy_ww}`

### 7E. `src/server/services/workflow-definitions/competitor-pricing-watch.workflow.ts` (NEW)

Pattern source to reuse:

* `src/server/services/brand-competitor-analyzer.ts`
* `src/server/services/pricing-alerts.ts`
* `src/server/services/market-benchmarks.ts`

Primary agents:

* `ezal`
* `money_mike`
* `deebo` when a proposed action affects protected messaging or external customer touchpoints

Required behavior:

1. evaluate competitor movement and internal margin pressure
2. create or reuse pricing response tasks
3. produce recommendation options with evidence
4. if a publish/write step is proposed, route through existing business-agent approval path
5. write an inbox artifact with rationale and evidence

Dedupe keys:

* `competitor_move:{signalHash}`
* `pricing_response:{productId}:{yyyy_ww}`

---

## 8. Inbox Write-Back

### 8A. `src/server/actions/inbox.ts` (MODIFY)

Ensure `createInboxArtifact` can accept and persist the new optional `proactive` metadata block.

No new collection names.

Continue using:

* `inbox_threads`
* `inbox_artifacts`

### 8B. Existing proactive artifacts to preserve

Do not regress current artifact flows:

* `analytics_briefing`
* `executive_proactive_check`
* `outreach_draft`

Each new proactive workflow should either:

* write one of those existing artifact types, or
* add a new artifact type only if strictly necessary

If adding a new artifact type, update both:

* `InboxArtifactType`
* `InboxArtifact.data` union

---

## 9. Sequence of Implementation PRs

### PR 1 - Proactive runtime foundation

Files:

* `src/types/proactive.ts`
* `src/server/services/proactive-task-service.ts`
* `src/server/services/proactive-event-log.ts`
* `src/server/services/proactive-commitment-service.ts`
* `src/server/services/proactive-outcome-service.ts`
* tests for the above

Goal:

* durable Firestore-backed task, evidence, commitment, and outcome state

### PR 2 - Business approval enrichment

Files:

* `src/types/agent-toolkit.ts`
* `src/server/agents/approvals/service.ts`
* `src/server/agents/tools/router.ts`
* approval tests

Goal:

* preserve exact payload approval safety while linking approvals to proactive tasks

### PR 3 - Workflow runtime hooks + registration

Files:

* `src/server/services/workflow-runtime.ts`
* `src/server/services/workflow-definitions/index.ts`
* new workflow definition files
* workflow runtime tests

Goal:

* allow proactive tasks to move with workflow execution

### PR 4 - Inbox write-back

Files:

* `src/types/inbox.ts`
* `src/server/actions/inbox.ts`
* inbox tests

Goal:

* surface proactive work through the existing inbox model with evidence

### PR 5 - First workflow online

Files:

* first workflow definition
* one cron entrypoint or existing cron integration point
* workflow-specific tests

Goal:

* ship one end-to-end proactive workflow before expanding to the remaining two

---

## 10. Test Plan

### Unit tests

Add:

* `tests/server/services/proactive-task-service.test.ts`
* `tests/server/services/proactive-event-log.test.ts`
* `tests/server/services/proactive-commitment-service.test.ts`
* `tests/server/services/proactive-outcome-service.test.ts`

Cover:

* dedupe returns existing active task
* invalid state transitions throw
* commitments upsert and resolve correctly
* outcome writes are tenant-scoped

### Existing test files to extend

* `src/server/agents/tools/__tests__/router-approvals.test.ts`
* `tests/workflow-runtime.test.ts`
* `tests/workflow-registry.test.ts`
* relevant inbox tests under `tests/components/inbox/*` or `src/server/actions/__tests__/inbox*`

Cover:

* approval metadata does not break exact tool approval binding
* proactive task transitions happen on workflow milestones
* workflow registration includes the new proactive workflows
* inbox artifacts persist proactive metadata

### Manual smoke

1. Run one proactive workflow in a dev org.
2. Confirm a `proactive_tasks` doc is created.
3. Confirm linked evidence and commitment docs are created.
4. Confirm an inbox artifact is visible in the existing inbox thread.
5. Confirm approval-required branch creates a business-agent approval, not a Linus approval.

---

## 11. Rollback Plan

| Strategy | Details |
|---|---|
| Single commit revert? | Yes, for each PR slice |
| Feature flag? | Optional per workflow rollout; foundation services do not require one |
| Data rollback needed? | Firestore docs can remain; reverted code simply stops reading new collections |
| Downstream services affected? | Inbox rendering, workflow runtime, business approvals |

Rollback rule:

* revert the latest workflow slice before touching the foundation slice
* do not delete new Firestore collections in an emergency rollback unless they cause cost or permission issues

---

## 12. Success Criteria

- [ ] One proactive workflow runs end to end without introducing a second inbox system
- [ ] Proactive tasks survive across runs and dedupe repeated triggers
- [ ] Approval-required actions remain bound to exact tool payloads
- [ ] Deebo-protected flows are still enforced
- [ ] Outcome and dismissal signals are persisted for later ranking/tuning
- [ ] No Postgres dependency or package split is introduced

---

## 13. Risk Tier, Failure Modes, Observability

### Risk Tier

**Tier 3**

### Failure modes

* duplicate tasks from unstable dedupe keys
* tasks stuck in `awaiting_approval`
* inbox artifact created without task linkage
* wrong approval path used
* workflow marks task resolved before send/approval completes
* missing tenant/org fields preventing pilot dashboards from querying state

### Observability requirements

Use structured logging and telemetry for:

* proactive task create/reuse
* proactive task transition
* approval create/resolve
* artifact linkage
* commitment open/resolve
* workflow outcome write
* duplicate suppression

Reuse existing telemetry style from:

* `src/server/services/agent-telemetry.ts`
* `src/server/services/playbook-telemetry.ts`

---

## 14. Engineering Rules For This Initiative

1. Never rely on LanceDB as the sole source of operational truth.
2. Never create a second proactive inbox surface.
3. Never route business-agent approvals into `linus-approvals`.
4. Never execute side-effecting tools from a proactive workflow without the existing business approval/policy path.
5. Never mark a proactive task complete without write-back.
6. Prefer extending existing workflow definitions and cron routes over inventing a second scheduler.

---

## 15. Bottom Line

The implementation chain for Phase 1 is:

**signal -> workflow trigger -> proactive task -> evidence -> approval or execution -> inbox artifact -> commitment -> outcome**

All of it stays inside the current repo and current storage model until live workflows prove the boundaries.
