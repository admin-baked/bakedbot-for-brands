# Agents Reference

## Overview
BakedBot operates with a multi-agent architecture where specialized agents handle different domains. Agents communicate via the Letta Memory system (Hive Mind) and are orchestrated by the Executive Boardroom.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    EXECUTIVE BOARDROOM                          │
│              (Super Users Only - Level 5 Autonomy)              │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │   Leo   │ │  Jack   │ │  Linus  │ │ Glenda  │ │  Mike   │  │
│  │   COO   │ │   CRO   │ │   CTO   │ │   CMO   │ │   CFO   │  │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘  │
└───────┼──────────┼─────────┼─────────┼─────────┼───────────────┘
        │          │         │         │         │
        ▼          ▼         ▼         ▼         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SUPPORT STAFF                              │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │ Smokey  │ │  Craig  │ │  Pops   │ │  Ezal   │ │  Money  │  │
│  │Budtender│ │Marketer │ │ Analyst │ │ Lookout │ │  Mike   │  │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │   Mrs   │ │  Deebo  │ │ Day Day │ │ Felisha │ │BigWorm  │  │
│  │ Parker  │ │Enforcer │ │ Growth  │ │   Ops   │ │Research │  │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Executive Boardroom

### Leo - COO (Operations Orchestrator)
**File**: `src/server/agents/leo.ts`

| Attribute | Value |
|-----------|-------|
| **Role** | Chief Operations Officer |
| **Domain** | Operations, delegation, scheduling |
| **Access** | Super Users Only |
| **Protocol** | Operations Heartbeat (Hourly) |

**Capabilities:**
- Directs entire operational fleet
- Schedules and coordinates agent tasks
- Monitors system health

---

### Jack - CRO (Chief Revenue Officer)
**File**: `src/server/agents/jack.ts`

| Attribute | Value |
|-----------|-------|
| **Role** | Chief Revenue Officer |
| **Domain** | Revenue, sales, CRM |
| **Access** | Super Users Only |
| **Protocol** | Revenue Pulse (Daily) |

**Capabilities:**
- CRM and deal management
- Revenue metrics tracking
- Sales pipeline analysis
- Directs Mrs. Parker for loyalty

---

### Linus - CTO (Chief Technology Officer)
**File**: `src/server/agents/linus.ts`

| Attribute | Value |
|-----------|-------|
| **Role** | Chief Technology Officer |
| **Domain** | Code evaluation, bug hunting |
| **Access** | Super Users Only |
| **Protocol** | Zero Bug Tolerance (Hourly) |
| **AI Provider** | Claude (Anthropic SDK) |

**Tools:**
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

### Glenda - CMO (Chief Marketing Officer)
**File**: `src/server/agents/glenda.ts`

| Attribute | Value |
|-----------|-------|
| **Role** | Chief Marketing Officer |
| **Domain** | Marketing, brand, content |
| **Access** | Super Users Only |
| **Protocol** | Brand Watch (Daily) |

**Capabilities:**
- Content strategy and campaigns
- SEO and analytics
- Social media coordination
- Directs Craig and Day Day

---

### Mike - CFO (Chief Financial Officer)
**File**: `src/server/agents/mike.ts`

| Attribute | Value |
|-----------|-------|
| **Role** | Chief Financial Officer |
| **Domain** | Finance, billing, pricing |
| **Access** | Super Users Only |

**Capabilities:**
- Pricing and margin analysis
- Authorize.net integration
- Financial reporting

---

## Support Staff

### Smokey - Budtender
**File**: `src/server/agents/smokey.ts`

| Attribute | Value |
|-----------|-------|
| **Role** | Product Specialist |
| **Domain** | Product search, recommendations |
| **Access** | All users |

**Capabilities:**
- Cannabis product recommendations
- Menu search and filtering
- Customer preference matching

**MVP Playbook Participation:**
- Review Response Autopilot
- Low Stock Alert

