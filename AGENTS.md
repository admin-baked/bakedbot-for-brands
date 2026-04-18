# BakedBot Agent Instructions

This file defines the default behavior for any AI agent generating, editing, reviewing, or refactoring code in this repository.

## Mission

Generate code that belongs in this codebase.

Do not optimize only for speed of output. Optimize for:

1. correctness
2. reuse
3. convention fit
4. explainability
5. observability
6. simplicity

---

## Primary Rule

Before generating new code, prefer in this order:

1. reuse an existing canonical module or type
2. extend an existing pattern
3. refactor an existing implementation
4. introduce a new abstraction only when clearly necessary

Do not generate a parallel solution when a canonical one already exists.

---

## Mandatory Pre-Generation Checks

Before writing code, determine:

### 1. Canonical home

Where does this logic belong?

- domain model
- service
- adapter
- workflow module
- tool contract
- schema
- UI component
- background job

### 2. Existing patterns

What already exists?

- type
- service
- utility
- schema
- component
- tool definition
- adapter
- error-handling pattern
- retry or job pattern

### 3. Risk tier

Classify the task as Tier 0, 1, 2, or 3.

### 4. Failure modes

Account for likely failure conditions:

- missing or invalid data
- null states
- duplicate events
- stale state
- retries
- permission failure
- third-party errors
- partial execution

### 5. Observability

Decide what logs, metrics, traces, or audit data are needed.

---

## Hard Rules

### Reuse Rules

- Never hardcode secrets (API keys, tokens, credentials). Use `.env.local` and `process.env` exclusively.
- Use verified AWS SES subdomains (`hello@slug.bakedbot.ai`) for all client or consumer outreach. Never send consumer emails from the naked `bakedbot.ai` domain.
- Reuse existing domain types for existing concepts.
- Extend validated schemas instead of recreating them.
- Reuse existing adapters for the same integration boundary.
- Reuse existing tools/contracts unless overlap is explicitly intended.

### Convention Rules

- Follow repo naming conventions exactly.
- Place files within established boundaries.
- Use existing error-handling, logging, permission, and tenancy patterns.
- Use canonical retry and job patterns.

### Correctness Rules

- Fix type and lint issues instead of suppressing them.
- Do not introduce `any`, unsafe casts, ignored nullability, or silent catches without explicit necessity.
- Fail loudly on true correctness problems.
- Do not hide boundary failures behind permissive fallbacks.

### Workflow Rules

- Design side-effecting code for retries and repeated execution where relevant.
- Handle duplicate events intentionally.
- Preserve idempotency where workflows may replay.
- Make partial failures diagnosable.

### Explainability Rules

- Write code a human can explain line by line.
- Prefer straightforward control flow over clever compression.
- Prefer explicit naming over ambiguous naming.

### Observability Rules

- Add structured logging at key decision points for Tier 2 and Tier 3 work.
- Include identifiers needed for workflow tracing.
- Preserve auditability for important state changes.

---

## Forbidden Behaviors

Do not:

- create duplicate domain types for existing concepts
- generate parallel helpers when a canonical one exists
- weaken permissions or tenant checks for convenience
- suppress lints or types as a first-line solution
- use silent `catch` blocks that swallow meaningful errors
- invent a new error-handling style inside an established module
- create overlapping agent/tool contracts without justification
- move business logic into the UI when it belongs in a service or workflow layer
- add permissive fallbacks that hide real data or integration problems

---

## Required Output for Non-Trivial Changes

When possible, include:

### Summary

What behavior changed?

### Canonical reuse

What existing modules, types, patterns, or contracts were reused?

### Risk tier

Tier 0 / 1 / 2 / 3

### Failure modes

What happens in the main failure conditions?

### Test plan

What should be validated and at what layer?

### Observability notes

What should be logged or measured?

---

## System-Specific Guidance

### Auth, permissions, and tenancy

- Never approximate permissions.
- Never rely on UI-only enforcement.
- Use canonical tenant scoping and role checks.
- Treat missing authorization context as failure, not fallback.

### Billing, usage, and quotas

- Preserve exactness.
- Avoid retries that can duplicate charges or counts.
- Make state transitions auditable.

### Integrations and external systems

- Expect drift, timeout, partial failure, and duplicates.
- Preserve adapter boundaries.
- Log enough context to reconcile external state.

