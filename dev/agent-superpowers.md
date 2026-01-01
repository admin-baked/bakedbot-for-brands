# BakedBot Agent Superpowers Spec

## Chat + Tools, combined into one implementable agent runtime (Firebase-first).

### What we’re building

We want agents that feel as helpful as ChatGPT/Claude **in conversation**, but operate like real software: **they can safely do things** (fetch data, generate compliant content, trigger workflows, update pages, run audits) with **permissions, audit trails, and deterministic outcomes**.

This doc defines:

* the **agent runtime** (chat + tool use)
* the **tooling layer** (what tools exist, how they’re called, permissions)
* **memory + domain knowledge** (tenant + directory + compliance)
* the **safety / compliance gates** (Deebo as policy brain)
* **engineering interfaces** to start implementing now

---

## 1) Non-negotiable principles

### 1.1 Chat is the UX; tools are the muscles

LLM does:

* intent understanding
* planning
* summarizing + explaining
* choosing tools + composing results

Tools do:

* data retrieval (authoritative)
* writes (controlled)
* side effects (messaging, publishing, exports)
* compliance checks (policy engine)

### 1.2 Evidence > vibes

Every important output must be traceable to:

* input data references (doc IDs / storage paths)
* tool outputs
* policy checks
* the final response shown to the user

### 1.3 Permissioned by design

Agent actions must respect:

* tenant boundaries
* role-based access (Super Admin / Dispensary / Brand / Customer)
* channel constraints (SMS/email/web)
* jurisdiction constraints (state rules)

### 1.4 Idempotent + replayable

If a tool call retries, it can’t double-send SMS, double-publish pages, or duplicate imports.
Every action should have a deterministic key and a stored state machine.

---

## 2) The Agent Runtime (high-level)

### 2.1 Components

1. **Chat Orchestrator**

* Receives user message + context (role, tenant, channel)
* Selects agent persona (Smokey/Craig/Pops/Ezal/Money Mike/Day Day/Felisha/Mrs. Parker/Deebo)
* Produces a *plan* + tool calls
* Returns final response + “what happened” summary

2. **Tool Router**

* Registry of tools + schemas
* Validates permissions
* Enforces rate limits
* Executes tools (Cloud Run/Functions)
* Writes audit log

3. **Memory Manager**

* Short-term: conversation state
* Long-term: tenant facts, preferences, outcomes, heuristics
* Retrieval: fetch only what’s relevant (and allowed)

4. **Deebo Policy Gate**

* Runs *before* any public-facing or outbound content
* Runs *before* any side effect (send/publish)
* Returns allow/deny + redlines + recommended safe rewrite patterns

---

## 3) Data foundations the agents rely on

### 3.1 Two worlds (Directory vs Tenant)

Agents must be able to operate across:

* **Public Directory** (nationwide best-effort entities + SEO pages)
* **Tenant Workspace** (claimed, permissioned truth)

Key linking:

* `tenants/{tenantId}.directoryRef → directory/(brands|dispensaries)/{id}`

### 3.2 Event + audit logs (required)

All tools must write:

* `tenants/{tenantId}/events/{eventId}` (observed behavior: clicks, recs shown, conversions)
* `tenants/{tenantId}/audit/actions/{actionId}` (agent actions + tool calls + policy                              checks)
* Storage pointers for big payloads/traces

---

## 4) Tooling model: “Tool Superpowers”

### 4.1 Tool categories

Tools are grouped into these buckets:

**A) Read tools (safe, no side effects)**

* search catalog, inventory, pricing
* fetch directory entity/page snapshots
* read analytics, funnels, deliverability
* pull competitor intel (Ezal)

**B) Write tools (mutate data, no external side effects)**

* update product descriptions
* update SEO page blocks
* create segments, campaigns drafts
* store notes, tasks, playbooks

**C) Side-effect tools (danger zone)**

* send email/SMS
* publish a page
* push to POS/menu integration
* run paid outreach actions

**D) Policy tools (Deebo)**

* content compliance checks
* channel and jurisdiction checks
* redline + rewrite guidance
* audit packaging

**E) Workflow tools**

* create approvals
* route to human review
* schedule jobs
* run batch pipelines (generate 25 pages/day)

### 4.2 Tool contract (every tool must implement)

Each tool call has:

**Request**

* `toolName`
* `tenantId` (nullable for directory-only)
* `actor` (userId / agentId / role)
* `idempotencyKey`
* `inputs` (schema-validated)

**Response**

