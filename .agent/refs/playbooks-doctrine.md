# BakedBot 12-Factor Agentic Workflows Doctrine

## Purpose

BakedBot should operate as an **agentic marketing operating system** for the legal cannabis industry, not as a collection of giant prompts. The system should use deterministic workflow control for known business processes and reserve language models for judgment-heavy steps such as synthesis, rewriting, ranking, and ambiguity resolution.

This doctrine translates the core idea behind “12 factor agents” into a BakedBot operating model for Playbooks, competitive intelligence, campaign generation, content production, compliance-aware marketing, and recurring automations.

## Why this matters for BakedBot

BakedBot positions itself as a provider of **autonomous AI marketing agents for the legal cannabis industry**, with an emphasis on **precision, creativity, and compliance**. Those qualities require more than generation quality. They require reliable workflow design, structured artifacts, auditability, and controlled autonomy.

In BakedBot, the workflow itself should be treated as product.

## Core principle

**Deterministic control flow, probabilistic intelligence.**

This means:

* Workflow state transitions should be code.
* Scheduling, retries, escalation rules, and approvals should be code.
* Compliance checks and policy gates should be structured rules where possible.
* Models should be used for tasks that benefit from language understanding, taste, research synthesis, ranking, summarization, classification, and generation.
* Models should not decide what the next system step is when the workflow is already known.

## BakedBot doctrine

### 1. Do not use prompts for control flow

If a Playbook is known to run daily, weekly, monthly, on menu change, on inventory threshold, or on a campaign calendar, those transitions should be explicit workflow states.

Bad pattern:

"You are a marketing agent. Check the market, figure out what matters, make a report, and maybe send recommendations."

Better pattern:

1. Trigger fired.
2. Resolve scope.
3. Gather sources.
4. Normalize source data.
5. Generate analysis.
6. Score confidence.
7. Run policy checks.
8. Route output.
9. Schedule follow-up.
10. Persist artifacts.

### 2. Separate research from solutioning

Research should gather facts. Planning should consider options. Execution should build from approved structure.

This prevents the model from biasing its own research toward a preferred answer too early.

### 3. Every workflow should produce artifacts

A Playbook run should leave behind structured, inspectable artifacts. Not just a chat log.

Typical artifacts:

* `brief.json`
* `scope.json`
* `research_pack.md`
* `strategy_options.json`
* `draft_output.md`
* `validation_report.json`
* `delivery_manifest.json`
* `run_summary.md`

Artifacts make the system auditable, replayable, debuggable, and trainable.

### 4. The system should ask questions before acting when ambiguity matters

Convert user requests into structured questions before execution.

Example:

User says: "Create a weekly competitor watch for Syracuse dispensaries and alert me when somebody undercuts us on edibles."

BakedBot should translate that into questions such as:

* Which competitors count?
* Which product categories matter most?
* What price delta counts as meaningful?
* Should bundles count?
* Should menu changes and stockouts count as alerts?
* Who receives alerts?
* What is the daily vs weekly deliverable format?

### 5. Use tracer bullets for new workflows

For new Playbook types, first build a thin end-to-end path that works with limited logic, then deepen each layer.

Example tracer bullet for a new competitive intelligence Playbook:

1. Pull menus from 3 competitors.
2. Normalize a small product subset.
3. Generate a simple comparison report.
4. Deliver to one channel.
5. Add alerting.
6. Add trend detection.
7. Add pricing intelligence.
8. Add recommendations.

### 6. Human review should be focused on high-leverage points

Humans should intervene when:

* compliance risk is high
* brand interpretation is ambiguous
* store strategy requires judgment
* source confidence is low
* system confidence drops below threshold
* a workflow is new or recently changed

Humans should not be used as default glue for predictable state transitions.

### 7. Policies should live outside prompts when possible

Do not bury business-critical rules inside narrative instructions.

Examples of policy objects BakedBot should manage structurally:

* channel rules
* state/legal disclaimers
* restricted claims
* brand voice guardrails
* audience restrictions
* send time rules
* escalation thresholds
* store-level exclusions
* promo stacking rules
* pricing visibility rules

### 8. Every workflow should support rollback and replay

For each Playbook run, BakedBot should be able to:

* inspect each stage
* retry only the failed stage
* rerun with changed parameters
* compare two runs
* roll back to the last accepted output

### 9. Success should be defined by shipped outcomes, not token volume

BakedBot should optimize for:

* accepted outputs
* time-to-insight
* compliance pass rate
* manual edit rate
* publish success rate
* customer retention and usage
* downstream business impact

Not for:

* number of agent steps
* number of spawned tasks
* total tokens consumed

### 10. Build for teams, not just solo operators