### Automations and playbooks

- Make trigger conditions explicit.
- Make side effects traceable.
- Handle replay, re-run, and partial execution intentionally.

### Agents and tools

- Prefer fewer well-defined tools over overlapping tools.
- Keep input/output schemas explicit.
- Avoid ambiguous contracts.

### Brand Brain (OrgProfile.operations)

- All brand-facing agents must load operational context from `OrgProfile.operations` via the shared context builders in `src/server/services/org-profile.ts`.
- Never hardcode brand truth (hero products, pricing policy, channel rules, campaign calendar) in agent system prompts. Pull from the canonical `OrgProfile` instead.
- Context builders inject only the fields each agent needs (progressive disclosure). Craig gets campaign calendar + channel rules. Smokey gets hero products + inventory strategy. Pops gets performance baselines.
- If `OrgProfile.operations` is undefined, agents operate with defaults. Zero regression.

### Handoff artifacts

- When an agent produces output intended for another agent, emit a typed `HandoffArtifact` from `src/types/handoff-artifacts.ts`.
- Loose `Record<string, any>` payloads on the agent bus are deprecated for new inter-agent contracts.
- Use `sendHandoff()` from `src/server/intuition/handoff.ts` to route artifacts through the bus.
- The harness auto-parses `pending_handoffs` during the orient phase. Agents can read from `agentMemory.pending_handoffs`.
- Available artifact types: `audience_insight`, `campaign_brief`, `compliance_decision`, `competitive_intel`, `recommendation_set`, `landing_page_brief`, `retail_routing_decision`.

### Learning deltas

- The nightly `/api/cron/consolidate-learnings` endpoint analyzes telemetry, feedback, and procedural memory to produce `LearningDelta` proposals.
- Deltas are stored in Firestore `learning_deltas` with `status: 'proposed'`. They require human or Linus approval before application.
- Before modifying agent behavior, routing, or guardrails, check for recently approved deltas at `/api/learning-deltas?status=approved` to avoid contradicting system-level learnings.
- Categories: `tool_failure_pattern`, `compliance_catch_pattern`, `high_performing_workflow`, `manual_override_pattern`, `dead_end_loop`, `brand_brain_update`, `eval_case_candidate`.

### Frontend and dashboard surfaces

- Keep business rules out of presentation layers when possible.
- Reuse canonical UI patterns.
- Surface failure and loading states explicitly.

---

## Completion Check

Before finalizing code, verify:

- [ ] I reused canonical patterns where possible.
- [ ] I did not hardcode any secrets (API keys, credentials, tokens).
- [ ] I did not create a duplicate abstraction for an existing concept.
- [ ] I followed naming, boundary, error-handling, permission, tenancy, logging, and retry conventions.
- [ ] I used verified AWS SES subdomains for consumer outreach and avoided the naked `bakedbot.ai` domain.
- [ ] I did not suppress warnings instead of fixing root causes.
- [ ] I handled likely failure modes intentionally.
- [ ] I matched tests to the task’s risk level.
- [ ] I preserved observability for production debugging.
- [ ] A human reviewer will be able to explain this code.
- [ ] **I ran `/simplify` (3-agent parallel review: Code Reuse, Code Quality, Efficiency), fixed all confirmed findings, and recorded the reviewed outgoing diff with `npm run simplify:record` before pushing.**

If any item is false, revise before proposing the change.

---

## Session End Protocol

Every coding session must end with an "Update recent work" pass. This applies to all builder agents (Claude Code, Codex, Gemini).

**Multi-tab safe order:**
1. Write `memory/sessions/YYYY-MM-DD-HHMM-{slug}.md` — isolated, never conflicts
2. Append session block to `memory/MEMORY.md`
3. Update `CLAUDE.md` line 15 + `.agent/prime.md` — **only if your session date ≥ current "Last update" date**
4. Auto-archive MEMORY.md if > 150 lines → `memory/archive/YYYY-MM.md`
5. Commit: `git add CLAUDE.md .agent/prime.md && git commit -m "docs: Update session notes YYYY-MM-DD"`

> Full protocol in `CLAUDE.md` → *Session End* section. Use **"Consolidate sessions"** to merge multiple pending tabs.

---

## Expanded Per-Agent Context

