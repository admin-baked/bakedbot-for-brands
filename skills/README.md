# BakedBot Skills Repository

Agent-readable, human-legible operating procedures for the BakedBot platform.

## What is a skill?

A skill is a reusable, versioned methodology that helps an agent or human produce a bounded, predictable
output. Skills encode expertise — they are not prompts, not scripts, not workflows.

**Use a skill when:** the task requires judgment, synthesis, structured reasoning, or patterned methodology.
**Use a script/service when:** the task requires deterministic execution, strict thresholds, or hard guarantees.
**Use a workflow/state machine when:** the task spans multiple steps, approvals, deadlines, or ownership transitions.

## Folder Structure

```
skills/
  org/                        # Layer 1: Org-standard skills (universal across all tenants)
    brand-voice/
    compliance-style/
  shared/                     # Cross-role utility skills
    anomaly-to-action-memo/
    executive-brief/
  dispensary/                 # Layer 2: Dispensary operator pack
    daily-dispensary-ops-review/
    menu-gap-analysis/
    low-performing-promo-diagnosis/
    loyalty-reengagement-opportunity-review/
  brand/                      # Layer 2: Brand operator pack
    retail-account-opportunity-review/
    competitor-promo-watch/
  grower/                     # Layer 2: Grower pack
    inventory-aging-risk-review/
    sell-through-partner-analysis/
```

Each skill folder contains:
- `SKILL.md` — required. Full skill definition with metadata and all anatomy sections.
- `examples/` — optional. Sample outputs showing what "good" looks like.
- `fixtures/` — optional. Eval input cases for testing trigger and output quality.
- `CHANGELOG.md` — optional. Required for high-risk or widely-shared skills.

## Skill anatomy (required sections in SKILL.md)

1. YAML frontmatter (name, description, version, owner, agent_owner, allowed_roles, outputs, requires_approval, risk_level, status, approval_posture)
2. Purpose
3. When to use
4. When NOT to use
5. Required inputs
6. Reasoning approach
7. Output contract
8. Edge cases
9. Escalation rules
10. Compliance notes

## Approval postures

| Posture | Meaning |
|---------|---------|
| `inform_only` | Output is FYI; no action expected |
| `draft_only` | Output is a draft; human reviews before use |
| `recommend_only` | Output is a recommendation; human decides |
| `execute_within_limits` | Agent can act within defined bounds |
| `always_escalate` | All outputs require human sign-off |

## Risk levels and governance

| Risk | Examples | Requirements |
|------|---------|-------------|
| Low | note cleanup, formatting, internal briefing | owner, basic eval, spot review |
| Medium | campaign recommendations, competitor summaries | owner, contract tests, role review, output sampling |
| High | compliance review, regulated outreach, revenue-impacting recommendations | named owner + reviewer, policy tests, approval policy, gated deployment, monitoring |

## Rollout phases

**Phase 1 (Foundation) — current:**
- [x] `org/brand-voice`
- [x] `shared/executive-brief`
- [x] `shared/anomaly-to-action-memo`
- [x] `deebo-compliance` (in `.claude/commands/`)

**Phase 2 (Dispensary core) — current:**
- [x] `dispensary/daily-dispensary-ops-review`
- [x] `dispensary/menu-gap-analysis`
- [x] `dispensary/low-performing-promo-diagnosis`
- [x] `dispensary/loyalty-reengagement-opportunity-review`

**Phase 3 (Brand + grower core) — current:**
- [x] `brand/retail-account-opportunity-review`
- [x] `brand/competitor-promo-watch`
- [x] `grower/inventory-aging-risk-review`
- [x] `grower/sell-through-partner-analysis`

## Agent ownership map

| Agent | Owns |
|-------|------|
| Smokey | Product recommendation, menu interpretation, customer education |
| Craig | Campaign planning, copy generation, channel adaptation |
| Pops | Performance analysis, KPI summaries, executive briefing |
| Ezal | Competitor intel, market monitoring, pricing watch |
| Money Mike | Price/margin analysis, discount impact, price recommendations |
| Mrs. Parker | Loyalty, VIP, retention, welcome emails, customer journey |
| Deebo | Compliance review, risk flags, policy checks, regulated output gating |

## Naming conventions

- Hyphenated lowercase: `daily-dispensary-ops-review`
- Name for the business job, not a vague category
- Prefer explicit outputs: `inventory-aging-risk-review` not `inventory-analysis`

## Eval minimum bar (before production use)

- 10–20 representative trigger cases
- 10 output quality fixtures
- 5 edge-case tests
- 1 policy-risk test (for any skill touching regulated content)
- Clear pass/fail rubric

See `.agent/refs/testing.md` for the test harness design.
