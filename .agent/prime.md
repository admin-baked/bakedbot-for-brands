# BakedBot AI Builder Agent - Prime Context

**Loaded automatically on agent startup**

> "We're not just building agents. We're building agents that build themselves. That's the future of retail—and it starts with cannabis."

---

## 🏥 Codebase Health Status (Live)
| Metric | Status | Last Verified | Notes |
|--------|--------|---------------|-------|
| **Build** | 🟢 Passing | 2026-01-04 | `tsc --noEmit` clean. |
| **Tests** | 🟢 Passing | 2026-01-04 | 17/17 Dispensary/Orders/CRM tests passed. |
| **Deploy** | 🟢 Stable | 2026-01-04 | Dispensary Console production-ready. |

### Critical Watchlist
- **Firestore**: `ignoreUndefinedProperties: true` enabled globally (watch for silent data loss).
- **Dispensary Console**: Live data migration complete. `retailerId` scoping verified.
- **Orders**: Status transitions validated with Firestore transactions.

---

## 🧠 BakedBot Intelligence 1.0 (Live on Executive Boardroom)
**Major Release**: We have deployed a cognitive upgrade to the Executive Agents (Leo, Mike, Craig, Linus).
These capabilities will rollout to Standard Agents (Brand/Dispensary/Customer) in Q2 2026.

| Capability | Feature | Benefit |
|------------|---------|---------|
| **Hive Mind** | Shared Memory Blocks | If Mike (Finance) cuts budget, Craig (Marketing) stops spending instantly. **No message passing required.** |
| **Self-Improvement** | Sleep Time Compute | Agents go offline to reflect on logs, find patterns, and update their own Persona. |
| **Skill Learning** | The Letta Loop | Teachers (Strong Models) analyze Agent (Weak Models) mistakes and write reusable `SKILL.md` instructions. |
| **Archival Memory** | Active Knowledge Base | Agents deciding *what* to remember forever strategies, preferences, histories. |
| **Executive Tools** | Direct API Access | Finance (Authorize.net), Ops (Linear), Growth (GA), Docs (Notion) integration. |

---

## 🧬 Context OS (Decision Lineage Layer)
**The "Why" Layer**: Context OS captures the reasoning behind every decision, not just the data.

### Core Concept
| Traditional Systems | Context OS |
|---------------------|------------|
| Records **what** happened | Captures **why** it happened |
| Static data warehouses | Living decision traces |
| Lost tribal knowledge | Searchable, scalable context |
| Fragile AI (wrong values) | Grounded AI (policy-aware) |

### Components

| Component | Purpose | Status |
|-----------|---------|--------|
| **Decision Log** | Persist every agent decision with inputs, reasoning, and outcome | 🟢 Phase 1 |
| **Context Query** | Ask "Why did we...?" questions across decision history | 🟡 Phase 2 |
| **GraphRAG** | Entity-relationship graph for multi-hop reasoning | ⚪ Phase 3 |

### Decision Trace Schema
```typescript
interface DecisionTrace {
  id: string;
  timestamp: Date;
  agentId: string;           // Who decided
  task: string;              // What was asked
  inputs: Record<string, any>; // Context available
  reasoning: string;         // Why (from agent)
  outcome: 'approved' | 'rejected' | 'modified';
  evaluators: EvaluatorResult[]; // Gauntlet verification
  linkedDecisions?: string[]; // Related decisions
  metadata: { brandId?: string; userId?: string; sessionId?: string; };
}
```

### Agent Tools
- `context_ask_why` - Query the decision graph
- `context_log_decision` - Explicitly log business decisions

### Value Proposition
> "The winners won't be those with the most data; they'll be those with the best **Context Engineering**."

---

## 🌟 Strategic North Star: Autonomous Cannabis Commerce
**Target (Q4 2026):**
- Every agent runs on 50+ versioned, battle-tested tools.
- Tools improve via feedback loops (learning agents).
- **Core Metric**: Speed of learning = durability of moat.

### 🗺️ Technical Roadmap
- **V1 (Current)**: **Executive Squad & Delegation** — Agents autonomously orchestrate via `agent.delegate`.
- **V2 (Intelligence 1.0)**: **Self-Evolving Agents** — Hive Mind, Sleep Reflection, and Skill Learning. (Live on Boardroom).
- **V3**: Full autonomous revenue management ($100k MRR).

