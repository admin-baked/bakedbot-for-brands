# Production Spec: Public Menu Pages

**Last updated:** 2026-02-19
**Spec status:** 🔴 Gaps Identified
**Owner agents:** Smokey (Budtender — recommendations), Leo (COO — sync orchestration)
**Tier:** 1 — Customer-Facing, Revenue

---

## 1. Feature Overview

Public Menu Pages are the customer-facing storefront for BakedBot brands. They serve the product catalog, enable product discovery and ordering, and reflect the dispensary's brand identity. There are three page types: brand pages (`/[brand]` — e.g., `/thrivesyracuse`), dispensary pages (`/dispensaries/[slug]`), and international destination pages (`/destination/[country]/[city]`). All pages use Next.js ISR (incremental static regeneration) with a 4-hour cache. Pages must handle age gating, feature effects filtering, display brand names and weights on product cards, and show the configurable loyalty/discount bar.

These pages are what customers see — they are the top of the conversion funnel and must be fast, accurate, and compliant.

---

## 2. Current State

### Shipped ✅
- Brand pages at `src/app/[brand]/page.tsx` (ISR, 4h cache)
- Dispensary pages at `src/app/dispensaries/[slug]/page.tsx` (ISR, 4h cache)
- International destination pages at `src/app/destination/[country]/[city]/page.tsx` (ISR, 4h cache)
- Age gate component (`src/components/menu/menu-with-age-gate.tsx`) — client-side verification
- Effects filter pills derived from real product data (not hardcoded)
- Brand name display on product cards (from `brandName` POS field)
- Weight display on product cards
- Product sort: `popular` → `sortOrder` first, then `likes` as tiebreaker
- Featured products float to top
- Configurable loyalty/discount bar (`src/components/demo/menu-info-bar.tsx`) — defaults hidden, enabled per org in settings
- `getPublicMenuSettings()` server action — public (no auth), fetches org's loyalty/discount config
- ISR support for Thailand/Koh Samui (multi-region)
- Featured Brands carousel with logos on Thrive menu
- Smokey recommendation integration (product search + upsells)
- `BrandMenuClient` + `DispensaryMenuClient` — separate client components per page type

### Partially Working ⚠️
- SEO metadata completeness — title/description tags present but OG images, structured data (cannabis retailer schema) not verified
- Mobile responsiveness — built with Tailwind responsive classes but no formal mobile test suite
- Search functionality within menu — filter/search by product name, strain, effects — completeness varies by page type
- Smokey chatbot integration on public menu — Smokey can answer questions, but handoff to order flow unclear

### Not Implemented ❌
- Server-side age verification (current gate is client-only; JS-disabled browsers see unredacted menu)
- On-demand ISR cache invalidation after POS sync (`revalidatePath()` not called on sync)
- E2E tests for public menu pages (Playwright)
- Load testing (product grids with 500+ products)
- Structured data / JSON-LD for SEO (cannabis retailer, product schema)
- Sitemap auto-generation for brand/dispensary pages

---

## 3. Acceptance Criteria

### Functional
- [ ] Brand page renders correct product catalog within 4h of POS sync (ISR freshness window)
- [ ] All products include: name, price, THC%, CBD%, weight, brandName, effects pills
- [ ] Featured products appear first in the grid
- [ ] Sort order from drag-to-reorder in dashboard is reflected on public menu
- [ ] Effects filter pills correctly filter product grid (no products shown with non-matching effects)
- [ ] Loyalty/discount bar shows only when org has enabled it in settings; hidden otherwise
- [ ] Age gate is present and requires confirmation before menu content is visible
- [ ] Configurable menu info bar shows delivery fee, minimum, tagline when configured
- [ ] Brand page loads in < 2s (Time to First Byte < 200ms with ISR cache warm)
- [ ] Dispensary page 404s gracefully if slug doesn't match any dispensary

### Compliance / Security
- [ ] Age gate cannot be bypassed by JS-disabled clients (or: documented as known limitation with server-side gate on roadmap)
- [ ] `getPublicMenuSettings()` is truly public — no auth token required, no org-internal data leaked
- [ ] Product prices shown are current (within POS sync freshness window) — no stale prices from 24h+ ago
- [ ] Cannabis product pages include required state-specific disclaimers where applicable
- [ ] No customer PII collected or logged from public menu page loads

### Performance
- [ ] ISR cache hit rate > 95% during normal operation (not regenerating on every request)
- [ ] Product grid with 500 items renders without layout shift (CLS < 0.1)
- [ ] Image loading: product images use Next.js `<Image>` with `priority` for above-fold items
- [ ] Effects filter is client-side (no round-trip) for instant UX

