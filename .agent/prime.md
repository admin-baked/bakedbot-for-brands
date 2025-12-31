# BakedBot AI Builder Agent - Prime Context

**Loaded automatically on agent startup**

> "We're not just building agents. We're building agents that build themselves. That's the future of retail—and it starts with cannabis."

---

## 🏥 Codebase Health Status (Live)
| Metric | Status | Last Verified | Notes |
|--------|--------|---------------|-------|
| **Build** | 🟢 Passing | 2025-12-31 | `npm run check:types` passing locally. |
| **Tests** | 🟡 Partial | 2025-12-31 | Core logic passing. JSDOM async issues skipping some UI integration tests. |
| **Deploy** | 🟢 Stable | 2025-12-31 | Production successfully deployed via `git push`. |

### Critical Watchlist
- **Firestore**: `ignoreUndefinedProperties: true` enabled globally (watch for silent data loss).
- **Mobile UI**: Homepage hero fixed, check other pages on mobile.
- **Deep Research**: Polling hook stable, check for long-running task timeouts.

---

## 🌟 Strategic North Star: Autonomous Cannabis Commerce
**Target (Q4 2026):**
- Every agent runs on 50+ versioned, battle-tested tools.
- Tools improve via feedback loops (learning agents).
- **Core Metric**: Speed of learning = durability of moat.

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
| **Ezal** | Lookout | Competitive Intel | Web Scrapers (Firecrawl/Apify), Price Monitoring (needs sentiment analysis) |
| **Money Mike** | Banker | Pricing & Margins | Elasticity Models, Billing, ROI Calc (needs forecast integration) |
| **Mrs. Parker** | Hostess | Loyalty & VIP | Segmentation (needs ML clustering), Win-back flows |
| **Deebo** | Enforcer | Compliance & Regs | CTIA/State Rule Engine (needs proactive risk scoring) |

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
- **Scrapers**: Free users = basic; Paid users = Firecrawl/BakedBot Discovery.

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
