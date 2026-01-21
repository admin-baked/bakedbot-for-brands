# Homepage Demo Chat Reference

## Overview
The **Homepage Demo Chat** is the primary conversion tool on the BakedBot landing page. It allows unauthenticated visitors to experience the agent capabilities before signing up. The demo showcases **live data** from Firecrawl to demonstrate real-world value.

---

## Architecture

### Key Files
| File | Purpose |
|------|---------|
| `src/app/dashboard/ceo/hooks/use-puff-chat-logic.ts` | Main hook handling all chat logic, preset interceptors |
| `src/app/api/demo/agent/route.ts` | Demo API fallback for generic queries |
| `src/app/dashboard/intelligence/actions/demo-setup.ts` | Retailer search, SMS/email sending |
| `src/app/dashboard/intelligence/actions/demo-compliance.ts` | Deebo compliance scanning |
| `src/app/dashboard/intelligence/actions/demo-presets.ts` | Static demo responses for certain personas |
| `src/app/dashboard/intelligence/actions/demo-data.ts` | Demo product data |
| `src/components/demo/demo-chat-trigger.tsx` | Launches Smokey chatbot |

### Data Flow
```
User Input
    │
    ▼
┌─────────────────────────────────────┐
│     use-puff-chat-logic.ts          │
│     (Preset Interceptors)           │
└─────────────────────────────────────┘
    │
    ├──► Pattern Match? ──► Execute Specialized Handler
    │                           │
    │                           ├──► searchDemoRetailers() [Firecrawl]
    │                           ├──► scanDemoCompliance() [Firecrawl/RTRVR]
    │                           └──► Static Mock Response
    │
    └──► No Match ──► /api/demo/agent (Generic Fallback)
```

---

## Demo Modes

### 1. Brand Mode
**Target**: Brand owners looking for retail distribution

| User Input | Handler | Data Source |
|------------|---------|-------------|
| "Hire a Market Scout" + "Find retail partners" | `promptForLocation(isBrandMode=true)` | - |
| [City/ZIP after prompt] | `executeMarketScout(isBrandMode=true)` | Firecrawl Live |

**Response Focus**:
- Finding dispensary partners for brand products
- Partner onboarding status
- Wholesale pricing guidance

### 2. Dispensary Mode
**Target**: Dispensary operators researching competition

| User Input | Handler | Data Source |
|------------|---------|-------------|
| "Hire a Market Scout" (default) | `promptForLocation(isBrandMode=false)` | - |
| "Find dispensaries near me" | `promptForDispensarySearch()` | - |
| [City/ZIP after prompt] | `executeMarketScout(isBrandMode=false)` | Firecrawl Live |

**Response Focus**:
- Competitor pricing strategies
- Market threat analysis
- Promotional intelligence

---

## Preset Interceptors

### Location-Based Presets
```typescript
// Triggers on ZIP or city input after location prompt
const zipOrCityRegex = /^\d{5}$/
const isCity = /^[a-zA-Z\s,]{3,40}$/.test(input) && !input.includes('http');
const askedForLocation = lastBot?.content.includes("City or ZIP");

if (askedForLocation && (zipOrCityRegex.test(input) || isCity)) {
    executeMarketScout(input, displayContent, isBrandMode);
}
```

### Compliance Presets (Deebo)
```typescript
// URL provided after compliance prompt
if (askedForUrl && urlRegex.test(input)) {
    executeComplianceScan(input, displayContent);
}

// Demo mode without URL
if (askedForUrl && input.includes("demo")) {
    executeComplianceDemoScan(displayContent);
}
```

### Information Presets
```typescript
// How does BakedBot work?
if (input.includes("how does bakedbot work") || input.includes("what is bakedbot")) {
    executeBakedBotExplainer(displayContent);
}

// Find dispensaries
if (input.includes("find dispensaries") || input.includes("dispensaries near me")) {
    promptForDispensarySearch(displayContent);
}
```

---

## Live Data Integration

### Firecrawl Service
**File**: `src/server/services/firecrawl.ts`

| Method | Purpose | Used By |
|--------|---------|---------|
| `search(query, limit)` | Find dispensaries by location | Market Scout |
| `scrape(url, options)` | Extract page content | Compliance Scanner |
| `discoverUrl(url)` | Deep discovery + enrichment | Retailer Enrichment |

### Market Scout Flow
```typescript
// src/app/dashboard/intelligence/actions/demo-setup.ts
export async function searchDemoRetailers(location: string) {
    const firecrawl = new Firecrawl();
    const results = await firecrawl.search(
        `cannabis dispensary ${location}`,
        { limit: 10 }
    );

    // Filter out directory sites
    const dispensaries = results.filter(r =>
        !r.url.includes('leafly.com') &&
        !r.url.includes('weedmaps.com')
    );

    // Deduplicate by domain
    const unique = deduplicateByDomain(dispensaries);

    // Enrich top result with deep scrape
    if (unique.length > 0) {
        const enriched = await firecrawl.discoverUrl(unique[0].url);
        unique[0].isEnriched = true;
        unique[0].enrichmentSummary = enriched?.summary;
    }

    return { daa: unique, location };
}
```