### The Rebel-Sage Synthesis
We are applying **Tasklet.ai Principles** to cannabis. Every agent action (recommendation, campaign, compliance check) is a measurable product. We do not ship static features; we ship learning systems.

---

## 🕵️ The Agent Squad & Tooling
The platform logic is personified by specialized AI agents.

| Agent | Role | Domain | Primary Tools (Current Gaps) |
|-------|------|--------|------------------------------|
| **Smokey** | Budtender | Product Search & Recs | Chemotype matching (needs terpene vectors), Headless Menus |
| **Craig** | Marketer | Campaigns & Lifecycle | Email/SMS (Twilio/SendGrid), Automations (needs send-time opt) |
| **Pops** | Analyst | Revenue & Funnel | Transaction Analysis, Demand Forecasting (needs real-time adaptation) |
| **Ezal** | Lookout | Competitive Intel | Agent Discovery (Firecrawl), Price Monitoring, Lead Discovery |
| **Money Mike** | Banker | Pricing & Margins | Elasticity Models, Billing, ROI Calc (needs forecast integration) |
| **Day Day** | Growth | SEO & Traffic | Site Audits, Backlinks, Local Search Dominance |
| **Felisha** | Ops | Coordination | Meeting Notes, Error Triage, Scheduling |
| **Mrs. Parker** | Hostess | Loyalty & VIP | Segmentation, Win-back flows |
| **Deebo** | Enforcer | Compliance & Regs | CTIA/State Rule Engine |
| **Leo** | COO | Operations | **Orchestrator**: Full Work OS, Squad Delegation, Google Drive (docs/sheets), Email Dispatch. Can spawn sub-agents. Directs the fleet. |
| **Jack** | CRO | Revenue | **Growth Engine**: $100k MRR Mandate. Access to CRM, Stripe, Email Campaigns. Directs **Mrs. Parker** for retention. |
| **Linus** | CTO | Technology | **AI CTO**: Code Evals, Claude API, Linear/Jira, GitHub. Spawns "Dev Drones" for specific tasks. |
| **Glenda** | CMO | Marketing | **Funnel**: National Discovery Layer, SEO Content, Social Media. Directs **Craig** & **Day Day**. |
| **Mike** | CFO | Finance | **Banker**: Unit Economics, Billing, Stripe, QuickBooks. Audits all spending and ROI. |

### 🏛️ Executive Boardroom Protocol (Super User Autonomy)
The Executive Agents (Leo, Jack, Linus, Glenda, Mike) operate with **Level 5 Autonomy** to assist the Super User.

1.  **Direct Tool Access**: They hold keys to the kingdom (Gmail, Drive, Slack, GitHub). They do not just "recommend"; they **act**.
    *   *Email*: Send/Read/Draft via Gmail.
    *   *Files*: Create/Edit Docs, Sheets, and Slides in Google Drive.
    *   *Code*: Read/Write access to the repository.
2.  **Sub-Agent Spawning**: They can dynamically instantiate ephemeral agents (e.g., "Linus spawns a focused 'React Refactor Bot'").
3.  **Command Chain**:
    *   **Leo** directs the entire operational fleet.
    *   **Jack** & **Glenda** direct **Mrs. Parker** (Hostess) for customer success, loyalty, and win-back campaigns.
    *   **Linus** directs the codebase health, checks, and deployment.
4.  **File Authority**: They can Create, Read, Update, and Delete files in the User's Knowledge Base (Google Drive) and codebase.

---

## 🔬 Linus: 7-Layer Code Evaluation Framework
**Bridge between codebase and Executive Boardroom. Uses Claude API exclusively.**

| Layer | Agent | Focus | KPI |
|-------|-------|-------|----- |
| 1 | Architect | Structural Integrity | Zero drift |
| 2 | Orchestrator | Cross-Agent Flow | Clean dependencies |
| 3 | Sentry | Security (ISO/SOC2) | Pass security scan |
| 4 | Money Mike | Token Efficiency | API overhead reduction |
| 5 | Deebo | Regulatory | 100% compliance |
| 6 | Chaos Monkey | Resilience | Uptime under stress |
| 7 | **Linus** | Deployment Decision | Zero post-release bugs |

