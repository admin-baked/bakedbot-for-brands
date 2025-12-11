# Intuition OS

## Firebase Architecture for Intelligent Cannabis Retail Agents

**Technical Specification v1.0**  
**December 2025**

> **BakedBot AI**  
> *Autonomous Cannabis Commerce*

---

## Executive Summary

This document defines the Firebase architecture that transforms BakedBot's AI agents—Smokey, Pops, and Deebo—from reactive tools into intuitive decision partners. By implementing structured memory, pattern recognition, heuristic learning, and multi-agent coordination, we create agents that **remember, generalize, anticipate, and warn**.

The architecture maps human-like intuition onto four operational loops:
1. **Logging** all interactions as structured events
2. **Summarizing** and clustering those events into actionable memories
3. **Using memories at runtime** for fast System-1 responses
4. **Closing the feedback loop** to evolve heuristics over time

---

## 1. Core Philosophy: The Four Intuition Loops

Every capability in this architecture maps to one of four fundamental loops:

| Loop | Name | Description |
|------|------|-------------|
| **Loop 1** | Log Everything | Every interaction, decision, and outcome becomes a structured event in Firestore |
| **Loop 2** | Summarize & Cluster | Scheduled jobs crunch events into memories, patterns, and heuristics |
| **Loop 3** | Runtime Retrieval | Agents query memories first (System 1), escalating to deeper reasoning (System 2) when confidence is low |
| **Loop 4** | Feedback Evolution | Outcomes update heuristics, closing the learning loop |

---

## 2. Global Firestore Architecture

### 2.1 Multi-Tenant Structure

All tenant data lives under `/tenants/{tenantId}` for complete isolation:

```
tenants/{tenantId}/
  ├── customers/{customerId}
  ├── products/{productId}
  ├── agentEvents/{eventId}
  ├── agentMemories/{memoryId}
  ├── heuristics/{heuristicId}
  ├── patterns/{patternId}
  ├── recommendationOutcomes/{outcomeId}
  ├── popsInsights/{insightId}
  ├── deeboAlerts/{alertId}
  ├── complianceEvents/{eventId}
  ├── agentMessages/{messageId}
  └── starterPacks/{packId}
```

### 2.2 Global Collections

```
jurisdictions/{jurisdictionId}/
  └── rulePacks/{rulePackId}

agents/{agentId}  // Global agent configurations
```

---

## 3. Smokey — AI Budtender Intuition

### 3.1 Event Logging (Raw Experience)

**Collection:** `tenants/{t}/agentEvents`

Every interaction creates a structured event—the raw material for learning:

| Field | Description |
|-------|-------------|
| `id` | Unique event identifier |
| `agent` | `'smokey'` \| `'pops'` \| `'deebo'` |
| `tenantId` | Tenant identifier |
| `sessionId` | Conversation session ID |
| `customerId` | Optional customer reference |
| `type` | `message_in` \| `message_out` \| `recommendation_shown` \| `product_clicked` \| `order_completed` \| `feedback` |
| `payload` | Event-specific data (products, questions, etc.) |
| `createdAt` | Firestore Timestamp |

### 3.2 Customer Memory Profile

**Collection:** `tenants/{t}/agentMemories` (type: `customer_profile`)

Aggregated customer understanding that enables "this feels like last time" intuition:

| Field | Description |
|-------|-------------|
| `favoriteEffects` | `string[]` — `['relaxing', 'sleep', 'focus']` |
| `avoidEffects` | `string[]` — `['anxious', 'racy']` |
| `preferredFormats` | `string[]` — `['edible', 'vape', 'flower']` |
| `potencyTolerance` | `'low'` \| `'medium'` \| `'high'` |
| `lastProducts` | `string[]` — Recent product IDs purchased |
| `interactionCount` | `number` — Total interactions for confidence scoring |
| `embeddingId` | `string` — Reference to vector store for similarity search |
| `clusters` | `string[]` — `['sleepy_sativa_lovers', 'value_seekers']` |
| `similarCustomerIds` | `string[]` — Top 10 similar customers (cached) |

### 3.3 Product Knowledge Graph

**Collection:** `tenants/{t}/productNodes/{productId}`

Structured product data enables intuitive matching without full Neo4j complexity:

