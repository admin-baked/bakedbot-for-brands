# Summary
- What changed in user-visible or system-visible terms?

# Risk Tier
- Select exactly one: `risk:tier0` | `risk:tier1` | `risk:tier2` | `risk:tier3`
- Chosen label: `risk:tier1`
- Rationale for this tier.

# Canonical Reuse
- Existing types/services/utilities/adapters/schemas/UI patterns/workflows/tools/modules reused.
- Why reuse was preferred over new code paths.

# New Abstractions
- Any new abstraction introduced? If yes, why was reuse insufficient?

# Failure Modes
- Behavior on missing data, timeout, retry, duplicate event, stale state, third-party failure, permission failure.

# Verification
- [ ] Unit
- [ ] Integration
- [ ] Contract
- [ ] E2E
- [ ] Manual verification
- Commands and outputs:

# Observability
- How this change will be debugged in production.

# Explainability
- [ ] I can explain the full flow without AI comments, prompt history, or generated annotations.

---

## BakedBot System-Safety Checklist

### Reuse
- [ ] This extends/reuses canonical modules and does not create parallel ownership.

### Conventions
- [ ] Naming, placement, error handling, logging, permission, tenancy, and retry/idempotency conventions are preserved.

### Correctness
- [ ] No unjustified `eslint-disable`, `any`, unsafe cast, or silent catch added.
- [ ] Edge/failure behavior is explicit.

### Observability
- [ ] Logs/metrics/traces are sufficient for production debugging.

### Human Review
- [ ] Reviewer confirms they understand system impact and failure behavior.
