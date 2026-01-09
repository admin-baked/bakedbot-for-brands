# Dispensary Pages Reference

## Overview
Dispensary Console for retail partners to manage their location, orders, and customers.

---

## Dashboard Structure

```
src/app/dashboard/dispensary/
├── page.tsx              # Main dashboard
├── dashboard-client.tsx  # Client component
├── actions.ts            # Server actions
├── components/           # Dispenary-specific components
│   ├── dispensary-playbooks-list.tsx
│   ├── dispensary-right-sidebar.tsx
│   └── ...
└── __tests__/            # Unit tests
```

---

## Key Pages

| Path | Description |
|------|-------------|
| `/dashboard/dispensary` | Main dashboard with KPIs |
| `/dashboard/orders` | Order management |
| `/dashboard/customers` | Customer CRM |
| `/dashboard/menu` | Menu management |
| `/dashboard/inventory` | Stock tracking |
| `/dashboard/promotions` | Deal management |

---

## Dashboard Components

### Right Sidebar
Shows real-time alerts:
- `productsNearOOS` — Low stock warnings
- `promosBlocked` — Compliance issues
- `menuSyncDelayed` — Sync status

### Playbooks List
Curated automations for dispensaries:
- Inventory alerts
- Customer win-back
- Promo scheduling

---

## Data Scoping

All queries are scoped by `retailerId`:

```typescript
const orders = await db.collection('orders')
  .where('retailerId', '==', session.retailerId)
  .get();
```

---

## Related Files
- `src/app/dashboard/dispensary/` — All dispensary pages
- `src/app/dashboard/orders/` — Order management
- `src/app/dashboard/customers/` — CRM
