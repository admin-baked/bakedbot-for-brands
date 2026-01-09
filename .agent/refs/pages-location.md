# Location Pages Reference

## Overview
SEO-optimized Location and Discovery pages for the National Rollout Strategy.

---

## The Claim Model

Mass-generated pages for every legal cannabis ZIP code:

1. **Unclaimed Page** ($0) — SEO presence, drives traffic
2. **Claim Pro** ($99/mo) — Verified badge, edits, analytics
3. **Founders Claim** — Scarcity-driven lifetime offer
4. **Coverage Packs** — Multi-ZIP visibility upsell

---

## Page Structure

```
src/app/(marketing)/
├── location/
│   └── [state]/
│       └── [city]/
│           └── page.tsx       # Location page
├── brand/
│   └── [slug]/
│       └── page.tsx           # Brand discovery page
└── dispensary/
    └── [slug]/
        └── page.tsx           # Dispensary profile
```

---

## Key Components

### Location Page
- City/state cannabis info
- Nearby dispensaries
- Brand availability
- "Claim This Area" CTA

### Brand Discovery
- Brand profile
- Product catalog
- Where to buy
- "Claim Your Brand" CTA

### Dispensary Profile
- Store info, hours
- Menu preview
- Location map
- Contact info

---

## Data Hydration

Pages are hydrated via waterfall:
1. CannMenus API
2. Leafly fallback
3. Firecrawl scraping

---

## Claim Flow

```
Unclaimed Page → Claim CTA → /claim → Subscription → Verification → Dashboard
```

---

## SEO Strategy

- Mass page generation for ZIP codes
- Schema markup for local SEO
- Dynamic meta tags
- Sitemap generation

---

## Related Files
- `src/app/(marketing)/location/` — Location pages
- `src/app/(marketing)/brand/` — Brand discovery
- `src/server/services/page-generator.ts` — Page generation
- `src/server/services/geo-discovery.ts` — Geo lookup
