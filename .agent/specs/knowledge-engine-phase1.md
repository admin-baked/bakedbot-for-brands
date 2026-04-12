# BakedBot Knowledge Engine — Phase 1 AI-Executable Spec

> **Status:** Approved for build  
> **Supersedes:** `.agent/specs/knowledge-graph-internal.md` (BakedKnow Supabase design — do not follow it)

---

## Risk Tier

**risk:tier2**

New persistent business-state layer, new cron-driven ingestion + alerting, new cross-domain Letta bridge, new Boardroom + Intelligence UI surfaces.

---

## Implementation Goal

Build a structured knowledge layer that turns raw competitive intel, campaign history, playbook outcomes, and agent observations into durable, scoped, explainable business knowledge.

The system must:
1. ingest source data into canonical entities, claims, observations, and edges
2. compute confidence and evidence state
3. store chunked retrieval records in LanceDB
4. serve scoped retrieval for agents and product surfaces
5. promote only high-value runtime slices into Letta
6. surface proactive alerts in both Intelligence and Boardroom

---

## Canonical Reuse

Reuse and extend these existing systems — do NOT create parallel implementations:

- `src/server/services/letta/memory-bridge.ts`
- `src/server/services/letta/memory-types.ts`
- `src/server/services/letta/associative-memory.ts`
- `src/server/services/letta/block-manager.ts` — use `BLOCK_LABELS` for block names
- `src/server/services/ezal/report-generator.ts`
- `src/app/dashboard/intelligence/`
- `src/app/dashboard/ceo/`
- `src/app/api/cron/competitive-intel/route.ts`
- `src/app/api/cron/playbook-runner/route.ts`
- `tenants/{orgId}/insights/*` existing insight surface
- existing Firestore admin and logger patterns

**LanceDB:** Reuse the GCS connection pattern from `src/server/services/ezal/lancedb-store.ts` —
do not duplicate `LANCEDB_URI` env handling or `buildStorageOptions()`.
Import `getConnection()` or copy the exact pattern into `lancedb-repo.ts`.

**BakedKnow superseded:** `.agent/specs/knowledge-graph-internal.md` proposed Supabase+pgvector.
This implementation uses Firestore+LanceDB (same stack as Ezal). BakedKnow is deprecated — do not follow it.

Do not create a parallel memory runtime.
Do not duplicate Letta blocks as a second working-memory system.
Do not bypass existing Intelligence or Boardroom surfaces.

---

## Phase 1 Architecture

### Layer 1 — Source ingestion
Inputs: competitor reports, competitor product snapshots, campaign metadata + outcomes,
Welcome Playbook execution artifacts, Check-In flow outcomes, New/Returning Customer flow outcomes,
420 Playbook artifacts for Thrive Syracuse, agent-authored observations from Ezal/Craig/Marty.

### Layer 2 — Canonical knowledge graph
Persist durable entities, claims, observations, sources, and edges in Firestore.

### Layer 3 — Vector retrieval store
Persist chunk embeddings and retrieval metadata in LanceDB.

### Layer 4 — Runtime promotion
Promote only high-confidence, currently relevant slices into Letta blocks.

### Layer 5 — Product delivery
Surface results in Intelligence dashboard, CEO Boardroom / Mission Control,
Welcome Playbook and Check-In context builders.

---

## Files to Create

### Core types and ontology
1. `src/server/services/knowledge-engine/types.ts`
2. `src/server/services/knowledge-engine/ontology.ts`
3. `src/server/services/knowledge-engine/scoring.ts`
4. `src/server/services/knowledge-engine/promotion-policy.ts`
5. `src/server/services/knowledge-engine/constants.ts`

### Persistence and retrieval
6. `src/server/services/knowledge-engine/firestore-repo.ts`
7. `src/server/services/knowledge-engine/lancedb-repo.ts`
8. `src/server/services/knowledge-engine/chunking.ts`
9. `src/server/services/knowledge-engine/search.ts`
10. `src/server/services/knowledge-engine/runtime-context.ts`

### Ingestion and processing
11. `src/server/services/knowledge-engine/ingest-competitive-intel.ts`
12. `src/server/services/knowledge-engine/ingest-campaign-history.ts`
13. `src/server/services/knowledge-engine/ingest-playbook-runs.ts`
14. `src/server/services/knowledge-engine/ingest-agent-observations.ts`
15. `src/server/services/knowledge-engine/alerts.ts`
16. `src/server/services/knowledge-engine/index.ts`

