# Menu Maya — Patterns & Gotchas

> Encoded knowledge from hard-won debugging. Read before touching menu code.

---

## Critical Rules

### Rule 1: Always dual-write COGS — both collections

`updateProductCost()` must write to BOTH Firestore paths. Missing either write causes the dashboard and public menu to show different data.

```typescript
// ✅ CORRECT — dual write (what updateProductCost() does)
await Promise.all([
  db.collection('products').doc(productId).update(updateData),
  db.collection(`tenants/${orgId}/publicViews/products/items`).doc(productId).update(updateData),
]);

// ❌ WRONG — only one path updated
await db.collection('products').doc(productId).update({ cost });
// → dashboard shows cost, but syncMenu() reads from publicViews and overwrites on next sync
```

---

### Rule 2: Use FieldValue.delete() for null COGS — not null literal

```typescript
// ✅ CORRECT — removes the field (no null stored in Firestore)
const updateData = cost !== null
  ? { cost, updatedAt: FieldValue.serverTimestamp() }
  : { cost: FieldValue.delete(), updatedAt: FieldValue.serverTimestamp() };

await ref.update(updateData);

// ❌ WRONG — stores null as a value, breaks margin calculations
await ref.update({ cost: null });
// → CostCell reads null, shows "Not Set" badge, but field exists as null
// → future FieldValue.delete() may not clear it properly
```

---

### Rule 3: getMenuPreviewData() fetches by orgId field — not slug

```typescript
// ✅ CORRECT — use the server action (handles orgId field lookup)
const previewData = await getMenuPreviewData();
// Internally: brands.where('orgId', '==', orgId).limit(1)
// Fallback: brands.doc(orgId)

// ❌ WRONG — orgId is not the slug
const brand = await getBrandBySlug(orgId);  // returns null for most orgs
// → Preview tab shows "No brand page found"
```

---

### Rule 4: BrandMenuClient requires domain Product type — not internal Product

The menu page manages two parallel product arrays. Passing the wrong type to `BrandMenuClient` causes TypeScript errors and missing fields.

```typescript
// ✅ CORRECT — build domain products from raw POS data
const domain: DomainProduct[] = data.products.map((p: any) => ({
  id: p.id || p.cann_sku_id,
  name: p.name || p.product_name,
  category: normalizeCategoryName(p.category),
  price: p.price || p.latest_price || 0,
  imageUrl: p.imageUrl || p.image_url || '/icon-192.png',
  imageHint: p.imageHint || p.category || 'product',
  description: p.description || '',
  brandId: p.brandId || '',
  brandName: p.brandName || p.brand_name,
  thcPercent: p.thcPercent || p.percentage_thc,
  cbdPercent: p.cbdPercent || p.percentage_cbd,
  effects: p.effects || [],
  sortOrder: p.sortOrder,
  featured: p.featured,
  source: p.source || 'pos',
}));
<BrandMenuClient products={domain} isManageMode={true} ... />

// ❌ WRONG — passing internal Product[] directly
<BrandMenuClient products={products} />
// → TypeScript error: missing imageHint, description, etc.
```

---

### Rule 5: ManagedProductGrid only syncs from parent when not in custom-order mode

Once a user starts dragging to reorder, the local order takes over. Syncing on every parent update would reset their reorder.

```typescript
// ✅ CORRECT — guard sync with custom-order flag
useEffect(() => {
  if (!isCustomOrder) {
    setOrderedProducts(products);
  }
}, [products, isCustomOrder]);

// ❌ WRONG — always syncing destroys drag order
useEffect(() => {
  setOrderedProducts(products);  // resets after every parent re-render
}, [products]);
// → User drags product 1 to position 3 → sync fires → order resets
```

---

### Rule 6: previewFetchedRef prevents duplicate preview fetches

Preview data only needs to load once. Without the ref guard, switching tabs can trigger multiple fetches.

```typescript
// ✅ CORRECT — one-time fetch with ref guard
const previewFetchedRef = useRef(false);

const loadPreviewData = useCallback(async () => {
  if (previewFetchedRef.current) return;  // guard: skip if already fetched
  previewFetchedRef.current = true;
  const data = await getMenuPreviewData();
  setPreviewData(data);
}, []);

// ❌ WRONG — no guard, fetches on every tab switch to preview
const loadPreviewData = async () => {
  const data = await getMenuPreviewData();  // fires N times
};
```

---

### Rule 7: Full-screen mode must use early return before tab render

Full-screen preview overlays the ENTIRE viewport. It must return before the tab container renders, not inside a tab.

```typescript
// ✅ CORRECT — early return at top of render
if (fullScreen && previewData?.brand) {
  return (
    <div className="fixed inset-0 z-50 bg-background overflow-auto">
      {/* Full-screen menu content */}
    </div>
  );
}
// rest of component (tabs, header, etc.) only renders when not full-screen

// ❌ WRONG — putting full-screen inside a TabsContent
<TabsContent value="preview">
  {fullScreen && <div className="fixed inset-0">...</div>}  // sidebar still visible
</TabsContent>
```

---

### Rule 8: Staff Guide uses getBudtenderGuideData() — not getMenuData()

The staff guide has its own server action with a different data shape optimized for print layout.

```typescript
// ✅ CORRECT — use the staff guide action
import { getBudtenderGuideData } from '@/server/actions/budtender-guide';
const { orgName, generatedAt, productsByCategory, categories } = await getBudtenderGuideData();

// ❌ WRONG — using getMenuData() for the staff guide
const { products } = await getMenuData();  // flat array, no category grouping, no effects
```

