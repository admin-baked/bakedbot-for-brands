# BakedBot Playbooks Implementation Spec

## Purpose

This document turns the BakedBot 12-Factor Agentic Workflows Doctrine into an implementation-ready specification for Playbooks.

A Playbook is a user-authored automation that can be created in natural language and run on a recurring schedule or an event trigger. Each Playbook compiles into a deterministic workflow with explicit stages, artifacts, validations, telemetry, and escalation rules.

This spec is designed to support BakedBot’s core use cases across dispensaries, brands, growers, agencies, and internal operator workflows.

---

# 1. System goals

## Primary goals

1. Translate natural-language automation requests into reliable, inspectable workflow definitions.
2. Ensure every Playbook run is deterministic in control flow and auditable in output.
3. Use language models only where language understanding or judgment is beneficial.
4. Support recurring schedules, event-based triggers, and mixed trigger modes.
5. Make validation, replay, rollback, and operator review first-class.
6. Support both customer-facing automations and internal BakedBot automations.

## Non-goals

1. Do not make Playbooks free-form agent loops with no stage boundaries.
2. Do not hide business-critical rules inside prompts only.
3. Do not require humans to glue together predictable system steps.
4. Do not optimize for total agent activity over business outcomes.

---

# 2. Core architecture

Every Playbook has five layers:

1. **Intent Layer** — natural language request, user-edited settings, constraints
2. **Compiled Spec Layer** — structured workflow definition
3. **Execution Layer** — deterministic state machine and stage handlers
4. **Validation Layer** — policy checks, confidence checks, source checks, delivery checks
5. **Observation Layer** — artifacts, telemetry, logs, diff views, rollback, replay

## High-level execution flow

```text
Natural language request
  -> intent parser
  -> clarifier (only if needed)
  -> workflow compiler
  -> persisted Playbook spec
  -> scheduler/event trigger
  -> run coordinator
  -> stage executors
  -> validation harness
  -> approval routing or auto-delivery
  -> artifact persistence + telemetry
```

---

# 3. Canonical Playbook state machine

## Required states

1. `draft`
2. `needs_clarification`
3. `compiled`
4. `active`
5. `paused`
6. `archived`
7. `error`

## Run-level states

1. `queued`
2. `resolving_scope`
3. `extracting_questions`
4. `assembling_context`
5. `generating_output`
6. `validating`
7. `awaiting_approval`
8. `delivering`
9. `completed`
10. `failed`
11. `rolled_back`

## Transition rules

* `draft -> needs_clarification` when critical fields are missing
* `draft -> compiled` when spec is complete
* `compiled -> active` when enabled
* `active -> paused` by user or system rule
* `active -> error` on repeated run failures
* `queued -> resolving_scope` when trigger fires and rate limits allow
* `validating -> awaiting_approval` when confidence below threshold or policy demands review
* `validating -> delivering` when checks pass and approval is not required
* `failed -> queued` on stage retry
* `completed -> rolled_back` only for reversible output types

---

# 4. Canonical Playbook object model

## 4.1 Playbook

```json
{
  "playbook_id": "pb_01JXYZ...",
  "name": "weekday_gummy_watch",
  "display_name": "Weekday Gummy Competitor Watch",
  "description": "Monitor nearby competitors for gummy pricing and promo changes every weekday morning.",
  "owner_id": "usr_123",
  "workspace_id": "ws_456",
  "status": "active",
  "autonomy_level": "managed_autopilot",
  "trigger": {
    "type": "schedule",
    "schedule": {
      "frequency": "weekday",
      "time_local": "08:00",
      "timezone": "America/Chicago"
    }
  },
  "scope": {
    "entity_type": "dispensary",
    "entity_id": "store_thrive_syracuse",
    "competitors": [
      "cmp_001",
      "cmp_002",
      "cmp_003"
    ],
    "categories": ["gummies"],
    "radius_miles": 25
  },
  "objectives": [
    "detect_new_brands",
    "detect_discount_gt_threshold",
    "detect_bogo_promos"
  ],
  "inputs": {
    "source_connectors": ["menu_monitor", "promo_scraper", "internal_catalog"],
    "customer_context_refs": ["brand_guide", "store_profile", "policy_bundle"]
  },
  "outputs": {
    "deliverables": ["sms_summary", "dashboard_report"],
    "destinations": ["dashboard", "email", "slack"]
  },
  "approval_policy": {
    "mode": "escalate_on_low_confidence",
    "required_for": ["policy_violation", "source_conflict"],
    "confidence_threshold": 0.78
  },
  "policy_bundle_id": "pol_789",
  "telemetry_profile": "default_ops",
  "version": 3,
  "created_at": "2026-03-12T10:00:00Z",
  "updated_at": "2026-03-12T10:30:00Z"
}
```

