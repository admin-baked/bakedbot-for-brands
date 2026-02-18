# Craig (Marketer) — Brand Discovery Tools

## Overview

Craig, the Marketing agent, now has **3 new brand discovery tools** powered by Firecrawl + RTRVR.ai fallback:

1. **`extractBrandData`** — Extract complete brand identity from any website
2. **`discoverWebContent`** — Get readable markdown content from URLs
3. **`searchWebBrands`** — Search the web for competitor brands and inspiration

All tools include **automatic fallback to RTRVR.ai** if Firecrawl is unavailable.

---

## Tool Capabilities

### 1. Extract Brand Data
**Perfect for:** Competitor research, campaign inspiration, brand swipe files

```
Craig, extract brand data from https://example-cannabis-brand.com

What it extracts:
- Visual Identity: Colors (hex codes), fonts, imagery style
- Brand Voice: Tone, personality, vocabulary preferences
- Messaging: Taglines, positioning, mission/values
- Social Profiles: Instagram/Twitter/Facebook handles & content
- Confidence Score: 0-100 reliability rating
```

**Usage from Agent:**
```typescript
const tools = createCraigToolImpls();
const result = await tools.extractBrandData({
  url: 'https://cannabrand.com',
  includeData: ['visual', 'voice', 'messaging']  // Optional filter
});
```

**Returns:**
```json
{
  "success": true,
  "data": {
    "visual": {
      "primaryColors": ["#1abc9c", "#34495e"],
      "fontFamily": "Inter, sans-serif",
      "style": "modern, minimalist"
    },
    "voice": {
      "tone": "professional, educational",
      "personality": "trustworthy, expert",
      "vocabulary": ["premium", "quality", "wellness"]
    },
    "messaging": {
      "tagline": "Quality Cannabis for Wellness",
      "positioning": "Premium, lab-tested products"
    },
    "confidence": 92
  }
}
```

---

### 2. Discover Web Content
**Perfect for:** Reading regulatory docs, competitor pages, blog posts, menu descriptions

```
Craig, extract the product descriptions from https://dispensary.dutchie.com/menu

Returns readable markdown of the entire page content.
```

**Usage from Agent:**
```typescript
const tools = createCraigToolImpls();
const result = await tools.discoverWebContent({
  url: 'https://example-menu.com'
});
```

**Returns:**
```json
{
  "success": true,
  "data": {
    "markdown": "# Premium Cannabis Products\n\n## Flower\n- Strain Name: Price...",
    "title": "Premium Cannabis Products",
    "description": "Browse our curated selection...",
    "source": "Firecrawl (with RTRVR.ai fallback)"
  }
}
```

**When RTRVR fallback triggers:** If Firecrawl is unavailable, you'll see in logs:
```
[Discovery] Firecrawl discoverUrl failed, trying RTRVR fallback
[Discovery] Using RTRVR fallback for discoverUrl
```

Response will still succeed, but may take 20-60 seconds longer.

---

### 3. Search Web for Brands
**Perfect for:** Competitive landscape research, finding new competitor brands, market trends

```
Craig, search for premium cannabis brands in Colorado

Returns: Array of web search results with titles, URLs, snippets
```

**Usage from Agent:**
```typescript
const tools = createCraigToolImpls();
const result = await tools.searchWebBrands({
  query: 'best cannabis brands Colorado 2026'
});
```

**Returns:**
```json
{
  "success": true,
  "data": [
    {
      "title": "Top Cannabis Brands in Colorado",
      "url": "https://example.com/brands",
      "snippet": "Discover the best premium cannabis brands..."
    },
    // ... more results
  ],
  "resultCount": 12,
  "source": "Firecrawl Web Search (with RTRVR.ai fallback)"
}
```

---

## How to Use with Craig

### Option 1: Chat with Craig Directly

Simply ask Craig to research brands:

```
You: "Craig, I need to create a competitive campaign. Can you research
the top 3 cannabis brands in California? Extract their brand voice and
colors so we can differentiate from them."

Craig's Response:
✓ Searches for "top cannabis brands California"
✓ Extracts brand data from each top result
✓ Analyzes visual identity & messaging
✓ Recommends positioning gaps for your campaign
```

### Option 2: Programmatic Use

```typescript
import { createCraigToolImpls } from '@/server/agents/craig';
import { runAgent } from '@/server/agents/harness';
import { craigAgent } from '@/server/agents/craig';

// Create tool implementations
const craigTools = createCraigToolImpls();

// Add them to Craig's tools
const tools: CraigTools = {
  generateCopy: async (prompt, context) => { /* ... */ },
  validateCompliance: async (content, jurisdictions) => { /* ... */ },
  sendSms: async (to, body) => { /* ... */ },
  ...craigTools  // ← Add discovery tools
};

// Run Craig with brand discovery capabilities
await runAgent(brandId, adapter, craigAgent, tools, 'Research competitors for our campaign');
```

---

## Examples: Real Campaign Use Cases

### Use Case 1: Competitive Pricing Analysis
```
You: "Craig, extract product pricing from our top 3 competitors.
Use extractBrandData to get their messaging, then discoverWebContent
to read their product descriptions."

Craig will:
1. Search for competitors
2. Extract brand positioning (voice, messaging)
3. Read their full product menus
4. Recommend pricing strategy to differentiate
```

### Use Case 2: Campaign Inspiration
```
You: "Find 5 premium cannabis brands I can learn from, extract their
brand voice, and draft 3 email subject lines inspired by their messaging."

Craig will:
1. Search for "premium cannabis brands"
2. Extract voice/tone from top results
3. Generate subject lines capturing their style
4. Show you the brand data for reference
```