---

## 4. Known Gaps / Tech Debt

| Gap | Severity | Notes |
|-----|----------|-------|
| Age gate is client-only (JS bypass possible) | 🔴 Critical | Users can disable JS and see cannabis product catalog — regulatory violation in some states |
| ISR cache not invalidated on POS sync | 🟡 High | Menu up to 4h stale after product/price change; customers could see wrong prices |
| No E2E tests for public pages | 🟡 High | No regression protection on highest-traffic pages |
| SEO structured data missing (JSON-LD) | 🟡 High | Dispensary pages won't rank well without product/retailer schema |
| Mobile responsiveness not formally tested | 🟢 Low | ~60% of cannabis consumers browse on mobile |
| Sitemap not auto-generated for brand/dispensary pages | 🟢 Low | Google may not discover new pages promptly |
| No load test with 500+ product catalogs | 🟢 Low | Thrive has ~200 products; larger catalogs untested |
| Smokey chatbot → order handoff flow unclear | 🟢 Low | Chatbot on public menu can recommend but unclear how customer proceeds to checkout |

---

## 5. Test Coverage

### Existing Tests
| Test | Location | Coverage |
|------|----------|---------|
| None found for public menu pages | — | No test files identified |

### Missing Tests (Required for Production-Ready)
- [ ] `brand-page.e2e.test.ts` — renders product grid, shows age gate, effects filter works, loyalty bar hidden by default
- [ ] `brand-page.e2e.test.ts:age-gate` — age gate present before product content visible
- [ ] `brand-page.e2e.test.ts:sort-order` — featured products first, custom sort order respected
- [ ] `dispensary-page.e2e.test.ts` — basic render + 404 on unknown slug
- [ ] `menu-info-bar.unit.test.ts` — bar hidden when disabled, shows correct text when enabled
- [ ] `public-menu-settings.unit.test.ts` — `getPublicMenuSettings()` returns null for unconfigured orgs without throwing

### Golden Set Eval
_Public menu pages are server-rendered; no LLM content in the rendering path. No golden set required for pages themselves. Smokey recommendations on the chatbot are covered by `smokey-qa.json`._

---

## 6. Dependencies

### Internal
| System | Why needed | Failure mode |
|--------|-----------|-------------|
| POS Sync | Populates product catalog served on page | Stale products (4h ISR window) if sync fails |
| Firestore (products collection) | ISR build fetches products at generation time | Page serves empty grid or last cached products |
| `getPublicMenuSettings()` | Loyalty/discount bar config | Bar hidden (default behavior) — acceptable degraded mode |
| Smokey agent | Chatbot recommendations on menu | Chatbot unavailable; static menu still renders |

### External Services
| Service | Purpose | Fallback |
|---------|---------|---------|
| Firebase Storage | Product images, brand logos | Broken image placeholder — acceptable |
| Next.js ISR (Firebase App Hosting) | Static generation + revalidation | Full SSR fallback — slower but functional |

---

## 7. Degraded Mode

- **If POS sync fails:** ISR serves last-generated product set. Age at time of last sync shown to customers via freshness indicator (if implemented). Maximum staleness = 4h (ISR window).
- **If Firestore is down during ISR regeneration:** ISR regeneration fails; serve last successful static build. Alert via Slack.
- **If Smokey is down:** Public menu renders without chatbot. Product grid unaffected.
- **Data loss risk:** None — pages are read-only views of Firestore data.

---

## 8. Open Questions

1. **Server-side age gate**: Should the age gate be moved server-side? (HTTP cookie check or middleware redirect) — needed for strict regulatory compliance. Currently JS bypass is possible.
2. **ISR invalidation on sync**: Should `revalidatePath('/[brand]')` be called immediately after every POS sync? This would eliminate the 4h staleness window but increase server load.
3. **Price accuracy SLA**: What's the acceptable freshness window for product prices? 4h may be acceptable for most operations but problematic during active promotions or flash sales.
4. **International pages compliance**: Herbalist Samui (Thailand) — do Thai cannabis advertising regulations apply to the public page? Different disclaimer requirements?
5. **Order flow**: When a customer on the public menu clicks "Order" or gets a Smokey recommendation, where do they go? The order handoff to retail partner is unclear from the codebase audit.

---

## Revision History

| Date | Author | Change |
|------|--------|--------|
| 2026-02-19 | Claude Code (audit) | Initial draft — based on codebase audit |
