# PRD + AI Spec: Brand Brain + Handoff Artifacts + Learning Promotion Loop

**Status:** Draft  
**Author:** Claude Code  
**Date:** 2026-04-04  
**Risk Tier:** risk:tier2 — New domain types, harness integration, and cron-driven behavior promotion  
**Repo:** admin-baked/bakedbot-for-brands  

---

## Problem Statement

BakedBot for Brands has strong agent infrastructure (harness, bus, telemetry, procedural memory) but three gaps prevent agents from operating as a unified system:

1. **No compiled Brand Brain** — `OrgProfile` covers identity and intent but is missing 10 operational fields (hero SKUs, campaign calendar, channel rules, retailer routing, etc.). Agents lack a single canonical source of operational brand truth.

2. **Loose handoff payloads** — Agent-bus messages use `Record<string, any>` payloads. `UnifiedArtifact` types exist but aren't the default inter-agent handoff contract. Agents pass text where they should pass typed objects.

3. **Open learning loop** — Telemetry, feedback, and procedural memory are captured but never promoted into updated routing heuristics, agent instructions, eval cases, or brand brain slices. The system archives but doesn't adapt.

---

## Architecture Context

### Existing Infrastructure (do not rebuild)

| Component | File | Role |
|-----------|------|------|
| OrgProfile | `src/types/org-profile.ts` | Per-org brand identity + intent |
| Agent Harness | `src/server/agents/harness.ts` | Initialize → Orient → Act lifecycle |
| Agent Bus | `src/server/intuition/agent-bus.ts` | Broadcast + direct messaging |
| UnifiedArtifact | `src/types/unified-artifacts.ts` | 30+ typed artifact schemas |
| Procedural Memory | `src/server/services/letta/procedural-memory.ts` | Workflow trajectory storage + retrieval |
| Agent Telemetry | `src/server/services/agent-telemetry.ts` | Per-invocation metrics |
| Sleep-Time Agent | `src/server/services/letta/sleeptime-agent.ts` | Memory block consolidation |
| Context Builders | `src/server/services/org-profile.ts:434-530` | `buildCraigContextBlock()`, etc. |
| Feedback Service | `src/server/services/feedback-service.ts` | Thumbs up/down collection |
| Golden Set Eval | `scripts/run-golden-eval.mjs` | 3-tier regression gate |

### Design Principles

1. **Extend, don't replace.** OrgProfile gets new optional sections. Harness gets new hooks. Bus gets typed payloads. No rewrites.
2. **Progressive disclosure.** Brand Brain sections are loaded only when the consuming agent needs them. No mega-object in every context window.
3. **Fail-through.** Missing Brand Brain sections = agent operates as today. No regressions.
4. **Typed boundaries.** Every inter-agent handoff gets a discriminated union type. `Record<string, any>` payloads become deprecated.
5. **Promotion requires approval.** Automated learning deltas are proposed, not auto-applied. Human (or Linus) approves before they become policy.

---

## Move 1: Compiled Brand Brain

### 1.1 New OrgProfile Sections

Extend `OrgProfile` with an `operations` section containing the 10 missing operational fields. All fields optional for backward compatibility.

**File:** `src/types/org-profile.ts`