This section provides expanded, per-agent context to give the AI-management team and engineering stakeholders a clear, shared understanding of each agent's role, responsibilities, and integration points within the governance model. Each entry references the canonical source file and outlines domain, access, tools, and observable behaviors.

### Executive Boardroom (Super Users / AI Management)

#### Leo - COO
- **File**: `src/server/agents/leo.ts`
- **Role**: Chief Operations Officer
- **Domain**: Operations, delegation, scheduling
- **Access**: Super Users Only
- **Protocol**: Operations Heartbeat (Hourly)
- **Capabilities**:
  - Directs the entire operational fleet
  - Schedules and coordinates agent tasks
  - Monitors system health
- **Integrations**: General orchestration interfaces; no external management integrations required
- **MVP Playbook Participation**: Strategic planning and cross-domain task delegation
- **Tools**: High-level planning, scheduling, and health checks (abstracted in agent interface)
- **Observability**: Start/stop of plan cycles, task dispatch counts, health metrics
- **Data Contracts**: Uses BrandDomainMemory and AgentMemory structures to coordinate tasks
- **Handoff/Collaboration**: Coordinates handoffs via Letta bus for cross-agent tasks
- **Example**: Delegating a cross-domain play to Linus and Glenda for a quarterly campaigns review

#### Jack - CRO
- **File**: `src/server/agents/jack.ts`
- **Role**: Chief Revenue Officer
- **Domain**: CRM, revenue metrics, loyalty delegation
- **Access**: Super Users Only
- **Protocol**: Revenue Pulse (Daily)
- **Capabilities**:
  - CRM, revenue metrics tracking, and sales pipeline analysis
  - Delegates loyalty initiatives via Mrs. Parker
- **Integrations**: CRM systems, loyalty channels (high-level)
- **MVP Playbook Participation**: Revenue-focused playbooks and loyalty programs
- **Tools**: CRM data access, campaign analytics (abstracted)
- **Observability**: Revenue metrics collected, delegation outcomes
- **Data Contracts**: Market/CRM data shaped for cross-agent views
- **Handoff/Collaboration**: Works with Leo for scheduling and with Linus for constraints or fixes
- **Example**: Initiates a loyalty campaign and routes tasks to Mrs. Parker and Smokey

#### Linus - CTO
- **File**: `src/server/agents/linus.ts`
- **Role**: Chief Technology Officer
- **Domain**: Code evaluation, bug hunting, automated fixes
- **Access**: Super Users Only
- **Protocol**: Zero Bug Tolerance (Hourly)
- **AI Provider**: Claude (Anthropic)
- **API Endpoint**: `POST /api/linus/fix`
- **Capabilities**:
  - Code search, bug evaluation, automated fixes, governance of fix endpoints
- **Integrations**: Code search/indexing tools, repository access
- **MVP Playbook Participation**: Code quality and triage playbooks
- **Tools**: `search_codebase`, `find_files`, `git_log`, `git_diff`, `analyze_stack_trace`, `read_file`, `write_file`, `run_command`, `bash`, `archive_work`, `query_work_history`
- **Observability**: Code-change tracing, fix-endpoint telemetry
- **Data Contracts**: Codebase state and memory needed to perform fixes
- **Handoff/Collaboration**: Proposes fixes and passes artifacts to other agents for validation
- **Example**: Receives a bug report, searches repo, proposes a fix, and triggers a review cycle

#### Glenda - CMO
- **File**: `src/server/agents/glenda.ts`
- **Role**: Chief Marketing Officer
- **Domain**: Marketing, campaigns, content analytics
- **Access**: Super Users Only
- **Protocol**: Brand Watch (Daily)
- **Capabilities**:
  - Marketing campaigns, SEO, analytics, content planning
  - Directs Craig and Day Day
- **Integrations**: Marketing analytics tools, campaign platforms
- **MVP Playbook Participation**: Marketing lifecycle and growth experiments
- **Tools**: Campaign planning and analytics helpers (high-level)
- **Observability**: Campaign performance logs, content metrics
- **Data Contracts**: Brand marketing memory segments
- **Handoff/Collaboration**: Coordinates with Leo for campaigns and with Mike for pricing-aligned promotions
- **Example**: Plans a quarterly branding push and authorizes cross-channel deployments

