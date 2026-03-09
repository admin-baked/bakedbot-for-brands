# BakedBot Lint and CI Policy

## Purpose

This policy defines the minimum automated enforcement required to keep a 100% AI-engineered codebase maintainable, understandable, and safe.

Our principle is simple:

**If the codebase relies on AI for speed, CI must protect the codebase from silent drift, duplicate patterns, weakened safeguards, and unreviewed high-risk changes.**

CI does not replace review. It exists to enforce baseline discipline so human review can focus on system impact.

---

## Enforcement Goals

Our lint and CI system must help prevent:

- suppression-based fixes
- duplicate ownership of domain concepts
- convention drift
- weak review on high-risk changes
- low-value test confidence
- silent degradation of type, schema, permission, and tenant safeguards

---

## Minimum Required Gates

Every pull request must pass the following baseline gates unless explicitly exempted.

### 1. Formatting and linting

- formatting check must pass
- lint must pass
- no new lint suppressions without justification

### 2. Type safety

- typecheck must pass
- no unjustified `any`, unsafe casts, or ignored type errors

### 3. Test baseline

- relevant tests must pass
- changed critical paths must not merge with only shallow or snapshot validation

### 4. Risk and review metadata

- PR must declare a risk tier
- PR must include required template sections
- PR must include author explainability confirmation

### 5. Critical path escalation

- Tier 3 changes require additional review and must not merge on one green check set alone

---

## Required CI Jobs

Each repo should implement jobs equivalent to the following.

### `format-check`

Verifies code formatting consistency.

### `lint`

Runs repo lint rules and fails on:

- warnings promoted to errors in critical modules where appropriate
- forbidden suppression patterns
- forbidden import or boundary violations
- missing required conventions if enforceable

### `typecheck`

Runs strict type validation.

### `unit-tests`

Runs unit tests relevant to the repo or changed packages.

### `integration-tests`

Runs integration or contract tests for changed Tier 2 and Tier 3 areas.

### `pr-governance`

Validates PR metadata and governance requirements.

Optional additional jobs by repo:

- `contract-tests`
- `e2e-smoke`
- `dead-code-check`
- `duplicate-code-check`
- `architecture-boundaries`
- `schema-compatibility`

---

## Policy Rules

## 1. Suppression policy

The following require explicit PR justification and should be machine-detectable where possible:

- `eslint-disable`
- `@ts-ignore`
- `@ts-expect-error`
- `any`
- unsafe non-null assertions in critical logic
- catch blocks that do not log, rethrow, or intentionally handle errors

### Policy

- New suppressions are disallowed by default.
- If a suppression is truly necessary, the PR must explain why it is safe and temporary.
- Repeated suppressions in the same module should trigger cleanup work.

---

## 2. Boundary enforcement policy

Where possible, CI should enforce architecture boundaries:

- UI cannot own backend business rules
- integrations must go through adapters
- tenant scoping must happen in canonical layers
- permission checks must happen in canonical layers
- shared domain types should not be redefined locally

Recommended techniques:

- import rules
- path alias restrictions
- architecture tests
- forbidden dependency graphs

---

## 3. Critical module policy

Critical modules should have stricter enforcement.

Critical modules include any code affecting:

- auth/session
- permissions/RBAC
- tenancy
- billing/usage/quota logic
- migrations/backfills
- inventory/menu mutation
- automation execution
- agent tools with side effects
- POS or external commerce mutation

### Policy

For critical modules, CI should prefer:

- stricter lint settings
- mandatory integration or contract tests
- changed-files-based escalation
- higher scrutiny on suppressions and unsafe typing

---

## 4. Dead code and duplicate ownership policy

AI-generated systems are especially prone to phantom code.

Where tooling allows, CI should detect:

- unused exports
- unused files/modules
- duplicate utilities
- duplicate domain types
- near-identical helpers in different modules

### Policy

- Dead code findings should fail or warn depending on maturity of the repo.
- Duplicate ownership of critical concepts should fail review.

---

## 5. Test quality policy

Passing tests are not enough if they validate weak assumptions.

### Policy expectations

- Tier 2 and Tier 3 changes must include meaningful boundary validation.
- Critical logic should not be approved only by snapshot tests or shallow mocks.
- Retry, duplicate event, stale-state, and failure-path coverage should exist where relevant.

Where automated detection is difficult, the PR governance job should require explicit declaration and reviewer confirmation.

---

## 6. PR governance policy

The PR template is mandatory. CI should verify that the following fields are present:

- summary
- risk tier
- canonical reuse
- new abstractions
- failure modes
- verification
- observability
- explainability

PRs missing required governance fields should fail the governance check.

---

## Escalation Rules

The following conditions should automatically escalate review depth or fail the governance check:

- Tier 3 selected
- critical-path files changed
- lint/type suppressions added
- permission or tenant files changed
- migration or destructive job files changed
- agent tool contracts changed
- workflow or automation executors changed

Escalation actions may include:

- requiring an additional reviewer
- requiring a specific label
- requiring integration tests
- blocking auto-merge

---

## Recommended Enforcement Levels

## Phase 1 — Visibility

Use warnings and governance checks to measure drift.

Enforce:

- PR template presence
- risk tier declaration
- lint/type/test jobs
- suppression counting

## Phase 2 — Guardrails

Start blocking common harmful patterns.

Enforce:

- no new suppressions without explicit justification
- architecture boundary checks
- critical-path escalation
- required labels for risk tiers

## Phase 3 — Hard Enforcement

Treat the engineering standard as operating law.

Enforce:

- duplicate ownership detection where possible
- dead export checks
- changed-files-based mandatory integration testing
- no merge on missing governance metadata

---

## Suggested Metrics from CI

Track these over time:

- new suppressions per PR
- unsafe type count by repo
- PRs by risk tier
- critical-path PR count
- PRs missing required governance fields
- duplicate code warnings
- dead code findings
- rollback rate by tier
- defects by tier and subsystem

---

## Final Rule

CI is not there to make the repo feel strict.

CI is there to prevent BakedBot from moving so fast with AI that it quietly finances its own rewrite.