**Decisions**: `MISSION_READY` | `NEEDS_REVIEW` | `BLOCKED`

**Prompt Linus**:
```
Linus, run a code eval and give me the deployment scorecard.
```

---

## 📈 Tool Evolution Protocol (The Tasklet.ai Playbook)
We systematically improve tools in 5 layers. **"Measure. Version. Learn."**

### Layer 1: Instrumentation
- **Telemetry**: Log `(agent, tool, input, output, latency, context, outcome)`.
- **Metrics**: CTR (Smokey), Open Rate (Craig), False Positives (Deebo).

### Layer 2: Versioning & A/B Testing
- **Rule**: Never replace a tool; version it (v1.0 -> v1.1).
- **Test**: Run A/B tests in production (e.g., Keyword Match vs. Terpene Vector).
- **Promote**: Only promote the winner based on revenue/engagement lift.

### Layer 3: Composition
- **Workflow**: Agents chain tools.
  - *Example*: Smokey (Recs) -> Money Mike (Margin Check) -> Ezal (Competitor Stock Check).

### Layer 4: Feedback Loops
- **Self-Improvement**: Tools learn from outcomes without manual code changes.
- **Mechanism**: Bandit algorithms for recs; retraining compliance models on delivery logs.

### Layer 5: Meta-Learning
- **Discovery**: Agents analyze failure modes and request new tools.
  - *Example*: "Smokey failed to answer 'anxiety effects' 20% of time -> Request `AnxietyProfiler` tool."

---

## 🎯 Codebase Context

| Component | Technology |
|-----------|------------|
| Framework | Next.js 14 (App Router) |
| Backend | Firebase (Firestore, Auth, App Hosting) |
| AI Core | Google Genkit, Gemini 2.5/3 |
| Testing | Jest + Playwright |
| Styling | Tailwind CSS, ShadCN UI |

### Key Abilities
| Capability | Implementation |
|------------|----------------|
| **Task Decomposition** | `TaskManager` (Camel-style Evolve/Decompose) |
| **Multimodal Inputs** | Native Genkit (`agent-runner.ts` handles PDF/Images) |
| **Knowledge Base** | Vector RAG (Firestore `findNearest`) |
| **Deep Research** | Owl Sidecar (`research.deep` tool) |
| **Universal Delegation** | `agent.delegate` (All core agents can spawn sub-tasks) |
| **Broadcasting** | `agent.broadcast` (Multi-channel Slack/Email updates) |

## 16. The "Plan & Execute" Mandate (Architecture V3)
**Requirement**: All core agents MUST implement an LLM-driven "Planner/Executor/Synthesizer" loop for user requests.
**Goal**: Move from rigid functional logic to dynamic, context-aware problem solving.

### The Agent Loop Protocol:
1.  **Orient**: Detect `user_request`.
2.  **Define Tools**: Instantiate Zod-schema tools relevant to the request.
3.  **Plan**: Use `ai.generate` to select the *single best tool* (or sequence) based on the user's intent and agent's system instructions.
4.  **Execute**: Run the selected tool logic (or fallback).
5.  **Synthesize**: Use `ai.generate` to craft a persona-matched response using the tool output.

### Hardcoded Interactions:
*   **Prohibited**: Hardcoded string matching for complex tasks ("If user says X, return Y").
*   **Allowed**: Only for high-speed, zero-cost routing or safety overrides (e.g. emergency stop).

---

## 📋 Critical Protocols

### Before ANY Code Changes:
```bash
git pull origin main --rebase
```

### The 4-Step Exploration Sequence:
1. **Directory Tree** - `list_dir` on relevant directories
2. **Related Files** - `find_by_name`, `grep_search` for patterns
3. **Deep Read** - `view_file` each relevant file (NEVER assume)
4. **Pattern Summary** - Document patterns before implementing

### Fix → Test → Ship Loop:
1. Make change
2. Run test (`npm test -- <file>.test.ts`)
3. If fail → analyze + retry (max 3x)
4. If pass → update backlog + commit
5. Log progress in `dev/progress_log.md`

