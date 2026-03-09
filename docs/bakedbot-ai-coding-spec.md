# BakedBot AI Coding Spec (Agent-Facing)

This is the default instruction set for AI agents generating, editing, or refactoring BakedBot code.

## Purpose

This is not just style guidance; it is safety + architecture guidance. The objective is code that fits the system, reuses canonical patterns, and remains maintainable under real operating conditions.

## Primary Generation Rule

Before generating new code, prefer in this order:

1. reuse an existing canonical module/type
2. extend an existing pattern
3. refactor an existing implementation
4. introduce a new abstraction only when clearly necessary

Do not generate a parallel solution when a canonical one exists.

## Generation Priorities

Optimize in this order:

1. correctness
2. reuse
3. convention fit
4. explainability
5. observability
6. simplicity
7. speed of implementation

Never trade correctness or architecture integrity for faster output.

## Mandatory Pre-Generation Checks

Before writing code, determine:

1. canonical home (domain model/service/adapter/workflow/UI pattern/tool/schema/job)
2. what already exists (types/services/utilities/schemas/components/tools/adapters/retry pattern)
3. risk tier (Tier 0/1/2/3)
4. likely failures (missing/invalid data, nulls, duplicates, stale state, retries, permission failures, third-party errors, partial execution)
5. observability plan (logs, metrics, traces, audit fields)

If Tier 2/Tier 3, bias toward explicitness over concision.

## Hard Rules for AI Code Generation

### Reuse rules

- Reuse existing domain types for existing concepts.
- Extend validated schemas rather than recreating them.
- Reuse adapters for the same integration boundary.
- Reuse established components/UI patterns.
- Reuse existing agent tools/contracts unless overlap is explicitly intended.

### Convention rules

- Follow repo naming conventions.
- Place files in established modules/boundaries.
- Use existing error-handling and logging conventions.
- Use canonical permission and tenant-scoping layers.
- Use canonical job/retry patterns.

### Correctness rules

- Fix lint/type issues instead of suppressing.
- Do not add unjustified `any`, unsafe casts, ignored nullability, or silent catches.
- Make assumptions explicit.
- Fail loudly on correctness problems.
- Do not hide boundary failures behind permissive fallbacks.

### Workflow rules

- Design side-effecting code for retries/replays.
- Handle duplicate events intentionally.
- Separate pure logic from side effects where possible.
- Preserve idempotency where workflows can replay.
- Make partial failures diagnosable.

### Explainability rules

- Write code humans can explain line-by-line.
- Prefer straightforward control flow.
- Prefer explicit naming.
- Prefer narrow helpers with clear ownership.

### Observability rules

- Add structured logging at key decision points for Tier 2/Tier 3.
- Include identifiers needed for debugging workflows.
- Preserve auditability for important state changes.

## Forbidden Agent Behaviors

Agents must not:

- create duplicate domain types for existing concepts
- generate parallel helpers when canonical helpers exist
- weaken permissions or tenant checks for convenience
- suppress lint/types as first-line solution
- swallow meaningful errors with silent catches
- invent a new error-handling style inside established modules
- create overlapping tool contracts without explicit justification
- move business logic into UI when it belongs in service/workflow layers
- add permissive fallbacks that hide data/integration problems

## Required Output Shape for AI-Generated Changes

For non-trivial implementations, include:

1. summary of the change
2. canonical reuse statement
3. risk tier (0/1/2/3)
4. failure modes
5. test plan
6. observability notes

## Guidance by System Area

### Auth, permissions, tenancy

- Never approximate permissions.
- Never rely on UI-only enforcement.
- Use canonical tenant scoping + role checks.
- Treat missing authorization context as failure.

### Billing, usage, quotas

- Preserve exactness.
- Avoid retries that can duplicate charges/counts.
- Keep state transitions auditable.
- Use deterministic event naming/ownership.

### Integrations and external systems

- Expect drift, timeout, partial failure, duplicates.
- Preserve adapter boundaries.
- Log context required to reconcile external state.
- Separate mapping from orchestration.

### Automations and playbooks

- Make trigger conditions explicit.
- Make side effects traceable.
- Handle replay/re-run/partial execution intentionally.
- Keep execution state diagnosable.

### Agents and tools

- Prefer fewer well-defined tools over overlapping tools.
- Keep I/O schemas explicit.
- Avoid ambiguous contracts.
- Log critical tool calls/failures.

### Frontend and dashboard surfaces

- Keep business rules out of presentation layers.
- Reuse canonical UI patterns.
- Surface failure/loading states explicitly.
- Avoid divergent client-side data models.

## Test Generation Rules

When generating tests:

- test real behavior, not mirrored implementation details
- include failure-path coverage for Tier 2/Tier 3
- avoid over-mocking critical boundaries
- test repeated execution when idempotency matters
- validate permission and tenant boundaries where relevant
- avoid superficial snapshot/assertion-heavy tests with low behavioral value

## Refactor Rules

When refactoring:

- preserve canonical ownership
- reduce duplication rather than move it
- do not change behavior silently
- remove dead exports/unused abstractions when safe
- improve readability and explainability

A shorter-but-less-understandable refactor is not successful.

## Migration and Background Job Rules

For migrations/backfills/async processing:

- assume repeated execution
- avoid irreversible mutation without safeguards
- include verification strategy
- preserve tenant and billing integrity
- bias toward checkpointable, observable operations

## Agent Completion Checklist

- [ ] Reused canonical patterns where possible
- [ ] Did not create duplicate abstraction for existing concept
- [ ] Followed naming/boundary/error-handling conventions
- [ ] Did not suppress warnings instead of fixing causes
- [ ] Handled likely failure modes intentionally
- [ ] Matched tests to risk tier
- [ ] Preserved observability for production debugging
- [ ] Human reviewer can explain code

If any item is false, revise before proposing changes.

## Standard Agent Instruction Snippet

> Generate code that reuses canonical BakedBot patterns before creating new abstractions. Follow existing domain models, module boundaries, naming, error-handling, permission, tenancy, logging, retry, and schema conventions exactly. Do not suppress type, lint, validation, or permission issues as a shortcut. Bias toward explicit, explainable, production-observable code. For any workflow, integration, automation, billing, auth, tenancy, or side-effecting change, account for failure modes such as retries, duplicates, stale state, missing data, partial third-party failure, and permission errors. Prefer code a human can maintain and explain without AI commentary.

## Final Rule

At BakedBot, AI gets credit for producing code that belongs, reuses, holds up under stress, can be explained by humans, and does not quietly create future drag.
