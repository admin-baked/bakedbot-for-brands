# Brand Pages Willie — Patterns & Gotchas

## Critical Rules

### Rule 1: Always null-guard POS product fields
Products from Alleaves regularly arrive with `name: undefined`, `price: undefined`, `brandName: undefined`. Never access without null-guard.

```typescript
// ✅ CORRECT — in filteredProducts useMemo
.filter(p => (p.name ?? '').toLowerCase().includes(query))

// ❌ CRASH — killed Thrive's public menu (P0 bug, commit cca52a6e)
.filter(p => p.name.toLowerCase().includes(query))
```

### Rule 2: Proxy branch order is strict

```typescript
// ✅ CORRECT ORDER in proxy.ts
if (isMetaPath) return passThrough();        // 1. FIRST — meta bypasses everything
if (isDriverRoute) return passThrough();     // 2. driver bypasses age gate
if (isMeetRoute) return rewriteToMeet();     // 3. subdomain rewrite
if (isMenuRoute) return handleAgeGate();     // 4. brand slug pages
if (isBookingRoute) return passThrough();    // 5. /book/* bypass
```

### Rule 3: isMetaPath MUST exclude `isMenuRoute`
`/robots.txt` matches `/^\/[^/]+$/` — single path segment. Without isMetaPath check, robots.txt gets age-gated and returns HTML instead of text/plain.

```typescript
// Paths that bypass all middleware gates
const META_PATHS = ['/robots.txt', '/sitemap.xml', '/favicon.ico'];
const isMetaPath = META_PATHS.includes(pathname) ||
  pathname.startsWith('/_next/') ||
  pathname.startsWith('/api/');
```

### Rule 4: meet subdomain BEFORE reservedSubdomains
The `meet` subdomain rewrite must happen before the reserved subdomains check or `meet.bakedbot.ai` returns 404.

### Rule 5: ISR revalidate = 300 on brand pages
Public menu pages use ISR (Incremental Static Regeneration). `export const revalidate = 300` gives 5-minute cache. This means product changes from POS sync take up to 5 minutes to appear on public pages. This is by design.

---

## Common Mistakes

| Symptom | Root Cause | Fix |
|---------|-----------|-----|
| `/robots.txt` returns HTML age gate | `isMenuRoute` matched before `isMetaPath` | Add `isMetaPath` check first in proxy.ts |
| `/driver` redirects to age gate | Driver route not excluded before `isMenuRoute` | Add `isDriverRoute = pathname.startsWith('/driver')` |
| `meet.bakedbot.ai` 404s | Meet subdomain check comes after reservedSubdomains | Move meet rewrite before reserved list |
| Public menu TypeError crashes | `product.name.toLowerCase()` on undefined | `(product.name ?? '').toLowerCase()` everywhere |
| Price displays "NaN" or crashes | `product.price.toFixed(2)` on undefined | `(product.price ?? 0).toFixed(2)` everywhere |
| Filter counts show wrong numbers | `countFor()` applying counted field to itself | Only apply OTHER active filters in countFor |
| Filter state causes infinite re-render | Array state as useEffect dep recreates on each render | Use `searchParams.toString()` as single dep |
| Menu info bar shows nothing | `showBar` default false until enabled | Tell customer: Settings → Loyalty → Menu tab |
| AI crawler can't find brand data | Missing ai-content link in layout | `<link rel="ai-content" href="/{slug}/llm.txt" />` in layout.tsx |

---

## Adding a New Menu Filter Type

1. Add to `activeFilters` state shape
2. Add filter section to `MenuFilterSidebar` collapsible
3. Add to `filterProducts()` (AND with existing filters)
4. Add `countFor(newField, value)` support
5. Add URL param persistence in `useEffect([searchParams.toString()])`
6. Test: filter must stack correctly with all existing 5 filters
7. Test: countFor must exempt itself (only apply OTHER filters)

---

## Adding a New Proxy Route

When adding a new special route (new subdomain, new path pattern):

1. Identify where in the priority order it belongs
2. Add check BEFORE any checks it must override
3. Add to `isMetaPath` if it should bypass ALL gates
4. Test that existing routes still work (especially age gate)
5. Document the ordering reason in a comment

---

## Public Page Performance Checklist

Before shipping any public page change:
- [ ] `npm run check:types` passes
- [ ] All product field accesses null-guarded (`?? ''` or `?? 0`)
- [ ] ISR revalidate set correctly (300s for menu pages)
- [ ] Schema.org JSON-LD updated if product fields changed
- [ ] llm.txt generator updated if new product fields are public-facing
- [ ] No `wholesalePrice`, `cost`, or `salesVelocity` in any public output
- [ ] Proxy branch order unchanged (or documented if changed)
- [ ] Mobile filter drawer tested (Sheet component on mobile breakpoint)

---

*Patterns version: 1.0 | Created: 2026-02-26*