---

## 🎛️ Orchestrator Mode

For complex multi-step tasks, read `.agent/orchestrator.md`.

### Available Workflows (`.agent/workflows/`)
| Workflow | Trigger | Description |
|----------|---------|-------------|
| `fix-test.yaml` | Test failing | Diagnose → Fix → Validate |
| `review.yaml` | Pre-commit | Types → Tests → Commit |
| `deploy.yaml` | Main updated | Build → Stage → Prod |

---

## 🛠️ Available Skills

| Skill | Command | Description |
|-------|---------|-------------|
| Fix Test | `/fix <task_id>` | Auto-diagnose and fix failing test |
| Review | `/review` | Validate all changes before commit |
| Type Check | `/types` | Run `npm run check:types` |
| Deploy | `/deploy` | Execute deployment workflow |
| Optimize | `/optimize` | Improve workflows based on metrics |
| Generate Skill | `/generate-skill` | Create new skill from gap |
| Manage Backlog | `/backlog` | Prioritize and manage tasks |

---

## 🚀 Deployment (App Hosting)

**Uses `git push` ONLY.** Do not use `firebase deploy` for the Next.js app.

### How to Deploy:
```bash
git push origin main
```

### Secrets Management:
After ANY change to `apphosting.yaml` secrets, you MUST grant access permissions using the commands in `dev/SWARM_RULES.md`.

---

## 🤖 Autonomous Mode & Learning
Check `.agent/protocols/autonomous-mode.md`.
**System State**: `metrics.json` → `autonomy.level`

| Purpose | Path |
|---------|------|
| Task Backlog | `dev/backlog.json` |
| Test Commands | `dev/test_matrix.json` |
| Progress Log | `dev/progress_log.md` |
| Swarm Rules | `dev/SWARM_RULES.md` |
| Session State | `.agent/state/session.json` |

---

## 🇺🇸 National Rollout Strategy (Discovery Layer)
**Objective**: Mass release of SEO-friendly Location and Brand pages ("The Claim Model").
**Monetization**:
1.  **Unclaimed Page** ($0): SEO presence, driving traffic.
2.  **Claim Pro** ($99/mo): Verified badge, edits, analytics, lead capture.
3.  **Founders Claim**: Scarcity-driven lifetime offer.
4.  **Coverage Packs**: Upsell for multi-zip visibility.

**Rollout**:
- **Track 1**: Legal Cannabis (using ZIP dataset + CannMenus hydration).
- **Super User Exemption**: Super Users have full access without subscription.

---

## 📊 Competitive Intelligence
When a user requests a "Competitive Snapshot" or "Market Analysis", use the structured format:
- **Pricing Insights**: Price gaps, margin opportunities.
- **Top Movers**: High sell-through signals.
- **Competitor Vulnerabilities**: Out-of-stocks, low ratings.

---

## 6. Super User Protocol
- **Absolute Access**: Super User (Owner) has unrestricted access.
- **Playbooks**: Belong to tenant but Super User manages all.
- **Agent Discovery**: Free users = basic; Paid users = Firecrawl/BakedBot Agent Discovery.

---

## 7. Hybrid Intelligence Protocol (Discovery & Search)
**"Structure First, Vision Second"**
We do NOT scrape everything at onboarding. We use **Just-in-Time (JIT) Hydration** to heal the map as users query it.

### Layer 1: Structural (CannMenus/Leafly)
*   **Trigger**: "Who has Stiiizy?", "Find dispensaries near me."
*   **Action**: 1. Check DB (Hot Cache). 2. If stale/empty -> Call API. 3. Write to DB.
*   **Why**: Fast, cheap, best for inventory/location.

### Layer 2: Visual (Firecrawl/Ezal)
*   **Trigger**: "What are the deals?", "Competitive snapshot", "New homepage banner?"
*   **Action**: Agent browses the live site to extract unstructured data (banners, popups).
*   **Why**: APIs miss marketing context. Visual scraping captures the "human" view.

**Rule**: Always try Layer 1 first. Only escalate to Layer 2 for deals, visual validation, or if Layer 1 fails.

---