### Letta bridge extension
17. `src/server/services/knowledge-engine/letta-promotion.ts`

### API routes
18. `src/app/api/cron/knowledge-runtime-promotion/route.ts`
19. `src/app/api/cron/knowledge-alerts/route.ts`
20. `src/app/api/knowledge/search/route.ts`
21. `src/app/api/knowledge/executive-brief/route.ts`

### Intelligence dashboard
22. `src/app/dashboard/intelligence/actions/knowledge.ts`
23. `src/app/dashboard/intelligence/components/knowledge-change-feed.tsx`
24. `src/app/dashboard/intelligence/components/knowledge-confidence-panel.tsx`
25. `src/app/dashboard/intelligence/components/knowledge-action-recommendations.tsx`

### Boardroom
26. `src/app/dashboard/ceo/components/knowledge-executive-brief.tsx`
27. `src/app/dashboard/ceo/components/knowledge-alerts-panel.tsx`

### Tests and eval
28. `src/server/services/knowledge-engine/__tests__/scoring.test.ts`
29. `src/server/services/knowledge-engine/__tests__/promotion-policy.test.ts`
30. `src/server/services/knowledge-engine/__tests__/search.test.ts`
31. `src/server/services/knowledge-engine/__tests__/ingest-competitive-intel.test.ts`
32. `.agent/golden-sets/knowledge-engine-phase1.json`
33. `dev/testing/knowledge-engine-phase1-thrive-scenarios.md`

---

## Files to Modify

1. `src/server/services/letta/memory-bridge.ts`
2. `src/server/services/letta/index.ts`
3. `src/server/services/ezal/report-generator.ts`
4. `src/app/api/cron/competitive-intel/route.ts`
5. `src/app/api/cron/playbook-runner/route.ts`
6. `src/app/dashboard/intelligence/page.tsx`
7. `src/app/dashboard/ceo/page.tsx`
8. `src/app/dashboard/ceo/components/mission-control-tab.tsx`
9. `.agent/refs/bakedbot-intelligence.md`
10. `.agent/engineering-agents/intel-ivan/memory/architecture.md`

---

## Firestore Collections

All documents require `tenantId`. Query patterns listed for index planning.

### `knowledge_entities`
```typescript
interface KnowledgeEntity {
  id: string;
  tenantId: string;
  entityType:
    | 'brand'
    | 'competitor'
    | 'product'
    | 'campaign'
    | 'playbook'
    | 'flow'
    | 'audience_segment'   // Phase 2+
    | 'location'           // Phase 2+
    | 'metric_snapshot'    // Phase 2+
    // Phase 2+: compliance_rule
    ;
  externalRef?: string;
  name: string;
  canonicalName: string;   // trim().toLowerCase(), collapsed whitespace
  status: 'active' | 'inactive' | 'archived';
  tags: string[];
  metadata: Record<string, unknown>;
  sourceIds: string[];
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}
```

### `knowledge_sources`
```typescript
interface KnowledgeSource {
  id: string;
  tenantId: string;
  sourceType:
    | 'competitive_report'
    | 'competitor_snapshot'
    | 'campaign_record'
    | 'playbook_run'
    | 'checkin_event'
    | 'agent_observation'
    | 'manual_note'
    | 'first_party_metric';
  title: string;
  sourceRef: string;
  url?: string;
  observedAt: FirebaseFirestore.Timestamp;
  importedAt: FirebaseFirestore.Timestamp;
  trustClass: 'first_party' | 'trusted_external' | 'external' | 'agent_generated';
  checksum: string;   // SHA-256 of (tenantId + sourceRef + content). Dedup key.
  metadata: Record<string, unknown>;
}
```

### `knowledge_observations`
```typescript
interface KnowledgeObservation {
  id: string;
  tenantId: string;
  sourceId: string;
  observationType:
    | 'competitor_change'
    | 'campaign_outcome'
    | 'playbook_outcome'
    | 'customer_flow_outcome'
    | 'market_signal'
    | 'agent_note';
  title: string;
  summary: string;
  entityIds: string[];
  rawContent: string;
  observedAt: FirebaseFirestore.Timestamp;
  createdBy: string;
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}
```

