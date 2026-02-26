# Competitive Intelligence Domain — Intel Ivan

> You are working in **Intel Ivan's domain**. Ivan is the engineering agent responsible for the competitive intelligence dashboard, Ezal service layer, CannMenus API integration, Jina tools, weekly CI reports, and real-time price drop alerts. Full context: `.agent/engineering-agents/intel-ivan/`

## Quick Reference

**Owner:** Intel Ivan | **Reports to:** Linus (CTO)
**Master authority:** `.agent/prime.md` (workflow protocol applies)

---

## Critical Rules for This Domain

1. **CannMenus has two-level nesting** — `data[].products[]` must be flattened. `percentage_thc` is 0–1 decimal (multiply ×100). Never access `data[0].thc` directly.

2. **Jina returns empty for cannabis queries** — `s.jina.ai` has content policy that blocks cannabis. Always have Serper fallback when `jinaResults.length === 0`. `SERPER_API_KEY` is already in `apphosting.yaml`.

3. **`frequencyMinutes` lives per data source** — Stored on each source document, not at competitor or org level. `getSourcesDue()` checks each source's `lastFetchedAt + frequencyMinutes`. Thrive: 43,200 min (monthly). Empire: 15 min.

4. **Both competitor collections are queried** — Old: `organizations/{orgId}/competitors/`. New Ezal: `tenants/{orgId}/competitors/`. `getCompetitors()` queries both and merges.

5. **Setup wizard dialog state drift** — `useState(!hasCompetitors)` only runs on mount. Must add `useEffect(() => setOpen(!hasCompetitors), [hasCompetitors])` to keep in sync.

6. **Drive save rule applies to CI reports** — Weekly reports written to Firebase Storage MUST also write a `drive_files` Firestore doc or the file won't appear in BakedBot Drive.

7. **Price drop alert threshold is >30%** — Below 30% is a price change, not an alert. Price war detection requires >50% drop across multiple competitors.

8. **`maxCompetitors` must flow through the prop chain** — `getEzalLimits(planId).maxCompetitors` → page state → `CompetitorSetupWizard` prop. Missing it defaults to 5 regardless of plan.

9. **Blended market average uses Leafly + CannMenus** — `getCategoryBenchmarks` blends both sources. If either returns 0, uses the other. If both return 0, the category is skipped entirely.

## Page Structure

```
/dashboard/intelligence  [force-dynamic, server component]

  Data: Promise.all([getCategoryBenchmarks, getBrandRetailers, listCompetitors])
  If competitors: generateCompetitorReport(brandId) → markdown

  Tabs:
    "Strategic Analysis"  → Daily Intelligence Report (markdown, AI-generated)
    "Price Benchmarking"  → PriceComparisonChart (brand vs market avg per category)
    "Market Coverage"     → Brand retailers grid (partners + product associations)

  Header:
    Market Pulse card → Premium / Value / Market Parity badge
    Competitors Tracked card → competitor count
    CompetitorSetupWizard button → opens setup dialog when no competitors
```

## Key Files

| File | Purpose |
|------|---------|
| `src/app/dashboard/intelligence/page.tsx` | Server component — data fetch + page layout |
| `src/app/dashboard/intelligence/components/competitor-setup-wizard.tsx` | Multi-step wizard for adding competitors |
| `src/app/dashboard/intelligence/components/price-comparison-chart.tsx` | Recharts bar chart (brand vs market) |
| `src/app/dashboard/intelligence/actions/benchmarks.ts` | `getCategoryBenchmarks` + `getBrandRetailers` |
| `src/app/dashboard/intelligence/actions/setup.ts` | `searchLocalCompetitors`, `finalizeCompetitorSetup` |
| `src/server/agents/ezal.ts` | Ezal competitive intel agent |
| `src/server/services/ezal/` | Scraping pipeline, report generation |
| `src/server/services/cannmenus.ts` | CannMenus API client |
| `src/server/tools/jina-tools.ts` | jinaSearch, jinaReadUrl, jinaRerank |
| `src/app/api/cron/competitive-intel/route.ts` | Scheduled CI refresh |

## Full Architecture → `.agent/engineering-agents/intel-ivan/memory/architecture.md`
## Patterns & Gotchas → `.agent/engineering-agents/intel-ivan/memory/patterns.md`

---

*Governed by prime.md. Linus reviews cross-domain changes.*
