## BakedBot PR Header (Required)

### Summary

- What changed in user-visible or system-visible terms?

### Risk Tier

- [ ] Tier 0 — Low Risk
- [ ] Tier 1 — Moderate Risk
- [ ] Tier 2 — High Risk
- [ ] Tier 3 — Critical Risk

Why is this the correct tier?

### Canonical Reuse

- Existing types/services/utilities/adapters/schemas/UI patterns/workflows/tools/modules reused:
- Canonical source(s) of truth:

### New Abstractions

- [ ] No new abstraction introduced
- [ ] Yes (explain why reuse/extension was insufficient)

### Failure Modes

- Behavior on missing data:
- null/undefined state:
- timeout:
- retry:
- duplicate event:
- stale state:
- third-party failure:
- permission failure:
- tenant boundary mismatch:
- partial execution:

### Verification

- [ ] Unit
- [ ] Integration
- [ ] Contract
- [ ] E2E
- [ ] Manual verification
- [ ] Existing tests remain green

Commands and outputs:

### Observability

- logs:
- metrics:
- traces:
- audit trail:
- correlation identifiers:

### Explainability

- [ ] I can explain the full flow without AI comments, prompt history, or generated annotations.
- [ ] I can explain key assumptions and failure behavior.
- [ ] I can explain why this logic belongs in this module.

---

## BakedBot System-Safety Checklist

### Reuse

- [ ] This extends/reuses canonical modules and does not create parallel ownership.
- [ ] No duplicate domain type or helper was introduced.
- [ ] No parallel business logic was introduced across roles or surfaces.

### Conventions

- [ ] Naming, placement, error handling, logging, permission, tenancy, and retry/idempotency conventions are preserved.

### Correctness

- [ ] No unjustified `eslint-disable`, `any`, unsafe cast, or silent catch added.
- [ ] Edge/failure behavior is explicit.
- [ ] Side effects are bounded and predictable.

### Workflow Safety

- [ ] Retry behavior is correct.
- [ ] Duplicate events are handled intentionally.
- [ ] Partial/third-party failure behavior is known.
- [ ] Async/background behavior is observable.

### Observability

- [ ] Logs/metrics/traces are sufficient for production debugging.

### Human Review

- [ ] Reviewer confirms system impact and failure behavior are understood.

### Outcome

- [ ] Approve
- [ ] Approve with follow-up
- [ ] Request changes
- [ ] Escalate for deeper review
