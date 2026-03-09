# BakedBot Risk Tiers

This document defines the review and testing depth required for different classes of changes.

## Tier 0 — Low Risk

Changes with no meaningful business logic risk.

### Examples

- copy changes
- styling only
- local refactors with unchanged behavior
- docs-only changes
- test readability cleanup

### Requirements

- one reviewer
- behavior unchanged or obvious
- existing tests remain green

---

## Tier 1 — Moderate Risk

Changes with bounded local logic impact.

### Examples

- low-impact dashboard behavior
- internal admin UX
- bounded filtering or display logic
- low-risk feature flag behavior
- non-critical reporting calculations

### Requirements

- reviewer uses the standard checklist
- targeted unit tests or equivalent verification
- no suppression-based shortcuts

---

## Tier 2 — High Risk

Changes affecting workflows, state transitions, integrations, or customer-visible behavior.

### Examples

- automation triggers
- workflow state changes
- notification logic
- role-based behavior
- agent tool side effects
- integration-facing logic
- queue or background job behavior
- analytics events used by product logic

### Requirements

- failure modes documented in PR
- unit tests for logic
- integration or contract tests where relevant
- observability reviewed
- explicit review of retry, duplicate, stale-state, and partial-failure behavior

---

## Tier 3 — Critical Risk

Changes affecting trust, money, security, tenancy, compliance, or irreversible mutation.

### Examples

- auth/session logic
- tenant isolation
- permissions and RBAC
- billing, quotas, and usage metering
- migrations and destructive jobs
- POS or menu mutation
- compliance-sensitive workflows
- prompt/tool changes that can trigger customer-facing actions at scale

### Requirements

- two reviewers or leadership signoff
- explicit invariants listed in PR
- rollback or mitigation plan documented
- no merge based on green checks alone
- no merge if either reviewer cannot explain the risk boundary
- strong test coverage at appropriate layers
- production observability plan required

---

## Risk Tier Selection Rules

When choosing a tier, bias upward when:

- the change mutates production state
- the change affects external systems
- the change affects permissions or tenancy
- the change can cause repeated side effects
- the failure mode is expensive, silent, or hard to detect
- the change is easy to misunderstand during review

If a change spans multiple tiers, classify it by the highest-risk component.

---

## Review Escalation Triggers

Escalate review depth if any of the following appear:

- duplicate ownership of domain logic
- new abstractions without clear necessity
- lint/type suppression
- weak failure-path thinking
- unobservable critical behavior
- unclear permission or tenant boundaries
- author cannot explain the code without AI help

---

## Final Rule

Risk tiers are not paperwork.

They are how BakedBot scales AI-assisted engineering without quietly financing future rework.