```typescript
// ─────────────────────────────────────────────────────────────────────────────
// Operations Section (NEW)
// ─────────────────────────────────────────────────────────────────────────────

export interface HeroProduct {
  skuId: string;
  name: string;
  role: 'flagship' | 'seasonal' | 'clearance' | 'campaign_anchor';
  reason?: string;
  priority: number;          // 1 = highest
  validUntil?: string;       // ISO date — auto-expire seasonal/clearance
}

export interface CampaignCalendarEntry {
  id: string;
  name: string;
  startDate: string;         // ISO date
  endDate: string;           // ISO date
  channels: string[];
  theme: string;
  expectedLiftPct?: number;
}

export interface ChannelRule {
  channel: string;           // 'sms' | 'email' | 'push' | 'instagram' | 'tiktok' | etc.
  enabled: boolean;
  frequencyCap?: number;     // max sends per customer per week
  contentTypes?: string[];   // allowed content types for this channel
  voiceOverride?: string;    // platform-specific tone adjustment
}

export interface RetailerTier {
  retailerId: string;
  name: string;
  tier: 'gold' | 'silver' | 'bronze';
}

export interface PricingPolicy {
  marginFloorPct: number;
  maxDiscountPct: number;
  elasticity?: { discountPct: number; gmImpactPct: number }[];
}

export interface CustomerSegmentDef {
  id: string;
  name: string;
  description: string;
  criteria: { field: string; operator: string; value: string }[];
  size?: number;
}

export interface OrgProfileOperations {
  /** Flagship products, seasonal picks, campaign anchors */
  heroProducts?: HeroProduct[];

  /** Planned campaigns, blackout dates */
  campaignCalendar?: CampaignCalendarEntry[];
  blackoutDates?: { date: string; reason: string }[];

  /** Per-channel rules: enabled, frequency caps, voice overrides */
  channelRules?: ChannelRule[];

  /** Retailer routing: preferred dispensaries by tier */
  retailerRouting?: {
    retailers: RetailerTier[];
    exclusivityRules?: string[];
    coopPolicies?: string[];
  };

  /** Pricing guardrails */
  pricingPolicy?: PricingPolicy;

  /** Inventory strategy (for Smokey/Mike) */
  inventoryStrategy?: {
    clearanceThresholdDays?: number;
    lowStockAlertThreshold?: number;
  };

  /** Structured customer segments (beyond generic BrandSegment) */
  customerSegments?: CustomerSegmentDef[];

  /** Vendor partnership rules */
  vendorPartnerships?: {
    vendorId: string;
    vendorName: string;
    coMarketingRules?: string[];
    coopBudget?: number;
  }[];

  /** Pre-approved messaging templates and phrases */
  contentLibrary?: {
    approvedPhrases?: { category: string; phrases: string[] }[];
    smsTemplates?: { id: string; name: string; body: string }[];
    emailTemplates?: { id: string; name: string; subject: string; body: string }[];
  };

  /** Cached performance baselines (updated nightly) */
  performanceBaselines?: {
    conversionRate?: number;
    averageOrderValue?: number;
    repeatPurchaseRate?: number;
    loyaltyEnrollmentRate?: number;
    churnRate?: number;
    lastUpdated?: string;    // ISO date
  };
}
```

### 1.2 OrgProfile Extension

```typescript
export interface OrgProfile {
  // ... existing fields ...
  brand: OrgProfileBrand;
  intent: OrgProfileIntent;
  operations?: OrgProfileOperations;  // NEW — optional for backward compat
}
```

### 1.3 Context Block Extensions

**File:** `src/server/services/org-profile.ts`

Each agent context builder gets an operations injection:

- `buildCraigContextBlock()` → injects: heroProducts, campaignCalendar, channelRules, pricingPolicy, contentLibrary
- `buildSmokeyContextBlock()` → injects: heroProducts, inventoryStrategy, customerSegments
- `buildPopsContextBlock()` → injects: performanceBaselines, campaignCalendar
- `buildDeeboContextBlock()` (new) → injects: channelRules, pricingPolicy, contentLibrary.approvedPhrases

**Progressive disclosure rule:** Only inject the fields the agent needs. Craig never sees inventoryStrategy. Smokey never sees pricingPolicy. Keep context lean.

### 1.4 Completion Scoring Update

Add operations to the scoring function:

```
Operations: heroProducts(5) + campaignCalendar(5) + channelRules(5) + performanceBaselines(5) = 20 pts
Total: Brand(40) + Intent(60) + Operations(20) = 120 pts (normalize to 100)
```

### 1.5 Default Generation

Extend `getDefaultOrgProfile()` to generate sensible operations defaults per archetype:

| Archetype | Default Hero Role | Default Channels | Pricing Floor |
|-----------|-------------------|------------------|---------------|
| `premium_boutique` | flagship | email, instagram | 45% margin |
| `value_leader` | clearance | sms, push | 25% margin |
| `community_hub` | seasonal | sms, email, instagram | 35% margin |
| `medical_focus` | flagship | email | 40% margin |
| `lifestyle_brand` | campaign_anchor | instagram, tiktok, email | 35% margin |

---

## Move 2: Artifact-Based Handoff Contracts

### 2.1 Handoff Artifact Types

**File:** `src/types/handoff-artifacts.ts` (NEW)

Define typed artifacts that agents pass to each other. Each has a discriminated `kind` field.

