# Golden Sets — BakedBot Agent Eval Suite

> Eval cases for product agents. Engineering agent golden sets live in `.agent/engineering-agents/{agent}/golden-sets/`.

---

## Product Agent Golden Sets

| File | Agent | Cases | Gate |
|------|-------|-------|------|
| `smokey-qa.json` | Smokey (Budtender) | 27 | 90% overall / 100% compliance |
| `craig-campaigns.json` | Craig (Marketer) | 15 | 90% overall / 100% compliance |
| `deebo-compliance.json` | Deebo (Compliance) | 23 | 100% all categories |

## Engineering Agent Golden Sets

| Directory | Agent | Status |
|-----------|-------|--------|
| `.agent/engineering-agents/inbox-mike/golden-sets/` | Inbox Mike | 🔜 Planned |
| `.agent/engineering-agents/onboarding-jen/golden-sets/` | Onboarding Jen | 🔜 Planned |
| `.agent/engineering-agents/sync-sam/golden-sets/` | Sync Sam | 🔜 Planned |

## Running Evals

```bash
# Fast eval (deterministic only, no API cost)
node scripts/run-golden-eval.mjs --agent smokey
node scripts/run-golden-eval.mjs --agent craig
node scripts/run-golden-eval.mjs --agent deebo

# Full eval (LLM tests via Claude Haiku, ~$0.05–0.15/run)
node scripts/run-golden-eval.mjs --agent deebo --full
```

Exit codes: `0` = all pass, `1` = compliance-critical fail (blocks commit), `2` = below threshold.

## Adding Cases

Follow the format in the existing JSON files. Required fields:
- `id`: unique string
- `description`: human-readable description
- `test_type`: `"regex"` | `"llm"` | `"function"`
- `input`: test input
- `expected`: expected output or must_contain/must_not_contain
- `compliance_critical`: `true` if this blocks a commit on failure

Compliance-critical cases (medical claims, minors, age gate) require 100% pass rate. Zero tolerance.
