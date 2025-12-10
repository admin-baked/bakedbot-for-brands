
# BakedBot Treasury Agents – Architecture & Launch Plan

**Status:** v0.1 – Draft for implementation
**Owner:** Martez / BakedBot AI
**Scope:** Internal-only “Autonomous Treasury Management” layer for BakedBot

> **Important:** This document is about *how* to build agents and guardrails for trading.
> It is **not** financial advice and does **not** guarantee profits or safety.
> All strategies must be treated as experiments with capped risk.

---

## 1. Goals & Constraints

### 1.1 Primary Goals

1. Use the same agent + domain memory + policy framework as BakedBot (Smokey/Craig/etc.) to manage our **treasury**.
2. Start with a **small, tightly controlled set of strategies** and clear risk caps.
3. Build a **Treasury Console** for visibility and control:

   * See positions, PnL, runway, risk usage.
   * Pause/adjust strategies from a UI.
4. Use this as real-world proof that our agent architecture works beyond cannabis (internal credibility + investor story).

### 1.2 Non-Goals (for v1)

* No external “offer this to clients” yet.
* No exotic leverage, option strategies, or long-tail degen farms.
* No mixing customer data/stack with treasury keys or trading logic.

### 1.3 Constraints

* Strategies must:

  * Respect global treasury limits (total crypto %, per-asset caps, runway protection).
  * Respect per-venue caps (Kraken exposure, DeFi exposure).
  * Be auditable (who did what, when, and why, via logs + memory).
* All actions must go through a **policy engine** (“Deebo for Money”) before executing.

---

## 2. High-Level Architecture

### 2.1 Services

* **Existing:** `bakedbot-core`

  * Customer-facing agents (Smokey, Craig, Pops, etc.).
  * Event spine, Deebo (compliance), domain memory patterns.

* **New:** `bakedbot-treasury` (internal-only service)

  * Treasury agents and strategy workers.
  * Treasury domain memory + strategy memory.
  * Policy engine (Deebo for Money).
  * Treasury Pops (performance + allocation).
  * REST/gRPC/Webhook interface for a **Treasury Console UI**.

### 2.2 Code Reuse

Create or reuse shared libs:

* `@bakedbot/agent-harness`

  * Generic `runAgent()` flow: Initialize → Orient → Act → Update → Log.

* `@bakedbot/domain-memory`

  * Typed helpers for reading/writing domain memory JSON objects.

* `@bakedbot/rulepacks`

  * Rule-pack patterns (Deebo style), adapted to “treasury policy rule packs”.

`bakedbot-treasury` imports these libraries and defines **treasury-specific schemas and tools** (Kraken client, DeFi clients, runway calculator).

### 2.3 Separation & Security

* **Secrets**:

  * Kraken keys, wallet private keys, RPC endpoints live in a **separate secret store** and project.
* **Network & IAM**:

  * Treasury service runs in a restricted environment; no direct linkage from public-facing app.
* **Blast radius**:

  * A bug in treasury cannot modify customer data.
  * A bug in customer stack cannot trigger unauthorized trades.

---

## 3. Domain Memory for Treasury

We apply the same 1.1 / 1.2 / 1.3 / 2.1 concepts:

* 1.1 – **Scratchpad memory**: per-run ephemeral state (Redis / in-process).
* 1.2 – **Entity / profile memory**: global treasury profile & per-strategy config.
* 1.3 – **Domain knowledge**: trading/DeFi knowledge base (formulas, conceptual docs).
* 2.1 – **Implementation**: concrete JSON schemas, collections, and harness logic.

### 3.1 Global Treasury Domain Memory (1.2)

**Path:** `internal_treasury/domain_memory.json`

