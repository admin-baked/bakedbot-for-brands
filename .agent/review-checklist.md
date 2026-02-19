# Review Checklist — `.agent/review-checklist.md`

> **Rule:** After implementation is complete, the agent runs this checklist BEFORE committing.
> Every item must pass. Any failure blocks the commit until resolved.
> This is the Reviewer Agent role (Constitution §III).

---

## Pre-Commit Review Gate

**Task:** `[FEATURE_NAME]`
**Date:** YYYY-MM-DD
**Builder:** Claude Code session
**Reviewer:** Self-review (automated)

---

### A. Scope Compliance

- [ ] **Diff stays within spec.** No files modified that weren't listed in the approved spec.
- [ ] **Diff ≤ 400 lines.** If exceeded → split into sequential PRs per Constitution §II.
- [ ] **No scope creep.** Unrelated fixes, refactors, or "while I'm here" changes are prohibited. File them as separate tasks.

### B. Code Quality

- [ ] **Error handling present.** Every external call (API, DB, file I/O) has try/catch or equivalent. No bare `throw`.
- [ ] **Structured logging added.** New code paths emit logs with context (userId, locationId, action, timestamp). No `console.log` in production paths.
- [ ] **Type safety maintained.** No `any` types introduced. Interfaces/types defined for new data shapes.
- [ ] **No hardcoded secrets or config.** Environment variables or config files used. Zero credentials in code.
- [ ] **Null/undefined handled.** Defensive checks on external data. Optional chaining where appropriate.

### C. Architecture Boundaries

- [ ] **No cross-layer violations.** UI doesn't call DB directly. Services don't import UI components. Agent logic doesn't bypass the policy engine.
- [ ] **No unauthorized dependencies.** New packages were listed in the spec. No surprise `npm install` or `pip install`.
- [ ] **API contracts preserved.** Existing endpoints maintain backward compatibility or are versioned.
- [ ] **Separation of concerns.** Business logic isn't embedded in route handlers or UI components.

### D. Testing

- [ ] **Tests written and passing.** Every new function/endpoint has at least one test.
- [ ] **No test regressions.** Full suite runs clean. Zero new failures.
- [ ] **Edge cases covered.** Empty inputs, null values, boundary conditions, unauthorized access attempts.
- [ ] **Golden set eval (if applicable).** LLM/prompt changes validated against `.agent/golden-sets/[agent]-qa.json`. Score meets threshold (≥90% overall, 100% compliance).

### E. Compliance & Safety (Cannabis-Specific)

- [ ] **Age-gate logic untouched or validated.** If modified, verified against state rules (IL/MI/CA/NY/OH).
- [ ] **Deebo checks intact.** Compliance filtering runs before any customer-facing output.
- [ ] **Marketing content passes TCPA/CTIA rules.** Opt-in/opt-out flows preserved. No unsupervised campaign sends.
- [ ] **No medical claims.** Product descriptions and recommendations avoid therapeutic promises.

### F. Observability

- [ ] **Audit trail maintained.** Autonomous actions produce structured records (input, policy checks, output, recipient, timestamp).
- [ ] **Errors are actionable.** Error messages include enough context to debug without reproducing.
- [ ] **Metrics/dashboards updated.** If new feature is measurable, tracking is wired up.

### G. Documentation

- [ ] **Code comments on "why" not "what."** Complex logic has explanation. Obvious code doesn't have noise comments.
- [ ] **MEMORY.md updated.** Session details, gotchas, decisions recorded.
- [ ] **README or docs updated (if applicable).** New features, config changes, or API endpoints documented.

---

## Verdict

| Result | Action |
|---|---|
| ✅ All pass | Proceed to commit + update session notes |
| ⚠️ Minor issues (1-2 non-critical) | Fix before commit, note in MEMORY.md |
| 🔴 Any critical failure | STOP. Do not commit. Report failure and remediation plan |

**Critical failures (auto-block):**
- Compliance check failed (Section E)
- Test regressions (Section D)
- Scope violation (Section A)
- Secrets in code (Section B)

---

## Commit Message Format

```
type(scope): brief description

- What changed (1-2 lines)
- Why (business context)
- Test results: [pass/fail count]

Spec: .agent/specs/[FEATURE_NAME].md
```

**Types:** `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `hotfix`

---

_After all checks pass, proceed to Stage 5 (Ship + Record) per `.agent/prime.md` Workflow Protocol._
