# Task Spec: Public Menu System

**Date:** 2026-02-20
**Requested by:** Self-initiated (audit & documentation)
**Spec status:** 🟢 Approved (Existing production system — spec documents current state)

---

## 1. Intent (Why)

The Public Menu system is the primary revenue-generating customer-facing interface for BakedBot brands and dispensaries—enabling customers to discover products, filter/search, manage shopping carts, and complete purchases. This spec documents the current production architecture to ensure reliability, performance, and maintainability as the system scales.

---

## 2. Scope (What)

### Files Affected (Read-Only Exploration)

**Core Components:**
- `src/app/[brand]/brand-menu-client.tsx` — Brand & dispensary menu UI (1,102 lines)
- `src/app/[brand]/page.tsx` — Brand SSR page + data fetching orchestration (117 lines)
- `src/app/dispensaries/[dispensarySlug]/dispensary-menu-client.tsx` — Standalone dispensary menu (545 lines)
- `src/app/dispensaries/[dispensarySlug]/page.tsx` — Dispensary SSR page (inferred pattern)

**Data & Business Logic:**
- `src/lib/brand-data.ts` — Firestore data fetching (brand, products, retailers, carousels) (578 lines)
- `src/server/actions/loyalty-settings.ts` — Public menu display settings, loyalty tiers, discounts
- `src/app/actions/carousels.ts` — Fetch active carousels
- `src/app/actions/bundles.ts` — Fetch active bundle deals

**UI Components:**
- `src/components/demo/brand-menu-header.tsx` — Header with search, cart, location picker
- `src/components/demo/brand-hero.tsx` — Brand hero section with stats
- `src/components/demo/category-grid.tsx` — Category filter grid
- `src/components/demo/product-section.tsx` — Carousel product sections
- `src/components/demo/oversized-product-card.tsx` — Product card with add-to-cart
- `src/components/demo/product-detail-modal.tsx` — Full product info + effects/THC
- `src/components/demo/dispensary-locator-flow.tsx` — Pickup location selector
- `src/components/demo/cart-slide-over.tsx` — Shopping cart sidebar
- `src/components/demo/checkout-flow.tsx` — Local pickup checkout
- `src/components/demo/shipping-checkout-flow.tsx` — Online-only shipping checkout
- `src/components/demo/menu-info-bar.tsx` — Loyalty/discount/delivery info bar
- `src/components/demo/hero-carousel.tsx` — Hero image carousel
- `src/components/demo/featured-brands-carousel.tsx` — Brand carousel (dispensary only)
- `src/components/demo/bundle-deals-section.tsx` — Bundle offers display
- `src/components/demo/demo-footer.tsx` — Footer with location/contact info

**Age Verification:**
- `src/components/menu/menu-with-age-gate.tsx` — Wrapper component (required for all public menus)
- `src/components/compliance/age-gate-simple-with-email.ts` — Gate logic

**Type Definitions:**
- `src/types/products.ts` — Product type with price, category, effects, THC%, stock
- `src/types/domain.ts` — Brand, Retailer types
- `src/types/bundles.ts` — BundleDeal type
- `src/types/carousels.ts` — Carousel type
- `src/types/customers.ts` — LoyaltySettings, DiscountProgram types

### Files Explicitly NOT Touched

- Authentication layer — No auth required for public menus
- Payment/checkout providers — Cart uses local Zustand store
- AI/Agent code — Chatbot is optional UI component
- Database schema migration scripts — Menu uses existing collections
- Analytics/tracking — Event tracking defined; platform integration out of scope

### Estimated Diff Size

N/A — Documentation spec for existing system (~2,400 lines of core menu logic reviewed)

---

## 3. Boundary Check

| Boundary | Yes/No | Notes |
|---|---|---|
| Touches auth or permissions? | No | Public menus are intentionally unauthenticated; age gate is compliance-only |
| Touches payment or billing? | No | Cart is ephemeral (Zustand state); payment delegated to checkout backend |
| Modifies database schema? | No | Reads from existing `brands`, `products`, `tenants/{orgId}/publicViews`, `retailers` |
| Changes infra cost profile? | No | No new services; leverages existing Firestore, Cloud Storage |
| Modifies LLM prompts or agent behavior? | No | Chatbot is optional UI component; no prompt changes |
| Touches compliance logic? | Yes — but only reads | Age gate checks localStorage; no changes to gate logic |
| Adds new external dependency? | No | All dependencies present (React, ShadCN, lucide-react) |