---

### Rule 9: POS sync removes ALL non-POS products — this is intentional

`syncMenu()` deletes everything not from the POS. Do not add a "keep manual products" flag without coordinating with Sync Sam (pos-sync-service.ts owner).

```typescript
// ✅ CORRECT — POS is the single source of truth
// syncMenu() removes CannMenus, manual, and AI-generated entries when POS is connected
// If a product disappears after sync, it was removed from Alleaves inventory

// ❌ WRONG — preserving non-POS products
// Do NOT add: .where('source', '==', 'pos') filter to the delete query
// This would allow ghost products to accumulate alongside POS data
```

---

### Rule 10: Budtender (Ask Smokey) tab renders Chatbot at root level

The Chatbot component uses `fixed` positioning. Rendering it inside a tab container would cause it to be clipped or positioned relative to the tab content area.

```typescript
// ✅ CORRECT — Chatbot at root level of the page component
{domainProducts.length > 0 && previewData?.brand && activeTab === 'budtender' && (
  <Chatbot
    products={domainProducts}
    brandId={previewData.brand.id}
    initialOpen={budtenderOpen}
    chatbotConfig={previewData.brand.chatbotConfig}
  />
)}
// Mounted OUTSIDE the Tabs component

// ❌ WRONG — inside TabsContent
<TabsContent value="budtender">
  <Chatbot ... />  // fixed positioning behaves unexpectedly inside tab
</TabsContent>
```

---

## Common Mistakes

| Symptom | Root Cause | Fix |
|---------|-----------|-----|
| COGS shows in menu tab but not products table (or vice versa) | Missing dual-write | Always call `updateProductCost()` which handles both collections |
| Drag order resets after any state update | `ManagedProductGrid` syncing on every parent update | Add `isCustomOrder` guard to the sync `useEffect` |
| Preview shows "No brand page found" | `getMenuPreviewData()` failing or brand looked up by slug | Pass `orgId` from auth claims, not brand slug |
| Staff guide missing products | Wrong server action used | Import from `@/server/actions/budtender-guide`, not `menu/actions.ts` |
| Chatbot clipped or wrong position | Rendered inside tab container | Render `<Chatbot>` at root level of page, outside `<Tabs>` |
| Preview data loads multiple times | No `previewFetchedRef` guard | Add `useRef(false)` guard in `loadPreviewData` |
| Full-screen mode shows sidebar | Full-screen inside tab content | Move to early return before tab render |
| Products appear twice | POS + old cannmenus/manual entries | `syncMenu()` removes all non-POS; force a sync if stale entries persist |
| COGS margin color wrong | Using wrong thresholds | Green ≥30%, amber ≥15%, red <15% |
| Sort order not applying on public menu | Public menu not checking `sortOrder` field | Popular sort: `sortOrder ?? 9999` first, `likes` as tiebreaker |

---

## COGS Margin Color Logic

```typescript
// Thresholds: green ≥30%, amber ≥15%, red <15%
const margin = (price - cost) / price * 100;

// In CostCell (menu/page.tsx):
const marginClass = Number(margin) < 30 ? 'text-amber-600' : 'text-emerald-600';

// In products-table-columns.tsx (richer variant):
const marginColor = margin >= 30 ? 'text-green-600'
  : margin >= 15 ? 'text-amber-600'
  : 'text-red-600';
const marginBg = margin >= 30 ? 'bg-green-50'
  : margin >= 15 ? 'bg-amber-50'
  : 'bg-red-50';
```

---

## Adding a New Menu Tab

1. Add tab value to the `activeTab` union type
2. Add `<TabsTrigger>` to the `<TabsList>`
3. Add `<TabsContent>` with the tab content
4. If the tab needs cleanup when switching away: add to the `activeTab` useEffect
5. If the tab loads its own data: use lazy loading on tab activation (like `loadPreviewData`)
6. For external pages (like Staff Guide): use `<TabsTrigger asChild><Link href="..."></TabsTrigger>` pattern

---

## Menu Action File Quick Reference

```typescript
// src/app/dashboard/menu/actions.ts

getMenuData()
  // returns: { products: any[], source: 'pos'|'cannmenus'|'manual'|'none', lastSyncedAt }

syncMenu()
  // calls: syncOrgPOSData(orgId) → syncPOSProducts (one of 3 stages)
  // returns: { success, count, removed, error }

getPosConfig()
  // returns: { provider, status, displayName, lastSyncCount, lastSyncedAt }

updateProductCost(productId: string, cost: number | null)
  // DUAL WRITE to products/ and tenants/{orgId}/publicViews/products/items/
  // returns: { success, error }

getMenuPreviewData()
  // fetches: brand (by orgId field), bundles, carousels, featuredBrands, publicMenuSettings
  // returns: { brand, bundles, featuredBrands, carousels, publicMenuSettings, brandSlug }

updateProductSortOrder(updates: { id: string; sortOrder: number }[])
  // DUAL WRITE to both product paths
  // returns: { success, error }

toggleProductFeatured(productId: string, featured: boolean)
  // returns: { success, error }
```

---

*Patterns version: 1.1 | Updated: 2026-02-26 with actual CostCell code, previewFetchedRef pattern, full-screen early return, staff guide action source*
