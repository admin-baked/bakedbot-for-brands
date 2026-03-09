# BakedBot PR Labels

## Purpose

Labels make risk, ownership, and enforcement visible.

They should help reviewers and automation answer three questions immediately:

1. how risky is this change?
2. what area of the system does it affect?
3. what review or CI behavior should apply?

---

## Required Risk Labels

Every PR must have exactly one risk label.

- `risk:tier0`
- `risk:tier1`
- `risk:tier2`
- `risk:tier3`

### Rules

- Only one risk label may be applied.
- The selected label must match the PR template declaration.
- If multiple risk classes are involved, label by the highest-risk component.

---

## Domain Labels

Use one or more as applicable.

- `area:auth`
- `area:tenancy`
- `area:permissions`
- `area:billing`
- `area:integrations`
- `area:automation`
- `area:agents`
- `area:workflows`
- `area:frontend`
- `area:analytics`
- `area:inventory`
- `area:migrations`
- `area:platform`

These labels help route review and measure where risk accumulates.

---

## Review State Labels

- `review:ready`
- `review:needs-changes`
- `review:escalated`
- `review:blocked`

Use these sparingly and only when they add clarity beyond GitHub’s built-in review state.

---

## Enforcement Labels

These labels may be applied automatically or manually when specific conditions are present.

- `gate:needs-second-review`
- `gate:needs-integration-test`
- `gate:critical-path`
- `gate:suppression-added`
- `gate:new-abstraction`
- `gate:needs-observability`

---

## Debt and Quality Labels

Use these when the change reveals or addresses structural debt.

- `debt:duplicate-logic`
- `debt:dead-code`
- `debt:unsafe-types`
- `debt:convention-drift`
- `debt:workflow-risk`
- `debt:test-quality`

These labels are useful for trend tracking and cleanup prioritization.

---

## Suggested Automation Behavior

### On PR open

- require one `risk:*` label
- add `gate:critical-path` if critical files changed
- add `gate:suppression-added` if suppressions are detected
- add `gate:new-abstraction` if PR template says yes

### On Tier 3 PRs

- add `gate:needs-second-review`
- disable auto-merge
- require governance pass and integration/contract validation where applicable

### On critical-path changes

- add relevant `area:*` labels automatically if possible
- require at least one reviewer familiar with the system area

---

## Recommended Ownership Mapping

Map labels to reviewer groups or codeowners where possible.

Examples:

- `area:auth` -> auth/platform owners
- `area:billing` -> commerce/platform owners
- `area:automation` -> workflow/agent owners
- `area:integrations` -> integration owners
- `area:migrations` -> platform/data owners

---

## Final Rule

Labels are not decoration.

At BakedBot, labels are part of engineering governance. They make AI-assisted change risk visible before it becomes expensive.