```typescript
export type HandoffArtifactKind =
  | 'audience_insight'
  | 'campaign_brief'
  | 'compliance_decision'
  | 'competitive_intel'
  | 'recommendation_set'
  | 'landing_page_brief'
  | 'retail_routing_decision';

interface HandoffBase {
  id: string;
  kind: HandoffArtifactKind;
  fromAgent: string;
  toAgent: string | 'broadcast';
  orgId: string;
  createdAt: string;         // ISO
  expiresAt?: string;        // ISO
  confidence: number;        // 0.0-1.0
}

export interface AudienceInsightArtifact extends HandoffBase {
  kind: 'audience_insight';
  payload: {
    segmentId: string;
    insight: string;
    dataPoints: number;
    trend: 'growing' | 'stable' | 'declining';
    recommendation?: string;
  };
}

export interface CampaignBriefArtifact extends HandoffBase {
  kind: 'campaign_brief';
  payload: {
    campaignName: string;
    objective: string;
    targetSegments: string[];
    channels: string[];
    heroProducts: string[];   // SKU IDs
    copy: { headline: string; body: string; cta: string };
    scheduledDate?: string;
    budget?: number;
  };
}

export interface ComplianceDecisionArtifact extends HandoffBase {
  kind: 'compliance_decision';
  payload: {
    contentHash: string;
    status: 'pass' | 'fail' | 'warn';
    violations: { rule: string; severity: string; excerpt: string }[];
    jurisdictions: string[];
    suggestedFixes?: string[];
  };
}

export interface CompetitiveIntelArtifact extends HandoffBase {
  kind: 'competitive_intel';
  payload: {
    competitorName: string;
    productId?: string;
    pricePoint?: number;
    dealType?: string;
    threatLevel: 'low' | 'medium' | 'high';
    suggestedResponse?: string;
  };
}

export interface RecommendationSetArtifact extends HandoffBase {
  kind: 'recommendation_set';
  payload: {
    customerId?: string;
    products: { skuId: string; name: string; score: number; reason: string }[];
    strategy: string;
  };
}

export interface LandingPageBriefArtifact extends HandoffBase {
  kind: 'landing_page_brief';
  payload: {
    pageType: string;
    headline: string;
    sections: { title: string; content: string }[];
    cta: string;
    heroProductIds?: string[];
  };
}

export interface RetailRoutingDecisionArtifact extends HandoffBase {
  kind: 'retail_routing_decision';
  payload: {
    orderId?: string;
    customerId?: string;
    selectedRetailerId: string;
    reason: string;
    alternatives: { retailerId: string; score: number }[];
  };
}

export type HandoffArtifact =
  | AudienceInsightArtifact
  | CampaignBriefArtifact
  | ComplianceDecisionArtifact
  | CompetitiveIntelArtifact
  | RecommendationSetArtifact
  | LandingPageBriefArtifact
  | RetailRoutingDecisionArtifact;
```

### 2.2 Agent Bus Typed Payloads

Extend `AgentMessage` to optionally carry a typed handoff artifact alongside the loose payload:

**File:** `src/server/intuition/schema.ts`

```typescript
export interface AgentMessage {
  // ... existing fields ...
  payload: Record<string, any>;
  /** Typed handoff artifact — preferred over loose payload */
  handoff?: HandoffArtifact;
}
```

### 2.3 Handoff Helpers

**File:** `src/server/intuition/handoff.ts` (NEW)

```typescript
export async function sendHandoff(
  tenantId: string,
  artifact: HandoffArtifact,
  requiredReactions?: string[],
): Promise<AgentMessage> {
  return sendAgentMessage(tenantId, {
    fromAgent: artifact.fromAgent as AgentName,
    toAgent: artifact.toAgent as AgentName | 'broadcast',
    topic: mapKindToTopic(artifact.kind),
    payload: {},                    // Empty — artifact carries the data
    handoff: artifact,
    requiredReactions: requiredReactions as AgentName[],
    expiresInHours: 24,
  });
}

function mapKindToTopic(kind: HandoffArtifactKind): MessageTopic {
  const map: Record<HandoffArtifactKind, MessageTopic> = {
    audience_insight: 'customer_trend',
    campaign_brief: 'demand_spike',     // Closest existing topic
    compliance_decision: 'compliance_risk',
    competitive_intel: 'price_change',
    recommendation_set: 'customer_trend',
    landing_page_brief: 'demand_spike',
    retail_routing_decision: 'inventory_alert',
  };
  return map[kind];
}
```

