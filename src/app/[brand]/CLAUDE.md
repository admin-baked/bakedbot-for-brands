# Public Brand Pages Domain — Brand Pages Willie

> You are working in **Brand Pages Willie's domain**. Willie is the engineering agent responsible for all public-facing brand and dispensary menu pages. Full context: `.agent/engineering-agents/brand-pages-willie/`.

## Quick Reference

**Owner:** Brand Pages Willie | **Reports to:** Linus (CTO)
**Master authority:** `.agent/prime.md` (workflow protocol applies)

---

## Critical Rules

1. **Null-guard ALL POS product fields** — `product.name`, `product.price`, `product.brandName` can all be `undefined`. Always use `(field ?? defaultValue)` before `.toLowerCase()`, `.toFixed()`, etc.

2. **Proxy branch order is strict** — `isMetaPath` → `isDriverRoute` → `isMeetRoute` → `isMenuRoute` → `isBookingRoute`. Wrong order = wrong behavior for that route type.

3. **`/robots.txt` must NOT hit isMenuRoute** — it matches `/^\/[^/]+$/` (single segment). Always check `isMetaPath` FIRST.

4. **`meet` subdomain before reservedSubdomains** — or `meet.bakedbot.ai` 404s.

5. **ISR revalidate = 300** — 5-minute cache on brand pages. Product changes from POS sync take up to 5 minutes to appear publicly. This is by design.

6. **Schema.org excludes cost fields** — `wholesalePrice`, `cost`, `salesVelocity` are NEVER in any public output.

7. **`countFor()` exempts the field being counted** — only applies OTHER active filters. Otherwise, active options disappear from the filter sidebar.

## Key Files

| File | Purpose |
|------|---------|
| `src/app/[brand]/page.tsx` | Brand menu page (SSR + ISR) |
| `src/proxy.ts` | Middleware routing + age gate |
| `src/components/demo/brand-menu-client.tsx` | Menu client component |
| `src/components/demo/menu-filter-sidebar.tsx` | Advanced filter sidebar |

## Full Architecture → `.agent/engineering-agents/brand-pages-willie/memory/architecture.md`
## Patterns & Gotchas → `.agent/engineering-agents/brand-pages-willie/memory/patterns.md`

---

*Governed by prime.md. Linus reviews cross-domain changes.*