## 🧩 Front-End Composability (2026 Philosophy)
> "Front-end engineering is dead. Long live front-end composability."

We are shifting from **static, hand-coded UIs** to **agent-composed, workflow-driven experiences**.

### Core Principles
| Old Model | New Model |
|-----------|-----------|
| Hand-code every page | Design composable primitives (ShadCN, widgets) |
| Static dashboards | Schema-driven, role-adaptive views |
| Human-only consumers | **AI agents as first-class UI consumers** |
| Page-per-feature | Workflow recipes (Playbooks) |
| RBAC on frontend | Policy-driven access at API layer |

### Implementation in BakedBot
| Concept | BakedBot Component |
|---------|-------------------|
| **Primitives** | `widget-registry.ts`, ShadCN components |
| **Recipes** | Playbooks (reusable automations) |
| **AI as Consumer** | Smokey (menu queries), Ezal (competitor scraping), Craig (campaigns) |
| **Dynamic Composition** | Agent Chat generates context-aware responses |
| **Auditability** | Tool telemetry (Layer 1), `dev/progress_log.md` |

### Builder Guidelines
1. **Think screens, not schemas**: Build for the range of views, not one static page.
2. **Brand as promise**: Ensure brand consistency across composed UIs.
3. **Workflow-first**: Design for recipes (e.g., "Cancel Subscription" = one invokable flow).
4. **Agent-aware RBAC**: Agents inherit user permissions at lower scope.
5. **Auditability by default**: Log composed views and agent actions.

---

## 8. Intention OS (Architecture V2)
**Core Philosophy**: "Interpretation First, Execution Second."

To solve the "confidently wrong" problem, we separate **Perception** from **Action**.

### The 3 Laws of Intention:
1.  **The Semantic Commit**: Agents must generate a JSON `IntentCommit` artifact *before* taking any significant action. This artifact explicitly states the Goal, Assumptions, and Perceived Constraints.
2.  **The "Ask First" Protocol**: If an intent is ambiguous (confidence < 0.8), the agent MUST ask a clarification question. It is forbidden to guess.
    *   *Bad*: User says "Fix menu" -> Agent deletes 50 items.
    *   *Good*: User says "Fix menu" -> Agent asks "Do you want to sync prices or update descriptions?"
3.  **Artifact Permanence**: Intent is not ephemeral. We store `IntentCommit` objects in Firestore to audit "What the agent *thought* it was doing" vs "What it actually did."

### Discovery-First Protocol (Tasklet Pattern)
For complex tasks, agents generate a **Configuration Checklist** before execution:

```typescript
interface TaskConfiguration {
  required: string[];      // MUST ask before proceeding
  optional: string[];      // Can assume defaults
  assumptions: string[];   // State explicitly
}
```

**Example Output:**
```
🎯 **To set up this task, I need to understand:**

1. Which competitors should I monitor?
2. What products/services should I track?
3. Where do I find their pricing? (websites/APIs)
4. How often should I check? (hourly/daily/weekly)
5. How should I alert you? (email/Slack/SMS)

Please provide these details, or I can start with defaults.
```

---

## 9. Intuition OS (Proactive Intelligence)
**Core Philosophy**: "Anticipate, Don't Just React."

While Intention OS handles **user-initiated** queries, Intuition OS handles **system-initiated** insights.

### Proactive Inference Triggers
| Trigger | Example |
|---------|---------|
| **Anomaly Detection** | Sales dropped 40% mid-day → Alert + investigate |
| **Pattern Recognition** | Mondays underperform → Suggest promotion |
| **Churn Prediction** | High-LTV customers inactive 14+ days → Win-back |
| **Opportunity Detection** | Shelf space doesn't match sales → Request reallocation |
| **Context Inference** | Minimal query + role → Infer most likely intent |

### Interface
```typescript
interface IntuitionInsight {
  contextInferred: string[];     // What we observed
  proactiveInsight: string;      // What we think user needs
  confidenceLevel: 'high' | 'medium' | 'low';
  triggerCondition: string;      // When this triggers
}
```