### 2.4 Harness Integration

When harness injects pending messages, it should also parse typed handoffs:

```typescript
// In harness orient phase, after getPendingMessages:
const handoffs = messages
  .filter(m => m.handoff)
  .map(m => m.handoff as HandoffArtifact);
if (handoffs.length > 0) {
  (agentMemory as any).pending_handoffs = handoffs;
}
```

---

## Move 3: Learning Promotion Loop

### 3.1 Learning Delta Type

**File:** `src/types/learning-delta.ts` (NEW)

```typescript
export type LearningDeltaCategory =
  | 'tool_failure_pattern'
  | 'compliance_catch_pattern'
  | 'high_performing_workflow'
  | 'manual_override_pattern'
  | 'dead_end_loop'
  | 'brand_brain_update'
  | 'eval_case_candidate';

export interface LearningDelta {
  id: string;
  category: LearningDeltaCategory;
  orgId?: string;              // null = global
  agentName?: string;          // null = all agents
  summary: string;             // Human-readable description
  evidence: {
    source: 'telemetry' | 'feedback' | 'procedural_memory' | 'golden_set' | 'production_incident';
    count: number;             // How many times this pattern was observed
    timeWindow: string;        // e.g. '7d', '24h'
    sampleIds?: string[];      // Reference IDs for evidence
  };
  proposedAction: {
    type: 'update_routing' | 'update_instructions' | 'update_brand_brain' | 'add_eval_case' | 'update_guardrail';
    target: string;            // File path or Firestore path
    diff: string;              // Human-readable proposed change
  };
  status: 'proposed' | 'approved' | 'rejected' | 'applied';
  proposedAt: string;          // ISO
  reviewedBy?: string;         // uid or 'linus'
  reviewedAt?: string;         // ISO
  appliedAt?: string;          // ISO
}
```

### 3.2 Nightly Consolidation Cron

**File:** `src/app/api/cron/consolidate-learnings/route.ts` (NEW)

This cron job runs nightly and produces `LearningDelta` proposals:

```
Schedule: 0 4 * * * (4 AM UTC daily)
Auth: CRON_SECRET bearer token
```

**Pipeline:**

1. **Query telemetry** (last 24h):
   - Tool failures grouped by `toolName + errorType` → `tool_failure_pattern` deltas
   - Dead-end loops (`deadEndLoopCount > 0`) → `dead_end_loop` deltas
   - Capability utilization < 30% → flag underused tools

2. **Query feedback** (last 24h):
   - Negative feedback grouped by agent + org → pattern detection
   - If same complaint 3+ times → `manual_override_pattern` delta

3. **Query procedural memory** (last 7d):
   - Top-scoring workflows → `high_performing_workflow` deltas
   - Failed workflows with repeated patterns → `tool_failure_pattern` deltas

4. **Query compliance catches** (last 24h):
   - Deebo rule_check events with violations → `compliance_catch_pattern` deltas
   - Repeated violations on same content type → propose guardrail update

5. **Generate deltas:**
   - Each pattern above → one `LearningDelta` with `status: 'proposed'`
   - Store to Firestore `learning_deltas` collection

6. **Notify:**
   - Post summary to Slack #ops channel
   - If any `tool_failure_pattern` count > 10 → tag as urgent

### 3.3 Delta Approval Flow

**File:** `src/app/api/learning-deltas/route.ts` (NEW)

REST API for reviewing and approving deltas:

```
GET  /api/learning-deltas?status=proposed     → list pending deltas
POST /api/learning-deltas/:id/approve         → approve + auto-apply
POST /api/learning-deltas/:id/reject          → reject with reason
```

**Auto-apply by category:**

| Category | Apply Action |
|----------|-------------|
| `tool_failure_pattern` | Update agent system prompt with "avoid X pattern" |
| `compliance_catch_pattern` | Add rule to Deebo regex rule pack |
| `high_performing_workflow` | Boost workflow importance score in procedural memory |
| `manual_override_pattern` | Flag in brand brain for human review |
| `dead_end_loop` | Add to golden set as negative test case |
| `brand_brain_update` | Merge proposed change into `OrgProfile.operations` |
| `eval_case_candidate` | Append to `.agent/golden-sets/*.json` |

