# Agentic Workflows Doctrine — Audit & Feedback
Verdict: Strong foundation. The doctrine is philosophically sound and directly actionable for BakedBot.
Below is a section-by-section audit against what actually exists in the codebase today, followed by gaps and implementation readiness.

✅ What the Doctrine Gets Right
1. "Deterministic control flow, probabilistic intelligence" — Already Partially Built
The codebase already embodies this with a clear split:

Deterministic layer: workflow-runtime.ts (819 lines) — parallel composition, forEach batching, goto control flow, compliance gates, timeout handling
Deterministic layer: playbook-executor.ts (1,769 lines) — 6 agent handlers (smokey, ezal, craig, pops, money_mike, deebo), step executors for delegate, parallel, notify, query, generate, scan_competitors, etc.
Type system: workflow.ts (292 lines) — WorkflowDefinition, WorkflowStep, ComplianceGate, ForEachConfig, WorkflowTrigger types
Registry: workflow-registry.ts — validation, cycle detection, I/O contract checking
Assessment: The doctrine's §1 (no prompts for control flow) and §2 (separate research from solutioning) align with what's already built. The existing WorkflowStep type already supports onSuccess/onFailure goto, parallel blocks, and compliance gates — exactly what the doctrine prescribes.

2. Artifact Production — Already Designed (Partially Implemented)
The INTUITION_OS_SPEC already defines append-only event logging (AgentEvent), derived memories (CustomerProfileMemory), heuristics as data, and pattern clusters. The doctrine's §3 (every workflow should produce artifacts) maps directly to this.

3. Compliance as First-Class — Already Built
ComplianceGate is a first-class type in the workflow DSL. runComplianceGate() exists in the runtime. Deebo already gates campaigns. The doctrine's §7 (policies outside prompts) matches existing heuristics and ComplianceRule schemas.

4. Standard Workflow Backbone — Already Matches
The doctrine's 9-step model (Trigger → Scope → Questions → Research → Strategy → Validation → Delivery → Persistence → Follow-up) maps cleanly to the existing WorkflowDefinition structure with trigger, gates, steps, and execution persistence.

⚠️ Gaps Between Doctrine and Current Codebase
Gap 1: No Artifact Persistence Model
Doctrine says: Every run should produce named artifacts (brief.json, scope.json, research_pack.md, validation_report.json, etc.)

Current state: WorkflowExecution stores stepResults[] with generic output?: unknown, but there's no structured artifact registry. Outputs are inlined into step results, not stored as independently addressable, inspectable, diffable objects.

IMPORTANT

This is the single biggest gap. Without a proper artifact model, you can't build the Artifact Browser, comparison views, or replay/rollback features the doctrine calls for.

Recommendation: Add an Artifact type and a Firestore artifacts subcollection under workflow executions.

Gap 2: No Rollback / Replay Support
Doctrine says: §8 — Be able to inspect each stage, retry only the failed stage, rerun with changed parameters, compare two runs, roll back.

Current state: WorkflowExecution is a finalized record. There's no mechanism to re-enter a workflow at a specific step, compare two execution records, or roll back to a previous output.

Recommendation: This is a Phase 2 concern. For now, the execution record structure supports post-hoc comparison (two WorkflowExecution docs side by side). Replay requires adding a resumeFromStep option to executeWorkflowDefinition().

Gap 3: No Question Extraction Stage
Doctrine says: §4 — Convert user requests into structured questions before execution.

Current state: There's no "clarification" step type in the workflow DSL. Playbooks either run fully automated or require manual approval via submit_approval. There's no mid-workflow "ask and wait" primitive.

Recommendation: Add a question_extraction step type that pauses the workflow and surfaces structured questions to the user. This is critical for the "Playbooks from natural language" feature.

Gap 4: No Telemetry Per-Stage
Doctrine says: Telemetry standards — capture trigger source, run duration by stage, token usage by stage, model selection by stage.

Current state: WorkflowStepResult already captures durationMs per step, but not token usage or model selection per step. agent_telemetry collection exists but tracks per-invocation, not per-workflow-step.

Recommendation: Extend WorkflowStepResult with optional tokenUsage: { input: number, output: number } and model?: string fields.

Gap 5: Autonomy Levels Not Codified
Doctrine says: Four autonomy levels (Assist → Guided → Managed Autopilot → Full Auto) with clear use cases.

Current state: Playbooks have triggeredBy: 'manual' | 'schedule' | 'event' but no explicit autonomy level. The submit_approval step exists but the system doesn't have a formalized escalation model based on autonomy level.

Recommendation: Add autonomyLevel: 1 | 2 | 3 | 4 to WorkflowDefinition or Playbook. Use this to determine whether approval gates are inserted automatically.

Gap 6: No Workflow Compiler for Natural Language
Doctrine says: Users should describe automations in plain English; the system compiles to structured workflow specs.

Current state: Playbooks are created through a template library (23 templates) and a UI wizard. There's no NLP-to-workflow compilation pipeline.

Recommendation: This is a major feature, not a gap to fix incrementally. The doctrine's 4-stage translation pipeline (Intent Parse → Clarify → Compile → Run) is sound. Build as a tracer bullet per §5.

🔍 Doctrine vs. Existing Specs — Conflict Check
Doctrine Principle	Existing Spec / Code	Conflict?
No prompts for control flow	Workflow DSL + runtime	✅ Aligned
Artifacts per stage	INTUITION_OS events + memories	⚠️ Events exist, but no named artifact registry
Policies outside prompts	Heuristics collection + ComplianceGate	✅ Aligned
Deterministic validation harness	runComplianceGate() + Deebo	⚠️ Only compliance; no source-check or brand-voice modules
Rollback / replay	Not implemented	❌ Gap
Confidence-aware routing	confidenceScore in INTUITION_OS	✅ Designed, partially built
Team visibility / role-based	RBAC exists (requireSuperUser, org membership)	⚠️ No per-workflow role controls

📋 Implementation Readiness Assessment
Ready to Build Now (Low Risk)
Artifact persistence model — Add Artifact type + Firestore subcollection
Per-step telemetry fields — Extend WorkflowStepResult with token/model tracking
Autonomy level field — Add to WorkflowDefinition / Playbook types

Needs Design First (Medium Risk)
Question extraction step — Requires async workflow pause/resume UX
Validation harness modules — Source check, brand voice, duplicate detection beyond compliance
Comparison views — UI for side-by-side workflow execution diffs

Major Feature (High Risk, Tracer Bullet Recommended)
NLP-to-workflow compiler — Full pipeline from natural language to structured spec
Rollback/replay engine — Re-entry at arbitrary workflow step

🎯 Recommended Adoption Strategy
Phase 0 (Now): Adopt the doctrine as the canonical design philosophy. No code changes needed — it validates what's already built.
Phase 1 (Next Sprint): Close Gaps 1, 4, 5 — artifact model, telemetry, autonomy levels. These are additive type/schema changes.
Phase 2 (Following Sprint): Build question extraction + expanded validation harness.
Phase 3 (Roadmap): NLP compiler as a tracer bullet, starting with one Playbook type (e.g., competitive intelligence).