### `knowledge_claims`
```typescript
interface KnowledgeClaim {
  id: string;
  tenantId: string;
  entityIds: string[];
  observationIds: string[];
  sourceIds: string[];
  claimType:
    | 'competitor_promo'
    | 'competitor_price_shift'
    | 'campaign_pattern'
    | 'playbook_pattern'
    | 'flow_pattern'
    | 'recommendation'
    | 'risk';
  claimText: string;         // max 400 characters
  state: 'signal' | 'working_fact' | 'verified_fact' | 'dismissed';
  confidenceScore: number;   // 0.00 - 1.00, rounded to 2 decimals
  confidenceBand: 'low' | 'medium' | 'high';
  evidenceType:
    | 'first_party_system'
    | 'first_party_user'
    | 'external_scrape'
    | 'external_api'
    | 'inferred'
    | 'human_reviewed';
  recencyBucket: 'today' | '7d' | '14d' | '30d' | 'stale';
  impactLevel: 'low' | 'medium' | 'high' | 'critical';
  promotedToLetta: boolean;
  promotedAt?: FirebaseFirestore.Timestamp;
  expiresAt?: FirebaseFirestore.Timestamp;
  supersedesClaimId?: string;
  contradictedByClaimIds: string[];
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}
```

### `knowledge_edges`
```typescript
interface KnowledgeEdge {
  id: string;
  tenantId: string;
  fromId: string;
  toId: string;
  edgeType:
    | 'belongs_to_brand'
    | 'competes_with'
    | 'promotes_product'
    | 'observed_in_campaign'
    | 'generated_by_playbook'
    | 'associated_with_flow'
    | 'derived_from_source'
    | 'supports_claim'
    | 'contradicts_claim'
    | 'supersedes_claim'
    | 'recommends_action_for';
  strength: number;   // 0.00 - 1.00
  sourceIds: string[];
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}
```

### `knowledge_ingestion_runs`
```typescript
interface KnowledgeIngestionRun {
  id: string;
  tenantId: string;
  pipeline: 'competitive_intel' | 'campaign_history' | 'playbook_runs' | 'agent_observations';
  status: 'running' | 'completed' | 'failed';
  sourceCount: number;
  observationCount: number;
  claimCount: number;
  promotedCount: number;
  startedAt: FirebaseFirestore.Timestamp;
  completedAt?: FirebaseFirestore.Timestamp;
  error?: string;
}
```

### `knowledge_runtime_promotions`
```typescript
interface KnowledgeRuntimePromotion {
  id: string;
  tenantId: string;
  targetAgent: 'marty' | 'craig' | 'ezal' | 'system';
  targetBlock:
    | 'executive_workspace'
    | 'brand_context'
    | 'playbook_status'
    | 'agent_craig_memory'
    | 'agent_ezal_memory';
  claimIds: string[];
  reason: 'high_confidence_recent' | 'playbook_runtime_context' | 'boardroom_brief' | 'manual_force';
  payload: string;
  createdAt: FirebaseFirestore.Timestamp;
}
```

### `knowledge_alerts`
```typescript
interface KnowledgeAlert {
  id: string;
  tenantId: string;
  category: 'competitive' | 'playbook' | 'campaign' | 'boardroom';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  summary: string;
  claimIds: string[];
  actionOwner: 'marty' | 'craig' | 'ezal' | 'ops';
  surfacedInBoardroom: boolean;
  surfacedInIntelligence: boolean;
  mirroredInsightId?: string;
  createdAt: FirebaseFirestore.Timestamp;
}
```

> **Firestore indexes needed** (create via `npm run audit:indexes` after Step 1 deploy):
> - `knowledge_claims`: (tenantId, state, impactLevel, recencyBucket)
> - `knowledge_alerts`: (tenantId, severity, surfacedInBoardroom)
> - `knowledge_claims`: (tenantId, promotedToLetta, updatedAt)

---

## LanceDB Tables

Connection: reuse `LANCEDB_URI` + `buildStorageOptions()` pattern from
`src/server/services/ezal/lancedb-store.ts`. Same GCS bucket in production.

### `knowledge_chunks`
```typescript
interface KnowledgeChunkRow {
  id: string;
  tenantId: string;
  chunkType: 'observation' | 'claim' | 'source_excerpt' | 'playbook_context';
  entityIds: string;      // JSON-encoded string[] (LanceDB flat schema)
  claimIds: string;       // JSON-encoded string[]
  sourceIds: string;      // JSON-encoded string[]
  text: string;
  vector: number[];       // 768-dim Gemini embedding
  confidenceScore: number;
  state: string;
  domain: string;
  recencyScore: number;
  createdAtIso: string;
}
```