### Fallback Architecture
```
┌─────────────────────────┐
│    Firecrawl (25s)      │ ──► Primary scraping
└─────────────────────────┘
            │
            ▼ (on failure)
┌─────────────────────────┐
│     RTRVR (45s)         │ ──► Browser automation backup
└─────────────────────────┘
            │
            ▼ (on failure)
┌─────────────────────────┐
│    Mock Fallback        │ ──► Demo still works
└─────────────────────────┘
```

---

## Response Format Standards

### DOs
- Use `###` headers for section titles
- Include thinking steps during processing
- End with lead capture CTA ("reply with your email")
- Show real data counts ("Found **8** dispensaries")
- Differentiate Brand vs Dispensary mode language

### DON'Ts
- Never return generic "Agentic Commerce OS" boilerplate
- Never show duplicate data blocks
- Never skip the thinking UI steps
- Never hardcode fake competitor counts

### Example Response (Dispensary Mode)
```markdown
### 👁️ Competitive Intelligence: Denver, CO

Analyzed **8** competitors in your market.

**1. Green Leaf Wellness**
   📍 1420 Cannabis Ave, Denver CO
   💰 Pricing: Premium | 🔴 Threat: High
   📦 Est. SKUs: 250

### ⭐ Deep Dive: Mile High Dispensary
   📍 710 Terpene St, Denver CO
   💰 Pricing: Aggressive Promo | 🟡 Threat: Med
   📦 Est. SKUs: 180
   🔍 Intel: Running 20% off all flower this week

---

### 📈 Market Summary
- **3** competitors using premium pricing
- **5** running aggressive promotions
- Recommended strategy: Focus on value differentiation

📧 **Get weekly competitor alerts** - reply with your email.
```

---

## Thinking Steps UI

Every demo action should show realistic "thinking" steps:

```typescript
const steps = [
    { id: 'geo', toolName: "Geocoder", description: `Resolving ${location}...`, status: 'in-progress' },
    { id: 'scan', toolName: "Market Scout", description: "Scanning local market...", status: 'pending' },
    { id: 'enrich', toolName: "Discovery", description: "Enriching top results...", status: 'pending' }
];

// Progress through steps with delays
await new Promise(r => setTimeout(r, 600));
updateMessage(thinkingId, {
    thinking: {
        isThinking: true,
        steps: steps.map((s, i) => i === 0 ? {...s, status: 'completed'} : s)
    }
});
```

---

## Lead Capture

**Every response should end with a lead capture CTA:**

| Demo Type | CTA |
|-----------|-----|
| Market Scout | "📧 **Get the full partner list** - reply with your email." |
| Competitor Intel | "📧 **Get weekly competitor alerts** - reply with your email." |
| Compliance Scan | "📧 **Get the full compliance report** - reply with your email." |
| Dispensary Search | "📧 **Want the full report?** Reply with your email." |

### Email/SMS Capture Handlers
```typescript
// Detect email input
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (emailRegex.test(input) && askedForEmail) {
    executeCampaignEmail(input, displayContent);
}

// Detect phone input
const phoneRegex = /^\+?1?\d{10,14}$/;
if (phoneRegex.test(input.replace(/\D/g, '')) && askedForPhone) {
    executeCampaignSMS(input, displayContent);
}
```

---

## Testing

### Unit Tests
**File**: `src/app/dashboard/ceo/hooks/__tests__/use-puff-chat-logic.test.tsx`

```bash
npm test -- --testPathPattern="use-puff-chat-logic"
```

### Test Cases (13 total)
1. Should NOT intercept demo presets for authenticated users
2. Should intercept demo presets for unauthenticated users
3. Should use triple headers (###) in System Health Check
4. Should handle Market Scout location follow-up
5. Should verify Executive Boardroom agents use rich headers
6. Should intercept "Find dispensaries near me"
7. Should intercept "How does BakedBot work"
8. Should show compliance demo option when Deebo is triggered
9. Should handle "run demo" for compliance scan
10. Should differentiate Brand vs Dispensary mode in Market Scout
11. Should show competitor intelligence prompt for Dispensary mode
12. Should handle city input with comma (e.g., "Denver, CO")
13. Should include lead capture CTA in responses

### Live Testing
```bash
# Test Firecrawl integration directly
npx tsx scripts/test-firecrawl-live.ts
```

---

## Configuration

### Environment Variables
```env
FIRECRAWL_API_KEY=fc-xxx  # Required for live data
```

### Timeouts
| Operation | Timeout |
|-----------|---------|
| Firecrawl Search | 25 seconds |
| Firecrawl Scrape | 30 seconds |
| RTRVR Fallback | 45 seconds |
| Demo Response Total | 60 seconds max |

---

## Recent Updates (January 2026)

### Fixed Issues
1. **Generic Response Problem**: Queries now properly intercepted instead of falling through to generic API
2. **Duplicate Response Blocks**: Market Scout deduplicates results by domain
3. **Brand vs Dispensary Mode**: Different response templates based on context
4. **Lead Capture CTAs**: Every response ends with email capture prompt

### New Preset Handlers Added
- `promptForDispensarySearch()` - "Find dispensaries near me"
- `executeBakedBotExplainer()` - "How does BakedBot work?"
- `executeComplianceDemoScan()` - Demo compliance scan without URL
- `executeDispensarySearch()` - Location-based dispensary search

---

## Related Documentation
- `refs/bakedbot-discovery.md` — Firecrawl, RTRVR, web scraping
- `refs/frontend.md` — Component patterns
- `refs/testing.md` — Test patterns