* `status: success|blocked|failed`
* `outputs` (schema-validated)
* `evidenceRefs` (doc IDs, storage paths)
* `warnings`
* `nextActions` (optional suggestions)

### 4.3 Idempotency rules

* Side-effect tools *must* require `idempotencyKey`
* Store tool execution state:

  * `audit/actions/{actionId}.idempotencyKey`
  * a “dedupe index” doc for fast lookup

---

## 5) The actual tool belt we should ship

Below is the minimum set that gives “ChatGPT/Claude magic” **plus** real execution.

### 5.1 Universal tools (all agents)

1. `context.getTenantProfile`

* returns tenant basics, locations, jurisdictions, enabled channels, plan tier

2. `memory.retrieve`

* retrieves relevant memories (preferences, prior outcomes, rules of thumb)

3. `docs.search`

* searches tenant docs (SOPs, brand guidelines, past campaigns)

4. `audit.log`

* structured log event/action (usually done automatically by router)

---

### 5.2 Catalog + menu tools (Smokey core)

5. `catalog.searchProducts`

* filters: category, effects, potency, brand, price range, location availability

6. `catalog.getProduct`

* returns canonical product + variants + compliance flags

7. `inventory.getByLocation`

* returns OOS/low stock, turn rates, reorder signals

8. `menu.buildPublicView`

* materializes `publicViews/products/*` for headless menu + SEO pages

9. `reco.rankProducts`

* inputs: user intent + constraints + product candidates
* outputs: ranked list + explanation + feature contributions
* (even if the model helps, keep this as a tool so it’s reproducible)

---

### 5.3 Marketing tools (Craig core)

10. `marketing.createCampaignDraft`

* email/SMS templates + audience + goals + UTM plan

11. `marketing.segmentBuilder`

* creates segment definitions (VIP, reactivation, new users, high-margin buyers)

12. `marketing.sendPreview`

* generates preview renders for compliance + human approval

13. `marketing.send`

* **side effect tool**
* requires approvals + Deebo allow
* writes deliverability and message IDs to audit

14. `marketing.abTestManager`

* creates experiments (subject lines, send time, offer)
* stores results back into memory + Pops metrics

---

### 5.4 BI tools (Pops + Money Mike)

15. `analytics.getKPIs`

* conversion, AOV, repeat rate, organic share, campaign ROI

16. `analytics.funnelReport`

* discovery → page view → chat → click → order

17. `finance.marginModel`

* margin by SKU, promo impact, price elasticity assumptions

18. `forecast.demand`

* light forecasting + reorder suggestions

---

### 5.5 Competitive intel tools (Ezal)

19. `intel.scanCompetitors`

* pull competitor menu/pricing/promo signals by market
* store snapshots + diffs

20. `intel.diffReport`

* “what changed since last week” for each competitor

---

### 5.6 Loyalty tools (Mrs. Parker)

21. `loyalty.createVIPProgram`

* tiering, rewards, eligibility logic

22. `loyalty.recommendPerk`

* suggests perk mix based on behavior + margins + compliance

---

### 5.7 Compliance tools (Deebo)

23. `deebo.checkContent`

* inputs: content, channel, jurisdiction(s), audience flags
* outputs: allow/deny, redlines, safe rewrite suggestions, citations to rule IDs

24. `deebo.checkCampaign`

* validates: opt-in requirements, claims, age gating, prohibited language

25. `deebo.rulePackResolve`

* returns active rules for tenant/jurisdiction/channel

26. `deebo.explainDecision`

* converts rule-based decision into human-readable rationale (for audits)

**Rule:** any outbound content or public page publish MUST call Deebo first.

---

### 5.8 Directory + SEO rollout tools (Nationwide engine)

27. `directory.getEntityView`

* returns public snapshot for a brand/dispensary/location

28. `directory.generatePagesBatch`

* generates 25/day pages (ZIP/city/state/category)
* stores drafts + metadata

29. `directory.publishPage`

* **side effect tool**
* requires Deebo check + approval rules (at least for promotional copy)

30. `directory.claimWorkflow`

* creates claim, verifies, links tenant, triggers onboarding

---

### 5.9 SEO & Growth Tools (Day Day)

31. `seo.auditPage`

* scores Findability/Fit/Fidelity inputs, stores improvement tasks

32. `seo.generateMetaTags`

* generates title/description for pages

---

### 5.10 Ops & Coordination (Felisha)

33. `ops.processMeeting`

* takes transcript -> structured notes/action items