## 4.2 Run

```json
{
  "run_id": "run_01JXYZ...",
  "playbook_id": "pb_01JXYZ...",
  "status": "validating",
  "trigger_event": {
    "type": "schedule",
    "fired_at": "2026-03-13T13:00:00Z",
    "source_ref": "sched_abc"
  },
  "resolved_scope": {
    "store_id": "store_thrive_syracuse",
    "competitor_ids": ["cmp_001", "cmp_002", "cmp_003"],
    "categories": ["gummies"]
  },
  "stage_statuses": {
    "resolving_scope": "completed",
    "extracting_questions": "completed",
    "assembling_context": "completed",
    "generating_output": "completed",
    "validating": "running"
  },
  "confidence": 0.84,
  "artifacts": [
    "art_001",
    "art_002",
    "art_003"
  ],
  "alerts": [],
  "delivery_status": "pending",
  "started_at": "2026-03-13T13:00:02Z",
  "completed_at": null
}
```

## 4.3 Artifact

```json
{
  "artifact_id": "art_001",
  "run_id": "run_01JXYZ...",
  "stage": "assembling_context",
  "type": "research_pack_markdown",
  "path": "runs/2026/03/13/run_01JXYZ/research_pack.md",
  "checksum": "sha256:...",
  "created_at": "2026-03-13T13:02:10Z",
  "metadata": {
    "word_count": 1820,
    "source_count": 14,
    "model": "gpt-5.4-thinking"
  },
  "source_refs": ["src_1", "src_2", "src_3"]
}
```

## 4.4 Policy Bundle

```json
{
  "policy_bundle_id": "pol_789",
  "name": "thrive_syracuse_default",
  "jurisdiction": "NY",
  "channel_rules": {
    "sms": {
      "max_length": 320,
      "require_opt_in": true
    },
    "email": {
      "require_footer": true
    }
  },
  "content_rules": {
    "blocked_claims": [
      "medical efficacy claims",
      "guaranteed outcomes",
      "youth-targeted language"
    ],
    "required_disclaimers": [
      "21+ only",
      "keep out of reach of children"
    ]
  },
  "brand_rules": {
    "tone": ["confident", "clear", "helpful"],
    "avoid": ["hype-heavy slang", "overclaiming"]
  },
  "alert_thresholds": {
    "price_drop_pct": 15,
    "confidence_floor": 0.78
  },
  "version": 5
}
```

---

# 5. Natural-language to Playbook compiler

## 5.1 Compiler responsibilities

The compiler must convert user-authored natural language into a fully structured Playbook spec.

### Input example

"Every weekday at 8 AM, watch three local dispensaries and tell me if they add new gummy brands, discount anything over 15%, or launch a BOGO. Send me a short text and a longer dashboard report."

### Compiler outputs

1. Parsed intent
2. Missing field list
3. Clarifying questions, only if required
4. Structured spec draft
5. Risk classification
6. Recommended autonomy level

## 5.2 Compiler phases

### Phase A — Intent parsing

Extract:

* schedule
* monitored entities
* categories
* events of interest
* thresholds
* deliverables
* destinations
* implied persona

### Phase B — Gap detection

Detect missing critical fields such as:

* competitor list
* location/radius
* report destinations
* business entity in scope
* escalation preferences

### Phase C — Clarification policy

Only ask follow-ups when a field is critical and cannot be inferred safely.

### Phase D — Spec synthesis

Generate the canonical Playbook object.

### Phase E — Safety and feasibility classification