**Escalation needed?** No

---

## 4. Feature Overview

### What the Public Menu Does

**Primary Purpose:**
- Displays a customizable product catalog (brand or dispensary)
- Enables customers to discover products via filters (category, effects, THC%, price) and search
- Manages a shopping cart (in-browser state)
- Routes to checkout (pickup at licensed dispensary OR direct online shipping)

**Two Menu Modes:**

1. **Brand Mode** (`menuDesign: 'brand'` or default)
   - Owned by CPG/Branded manufacturer (e.g., Ecstatic Edibles)
   - Hero: Brand logo, tagline, stats (products, retailers, rating)
   - Products filtered by brand (not by location)
   - Pickup: Find licensed dispensary near you → order online → pickup in-store
   - Shipping: Ships direct to customer (online_only model)
   - No hero carousel; no featured brands section

2. **Dispensary Mode** (`menuDesign: 'dispensary'` or `brand.type: 'dispensary'`)
   - Owned by retail location (e.g., Thrive Syracuse)
   - Hero: Promotional carousel (images, limited-time offers)
   - Featured Brands: Carousel of partner brands in stock
   - All products in-stock at that location
   - Categories + effects filters
   - Bundles: Multi-item deals
   - Loyalty/discount bar: configurable via dashboard

### Data Flow

```
Customer visits bakedbot.ai/thrivesyracuse
    ↓
[brand].page.tsx (SSR - async)
    ├─ fetchBrandPageData(brandParam) → Firestore queries:
    │  ├─ brands/{id} OR brands.where(slug==param) OR organizations.where(slug==param)
    │  ├─ tenants/{orgId}/publicViews/products/items/* (POS-synced products)
    │  │  OR products.where(brandId==id) (legacy/brand catalog)
    │  ├─ retailers (CannMenus API + local Firestore fallback)
    │  ├─ organizations/{orgId}/featured_brands
    │  └─ tenants/{orgId}/carousels (active only)
    │
    ├─ getActiveBundles(brandId)
    ├─ getPublicMenuSettings(brandId) → loyalty tiers, discount programs
    └─ MenuWithAgeGate (compliance check)
        ↓
BrandMenuClient (Client component - interactivity)
    ├─ State: search, categoryFilter, sortBy, selectedProduct, cart, selectedDispensary, favorites
    ├─ Client-side filtering: search + category + effects (instant, no re-fetch)
    ├─ Client-side sorting: popular (sortOrder+likes), price, name, THC%
    ├─ Cart management: useStore() (Zustand) - add/remove/update quantity
    ├─ View modes: shop (default) → locator → checkout (brand mode)
    │             or cart-only (dispensary mode)
    └─ Renders:
       ├─ Header (search bar, cart icon, location button)
       ├─ Hero (brand or carousel)
       ├─ Carousels (dynamic from dashboard)
       ├─ Featured products section
       ├─ Category grid
       ├─ Bundle deals
       ├─ All products + filters
       ├─ Footer (location, hours, contact)
       ├─ Cart slide-over
       ├─ Product detail modal
       └─ Smokey chatbot
```

### Filtering & Sorting

**Client-Side Filters (Instant, No Re-fetch):**
- **Search:** Product name + description (case-insensitive substring)
- **Category:** Single-select dropdown; dynamically populated from product data
- **Effects:** Chip buttons (dispensary mode only); toggleable; max 8 visible
- **Price Range:** Implicit (visible on product cards; no range slider)

**Sort Options:**
1. **Most Popular** (default)
   - Featured products float to top (sticky)
   - Custom sort order (operator-set) breaks ties
   - Likes as final tiebreaker

2. **Price: Low to High** / **Price: High to Low**

3. **THC: High to Low**

4. **Name (A-Z)**

