# Intel Ivan — System Architecture

---

## Overview

Intel Ivan owns the competitive intelligence pipeline:
competitor discovery → data source management → scheduled scraping → diff analysis → weekly reports → real-time price alerts → dashboard display.

The intelligence dashboard (`/dashboard/intelligence`) serves brand admins who want to see how their pricing compares to the local market.

---

## 1. Intelligence Dashboard Page

```
/dashboard/intelligence  [force-dynamic, auth-guarded]

Server component data fetching (parallel Promise.all):
  getCategoryBenchmarks(brandId)  → BenchmarkData[]
  getBrandRetailers(brandId)      → BrandRetailer[]
  listCompetitors(brandId)        → Competitor[]

If competitors.length > 0:
  generateCompetitorReport(brandId)  → reportMarkdown string

Props passed to client components:
  benchmarks  → PriceComparisonChart
  competitors → used for CompetitorSetupWizard hasCompetitors prop
  maxCompetitors ← getEzalLimits(user.planId).maxCompetitors
    Scout: 3 | Pro: 10 | Enterprise: 20 | Empire: 1000

Tabs:
  "Strategic Analysis"   → Daily Intelligence Report (markdown)
  "Price Benchmarking"   → PriceComparisonChart (Recharts bar chart)
  "Market Coverage"      → Brand retailer list (CannMenus + partners)
```

---

## 2. Price Benchmarking: Blended Market Average

```
getCategoryBenchmarks(brandId):
  1. Fetch brand products from productRepo.getAllByBrand(brandId)
  2. Read brandDoc.marketState || brandDoc.state (default 'IL')
  3. getLocalCompetition(state, city)  → Leafly intel pricing by category
  4. CannMenusService.searchProducts({ category, limit: 20 })  ← parallel per category
  5. Blended market avg:
       if both leafly + cannMenus data: (leaflyAvg + cannMenusAvg) / 2
       if only one source: use that source
       if neither: skip category
  6. difference % = ((yourAvg - marketAvg) / marketAvg) × 100
     +5% → 'Premium', -5% → 'Value', else → 'Market Parity'

Market Pulse card logic:
  avgDiff = sum(benchmarks[].difference) / count
  status = avgDiff > 5 ? 'Premium' : avgDiff < -5 ? 'Value' : 'Market Parity'
```

---

## 3. Brand Retailers (Market Coverage Tab)

```
getBrandRetailers(brandId):
  Source 1: organizations/{brandId}/partners (status=active, limit 20)
  Source 2: productRepo.getAllByBrand() → p.retailerIds[] → batch fetch retailers collection
  Deduplicates by retailer name
  Sorts by stockCount DESC
  Returns: { name, address, distance, stockCount }[]
```

---

## 4. Competitor Data Pipeline

```
Step 1: Discovery
  listCompetitors(orgId) queries TWO collections:
    1. organizations/{orgId}/competitors/  (legacy path)
    2. tenants/{orgId}/competitors/        (new Ezal path)
  Results merged + deduplicated; capped by plan maxCompetitors

Step 2: Data Sources per Competitor
  Each competitor document has a 'sources' subcollection:
    { source_type, frequencyMinutes, lastFetchedAt, lastSuccessAt }

  source_type values:
    'cann_menus'  → CannMenus JSON API (694 NY retailers, ~48% coverage)
    'leafly'      → Leafly scrape via Jina Reader (often bot-blocked)
    'weedmaps'    → Weedmaps scrape
    'website'     → Direct website scrape (RTRVR primary, Jina fallback)
    'jina_search' → Jina Search (returns empty for cannabis — use Serper)

Step 3: Scheduled Scraping Gate
  getSourcesDue():
    → WHERE lastFetchedAt < now - frequencyMinutes
    → Returns sources ready for refresh

  Scan frequency by plan:
    Empire: 15 min (live)
    Enterprise: 1,440 min (daily)
    Pro: 10,080 min (weekly)
    Scout: 43,200 min (monthly)
    Thrive (manually set): 43,200 min (monthly override)
```

---

## 5. CannMenus API Integration

```typescript
// Service: src/server/services/cannmenus.ts
// API: api.cannmenus.com/v1
// Coverage: 694 NY retailers, ~48% with live menus

// fetchCannMenusProducts(retailerId) — TWO-LEVEL NESTING:
const products = pages.flatMap(page =>
  page.data.flatMap(menu =>          // menu objects = outer level
    menu.products.map(p => ({        // products = INNER level
      name: p.name,
      price: p.price,
      thcPercent: p.percentage_thc * 100,  // 0–1 → percentage
      cbdPercent: p.percentage_cbd * 100,
      category: p.category,
      brandName: p.brand,
    }))
  )
);
// Then: deduplicateProducts by name+brand+price

// CannMenusService.searchProducts({ category, limit })
//   → Used in getCategoryBenchmarks for market pricing samples
//   → Returns { products: any[] }
```

