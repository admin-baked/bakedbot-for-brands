# BakedBot AI Coding Standard

## Purpose

BakedBot is 100% AI engineered. That only works if we are more disciplined than a traditional team, not less.

Our standard is:

**We do not ship code that is merely plausible. We ship code that is understandable, reusable, observable, and safe under failure.**

This document defines how AI-assisted code must be generated, reviewed, tested, and shipped in BakedBot repositories.

---

## Core Principle

The most expensive code is not obviously broken code. It is code that almost works.

Obviously broken code usually fails fast. Almost-right code compiles, passes tests, looks clean, and gets merged. Then it fails later under edge cases, retries, third-party drift, stale state, permissions, tenant boundaries, or workflow complexity.

Because BakedBot spans multiple roles, automations, integrations, agents, and business-critical workflows, we optimize for **speed of understanding**, not only speed of generation.

---

## Non-Negotiable Rules

### 1. AI output is never the source of truth

Truth lives in canonical architecture, approved domain models, system conventions, production behavior, and human understanding.

### 2. Every important concept must have one canonical home

For critical concepts, there must be one obvious source of truth.

Examples:

- tenant model
- roles and permissions
- menu and inventory entities
- automation execution state
- billing and usage events
- agent tool contracts
- integration adapters
- analytics definitions

### 3. Human understanding is required for merge

If the author or reviewer cannot explain the code’s logic, assumptions, and failure behavior without AI commentary, it does not merge.

### 4. High-risk changes do not merge on green checks alone

Passing tests is necessary, not sufficient.

### 5. Suppression-based fixes are treated as risk

Every lint disable, `any`, unsafe cast, silent catch, ignored validation rule, or permissive fallback must be justified. Unjustified suppression fails review.

### 6. Reuse is the default

Extend existing patterns before creating new ones.

### 7. Critical flows must be observable

Important workflows must emit enough logs, metrics, traces, and audit data to explain production behavior.

---

## BakedBot-Specific AI Debt Patterns

### 1. Duplicate business logic across roles

The same logic appears separately in Super User, dispensary, brand, or grower surfaces with slight variations.

### 2. Tool and agent sprawl

Multiple tools, prompts, or orchestration helpers do nearly the same thing with slightly different schemas or side effects.

### 3. Suppressed correctness signals

The codebase’s immune system is weakened through lint disables, `any`, silent catches, unsafe casts, ignored validation, or permissive fallbacks.

### 4. Happy-path orchestration

Workflows function in nominal conditions but break under retries, partial failure, duplicate events, stale state, ordering issues, rate limits, or third-party drift.

### 5. Test-shaped confidence

Tests pass because they validate mocked assumptions or AI-generated expectations instead of real behavior.

---

## Required Review Questions

Every AI-assisted PR must be reviewed with these three questions first.

### 1. Does it reuse?

Did this change reuse or extend a canonical type, utility, service, schema, tool contract, component, adapter, or workflow?

Reject if it creates duplicate ownership for an existing concept.

### 2. Does it follow conventions?

Does the code follow naming, module boundaries, file placement, error handling, logging, permission, tenancy, retry, and integration conventions?

Reject if it introduces a second way to do a common thing.

### 3. Can a human explain it?

Can the author explain the happy path, failure path, assumptions, and system impact without AI comments or prompt history?

Reject if they cannot.

---

## Testing Standard

Testing depth must match risk.

### Tier 0

- existing tests pass
- behavior unchanged or obvious

### Tier 1

- targeted unit tests for changed logic
- no regressions in relevant feature tests

### Tier 2

- unit tests for logic
- integration or contract tests for boundaries
- explicit failure-path coverage
- retry/idempotency validation where relevant

### Tier 3

- unit + integration/contract tests
- edge-case and permission-path coverage
- tenant and billing integrity validation where relevant
- rollout safety reviewed before merge

### Test Design Rules

- Do not trust AI-generated tests without review.
- Avoid shallow mocks for critical behavior.
- Prefer contract tests at important boundaries.
- Test failure paths, not just happy paths.
- Test repeated execution where side effects or retries are involved.

---

## Observability Standard

For Tier 2 and Tier 3 work:

- add structured logs at key decision points
- include correlation identifiers for tracing
- log meaningful context for failures
- emit metrics for success/failure where useful
- preserve auditability for important state changes

---

## Forbidden Practices

The following are prohibited by default:

- adding `eslint-disable` without justification
- adding `any` or unsafe casts without justification
- silent catch-and-ignore logic
- permissive fallbacks that hide correctness problems
- duplicate types for existing concepts
- parallel utilities for canonical logic
- overlapping agent tools without design justification
- bypassing permission checks in the UI or wrong service layer
- mutating tenant-scoped data without canonical tenant enforcement

---

## Definition of Done

AI-assisted code is done only when:

- it reuses canonical patterns or justifies a new abstraction
- it follows repo and system conventions
- a human can explain it without AI help
- tests match the risk level
- failure modes are known and addressed
- production observability is adequate
- it does not weaken type, lint, validation, permission, or tenant safeguards
- it does not create duplicate ownership for important logic

If any of these are false, the code is not done.