---

### Craig - Marketer
**File**: `src/server/agents/craig.ts`

| Attribute | Value |
|-----------|-------|
| **Role** | Marketing Automation |
| **Domain** | Campaigns, lifecycle marketing |
| **Access** | Brand users |

**Integrations:**
| Service | Purpose |
|---------|---------|
| Blackleaf | Default SMS provider |
| Mailjet | Default Email provider |
| Ayrshare | Social media posting |

**MVP Playbook Participation:**
- Win-Back Campaign

---

### Pops - Analyst
**File**: `src/server/agents/pops.ts`

| Attribute | Value |
|-----------|-------|
| **Role** | Data Analyst |
| **Domain** | Revenue, funnel analysis |
| **Access** | Brand users |

**MVP Playbook Participation:**
- Weekly Top Sellers Report
- Low Stock Alert

---

### Ezal - Lookout
**File**: `src/server/agents/ezal.ts`

| Attribute | Value |
|-----------|-------|
| **Role** | Competitive Intelligence |
| **Domain** | Market intel, competitor monitoring |
| **Access** | Brand users |

**Integrations:**
| Service | Purpose |
|---------|---------|
| Headset | Market trends |
| CannMenus | Live pricing data |
| Firecrawl | Web scraping |

**MVP Playbook Participation:**
- Competitor Price Match Alert

---

### Money Mike - Banker
**File**: `src/server/agents/moneyMike.ts`

| Attribute | Value |
|-----------|-------|
| **Role** | Pricing Specialist |
| **Domain** | Pricing, margins |
| **Access** | Brand users |

**MVP Playbook Participation:**
- Competitor Price Match Alert
- Weekly Top Sellers Report

---

### Mrs. Parker - Hostess
**File**: `src/server/agents/mrsParker.ts`

| Attribute | Value |
|-----------|-------|
| **Role** | Loyalty & VIP Manager |
| **Domain** | Customer loyalty, VIP treatment |
| **Access** | Brand users |

**Integrations:**
| Service | Purpose |
|---------|---------|
| Alpine IQ | Loyalty logic |

**MVP Playbook Participation:**
- Win-Back Campaign

---

### Deebo - Enforcer
**File**: `src/server/agents/deebo.ts`

| Attribute | Value |
|-----------|-------|
| **Role** | Compliance Officer |
| **Domain** | Regulations, licensing |
| **Access** | Brand users |

**Integrations:**
| Service | Purpose |
|---------|---------|
| Green Check | Licensing data |

**MVP Playbook Participation:**
- Review Response Autopilot

---

### Day Day - Growth
**File**: `src/server/agents/dayday.ts`

| Attribute | Value |
|-----------|-------|
| **Role** | Growth Hacker |
| **Domain** | SEO, traffic |
| **Access** | Brand users |

**Tools:**
| Tool | Purpose |
|------|---------|
| `seo_audit` | PageSpeed analysis |
| `chk_rank` | SEO ranking factors |

---

### Felisha - Ops
**File**: `src/server/agents/felisha.ts`

| Attribute | Value |
|-----------|-------|
| **Role** | Operations Coordinator |
| **Domain** | Scheduling, triage |
| **Access** | Brand users |

**Integrations:**
| Service | Purpose |
|---------|---------|
| Cal.com | Meeting scheduling |

---

### Big Worm - Researcher
**File**: `src/server/agents/bigworm.ts`

| Attribute | Value |
|-----------|-------|
| **Role** | Deep Researcher |
| **Domain** | Research, intel gathering |
| **Access** | Brand users |

**Tools:**
| Tool | Purpose |
|------|---------|
| `archival_insert` | Knowledge graph storage |
| `archival_search` | Semantic memory search |
| `research_deep` | Deep web research |

---

## "Always On" Architecture

Agents operate on a **Pulse** (Proactive) and **Interrupt** (Reactive) model.