---

## 6. Jina Tools

```
src/server/tools/jina-tools.ts — 3 Jina services:

jinaSearch(query):
  → https://s.jina.ai/{encodeURIComponent(query)}
  → Returns search results with URLs + snippets
  ⚠️ Returns empty for cannabis queries (content policy)
  → ALWAYS fall back to Serper (SERPER_API_KEY in apphosting.yaml)

jinaReadUrl(url):
  → https://r.jina.ai/{encodeURIComponent(url)}
  → Returns: markdown content of the page
  ⚠️ Leafly + Weedmaps block Jina Reader (anti-bot)
  → Use CannMenus JSON API instead for NY market data

jinaRerank(query, documents):
  → POST https://api.jina.ai/v1/rerank
  → Model: jina-reranker-v2-base-multilingual
  → Reranks competitor candidates by relevance score
  → Used during competitor discovery to rank search results
```

---

## 7. Weekly CI Reports

```
generateCompetitorReport(brandId):
  1. Fetch competitor products from last 7 days
  2. Calculate price diffs vs previous week
  3. Detect: new products, discontinued, price wars (>50% drop)
  4. Claude: generate narrative markdown summary
  5. DRIVE WRITE (required for Drive UI visibility):
       Storage: gs://bakedbot-global-assets/reports/{orgId}/ci-{week}.md
       Firestore: tenants/{orgId}/drive_files/{id}
         { name, category: 'documents', storageUrl, createdAt }
  6. Inbox: post thread with report summary
  7. Email: Mailjet dispatch to org admin

Cron: POST /api/cron/competitive-intel (configurable frequency per org)
```

---

## 8. Price Drop Alerts

```
Real-time check on every data refresh:
  Threshold: >30% price drop on any competitor product
  → Creates insight: tenants/{orgId}/insights/{id}
    { category: 'competitive', severity: 'warning', data: { ... } }
  → Slack webhook notification (immediate)
  → Inbox auto-thread with context

Price war detection:
  Threshold: >50% price drop across multiple competitor products
  → severity: 'critical' (vs 'warning' for single-product alerts)
  → Included in next weekly report
```

---

## 9. Competitor Setup Wizard

```
CompetitorSetupWizard component:
  Props: hasCompetitors, overrideRole?, maxCompetitors (default 5)

  State drift pattern — CORRECT implementation:
    const [open, setOpen] = useState(!hasCompetitors);
    useEffect(() => {
      setOpen(!hasCompetitors);
    }, [hasCompetitors]);
    // Without useEffect, dialog stays open after competitors load

  Search step 1:
    mode: 'zip' | 'city'
    searchLocalCompetitors(zip) OR searchLeaflyCompetitors(city, state)

  Selection step 2:
    max selection = maxCompetitors prop (comes from getEzalLimits(planId))
    finalizeCompetitorSetup(selected[]) → creates competitor docs

  maxCompetitors prop chain:
    getEzalLimits(planId) → planId from user claims (|| 'scout')
    → IntelligencePage.maxCompetitors → CompetitorSetupWizard.maxCompetitors
    (bug pattern: missing from prop chain → always shows 5 regardless of plan)
```

---

## Firestore Schema

```
tenants/{orgId}/competitors/{competitorId}
  { name, url, sourceTypes[], active, addedAt, lastScannedAt }
  └── sources/{sourceId}
        { source_type, frequencyMinutes, lastFetchedAt, lastSuccessAt }

tenants/{orgId}/competitor_products/{productId}
  { competitorId, name, price, category, thcPercent, scrapedAt }

tenants/{orgId}/competitive_snapshots/{snapshotId}
  { weekOf, competitorId, productCount, avgPrice, changes[] }

tenants/{orgId}/competitive_reports/{reportId}
  { weekOf, markdown, driveFileId, createdAt }

organizations/{orgId}/competitors/{competitorId}
  (legacy path — still queried, results merged with tenants path)
```

---

*Architecture version: 1.1 | Updated: 2026-02-26 with actual page structure, blended benchmarks logic, retailer two-source pattern, and competitor wizard prop chain*