Determine:

* whether the workflow is supported
* whether connectors exist
* whether human approval is required
* whether the request should be simplified into a tracer-bullet version first

## 5.3 Clarification strategy

Ask at most the minimum required questions.

Examples:

* "Which three competitors should I track?"
* "Should I use stores within 25 miles of Thrive Syracuse if you don’t specify names?"
* "Where should the short alert go: text, Slack, or email?"

Avoid asking questions when safe defaults exist.

---

# 6. Standard stage contract

Every stage executor should implement the same contract.

## 6.1 Stage input

```json
{
  "run_id": "run_01JXYZ...",
  "playbook_spec": {},
  "prior_artifacts": [],
  "resolved_scope": {},
  "policy_bundle": {},
  "execution_context": {
    "attempt": 1,
    "max_retries": 2,
    "triggered_at": "2026-03-13T13:00:00Z"
  }
}
```

## 6.2 Stage output

```json
{
  "status": "completed",
  "next_state": "assembling_context",
  "artifacts_created": ["art_004"],
  "metrics": {
    "duration_ms": 1832,
    "token_input": 4200,
    "tokenOutput": 1100
  },
  "confidence": 0.88,
  "alerts": []
}
```

## 6.3 Failure output

```json
{
  "status": "failed",
  "next_state": "failed",
  "error": {
    "code": "SOURCE_TIMEOUT",
    "message": "Competitor menu connector timed out for 2 of 3 sources"
  },
  "retryable": true,
  "recommended_action": "retry_stage"
}
```

---

# 7. Validation harness specification

Validation must be modular and explicit.

## 7.1 Required validators

### Source integrity validator

Checks:

* all named entities exist in source set
* numeric values are parseable
* source timestamps are fresh enough
* category mappings are valid

### Schema validator

Checks:

* JSON shape validity
* required keys present
* enumerations valid
* destination payload shape valid

### Policy validator

Checks:

* required disclaimers present
* blocked claims absent
* channel-specific rules respected
* store-specific exclusions respected

### Confidence validator

Checks:

* model confidence above floor
* source conflict count below limit
* low-confidence spans flagged

### Delivery validator

Checks:

* all referenced assets exist
* all destinations reachable
* summaries fit channel length constraints

### Duplication validator

Checks:

* output not materially duplicative of recent outputs when uniqueness is required

## 7.2 Validation result object

```json
{
  "run_id": "run_01JXYZ...",
  "overall_status": "pass_with_warnings",
  "validators": [
    {
      "name": "source_integrity",
      "status": "pass"
    },
    {
      "name": "policy",
      "status": "warning",
      "issues": [
        {
          "code": "DISCLAIMER_MISSING",
          "message": "Required footer disclaimer missing from email variant"
        }
      ]
    }
  ],
  "requires_approval": true,
  "confidence": 0.76
}
```

---

# 8. Telemetry specification

Every run and stage should produce telemetry.

## 8.1 Required run-level telemetry

* playbook_id
* run_id
* trigger_type
* schedule vs event origin
* total duration
* status
* human intervention count
* validation result summary
* delivery result summary
* artifact count
* retry count

## 8.2 Required stage-level telemetry

* stage_name
* stage_duration_ms
* model_used
* tokens_in
* tokens_out
* tool_calls
* connector_calls
* failures
* warnings
* confidence

## 8.3 Business telemetry where applicable

* opens
* clicks
* acknowledged alerts
* manual edit rate
* publish acceptance rate
* downstream conversion markers

---

# 9. Human-in-the-loop rules

## 9.1 Approval routing triggers

Route for review when:

* confidence below threshold
* source conflict exceeds threshold
* policy violation found
* Playbook version changed recently
* new connector introduced
* output affects public channels in high-risk mode
* customer explicitly selected guided review

## 9.2 Reviewer actions

Reviewer must be able to:

* approve as-is
* edit output
* reject and retry stage
* lower or raise autonomy for this run
* pause Playbook
* compare with previous run

## 9.3 Review artifact view

Review UI should show:

* trigger summary
* resolved scope
* draft output
* validation report
* source snippets or source references
* differences from previous run
* recommended next action