### Output Pattern
```
💡 **[Intuition OS: Insight Detected]**

I noticed you're looking at [X] data. Based on patterns:

**What I'm seeing:**
📉 [Observation 1]
📊 [Observation 2]

**What I think you might be wondering:**
"[Anticipated question]"

**Proactive Suggestion:**
[Actionable recommendation]

Would you like me to [specific action]?
```

---

## 10. Intelligence Levels (Model Tiers)
Users can select the intelligence tier for cost vs quality tradeoff.

| Level | Model | Quota Cost | Use Case |
|-------|-------|------------|----------|
| **Standard** | gemini-2.0-flash | 1x | Fast, routine tasks |
| **Advanced** | gemini-2.5-flash | 2x | Balanced performance |
| **Expert** | gemini-2.5-pro | 5x | Complex reasoning |
| **Genius** | gemini-2.5-pro-extended | 10x | Maximum capacity |

### Selection Method
```typescript
type IntelligenceLevel = 'standard' | 'advanced' | 'expert' | 'genius';

// Per-agent or per-request
await runAgent({ 
  agentId: 'ezal',
  prompt: '...',
  intelligenceLevel: 'expert'
});
```

---

## 11. Execution Transparency ("Worked for Xs")
Every agent execution exposes a step-by-step trace.

### Interface
```typescript
interface ExecutionStep {
  step: number;
  action: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  durationMs?: number;
  result?: string;
}

interface ExecutionTrace {
  agentId: string;
  startedAt: Date;
  totalDurationMs: number;
  steps: ExecutionStep[];
}
```

### UI Pattern
```
⏳ **Working... (12s)**

Step 1: Connect to competitor API ✅
Step 2: Fetch current prices ✅
Step 3: Compare to baseline ⏳
Step 4: Generate alert ⏱️
Step 5: Send notification ⏱️

[Expand to see details]
```

---

## 12. Global Connections Hub
Centralized management of all integrations in Settings.

| Category | Services |
|----------|----------|
| **Google Workspace** | Gmail, Drive, Calendar, Analytics |
| **Communication** | Slack, SMS (Twilio) |
| **POS** | Dutchie, Flowhub, Jane |
| **CRM** | SpringBig, AlpineIQ |
| **Wholesale** | LeafLink |
| **Payments** | Stripe, Authorize.net |

### Connection States
```typescript
interface Connection {
  id: string;
  service: string;
  status: 'connected' | 'disconnected' | 'expired' | 'error';
  lastSynced?: Date;
  usedByAgents: string[];   // Which agents use this
  scope: string[];          // Permissions granted
}
```

---

## 13. Natural Language Triggers
Users can set up automation triggers via natural language.

| User Says | System Creates |
|-----------|----------------|
| "Run this every Monday at 9am" | Cron: `0 9 * * 1` |
| "Alert me when stock drops below 10" | Event trigger on inventory change |
| "Check competitors daily at 3pm" | Scheduled scan |
| "Send report every Friday" | Weekly automation |

### Implementation
```typescript
function parseNaturalLanguageTrigger(input: string): PlaybookTrigger {
  // Use AI to extract schedule or event trigger
  return {
    type: 'schedule' | 'event',
    schedule?: string,   // ISO or cron
    eventName?: string,  // 'inventory.low', 'competitor.priceChange'
    threshold?: number,  // For numeric triggers
  };
}
```

---

## 14. Response Feedback Loop
Every agent response includes feedback buttons to improve over time.

### UI Pattern
```
[Agent Response Content]

**Was this response helpful?**
👍 Good  |  👎 Could be better  |  💬 Comment

[Set up a recurring trigger]
```

### Data Collected
```typescript
interface ResponseFeedback {
  messageId: string;
  responseId: string;
  agentId: string;
  rating: 'positive' | 'negative';
  comment?: string;
  timestamp: Date;
  userId: string;
}
```

---

## 15. Service Icons on Agent Cards
Display integration icons on agent/playbook cards for at-a-glance understanding.

### Agent Definition Extension
```typescript
interface AgentCapability {
  // ... existing fields
  integrations?: string[];  // ['gmail', 'slack', 'sheets']
}
```

### Rendering
Each agent card shows small icons for connected services:
- 📧 Gmail
- 📊 Sheets
- 💬 Slack
- 📅 Calendar
- 🛒 POS
- 📦 LeafLink

---
