# Intel Ivan — Patterns & Gotchas

> Encoded knowledge from hard-won debugging. Read before touching competitive intel code.

---

## Critical Rules

### Rule 1: CannMenus two-level nesting must be flattened

The CannMenus API wraps products inside menu objects inside pages. Accessing `data[]` gives you menu objects, NOT products.

```typescript
// ✅ CORRECT — flatten data[].products[]
const products = pages.flatMap(page =>
  page.data.flatMap(menu => menu.products)
);

// ❌ WRONG — only one level, gives you menu objects
const products = pages.flatMap(page => page.data);

// ❌ WRONG — accessing thc directly on page
const thc = page.data[0].percentage_thc;  // undefined — that field is on products
```

---

### Rule 2: `percentage_thc` is 0–1 decimal — always multiply ×100

```typescript
// ✅ CORRECT
thcPercent: product.percentage_thc * 100  // 0.225 → 22.5%

// ❌ WRONG — displays as 0.22% (off by 100x)
thcPercent: product.percentage_thc        // 0.225 stored as-is
```

---

### Rule 3: Jina `s.jina.ai` returns empty for cannabis — always add Serper fallback

Jina's search service blocks cannabis-related queries at the content policy level. It silently returns an empty array rather than an error.

```typescript
// ✅ CORRECT — always check for empty and fall back
async function searchCompetitors(query: string) {
  const jinaResults = await jinaSearch(query);
  if (!jinaResults || jinaResults.length === 0) {
    return await serperSearch(query, { apiKey: process.env.SERPER_API_KEY });
  }
  return jinaResults;
}

// ❌ WRONG — relying only on Jina for cannabis competitor discovery
const results = await jinaSearch('dispensary near me');  // always []
```

---

### Rule 4: Drive write requires BOTH Firebase Storage AND Firestore doc

Every CI report written to Firebase Storage MUST also write a `drive_files` Firestore document. Without the Firestore doc, the file is invisible in the BakedBot Drive UI.

```typescript
// ✅ CORRECT — two writes, report appears in Drive
const file = storage.bucket('bakedbot-global-assets')
  .file(`reports/${orgId}/ci-${weekOf}.md`);
await file.save(reportMarkdown, { contentType: 'text/markdown', public: false });

await db.collection(`tenants/${orgId}/drive_files`).add({
  name: `Competitive Intelligence Report — Week of ${weekOf}`,
  category: 'documents',
  storageUrl: `gs://bakedbot-global-assets/reports/${orgId}/ci-${weekOf}.md`,
  createdAt: FieldValue.serverTimestamp(),
  orgId,
});

// ❌ WRONG — Storage only, file invisible in Drive UI
await file.save(reportMarkdown);
// (report gone from the user's perspective)
```

---

### Rule 5: Setup wizard dialog needs useEffect, not just useState

`useState(!hasCompetitors)` only evaluates on mount. If competitors load asynchronously after mount (or the last competitor is deleted), the dialog state drifts.

```typescript
// ✅ CORRECT — dialog stays in sync with data
const [open, setOpen] = useState(!hasCompetitors);
useEffect(() => {
  setOpen(!hasCompetitors);
}, [hasCompetitors]);

// ❌ WRONG — dialog stays open even after competitors load
const [open, setOpen] = useState(!hasCompetitors);
// → hasCompetitors becomes true, open stays true (mount value)
```

---

### Rule 6: `maxCompetitors` must flow through the full prop chain

The plan-based competitor limit comes from `getEzalLimits(planId).maxCompetitors`. If it's not passed through to `CompetitorSetupWizard`, the component defaults to 5 regardless of the user's plan.

```typescript
// ✅ CORRECT — IntelligencePage extracts from plan
const planId = (user as any).planId as string || 'scout';
const ezalLimits = getEzalLimits(planId);
const maxCompetitors = ezalLimits.maxCompetitors;

// Pass through: Page → CompetitorSetupWizard.maxCompetitors
<CompetitorSetupWizard hasCompetitors={competitors.length > 0} maxCompetitors={maxCompetitors} />

// ❌ WRONG — missing from prop chain, always 5
<CompetitorSetupWizard hasCompetitors={competitors.length > 0} />
// → Empire plan user can only add 5 competitors
```

---

### Rule 7: `frequencyMinutes` lives per data source — not per competitor or org

Scan frequency is stored on each data source document, not at the competitor level or org level. Changing a competitor's scan cadence means updating each source document individually.

```
tenants/{orgId}/competitors/{id}/sources/{sourceId}
  { source_type, frequencyMinutes, lastFetchedAt }

