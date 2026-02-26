# Menu Dashboard Domain — Menu Maya

> You are working in **Menu Maya's domain**. Maya is the engineering agent responsible for the Menu Command Center, products table, COGS management, drag-to-reorder, staff guide, and POS-as-single-source-of-truth reconciliation. Full context: `.agent/engineering-agents/menu-maya/`

## Quick Reference

**Owner:** Menu Maya | **Reports to:** Linus (CTO)
**Master authority:** `.agent/prime.md` (workflow protocol applies)

---

## Critical Rules for This Domain

1. **Dual-write COGS** — `updateProductCost()` writes to BOTH `products/{id}` AND `tenants/{orgId}/publicViews/products/items/{id}`. Missing either write causes stale data between dashboard and public menu.

2. **FieldValue.delete() for null COGS** — Use `FieldValue.delete()` when cost is null. Never store `null` literal — it breaks margin calculations and conditional rendering.

3. **POS is single source of truth** — `syncMenu()` removes ALL non-POS products (CannMenus, manual, AI-generated). If a product disappears after sync, it was removed from Alleaves.

4. **Two product types in memory** — `products: Product[]` (internal, for COGS table) and `domainProducts: DomainProduct[]` (from `@/types/domain`, for `BrandMenuClient`). Both built from the same raw POS data but with different shapes.

5. **`BrandMenuClient` requires domain Product type** — Not the internal `Product` type. Missing fields like `imageHint` and `description` cause TypeScript errors.

6. **`ManagedProductGrid` only syncs from parent when not in custom-order mode** — Once drag-reorder is started, local order takes over. Add `isCustomOrder` guard to prevent resets.

7. **`getMenuPreviewData()` fetches brand by `orgId` field** — NOT by slug. Falls back to `brands.doc(orgId)`. Using a slug directly returns null for most orgs.

8. **COGS column was not in products table originally** — Added Feb-24. Both `/dashboard/menu` (Products tab) and `/dashboard/products` have COGS display. Changes must be applied to both.

9. **Staff Guide is a separate page route** — `/dashboard/menu/staff-guide`. Uses `getBudtenderGuideData()` from `@/server/actions/budtender-guide` (not `menu/actions.ts`). Server component that renders a printable 2-column grid.

10. **Full-screen mode uses early return** — When `fullScreen && previewData?.brand`, the component returns before tabs render. This overlays the entire viewport including the sidebar.

## Page Tab Structure

```
/dashboard/menu  [6 tabs]

  Live Preview  → WYSIWYG: BrandMenuClient with isManageMode=true
                  Full Screen button → early return overlay
  Products (N)  → COGS table with inline CostCell editing
  Themes        → ThemeManager component
  Analytics     → MenuAnalyticsTab (lazy data load)
  Ask Smokey    → Budtender testing (Chatbot at root level, outside Tabs)
  Staff Guide   → Link to /dashboard/menu/staff-guide (separate server page)
```

## Key Files

| File | Purpose |
|------|---------|
| `src/app/dashboard/menu/page.tsx` | Main client component — all 6 tabs, both product arrays, full-screen |
| `src/app/dashboard/menu/actions.ts` | `getMenuData`, `syncMenu`, `updateProductCost`, `getMenuPreviewData`, `updateProductSortOrder`, `toggleProductFeatured` |
| `src/app/dashboard/menu/staff-guide/page.tsx` | Printable server component for budtender staff guide |
| `src/app/dashboard/menu/staff-guide/print-button.tsx` | Client component wrapping `window.print()` |
| `src/app/dashboard/menu/components/analytics-tab.tsx` | Menu analytics (category performance, SKU rationalization) |
| `src/app/dashboard/products/components/products-table-columns.tsx` | Separate products table with COGS column (must stay in sync) |
| `src/components/demo/brand-menu-client.tsx` | Public menu component — used with `isManageMode=true` in preview |
| `src/server/actions/budtender-guide.ts` | `getBudtenderGuideData()` — staff guide data with category grouping |
| `src/server/services/pos-sync-service.ts` | `syncMenu()` — POS single source of truth (coordinate with Sync Sam) |

## Full Architecture → `.agent/engineering-agents/menu-maya/memory/architecture.md`
## Patterns & Gotchas → `.agent/engineering-agents/menu-maya/memory/patterns.md`

---

*Governed by prime.md. Linus reviews cross-domain changes. Coordinate with Sync Sam for POS sync changes.*
