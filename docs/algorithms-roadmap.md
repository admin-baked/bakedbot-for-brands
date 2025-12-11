# BakedBot AI – Algorithm Backbone v1

**Audience:** Product & Engineering
**Goal:** Move BakedBot from “LLM + rules + vibes” to “LLM sitting on top of real algorithms.”

---

## 0. Context

Right now, BakedBot is:

> **LLM + rules + vibes** – not an **algorithmic machine**.

That’s fine for MVP + early revenue. It’s not fine for “Autonomous Cannabis Commerce.”

The **Smokey technical white paper** already describes an algorithmic system (multi-objective ranking, bandits, forecasting, guardrails). Most of that exists as *design intent*, not running code.

This doc lays out:

* What “lack of algorithms” means in concrete terms
* Where algorithms should live for each agent
* A realistic, phased roadmap to implement them

---

## 1. Current State (Brutal Honesty)

When we say “we’re not using algorithms,” we do **not** mean “no code.” We mean:

### Smokey (AI Budtender)

* Filters inventory by constraints:

  * in-stock, basic effect tag, optional price band
* Asks LLM to pick products using natural-language reasoning
* A few hand-coded rules:

  * avoid OOS, avoid > X mg for new users, etc.

**Missing:**
No explicit scoring function, no learning from clicks/purchases, no bandits.

---

### Craig (Marketing Agent)

* Campaigns triggered by:

  * human-defined events (“new subscriber”, “holiday blast”)
  * static templates
* Maybe some random subject-line A/B tests
* **No**:

  * send-time optimization
  * multi-armed bandits
  * global learning loop across campaigns / brands

---

### Pops (BI Agent)

* Dashboards + basic queries
* **No**:

  * demand forecasting
  * systematic anomaly detection
  * experiment analytics (lift, power, etc.)

---

### Ezal / Money Mike (Competitive + Pricing)

Conceptually:

* Ezal = competitive menu intelligence
* Money Mike = pricing & margin optimization

Today:

* Manual scraping + LLM summarization
* **No**:

  * gap scoring
  * price elasticity models
  * rule-based pricing policies backed by data

---

### Net Result

Pipeline is basically:

> **take inputs → ask model nicely → hope it generalizes**

This is “generalized intern” mode.
To earn **Autonomous Cannabis Commerce**, we need **algorithms under the LLM**, not just vibes over APIs.

---

## 2. Why This Is Normal (But Now a Bottleneck)

Predictable startup arc:

1. **Phase 0 – Ship the thing**

   * Integrations, auth, headless menu, Smokey chat, Deebo scaffolding
   * Make it work and **don’t lose anyone’s license**

2. **Phase 1 – Prove people care**

   * Wins with Ultra Cannabis, Zaza Factory, 40 Tons, etc.
   * Customers are buying *outcomes + story*, not “contextual bandits”

3. **Phase 2 – Hit the wall (now)**

   * “Can this get smarter over time?”
   * “Can it learn my store / my brand / my customers?”
   * Realization: we’re not exploiting behavior data at all

The lack of algorithms isn’t failure. It’s just the **next lever**.

---

## 3. Why We Need Real Algorithms Now

If we don’t layer algorithms under the LLMs:

### 3.1 Flat performance

* Smokey’s rec quality doesn’t improve per brand; it just:

  * wiggles with prompt tweaks,
  * shifts when the base model updates.

### 3.2 No compounding edge

Any competitor can show up with:

> “LLM + chat widget + RAG”

Our moat **is supposed to be**:

* Headless SEO menus
* Cannabis-specific data
* **Learned** behaviors:

  * pricing
  * recommendations
  * campaigns
  * compliance patterns

Without algorithms, that moat is just slideware.

### 3.3 Weak ROI proof

Our own white papers talk about:

* A/B tests
* multi-objective ranking
* guardrail metrics

Those all depend on:

* **Scoring functions**
* **Controlled experiments**
* **Statistical analysis**

If the math isn’t real, the ROI claims are fragile.

> **If “Autonomous Cannabis Commerce” is real, there has to be a spine of algorithms acting like disciplined intuition under the chat layer.**

---

## 4. Where Algorithms Should Live (Per Agent)

### 4.1 Smokey – From “Smart Chatbot” to Actual Recommender

**Current:**
LLM + product filter + vibes.

**Target:**

#### (A) Per-SKU scoring function

For each candidate SKU, compute:

* `effect_match` – vector similarity / rules vs requested effect/need (pain, sleep, social, creative, etc.)
* `chemotype_match` – THC/CBD profile, terpene profile, form factor vs user profile
* `business_score` – margin, inventory depth, promos, strategic pushes
* `risk` – dose vs tolerance, jurisdictional constraints via Deebo, “new user” penalties, etc.

Example:

```text
score = w1 * effect_match
      + w2 * margin
      + w3 * availability
      - w4 * risk
```

**Deliverables:**