#### Mike - CFO
- **File**: `src/server/agents/mike.ts`
- **Role**: Chief Financial Officer
- **Domain**: Pricing, profitability, tax/compliance tooling
- **Access**: Super Users Only
- **Protocol**: Financial Governance (Periodic)
- **Capabilities**:
  - Pricing strategy, profitability analytics, tax/compliance tooling
  - Integrations: Authorize.net (billing)
- **MVP Playbook Participation**: Pricing and profitability playbooks
- **Tools**: Pricing analysis, margin tooling, tax/workflow tools
- **Observability**: Margin and pricing telemetry
- **Data Contracts**: Financial data memory, pricing rules, profitability metrics
- **Handoff/Collaboration**: Works with Leo and Glenda for aligned campaigns/pricing
- **Example**: Proposes pricing changes and evaluates impact on margins

### Support Staff (Domain Specialists)

#### Smokey - Budtender
- **File**: `src/server/agents/smokey.ts`
- **Role**: Product Specialist & Front Desk Greeter
- **Domain**: Product search, recommendations
- **Access**: Brand users
- **Capabilities**:
  - Product search and upsell suggestions
  - Menu filtering and customer preference matching
  - Delegation routing to specialists
  - UX experiment management
- **MVP Playbook Participation**: Review Response Autopilot; Low Stock Alert
- **Tools**: `searchMenu`, `suggestUpsells`
- **Integrations**: Menu data sources and product catalog
- **Observability**: User interaction logs, upsell outcomes
- **Data Contracts**: User preference data tied to product recommendations
- **Handoff/Collaboration**: Can hand off to Craig or Ezal for deeper engagement
- **Example**: Suggests a recommended product set based on user tolerance and budget

#### Craig - Marketer
- **File**: `src/server/agents/craig.ts`
- **Role**: Marketing Automation
- **Domain**: Campaigns, lifecycle marketing
- **Access**: Brand users
- **Integrations**: Blackleaf (SMS), Mailjet (Email), Ayrshare (Social)
- **MVP Playbook Participation**: Win-Back Campaign
- **Capabilities**:
  - Run marketing campaigns, lifecycle automations
  - Coordinate cross-channel marketing
- **Tools**: Campaign orchestration tools, channel connectors
- **Observability**: Campaign performance, channel metrics
- **Data Contracts**: Campaign data models
- **Handoff/Collaboration**: Delegates to Smokey and Day Day as needed
- **Example**: Launches a win-back campaign

#### Pops - Analyst
- **File**: `src/server/agents/pops.ts`
- **Role**: Data Analyst
- **Domain**: Revenue analytics
- **Access**: Brand users
- **MVP Playbook Participation**: Weekly Top Sellers, Low Stock Alert
- **Capabilities**: Funnel analysis, revenue analytics
- **Tools**: Analytics tooling
- **Observability**: Data freshness and reporting cadence
- **Data Contracts**: Analytics datasets and dashboards
- **Handoff/Collaboration**: Feeds insights to Linus and Mike as needed
- **Example**: Generates weekly seller insights

#### Ezal - Lookout
- **File**: `src/server/agents/ezal.ts`
- **Role**: Competitive Intelligence
- **Domain**: Market intel, competitor monitoring
- **Access**: Brand users
- **Integrations**:
  - Headset (market trends)
  - CannMenus (pricing)
  - Firecrawl (web scraping)
- **MVP Playbook Participation**: Competitor Price Match Alert
- **Capabilities**: Monitor market, price trends, and competitor movements
- **Tools**: Competitive analysis tools
- **Observability**: Market intel feeds
- **Data Contracts**: Competitor data memory
- **Handoff/Collaboration**: Shares competitive intel with Linus and Mike as needed

#### Money Mike - Banker
- **File**: `src/server/agents/moneyMike.ts`
- **Role**: Pricing Strategist & Financial Analyst
- **Domain**: Pricing, margins, profitability, 280E compliance
- **Access**: Brand and Dispensary users
- **Core Principles**: Margin protection, vendor negotiations, 280E tax handling
- **Profitability Tools**: `analyze280ETax`, `calculateNYCannabsTax`, `getProfitabilityMetrics`, `analyzePriceCompression`, `analyzeWorkingCapital`
- **MVP Playbook Participation**: Competitor Price Match Alert, Weekly Top Sellers
- **Related Files**: profitability-tools.ts, cannabis-tax.ts, profitability dashboard actions
- **Handoff**: Coordinates pricing guidance with Mike/CFO and with Glenda for campaigns

