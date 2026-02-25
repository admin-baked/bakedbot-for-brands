# Prompt Regression Testing Spec

> Framework for preventing prompt quality regressions before they ship to production.

**Status:** Spec | **Owner:** Linus (CTO) | **Date:** 2026-02-25

---

## Problem

When agent prompts change (system prompts, grounding rules, tool descriptions), there's no automated way to verify that quality hasn't degraded. We've observed:
- Super power context getting lost after prompt restructuring
- Compliance accuracy dropping after prompt changes
- Response quality varying between model versions

## Solution: `npm run test:prompts` Super Power

### Golden Set Eval Framework

Before any prompt change ships to main:

1. **Run golden set eval** against the affected agent(s)
2. **Compare scores** to stored baseline in `.agent/golden-sets/baselines.json`
3. **Block merge** if any dimension drops > 5% from baseline
4. **Record new baseline** after approved changes

### Existing Golden Sets

| Agent | Golden Set File | Eval Dimensions | Baseline Target |
|-------|----------------|-----------------|-----------------|
| Smokey | `.agent/golden-sets/smokey-qa.json` | Relevance, Compliance, Helpfulness | ≥90% overall, 100% compliance |
| Craig | `.agent/golden-sets/craig-campaigns.json` | Copy quality, Compliance, CTA clarity | ≥85% overall |
| Deebo | `.agent/golden-sets/deebo-compliance.json` | Detection accuracy, False positive rate | ≥95% detection, <5% FP |

### New Golden Sets Needed

| Agent | Golden Set | Priority | Eval Dimensions |
|-------|-----------|----------|-----------------|
| Linus | `linus-cto-eval.json` | High | Tool selection accuracy, Super power usage, Grounding adherence |
| Leo | `leo-ops-eval.json` | Medium | Delegation accuracy, Operational decision quality |
| All | `super-powers-recall.json` | High | Given 10 scenarios, does agent use appropriate super power? |

### `super-powers-recall.json` Eval Format

```json
{
  "evalName": "super-powers-recall",
  "version": "1.0",
  "scenarios": [
    {
      "id": "sp-recall-01",
      "prompt": "The build is failing with TypeScript errors across multiple files",
      "expectedTool": "execute_super_power",
      "expectedScript": "fix-build",
      "passCriteria": "Agent uses execute_super_power with script=fix-build within first 3 tool calls"
    },
    {
      "id": "sp-recall-02",
      "prompt": "I think our Firestore data might have some schema inconsistencies",
      "expectedTool": "execute_super_power",
      "expectedScript": "audit-schema",
      "passCriteria": "Agent uses execute_super_power with script=audit-schema within first 3 tool calls"
    },
    {
      "id": "sp-recall-03",
      "prompt": "Can you check if our security roles are properly configured?",
      "expectedTool": "execute_super_power",
      "expectedScript": "test-security",
      "passCriteria": "Agent uses execute_super_power with script=test-security within first 3 tool calls"
    }
  ]
}
```

### CI Integration

```yaml
# .github/workflows/prompt-regression.yml (future)
name: Prompt Regression Check
on:
  pull_request:
    paths:
      - 'src/ai/claude.ts'
      - 'src/server/agents/**'
      - '.agent/golden-sets/**'

jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test:prompts
      - name: Compare baselines
        run: node scripts/compare-eval-baselines.mjs
```

### Baseline Storage

```json
// .agent/golden-sets/baselines.json
{
  "smokey-qa": {
    "lastUpdated": "2026-02-25",
    "commit": "abc123",
    "scores": {
      "relevance": 0.92,
      "compliance": 1.00,
      "helpfulness": 0.88,
      "overall": 0.93
    }
  },
  "super-powers-recall": {
    "lastUpdated": "2026-02-25",
    "commit": "abc123",
    "scores": {
      "recall_within_3_calls": 0.90,
      "correct_script_selection": 0.95
    }
  }
}
```

## Acceptance Criteria

- [ ] `npm run test:prompts` runs all golden set evals and reports scores
- [ ] Baseline comparison script flags regressions > 5%
- [ ] `super-powers-recall.json` golden set created with 10+ scenarios
- [ ] CI workflow triggers on prompt-related file changes
- [ ] Baselines auto-updated after approved prompt changes

## Out of Scope (v1)

- A/B testing framework for prompts in production
- Automated prompt optimization
- Multi-model comparison (Sonnet vs Opus quality)
