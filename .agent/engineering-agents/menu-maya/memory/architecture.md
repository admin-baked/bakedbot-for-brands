# Menu Maya — System Architecture

---

## Overview

Menu Maya owns the bridge between POS data and dashboard UX. The menu system has two primary surfaces:

1. **Menu Command Center** (`/dashboard/menu`) — internal management with 6 tabs: Live Preview (WYSIWYG), Products (COGS table), Themes, Analytics, Ask Smokey, Staff Guide
2. **Products Table** (`/dashboard/products`) — separate data table view with sortable columns + COGS column

The public-facing menu components (`BrandMenuClient`, `dispensary-menu-client.tsx`) are also used in the dashboard via `isManageMode=true`.

---

## 1. Menu Page Architecture

```
/dashboard/menu  ['use client' — MenuPage component]

State loaded on mount (loadProducts + loadPreviewData run in parallel):
  loadProducts():
    → Promise.all([getMenuData(), getPosConfig()])
    → normalizes to internal Product[] type
    → builds DomainProduct[] type for BrandMenuClient
    → sets: products, domainProducts, source, lastSyncedAt, posConfig

  loadPreviewData():
    → getMenuPreviewData()  [only fetches once via previewFetchedRef]
    → sets: previewData { brand, bundles, featuredBrands, carousels, publicMenuSettings, brandSlug }

Tab state: activeTab: 'preview' | 'products' | 'themes' | 'budtender' | 'staff-guide' | 'analytics'

6 Tabs:
  Preview     → WYSIWYG (BrandMenuClient with isManageMode=true)
  Products    → COGS table with inline CostCell editing
  Themes      → <ThemeManager orgId={orgId} />
  Analytics   → <MenuAnalyticsTab orgId={orgId} /> (lazy data load)
  Ask Smokey  → Chatbot component with domainProducts
  Staff Guide → <Link href="/dashboard/menu/staff-guide"> (separate page)
```

---

## 2. Full-Screen Preview (Early-Return Pattern)

```typescript
// menu/page.tsx — full-screen early return BEFORE tab render
if (fullScreen && previewData?.brand) {
  return (
    <div className="fixed inset-0 z-50 bg-background overflow-auto">
      {/* sticky header with live badge + exit button */}
      <BrandMenuClient
        brand={previewData.brand}
        products={domainProducts}  // domain type — NOT internal Product[]
        retailers={[] as Retailer[]}
        brandSlug={previewData.brandSlug}
        bundles={previewData.bundles}
        featuredBrands={previewData.featuredBrands}
        carousels={previewData.carousels}
        publicMenuSettings={previewData.publicMenuSettings}
        isManageMode={true}           // enables hover overlays
        onProductReorder={handleProductReorder}
        onToggleFeatured={handleToggleFeatured}
      />
    </div>
  );
}
// Full-screen covers viewport; sidebar hidden; exact customer view
```

---

## 3. Two Product Types

Menu page manages TWO parallel product arrays:

```typescript
// Internal Product (used in Products tab table + COGS editing)
interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  originalPrice: number;
  imageUrl?: string;
  thc?: number;
  cbd?: number;
  cost?: number;        // COGS field
  inStock?: boolean;
  stockCount?: number;
}

// Domain Product (used for BrandMenuClient preview)
// from: import type { Product as DomainProduct } from '@/types/domain'
interface DomainProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  imageUrl: string;
  imageHint: string;
  description: string;
  brandId: string;
  brandName?: string;
  thcPercent?: number;
  cbdPercent?: number;
  stock?: number;
  inStock?: boolean;
  cost?: number;
  effects?: string[];
  sortOrder?: number;
  featured?: boolean;
  source?: string;
}

// Both built from same raw POS data in loadProducts():
// products (internal) + domainProducts (domain) updated together
```

---

## 4. COGS Management

```
Two write surfaces (both must stay in sync):
  /dashboard/menu  → CostCell component inline in Products tab
  /dashboard/products → products-table-columns.tsx CostCell

updateProductCost(productId, cost):  [in menu/actions.ts]
  → DUAL WRITE required:
    1. products/{productId}           (legacy catalog)
    2. tenants/{orgId}/publicViews/products/items/{productId}  (public view)
  → cost = null → FieldValue.delete() (removes field, doesn't store null)
  → cost = number → stores the value + updatedAt

CostCell (in menu/page.tsx):
  - State: editing: bool, value: string, saving: bool
  - Click "Not Set" badge → editing mode
  - Enter → calls updateProductCost(), onSaved callback updates parent state
  - Escape → cancel without saving
  - Shows: $X.XX + margin% (green ≥30%, amber <30%)
  - Local savedCost state: no page refresh needed after save

Margin formula: (price - cost) / price × 100
Alert banner: missingCOGSCount > 0 → amber banner at top of page
```

---

## 5. Product Sort Order (Drag-to-Reorder)