### `knowledge_entities_index`
```typescript
interface KnowledgeEntityIndexRow {
  id: string;
  tenantId: string;
  entityType: string;
  canonicalName: string;
  text: string;
  vector: number[];
  tags: string;           // JSON-encoded string[]
  createdAtIso: string;
}
```

---

## Exact Type Definitions — `types.ts`

```typescript
export type KnowledgeDomain =
  | 'competitive_intel'
  | 'campaign_history'
  | 'welcome_playbooks'
  | 'checkin_flow'
  | 'playbook_420';    // was thrive_420 — org-agnostic

export interface KnowledgeSearchRequest {
  tenantId: string;
  query: string;
  domain?: KnowledgeDomain;
  entityTypes?: string[];
  minConfidence?: number;
  state?: Array<'signal' | 'working_fact' | 'verified_fact'>;
  lookbackDays?: number;
  limit?: number;
}

export interface KnowledgeSearchResult {
  claimId: string;
  text: string;
  confidenceScore: number;
  state: 'signal' | 'working_fact' | 'verified_fact';
  sourceTitles: string[];
  entityNames: string[];
  explanation: string;
  score: number;
}

export interface RuntimeKnowledgeContext {
  tenantId: string;
  domain: KnowledgeDomain;
  summary: string;
  topClaims: KnowledgeSearchResult[];
  promotedClaimIds: string[];
}
```

---

## Ontology Rules

### Entity rules
- One canonical entity per `(tenantId, entityType, canonicalName)`.
- `canonicalName` = `trim().toLowerCase()` with repeated whitespace collapsed.
- Duplicate detection: `(tenantId, entityType, canonicalName)` first, `externalRef` second.

### Claim rules
- Claim text <= 400 characters.
- Every claim must reference at least one source and one observation.
- Every claim must carry `confidenceScore`, `state`, `evidenceType`, and `impactLevel`.

### Edge rules
- Every edge is directional.
- Every edge includes `sourceIds`.
- Uniqueness key: `(tenantId, fromId, toId, edgeType)`.

---

## Confidence and State Model

### Score bands
- `0.00 – 0.34` → `low`
- `0.35 – 0.59` → `medium`
- `0.60 – 1.00` → `high`

### State rules
- `signal`: score < 0.60, or single-source external without confirmation
- `working_fact`: score >= 0.60 and < 0.85, or meaningful repeated observation not yet first-party confirmed
- `verified_fact`: score >= 0.85 AND (trusted first-party source, OR two separate source confirmations, OR repeated across two ingestion runs)
- `dismissed`: contradicted by stronger claim, or explicitly marked invalid

### Auto-promotion threshold (all must be true)
- `state === 'verified_fact'`
- `confidenceScore >= 0.85`
- `impactLevel in ['high', 'critical']` OR `domain in ['welcome_playbooks', 'checkin_flow']`
- `recencyBucket in ['today', '7d', '14d']`
- not contradicted

---

## Scoring Formula — `scoring.ts`

```typescript
export function computeConfidenceScore(input: {
  trustClass: 'first_party' | 'trusted_external' | 'external' | 'agent_generated';
  sourceCount: number;
  repeatedAcrossRuns: boolean;
  firstPartyConfirmation: boolean;
  contradictionCount: number;
  ageDays: number;
}): number
```

**Formula:**

```
base trust:
  first_party       = 0.85
  trusted_external  = 0.70
  external          = 0.55
  agent_generated   = 0.45

+0.08 if sourceCount >= 2
+0.07 if repeatedAcrossRuns
+0.10 if firstPartyConfirmation
-0.10 per contradiction, max -0.20

Age penalty (apply the LARGER deduction only — NOT cumulative):
  ageDays > 30 → -0.10
  ageDays > 14 → -0.05
  (if ageDays > 30, use -0.10 only, not -0.15)

clamp 0.00 to 1.00
round to 2 decimals
```

**Test cases:**
1. trusted_external + 2 sources + repeated → `0.85`
2. external + single-source + ageDays=35 → `0.45`  (0.55 − 0.10)
3. first_party + 1 contradiction → `0.75`  (0.85 − 0.10)

---

