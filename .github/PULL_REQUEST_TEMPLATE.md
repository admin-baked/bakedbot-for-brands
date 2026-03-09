# Summary

Describe the user-visible or system-visible behavior change.

# Risk Tier

Choose one:

- [ ] Tier 0 — Low Risk
- [ ] Tier 1 — Moderate Risk
- [ ] Tier 2 — High Risk
- [ ] Tier 3 — Critical Risk

Why is this the correct tier?

# Canonical Reuse

List the existing types, services, utilities, adapters, schemas, UI patterns, workflows, tools, or modules this change reuses.

- Reused modules/patterns:
- Canonical source(s) of truth:

# New Abstractions

Does this PR introduce a new abstraction?

- [ ] No
- [ ] Yes

If yes, explain why reuse or extension of an existing pattern was insufficient.

# Failure Modes

Explain what happens in the following conditions, if applicable:

- missing data
- null or undefined state
- timeout
- retry
- duplicate event
- stale state
- third-party failure
- permission failure
- tenant boundary mismatch
- partial execution

# Verification

What verification was completed?

- [ ] Unit tests
- [ ] Integration tests
- [ ] Contract tests
- [ ] End-to-end tests
- [ ] Manual verification
- [ ] Existing tests remain green

Notes:

# Observability

How will this be debugged in production?

- logs:
- metrics:
- traces:
- audit trail:
- correlation identifiers:

# Explainability

- [ ] I can explain this change end-to-end without AI comments, prompt history, or generated annotations.
- [ ] I can explain the main assumptions.
- [ ] I can explain the failure path.
- [ ] I can explain why this logic belongs in this module.

# Reviewer Checklist

## Reuse

- [ ] This PR reuses or extends a canonical type, service, utility, schema, component, tool, or adapter.
- [ ] No duplicate domain type or helper was introduced.
- [ ] No parallel business logic was introduced across roles or surfaces.

## Conventions

- [ ] Naming matches domain conventions.
- [ ] Module placement matches architecture boundaries.
- [ ] Error handling matches existing patterns.
- [ ] Logging and telemetry match existing patterns.
- [ ] Permission checks happen in the correct layer.
- [ ] Tenant scoping follows canonical rules.

## Correctness

- [ ] No unjustified `eslint-disable`, `any`, unsafe cast, ignored validation, or silent catch was added.
- [ ] Assumptions are explicit.
- [ ] Missing, stale, or invalid data is handled intentionally.
- [ ] Side effects are bounded and predictable.

## Workflow Safety

- [ ] Retry behavior is correct.
- [ ] Duplicate events are handled intentionally.
- [ ] Partial failure behavior is known.
- [ ] Third-party failure behavior is known.
- [ ] Async or background behavior is observable.

## Testing

- [ ] Tests match the selected risk tier.
- [ ] Critical logic is not validated only through shallow mocks.
- [ ] Failure paths are tested where relevant.
- [ ] Repeated execution or idempotency is tested where relevant.

## Explainability

- [ ] The author can explain the code without AI help.
- [ ] I understand why this implementation is safe enough to merge.

## Outcome

- [ ] Approve
- [ ] Approve with follow-up
- [ ] Request changes
- [ ] Escalate for deeper review