### The Pulse (Proactive)
- **Mechanism**: GitHub Actions (`.github/workflows/pulse.yaml`) triggers `/api/cron/tick` every 10 minutes
- **Active Protocols**:
  | Agent | Protocol | Frequency |
  |-------|----------|-----------|
  | Linus | Zero Bug Tolerance | Hourly |
  | Leo | Operations Heartbeat | Hourly |
  | Jack | Revenue Pulse | Daily |
  | Glenda | Brand Watch | Daily |

### The Interrupt (Reactive)
- **Mechanism**: Webhook Receiver (`/api/webhooks/error-report`)
- **Trigger**: Critical errors or external alerts
- **Action**: Wakes up Linus immediately with `source: 'interrupt'`

---

## Shared Tools Architecture

All agents have access to standardized tools via the shared tools system:

| File | Purpose |
|------|---------|
| `src/server/agents/shared-tools.ts` | Tool definitions (Zod schemas) |
| `src/server/agents/tool-executor.ts` | Bridges definitions to Genkit |
| `src/server/tools/context-tools.ts` | Context OS implementations |
| `src/server/tools/letta-memory.ts` | Letta Memory implementations |
| `src/server/tools/intuition-tools.ts` | Intuition OS implementations |

### Tool Categories
| Category | Tools | Description |
|----------|-------|-------------|
| **Context OS** | `contextLogDecision`, `contextAskWhy`, `contextGetAgentHistory` | Decision lineage |
| **Letta Memory** | `lettaSaveFact`, `lettaAsk`, `lettaSearchMemory`, `lettaMessageAgent` | Persistent memory |
| **Intuition OS** | `intuitionEvaluateHeuristics`, `intuitionGetConfidence`, `intuitionLogOutcome` | System 1/2 routing |

### Usage in Agents
```typescript
import { contextOsToolDefs, lettaToolDefs, intuitionOsToolDefs } from './shared-tools';

// In act() method:
const toolsDef = [...agentSpecificTools, ...contextOsToolDefs, ...lettaToolDefs, ...intuitionOsToolDefs];
```

---

## MVP Playbooks (Smokey Recommends)

| # | Playbook | Agents | Trigger | Permissions |
|---|----------|--------|---------|-------------|
| 1 | Competitor Price Match Alert | Ezal, Money Mike | Daily | None (Firecrawl) |
| 2 | Review Response Autopilot | Smokey, Deebo | Event | Google Business |
| 3 | Win-Back Campaign | Mrs. Parker, Craig | Weekly | CRM, Email |
| 4 | Weekly Top Sellers Report | Pops, Money Mike | Weekly | POS, Email |
| 5 | Low Stock Alert | Pops, Smokey | Hourly | POS Integration |

---

## Key Files

| File | Purpose |
|------|---------|
| `src/server/agents/agent-definitions.ts` | Agent metadata and configs |
| `src/server/agents/agent-runner.ts` | Agent execution engine |
| `src/server/agents/agent-router.ts` | Request routing |
| `src/server/agents/harness.ts` | Agent harness framework |
| `src/server/agents/schemas.ts` | Zod schemas |
| `src/server/agents/executive.ts` | Executive agent base |
| `src/server/agents/persistence.ts` | Agent state persistence |
| `src/server/agents/validation-hooks.ts` | Pre/post validation |

---

## Testing

| Test File | Coverage |
|-----------|----------|
| `tests/server/agents/executive-agents.test.ts` | Executive agents |
| `tests/server/agents/support-agents.test.ts` | Support agents |
| `tests/server/agents/agent-definitions.test.ts` | Definitions |

```bash
# Run all agent tests
npm test -- --testPathPattern="agents"
```

---

## Related Documentation
- `refs/tools.md` — Agent tools
- `refs/bakedbot-intelligence.md` — Letta memory (Hive Mind)
- `refs/workflows.md` — Playbooks
- `refs/super-users.md` — Executive Boardroom access