```
Implementation uses @dnd-kit sortable grid

handleProductReorder(updates: { id, sortOrder }[]):
  → updateProductSortOrder(updates)  [server action]
  → Batch writes sortOrder to BOTH:
    1. tenants/{orgId}/publicViews/products/items/{id}
    2. products/{id} (legacy path)
  → Updates local domainProducts state optimistically

Public menu sort (in brand-menu-client.tsx + dispensary-menu-client.tsx):
  'popular' case: sortOrder ?? 9999 first, then likes as tiebreaker
  → Lower sortOrder = appears earlier
  → Missing sortOrder → treated as 9999 (end of list)

ManagedProductGrid sync guard:
  orderedProducts state only syncs from parent props when:
    NOT in custom order mode (user hasn't started dragging yet)
  Once user drags: local order is authoritative until page refresh
```

---

## 6. Preview Data Fetch (One-Time Pattern)

```typescript
// previewFetchedRef prevents duplicate fetches
const previewFetchedRef = useRef(false);

const loadPreviewData = useCallback(async () => {
  if (previewFetchedRef.current) return;  // ← guard
  previewFetchedRef.current = true;
  setPreviewLoading(true);
  const data = await getMenuPreviewData();  // fetches by orgId field, NOT slug
  setPreviewData(data);
  setPreviewLoading(false);
}, []);

// Triggers:
useEffect(() => { loadPreviewData(); }, []);         // on mount
useEffect(() => {                                    // on tab switch
  if (activeTab === 'preview' && !previewFetchedRef.current) {
    loadPreviewData();
  }
}, [activeTab, loadPreviewData]);

// getMenuPreviewData() fetches brand by orgId field (NOT slug):
// brands.where('orgId', '==', orgId) → fallback: brands.doc(orgId)
```

---

## 7. Staff Guide (Separate Page)

```
/dashboard/menu/staff-guide  [server component, link from tab bar]

getBudtenderGuideData()  [from @/server/actions/budtender-guide]:
  → requireUser() + org membership check
  → Reads tenants/{orgId}/publicViews/products/items
  → Returns:
      orgName: string
      generatedAt: string (formatted date)
      totalProducts: number
      inStockCount: number
      productsByCategory: Record<string, BudtenderProduct[]>
      categories: string[]  (sorted by CATEGORY_ORDER)

Category display order: Flower → Pre-Roll → Vape → Concentrate → Edible → Tincture → Topical → Accessory → Other

Print CSS (injected via <style> tag):
  nav, aside, header, [data-sidebar], .no-print { display: none !important; }
  @page { margin: 0.6in 0.5in; }
  grid stays 2-col on print

PrintButton: 'use client' component, wraps window.print()
Staff Guide is a separate route — not a tab in the Tabs component
The "Staff Guide" tab in TabsList uses <Link href="/dashboard/menu/staff-guide">
```

---

## 8. Ask Smokey Tab (Budtender Testing)

```
Tab: Ask Smokey (budtender testing for internal staff)

Renders only when domainProducts.length > 0:
  → Status card: product count + capabilities list
  → "Open Smokey Chat" button → setBudtenderOpen(true)
  → Chatbot component rendered at ROOT LEVEL for fixed positioning:
      <Chatbot products={domainProducts} brandId={previewData.brand.id}
               initialOpen={budtenderOpen} chatbotConfig={...} />

Cleanup: useEffect watching activeTab → setBudtenderOpen(false) on tab switch
Chatbot fixed-positions at bottom-right, same as customer-facing chatbot
```

---

## 9. POS as Single Source of Truth

```
syncMenu(orgId, products):
  1. Reads ALL existing products from tenants/{orgId}/publicViews/products/items
  2. Removes ALL non-POS products (including CannMenus, manual, AI-generated)
     (dropped the old 'where source === pos' filter — POS is now fully authoritative)
  3. Upserts all incoming POS products
  4. Returns { count, removed }

posCount vs posCatalogCount:
  posCount: total products in tenant catalog (all sources)
  posCatalogCount: POS-only products from Alleaves
  Mismatch banner: posCount > posCatalogCount → "manual products still exist"

Sync button:
  onClick → syncMenu() → toast result → loadProducts() reload
  Only shows when posConfig.provider is set (POS connected)
```

---

## Key Action Files

```
src/app/dashboard/menu/actions.ts
  getMenuData()         → { products[], source, lastSyncedAt }
  syncMenu()            → { success, count, removed, error }
  getPosConfig()        → PosConfigInfo { provider, status, displayName, lastSyncCount, lastSyncedAt }
  updateProductCost(productId, cost)  → { success, error }
  getMenuPreviewData()  → { brand, bundles, featuredBrands, carousels, publicMenuSettings, brandSlug }
  updateProductSortOrder(updates)     → { success, error }
  toggleProductFeatured(productId, featured) → { success, error }

src/server/actions/budtender-guide.ts
  getBudtenderGuideData() → { orgName, generatedAt, totalProducts, inStockCount, productsByCategory, categories }
```

---

*Architecture version: 1.1 | Updated: 2026-02-26 with actual tab structure, previewFetchedRef pattern, two product types, staff guide server action*
