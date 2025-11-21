# 🚀 The Road to Production: A Playbook

This document provides a clear-eyed assessment of the BakedBot AI platform's current state. It's a playbook for understanding our strengths, addressing our weaknesses, and preparing for the hard problems that come with launching a real-world, multi-tenant, AI-powered commerce system.

---

## ✅ The Good: The Solid Foundation

This is what we've built right. These architectural choices and recent fixes give us a massive advantage in speed, scalability, and intelligence.

1.  **Live CannMenus Integration**: The entire product catalog, pricing, and retailer data model is now driven by live API calls to CannMenus. The integration is robust, using runtime environment variables for security and proper API versioning. This eliminates our dependency on stale, hard-coded stub data.

2.  **Live AI-Powered Search (RAG)**: Our AI Budtender (Smokey) is fully functional. It uses a state-of-the-art Retrieval-Augmented Generation (RAG) pipeline, performing vector searches against real product data to provide intelligent, semantic recommendations. Its keyword fallback mechanism ensures a helpful response is always provided.

3.  **Unified & Secure Authentication**: The login and onboarding flows are now centralized and secure. All new users, regardless of role (brand, dispensary, customer), are correctly routed through the onboarding process if they haven't selected a role, ensuring no user is left in an indeterminate state.

4.  **Event-Driven Architecture (The Event Spine)**: This remains our core strength. Decoupling actions from reactions creates a resilient and extensible system, allowing us to add new agent capabilities without rewriting existing logic.

5.  **Specialized, Composable AI Agents**: Each agent has a clear, domain-specific job. This separation of concerns makes each agent simpler, easier to test, and less prone to bugs.

6.  **Clean Separation of Financial Flows**: We’ve cleanly separated how *we* make money (SaaS billing via Authorize.Net) from how *our customers* make money (retail checkout via Smokey Pay/CannPay).

---

## 🟡 The Bad: The Technical Debt & Risks

This is the list of known shortcuts and areas that require hardening before we can confidently handle mission-critical, real-money transactions at scale.

1.  **Insecure Internal APIs**: This is our biggest remaining risk.
    *   **The Issue**: Routes like `/api/agents/dispatch` and other dev routes can be called by anyone.
    *   **Production Impact**: A malicious actor could trigger thousands of agent runs, wipe our database, or run up huge bills on our AI services. These endpoints **MUST** be secured using Firebase Auth (checking for an `owner` role) or a secret header/token before going live.

2.  **Simplistic Agent Dispatching**: The current "process last 20 events" model is a development shortcut.
    *   **The Issue**: It doesn't track which events have been processed by which agents. If the dispatcher runs twice, an order confirmation email might be sent twice.
    *   **Production Impact**: This will lead to duplicate actions and incorrect analytics. The fix is to add a `processedBy: { craig: true, pops: false, ... }` map to each event document, or use a proper job queue system like Cloud Tasks.

3.  **No Dead-Letter Queue for Events**: When an agent fails to process an event, it's currently just logged and forgotten.
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
