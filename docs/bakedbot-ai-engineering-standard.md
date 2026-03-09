# BakedBot AI Engineering Standard

**Version:** 1.0  
**Applies to:** All BakedBot repositories, teams, and AI-assisted implementation workflows  
**Operating principle:** _Never optimize for speed of generation without optimizing for speed of understanding._

## 1) Purpose

BakedBot is AI-generated and human-governed. This standard exists to prevent AI debt in a multi-role, workflow-heavy platform where believable-but-wrong code is the highest-cost failure mode.

## 2) Core Risk Model

The highest-risk code is code that compiles, passes basic tests, and appears clean, but is incorrect in:

- edge conditions
- retries/idempotency
- orchestration steps
- partial failure behavior
- role/tenant boundaries
- integration drift and reconciliation

## 3) Non-Negotiable Guardrails

No AI-generated code ships unless it is:

1. **Attached to a canonical module/pattern** (no duplicate logic islands)
2. **Tested at the right risk level** (unit + contract/integration as needed)
3. **Explainable by a human reviewer** without relying on prompt context
4. **Observable in production** (logs, telemetry, alertable failure modes)
5. **Safe under failure/retry/edge conditions**

## 4) Canonical Ownership Rules

Every subsystem must define, in a short owner document:

- what it owns
- what it explicitly does **not** own
- canonical types/models
- the single source of truth for critical business logic

### Priority domains that require canonical ownership

- tenant and org boundaries
- user/role/RBAC model
- automation/playbook execution state
- menu/inventory entities and reconciliation
- billing/usage events
- agent/tool contracts and schemas
- integration adapters (POS/ecommerce/notifications)

## 5) BakedBot AI Debt Patterns (must be actively prevented)

1. Duplicate business logic across roles
2. Tool/agent sprawl with overlapping behavior
3. Suppressed correctness signals (`any`, disabled lint rules, silent catches)
4. Happy-path-only orchestration
5. Test-shaped confidence (tests validate mocks, not reality)

## 6) Risk Tiers

### Tier 0 — Low Risk

Examples:

- copy and styling updates
- local refactors without behavior change
- test readability cleanup

**Required:** one reviewer, obvious/unchanged behavior, no hidden risk indicators.

### Tier 1 — Moderate Risk

Examples:

- low-impact dashboard logic
- bounded UI interactions
- small reporting/filtering changes
- internal admin features

**Required:** full checklist review, targeted tests, no suppression-based shortcuts.

### Tier 2 — High Risk

Examples:

- automation triggers and workflow state changes
- role-based behavior and notification logic
- agent tool side effects
- integration-facing logic

**Required:** failure modes documented, integration/contract testing where relevant, observability review, explicit retry/duplicate/stale-state checks.

### Tier 3 — Critical Risk

Examples:

- authentication/session logic
- tenant isolation and permissions/RBAC
- billing/quotas/usage metering
- data migrations/destructive jobs
- POS/menu/customer state mutation
- compliance-sensitive workflows

**Required:** two reviewers (or leadership signoff), explicit invariants, rollback/mitigation plan, and no merge based on green checks alone.

## 7) PR Review Standard: System-Safe, Not Just Code-OK

Every PR must answer:

1. **Reuse:** Did this change extend canonical logic/types/services instead of recreating them?
2. **Conventions:** Does it preserve tenancy, auth/RBAC, error handling, retries, schemas, contracts, logging, and module boundaries?
3. **Explainability:** Can a human reviewer explain why this is correct, including assumptions and failure behavior?

If any answer is “no” or “unclear,” the PR does not merge.

## 8) Engineering Conventions to Enforce

- One permission-check pattern
- One error-handling pattern
- One retry/idempotency pattern
- One schema validation pattern
- One logging/telemetry pattern
- One integration adapter pattern
- One background job pattern

Enforcement must be automated where possible via lint rules, architecture tests, contract tests, forbidden import checks, dead code detection, and duplicate-code scanning.

## 9) Required PR Template Fields

All repositories should include a PR template requiring:

- canonical module(s) reused
- risk tier and why
- failure modes considered
- retry/idempotency behavior
- tenancy/RBAC impact
- observability added/updated
- test evidence (unit/contract/integration)
- reviewer attestation: “I can explain this change end-to-end.”

## 10) Executive AI Debt Metrics

Track weekly:

- lint suppressions added
- unsafe type count (`any` and equivalent)
- duplicate module/utility findings
- dead exports/unused files
- PRs creating new patterns vs reusing existing ones
- workflow edge-case incidents
- mean time to debug by subsystem
- reviewer explainability confirmation rate
- integration failures by retry/reconciliation category
- mocked-test ratio vs contract/integration ratio

## 11) Adoption Plan (30/60/90)

### 0–30 days

- Publish canonical ownership docs for Tier 0/Tier 1 domains
- Enable PR template and minimum review gates
- Baseline AI debt metrics

### 31–60 days

- Add architecture tests + forbidden import rules
- Add duplicate-code/dead-code checks in CI
- Expand contract/integration coverage for Tier 0/Tier 1 paths

### 61–90 days

- Set SLO-backed targets for reliability and debug time
- Enforce merge blocking on key safety checks
- Review metric trends and tighten guardrails

---

**Standard summary:** BakedBot wins by pairing AI generation speed with strict human-governed system safety.

## Companion Documents

- Daily reviewer policy: `docs/bakedbot-pr-checklist-policy.md`
- Agent implementation spec: `docs/bakedbot-ai-coding-spec.md`
