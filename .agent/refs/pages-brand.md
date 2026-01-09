# Brand Pages Reference

## Overview
Brand Console for cannabis brands to manage products, analytics, and distribution.

---

## Dashboard Structure

```
src/app/dashboard/brand/
├── page.tsx              # Main dashboard
├── components/           # Brand-specific components
└── ...

Related areas:
├── products/             # Product catalog
├── analytics/            # Revenue & performance
├── marketing/            # Campaigns
├── competitive-intel/    # Ezal insights
├── customers/            # B2B CRM
└── promotions/           # Deals & offers
```

---

## Key Pages

| Path | Description |
|------|-------------|
| `/dashboard/brand` | Main dashboard |
| `/dashboard/products` | Product catalog management |
| `/dashboard/analytics` | Sales & performance metrics |
| `/dashboard/marketing` | Campaign builder |
| `/dashboard/competitive-intel` | Competitor analysis |
| `/dashboard/customers` | B2B customer management |
| `/dashboard/promotions` | Deals & special offers |
| `/dashboard/distribution` | Retailer network map |

---

## Core Features

### Product Management
- Add/edit products
- Bulk import (CSV)
- SEO optimization
- Variant management

### Analytics
- Revenue tracking
- Channel performance
- Retailer insights
- Demand forecasting

### Competitive Intelligence
- Competitor monitoring (Ezal)
- Price comparison
- Market positioning

---

## Data Scoping

All queries scoped by `brandId`:

```typescript
const products = await db.collection('products')
  .where('brandId', '==', session.brandId)
  .get();
```

---

## Related Files
- `src/app/dashboard/brand/` — Brand dashboard
- `src/app/dashboard/products/` — Product pages
- `src/app/dashboard/analytics/` — Analytics
- `src/app/dashboard/intelligence/` — Competitive intel
