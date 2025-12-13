# BakedBot AI – Domain Memory & Agent Harness Spec

**Goal:** Implement domain memory + harness patterns for BakedBot’s production agents and for our AI dev workflow on the codebase.

## 1. Purpose & Scope

You (Lead AI Agent, codename Architect) are responsible for designing and implementing domain memory for:

*   **Brands** (tenant-level memory)
*   **Each BakedBot agent** (Smokey, Craig, Pops, Ezal, Money Mike, Mrs. Parker, Deebo)

And implementing a reusable agent harness pattern:
*   Initializer → builds/updates memory
*   Worker → reads memory, makes atomic progress, updates memory

## 2. Core Concepts

### 2.1 Domain Memory

**Definition:** Persistent, structured state representing:
*   Goals and objectives
*   Constraints and rules
*   Backlogs / queues of work
*   Current status (passing/failing/running)
*   Experiment configs + metrics
*   Progress logs

Domain memory is not just "raw logs" or "vector embeddings". It’s a small set of **canonical JSON documents** per brand and per agent.

### 2.2 Agent Harness

Every serious agent run must follow the same lifecycle:

1.  **Initialize**
    *   Load Brand Domain Memory
    *   Load its own domain memory
    *   Run sanity checks (e.g., compliance status)
2.  **Orient**
    *   Select one task / experiment / backlog item that needs progress
    *   Load relevant prior logs, metrics, context
3.  **Act**
    *   Use tools (POS, menus, email, SMS, scrapers, pricing, etc.)
    *   Generate output (content, recommendations, price changes, alerts)
    *   Run tests (Deebo checks, unit/business rules)
4.  **Update Memory**
    *   Update the specific item’s status & metrics
    *   Append a human/machine-readable progress note
    *   Persist to storage (Firestore/Postgres/GCS JSON)

**LLM = policy function transforming memory(state) → memory(state') via this harness.**

## 3. Storage & Conventions

We use a tenant/brand-based structure in Firestore:

*   `tenants/{brandId}/domain_memory/profile` (Shared Brand Memory)
*   `tenants/{brandId}/agents/{agentName}/memory` (Per-Agent Memory)
*   `tenants/{brandId}/agents/{agentName}/logs` (Append-only logs)

## 4. Brand Domain Memory (Shared Across Agents)

### 4.1 Schema

Core object at `tenants/{brandId}/domain_memory/profile`:

```json
{
  "brand_profile": {
    "name": "Example Brand",
    "tone_of_voice": "social equity, warm, educational",
    "target_markets": ["IL", "MI"],
    "product_focus": ["gummies", "pre-rolls"],
    "positioning": "Black-founded, community-focused, terpene-first"
  },

  "priority_objectives": [
    {
      "id": "obj_q1_il_revenue_up_20",
      "description": "Grow IL e-commerce revenue by 20% by 2026-03-31",
      "deadline": "2026-03-31",
      "owner": "bakedbot_auto", 
      "status": "active"       // active | achieved | paused | abandoned
    }
  ],

  "constraints": {
    "jurisdictions": ["IL", "MI"],
    "discount_floor_margin_pct": 35,
    "max_daily_outbound_messages_per_user": 1,
    "max_weekly_outbound_messages_per_user": 3,
    "prohibited_phrases": ["cure", "guaranteed relief"],
    "sensitive_audiences": ["medical_only"]
  },

  "segments": [
    {
      "id": "seg_il_new_subscribers",
      "description": "Emails collected in last 30 days from IL",
      "definition": {
        "jurisdiction": "IL",
        "days_since_optin_lte": 30
      },
      "status": "active"
    }
  ],

  "experiments_index": [
    {
      "id": "exp_global_il_first_purchase_push",
      "domain": "craig",
      "objective_id": "obj_q1_il_revenue_up_20",
      "status": "running"
    }
  ],

  "playbooks": {
    "new_subscriber": "playbook_new_sub.json",
    "abandoned_cart": "playbook_abandoned_cart.json",
    "vip_reactivation": "playbook_vip_reactivation.json"
  }
}
```

## 5. Agent-Specific Domain Memories

Stored at `tenants/{brandId}/agents/{agentName}/memory`.

### 5.1 Smokey – AI Budtender & Headless Menu
*   **rec_policies**: Recommendation rules and constraints.
*   **ux_experiments**: A/B tests for menu layout.
*   **faq_coverage**: Unanswered questions backlog.

### 5.2 Craig – Marketing Automation
*   **campaigns**: Backlog of marketing campaigns with KPI tracking.
*   **constraints**: Compliance and channel limits.
*   **variants**: A/B testing variants for campaign content.

### 5.3 Pops – Business Intelligence
*   **hypotheses_backlog**: Strategic hypotheses to test.
*   **decision_journal**: Record of decisions made (validated/invalidated).

### 5.4 Ezal – Competitive Intelligence
*   **competitor_watchlist**: Competitors being monitored.
*   **menu_snapshots**: Summaries of competitor menus.
*   **open_gaps**: Identified market gaps (price/product).

### 5.5 Money Mike – Pricing & Margin Optimization
*   **pricing_rules**: Margin floors and pricing logic.
*   **pricing_experiments**: Live pricing tests on specific SKUs.

### 5.6 Mrs. Parker – Loyalty & VIP
*   **loyalty_segments**: Definitions of VIP/High-LTV segments.
*   **journeys**: Lifecycle automation steps.

### 5.7 Deebo – Compliance OS
*   **rule_packs**: Jurisdiction/Channel specific compliance rules.
*   **tests**: Regression tests for compliance logic.

## 6. Implementation Status

*   **Schemas**: Defined in `src/server/agents/schemas.ts` using Zod.
*   **Harness**: Implemented in `src/server/agents/harness.ts`.
*   **Persistence**: Implemented in `src/server/agents/persistence.ts` using Firestore.
*   **Agents**: Basic implementations in `src/server/agents/*.ts`.