### 3.4 Performance Baseline Refresh

Extend the nightly cron to also refresh `OrgProfile.operations.performanceBaselines`:

```typescript
// Query Firestore for last 30 days of order data
// Calculate: conversionRate, AOV, repeatPurchaseRate, loyaltyEnrollmentRate, churnRate
// Write to org_profiles/{orgId}.operations.performanceBaselines
```

This ensures Pops and Craig always have fresh baselines without querying at agent runtime.

### 3.5 Harness Learning Injection

During `initialize()`, the harness should optionally inject recent approved deltas as context:

```typescript
// After loading agentMemory, before calling implementation.initialize():
const recentDeltas = await getApprovedDeltas(brandId, agentName, { limit: 3, since: '7d' });
if (recentDeltas.length > 0) {
  (agentMemory as any).recent_learnings = recentDeltas.map(d => d.summary);
}
```

This gives agents awareness of recent system-level learnings without bloating their permanent instructions.

---

## Implementation Plan

### Phase 1: Brand Brain (this PR)

| Step | File | Change |
|------|------|--------|
| 1a | `src/types/org-profile.ts` | Add `OrgProfileOperations` interface + all sub-types |
| 1b | `src/types/org-profile.ts` | Add optional `operations` field to `OrgProfile` |
| 1c | `src/types/org-profile.ts` | Update completion scoring to include operations |
| 1d | `src/server/services/org-profile.ts` | Extend context block builders |
| 1e | `src/server/services/intent-profile.ts` | Add default operations per archetype |

### Phase 2: Handoff Artifacts (this PR)

| Step | File | Change |
|------|------|--------|
| 2a | `src/types/handoff-artifacts.ts` | New file — all typed handoff artifact interfaces |
| 2b | `src/server/intuition/schema.ts` | Add optional `handoff` field to `AgentMessage` |
| 2c | `src/server/intuition/handoff.ts` | New file — `sendHandoff()` helper |
| 2d | `src/server/agents/harness.ts` | Parse `pending_handoffs` from bus messages |

### Phase 3: Learning Promotion Loop (follow-up PR)

| Step | File | Change |
|------|------|--------|
| 3a | `src/types/learning-delta.ts` | New file — LearningDelta type |
| 3b | `src/app/api/cron/consolidate-learnings/route.ts` | New cron endpoint |
| 3c | `src/app/api/learning-deltas/route.ts` | New REST API for delta review |
| 3d | `src/server/agents/harness.ts` | Inject recent approved deltas |
| 3e | Cloud Scheduler | Wire cron job |

---

## Failure Modes

| Scenario | Mitigation |
|----------|-----------|
| OrgProfile missing `operations` | All fields optional. Context builders skip missing sections. Zero regression. |
| Bus message has no `handoff` field | Existing `payload` still works. Handoff is additive. |
| Nightly cron fails | Learning deltas not proposed — system operates as today. No degradation. |
| Delta auto-apply corrupts agent instructions | Deltas are `proposed` by default. Require explicit approval. Rollback via version history. |
| Context bloat from operations injection | Progressive disclosure — each agent gets only its relevant fields. Monitored via telemetry `inputTokens`. |
| Stale performanceBaselines | `lastUpdated` field. If > 7d stale, agents fall back to live query. |

---

## Observability

| Signal | Where |
|--------|-------|
| Brand Brain completion % | `OrgProfile.completionPct` (updated on every save) |
| Handoff artifact volume | `agent_telemetry` + bus message counts by `handoff.kind` |
| Learning delta throughput | `learning_deltas` collection: proposed/approved/rejected counts |
| Delta approval latency | `proposedAt` → `reviewedAt` time delta |
| Context token impact | Compare `inputTokens` before/after operations injection via telemetry |

---

## Verification

- [ ] `npm run check:types` passes with all new types
- [ ] Existing agents work unchanged when `operations` is undefined
- [ ] Context block builders inject operations fields when present
- [ ] `sendHandoff()` creates valid bus messages with typed artifacts
- [ ] Harness parses `pending_handoffs` correctly
- [ ] Completion scoring handles 0 operations gracefully
- [ ] Default profile generation includes sensible operations per archetype