```json
{
  "treasury_profile": {
    "entity_name": "BakedBot AI",
    "base_currency": "USD",
    "reporting_interval_days": 7
  },

  "runway_model": {
    "monthly_burn_usd": 25000,
    "min_runway_months": 12,
    "warning_runway_months": 9
  },

  "allocation_policy": {
    "max_total_crypto_pct": 40,
    "risk_buckets": {
      "green": 20,
      "yellow": 15,
      "red": 5
    },
    "max_per_asset_pct": {
      "BTC": 20,
      "ETH": 15,
      "LONG_TAIL": 5
    }
  },

  "venue_limits": {
    "centralized": {
      "kraken": {
        "status": "approved",
        "max_exposure_pct": 25
      }
    },
    "defi": {
      "aave_v3": {
        "status": "approved",
        "max_exposure_pct": 10,
        "chains": ["mainnet", "optimism"]
      }
    }
  },

  "strategy_registry": [
    {
      "id": "str_basis_kraken_btc",
      "name": "Kraken BTC basis trade",
      "risk_bucket": "green",
      "venue": "kraken",
      "status": "planned",  // planned | running | paused | deprecated
      "target_allocation_pct": 5,
      "hard_loss_limit_pct": 5
    },
    {
      "id": "str_dca_btc_eth",
      "name": "BTC/ETH DCA & rebalance",
      "risk_bucket": "yellow",
      "venue": "kraken",
      "status": "planned",
      "target_allocation_pct": 10
    },
    {
      "id": "str_runway_guard",
      "name": "Runway protection bot",
      "risk_bucket": "green",
      "venue": "multi",
      "status": "planned",
      "target_allocation_pct": 0
    },
    {
      "id": "str_yield_router_stables",
      "name": "Stablecoin yield router",
      "risk_bucket": "green",
      "venue": "defi",
      "status": "planned",
      "target_allocation_pct": 5
    }
  ]
}
```

**Responsibilities:**

* `TreasuryInitializer` agent:

  * Creates and maintains this file.
  * Updates `monthly_burn_usd`, limits, registry, etc., as strategy set evolves.
* Every strategy worker:

  * Reads this on boot.
  * Asks Deebo-for-Money to enforce these policies.

---

### 3.2 Per-Strategy Domain Memory (1.2)

Each strategy gets its own folder:

* `internal_treasury/strategies/{strategyId}/memory.json`
* `internal_treasury/strategies/{strategyId}/progress_log.md`

#### 3.2.1 Basis Bot – `str_basis_kraken_btc`

**Path:** `internal_treasury/strategies/str_basis_kraken_btc/memory.json`

```json
{
  "strategy_meta": {
    "id": "str_basis_kraken_btc",
    "pair": "BTC/USD",
    "venue": "kraken",
    "risk_bucket": "green",
    "status": "running"
  },

  "config": {
    "min_funding_apr": 0.08,
    "max_leverage": 2,
    "max_position_notional_usd": 20000,
    "rebalance_threshold_hedge_drift_pct": 5,
    "cooldown_minutes_after_stopout": 60
  },

  "performance": {
    "lifetime_pnl_usd": 0,
    "last_30d_pnl_usd": 0,
    "max_drawdown_pct": 0,
    "num_trades": 0,
    "win_rate": 0,
    "sharpe_like_ratio": 0
  },

  "risk_state": {
    "current_exposure_usd": 0,
    "open_positions": 0,
    "last_stopout_at": null,
    "consecutive_loss_trades": 0
  },

  "adaptive_params": {
    "min_funding_apr_adjusted": 0.08,
    "last_param_tune_at": null,
    "tuning_notes": []
  }
}
```

#### 3.2.2 DCA + Rebalance – `str_dca_btc_eth`

```json
{
  "strategy_meta": {
    "id": "str_dca_btc_eth",
    "name": "BTC/ETH DCA & rebalance",
    "venue": "kraken",
    "risk_bucket": "yellow",
    "status": "running"
  },

  "targets": {
    "BTC_pct": 15,
    "ETH_pct": 10,
    "rebalance_band_pct": 3
  },

  "dca_policy": {
    "frequency": "daily",
    "max_daily_spend_usd": 300,
    "pause_on_drawdown_pct": 30
  },

  "history": {
    "total_invested_usd": 0,
    "current_value_usd": 0,
    "max_drawdown_pct": 0,
    "num_rebalances": 0
  },

  "behavior_adjustments": {
    "dca_aggressiveness": "medium",
    "last_rebalance_band_update": null,
    "notes": []
  }
}
```

