# Brand Pages Willie — Architecture

## Request Flow: Public Menu Page

```
bakedbot.ai/thrivesyracuse
  ↓
src/middleware.ts
  ↓
src/proxy.ts (edge runtime)
  ├─ isMetaPath?  →  bypass (robots.txt, sitemap, favicon)
  ├─ isDriverRoute?  →  bypass (/driver/*)
  ├─ isMeetRoute?  →  rewrite to /meet/{roomId}
  ├─ isMenuRoute? (regex: /^\/[^/]+$/)
  │   ├─ Has age_verified cookie?
  │   │   → rewrite: /thrivesyracuse → ISR page
  │   └─ No cookie?
  │       → redirect to age gate (saves /thrivesyracuse for post-verify)
  └─ Pass through to Next.js

src/app/[brand]/page.tsx (server component, ISR 300s)
  ├─ Lookup brand by slug → brands/{slug}
  ├─ Load products from tenants/{orgId}/publicViews/products/items/
  ├─ Load menu settings (loyalty bar, filter config)
  ├─ Build Schema.org JSON-LD
  └─ Render BrandMenuClient with serialized data

src/components/demo/brand-menu-client.tsx (client component)
  ├─ Category tabs (filter by category)
  ├─ Search bar (name.toLowerCase() — MUST null-guard)
  ├─ Advanced filter sidebar (types, weights, brands, terpenes, price)
  ├─ Sort: popular (sortOrder first) / newest / price-asc / price-desc
  ├─ Effects pills (CALM, ENERGIZED, FOCUSED, SLEEPY, UPLIFTED, HUNGRY)
  └─ Product grid → OversizedProductCard
```

## Proxy Priority Order

The proxy branch order in `src/proxy.ts` is CRITICAL. Wrong order = wrong behavior.

```
1. isMetaPath      (robots.txt, sitemap, favicon, _next/*, api/*)
2. isDriverRoute   (pathname.startsWith('/driver'))
3. isMeetRoute     (hostname.includes('meet.'))
4. isMenuRoute     (regex + NOT meta + NOT driver + NOT booking + NOT reserved subdomain)
5. isBookingRoute  (pathname.startsWith('/book/'))
6. Pass through
```

## ISR Cache

```typescript
// src/app/[brand]/page.tsx
export const revalidate = 300; // 5 minute ISR

// Cache key: brand slug (one ISR cache per slug)
// Invalidation triggers:
//   - POS sync completes (via revalidatePath in pos-sync-service.ts)
//   - Manual via /api/cache/revalidate?slug={slug}
//   - Time-based (300s)
```

## Null Safety Rules

Products from Alleaves frequently arrive with undefined fields. ALL access must be null-guarded.

```typescript
// ✅ CORRECT
const nameMatch = (product.name ?? '').toLowerCase().includes(query);
const priceDisplay = (product.price ?? 0).toFixed(2);
const brand = product.brandName ?? '';
const thc = product.thcPercent != null ? `${product.thcPercent}%` : null;

// ❌ CRASH in production (Thrive P0 bugs)
const nameMatch = product.name.toLowerCase().includes(query);  // TypeError
const priceDisplay = product.price.toFixed(2);                 // TypeError
```

## AI Crawler Infrastructure

```
bakedbot.ai/{slug}/llm.txt
  → src/app/[brand]/llm.txt/route.ts
  → llm-txt-generator.ts: formats 100 products as structured text
  → Cache: 5min TTL

bakedbot.ai/llm.txt
  → src/app/llm.txt/route.ts
  → Platform directory: all active brands + platform description
  → Cache: 10min TTL

GET /api/agent/{slug}
  → src/app/api/agent/[brandSlug]/route.ts
  → Schema.org: Store + OfferCatalog + Products (application/ld+json)
  → CORS: Access-Control-Allow-Origin: *
  → Excludes: cost, wholesalePrice, salesVelocity (competitive sensitive)

src/app/[brand]/layout.tsx:
  → <link rel="ai-content" href="/{slug}/llm.txt" />
  → <script type="application/ld+json">{schemaOrg}</script>

src/app/robots.ts:
  → GPTBot, Claude-Web, PerplexityBot, Amazonbot → explicit Allow
```

## Filter Sidebar

```
MenuFilterSidebar (src/components/demo/menu-filter-sidebar.tsx)

State: activeFilters = { types[], weights[], brands[], terpenes[], minPrice, maxPrice }
URL:   ?types=flower,pre-roll&weights=3.5g&brands=Cookies&minPrice=20&maxPrice=80

countFor(field, value):
  → Applies ALL other active filters (NOT the one being counted)
  → Counts products matching this option given those constraints
  → Shows next to each option checkbox

URL sync:
  → useEffect([searchParams.toString()]) — single dependency, not individual arrays
  → Prevents infinite re-render loops

Layout:
  → Desktop: 2-col (w-52 sticky sidebar + flex-1 grid)
  → Mobile: Sheet drawer with "Filters (N active)" badge
```

## Menu Info Bar

```
MenuInfoBar (src/components/demo/menu-info-bar.tsx)

Data source: getPublicMenuSettings(orgId) → Firestore loyalty settings
Renders: loyalty programs, delivery info (min order, fee, radius, drive-thru), discount programs

Display rule: showBar defaults false → nothing shown until org enables it in Settings → Loyalty → Menu tab
Fields:
  tagline: string
  deliveryInfo: { minOrder, fee, radius, driveThru }
  discountPrograms: [{ enabled, icon, name, description }]
  loyaltyDisplay: { enabled, text }
```

## Dispensary Pages

```
src/app/dispensaries/[slug]/page.tsx (SSR, no ISR)

Difference from brand pages:
  → No age gate (dispensary listing pages are informational)
  → Shows dispensary info card (address, hours, contact)
  → Uses DispensaryMenuClient (different component than BrandMenuClient)
  → Same null-safety rules apply to products
```