**Dynamic Category Discovery:**
- Categories extracted from product data at runtime
- Standard categories in preferred order: Flower, Pre-roll, Vapes, Edibles, Concentrates, Tinctures, Topicals, Accessories, Merchandise, Apparel
- Unknown categories sorted alphabetically at end

### Search Functionality

- **Real-time:** Updates on each keystroke
- **Scope:** Product name + description fields
- **Performance:** Client-side `filter()` + `localeCompare()` (no network call)
- **Limitations:** No fuzzy matching, typo tolerance, or ranking; exact substring match
- **Improvement:** Future: Algolia or Firestore full-text search for relevance ranking

### Cart Management

- **Store:** Zustand hook `useStore()` (in-memory, session-scoped)
- **State:** `cartItems[]` with product ID, quantity, retailer ID
- **Actions:** `addToCart()`, `removeFromCart()`, `updateQuantity()`, `clearCart()`, `setSelectedRetailerId()`
- **Persistence:** None — cart lost on page reload (intentional for security)
- **Favorites:** localStorage (`favorites-{brandId}`) — persisted across sessions

### Purchase Models

**1. Online Only (`purchaseModel: 'online_only'`)**
- Brand ships direct to customer nationwide (or limited regions)
- No dispensary locator
- Cart → Shipping Checkout Flow
- Collects address, shipping method, payment

**2. Local Pickup (`purchaseModel: 'local_pickup'` or default)**
- Brand available at licensed dispensaries only
- Customer must select pickup location before checkout
- Cart → Dispensary Locator → Checkout
- Locator: Zip code search, map view, hours/distance

**3. Hybrid (`purchaseModel: 'hybrid'`)**
- Supports both shipping AND local pickup
- UX: Customer chooses model at checkout

### Checkout Flows

**Local Pickup (`CheckoutFlow`):**
- Displays selected dispensary details
- Order summary
- Estimated pickup time
- Submit to backend for fulfillment order

**Shipping (`ShippingCheckoutFlow`):**
- Address collection
- Shipping method selection (standard/express)
- Payment method
- Order summary
- Submit for shipment

### SEO & OG Tags

- **SSR:** All pages server-rendered with `dynamic = 'force-dynamic'` (fresh data every request, no caching)
- **Metadata:** Passed from brand doc (title, description, ogImage, favicon)
- **Canonical:** Domain-based (e.g., bakedbot.ai/thrivesyracuse or thrivesyracuse.bakedbot.ai)
- **Structured Data:** Not implemented; potential improvement for product schema

### Age Gate

- **Implementation:** `MenuWithAgeGate` wrapper component
- **Gate:** `AgeGateSimpleWithEmail` modal (Yes/No buttons, email capture)
- **Storage:** localStorage key `age_verified` (boolean) + email to Firestore
- **Source Tracking:** `source` param (e.g., 'brand-menu-thrivesyracuse') for analytics
- **Compliance:** COPPA/TCPA compliant (email opt-in); no age/DOB collected
- **Bypass:** localStorage check on mount; if verified, gate hidden

### Performance Characteristics

| Metric | Target | Notes |
|---|---|---|
| **SSR Page Load** | <2s | Firestore queries + CannMenus retailer lookup (5s timeout) |
| **Client Hydration** | <1s | Product normalization + initial filter calculation |
| **Filter/Search** | <100ms | Client-side array filter + sort (useMemo) |
| **Product Detail Modal** | Instant | Already loaded in `allProducts` array |
| **Image Load** | Lazy | Next.js Image component (future improvement) |
| **Cart Operations** | Instant | Zustand in-memory |

**Bottlenecks:**
1. CannMenus API (`findRetailersCarryingBrand`) — 5s timeout; fallback to local Firestore if slow
2. Featured brands query — parallel to products; fails gracefully
3. Carousel fetch — parallel; fails gracefully

**Optimizations Already In Place:**
- Products normalized at component mount (useMemo)
- Firestore snapshot cached server-side (no N+1 queries)
- Image placeholders: Fallback to Smokey icon (`/icon-192.png`) if missing
- Favorites stored locally (no network round-trip)