### Use Case 3: Regulatory Compliance Check
```
You: "Extract the product descriptions from 3 competitor dispensaries
and analyze whether our copy violates the same regulations."

Craig will:
1. Discover competitor content
2. Run compliance validation on your copy
3. Compare against competitor messaging
4. Flag risky language
```

---

## Implementation Details

### Tool Definitions
Located in: [src/server/agents/craig.ts](src/server/agents/craig.ts)

```typescript
interface CraigTools {
  extractBrandData?(url, includeData?): Promise<any>;
  discoverWebContent?(url): Promise<{markdown, title, description}>;
  searchWebBrands?(query): Promise<any[]>;
}
```

### Tool Implementations
Located in: [src/server/agents/craig.ts](src/server/agents/craig.ts) (function `createCraigToolImpls`)

Each tool:
- Uses `DiscoveryService` from `src/server/services/firecrawl.ts`
- Automatically falls back to RTRVR if Firecrawl is down
- Returns structured JSON with success/error handling
- Includes comprehensive logging for debugging

### Under the Hood

```
Craig (Agent)
  ↓
Tool: extractBrandData / discoverWebContent / searchWebBrands
  ↓
DiscoveryService (Firecrawl wrapper)
  ├─ Try: Firecrawl API ✓ (fast, 2-5s)
  └─ Fallback: RTRVR.ai ✓ (slower, 20-60s)
  ↓
Structured result + markdown content
  ↓
Craig uses result to inform campaign strategy
```

---

## When to Use Each Tool

| Tool | When to Use | Example |
|------|------------|---------|
| **extractBrandData** | Understand competitor brand positioning, colors, voice | "What's their brand voice? How do they position?" |
| **discoverWebContent** | Read full page content, product descriptions, blog posts | "Read their menu and product descriptions" |
| **searchWebBrands** | Find new competitors, research market trends | "Who are the top brands in this market?" |

---

## Configuration

### Required Secrets (Already Set)
- ✅ `FIRECRAWL_API_KEY` — Primary scraper (in `apphosting.yaml`)
- ✅ `RTRVR_API_KEY` — Fallback scraper (in `apphosting.yaml`, with Firebase IAM binding)

### Already Working
- ✅ Firecrawl → RTRVR fallback is built into `DiscoveryService`
- ✅ Logging shows when fallback triggers
- ✅ Craig's agent is ready to use these tools

---

## Testing

### Test 1: Quick Extraction
```
You: "Craig, extract brand data from https://example.com"

Expected: Success with visual/voice/messaging data
If slow: RTRVR fallback is running (normal, 20-60s)
```

### Test 2: Competitor Search
```
You: "Search for cannabis brands in Colorado"

Expected: 10+ search results with URLs and snippets
```

### Test 3: Full Campaign Use
```
You: "Research our 3 competitors, extract their brand voice,
and draft 3 campaign variations inspired by their positioning."

Expected:
1. Competitive research
2. Brand voice analysis
3. 3 campaign copy variations
```

---

## Troubleshooting

### Issue: "Discovery service not configured"
**Cause:** FIRECRAWL_API_KEY and RTRVR_API_KEY are both missing

**Fix:**
```bash
# Verify secrets exist in Google Cloud
gcloud secrets list --project=studio-567050101-bc6e8 | grep -E "FIRECRAWL|RTRVR"

# Ensure RTRVR has Firebase App Hosting access
firebase apphosting:secrets:grantaccess RTRVR_API_KEY --backend=bakedbot-prod
```

### Issue: Extraction taking 20-60 seconds
**Cause:** Firecrawl is down, using RTRVR fallback

**Expected:** This is normal for RTRVR browser automation
**Check Logs:** Look for `[Discovery] Using RTRVR fallback`

### Issue: Tool not found in Craig
**Cause:** Tools not passed to Craig during instantiation

**Fix:** Ensure `createCraigToolImpls()` is called:
```typescript
const craigTools = createCraigToolImpls();
await runAgent(brandId, adapter, craigAgent, craigTools);
```

---

## Key Architecture Points

### Firecrawl + RTRVR Fallback ✅
- Implemented in: `src/server/services/firecrawl.ts`
- Pattern: Try Firecrawl first, auto-fallback to RTRVR if it fails
- No manual intervention needed — fully automatic

### Tool Registration ✅
- Craig's tools are defined in `CraigTools` interface
- Implementations in `createCraigToolImpls()` function
- Ready to use immediately

### Brand Data Flow ✅
- Brand Guide system → BrandGuideExtractor
- Discovery/Scraping → DiscoveryService (Firecrawl + RTRVR)
- Agent tools → Craig + other agents

---

## Related Documentation

- [Brand Guide Fallback Diagnostic](brand-guide-fallback.md) — Deep dive into Firecrawl/RTRVR fallback
- [src/server/agents/craig.ts](src/server/agents/craig.ts) — Craig agent implementation
- [src/server/services/firecrawl.ts](src/server/services/firecrawl.ts) — Discovery service with fallback
- [src/server/services/brand-guide-extractor.ts](src/server/services/brand-guide-extractor.ts) — Brand extraction engine

---

## Summary

Craig now has **enterprise-grade brand research capabilities**:
- ✅ Extract visual identity (colors, fonts, imagery)
- ✅ Analyze brand voice (tone, personality, vocabulary)
- ✅ Understand messaging (taglines, positioning)
- ✅ Search for competitor brands and market trends
- ✅ All with automatic Firecrawl → RTRVR fallback

**Use Case**: "Craig, research our top 3 competitors and help me draft a campaign that differentiates from their positioning."

**Result**: Craig extracts competitor brand data, analyzes their voice, and drafts campaign copy with competitive advantage.