* Function `compute_sku_score(user_context, sku, brand_config) -> float`
* Configurable weights per brand / segment (stored in brand’s domain memory)
* Top-K ranking over filtered SKUs using this score

LLM’s job: **explain** the picks, not decide them.

---

#### (B) Feedback loop (learning from behavior)

Use behavior to adapt weights:

* Clicks
* Add-to-cart
* Purchases
* Thumbs up/down
* Session dwell time / bounce

Initial version:

* Nightly batch job:

  * Re-fit `w1..wn` per brand / segment with simple regression/logistic regression
* Store updated weights in brand memory for next day

Later: bandits / Bayesian updates.

---

#### (C) Contextual bandits for top-N slots

For positions 1–3 (hero recs):

* Use contextual bandit (UCB / Thompson) where:

  * **Context** = (user intent, user segment, time of day, device, etc.)
  * **Actions** = candidate SKUs or SKU groups
  * **Reward** = click/add-to-cart/purchase

Bandit explores slightly off-top choices to learn better long-term policies.

API sketch:

```ts
select_recommendations(context, candidates) -> [sku_id, ...]
update_bandit(context, chosen_sku, reward)
```

LLM wraps the chosen SKUs into a nice conversational response.

---

### 4.2 Craig – Algorithms for Campaigns, Not Just Content

Craig’s job isn’t just to write emails. It’s to behave like a **performance marketer in code**.

#### (A) Campaign selection algorithm

Have a structured campaign backlog:

```ts
type Campaign = {
  id: string;
  objective: string;
  segment_id: string;
  impact_score: number;    // projected revenue / margin
  urgency_score: number;   // time sensitivity (expiring offer, holiday)
  fatigue_score: number;   // how spammed this segment is
  status: 'queued' | 'running' | 'paused' | 'completed';
};
```

Define:

```text
priority = (impact_score * urgency_score) / (1 + fatigue_score)
```

**Behavior:**

* At each scheduling tick, Craig:

  * filters eligible campaigns (segment size > X, not paused, within dates)
  * picks highest `priority`
  * generates content for that campaign

---

#### (B) Send-time optimization

Per segment:

* Track open/click by hour-of-day & day-of-week
* Maintain estimated response function:

  * `response(h, d) ~ expected_open_rate`
* Policy: send near argmax of response with small exploration.

Initial version:

* Bucketed histogram: `hour` → `open_rate`
* Best 2–3 hours per segment; randomly choose among them.

---

#### (C) Subject / creative bandits

For each campaign:

* Define multiple subject variants `var_a, var_b, var_c`
* Use multi-armed bandit where:

  * Arms = subject variants
  * Reward = open_rate / click_rate
* Shift traffic automatically to winners; stop losers early.

Same pattern can apply to hero offer variants.

---

#### (D) Compliance-aware throttle (integrate Deebo)

Deebo returns per brand/segment/channel:

* `risk_score`
* `rule_pack_status` (pass/fail/needs_review)
* `max_frequency` per user per period

Craig’s **send controller**:

* If `rule_pack_status != 'pass'` → block or downgrade campaign
* If frequency approaching `max_frequency` → queue instead of sending
* If `risk_score > threshold` → require human approval

This is how the algorithms and the compliance engine actually **meet**.

---

### 4.3 Pops – Where the Real Math Should Live

Pops is the algorithm playground.

#### (A) Demand forecasting

Start simple:

* Moving averages per SKU/category/store
* Day of week, holiday flags
* Roll to:

  * Prophet / SARIMA
  * or gradient boosting on time-series features

Deliver:

* `forecast_sku_demand(sku_id, horizon_days) -> distribution`
* Scan for:

  * expected stockout
  * overstock risks

Inputs: historical sales, seasonality, promo flags, external signals if available.

---

#### (B) Experiment analytics

We promised:

* 4–6 week A/B tests
* power analysis
* guardrail metrics

Pops should:

* Track experiments:

  * `exp_id`, treatment/control mapping, sample sizes
* Compute:

  * lift
  * p-values
  * confidence intervals
* Mark:

  * `status: 'running' | 'validated' | 'needs_more_data' | 'invalidated'`

Outputs:

* Write back to domain memory:

  * experiment result summaries
  * decisions (“keep variant B”, “kill variant A”)
* Provide APIs for Craig/Smokey:

  * “Is campaign X validated?”
  * “Use rec policy variant Y; it won.”

---

#### (C) Anomaly detection

Algorithms to catch:

* sudden drop in menu visits
* spike in unsubscribes
* weird margin patterns
* strange product mix changes

Approach:

* Baseline model per metric (EWMA / simple forecast)
* Alert if deviation > N standard deviations or crosses thresholds
* Tag anomalies with likely drivers via simple feature attribution (e.g., product-level decomposition)

This is where the “data-obsessed CEO” persona actually lives in the product.

---

### 4.4 Ezal & Money Mike – Competitive & Pricing “Intuition”

#### Ezal: competitive gap engine

Steps:

1. Scrape competitor menus (category, SKUs, prices, forms, effects).
2. For each brand/dispensary pair and category, compute:

   * `coverage_score` = our SKU count vs theirs
   * `price_rank_percentile` for overlapping SKUs
   * `presence/absence` at key price tiers
   * `effects_coverage` gaps

Define:

```text
gap_score = f(
  missing_price_tiers,
  missing_forms,
  underrepresented_effects
)
```

Emit **gap objects**:

```ts
type Gap = {
  id: string;
  brand_id: string;
  dispensary_id: string;
  category: string;
  description: string;
  gap_score: number;
};
```

Feed Gaps into:

* Money Mike (pricing / portfolio moves)
* Craig (campaigns to fill/advertise gaps)

---

#### Money Mike: elasticity & pricing rules

Given historical price vs units sold:

* Estimate local elasticities:

  * `elasticity ≈ %Δquantity / %Δprice` in local windows

Use to define rules:

* Don’t discount below X margin unless elasticity > threshold
* Raise price if:

  * demand is inelastic
  * margin is low relative to category

API:

```ts
suggest_price(sku_id, constraints) -> { recommended_price, rationale }
```

This converts “I think this discount is good” into “data says we’re leaving money on the table.”

---

### 4.5 Deebo – Algorithms for Rule Engine

Deebo is already the most algorithmic:

* Rule packs per state/channel
* Deterministic evaluation of content vs rules
* Test suites + regression checks

Next steps:

* **Version rule packs** (jurisdiction + channel + version)
* Track metrics per rule pack:

  * violation frequency
  * false positive/negative rates (based on human overrides)
* Integrate tightly with:

  * Craig’s throttling
  * Smokey’s rec safety scoring

Think of Deebo as the **policy oracle** every other agent must query before acting.

---

## 5. Algorithm Roadmap (Phased)

### Phase 0 – Instrumentation (Do Now)

Goal: **Log everything cleanly. No learning yet.**

Implement logging for:

* Smokey:

  * which SKUs were considered
  * which order shown
  * final picks
  * user behavior: clicks, ATC, purchases, ratings

* Craig:

  * campaign → send time
  * variants (subjects/creative)
  * opens, clicks, conversions

* Pops:

  * key metrics per day (store, category, SKU)

* Deebo:

  * decisions per message (pass/fail/warn)
  * rule pack version used

Requirements:

* Stable event schema
* Centralized storage (BigQuery/Firestore/warehouse)
* Ability to join events across systems by brand/user/session

---

### Phase 1 – Deterministic Scoring & Rules (Low Effort, Big Win)

Ship basic algorithms without learning:

* **Smokey:**

  * Implement scoring function + ranking
  * Configurable weights per brand (static for now)

* **Craig:**

  * Campaign priority formula
  * Basic send-time heuristic per segment (histogram-based)

* **Pops:**

  * Baseline experiment math (lift, simple p-values)
  * Simple anomaly detection (threshold-based)

* **Deebo:**

  * Versioned rule packs + test suites wired into CI

This gets us out of “pure LLM” mode.

---

### Phase 2 – Lightweight Learning (Bandits & Simple Models)

Add data-driven adaptation:

* **Smokey:**

  * Contextual bandits for top-N rec slots
  * Periodic re-weighting of scoring function by brand/segment

* **Craig:**

  * Bandits for subject lines / offers
  * Empirical send-time optimization per segment

* **Pops:**

  * Simple demand forecasting models per SKU/category
  * Baseline experiment power estimation

* **Money Mike:**

  * Basic price-elasticity estimates & rule application

Now we’re actually learning from behavior, not just logging it.

---

### Phase 3 – Cross-Tenant “Algorithmic Intuition”

Learn **shared priors across brands**, adapt locally:

Examples:

* “Gummies + sleep intent + low tolerance → these patterns perform best across the fleet.”
* “Pre-roll discounts after 6pm in urban stores drive units but kill margin.”

Implementation:

* Train global models on anonymized cross-tenant data
* Use them as priors / starting weights for per-brand fine-tuning

This is our **moat**:

> General experience (across tenants)
>
> * local adaptation (brand, market, compliance)
>   = algorithmic intuition

---

## 6. Success Criteria

We know this is working when:

* Smokey rec metrics per brand **improve over time** (CTR, ATC, conversion, AOV).
* Craig campaigns show:

  * higher open/click/conversion
  * fewer compliance hits (thanks to Deebo integration).
* Pops:

  * forecasts get closer to reality
  * anomalies are caught early and explained.
* Ezal & Money Mike:

  * generate concrete, data-backed pricing / assortment moves
  * that can be tied to margin and market-share lift.
* Deebo:

  * fewer surprises, more proactive catches
  * clear audit logs for every veto/approval.

And culturally:
We stop shipping “agent features” that don’t have **an algorithm and a metric** underneath them.

---

That’s the doc. Next step is turning this into tickets: one vertical slice per agent per phase, with data contracts nailed down so the learning loops have something to chew on.