### Edge Cases

| Case | Behavior |
|---|---|
| **No products** | "No products found" card; clear filters button |
| **No retailers** | Brand page still loads; "Find Pickup Location" CTA hidden |
| **Out of stock** | Stock status displayed on card; add-to-cart still enabled (server validates) |
| **Missing product image** | Fallback to Smokey mascot (`/icon-192.png`) |
| **Stock undefined** | Treated as in-stock (POS data not always available) |
| **Empty search/category** | Grid empties; shows helpful message |
| **Slow retailer fetch** | 5s timeout → falls back to empty list; page still loads |
| **Slow bundle fetch** | Falls back to default mock bundles or skips section |
| **Slow carousel fetch** | Shows featured products section instead |
| **Brand not found** | SSR returns friendly 404 with dashboard link |
| **Chatbot disabled** | Chatbot component not rendered if `brand.chatbotConfig.enabled === false` |

---

## 5. User Stories

### As a customer browsing a brand menu:

1. **Discovery:** "I visit bakedbot.ai/thrivesyracuse and see a hero with the brand logo + featured products immediately"
2. **Search:** "I type 'sativa' in the search bar and see only sativa products instantly (no loading)"
3. **Filtering:** "I click 'Edibles' category and the grid updates to show only edibles"
4. **Product Details:** "I click a product card to see THC%, effects, description, and pricing"
5. **Add to Cart:** "I click 'Add to Cart' and see the quantity update in the header and item added to cart sidebar"
6. **Locate Pickup:** "I click 'Find Pickup Location', enter my zip, and see a map of nearby dispensaries"
7. **Checkout:** "I select a dispensary and proceed to checkout to complete my order"
8. **Shipping Option:** "If the brand ships online, I proceed to shipping checkout instead of locator"

### As a dispensary owner managing the menu:

1. **Reorder Products:** "I drag products in the 'Menu' tab to set the custom sort order (in dashboard)"
2. **Feature Products:** "I pin top sellers to float them above others"
3. **Manage Prices:** "I update product prices in the POS; they sync to the public menu"
4. **View Performance:** "I see product analytics (views, add-to-carts, checkouts)"

### As a content manager:

1. **Create Carousels:** "I upload images and product selections to create custom sections (dashboard)"
2. **Set Loyalty Bar:** "I configure the loyalty/discount messaging shown on the menu (dashboard)"
3. **Feature Brands:** "I select partner brands to appear in the 'Featured Brands' carousel (dashboard)"

---

## 6. Architecture

### High-Level Diagram

```
Browser
  ↓
[brand].page.tsx (SSR, Next.js 15 App Router)
  ├─ await params (dynamic route)
  ├─ await fetchBrandPageData(brandParam)
  │  └─ createServerClient() → Firestore
  │     ├─ brands collection
  │     ├─ tenants/{orgId}/publicViews/products
  │     ├─ CannMenusService.findRetailersCarryingBrand (async, 5s timeout)
  │     ├─ getFeaturedBrands(orgId)
  │     ├─ getCarousels(orgId)
  │     └─ getPublicMenuSettings(orgId)
  └─ return JSX with data
       ↓
    MenuWithAgeGate (client, checks localStorage)
       ↓
    BrandMenuClient (client, useState + useMemo)
       ├─ State management: Zustand cart store
       ├─ Filters: category, search, effects (all client-side)
       ├─ Favorites: localStorage
       └─ Views: shop → locator → checkout (conditional branching)
```

### Client Component Tree

```
BrandMenuClient (1,102 lines)
├─ BrandMenuHeader (search, cart, location button)
├─ BrandHero (logo, stats, CTA)
├─ Carousels[] (dynamic from Firestore)
│  └─ ProductSection (scroll carousel)
├─ CategoryGrid (clickable icons)
├─ BundleDealsSection (optional)
├─ ProductSection (featured/deals)
├─ All Products
│  └─ Filters + Grid
│     └─ OversizedProductCard[] (add-to-cart, favorite, detail click)
├─ CartSlideOver (edit quantities, clear cart, checkout)
├─ ProductDetailModal (full info, effects, reviews)
├─ CheckoutFlow or ShippingCheckoutFlow (conditional)
├─ DispensaryLocatorFlow (conditional, local_pickup model)
├─ DemoFooter (location, hours, contact)
├─ Chatbot (optional)
└─ MenuInfoBar (dispensary mode, optional)
```

