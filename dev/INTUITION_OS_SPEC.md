# BakedBot “Intuition on Firebase” Implementation Spec (v1)

This document is the build-spec for giving Smokey, Pops, and Deebo a **repeatable “intuition loop”** using Firebase (Firestore + Cloud Functions/Run + Scheduler). It’s written for AI dev agents to implement directly.

---

## 0) What we mean by “intuition” in this system

Everything reduces to **four closed loops**:

1. **Log everything (raw experience)**
   Every interaction, decision, and outcome is written as **append-only events**.

2. **Summarize + cluster (memory formation)**
   Scheduled/offline jobs turn events into **memories, heuristics, patterns**.

3. **Use memory at runtime (fast System 1)**
   Agents fetch memories/heuristics/patterns first to act quickly.

4. **Escalate + verify when uncertain (slow System 2)**
   If confidence is low, run deeper reasoning / multi-agent review.

5. **Close the loop with feedback**
   Store outcomes and update heuristic stats so the system gets sharper.

Firestore is the backbone for:

* Long-term memory (tenant/customer/agent)
* Heuristics & rules (editable without redeploy)
* Pattern outputs (clusters, anomalies, risk patterns)
* Multi-agent coordination (messages/insights)

Compute is done by:

* **Cloud Functions** (realtime triggers, lightweight aggregation)
* **Cloud Run jobs** (heavier clustering, forecasting, backfills)
* **Cloud Scheduler** (cron)

---

## 1) Hard platform constraints (design around these)

These are not “nice to know”; they shape the schema:

* **Max document size:** 1 MiB (1,048,576 bytes). ([Firebase][1])
* **Max index entries per document:** 40,000. ([Firebase][1])
* **Max indexed field value:** 1500 bytes (values over this truncate and can break query consistency). ([Firebase][1])
* **TTL deletion is not instant** (typically within 24 hours) and **does not delete subcollections**. ([Google Cloud Documentation][2])
* **Security Rules document access call limits:**

  * 10 for single-document & query requests
  * 20 for multi-document reads/transactions/batched writes (plus the per-op 10 limit) ([Firebase][3])
* Firestore can do **KNN vector search**, but **does not generate embeddings** (you must generate them elsewhere and store them). ([Firebase][4])

**Implications**

* Don’t store huge transcripts in a single doc. Use Storage or chunked subcollections.
* Keep “hot” docs (customer profile) compact; push details into events/subcollections.
* Avoid indexing giant strings; store hashes + structured fields for queries.

---

## 2) Multi-tenant layout (canonical paths)

All tenant data lives under:

```
/tenants/{tenantId}/...
```

Global/shared configuration lives outside tenants:

```
/jurisdictions/{jurisdictionId}/...
/agents/{agentId}  // global agent configs, defaults, prompt templates, etc.
```

### Tenant collections (core)

```
tenants/{t}
  customers/{customerId}
  products/{productId}

  // Event-sourcing backbone
  agentEvents/{eventId}

  // Derived “intuition” state
  agentMemories/{memoryId}     // customer profiles, store profiles, etc.
  heuristics/{heuristicId}     // System-1 rules, editable in UI
  patterns/{patternId}         // clusters, anomaly baselines, risk patterns

  // Agent outputs
  popsInsights/{insightId}
  deeboAlerts/{alertId}

  // Compliance runtime logs
  complianceEvents/{eventId}

  // Multi-agent coordination
  agentMessages/{messageId}

  // Experimentation / evaluation
  experiments/{experimentId}
  outcomes/{outcomeId}
```

---

## 3) The event model (append-only “experience log”)

### 3.1 AgentEvent (single universal event schema)

**Collection:** `tenants/{t}/agentEvents`

```ts
type AgentEvent = {
  id: string;
  tenantId: string;

  agent: 'smokey' | 'pops' | 'deebo';
  sessionId: string;           // stable per chat/task session
  actorId?: string;            // userId, customerId, employeeId, system
  customerId?: string;         // optional for Smokey

  type:
    | 'message_in'
    | 'message_out'
    | 'recommendation_shown'
    | 'product_clicked'
    | 'order_completed'
    | 'feedback'
    | 'metric_snapshot'         // Pops
    | 'rule_check'              // Deebo
    | 'alert_issued'
    | 'task_started'
    | 'task_completed';

  payload: Record<string, any>; // keep bounded; large blobs elsewhere
  createdAt: FirebaseFirestore.Timestamp;

  // Dual-system metadata
  systemMode?: 'fast' | 'slow';
  confidenceScore?: number;     // 0..1
  traceId?: string;             // for correlating logs across systems
};
```