// ✅ CORRECT — update per source
await sourceRef.update({ frequencyMinutes: 15 });  // Empire live

// ❌ WRONG — updating at competitor level (field doesn't control cadence)
await competitorRef.update({ frequencyMinutes: 15 });
```

---

### Rule 8: Both competitor collections must be queried

The system has two Firestore paths for competitors — the old path under `organizations/` and the new path under `tenants/`. `getCompetitors()` queries both and merges results.

```typescript
// ✅ CORRECT — query both, merge, deduplicate
const [oldPath, newPath] = await Promise.all([
  db.collection(`organizations/${orgId}/competitors`).get(),
  db.collection(`tenants/${orgId}/competitors`).get(),
]);
const all = [...oldPath.docs, ...newPath.docs];
// deduplicate by name or url

// ❌ WRONG — only querying new path, misses legacy competitors
const snap = await db.collection(`tenants/${orgId}/competitors`).get();
```

---

## Common Mistakes

| Symptom | Root Cause | Fix |
|---------|-----------|-----|
| THC% shows as 0.22% not 22% | `percentage_thc` not multiplied ×100 | `p.percentage_thc * 100` |
| No search results for competitor discovery | Jina cannabis content block | Add Serper fallback when `jinaResults.length === 0` |
| CI report missing from BakedBot Drive | Storage uploaded but no `drive_files` Firestore doc | Always do both writes |
| Setup dialog stays open after adding competitor | `useState(!hasCompetitors)` doesn't react to prop changes | Add `useEffect([hasCompetitors])` |
| Empire plan user limited to 5 competitors | `maxCompetitors` not passed through page → wizard | Extract from `getEzalLimits(planId)` and pass as prop |
| Competitor data stale despite plan frequency | `frequencyMinutes` not set on source doc | Check `sources/{id}.frequencyMinutes` — update per source |
| Missing competitors from old clients | Only querying `tenants/` path | `getCompetitors()` must query both `organizations/` AND `tenants/` |
| Market Pulse shows wrong pricing position | Leafly connector failure falls back to 0 avg | Use blended average only when both sources return data >0 |

---

## CannMenus Response Shape (Quick Reference)

```typescript
// API: https://api.cannmenus.com/v1
// CannMenusService.searchProducts({ category?, limit? })
//   returns { products: CannMenusProduct[] }

interface CannMenusProduct {
  name: string;
  price: number;           // retail price (as-is, not a decimal)
  percentage_thc: number;  // 0–1 decimal! ALWAYS multiply ×100
  percentage_cbd: number;  // 0–1 decimal! ALWAYS multiply ×100
  category: string;
  brand: string;
  // ... other fields
}

// Full paginated response for fetchCannMenusProducts():
interface PageResponse {
  data: Array<{
    id: string;
    name: string;
    products: CannMenusProduct[];  // ← SECOND LEVEL to flatten
  }>;
  meta: { total: number; page: number; per_page: number };
}
```

---

## Leafly/Weedmaps Scraping Limitations

```
Leafly bot-block: Jina Reader (r.jina.ai) returns empty/blocked HTML
  → parseLeafly() relies on price-anchor strategy (not full-page regex)
  → Use CannMenus JSON API as primary source for NY market
  → Leafly/Weedmaps scraping is best-effort only

Jina Reader works for:
  ✅ Direct dispensary websites
  ✅ General web pages
  ❌ Leafly (anti-bot protection)
  ❌ Weedmaps (anti-bot protection)
  ❌ Cannabis search queries (content policy)
```

---

## Adding a New Data Source Type

1. Add the `source_type` value to the union in competitor types
2. Implement `fetchXxx(competitor)` function in the ezal service
3. Add case to the scraping dispatcher in `competitive-intel-service.ts`
4. Update `getSourcesDue()` to include the new type in queries
5. Test with a 15-min frequency before connecting to production orgs

---

## Diagnosing "No Benchmark Data" on Intelligence Page

Check in this order:

1. **Does the brand have products?** `productRepo.getAllByBrand(brandId)` — empty → no benchmarks possible
2. **Is the Leafly connector working?** `getLocalCompetition(state, city)` — uses brand `marketState` field; default `'IL'` if missing
3. **Is CannMenus returning data for the category?** `CannMenusService.searchProducts()` — may return 0 for niche categories
4. **Is the blended market average > 0?** If both sources return 0, the category is skipped entirely
5. **Check brand's state setting** — `brandDoc.marketState || brandDoc.state` — if missing, defaults to IL (wrong market)

---

*Patterns version: 1.1 | Updated: 2026-02-26 with blended benchmark logic, retailer sources, wizard maxCompetitors chain*