### State Management

**Zustand Store (`useStore`):**
```typescript
{
  cartItems: Product[], // with quantity, retailerId
  addToCart(product, retailerId),
  removeFromCart(productId),
  updateQuantity(productId, newQty),
  clearCart(),
  setSelectedRetailerId(id),
  setSelectedBrandId(id),
  setPurchaseMode('pickup' | 'shipping'),
}
```

**Component State (useState):**
- `searchQuery`: string
- `categoryFilter`: string ('all' or category name)
- `sortBy`: string ('popular' | 'price-low' | 'price-high' | 'thc-high' | 'name')
- `selectedProduct`: Product | null (detail modal)
- `selectedDispensary`: { id, name, address, city, state, zip, phone?, hours? } | null
- `favorites`: Set<string> (from localStorage)
- `cartOpen`: boolean (slide-over visible)
- `brandView`: 'shop' | 'locator' | 'checkout' | 'shipping-checkout'

**Computed (useMemo):**
- `normalizedProducts`: products with image cleanup + category normalization
- `filteredProducts`: search + category + effects applied; sorted
- `categories`: extracted from products
- `categoryGridData`: with counts and icons
- `featuredProducts`: top 8 by likes
- `dealProducts`: price < $30

---

## 7. Test Plan

### Unit Tests (Jest)

- [ ] `filterProducts()` — validates search, category, effects filtering logic
- [ ] `sortProducts()` — validates sort order (popular, price, THC, name)
- [ ] `normalizeCategory()` — handles POS category variations
- [ ] `isRealImage()` — filters unsplash URLs, placeholders
- [ ] `getDealBadge()` — returns correct badge for price thresholds
- [ ] `cart.addToCart()` — adds product with correct retailer ID
- [ ] `cart.updateQuantity()` — updates or removes on 0 quantity
- [ ] `favorites.toggle()` — adds/removes from Set, persists to localStorage

### Integration Tests (Playwright)

- [ ] **Load brand page:** SSR succeeds, hydration instant, hero visible
- [ ] **Search filter:** Type "sativa" → products update within 100ms
- [ ] **Category filter:** Click "Edibles" → grid updates
- [ ] **Sort by price:** Select "Low to High" → products re-sorted
- [ ] **Add to cart:** Click "Add to Cart" → count increments, sidebar shows item
- [ ] **Detail modal:** Click product card → modal opens with details
- [ ] **Favorite toggle:** Click heart icon → persists to localStorage
- [ ] **Cart checkout:** Select dispensary → "Checkout" → checkout view
- [ ] **Shipping model:** online_only brand → shipping checkout (not locator)
- [ ] **Empty menu:** 0 products → "No products found" message
- [ ] **Slow load:** 3s retailer fetch → page renders, list appears after timeout

### Performance Tests

- [ ] **Lighthouse:** FCP <1.5s, LCP <2.5s, CLS < 0.1
- [ ] **Core Web Vitals:** Pass on real hardware (Moto G)
- [ ] **Search latency:** 100 products + filter/sort < 50ms
- [ ] **Image load:** Lazy loading after scroll-into-view

### Manual Smoke Tests

- [ ] Load `bakedbot.ai/thrivesyracuse` → Hero, featured products visible within 2s
- [ ] Search for product → instant results
- [ ] Click product → modal shows details, effects, price
- [ ] Add 3 to cart → cart shows 3 items
- [ ] "Find Pickup Location" → zip search, map, list
- [ ] Select dispensary → banner shows location, checkout enabled
- [ ] Proceed to checkout → order summary, pickup time
- [ ] Go back to shop → filters reset, cart retained
- [ ] Reload page → cart cleared (expected), favorites persisted
- [ ] Mobile (iPhone 12): Responsive, filters stack, touch works
- [ ] Dark mode (if supported): Text readable, no contrast issues