#### 3.2.3 Runway Guard – `str_runway_guard`

```json
{
  "strategy_meta": {
    "id": "str_runway_guard",
    "name": "Runway protection bot",
    "venue": "multi",
    "risk_bucket": "green",
    "status": "running"
  },

  "rules": {
    "drawdown_trigger_pct": 20,
    "min_stable_pct_for_safe_mode": 50,
    "cooldown_days_after_safe_mode": 7
  },

  "runway_snapshots": [],

  "state": {
    "current_mode": "normal",  // normal | safe_mode
    "last_mode_switch_at": null,
    "last_drawdown_pct": 0
  }
}
```

#### 3.2.4 Stable Yield Router – `str_yield_router_stables`

```json
{
  "strategy_meta": {
    "id": "str_yield_router_stables",
    "name": "Stablecoin yield router",
    "venue": "defi",
    "risk_bucket": "green",
    "status": "planned"
  },

  "approved_assets": ["USDC", "DAI"],
  "approved_protocols": ["aave_v3", "compound_v3"],

  "allocations": [],

  "performance": {
    "lifetime_yield_usd": 0,
    "avg_apr_30d": 0
  },

  "risk_events": []
}
```

---

### 3.3 Scratchpad Memory (1.1)

* Lives in Redis or in-memory:

  * `{strategyId}:scratch:{runId}` keys, storing:

    * open order IDs
    * pending tx hashes
    * in-flight rebalance steps
* If lost, we can reconstruct from:

  * Exchange/chain state.
  * Long-term strategy memory.

No schema needed in this doc; treat as ephemeral working state.

---

### 3.4 Domain Knowledge (1.3)

Create a `domain_crypto_treasury` knowledge base (could be your vector store + markdown docs):

Content types:

* **Concepts:**

  * Spot vs perp.
  * Funding rate, basis, effective annualized yield.
  * Impermanent loss, slippage, liquidation risk.

* **Venue docs (summaries):**

  * Kraken supported pairs, margin, rate limits.
  * Aave/Compound basic mechanics.

* **Risk playbooks:**

  * “What to do if protocol TVL drops > 30% in 24h.”
  * “Process when an exchange API becomes unreliable.”

Agents **read** from here when planning; they never write.

---

## 4. Deebo for Money – Treasury Policy Engine

### 4.1 Responsibilities

* Enforce:

  * global allocation rules
  * per-asset caps
  * per-venue caps
  * risk-bucket limits
* Verify runway impact stays within model constraints.
* Block actions that violate policy and log why.

### 4.2 Interface

#### 4.2.1 `check-treasury-policy`

Input:

```ts
type PolicyCheckRequest = {
  strategyId: string;
  actionType: "OPEN_POSITION" | "ADJUST_POSITION" | "CLOSE_POSITION" | "MOVE_LIQUIDITY";
  deltaExposureUsd: number;      // positive for more risk, negative for less
  assetSymbols: string[];        // e.g. ["BTC"] or ["USDC", "DAI"]
  venue: string;                 // "kraken" | "aave_v3" | ...
  currentPortfolioSnapshot: {
    totalPortfolioUsd: number;
    assetAllocationsPct: Record<string, number>;
    venueAllocationsPct: Record<string, number>;
    riskBucketUsagePct: Record<"green" | "yellow" | "red", number>;
    stablePct: number;
    runwayMonths: number;
  };
}
```

Output:

```ts
type PolicyCheckResult = {
  decision: "allow" | "deny" | "warn";
  reasons: string[];
  resultingSnapshot?: {
    // optional predicted state if action were allowed
  };
};
```

#### 4.2.2 `get-active-treasury-policy`

Returns parsed `internal_treasury/domain_memory.json` merged with any additional rule packs.

### 4.3 Logging

Every denied or warned action should create a log entry and optionally an internal “incident”:

```json
{
  "timestamp": "2025-12-10T16:20:00Z",
  "strategy_id": "str_basis_kraken_btc",
  "action_type": "OPEN_POSITION",
  "decision": "deny",
  "reasons": [
    "BTC allocation would exceed max_per_asset_pct[BTC]=20%",
    "Green bucket usage would exceed 20% cap"
  ]
}
```

---

## 5. Agent Harness for Trading Strategies

We reuse the Smokey/Craig harness shape.

### 5.1 Generic Trading Harness

```ts
async function runTradingStrategy(strategyId: string) {
  const treasuryMemory = await loadTreasuryMemory();
  const stratMemory = await loadStrategyMemory(strategyId);

  await sanityChecks(strategyId, treasuryMemory, stratMemory);
  // e.g., stratMemory.strategy_meta.status === "running", no global safe_mode conflict

  const target = await selectTargetAction(strategyId, treasuryMemory, stratMemory);
  if (!target) return; // nothing to do

  const marketContext = await loadMarketContext(strategyId, target);
  const portfolioSnapshot = await loadPortfolioSnapshot();

  const policyDecision = await checkTreasuryPolicy({
    strategyId,
    actionType: target.actionType,
    deltaExposureUsd: target.deltaExposureUsd,
    assetSymbols: target.assetSymbols,
    venue: target.venue,
    currentPortfolioSnapshot: portfolioSnapshot
  });

  if (policyDecision.decision !== "allow") {
    await logDeniedAction(strategyId, target, policyDecision);
    return;
  }

  const result = await executeStrategyAction(strategyId, target, marketContext);

  await updateStrategyMemory(strategyId, stratMemory, result);
  await appendStrategyProgressLog(strategyId, target, result);
}
```

Each strategy implements:

* `selectTargetAction`
* `loadMarketContext`
* `executeStrategyAction`
* `updateStrategyMemory`

---

## 6. Initial Trading Bots (v1)

We start with **three** strategies in v1 (Kraken only), with a 4th (DeFi yield router) in v2.

### 6.1 `str_basis_kraken_btc` – Basis Trade Bot (Green)

**Purpose:**
Capture positive funding/basis on BTC without heavy directional risk.

**Inputs:**

* Kraken REST/WebSocket.
* BTC perp/spot prices & funding rates.
* Current BTC exposure and global caps.

**Key Config (from memory):**

* `min_funding_apr` (base, plus adjusted value).
* `max_leverage`.
* `max_position_notional_usd`.
* `rebalance_threshold_hedge_drift_pct`.

**Actions:**

* Open/adjust a hedged long-spot/short-perp position when:

  * `funding_apr >= min_funding_apr_adjusted`.
  * Policy engine allows increased exposure.
* Rebalance if hedge drifts beyond `rebalance_threshold_hedge_drift_pct`.
* Close or shrink position when:

  * Funding goes negative beyond a threshold.
  * Drawdown exceeds safe bands.

**Metrics to track:**

* Lifetime and 30-day PnL.
* Max drawdown.
* Sharpe-like ratio.
* Number of trades and win rate.

---

### 6.2 `str_dca_btc_eth` – DCA + Volatility Rebalancing (Yellow)

**Purpose:**
Disciplined accumulation of BTC/ETH with banded rebalancing.

**Inputs:**

* Current portfolio BTC/ETH/stable balances.
* Price feeds from Kraken.

**Key Config:**

* Target allocation: `BTC_pct`, `ETH_pct`.
* `rebalance_band_pct`.
* `max_daily_spend_usd`.
* `pause_on_drawdown_pct`.

**Actions:**

* Daily (or configured frequency):

  * Buy small amounts of BTC/ETH if below target allocations and policy allows.
* Rebalance:

  * If BTC or ETH over target by more than band:

    * Sell excess back to stables.
  * If below and drawdown not too extreme:

    * Top up gently.

**Metrics:**

* Total invested vs current value.
* Max drawdown.
* Performance vs simple “buy once and hold” baseline.

---

### 6.3 `str_runway_guard` – Runway Protection Bot (Green)