### 3.2 Event write rules (critical)

* Events are **immutable**. Never update; only append.
* Use **idempotency keys** to prevent duplicate writes (e.g., `eventId = ${sessionId}_${type}_${ts}_${nonce}`).
* Keep `payload` compact; store `contentHash` + pointers to Storage for big data.

---

## 4) Derived “memory” model (what System 1 reads)

System 1 reads **memories + heuristics + patterns**.

## 4.1 CustomerProfileMemory (Smokey’s “this feels familiar”)

**Collection:** `tenants/{t}/agentMemories` with `type = 'customer_profile'`

```ts
type CustomerProfileMemory = {
  id: string;                   // same as customerId
  type: 'customer_profile';
  tenantId: string;
  customerId: string;

  favoriteEffects: string[];
  avoidEffects: string[];
  preferredFormats: string[];
  potencyTolerance: 'low' | 'medium' | 'high';

  lastProducts: string[];       // productIds (small list)
  lastVisitedAt: Timestamp;

  // Similarity + clustering
  embeddingField?: number[];    // if using Firestore vector search
  clusters?: string[];

  updatedAt: Timestamp;
};
```

**Builder job (Cloud Function scheduled or trigger-based)**

* Pull new events for a customer since last build
* Update aggregates (favorite effects, formats, tolerance)
* Update embedding + cluster membership (optional)

> If embeddings are stored in Firestore, you can use Firestore’s vector search for similarity; embeddings must be generated externally. ([Firebase][4])

---

## 5) “Knowledge graph lite” for product intuition

You don’t need Neo4j to get most benefits. Use **typed nodes + tag arrays**.

**Collection:** `tenants/{t}/products/{productId}` (or `productNodes`)

```ts
type ProductNode = {
  id: string;
  name: string;
  brandId: string;

  chemotype: { thc: number; cbd: number; cbn?: number };
  terpenes: { name: string; pct: number }[];

  effects: string[];         // ['sleep','relaxation']
  flavors: string[];         // ['citrus','earthy']
  form: 'flower' | 'edible' | 'vape' | 'tincture' | 'topical';

  inventoryStatus: 'in_stock' | 'low' | 'oos';
  price?: number;
  marginPct?: number;

  complianceFlags: string[]; // e.g. ['high_potency']
  updatedAt: Timestamp;
};
```

**Query strategy**

* Use structured fields for filtering (effects/form/inventoryStatus)
* Avoid indexing giant text (description); store in Storage or non-indexed field
* Keep indexed string fields under 1500 bytes to avoid truncation issues. ([Firebase][1])

---

## 6) Heuristics engine (System 1 “rules of thumb” as data)

**Collection:** `tenants/{t}/heuristics`

```ts
type Heuristic = {
  id: string;
  agent: 'smokey' | 'pops' | 'deebo';

  name: string;
  description: string;

  enabled: boolean;
  priority: number;          // higher runs first
  version: number;           // bump on edits
  scope?: { tenantId?: string; locationId?: string };

  conditions: any;           // JSON DSL (see below)
  action: any;               // JSON DSL (see below)

  stats?: {
    appliedCount: number;
    successCount: number;
    successRate: number;     // derived
    lastAppliedAt?: Timestamp;
  };

  updatedAt: Timestamp;
};
```

### 6.1 Minimal JSON DSL (v1)

**Conditions** (boolean checks against runtime context):

```json
{
  "all": [
    { "eq": ["customerProfile.potencyTolerance", "low"] },
    { "in": ["intent.primaryEffect", ["sleep", "relaxation"]] }
  ]
}
```

**Actions** (mutate candidate set / scoring):

```json
{
  "filter": { "chemotype.thc": { "lte": 15 } },
  "boost":  { "effects": { "sleep": 1.2 } },
  "penalize": { "inventoryStatus": { "oos": 999 } }
}
```

### 6.2 Runtime contract

Each agent runtime call:

1. Load enabled heuristics ordered by priority
2. Apply to candidate set + scoring
3. Produce:

   * `systemMode='fast'`
   * `confidenceScore` based on coverage + data quality
4. If confidence low → escalate to System 2

---

## 7) Patterns + clustering (System 1 “vibes, but with receipts”)

**Collection:** `tenants/{t}/patterns`

```ts
type PatternCluster = {
  id: string;
  agent: 'smokey' | 'pops' | 'deebo';

  type:
    | 'customer_cluster'
    | 'kpi_anomaly_baseline'
    | 'risk_pattern';

  label: string;

  // Clusters (Smokey)
  topProducts?: string[];
  topEffects?: string[];
  supportCount?: number;

  // Anomaly baselines (Pops/Deebo)
  metricKey?: string;
  baseline?: { mean: number; stdDev: number; windowDays: number };

  updatedAt: Timestamp;
};
```

