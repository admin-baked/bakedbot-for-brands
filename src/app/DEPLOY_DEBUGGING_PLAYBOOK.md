# 🚀 The Road to Production: A Playbook

This document provides a clear-eyed assessment of the BakedBot AI platform's current state. It's a playbook for understanding our strengths, addressing our weaknesses, and preparing for the hard problems that come with launching a real-world, multi-tenant, AI-powered commerce system.

---

## ✅ The Good: The Solid Foundation

This is what we've built right. These architectural choices give us a massive advantage in speed, scalability, and intelligence.

1.  **Event-Driven Architecture (The Event Spine)**: This is our single greatest strength.
    *   **Why it's good**: By decoupling actions (like a paid order) from reactions (like sending an email or updating analytics), we've created a system that is incredibly resilient and extensible. Adding a new agent or a new behavior doesn't require rewriting existing logic; it just requires listening to the right event.
    *   **Production Impact**: We can handle retries, add new reporting features, and introduce new agent capabilities without bringing the core system down. It's built to evolve.

2.  **Specialized, Composable AI Agents**: Each agent has a clear, domain-specific job.
    *   **Why it's good**: Craig doesn't need to know about SaaS billing math, and Money Mike doesn't need to know how to send an email. This separation of concerns makes each agent simpler, easier to test, and less prone to bugs.
    *   **Production Impact**: When a specific task fails (e.g., loyalty point calculation), it doesn't break the entire checkout flow. We can debug and redeploy agents independently.

3.  **Clean Separation of Financial Flows**: We’ve cleanly separated how *we* make money (SaaS billing via Authorize.Net) from how *our customers* make money (retail checkout via Smokey Pay/CannPay).
    *   **Why it's good**: This prevents complex, entangled billing logic. The SaaS subscription determines feature access (e.g., location count), while the retail checkout handles the per-order transactions.
    *   **Production Impact**: We can change our SaaS pricing without breaking the dispensary checkout flow. Tax, compliance, and payment processing for cannabis are kept isolated from our own corporate billing.

4.  **Hybrid Search Model (RAG + Keyword Fallback)**: Our AI Budtender (Smokey) uses modern vector search for semantic understanding but gracefully falls back to older methods.
    *   **Why it's good**: It's robust. If a vector search for "chill vibes for a Tuesday" yields nothing, a keyword search on our product catalog for "chill" or "relax" still can. This provides a better user experience than a simple "no results found."
    *   **Production Impact**: The system is more reliable and less likely to fail completely if one part of the search logic underperforms.

---

## 🟡 The Bad: The Technical Debt & Risks

This isn't "bad code," but rather a list of known shortcuts and areas that require hardening before we can confidently handle mission-critical, real-money transactions at scale.

1.  **Stubbed External Dependencies (CannMenus)**: This is our biggest immediate risk.
    *   **The Issue**: The entire product catalog and pricing model currently relies on hard-coded stub data. The *real* CannMenus API will have different data structures, rate limits, and failure modes.
    *   **Production Impact**: If we launch without a real-time sync, our menus will be instantly out of date, leading to failed orders and customer frustration. The first major task is to replace the stubs with a robust, scheduled Cloud Function to sync with the live CannMenus API.

2.  **Insecure Internal APIs**: Our agent dispatcher and dev routes are wide open.
    *   **The Issue**: Routes like `/api/agents/dispatch` and `/api/dev/seed-cannmenus-stub` can be called by anyone.
    *   **Production Impact**: A malicious actor could trigger thousands of agent runs, wipe our database, or run up huge bills on our AI services. These endpoints **MUST** be secured using Firebase Auth (checking for an `owner` role) or a secret header/token before going live.

3.  **Simplistic Agent Dispatching**: The current "process last 20 events" model is a development shortcut.
    *   **The Issue**: It doesn't track which events have been processed by which agents. If the dispatcher runs twice, an order confirmation email might be sent twice.
    *   **Production Impact**: This will lead to duplicate actions and incorrect analytics. The fix is to add a `processedBy: { craig: true, pops: false, ... }` map to each event document, or use a proper job queue system like Cloud Tasks.

4.  **No Dead-Letter Queue for Events**: When an agent fails to process an event, it's currently just logged and forgotten.
    *   **The Issue**: If Craig fails to send an order confirmation email due to a temporary SendGrid outage, that event is lost forever.
    *   **Production Impact**: Critical business logic will fail silently. We need a "dead-letter" mechanism where failed events are moved to a separate collection (`.../events_failed`) for manual inspection or automated retry.

---

## 👹 The Ugly: The Hard Problems & External Realities

These are the issues that are difficult, expensive, or dependent on outside factors. They represent the biggest long-term challenges.

1.  **Cannabis Compliance (Deebo's Real Job)**: This is, without question, the hardest part of the entire business.
    *   **The Issue**: Compliance rules for marketing, sales, and delivery are a patchwork of state-level laws that change constantly. A "giveaway" SMS might be legal in Michigan but illegal in Illinois. Online payment might be allowed in one state but restricted to "reservation-only" in another.
    *   **Production Impact**: A mistake here isn't a bug; it's a potential legal and licensing disaster for our customers. Stubbing `deeboCheckMessage` is fine for a demo, but a production-ready Deebo requires a dedicated compliance engine, likely fed by a paid legal data provider. This is a core business risk, not just a technical one.

2.  **Payment Processor Risk (CannPay/Smokey Pay)**: The cannabis industry is still high-risk for payment processors.
    *   **The Issue**: Even with "cannabis-friendly" processors, the regulatory landscape is volatile. A processor could change their terms, increase their fees, or shut down with little notice.
    *   **Production Impact**: Our entire retail checkout flow depends on this third-party integration. We have a single point of failure for our customers' revenue stream. A long-term strategy requires having backup processors or an abstraction layer that can switch between them.

3.  **Vector Embedding Drift and "Vibes" Mismatch**: The semantic search feels magical, but it's not deterministic.
    *   **The Issue**: When we update our embedding models (e.g., from `text-embedding-004` to a future `005`), the "meaning" of our vectors can shift. A query that worked perfectly yesterday might return slightly different results today. Users might complain that the "vibe" of the recommendations feels off, which is incredibly hard to debug.
    *   **Production Impact**: This can lead to subtle degradation in recommendation quality that is difficult to detect with traditional monitoring. The roadmap item for "Versioned Embeddings" is the correct, albeit complex, solution to this. It allows for A/B testing new models and rolling back if performance degrades.

4.  **Cost of AI at Scale**: Every call to `generateEmbedding` and every `ai.definePrompt` costs money.
    *   **The Issue**: A simple user query in the chatbot can trigger multiple LLM and embedding calls. A batch job to re-embed 10,000 products can be surprisingly expensive.
    *   **Production Impact**: Without careful caching, query optimization, and cost monitoring, our cloud bills could spiral out of control. We must implement aggressive caching for embeddings and summaries and add cost tracking to our `rag_queries` log.

This playbook gives us a solid map. We know our strengths to lean on, the immediate debts to pay down, and the big dragons we'll need to slay on the horizon.