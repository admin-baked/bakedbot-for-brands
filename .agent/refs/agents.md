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
| **Domain** | Code evaluation, bug hunting, automated fixes |
| **Access** | Super Users Only |
| **Protocol** | Zero Bug Tolerance (Hourly) |
| **AI Provider** | Claude (Anthropic SDK) |
| **API Endpoint** | `POST /api/linus/fix` |

**Core Tools:**
| Tool | Description |
|------|-------------|
| `search_codebase` | Ripgrep pattern search across files |
| `find_files` | Glob-based file discovery |
| `git_log` / `git_diff` / `git_blame` | Git history and changes |
| `analyze_stack_trace` | Parse errors, extract file locations |
| `read_file` / `write_file` | File operations |
| `run_command` | Execute shell commands (simple) |
| `bash` | Full bash with pipes, env vars, background tasks (Claude Code style) |
| `archive_work` | Document decisions to work archive |
| `query_work_history` | Query past work before changes |

**Testing Tools (KushoAI):**
| Tool | Description |
|------|-------------|
| `kusho_generate_tests` | Auto-generate API tests from OpenAPI |
| `kusho_run_suite` | Run KushoAI test suites |
| `kusho_record_ui` | Record UI for test generation |
| `kusho_analyze_coverage` | Check API test coverage |
| `run_specific_test` | Run targeted Jest tests |

**Browser Testing (Chrome Extension):**
| Tool | Description |
|------|-------------|
| `extension_create_session` | Start browser test session |
| `extension_navigate` | Navigate to URL |
| `extension_click` | Click elements |
| `extension_type` | Type into inputs |
| `extension_screenshot` | Capture screenshots |
| `extension_get_console` | Check for JS errors |
| `extension_run_workflow` | Run saved workflows |
| `run_e2e_test` | Run Playwright tests |
| `generate_playwright_test` | Generate test from scenario |

**BakedBot Discovery (RTRVR):**
| Tool | Description |
|------|-------------|
| `discovery_browser_automate` | Execute browser tasks with natural language |
| `discovery_summarize_page` | Get bullet-point summary of any webpage |
| `discovery_extract_data` | Extract structured data from pages |
| `discovery_fill_form` | Automate form filling and submission |

**Firecrawl (Web Scraping):**
| Tool | Description |
|------|-------------|
| `firecrawl_scrape` | Get markdown/HTML content from any URL |
| `firecrawl_search` | Search the web via Firecrawl |
| `firecrawl_map_site` | Crawl and map all pages on a site |

**Web Search (Serper/Google):**
| Tool | Description |
|------|-------------|
| `web_search` | Google search via Serper API |
| `web_search_places` | Find local businesses/dispensaries |

**Linus Fix API (`/api/linus/fix`):**
Trigger Linus to investigate and optionally fix issues:
```typescript
POST /api/linus/fix
{
  type: 'ticket' | 'test_failure' | 'health_check' | 'browser_test' | 'code_review',
  ticketId?: string,
  errorStack?: string,
  testFile?: string,
  testUrl?: string,
  autoFix?: boolean,      // Enable auto-fix mode
  useExtension?: boolean  // Use Chrome Extension for testing
}
```

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
| **Role** | Product Specialist & Front Desk Greeter |
| **Domain** | Product search, recommendations, upselling |
| **Access** | All users |

**Capabilities:**
- Cannabis product recommendations with algorithmic scoring
- Menu search and filtering via `searchMenu` tool
- Customer preference matching (effects, tolerance, price)
- **Smart upselling** via `suggestUpsells` tool (cannabis science pairing)
- Delegation routing to specialist agents
- UX experiment management (A/B testing)

**Upsell Tool:**
- `suggestUpsells(productId, orgId)` - Complementary product suggestions
- Terpene entourage effect reasoning + value-focused framing
- ONE upsell per exchange, respects "no thanks"

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
| **Role** | Pricing Strategist & Financial Analyst |
| **Domain** | Pricing, margins, profitability, 280E tax compliance |
| **Access** | Brand and Dispensary users |

**Core Principles:**
1. **Protect the Bag**: Never authorize prices that kill margins
2. **Hidden Money**: Find opportunities others miss (vendor negotiations, COGS optimization)
3. **Unit Economics**: Growth is vanity, profit is sanity
4. **280E Compliance**: Cannabis businesses face 70-90% effective tax rates - only COGS is deductible
5. **Price Compression Awareness**: GTI Rule - if prices drop X%, volume must increase X/(1-X)

**Profitability Tools (2026-02-11):**
- `analyze280ETax` - Calculate 280E tax liability, COGS breakdown, cash vs paper profit, optimization suggestions
- `calculateNYCannabsTax` - NY potency tax ($0.005-$0.03/mg THC) + 13% sales tax analysis
- `getProfitabilityMetrics` - Gross margin, benchmarks (revenue/sqft, inventory turnover), category performance
- `analyzePriceCompression` - GTI Rule scenarios for market price drops
- `analyzeWorkingCapital` - Liquidity analysis, runway months, banking fees assessment

**MVP Playbook Participation:**
- Competitor Price Match Alert
- Weekly Top Sellers Report

**Related Files:**
- `src/server/tools/profitability-tools.ts` - Agent tools for cannabis tax & profitability
- `src/server/services/cannabis-tax.ts` - Tax calculation engine
- `src/server/actions/profitability.ts` - Server actions for profitability dashboard

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