**Offline jobs (Cloud Run + Scheduler)**

* Nightly clustering on customer embeddings → write/update `customer_cluster`
* Rolling baselines for KPI metrics → write `kpi_anomaly_baseline`
* Compliance/risk correlation scans → write `risk_pattern`

---

## 8) Multi-agent coordination (“group intuition”)

**Collection:** `tenants/{t}/agentMessages`

```ts
type AgentMessage = {
  id: string;
  tenantId: string;

  fromAgent: 'smokey' | 'pops' | 'deebo';
  toAgent: 'smokey' | 'pops' | 'deebo' | 'broadcast';

  topic: 'demand_spike' | 'compliance_risk' | 'inventory_warning' | string;
  payload: Record<string, any>;

  createdAt: Timestamp;
  expiresAt?: Timestamp;   // TTL field
  ack?: { by: string; at: Timestamp };
};
```

Use TTL policies for ephemeral messages; remember TTL deletion is not instantaneous. ([Google Cloud Documentation][2])

---

## 9) Agent-specific implementation specs

## 9.1 Smokey (Budtender) — runtime flow

**Inputs**

* customerId (optional)
* sessionId
* user message
* tenant product catalog

**System 1 (fast path)**

1. Fetch `CustomerProfileMemory` (if exists)
2. Parse intent (desired effect, form, potency, flavor)
3. Query product candidates (Firestore structured filters)
4. Apply heuristics (THC caps, inventory bias, safety flags)
5. If confidence ≥ threshold → respond + log events

**System 2 (slow path)**

* If missing profile, sparse catalog match, conflicting constraints:

  * Ask clarifying question(s) OR
  * Invoke deeper LLM reasoning OR
  * Request Pops/Deebo signal via `agentMessages`
* Log `systemMode='slow'`

**Minimum events to log**

* message_in / message_out
* recommendation_shown (+ productIds + systemMode + confidenceScore)
* product_clicked / order_completed
* feedback (thumbs up/down + optional text)

---

## 9.2 Pops (BI) — intuition over numbers

### DailyMetrics (time series base)

**Collection:** `tenants/{t}/dailyMetrics/{yyyy-mm-dd}`

```ts
type DailyMetrics = {
  id: string; // '2025-12-10'
  date: string;

  totalSales: number;
  orders: number;
  avgOrderValue: number;

  newCustomers: number;
  returningCustomers: number;

  channelBreakdown: { web: number; inStore: number; sms: number };
  promoSpend?: number;

  weather?: { temp: number; condition: string }; // optional
  notes?: string;

  createdAt: Timestamp;
};
```

### PopsInsight (anomalies, forecasts, recommendations)

**Collection:** `tenants/{t}/popsInsights`

```ts
type PopsInsight = {
  id: string;
  tenantId: string;

  category: 'anomaly' | 'forecast' | 'recommendation';
  severity: 'low' | 'medium' | 'high';

  description: string;
  dateRange: { start: string; end: string };

  linkedMetrics: string[];
  anomalyScore?: number;

  possibleCauses?: string[];
  suggestedActions?: string[];

  createdAt: Timestamp;
  resolvedAt?: Timestamp;
};
```

**Anomaly job**

* For each metric series, compute baseline + z-score (or robust variant)
* If score exceeds threshold:

  * Write PopsInsight
  * Optionally message Smokey (“demand_spike for SKU X”)

---

## 9.3 Deebo (Compliance) — Regulation OS + intuition layer

### Rules + RulePacks (knowledge base)

```
jurisdictions/{j}/rulePacks/{packId}
  rules/{ruleId}
```

```ts
type ComplianceRule = {
  id: string;
  code: string; // 'IL-1290.455-ADVERTISING'
  description: string;

  channel: 'sms' | 'email' | 'web' | 'in_store';
  severity: 'blocker' | 'warning';

  conditionDSL: any;

  // Governance
  sourceUrl?: string;
  effectiveFrom?: Timestamp;
  effectiveTo?: Timestamp;
  lastReviewedAt?: Timestamp;
  version: number;
};
```

### Deebo check-content API (runtime)

**Function:** `/check-content`

**Behavior**

1. Resolve jurisdiction + channel
2. Load active rulepacks
3. Evaluate rule conditions
4. Return pass/warn/fail + hit list
5. Write compliance event

### ComplianceEvent (audit log)