---

# 10. Canonical prompts by stage

Prompts must be short, role-specific, and stage-bounded.

## 10.1 Intent parser prompt

Goal: convert free text into structured intent fields.

## 10.2 Question extractor prompt

Goal: turn intent into objective questions without solution bias.

## 10.3 Context assembler prompt

Goal: summarize relevant source material and structured diffs into a compact research pack.

## 10.4 Strategy generator prompt

Goal: generate ranked options or a recommended output based only on the compiled scope and research pack.

## 10.5 Output generator prompt

Goal: generate the specific deliverables in required formats.

## 10.6 Validation explainer prompt

Goal: explain warnings or failures in plain language for the reviewer.

Important rule:
No prompt should contain the entire workflow logic. Workflow logic belongs in code.

---

# 11. Canonical Playbook templates

## 11.1 Daily Competitive Intelligence Report

### Goal

Produce a daily report comparing competitor menu, pricing, promos, and merchandising changes.

### Trigger

Scheduled daily.

### Inputs

* competitor menu snapshots
* yesterday vs today promo diffs
* category priorities
* customer store profile

### Outputs

* executive summary
* dashboard detail report
* optional Slack alert when threshold exceeded

### Required artifacts

* `competitor_snapshot.json`
* `menu_diff.json`
* `promo_diff.json`
* `daily_ci_report.md`
* `recommendations.json`
* `validation_report.json`

### Special validators

* stale source check
* scrape anomaly check
* unsupported recommendation grounding check

### Example compiled spec

```json
{
  "playbook_type": "daily_competitive_intelligence",
  "autonomy_level": "managed_autopilot",
  "trigger": {
    "type": "schedule",
    "schedule": {
      "frequency": "daily",
      "time_local": "07:00",
      "timezone": "America/Chicago"
    }
  },
  "scope": {
    "store_id": "store_thrive_syracuse",
    "competitor_ids": ["verilife_liverpool", "rise_liverpool", "flynnstoned"],
    "categories": ["flower", "vapes", "gummies", "prerolls", "beverages"]
  },
  "thresholds": {
    "price_change_pct": 8,
    "promo_significance_score": 0.65
  },
  "deliverables": ["email_summary", "dashboard_report", "slack_alert_on_threshold"]
}
```

## 11.2 Weekly Executive Competitor Summary

### Goal

Aggregate the week’s changes into an executive brief with strategic recommendations.

### Differences from daily CI

* weekly aggregation window
* stronger trend synthesis
* strategy emphasis over raw diffs

### Outputs

* weekly executive brief
* category-level pressure summary
* top 3 actions for next week

## 11.3 Product Drop Campaign Playbook

### Goal

When new SKUs arrive, generate launch-ready assets across selected channels.

### Trigger

Event-driven on inventory/new SKU detection.

### Inputs

* SKU metadata
* inventory status
* brand guide
* policy bundle
* target channels

### Outputs

* email draft
* SMS draft
* menu copy
* social captions
* optional landing page copy

### Required validations

* prohibited claims
* missing product data
* channel eligibility
* duplicate launch detection

### Example compiled spec

```json
{
  "playbook_type": "product_drop_campaign",
  "trigger": {
    "type": "event",
    "event_name": "new_sku_detected"
  },
  "scope": {
    "store_id": "store_thrive_syracuse",
    "sku_filter": {
      "categories": ["edibles", "beverages"],
      "min_inventory_units": 10
    }
  },
  "deliverables": ["email", "sms", "menu_copy", "social"],
  "approval_policy": {
    "mode": "required_for_first_run_and_policy_warnings"
  }
}
```

## 11.4 Daily Menu Spotlight Playbook

### Goal

Promote a rotating set of products based on inventory, margin, and campaign priorities.

### Trigger

Daily schedule.

### Deterministic logic

* select eligible products by rules
* filter out compliance-ineligible items
* avoid repeats within cooldown window

### AI logic

* generate fresh copy variants
* rank messaging angles
* produce concise channel-specific versions

## 11.5 Recurring SEO Refresh Playbook

### Goal

Refresh key category and collection pages monthly using inventory reality and search priorities.