**Purpose:**
Protect company runway and decide when to shift into “safe mode”.

**Inputs:**

* Current portfolio value in USD.
* Monthly burn (from `runway_model.monthly_burn_usd`).
* Historical snapshots (from its own memory).

**Key Config:**

* `drawdown_trigger_pct`.
* `min_stable_pct_for_safe_mode`.
* `cooldown_days_after_safe_mode`.

**Actions:**

* Compute:

  * Latest drawdown vs recent high.
  * Updated runway in months.
* If:

  * Drawdown > trigger, or runway < `min_runway_months`:

    * Enter `safe_mode`:

      * Increase stablecoin target.
      * Ask Deebo-for-Money to lower risk-bucket caps.
      * Optionally pause yellow/red strategies.
* When conditions improve and cooldown passes:

  * Return to `normal` mode.

**Metrics:**

* Runway over time.
* Number of safe_mode transitions.
* Correlation between safe_mode and reduced drawdown.

---

### 6.4 (Phase 2) `str_yield_router_stables` – Stable Yield Router (Green)

**Purpose:**
Earn conservative yield on stables using blue-chip protocols.

**Inputs:**

* On-chain positions (USDC/DAI).
* Protocol APYs (Aave, Compound).

**Key Config:**

* Approved assets + protocols.
* Max per-protocol %.
* Rotation frequency.

**Actions:**

* Periodically:

  * Fetch yields and risk signals.
  * Reallocate within policy:

    * Move stables from low-yield to higher-yield protocols.
  * Withdraw or pause on risk events (oracle issues, TVL drops).

---

## 7. Treasury Console (Internal UI)

### 7.1 Overview Page

* Tiles:

  * Total portfolio value (USD).
  * Crypto vs cash split.
  * Green/Yellow/Red usage vs caps.
  * Runway (current + under scenarios).

* Table:

  * Each strategy:

    * Name
    * Status (planned/running/paused)
    * Last 30d PnL
    * Current exposure
    * Risk bucket & usage

### 7.2 Strategy Detail Page

* Show:

  * Parsed `memory.json`.
  * Graphs for PnL, drawdown, exposure.
  * `progress_log.md` entries.
* Controls:

  * Pause/Resume.
  * Adjust certain config parameters (within safe ranges).
  * Trigger manual rebalance / close all positions.

### 7.3 Policy / Rules Page

* Edit:

  * Global allocation policy.
  * Per-asset/per-venue caps.
  * Risk-bucket limits.

* List:

  * Recent denied actions with reasons.

---

## 8. Implementation Phases

### Phase 0 – Repo & Infra Setup

* Create `bakedbot-treasury` service in monorepo.
* Set up secrets (Kraken sandbox keys, wallet keys).
* Add shared libs (`agent-harness`, `domain-memory`, `rulepacks`) if not already extracted.

### Phase 1 – Core Memory & Policy

* Implement:

  * `internal_treasury/domain_memory.json` with read/write helpers.
  * Strategy memory schemas for the 3 v1 strategies.
  * Policy engine (`check-treasury-policy`, `get-active-treasury-policy`).
* Add simple CLI or script to:

  * Initialize memory.
  * Print current treasury policy.

### Phase 2 – Strategy Runtimes (Paper Trading)

* Implement harness + strategy workers for:

  * `str_basis_kraken_btc`
  * `str_dca_btc_eth`
  * `str_runway_guard`
* Wire them to:

  * Price feeds.
  * Mock portfolio state (paper mode; no real trades).
* Log hypothetical trades & PnL into memory + logs.

### Phase 3 – Tiny Real Capital

* Flip from paper → **very small allocations** (e.g., 0.5–1% of treasury).
* Keep:

  * Strict exposure caps.
  * Daily reporting (Slack/Email).

### Phase 4 – Treasury Console & Refinements

* Implement React pages for:

  * Overview.
  * Strategy detail.
  * Policy editor.
* Add:

  * Better metrics charts.
  * Alerting for:

    * Policy violations.
    * Safe_mode entries.
    * Big drawdowns.