34. `ops.triageError`

* classifies system error and routes to team


## 6) Approvals: how we avoid disasters

### 6.1 Approval objects

Create a standard approval record:

* `tenants/{tenantId}/approvals/{approvalId}`

  * `type: send_sms | send_email | publish_page | update_catalog`
  * `payloadRef` (Storage path or doc ref)
  * `requestedBy` (agent/user)
  * `status: pending|approved|rejected`
  * `deeboDecisionRef`
  * `approverUserId` (role-based)

### 6.2 Default approval policy

* Super Admin: can auto-approve low-risk updates
* Dispensary/Brand user: must approve outbound messaging and public page publishes (at least initially)
* Over time, allow “auto-approve” for trusted tenants with clean history

---

## 7) Memory: what gets remembered (and where)

### 7.1 Memory types

1. **Facts**

* brand voice rules, “don’t say X,” preferred tone, disclaimers

2. **Preferences**

* segment preferences, campaign cadence, top product focuses

3. **Outcomes**

* “This subject line style improved open rate”
* “SMS at 4pm beats 9am for this tenant”

4. **Heuristics**

* “Never mention medical claims”
* “Avoid youth-coded language”
* “In IL, require X disclaimers for Y channel” (Deebo is source-of-truth; memory stores patterns)

### 7.2 Memory storage pattern

* `tenants/{tenantId}/memory/items/{memoryId}`

  * `type`, `content`, `confidence`, `lastUsedAt`, `sourceEvidenceRefs`

Retrieval is always scoped + filtered by role permissions.

---

## 8) How the agent “thinks” without being flaky

### 8.1 Deterministic planning format (internal)

The LLM should produce:

* **Intent**
* **Constraints** (jurisdiction, channel, budget, inventory)
* **Plan steps**
* **Proposed tool calls** (with schemas)
* **Safety checks required**

### 8.2 Tool-first truth

If the user asks “what’s selling”:

* Pops uses `analytics.getKPIs` (tool) before summarizing.
  If the user asks “send a campaign”:
* Craig drafts → Deebo checks → approval → send tool.

---

## 9) Example flows (end-to-end)

### Flow A: “Generate 25 Illinois ZIP pages/day”

1. `directory.generatePagesBatch(state=IL, count=25)`
2. For each page draft:

   * `deebo.checkContent(channel=web, jurisdiction=IL)`
3. Create approvals (optional)
4. `directory.publishPage(pageId)`
5. Log outcomes: impressions → claims → conversions

### Flow B: “Draft SMS for a dispensary promo”

1. `context.getTenantProfile`
2. `inventory.getByLocation` + `catalog.searchProducts` (avoid OOS)
3. `marketing.createCampaignDraft(channel=SMS)`
4. `deebo.checkCampaign` (SMS + state)
5. `marketing.sendPreview`
6. Approval
7. `marketing.send`

### Flow C: “Smokey recommends product in chat”

1. `catalog.searchProducts` with constraints
2. `deebo.rulePackResolve` (for guidance constraints)
3. `reco.rankProducts`
4. `deebo.checkContent` (consumer-facing response guardrails)
5. Respond + log events

---

## 10) Implementation plan (engineer-ready)

### Phase 1 — Tool Registry + Router (foundation)

* Tool registry in Firestore:

  * `system/tools/{toolName}`: schema, auth scope, rate limits, side effect flag
* Tool router service:

  * validates inputs
  * enforces RBAC + tenant scope
  * writes audit logs automatically
* “Hello tools”:

  * `context.getTenantProfile`
  * `catalog.searchProducts`
  * `deebo.checkContent`
  * `audit.log` (automatic)

### Phase 2 — Approval + Side effects

* approvals collection
* `marketing.send` and `directory.publishPage` require:

  * approval status == approved
  * Deebo allow decision attached
  * idempotency key enforced

### Phase 3 — Memory + Learning loop

* memory store + retrieval
* store outcomes from campaigns and recommendations
* lightweight “heuristic promotion” (turn repeated successes into suggestions)

### Phase 4 — Nationwide SEO engine

* batch generation tool
* entity/page views materialization
* claim workflow integration

### Phase 5 — "Special Ops" Browser Agents (V2)

* **Local-first Automation**: "RTRVR" style integration for non-API portals (Metrc, legacy POS).
* **Secure Admin Actions**: Running scripts in the user's authenticated browser session.
* **Gap Filling**: Handling tasks where Firecrawl/APIs cannot reach.

