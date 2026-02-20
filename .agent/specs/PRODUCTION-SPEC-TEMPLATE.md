# Production Spec: `[FEATURE_NAME]`

**Last updated:** YYYY-MM-DD
**Spec status:** 🟡 Draft | 🟢 Approved | 🔴 Gaps Identified
**Owner agent(s):** [agent name(s)]
**Tier:** 1 | 2 | 3 | 4

---

## 1. Feature Overview

_What does this feature do? One paragraph, written as if explaining to a new developer._

---

## 2. Current State

_What is shipped and working as of this spec's date._

### Shipped ✅
- [What works]
- [What's integrated]
- [What's tested]

### Partially Working ⚠️
- [What exists but has edge cases or known issues]

### Not Implemented ❌
- [What was planned but not built]

---

## 3. Acceptance Criteria

_These must ALL be true for the feature to be considered production-ready._

### Functional
- [ ] [Behavior: what must be true]
- [ ] [Behavior: edge case handled]
- [ ] [Behavior: error state handled]

### Compliance / Security
- [ ] [Auth: who can access this]
- [ ] [Data: what is logged, what is not]
- [ ] [Compliance: TCPA / age-gate / state rules if applicable]

### Performance
- [ ] [Latency: acceptable threshold]
- [ ] [Availability: degraded mode behavior]

---

## 4. Known Gaps / Tech Debt

_Honest list of what's missing or fragile. These are candidates for future task specs._

| Gap | Severity | Notes |
|-----|----------|-------|
| [description] | 🔴 Critical / 🟡 High / 🟢 Low | [context] |

---

## 5. Test Coverage

### Existing Tests
| Test | Location | Coverage |
|------|----------|---------|
| [test name] | `path/to/test.ts` | [what it validates] |

### Missing Tests (Required for Production-Ready)
- [ ] [Test name] — validates [behavior]
- [ ] [Test name] — validates [edge case]

### Golden Set Eval (LLM/Agent behavior)
| Golden Set | Location | Threshold | Last Run |
|------------|----------|-----------|---------|
| [agent] | `.agent/golden-sets/[agent]-qa.json` | [%] | YYYY-MM-DD |

---

## 6. Dependencies

### Internal
| System | Why needed | Failure mode |
|--------|-----------|-------------|
| [system] | [purpose] | [what happens if it's down] |

### External Services
| Service | Purpose | Fallback |
|---------|---------|---------|
| [service] | [purpose] | [fallback or "none — hard dependency"] |

---

## 7. Degraded Mode

_What should happen if this feature fails?_

- **If [X] is down:** [graceful degraded behavior]
- **If [Y] times out:** [fallback or error message]
- **Data loss risk:** [None / Possible — description]

---

## 8. Open Questions

_Unresolved decisions that need owner input._

1. [Question]
2. [Question]

---

## Revision History

| Date | Author | Change |
|------|--------|--------|
| YYYY-MM-DD | [name] | Initial draft |
