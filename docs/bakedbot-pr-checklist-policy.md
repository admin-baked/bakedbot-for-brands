# BakedBot PR Checklist and Lightweight Policy

This document operationalizes the BakedBot AI Engineering Standard into a daily review tool.

## Purpose

Use this checklist on every PR, with deeper scrutiny as risk increases. It is designed to catch:

- duplicate logic
- suppressed correctness signals
- happy-path-only workflows
- convention drift
- code the author cannot explain

## Required PR Header

Every PR must include:

### Summary

What changed in user-visible or system-visible terms?

### Risk Tier

Choose one:

- Tier 0 — Low Risk
- Tier 1 — Moderate Risk
- Tier 2 — High Risk
- Tier 3 — Critical Risk

### Canonical Reuse

What existing types, services, utilities, adapters, schemas, UI patterns, workflows, tools, or modules were reused?

### New Abstractions

Does this introduce a new abstraction? If yes, why was reuse insufficient?

### Failure Modes

What happens on:

- missing data
- timeout
- retry
- duplicate event
- stale state
- third-party failure
- permission failure

### Verification

How was this tested?

- unit
- integration
- contract
- e2e
- manual verification

### Observability

How will this be debugged in production?

### Explainability

Can the author explain the full flow without AI comments, prompt history, or generated annotations?

## The Three Required Review Questions

### 1) Does it reuse?

Reject if duplicate domain types, copied logic across roles, redundant helpers/tools, or second sources of truth are introduced.

### 2) Does it follow conventions?

Reject if naming, placement, error/logging patterns, permission/tenant layering, or retry/idempotency conventions drift.

### 3) Can a human explain it?

Reject if explanation depends on AI commentary, the author cannot explain safety, or reviewer cannot understand system impact.

## Fast Checklist for Reviewers

### Reuse

- [ ] Extends or reuses a canonical module/type/utility/schema/component/tool
- [ ] No duplicate domain types introduced
- [ ] No parallel business logic created across roles/surfaces

### Conventions

- [ ] Naming matches domain conventions
- [ ] Module placement matches architecture boundaries
- [ ] Error handling follows repository conventions
- [ ] Logging and telemetry follow repository conventions
- [ ] Permissions and tenant scoping are in canonical layers

### Correctness

- [ ] No unjustified `eslint-disable`, `any`, unsafe cast, or silent catch
- [ ] Assumptions are explicit
- [ ] Null/missing/stale data handled intentionally
- [ ] Side effects are bounded and predictable

### Workflow Safety

- [ ] Retry behavior is correct
- [ ] Duplicate events handled intentionally
- [ ] Partial failure behavior is known
- [ ] Third-party failure behavior is known
- [ ] Background/async behavior is observable

### Testing

- [ ] Tests match risk level
- [ ] Critical logic is not validated only by shallow mocks
- [ ] Failure paths tested where relevant
- [ ] Repeated execution/idempotency tested where relevant

### Explainability

- [ ] Author can explain code without AI help
- [ ] Reviewer understands why implementation is safe

### Observability

- [ ] Logs/metrics/traces are sufficient for production debugging
- [ ] Critical state changes are traceable

## Tier-Based Review Requirements

### Tier 0 — Low Risk

Examples: copy/styling changes, local refactors without behavior change, test readability cleanup.

Requirements:

- one reviewer
- behavior unchanged or obvious
- no hidden risk indicators

### Tier 1 — Moderate Risk

Examples: low-impact dashboard logic, bounded UI interactions, internal admin features, small reporting/filtering changes.

Requirements:

- full checklist review
- targeted tests
- no suppression-based shortcuts

### Tier 2 — High Risk

Examples: automation triggers, role-based behavior, workflow state changes, notification logic, agent tool side effects, integration-facing logic.

Requirements:

- failure modes documented
- integration/contract testing where relevant
- observability reviewed
- explicit retry/duplicate/stale-state checks

### Tier 3 — Critical Risk

Examples: auth/session, tenant isolation, permissions/RBAC, billing/usage metering, migrations/destructive jobs, POS/menu mutation, compliance-sensitive workflows.

Requirements:

- two reviewers or leadership signoff
- explicit invariants in PR
- rollback or mitigation plan
- no merge based on green checks alone
- no merge if either reviewer cannot explain risk boundary

## PR Rejection Triggers

Reject if any are true:

- duplicate ownership introduced
- canonical reuse ignored without reason
- warnings suppressed instead of fixed
- author cannot explain logic/failure path
- reviewer cannot understand system impact
- tests validate only idealized assumptions
- critical behavior lacks observability
- risk tier understated
- permission/tenant boundaries unclear

## Reviewer Notes Template

### Reuse

- Canonical reuse confirmed / not confirmed
- Duplicate ownership risk: none / possible / present

### Conventions

- Convention fit: strong / mixed / poor
- Boundary issues noted: yes / no

### Correctness

- Suppression risk: none / low / medium / high
- Failure path confidence: high / medium / low

### Explainability

- Author explanation: sufficient / insufficient
- Reviewer understanding: sufficient / insufficient

### Outcome

- Approve
- Approve with follow-up
- Request changes
- Escalate for deeper review
