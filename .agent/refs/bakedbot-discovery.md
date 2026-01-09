# BakedBot Discovery Reference

## Overview
**BakedBot Discovery** is our unified system for finding, extracting, and monitoring web data. It powers competitive intelligence, market research, and automated data collection.

---

## Core Capabilities

| Capability | Description | Primary Tool |
|------------|-------------|--------------|
| **Web Search** | Find information across the web | Serper API |
| **Page Scraping** | Extract structured data from pages | Firecrawl |
| **Browser Automation** | Navigate, click, fill forms | RTRVR |
| **Competitor Monitoring** | Track competitor prices/inventory | Ezal |
| **Retailer Discovery** | Find dispensaries by location | CannMenus + GMaps |

---

## The Discovery Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                 Layer 1: Structural APIs                    │
│           CannMenus, Leafly, Google Places                  │
│        Fast, cheap, best for structured data                │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼ (if API fails or data missing)
┌─────────────────────────────────────────────────────────────┐
│                 Layer 2: Visual Scraping                    │
│              Firecrawl, RTRVR (Browser Agent)               │
│       Captures marketing context APIs miss                  │
└─────────────────────────────────────────────────────────────┘
```

**Rule**: Always try Layer 1 first. Only escalate to Layer 2 for deals, visual validation, or if Layer 1 fails.

---

## Discovery Tools

### Web Search (Serper)
**File**: `src/server/tools/web-search.ts`

```typescript
await tools.web_search({
  query: "cannabis dispensary San Francisco",
  num_results: 10
});
```

### Firecrawl Scraping
**File**: `src/server/services/firecrawl.ts`

```typescript
await firecrawlService.scrape(url, {
  formats: ['markdown', 'extract'],
  extractPrompt: 'Extract product prices'
});
```

### RTRVR Browser Automation
**File**: `src/server/services/rtrvr/`

Full browser automation via headless Chrome:

| Tool | Description |
|------|-------------|
| `discovery.browserAutomate` | Execute complex browser tasks |
| `discovery.summarizePage` | Summarize page content |
| `discovery.extractData` | Extract structured data |
| `discovery.fillForm` | Fill and submit forms |
| `discovery.createRedditAd` | Create Reddit campaigns |

**Access Control**: Restricted to Executive Boardroom + Super Users.

---

## Implementation Files

| File | Purpose |
|------|---------|
| `src/server/services/rtrvr/agent.ts` | Browser agent orchestration |
| `src/server/services/rtrvr/client.ts` | RTRVR API client |
| `src/server/services/rtrvr/tools.ts` | Genkit tool wrappers |
| `src/server/services/rtrvr/mcp.ts` | MCP protocol integration |
| `src/server/services/firecrawl.ts` | Firecrawl scraping |
| `src/server/tools/web-search.ts` | Serper search |
| `src/server/services/ezal/` | Competitive intel |
| `src/server/services/cannmenus.ts` | CannMenus API |
| `src/server/services/leafly-connector.ts` | Leafly API |
| `src/server/services/geo-discovery.ts` | Location discovery |

---

## Ezal (Market Scout)

**Ezal** is the agent persona for competitive intelligence:

| Capability | Description |
|------------|-------------|
| `scanCompetitor` | Get competitor pricing/inventory |
| `monitorDeals` | Track promotions and deals |
| `priceCompare` | Compare prices across competitors |
| `generateReport` | Create competitive snapshot |

**Tiers**:
- **Free**: Basic search, limited scans
- **Paid**: Full Firecrawl/RTRVR access

---

## Access Control

### By Role
| Role | Access Level |
|------|--------------|
| `super_admin` | Full Discovery access |
| `brand_admin` | Layer 1 + limited Ezal |
| `dispensary_admin` | Layer 1 only |
| `customer` | No Discovery access |

### By Agent
```typescript
DISCOVERY_BROWSER_ALLOWED_AGENTS = [
  'leo',      // COO
  'linus',    // CTO
  'glenda',   // CMO
  'mike_exec',// CFO
  'jack',     // CRO
  'ezal',     // Market Scout
  'deebo',    // Compliance
  'puff',     // General Assistant
  'smokey',   // Budtender
];
```

---

## Configuration

**Environment Variables**:
```env
SERPER_API_KEY=your-api-key
FIRECRAWL_API_KEY=your-api-key
RTRVR_API_KEY=your-api-key
RTRVR_BASE_URL=https://api.rtrvr.ai
```

---

## Related Documentation
- `refs/bakedbot-intelligence.md` — Memory system
- `refs/tools.md` — All agent tools
- `src/server/services/ezal/` — Competitive intel