The system should support shared visibility, role-based approvals, comments, versioned artifacts, and reusable workflow templates. That matters for operators, agencies, multi-store groups, brands, and internal BakedBot teams.

## Standard BakedBot workflow model

Every workflow should use the same backbone:

1. **Trigger**
2. **Scope Resolution**
3. **Question Extraction**
4. **Research / Context Assembly**
5. **Strategy or Draft Generation**
6. **Validation**
7. **Approval or Auto-Delivery**
8. **Persistence and Telemetry**
9. **Follow-up / Next Trigger**

## Autonomy levels

### Level 1 — Assist

System drafts; human controls flow.

Use for:

* new customers
* high-risk compliance work
* new Playbook design
* strategy-heavy content

### Level 2 — Guided

System runs deterministic stages, human approves key outputs.

Use for:

* campaign briefs
* weekly reports
* product launch content
* store updates

### Level 3 — Managed Autopilot

System completes end-to-end unless validation or confidence rules trigger escalation.

Use for:

* recurring reports
* menu monitoring
* low-risk merchandising updates
* routine social drafts
* recurring SEO updates

### Level 4 — Full Auto

System executes and delivers automatically with logging and post-run review.

Use for:

* internal summaries
* analytics rollups
* background classification
* routine alerts
* repeatable low-risk transformations

## Concrete example: Daily Competitive Intelligence Report Playbook

### User intent

"Send me a daily competitive intelligence report every morning for Thrive Syracuse. Compare top nearby dispensaries, highlight product additions, promotions, pricing changes, and interesting merchandising moves."

### Deterministic workflow

#### Trigger

* Daily at 7:00 AM local time.

#### Scope resolution

* Store = Thrive Syracuse
* Radius = 25 miles or named competitor set
* Categories = flower, vapes, gummies, prerolls, beverages
* Delivery = email + dashboard + Slack summary

#### Question extraction

* Which competitors are in scope?
* Which categories matter most by store revenue weight?
* Should hemp-only online brands be included separately?
* What counts as a meaningful change?
* Are temporary out-of-stocks flagged or ignored?

#### Research / context assembly

* Pull yesterday’s normalized competitor menus
* Pull today’s normalized competitor menus
* Compute diffs
* Pull historical pricing snapshots
* Pull active promotions and banner text
* Pull BakedBot customer store context

#### AI steps

* Summarize notable changes
* Cluster moves into themes
* Rank changes by likely business impact
* Generate plain-English recommendations

#### Validation

* Ensure cited competitor names and products exist in source set
* Ensure prices are numeric and category mappings are valid
* Flag low-confidence OCR or scrape anomalies
* Prevent hallucinated recommendations not grounded in observed data

#### Delivery

* Dashboard card
* Executive summary email
* Slack alert only when threshold breached

#### Persisted artifacts

* `competitor_snapshot_2026-03-12.json`
* `menu_diff_2026-03-12.json`
* `daily_ci_report_2026-03-12.md`
* `recommendations_2026-03-12.json`
* `validation_report_2026-03-12.json`

### Example output shape

**Daily Competitive Intelligence — Thrive Syracuse**

* 3 competitors changed promotions overnight
* 2 stores cut edible prices by more than 8%
* 1 competitor added a new beverage brand with prominent homepage placement
* preroll assortment expanded at two nearby stores
* recommendation: test a weekend edible bundle and promote beverage cross-sell on menu landing page

### Why this design is better than a giant prompt

Because the workflow deterministically handles collection, normalization, change detection, thresholds, and routing. The model only handles synthesis, ranking, and explanation.

## Concrete example: Weekly Executive Competitive Summary Playbook

### User intent

"Every Monday morning, give me a weekly executive summary of what competitors did last week and what we should do next."

### Workflow differences vs daily report

* Larger time window
* Heavier trend analysis
* More narrative synthesis
* More emphasis on what matters now
* Recommendations grouped by urgency and effort

### Output sections

* What changed this week
* Biggest threats
* Biggest opportunities
* Category-level pricing pressure
* Messaging and promo patterns
* Recommended actions for this week

### AI tasks

* Trend synthesis
* prioritization
* recommendation drafting
* executive-style formatting

### Deterministic tasks

* weekly aggregation
* thresholding
* ranking inputs
* artifact generation
* delivery schedule

## Concrete example: Product Drop Playbook

### User intent

"When new products land in stock, generate launch-ready content across channels."

### Workflow

1. Inventory change trigger fires.
2. New SKUs detected.
3. Product metadata normalized.
4. Compliance and channel eligibility resolved.
5. Brand voice context loaded.
6. Content variants generated for email, SMS, menu copy, and social.
7. Validation runs for prohibited claims and missing facts.
8. Human review required if product metadata is incomplete or claims risk is high.
9. Approved assets delivered to publishing queue.

### Artifact set