---

## 8. Rollback Plan

| Strategy | Details |
|---|---|
| **Single commit revert?** | Yes — `git revert <commit>` or `git reset --hard <previous>` |
| **Feature flag?** | Not implemented; could add boolean flag at component render level |
| **Data migration rollback?** | N/A — No schema changes; all data read-only |
| **Downstream services?** | None — Public menu read-only; does not trigger backend except checkout |

**Rollback Procedure:**
1. Identify problematic commit
2. Revert via `git revert <hash>` (safe) or `git reset --hard <hash>` (destructive)
3. Push to main → Firebase CI/CD auto-deploys (~5 min)
4. Validate on production URL
5. Notify stakeholders (Slack alert)

**Monitoring During Rollout:**
- Firestore query latency (<500ms p50, <2s p99)
- CannMenus API latency (count timeouts in logs)
- Error tracking (Sentry, Firebase Crashlytics)
- Customer support queue (spike = likely issue)

---

## 9. Success Criteria

- [ ] **Load Performance:** <2s on 3G (Lighthouse), <500ms on fiber
- [ ] **Filter Performance:** Search/sort/category <100ms (perceived instant)
- [ ] **Mobile Responsive:** Functional on iOS Safari, Android Chrome
- [ ] **Cart Functionality:** Add/remove/update works; persists within session
- [ ] **Checkout Flows:** Shipping and local pickup complete without errors
- [ ] **Age Gate:** Loads before menu; persists across reloads; COPPA compliant
- [ ] **SEO:** OG tags render; favicon loads; indexed by Google
- [ ] **Accessibility:** ARIA labels; keyboard navigation (Tab, Enter, Escape)
- [ ] **Cross-Browser:** Chrome, Firefox, Safari, Edge (latest 2 versions)
- [ ] **Error Handling:** Graceful fallbacks if Firestore down, API times out, images missing
- [ ] **Analytics:** Track page view, product impression, add-to-cart, checkout events
- [ ] **No Regressions:** Chatbot, loyalty bar, bundle deals still work
- [ ] **Zero Security Issues:** No XSS via product description, localStorage injection, auth bypass

---

## Approval

- [x] **Spec reviewed by:** Production spec for existing implementation
- [x] **Approved to implement:** Yes (already implemented)
- [ ] **Modifications required:** None

---

## Appendix: Key Implementation Notes

### Product Image Fallback Logic

Fallback to Smokey icon if URL matches:
- Contains `unsplash.com` (stock photos)
- Contains `placeholder` (test data)
- Starts with `/icon` or `/bakedbot` (leaked mascot)
- Empty string

### Category Normalization

`normalizeCategoryName()` handles POS variations:
- `PRE-ROLL`, `PREROLL`, `pre-roll`, `pre roll` → `Pre-roll`
- `VAPE`, `VAPORIZER` → `Vapes`
- `concentrate`, `dabs`, `wax`, `shatter` → `Concentrates`

### Sort Order Priority

**Most Popular sorting:**
1. Featured products float to top (`featured === true`)
2. Custom operator sort (`sortOrder` field, lower = higher)
3. Likes as tiebreaker (higher = higher)
4. Alphabetical as final tiebreaker

### Retailer Fetching Strategy

1. **Primary:** CannMenusService.findRetailersCarryingBrand() (~1s, 5s timeout)
2. **Fallback 1:** Local Firestore `retailers` query by `brandIds` array
3. **Fallback 2:** Empty list (retailers optional)

### Cart State Lifecycle

1. **Session-Scoped:** Zustand in-memory (no persistence)
2. **Lost on Reload:** Intentional (reduces fraud risk)
3. **Favorites:** Persisted to localStorage (`favorites-{brandId}`)
4. **Checkout:** Cart submitted to backend, state cleared

### Menu Design Auto-Detection

- If `brand.type === 'dispensary'` OR `brand.menuDesign === 'dispensary'` → Render dispensary menu
- Otherwise → Render brand menu (default)
- Products from `tenants/{orgId}/publicViews` auto-set to 'dispensary'

---

*This spec documents the Public Menu system as of 2026-02-20.*