### Trigger

Monthly schedule.

### Deterministic logic

* identify stale pages
* gather current inventory/category context
* preserve template constraints
* preserve legal blocks

### AI logic

* rewrite descriptions
* generate FAQ ideas
* improve headings and metadata

### Validators

* URL and template integrity
* policy compliance
* required content block presence

---

# 12. Scheduling and trigger specification

## 12.1 Supported trigger types

* `schedule_daily`
* `schedule_weekday`
* `schedule_weekly`
* `schedule_monthly`
* `inventory_change`
* `new_product_detected`
* `promotion_detected`
* `price_change_detected`
* `manual_run`
* `webhook`

## 12.2 Schedule object

```json
{
  "frequency": "weekly",
  "day_of_week": "monday",
  "time_local": "08:00",
  "timezone": "America/Chicago",
  "skip_holidays": false
}
```

## 12.3 Event trigger object

```json
{
  "type": "event",
  "event_name": "price_change_detected",
  "filters": {
    "category": ["gummies"],
    "threshold_pct": 15
  },
  "debounce_window_minutes": 30
}
```

---

# 13. Replay, rollback, and versioning

## 13.1 Replay

A user or operator should be able to rerun:

* entire run with same inputs
* only failed stage
* same run with updated policy bundle
* same run with upgraded Playbook version

## 13.2 Rollback

Rollback should be supported for:

* dashboard publications
* queued outbound messages not yet sent
* staged asset publication

Rollback should not be assumed for:

* already sent SMS/email
* third-party irreversible actions

## 13.3 Versioning

Version these independently:

* Playbook spec version
* policy bundle version
* prompt pack version
* connector schema version
* validation rule version

---

# 14. Recommended storage layout

```text
/playbooks/{playbook_id}/spec.json
/playbooks/{playbook_id}/versions/{version}.json
/runs/{yyyy}/{mm}/{dd}/{run_id}/run.json
/runs/{yyyy}/{mm}/{dd}/{run_id}/artifacts/*
/runs/{yyyy}/{mm}/{dd}/{run_id}/validation_report.json
/runs/{yyyy}/{mm}/{dd}/{run_id}/telemetry.json
/policies/{policy_bundle_id}/versions/{version}.json
```

---

# 15. API surface recommendation

## 15.1 Public operations

* Create Playbook from natural language
* Update Playbook settings
* Pause/resume Playbook
* List runs
* Inspect run
* Approve/reject run
* Retry failed run or stage
* Compare runs

## 15.2 Internal operations

* compile_playbook
* resolve_scope
* extract_questions
* assemble_context
* generate_output
* run_validation
* deliver_output
* persist_artifacts
* emit_telemetry

---

# 16. Tracer-bullet implementation plan

## Phase 1

Build one full vertical slice for a single Playbook type:

* Daily Competitive Intelligence Report

Deliver:

* natural language to compiled spec
* daily scheduler
* source normalization for competitor menus/promos
* report generation
* validation report
* dashboard delivery
* run inspection view

## Phase 2

Add:

* approval routing
* Slack/email delivery
* replay and retry
* policy bundles
* confidence scoring

## Phase 3

Add second and third Playbooks:

* Product Drop Campaign
* Weekly Executive Competitor Summary

## Phase 4

Add generalized Playbook builder and template library.

---

# 17. Build rules for agents and engineers

When implementing any new Playbook:

1. Define the trigger clearly.
2. Define deterministic scope resolution.
3. Write the question extraction contract.
4. Define artifacts per stage.
5. Define validators before prompt tuning.
6. Set approval policy explicitly.
7. Add telemetry before scaling usage.
8. Build replay and compare support early.
9. Start with tracer-bullet depth, then widen.
10. Never let a single prompt silently own the workflow.

---

# 18. Final implementation statement

A Playbook is not a clever prompt with a cron job.

A Playbook is a **compiled, deterministic automation** with:

* explicit stages
* structured artifacts
* bounded model responsibilities
* policy-aware validation
* confidence-aware delivery
* operator-grade observability

That is the implementation standard BakedBot should use to make autonomous marketing workflows reliable enough for real operators.