#### Mrs. Parker - Hostess
- **File**: `src/server/agents/mrsParker.ts`
- **Role**: Loyalty & VIP Manager
- **Domain**: Loyalty programs
- **Integrations**: Alpine IQ (loyalty logic)
- **MVP Playbook Participation**: Win-Back Campaign
- **Observability**: Loyalty metrics

#### Deebo - Enforcer
- **File**: `src/server/agents/deebo.ts`
- **Role**: Compliance Officer
- **Domain**: Regulations, licensing
- **Integrations**: Green Check (licensing data)
- **MVP Playbook Participation**: Review Response Autopilot
- **Observability**: Compliance checks and audit trails

#### Day Day - Growth
- **File**: `src/server/agents/dayday.ts`
- **Role**: Growth Hacker
- **Domain**: SEO, traffic
- **Tools**: `seo_audit`, `chk_rank`
- **Observability**: Traffic growth metrics

#### Uncle Elroy - Store Operations Advisor
- **File**: `src/server/agents/elroy.ts`
- **Domain**: Dispensary operations, inventory, CRM, competitor intel
- **Org Focus**: `org_thrive_syracuse` (Hardwired)
- **Slack Channel**: `#thrive-syracuse-pilot`
- **Persona**: Warm, street-smart, helpful, direct
- **Capabilities**:
  - At-Risk nudges, competitor price matching, top product alerts
  - Inventory monitoring, technical delegation via ask_opencode
- **Observability**: Store ops metrics and alerts

#### Felisha - Ops
- **File**: `src/server/agents/felisha.ts`
- **Role**: Operations Coordinator
- **Domain**: Scheduling, triage, meeting admin
- **Integrations**: Cal.com (scheduling), Deepgram (transcription)
- **Observability**: Meeting metrics and triage outcomes

#### Opencode (SP13) - AI Coding Agent
- **Platform**: Cloud Run
- **File**: `docker/opencode/server.mjs`
- **Role**: Technical Worker Bee
- **Domain**: Code gen, data analysis, terminal tasks
- **Cost**: $0 (Zen models)
- **Capabilities**:
  - Sub-Agent for Squad
  - Repo Awareness: /workspace/bakedbot-for-brands
  - Free Execution: Gemini/Zen models
- **Observability**: Task-level telemetry

### Additional Context
- Handoff artifacts and the Letta memory bus are central to cross-agent collaboration
- Governance-critical: arbitration points and cross-domain decision rights are defined in the Batch 5 plan

### Notes
This expanded per-agent context is intended to improve cross-domain understanding. Per-agent example interactions can be added in follow-up updates.

---

## 🔢 Versioning Convention (MANDATORY)

Every push **must** bump `package.json` version and the kiosk footer (`src/app/loyalty-tablet/page.tsx`). The agent that pushes the commit owns the version number — estimate the size of work, sign it, commit both files.

### Format: `MAJOR.MINOR.PATCH-AGENT`

| Segment | Rule |
|---------|------|
| `MAJOR` | Breaking change or platform milestone |
| `MINOR` | Significant feature set (5+ files, new user-facing capability) |
| `PATCH` | Size of work — see decision guide below |
| `AGENT` | Builder who pushed: **CL** (Claude Code), **GEM** (Gemini), **COD** (Codex) |

### Agent signature is mandatory
The last segment identifies who shipped the build. Required for code review tracing and incident attribution.

```
4.10.7-CL   ← Claude shipped a major kiosk UX overhaul (patch +3 from 4.10.4)
4.10.8-COD  ← Codex pushed a small bug fix (+1)
4.11.0-GEM  ← Gemini shipped a new major feature
```

### Decision guide — how much to bump PATCH
| Work size | Bump |
|-----------|------|
| Typo / 1-line fix | +1 |
| Single component fix | +1 |
| Multi-file bug fix | +2 |
| New feature (1 screen or flow) | +3 |
| Major refactor or multi-feature session | +5 |
| Full subsystem overhaul | +7–10 |

When in doubt, round up. Under-versioning causes confusion in code review. Over-versioning is free.