## Function Signatures

### `ingest-competitive-intel.ts`
```typescript
export async function ingestCompetitiveIntelKnowledge(input: {
  tenantId: string;
  reportMarkdown: string;
  sourceRef: string;
  observedAt: Date;
  createdBy: 'ezal' | 'system';
}): Promise<{ sourceId: string; observationIds: string[]; claimIds: string[] }>
```

### `ingest-campaign-history.ts`
```typescript
export async function ingestCampaignHistoryKnowledge(input: {
  tenantId: string;
  campaignId: string;
  campaignName: string;
  metrics: Record<string, number>;
  summaryText: string;
  observedAt: Date;
}): Promise<{ observationIds: string[]; claimIds: string[] }>
```

### `ingest-playbook-runs.ts`
```typescript
export async function ingestPlaybookRunKnowledge(input: {
  tenantId: string;
  playbookId: string;
  playbookName: string;
  flowType: 'checkin' | 'new_customer' | 'returning_customer' | 'welcome' | '420';
  runSummary: string;
  metrics: Record<string, number>;
  observedAt: Date;
}): Promise<{ observationIds: string[]; claimIds: string[] }>
```

### `search.ts`
```typescript
export async function searchKnowledge(request: KnowledgeSearchRequest): Promise<KnowledgeSearchResult[]>
export async function searchKnowledgeForExecutiveBrief(input: {
  tenantId: string; lookbackDays: number; limit: number;
}): Promise<KnowledgeSearchResult[]>
```

### `runtime-context.ts`
```typescript
export async function buildWelcomePlaybookKnowledgeContext(input: {
  tenantId: string;
  flowType: 'checkin' | 'new_customer' | 'returning_customer' | 'welcome' | '420';
  limit?: number;
}): Promise<RuntimeKnowledgeContext>

export async function buildCompetitiveIntelActionContext(input: {
  tenantId: string; limit?: number;
}): Promise<RuntimeKnowledgeContext>
```

### `letta-promotion.ts`
```typescript
export async function promoteRuntimeKnowledgeToLetta(input: {
  tenantId: string;
  targetAgent: 'marty' | 'craig' | 'ezal' | 'system';
  domain: KnowledgeDomain;
  limit?: number;
}): Promise<{ promotionIds: string[]; promotedClaimIds: string[] }>
```

### `alerts.ts`
```typescript
export async function generateKnowledgeAlerts(input: {
  tenantId: string; lookbackDays?: number;
}): Promise<{ alertIds: string[]; mirroredInsightIds: string[] }>
```

---

## Letta Bridge

### Block mapping
- Marty → `executive_workspace`
- Craig → `agent_craig_memory`
- Ezal → `agent_ezal_memory`
- Welcome/Check-In → `playbook_status`
- shared brand situation → `brand_context`

### Payload template (max 3,500 characters — trim lowest-scoring claims first)
```
Knowledge Engine Runtime Context
Domain: {domain}
Generated At: {iso}

Summary:
{summary}

Top Verified Claims:
- {claim 1} [confidence: 0.91 | sources: 2]
- {claim 2} [confidence: 0.88 | sources: 1]

Actions To Consider:
- {action 1}
- {action 2}
```

---

## Ingestion Pipelines

### Competitive Intel
After weekly report generation in `competitive-intel/route.ts`:
1. `ingestCompetitiveIntelKnowledge(...)`
2. `generateKnowledgeAlerts(...)`
3. If new verified high-impact claims → `promoteRuntimeKnowledgeToLetta(...)` for ezal, craig, marty

**Claim types to extract in Phase 1 only:**
- competitor promo started
- competitor price dropped >= 15% (material threshold)
- competitor price dropped >= 30% across 2+ same-category products in 7 days (critical/price war)
- competitor launched new product cluster
- competitor discontinued product cluster
- competitor repeated promotion pattern

### Campaign History
Trigger from existing analytics write path. If no hook exists, schedule daily backfill
inside `ingest-campaign-history.ts`.

### Playbook Runs
In `playbook-runner/route.ts`, before execution:
- call `buildWelcomePlaybookKnowledgeContext(...)` for matching flow types
- attach context to runtime payload

After run completion:
- call `ingestPlaybookRunKnowledge(...)`
- if high-confidence new flow pattern claim → promote to Letta `playbook_status`

Matching flow types: `checkin`, `new_customer`, `returning_customer`, `welcome`, `420`