| Field | Description |
|-------|-------------|
| `chemotype` | `{ thc: number, cbd: number, cbn?: number }` |
| `terpenes` | `{ name: string, pct: number }[]` — Terpene profile |
| `effects` | `string[]` — `['sleep', 'relaxation', 'creativity']` |
| `flavors` | `string[]` — `['citrus', 'earthy', 'pine']` |
| `form` | `'flower'` \| `'edible'` \| `'vape'` \| `'tincture'` \| `'topical'` |
| `inventoryStatus` | `'in_stock'` \| `'low'` \| `'oos'` |
| `complianceFlags` | `string[]` — `['high_potency', 'new_user_caution']` |

### 3.4 Heuristics Engine (System 1 Rules)

**Collection:** `tenants/{t}/heuristics`

Fast, editable rules that provide instant intuitive responses without LLM calls:

| Field | Description |
|-------|-------------|
| `agent` | Which agent uses this heuristic |
| `enabled` | `boolean` — Toggle without code deploy |
| `priority` | `number` — Higher priority rules apply first |
| `conditions` | JSON DSL — When this rule applies |
| `action` | JSON DSL — What to do (filter, boost, warn) |
| `stats` | `{ appliedCount, successRate, lastEvaluatedAt }` |
| `source` | `'starter'` \| `'learned'` \| `'manual'` — Origin tracking |

**Example Heuristic:**

```json
{
  "id": "smokey_new_user_low_thc",
  "name": "Cap THC for new users",
  "conditions": { "customerProfile.potencyTolerance": "low" },
  "action": { "filter": { "chemotype.thc": { "lte": 15 } } }
}
```

### 3.5 Pattern Clusters ("People Like You")

**Collection:** `tenants/{t}/patterns` (type: `customer_cluster`)

Offline clustering enables collaborative filtering: "Customers like you usually enjoy X."

| Field | Description |
|-------|-------------|
| `label` | Human-readable cluster name |
| `centroidEmbeddingRef` | Reference to cluster centroid in vector store |
| `supportCount` | Number of customers in this cluster |
| `topProducts` | `string[]` — Most purchased products by cluster |
| `topEffects` | `string[]` — Most requested effects by cluster |

---

## 4. Pops — Business Intelligence Intuition

### 4.1 Time-Series Memory

**Collection:** `tenants/{t}/dailyMetrics/{yyyymmdd}`

Historical business data enables seasonality detection and baseline comparisons:

| Field | Description |
|-------|-------------|
| `totalSales` | `number` — Daily revenue |
| `orders` | `number` — Transaction count |
| `avgOrderValue` | `number` — AOV |
| `newCustomers` | `number` — First-time buyers |
| `returningCustomers` | `number` — Repeat buyers |
| `channelBreakdown` | `{ web, inStore, sms }` — Revenue by channel |
| `weather` | `{ temp, condition }` — External factor correlation |

### 4.2 Anomaly Detection & Insights

**Collection:** `tenants/{t}/popsInsights/{insightId}`

When something "feels off," Pops generates structured insights:

| Field | Description |
|-------|-------------|
| `category` | `'anomaly'` \| `'forecast'` \| `'recommendation'` \| `'simulation'` |
| `severity` | `'low'` \| `'medium'` \| `'high'` |
| `description` | Human-readable insight text |
| `possibleCauses` | `string[]` — LLM-generated hypotheses |
| `suggestedActions` | `string[]` — Recommended next steps |
| `linkedMetrics` | `string[]` — Related dailyMetrics IDs |

---

## 5. Deebo — Compliance Intuition

### 5.1 Jurisdictional Rules (Knowledge Base)

**Collection:** `jurisdictions/{j}/rulePacks/{packId}/rules/{ruleId}`

Codified compliance rules that form Deebo's regulatory knowledge:

| Field | Description |
|-------|-------------|
| `code` | Regulatory reference (e.g., `'IL-1290.455-ADVERTISING'`) |
| `channel` | `'sms'` \| `'email'` \| `'web'` \| `'in_store'` |
| `severity` | `'blocker'` \| `'warning'` |
| `conditionDSL` | JSON logic defining when rule applies |
| `lastReviewedAt` | Timestamp — For regulatory freshness tracking |

### 5.2 Compliance Events (Audit Trail)

**Collection:** `tenants/{t}/complianceEvents/{eventId}`

Every compliance check creates an immutable record for auditing:

| Field | Description |
|-------|-------------|
| `channel` | Which channel was checked |
| `status` | `'pass'` \| `'fail'` \| `'warning'` |
| `ruleHits` | `{ ruleId, severity }[]` — Which rules triggered |
| `contentHash` | Hash of checked content for deduplication |

### 5.3 Risk Pattern Detection

**Collection:** `tenants/{t}/deeboAlerts/{alertId}`

Deebo's intuitive risk sensing—patterns that suggest problems before they materialize:

| Field | Description |
|-------|-------------|
| `severity` | `'info'` \| `'medium'` \| `'critical'` |
| `kind` | `'structuring_suspected'` \| `'id_abuse'` \| `'rule_spike'` \| `'anomaly'` |
| `evidence` | Supporting data (transaction IDs, patterns detected) |
| `acknowledgedBy` | User ID who reviewed the alert |

---

## 6. Multi-Agent Coordination

### 6.1 Agent Messaging Bus

**Collection:** `tenants/{t}/agentMessages/{messageId}`

Agents share insights through a structured messaging system, enabling collective intuition:

| Field | Description |
|-------|-------------|
| `fromAgent` | `'smokey'` \| `'pops'` \| `'deebo'` |
| `toAgent` | `'smokey'` \| `'pops'` \| `'deebo'` \| `'broadcast'` |
| `topic` | `'demand_spike'` \| `'compliance_risk'` \| `'customer_trend'` \| `'anomaly'` |
| `payload` | Message-specific data |
| `requiredReactions` | `string[]` — Agents that must respond |
| `reactions` | `{ [agentId]: { acknowledged, actionTaken, timestamp } }` |
| `expiresAt` | Timestamp — For automatic cleanup |

**Example Message Flow:**

1. Pops detects demand spike for SKU-123
2. Pops broadcasts: `{ topic: 'demand_spike', payload: { productId: 'SKU-123' } }`
3. Smokey listens, boosts SKU-123 in recommendations
4. Smokey records reaction: `{ acknowledged: true, actionTaken: 'product_boost' }`

---

## 7. Dual-System Architecture (Fast/Slow)

Each agent implements a **System 1 (fast, intuitive)** and **System 2 (slow, deliberate)** path:

### 7.1 System 1 — Fast Path

1. Query Firestore: memories + heuristics + patterns
2. Produce answer with minimal/no LLM calls
3. Calculate `confidenceScore` based on data quality

### 7.2 System 2 — Slow Path

1. Triggered when `confidenceScore < 0.6`
2. Full LLM reasoning with knowledge graph context
3. May involve cross-agent consultation via `agentMessages`

### 7.3 Confidence Scoring

Multi-factor confidence calculation determines System 1 vs System 2 routing:

| Factor | Weight | Description |
|--------|--------|-------------|
| `dataRecency` | 15% | How recent is the underlying data |
| `dataDensity` | 25% | How much data exists for this context |
| `heuristicCoverage` | 20% | What % of heuristics matched |
| `patternMatch` | 25% | How well this fits known patterns |
| `anomalyScore` | 15% | Inverse of anomaly detection |

---

## 8. Feedback Loop & Heuristic Evolution

### 8.1 Outcome Tracking

**Collection:** `tenants/{t}/recommendationOutcomes/{outcomeId}`

Track what happened after each recommendation to close the learning loop:

| Field | Description |
|-------|-------------|
| `eventId` | Links to original `agentEvent` |
| `recommendedProducts` | `string[]` — What we suggested |
| `selectedProduct` | `string` — What they actually chose |
| `outcome` | `'converted'` \| `'rejected'` \| `'abandoned'` \| `'returned'` |
| `heuristicsApplied` | `string[]` — Which heuristic IDs were used |
| `systemMode` | `'fast'` \| `'slow'` — Which path was taken |
| `confidenceScore` | `number` — Original confidence |
| `revenueGenerated` | `number` — Actual revenue from this interaction |

### 8.2 Heuristic Evolution Job

Scheduled Cloud Function (every 6 hours) that evolves heuristics based on outcomes:

1. Query recent `recommendationOutcomes` (last 24 hours)
2. Group by `heuristicId` to calculate success rates
3. Update `heuristic.stats` with new `appliedCount` and `successRate`
4. Flag underperforming heuristics (`successRate < 20%`, `sampleSize > 50`) for review
5. Optionally auto-disable severely underperforming heuristics

---

## 9. Cold Start Solution

### 9.1 Starter Packs

