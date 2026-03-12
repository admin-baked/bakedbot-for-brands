# BakedBot Playbooks — Revised Implementation Plan
Reconciles the Technical Build Package (14 sections) against the actual BakedBot architecture.

🚨 5 Critical Translations Required
The build package assumes a greenfield backend. BakedBot is Firebase-native. These translations are non-negotiable.

1. PostgreSQL → Firestore
Build Package Table	BakedBot Firestore Collection	Notes
playbooks	playbooks/{id}	Extends existing Playbook type
playbook_versions	playbooks/{id}/versions/{v}	Subcollection
playbook_triggers	Inline on playbook doc	Existing pattern: triggers: PlaybookTrigger[]
playbook_runs	playbook_runs/{runId}	Top-level for cross-playbook queries
playbook_run_stages	playbook_runs/{runId}/stages/{stageName}	Subcollection
artifacts	playbook_runs/{runId}/artifacts/{id}	Subcollection; content bodies in Firebase Storage
validation_reports	Inline on run doc OR playbook_runs/{runId}/validation	Single doc
policy_bundles	policy_bundles/{id}	Top-level
policy_bundle_versions	policy_bundles/{id}/versions/{v}	Subcollection
approvals	playbook_runs/{runId}/approval	Single doc per run
deliveries	playbook_runs/{runId}/deliveries/{id}	Subcollection
telemetry_events	playbook_telemetry/{id}	Top-level, TTL-managed

IMPORTANT

Firestore has no JOINs. The run detail endpoint (GET /api/playbook-runs/{runId}) must fetch run doc + subcollections in parallel. This is the established BakedBot pattern (see playbook-executor.ts line 1427+).

2. Monorepo (packages/) → Next.js App (src/)
Build Package Path	BakedBot Path
packages/playbooks/schemas/	src/types/playbook-v2.ts (new file, extends existing)
packages/playbooks/compiler/	src/server/services/playbook-compiler.ts
packages/playbooks/runtime/	src/server/services/playbook-runtime-v2.ts
packages/playbooks/stage-executors/	src/server/services/playbook-stages/ (new dir)
packages/playbooks/validators/	src/server/services/playbook-validators/ (new dir)
packages/playbooks/templates/	src/server/services/workflow-definitions/ (existing dir)
packages/connectors/	src/server/services/ (existing services like ezal/)
packages/artifacts/	src/server/services/playbook-artifact-service.ts
packages/telemetry/	src/server/services/playbook-telemetry.ts

3. Named Queues → Cloud Tasks + Cloud Scheduler
Build Package Queue	BakedBot Implementation
playbook.triggered	Cloud Scheduler job (existing playbook-scheduler.ts)
playbook.resolve_scope through playbook.deliver	Cloud Tasks dispatched sequentially via src/server/jobs/dispatch.ts — one task per stage
playbook.retry	Re-enqueue via Cloud Tasks with backoff
playbook.telemetry	Fire-and-forget Firestore write (no queue needed)

4. New Playbook Interface → Extend Existing
The build package defines a new Playbook interface. BakedBot already has one at src/types/playbook.ts. Extend existing, don't replace.

diff
// src/types/playbook.ts additions
+ export type PlaybookStatusV2 = PlaybookStatus | 'needs_clarification' | 'compiled' | 'error';
+ export type AutonomyLevel = 'assist' | 'guided' | 'managed_autopilot' | 'full_auto';
+ 
+ // Added to Playbook interface:
+ autonomyLevel?: AutonomyLevel;
+ approvalPolicy?: ApprovalPolicy;
+ policyBundleId?: string;
+ playbookType?: string;      // 'daily_competitive_intelligence', etc.
+ displayName?: string;
+ compiledSpec?: CompiledPlaybookSpec;

5. Zod Schemas → Colocate with Types
BakedBot already uses Zod in 50+ files. Zod schemas go in the same file as their TypeScript interfaces (established pattern: see src/types/inbox.ts, src/types/artifact.ts).

Proposed Changes
Types & Schemas
[MODIFY] playbook.ts
Extend PlaybookStatus union with needs_clarification, compiled, error
Add AutonomyLevel type + Zod schema
Add ApprovalPolicy interface + Zod schema
Add autonomyLevel, approvalPolicy, policyBundleId, playbookType, displayName to Playbook
Add RunStatus type (11 run-level states from build package §5.1)
Extend PlaybookRun with stageStatuses, confidence, resolvedScope, deliveryStatus, requiresApproval, retryCount