* `new_skus.json`
* `channel_eligibility.json`
* `launch_messaging_options.json`
* `approved_assets.md`
* `publish_queue.json`

## Concrete example: Recurring SEO Page Refresh Playbook

### User intent

"Refresh our category landing pages monthly based on current inventory and search priorities."

### Deterministic parts

* schedule trigger
* page inventory mapping
* current ranking/source input retrieval
* internal link inventory
* schema presence check
* outdated content detection

### AI parts

* rewrite sections for freshness
* generate FAQs
* improve headings and meta descriptions
* produce revision proposals

### Validation

* preserve required disclaimers
* preserve legal language blocks
* do not break URL or template structure
* block unsupported claims

## Concrete example: Playbooks created from natural language

Playbooks are user-authored automations using natural language. This is exactly where deterministic translation matters.

### User request

"Every weekday at 8 AM, watch three local dispensaries and tell me if they add new gummy brands, discount anything over 15%, or launch a BOGO. Send me a short text and a longer dashboard report."

### Translation pipeline

#### Stage 1: Intent parse

Convert natural language into a structured spec.

Example structured spec:

```json
{
  "name": "weekday_gummy_watch",
  "schedule": {
    "frequency": "weekday",
    "time_local": "08:00"
  },
  "scope": {
    "competitors": ["Competitor A", "Competitor B", "Competitor C"],
    "categories": ["gummies"],
    "events": ["new_brand_added", "discount_gt_15", "bogo_detected"]
  },
  "deliverables": ["sms_summary", "dashboard_report"],
  "approval_mode": "managed_autopilot"
}
```

#### Stage 2: Clarify missing fields

Ask only if needed.

Examples:

* Which three competitors?
* What radius should be used if unnamed?
* Should hemp brands be included?
* What should happen on weekends?

#### Stage 3: Compile workflow

Translate the structured spec into the standard Playbook state machine.

#### Stage 4: Run and observe

Create telemetry, artifacts, and confidence scoring from the first run onward.

## Recommended internal object model

### Playbook

* id
* name
* owner
* trigger
* scope
* objectives
* delivery modes
* approval mode
* policy bundle
* telemetry config

### Run

* run_id
* playbook_id
* start_time
* end_time
* stage_statuses
* confidence
* artifacts
* alerts
* delivery_status

### Policy bundle

* jurisdiction rules
* channel rules
* brand rules
* customer-specific exclusions
* alert thresholds

### Artifact

* artifact_id
* run_id
* stage
* type
* path
* checksum
* created_at
* source_refs

## Validation harness requirements

Before a Playbook output is considered complete, it should pass through a validation harness.

Minimum harness modules:

* source existence check
* schema validation
* compliance checks
* brand voice checks
* duplicate detection
* broken-link or missing-asset checks
* confidence thresholding
* delivery channel validation

For BakedBot, validation should be first-class product, not a hidden prompt suffix.

## Telemetry standards

Every run should capture:

* trigger source
* run duration by stage
* token usage by stage
* model selection by stage
* validation failures
* human interventions
* approval latency
* final delivery status
* downstream engagement where applicable

This lets BakedBot learn where reliability actually breaks.

## Anti-patterns BakedBot should avoid

* giant meta-prompts that try to do everything
* research mixed with execution intent
* hidden policy logic inside prose only
* no artifact trail
* no replay or rollback
* measuring productivity by output volume alone
* skipping structured validation
* forcing humans to babysit deterministic steps

## Product implications for BakedBot

### 1. Workflow compiler for natural-language Playbooks

Users should describe the automation in plain English, but the system should compile that into a structured workflow spec.

### 2. Artifact browser

Users and internal teams should be able to inspect each run by stage.

### 3. Confidence-aware routing

Low-confidence results should escalate automatically.

### 4. Policy bundles by customer and jurisdiction

Compliance and brand rules should be reusable and versioned.

### 5. Preview sandboxes

Generated outputs should be easy to preview before publish.

### 6. Comparison views

Users should be able to compare today’s output with yesterday’s, or compare two generated strategies.

## Decision rule for BakedBot builders

When designing any agent or Playbook, ask:

1. What parts of this workflow are already known and deterministic?
2. What parts truly require model judgment?
3. What artifact should exist after each stage?
4. What validation can be done without a model?
5. Where should a human intervene only if necessary?
6. How do we replay or roll back this run?

If those questions are not answerable, the workflow is probably too prompt-heavy.

## Final operating statement

BakedBot should not be built as a clever chatbot that sometimes does marketing work.

BakedBot should be built as a **deterministic marketing workflow engine with AI woven into the judgment-heavy steps**.

That is how BakedBot can stay fast, auditable, brand-safe, and useful in a regulated category while still delivering the leverage of autonomous agents.
