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
| **Build** | 🟢 Passing | 2026-01-17 |
| **Tests** | 🟢 Passing | 2026-01-17 |
| **Deploy** | 🟢 Stable | 2026-01-17 |

- **Logging**: **STRICTLY** use `logger` from `@/lib/logger`. `console.log` is deprecated.
- **Type Safety**: Prefer `unknown` over `any`. Use `scripts/fix-as-any-types.js` for remediation.
- **Firestore**: `ignoreUndefinedProperties: true` enabled
- **Dispensary Console**: Live data, `retailerId` scoping
- **Linus**: Now reads `CLAUDE.md` for codebase context

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

## 🕵️ Agent Squad

| Agent | Role | Domain |
|-------|------|--------|
| **Smokey** | Budtender | Product Search & Recs |
| **Craig** | Marketer | Campaigns & Lifecycle |
| **Pops** | Analyst | Revenue & Funnel |
| **Ezal** | Lookout | Competitive Intel |
| **Money Mike** | Banker | Pricing & Margins |
| **Mrs. Parker** | Hostess | Loyalty & VIP |
| **Deebo** | Enforcer | Compliance & Regs |
| **Leo** | COO | Operations Orchestrator |
| **Jack** | CRO | Revenue Growth |
| **Linus** | CTO | Code Eval, Claude API |
| **Glenda** | CMO | Marketing & Funnel |
| **Mike** | CFO | Finance & Billing |
| **Day Day** | Growth | SEO & Traffic |
| **Felisha** | Ops | Scheduling & HR |
| **Roach** | Librarian | Research & Compliance |

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