[NEW] playbook-v2.ts
New types that don't fit cleanly as extensions:
CompiledPlaybookSpec + Zod schema (build package §4)
TriggerSpec discriminated union + Zod
OutputSpec + Zod
PlaybookArtifact interface
ValidationIssue, ValidatorResult, ValidationReport types
PolicyBundle + Zod schema
RunStage interface
StageExecutionInput, StageExecutionResult contracts

[MODIFY] workflow.ts
Add stageTelemetry to WorkflowStepResult (token/model tracking)
Add autonomyLevel, confidence, artifacts[], policyBundleId to WorkflowExecution

State Machine (Build Package §5)
[NEW] playbook-state-machine.ts
RUN_STAGE_ORDER constant
getNextRunStatus() transition function (build package §5.2)
StageExecutor<TIn, TOut> interface (build package §5.3)

Stage Executors (Build Package §9)
[NEW] src/server/services/playbook-stages/ directory
One file per stage:
File	Stage	Type
resolve-scope.ts	resolving_scope	Deterministic
extract-questions.ts	extracting_questions	Deterministic + light AI
assemble-context.ts	assembling_context	Connector + AI
generate-output.ts	generating_output	AI (bounded prompt)
validate.ts	validating	Deterministic
deliver.ts	delivering	Deterministic

Validation Harness (Build Package §10)
[NEW] src/server/services/playbook-validators/ directory
File	Validator
source-integrity.ts	Named entities, numeric values, timestamp freshness
schema-validator.ts	JSON shape, required keys, enums
policy-validator.ts	Disclaimers, blocked claims, channel rules
confidence-validator.ts	Confidence floor, source conflicts
delivery-validator.ts	Asset existence, destination reachability
index.ts	runValidationHarness() orchestrator

Artifact Service (Build Package §3)
[NEW] playbook-artifact-service.ts
createArtifact() — write metadata to Firestore subcollection, content to Firebase Storage
getArtifact(), listArtifactsForRun()
compareArtifacts() — text diff for markdown, JSON diff for structured

API Endpoints (Build Package §6)
[NEW] src/app/api/playbooks/compile/route.ts
POST endpoint — NLP → compiled spec

[NEW] src/app/api/playbooks/[playbookId]/activate/route.ts
POST endpoint — draft/compiled → active

[NEW] src/app/api/playbooks/[playbookId]/runs/route.ts
POST endpoint — manual run trigger

[NEW] src/app/api/playbook-runs/[runId]/route.ts
GET endpoint — run detail with stages, artifacts, validation, approval, deliveries

[NEW] src/app/api/playbook-runs/[runId]/approve/route.ts
POST endpoint — approve/reject

[NEW] src/app/api/playbook-runs/[runId]/retry/route.ts
POST endpoint — retry specific stage

Daily CI Report Template (Build Package §8)
[NEW] daily-ci-report.workflow.ts
Follows existing pattern from campaign-sender.workflow.ts.

Firestore Indexes Required
json
[
  { "collectionGroup": "playbook_runs", "fields": ["playbookId", "createdAt"], "queryScope": "COLLECTION" },
  { "collectionGroup": "playbook_runs", "fields": ["status", "createdAt"], "queryScope": "COLLECTION" },
  { "collectionGroup": "playbook_telemetry", "fields": ["runId", "createdAt"], "queryScope": "COLLECTION" },
  { "collectionGroup": "playbook_telemetry", "fields": ["playbookId", "createdAt"], "queryScope": "COLLECTION" }
]

Implementation Order
Step	Deliverable	Risk
1	Types + Zod schemas (playbook.ts extensions + playbook-v2.ts)	Low
2	State machine (playbook-state-machine.ts)	Low
3	Artifact service + Firestore/Storage persistence	Medium
4	Validation harness (6 validators)	Medium
5	Stage executors for Daily CI (6 files)	Medium
6	Daily CI workflow template	Low
7	API endpoints (6 routes)	Medium
8	NLP Compiler (tracer bullet — CI report only)	High
9	Telemetry integration	Low

Verification Plan
Automated Tests
powershell
# Existing tests (regression check)
npx jest tests/workflow-types.test.ts tests/workflow-registry.test.ts tests/workflow-runtime.test.ts tests/workflow-versioning.test.ts --no-cache
# Type check
npm run check:types

New Tests
Test	What It Covers
tests/types/playbook-v2-schemas.test.ts	Zod parse/reject for all new schemas
tests/server/playbook-state-machine.test.ts	Every state transition + edge cases
tests/server/playbook-validators/*.test.ts	Each validator independently
tests/server/playbook-artifact-service.test.ts	Create/list/compare with mocked Firestore
tests/server/playbook-stages/*.test.ts	Stage executor contracts
tests/e2e/daily-ci-playbook.e2e.test.ts	Full vertical slice end-to-end