**Collection:** `tenants/{t}/complianceEvents`

```ts
type ComplianceEvent = {
  id: string;
  tenantId: string;

  agent: 'deebo';
  channel: string;

  status: 'pass' | 'fail' | 'warning';
  ruleHits: { ruleId: string; severity: string }[];

  contentHash: string;
  createdAt: Timestamp;

  traceId?: string;
};
```

### DeeboAlert (pattern-sense / risk intuition)

**Collection:** `tenants/{t}/deeboAlerts`

```ts
type DeeboAlert = {
  id: string;
  tenantId: string;

  severity: 'info' | 'medium' | 'critical';
  kind: 'structuring_suspected' | 'id_abuse' | 'rule_spike' | string;

  description: string;
  evidence: any;

  createdAt: Timestamp;
  acknowledgedBy?: string;
  acknowledgedAt?: Timestamp;
};
```

**Risk pattern jobs**

* Spikes in failed checks
* Repeated near-limit purchasing patterns
* IP/phone/entity correlation anomalies

---

## 10) Dual-system wiring (fast/slow) — required fields + scoring

Every agent action that matters must record:

* `systemMode: 'fast' | 'slow'`
* `confidenceScore: number (0..1)`

**Confidence score (v1 heuristic)**

* Start at 1.0
* Penalize for:

  * missing customer profile
  * low candidate count
  * contradictory constraints
  * Deebo warnings present
  * anomaly flags present
* Threshold example:

  * ≥ 0.75 → fast response
  * < 0.75 → slow escalation

Store this in `AgentEvent.payload` for `recommendation_shown`, `popsInsight_generated`, `rule_check`, etc.

---

## 11) Feedback + evaluation (how the system learns)

### Outcome (unified reward signal)

**Collection:** `tenants/{t}/outcomes`

```ts
type Outcome = {
  id: string;
  tenantId: string;

  relatedEventId: string;
  agent: 'smokey' | 'pops' | 'deebo';

  label: 'good' | 'bad' | 'neutral';
  reward: number; // -1..+1

  reason?: string;
  createdAt: Timestamp;
};
```

**Examples**

* Smokey: purchase after recommendation → +1; thumbs down → -1
* Pops: user marks insight “useful” → +1; ignored for 30 days → 0
* Deebo: prevented blocked content → +1; false positive override → -1

**Heuristic stats updater job**

* Join heuristics applied → outcomes
* Update `Heuristic.stats` (appliedCount, successRate)

---

## 12) Security, privacy, and rules design (must not be an afterthought)

* Tenant isolation is structural (`/tenants/{t}`) and enforced via Security Rules.
* Minimize Security Rules document lookups to avoid access-call limits. ([Firebase][3])
* For sensitive or high-volume server-side operations, prefer Admin SDK on Cloud Functions/Run (bypasses rules) with IAM.
* Use TTL policies for ephemeral coordination messages; remember TTL is delayed and doesn’t delete subcollections. ([Google Cloud Documentation][2])
* Keep PII/PHI out of broad indexes; store minimal, consented memory.

---

## 13) Build roadmap (implementation order)

### Phase 1 — Unified logging + Smokey customer memory

* Implement `agentEvents` writes for Smokey chat + recommendations + outcomes
* Implement `CustomerProfileMemory` builder (scheduled or trigger-based)
* Wire Smokey runtime to read profile first

### Phase 2 — Heuristics as data (admin-editable)

* Implement `heuristics` collection + minimal DSL evaluator
* Add UI to toggle/priority/edit heuristics
* Log heuristic application in events

### Phase 3 — Pops + Deebo base logs

* Start writing `dailyMetrics` and `complianceEvents`
* Implement basic anomaly detection → `popsInsights`
* Implement rule evaluation pipeline → `deeboAlerts` for spikes

### Phase 4 — Patterns (“dreaming” jobs)

* Nightly clustering → `patterns/customer_cluster`
* Baseline refresh + scenario simulations for Pops
* Correlation scans for Deebo risk patterns

### Phase 5 — Multi-agent coordination

* Implement `agentMessages` with TTL + ack
* Pops → Smokey demand signals
* Deebo → Smokey/Pops compliance risk signals

---

## 14) Definition of Done (v1)

You can claim “intuition loop shipped” when:

* Every agent action produces events + outcomes
* Smokey uses customer memory + heuristics in fast path
* Pops generates at least one anomaly insight type end-to-end
* Deebo evaluates rulepacks and writes compliance events
* At least one cross-agent message loop exists (Pops→Smokey or Deebo→Smokey)
* Confidence + systemMode are logged for key actions