**Collection:** `tenants/{t}/starterPacks/{packId}`

Pre-configured defaults for new tenants until real data accumulates:

| Field | Description |
|-------|-------------|
| `type` | `'dispensary_urban'` \| `'dispensary_rural'` \| `'brand'` \| `'delivery'` |
| `defaultHeuristics` | `Heuristic[]` — Pre-built rules (`source: 'starter'`) |
| `defaultPatterns` | `PatternCluster[]` — Industry-average clusters |
| `baselineMetrics` | `Partial<DailyMetrics>` — Expected averages |

### 9.2 Progressive Disclosure

When customer profile is missing or weak (`interactionCount < 3`), Smokey enters discovery mode:

1. Ask targeted questions: effect preference, experience level, format preference
2. Fall back to most common cluster for the tenant
3. Gradually build profile through natural conversation

---

## 10. Nightly "Dream" Cycle

Offline consolidation job (3 AM daily) that strengthens agent intuition through simulated experience:

### 10.1 Consolidation Tasks

| Task | Description |
|------|-------------|
| **Consolidate Memories** | Merge fragmented customer events into unified profiles |
| **Discover Patterns** | Run k-means clustering on customer embeddings, save new PatternClusters |
| **Simulate Scenarios** | Run "what-if" simulations (holiday rush, competitor price drop, new product launch) |
| **Prune Stale Data** | Archive events older than 90 days, resolve old alerts |
| **Update Readiness** | Calculate agent readiness scores per tenant |

### 10.2 Simulation Scenarios

- `new_high_potency_product` — How would recommendations change?
- `holiday_rush` — Traffic 3x, what breaks?
- `competitor_price_drop` — 20% discount nearby, impact on conversion?
- `regulatory_change` — New purchase limits, compliance gaps?

---

## 11. Security Rules

Firestore security rules enforce tenant isolation and role-based access:

```javascript
// Tenant data - only accessible by tenant members
match /tenants/{tenantId}/{document=**} {
  allow read: if isAuthenticated() && belongsToTenant(tenantId);
}

// Agent events - agents can write, admins can read (immutable)
match /tenants/{tenantId}/agentEvents/{eventId} {
  allow create: if isAgent() && belongsToTenant(tenantId);
  allow read: if isTenantAdmin(tenantId);
  allow update, delete: if false; // immutable audit log
}
```

---

## 12. Implementation Roadmap

| Phase | Weeks | Focus | Deliverables |
|-------|-------|-------|--------------|
| **1** | 1-2 | Foundation | agentEvents logging, security rules, starter packs |
| **2** | 3-4 | Customer Memory | CustomerProfileMemory, embedding pipeline, vector store |
| **3** | 5-6 | Heuristics Engine | JSON DSL interpreter, heuristics CRUD, confidence scoring |
| **4** | 7-8 | Feedback Loop | recommendationOutcomes, heuristic evolution jobs |
| **5** | 9-10 | Pops + Deebo | dailyMetrics, anomaly detection, complianceEvents, alerts |
| **6** | 11-12 | Multi-Agent | agentMessages, subscription reactions, nightly dream cycles |

---

## 13. Cost Optimization

Firebase at scale requires cost-conscious architecture:

| Strategy | Description |
|----------|-------------|
| **Batch Writes** | Queue events and flush in batches of 500 every 5 seconds |
| **TTL Policies** | Auto-delete agentEvents after 90 days |
| **Composite Indexes** | Pre-build indexes for common query patterns |
| **Caching** | Cache heuristics and patterns in memory (refresh every 5 min) |
| **Aggregation** | Store pre-computed summaries instead of querying raw events |

---

## 14. Conclusion

This architecture transforms BakedBot's agents from reactive question-answerers into proactive, intuitive partners. By implementing the four loops—logging, summarizing, retrieving, and evolving—we create agents that:

- **Remember**: Every interaction builds structured memory
- **Generalize**: Patterns emerge from accumulated experience
- **Anticipate**: Simulations and forecasts surface insights before problems materialize
- **Warn**: Anomaly detection and cross-agent coordination flag risks early
- **Evolve**: Feedback loops continuously improve heuristics

The result is not just automation—it's **Autonomous Cannabis Commerce with genuine intelligence**. Agents that don't just respond to questions, but anticipate needs, sense when something's off, and make leaps that feel genuinely intuitive.

---

*— End of Specification —*
