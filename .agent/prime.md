# BakedBot AI Builder Agent - Prime Context

**Loaded automatically on agent startup**

> "We're not just building agents. We're building agents that build themselves."

---

## 🧭 Agent Philosophy

> [!IMPORTANT]
> **Core Principles — Follow These Always**

### 1. Thoroughness Over Speed
- **Never rush when tokens are low** — complete tasks in phases
- It is ALWAYS acceptable to break work into multiple sessions
- Quality context = quality output

### 2. Simplicity First
- **Take the simplest approach** — avoid over-engineering
- If a solution fits in one file, don't split it
- Direct code > clever abstractions
- Fix first, refactor later (if ever)

### 3. Explore Before Acting
- **Never assume file contents** — always read first
- Follow the 4-Step Exploration Sequence (below)
- Document patterns before implementing

---

## 🏥 Codebase Health Status

| Metric | Status | Last Verified |
|--------|--------|---------------|
| **Build** | 🟢 Passing | 2026-01-19 |
| **Tests** | 🟢 45+ Agent Tests Passing | 2026-01-19 |
| **Deploy** | 🟢 Stable | 2026-01-19 |

- **Logging**: **STRICTLY** use `logger` from `@/lib/logger`. `console.log` is deprecated.
- **Type Safety**: Prefer `unknown` over `any`. Use `scripts/fix-as-any-types.js` for remediation.
- **Firestore**: `ignoreUndefinedProperties: true` enabled
- **Dispensary Console**: Live data, `retailerId` scoping
- **Linus**: Enhanced CTO with bug hunting tools + KushoAI integration
- **KushoAI CLI**: Installed and configured for API/UI test generation

### 🗺️ Codebase Map
| Domain | Services Path | Tool Wrappers |
|--------|---------------|---------------|
| **Agents** | `src/server/agents/` | `src/server/tools/` |
| **Integrations** | `src/server/services/` | `src/server/tools/` |
| **Prompts** | `dev/prompt-catalog-*.ts` | N/A |
| **Notifications** | `src/lib/notifications/` | N/A |

### 🔌 Integration Matrix
| Service | Primary Agent | Key File | Notes |
|---------|---------------|----------|-------|
| **Alpine IQ** | Mrs. Parker/Craig | `alpine-iq.ts` | Loyalty Logic |
| **Blackleaf** | Craig | `blackleaf-service.ts` | **Default SMS** |
| **Mailjet** | Craig | `mailjet-service.ts` | **Default Email** |
| **Headset** | Ezal | `headset.ts` | Market Trends |
| **CannMenus** | Ezal | `cannmenus.ts` | Live Pricing |
| **Green Check** | Deebo | `green-check.ts` | Licensing Data |
| **Authorize.net** | Money Mike | `authorize-net.ts` | **Payments & Subs** |

### 🧪 KushoAI Integration (API & UI Testing)
| Mode | Command | Purpose |
|------|---------|---------|
| **CLI Record** | `kusho record --url <url>` | Record UI interactions as Playwright tests |
| **CLI Extend** | `kusho extend <test.ts>` | AI-generate test variations |
| **Docker Run** | See below | Run test suites in CI/CD |

```bash
# Docker Test Runner (CI/CD)
docker run -e BASE_URL=https://be.kusho.ai \
  -e ENVIRONMENT_ID=<your-id> \
  -e API_KEY=<your-key> \
  -e TEST_SUITE_UUID=<suite-id> \
  public.ecr.aws/y5g4u6y7/kusho-test-runner:latest
```