---

## Retrieval Rules

### Search order
1. Firestore entity exact-match lookup
2. LanceDB claim chunk vector search
3. Firestore edge expansion (1-hop related entities + supporting claims)
4. Score blend: vector relevance 0.45 · confidence score 0.25 · recency score 0.20 · impact level 0.10

### Defaults
- `minConfidence = 0.60`
- `lookbackDays = 14`
- `state = ['working_fact', 'verified_fact']`
- if domain is `welcome_playbooks` or `checkin_flow` → allow `lookbackDays = 30`

### Required on every result
claim text, confidence score, state, source titles, entity names, one-sentence explanation.
No result may omit provenance.

---

## Proactive Alert Rules

Create `knowledge_alerts` when:
- new critical competitive claim
- new high-confidence campaign pattern affecting active flows
- new playbook pattern indicating check-in or welcome degradation
- conflicting verified claims on same entity pair

When severity is `warning` or `critical`, also mirror to `tenants/{orgId}/insights/{insightId}`:
```typescript
{
  category: 'competitive',
  severity: 'warning' | 'critical',
  title: string,
  summary: string,
  source: 'knowledge_engine',
  claimIds: string[],
  createdAt: serverTimestamp(),
}
```

---

## Welcome and Check-In Runtime Rules

For `checkin`, `new_customer`, `returning_customer`, `welcome`, `420`:
1. retrieve top 5 relevant claims
2. require `minConfidence >= 0.70`
3. summarize into <= 1,200 characters
4. write into Letta `playbook_status` block only if payload changed materially

Materially changed: at least one new claimId, or summary hash changed.

---

## Failure Modes

| Mode | Handling |
|------|----------|
| Duplicate ingestion | `checksum` on `knowledge_sources`. Skip if same tenant+sourceRef checksum exists. |
| Contradictory claims | Write both, add `contradicts_claim` edge. If score diff >= 0.15 → downgrade weaker. If < 0.15 → warning alert for manual review. |
| LanceDB unavailable | Log error, continue Firestore persistence. Fall back to Firestore exact + recent claim lookup. |
| Letta promotion failure | Never fail ingestion. Write `knowledge_runtime_promotions` only after successful block write. Log warning, continue. |
| No eligible claims | Do not overwrite existing Letta block. Return `"No fresh verified runtime knowledge available."` |

---

## Observability

Every ingestion pipeline logs: `tenantId`, `pipeline`, `sourceCount`, `observationCount`,
`claimCount`, `promotedCount`, `durationMs`, `status`. Use `@/lib/logger` only. No `console.log`.

---

## Backfill Note

Historical Ezal competitive intel (in LanceDB + Firestore under the Ezal schema) is **not backfilled**
in Phase 1. Ingestion begins from the next competitive-intel cron run post-deploy.
This is intentional — the acceptance scenarios can run with fresh data.

---

## Rollout Order

| Step | Deliverables |
|------|-------------|
| 1 | types, ontology, scoring, promotion-policy, constants, firestore-repo, chunking |
| 2 | lancedb-repo, search, runtime-context, all 4 ingestion pipelines, alerts, index |
| 3 | API routes (search, executive-brief, cron-promotion, cron-alerts); Intelligence dashboard components |
| 4 | letta-promotion; memory-bridge extensions; Boardroom components |
| 5 | competitive-intel cron wiring; playbook-runner wiring |
| 6 | Tests, golden set, Thrive acceptance scenarios doc |

---

## Acceptance Criteria (Done Definition)

Phase 1 is done only when all are true:
1. Competitive intel writes structured observations and claims
2. Search API returns grounded results with confidence and provenance
3. Intelligence dashboard shows changes, confidence, and actions
4. Boardroom shows executive brief and alerts
5. Welcome and Check-In flows consume runtime knowledge context
6. Letta receives only promoted high-value slices
7. Golden set thresholds pass:
   - claim grounding precision >= 0.90
   - provenance presence = 1.00
   - false verified-fact rate <= 0.05
   - Letta promotion precision >= 0.90
   - executive brief action relevance >= 0.85
8. Thrive Syracuse scenarios pass manual acceptance

---

## Explicit Non-Goals

- full dispensary or grower ontology
- raw document warehouse inside Letta
- autonomous action publishing without approval layer
- replacing existing task queue or insights surface
- backfilling historical Ezal data
