# BakedBot Agent Instructions

This file defines the default behavior for any AI agent generating, editing, reviewing, or refactoring code in this repository.

## Mission

Generate code that belongs in this codebase.

Do not optimize only for speed of output. Optimize for:

1. correctness
2. reuse
3. convention fit
4. explainability
5. observability
6. simplicity

---

## Primary Rule

Before generating new code, prefer in this order:

1. reuse an existing canonical module or type
2. extend an existing pattern
3. refactor an existing implementation
4. introduce a new abstraction only when clearly necessary

Do not generate a parallel solution when a canonical one already exists.

---

## Mandatory Pre-Generation Checks

Before writing code, determine:

### 1. Canonical home

Where does this logic belong?

- domain model
- service
- adapter
- workflow module
- tool contract
- schema
- UI component
- background job

### 2. Existing patterns

What already exists?

- type
- service
- utility
- schema
- component
- tool definition
- adapter
- error-handling pattern
- retry or job pattern

### 3. Risk tier

Classify the task as Tier 0, 1, 2, or 3.

### 4. Failure modes

Account for likely failure conditions:

- missing or invalid data
- null states
- duplicate events
- stale state
- retries
- permission failure
- third-party errors
- partial execution

### 5. Observability

Decide what logs, metrics, traces, or audit data are needed.

---

## Hard Rules

### Reuse Rules

- Reuse existing domain types for existing concepts.
- Extend validated schemas instead of recreating them.
- Reuse existing adapters for the same integration boundary.
- Reuse existing tools/contracts unless overlap is explicitly intended.

### Convention Rules

- Follow repo naming conventions exactly.
- Place files within established boundaries.
- Use existing error-handling, logging, permission, and tenancy patterns.
- Use canonical retry and job patterns.

### Correctness Rules

- Fix type and lint issues instead of suppressing them.
- Do not introduce `any`, unsafe casts, ignored nullability, or silent catches without explicit necessity.
- Fail loudly on true correctness problems.
- Do not hide boundary failures behind permissive fallbacks.

### Workflow Rules

- Design side-effecting code for retries and repeated execution where relevant.
- Handle duplicate events intentionally.
- Preserve idempotency where workflows may replay.
- Make partial failures diagnosable.

### Explainability Rules

- Write code a human can explain line by line.
- Prefer straightforward control flow over clever compression.
- Prefer explicit naming over ambiguous naming.

### Observability Rules

- Add structured logging at key decision points for Tier 2 and Tier 3 work.
- Include identifiers needed for workflow tracing.
- Preserve auditability for important state changes.

---

## Forbidden Behaviors

Do not:

- create duplicate domain types for existing concepts
- generate parallel helpers when a canonical one exists
- weaken permissions or tenant checks for convenience
- suppress lints or types as a first-line solution
- use silent `catch` blocks that swallow meaningful errors
- invent a new error-handling style inside an established module
- create overlapping agent/tool contracts without justification
- move business logic into the UI when it belongs in a service or workflow layer
- add permissive fallbacks that hide real data or integration problems

---

## Required Output for Non-Trivial Changes

When possible, include:

### Summary

What behavior changed?

### Canonical reuse

What existing modules, types, patterns, or contracts were reused?

### Risk tier

Tier 0 / 1 / 2 / 3

### Failure modes

What happens in the main failure conditions?

### Test plan

What should be validated and at what layer?

### Observability notes

What should be logged or measured?

---

## System-Specific Guidance

### Auth, permissions, and tenancy

- Never approximate permissions.
- Never rely on UI-only enforcement.
- Use canonical tenant scoping and role checks.
- Treat missing authorization context as failure, not fallback.

### Billing, usage, and quotas

- Preserve exactness.
- Avoid retries that can duplicate charges or counts.
- Make state transitions auditable.

### Integrations and external systems

- Expect drift, timeout, partial failure, and duplicates.
- Preserve adapter boundaries.
- Log enough context to reconcile external state.

### Automations and playbooks

- Make trigger conditions explicit.
- Make side effects traceable.
- Handle replay, re-run, and partial execution intentionally.

### Agents and tools

- Prefer fewer well-defined tools over overlapping tools.
- Keep input/output schemas explicit.
- Avoid ambiguous contracts.

### Frontend and dashboard surfaces

- Keep business rules out of presentation layers when possible.
- Reuse canonical UI patterns.
- Surface failure and loading states explicitly.

---

## Completion Check

Before finalizing code, verify:

- [ ] I reused canonical patterns where possible.
- [ ] I did not create a duplicate abstraction for an existing concept.
- [ ] I followed naming, boundary, error-handling, permission, tenancy, logging, and retry conventions.
- [ ] I did not suppress warnings instead of fixing root causes.
- [ ] I handled likely failure modes intentionally.
- [ ] I matched tests to the task’s risk level.
- [ ] I preserved observability for production debugging.
- [ ] A human reviewer will be able to explain this code.\r
- [ ] **I ran `/simplify` (3-agent parallel review: Code Reuse, Code Quality, Efficiency) and fixed all confirmed findings.**

If any item is false, revise before proposing the change.