**Credentials**: martez@bakedbot.ai (configured in CLI)
**Docs**: [KushoAI CI/CD](https://docs.kusho.ai/16-ci-cd/)

### 🎯 Smokey Recommends: MVP Playbooks (Dispensaries)
| # | Playbook | Agents | Trigger | Permissions |
|---|----------|--------|---------|-------------|
| 1 | 🚨 Competitor Price Match Alert | Ezal, Money Mike | Daily | None (Firecrawl) |
| 2 | ⭐ Review Response Autopilot | Smokey, Deebo | Event | Google Business |
| 3 | 🔄 Win-Back Campaign | Mrs. Parker, Craig | Weekly | CRM, Email |
| 4 | 🏆 Weekly Top Sellers Report | Pops, Money Mike | Weekly | POS, Email |
| 5 | 📦 Low Stock Alert | Pops, Smokey | Hourly | POS Integration |

---

## 📚 Reference Index

For detailed documentation, see `.agent/refs/`:

| Topic | File | Description |
|-------|------|-------------|
| **🧠 BakedBot Intelligence** | `refs/bakedbot-intelligence.md` | Letta memory, Hive Mind, archival |
| **🔍 BakedBot Discovery** | `refs/bakedbot-discovery.md` | Web search, Firecrawl, RTRVR |
| **🌐 Autonomous Browsing** | `refs/autonomous-browsing.md` | BakedBot AI in Chrome, workflows, scheduling |
| **🤖 Agentic Coding** | `refs/agentic-coding.md` | Best practices, evals, workflows |
| **API** | `refs/api.md` | Routes, endpoints, patterns |
| **Backend** | `refs/backend.md` | Services, server actions, Firebase |
| **Frontend** | `refs/frontend.md` | Components, ShadCN, layouts |
| **Auth** | `refs/authentication.md` | Firebase Auth, session, roles |
| **Onboarding** | `refs/onboarding.md` | Claim flow, setup wizard |
| **Testing** | `refs/testing.md` | Jest, Playwright patterns |
| **Super Users** | `refs/super-users.md` | Owner protocol, permissions |
| **Roles** | `refs/roles.md` | RBAC hierarchy |
| **Dispensary** | `refs/pages-dispensary.md` | Console pages |
| **Brand** | `refs/pages-brand.md` | Dashboard pages |
| **Location** | `refs/pages-location.md` | Discovery layer |
| **Tools** | `refs/tools.md` | Agent tools, Genkit |
| **Workflows** | `refs/workflows.md` | Playbooks, automation |
| **Work Archive** | `refs/work-archive.md` | Historical context, artifacts |
| **Context OS** | `refs/context-os.md` | Decision lineage |
| **Intuition OS** | `refs/intuition-os.md` | Proactive intelligence |
| **Intention OS** | `refs/intention-os.md` | Intent parsing |
| **Business Plan** | `dev/business_plan.md` | Strategic vision and operational model |

---

## 🔬 RAG Infrastructure Roadmap

### Current State (2026-01)
| Component | Implementation | Status |
|-----------|---------------|--------|
| **Vector Storage** | Firestore native `FieldValue.vector()` | ✅ Active |
| **Search** | Client-side cosine similarity (fetch 100 → rank) | ⚠️ 100-doc ceiling |
| **Chunking** | Semantic (product/section/sentence) | ✅ Phase 1 Complete |
| **Reranking** | Vertex AI Ranking API + keyword fallback | ✅ Phase 1 Complete |
| **Contextual Headers** | `[State | City | Category]` at index time | ✅ Phase 2 Complete |

### Upgrade Triggers
| Signal | Threshold | Action |
|--------|-----------|--------|
| Tenant indexed docs | >500 docs | Enable Firestore Vector Search Extension |
| Concurrent users | >50 simultaneous | Monitor latency, consider scale |
| Response time | >3 seconds avg | Investigate retrieval bottleneck |
| Monthly MRR | $50k+ | Upgrade to dedicated vector infrastructure |

### Migration Path
1. **Now → $50k MRR**: Current implementation (reranker gives quality wins)
2. **$50k → $100k MRR**: Enable **Firestore Vector Search Extension** (ANN)
3. **$100k+ MRR**: Migrate to **Vertex AI Vector Search** (billions scale)

### Key Files
| File | Purpose |
|------|---------|
| `src/server/services/vector-search/chunking-service.ts` | Semantic chunking strategies |
| `src/server/services/vector-search/reranker-service.ts` | Vertex AI reranking |
| `src/server/services/vector-search/rag-service.ts` | RAG pipeline orchestration |
| `src/server/services/vector-search/firestore-vector.ts` | Vector storage & search |

---

## ⚡ "Always On" Architecture (Pulse & Interrupt)
Agents are no longer passive. They operate on a Pulse (Proactive) and Interrupt (Reactive) model.

### 1. The Pulse (Proactive)
*   **Mechanism**: GitHub Actions (`.github/workflows/pulse.yaml`) triggers `/api/cron/tick` every 10 minutes.
*   **Active Protocols**:
    *   **Linus**: `Protocol: Zero Bug Tolerance` (Hourly) - Checks code, tickets, builds.
    *   **Leo**: `Protocol: Operations Heartbeat` (Hourly) - Checks system health.
    *   **Jack**: `Protocol: Revenue Pulse` (Daily) - Checks MRR/Pipeline.
    *   **Glenda**: `Protocol: Brand Watch` (Daily) - Checks Traffic/Socials.

### 2. The Interrupt (Reactive)
*   **Mechanism**: Webhook Receiver (`/api/webhooks/error-report`).
*   **Trigger**: Critical errors or external alerts.
*   **Action**: Wakes up Linus immediately with `source: 'interrupt'`.

---

## 🕵️ Agent Squad

### Executive Boardroom (Super Users Only)
| Agent | Role | Domain | Key Tools |
|-------|------|--------|-----------|
| **Leo** | COO | Operations Orchestrator | Delegation, scheduling |
| **Jack** | CRO | Revenue & Sales | CRM, deal management, revenue metrics |
| **Linus** | CTO | Code Eval & Bug Hunting | Git, search, KushoAI, file ops |
| **Glenda** | CMO | Marketing & Brand | Content, campaigns, SEO, analytics |
| **Mike** | CFO | Finance & Billing | Pricing, margins, Authorize.net |

### Support Staff
| Agent | Role | Domain |
|-------|------|--------|
| **Smokey** | Budtender | Product Search & Recs |
| **Craig** | Marketer | Campaigns & Lifecycle |
| **Pops** | Analyst | Revenue & Funnel |
| **Ezal** | Lookout | Competitive Intel |
| **Money Mike** | Banker | Pricing & Margins |
| **Mrs. Parker** | Hostess | Loyalty & VIP |
| **Deebo** | Enforcer | Compliance & Regs |
| **Day Day** | Growth | SEO & Traffic |
| **Felisha** | Ops | Scheduling & Triage |
| **Big Worm** | Researcher | Deep Research & Intel |

### Linus CTO Tools
| Tool | Description |
|------|-------------|
| `search_codebase` | Ripgrep pattern search across files |
| `find_files` | Glob-based file discovery |
| `git_log` / `git_diff` / `git_blame` | Git history and changes |
| `analyze_stack_trace` | Parse errors, extract file locations |
| `run_specific_test` | Run targeted Jest tests |
| `kusho_generate_tests` | KushoAI API test generation |
| `kusho_record_ui` | KushoAI UI recording sessions |
| `read_file` / `write_file` | File operations |
| `run_build` / `run_tests` | Build and test execution |
| `archive_work` | Document decisions to work archive |

---

## 📋 Critical Protocols

```bash
# Verify state before change
git pull origin main --rebase
npm run check:types  # Verify build is healthy
```

### Structured Logging Protocol
- **REQUIRED**: All logs must use the structured `logger` utility.
- **FORBIDDEN**: `console.log`, `console.warn`, `console.error` are banned from production routes.
- **MIGRATION**: Use `node scripts/migrate-console-to-logger.js [dir]` to clean up legacy logs.


> **If build is failing**: Fix build errors FIRST before proceeding with new work.
> Run `npm run check:types` and resolve any errors before making changes.

### 4-Step Exploration Sequence
1. **Directory Tree** — `list_dir` on relevant directories
2. **Related Files** — `find_by_name`, `grep_search` for patterns
3. **Deep Read** — `view_file` each relevant file (NEVER assume)
4. **Pattern Summary** — Document patterns before implementing

### Fix → Test → Archive → Ship Loop
1. **Query history** — `query_work_history` before changing files
2. **Make change** — Implement with context from past work
3. **Run test** (`npm test -- <file>.test.ts`)
4. If fail → analyze + retry (max 3x)
5. If pass → update backlog + commit
6. **Archive work** — Use `archive_work` or add to `dev/work_archive/`
7. Log progress in `dev/progress_log.md` with artifact reference

## ⚡ Development Environment

- **Shell**: PowerShell (v5+) is the REQUIRED default shell for all commands.
- **Commands**: Use `;` for chaining, not `&&`.

---

## 🚀 Deployment

**Uses `git push` ONLY.** Do not use `firebase deploy` for the Next.js app.

```bash
git push origin main
```

### Post-Push Build Verification
1. Wait 2-3 minutes for Firebase App Hosting build
2. Check build status in Firebase Console or GitHub Actions
3. **If build fails**: Fix immediately and push again
4. Do NOT leave builds in failed state

---

## 🎯 Quick Links

| Purpose | Path |
|---------|------|
| Task Backlog | `dev/backlog.json` |
| Test Commands | `dev/test_matrix.json` |
| Progress Log | `dev/progress_log.md` |
| **Work Archive** | `dev/work_archive/` |
| Swarm Rules | `dev/SWARM_RULES.md` |
| CLAUDE.md | `CLAUDE.md` (root) |
| Orchestrator | `.agent/orchestrator.md` |
| Workflows | `.agent/workflows/` |
| Skills | `.agent/skills/` |

### Key Agent Files
| Agent | Implementation | Tests |
|-------|---------------|-------|
| **Linus (CTO)** | `src/server/agents/linus.ts` | N/A (Claude API) |
| **Jack (CRO)** | `src/server/agents/jack.ts` | `tests/server/agents/executive-agents.test.ts` |
| **Glenda (CMO)** | `src/server/agents/glenda.ts` | `tests/server/agents/executive-agents.test.ts` |
| **Agent Runner** | `src/server/agents/agent-runner.ts` | — |
| **Agent Definitions** | `src/server/agents/agent-definitions.ts` | `tests/server/agents/agent-definitions.test.ts` |
| **Support Agents** | `src/server/agents/*.ts` | `tests/server/agents/support-agents.test.ts` |

### Shared Agent Tools Architecture
All agents have access to standardized tools via the shared tools system:

| File | Purpose |
|------|---------|
| `src/server/agents/shared-tools.ts` | Tool definitions (Zod schemas) for all shared tools |
| `src/server/agents/tool-executor.ts` | Bridges definitions to Genkit implementations |
| `src/server/tools/context-tools.ts` | Context OS tool implementations |
| `src/server/tools/letta-memory.ts` | Letta Memory tool implementations |
| `src/server/tools/intuition-tools.ts` | Intuition OS tool implementations |

**Tool Categories:**
| Category | Tools | Description |
|----------|-------|-------------|
| **Context OS** | `contextLogDecision`, `contextAskWhy`, `contextGetAgentHistory` | Decision lineage and reasoning |
| **Letta Memory** | `lettaSaveFact`, `lettaAsk`, `lettaSearchMemory`, `lettaMessageAgent` | Persistent memory and inter-agent comms |
| **Intuition OS** | `intuitionEvaluateHeuristics`, `intuitionGetConfidence`, `intuitionLogOutcome` | System 1/2 routing and feedback |

**Usage in Agents:**
```typescript
import { contextOsToolDefs, lettaToolDefs, intuitionOsToolDefs } from './shared-tools';

// In act() method:
const toolsDef = [...agentSpecificTools, ...contextOsToolDefs, ...lettaToolDefs, ...intuitionOsToolDefs];
```

---

## 🛠️ Available Commands

| Command | Description |
|---------|-------------|
| `/fix <task_id>` | Auto-diagnose and fix failing test |
| `/review` | Validate all changes before commit |
| `/types` | Run `npm run check:types` |
| `/deploy` | Execute deployment workflow |
| `/backlog` | Manage task backlog |

---

*For detailed documentation on any topic, navigate to the appropriate reference file in `.agent/refs/`.*
