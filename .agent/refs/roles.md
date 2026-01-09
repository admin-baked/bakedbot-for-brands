# Roles Reference

## Overview
BakedBot uses role-based access control (RBAC) with hierarchical permissions.

---

## Role Hierarchy

| Role | Level | Scope | Description |
|------|-------|-------|-------------|
| `super_admin` | 5 | Platform | Full unrestricted access |
| `bakedbot_staff` | 4 | Platform | Internal team |
| `brand_admin` | 3 | Brand | Brand owner/manager |
| `brand_member` | 2 | Brand | Brand team member |
| `dispensary_admin` | 3 | Retailer | Dispensary owner |
| `dispensary_staff` | 2 | Retailer | Dispensary employee |
| `customer` | 1 | Self | End consumer |
| `guest` | 0 | None | Unauthenticated |

---

## Role Type

```typescript
type UserRole = 
  | 'super_admin'
  | 'bakedbot_staff'
  | 'brand_admin'
  | 'brand_member'
  | 'dispensary_admin'
  | 'dispensary_staff'
  | 'customer'
  | 'guest';
```

---

## Permission Matrix

| Permission | super_admin | brand_admin | brand_member | dispensary_admin |
|------------|-------------|-------------|--------------|------------------|
| manage_products | ✅ | ✅ | ✅ | ❌ |
| manage_customers | ✅ | ✅ | ✅ | ✅ |
| manage_playbooks | ✅ | ✅ | ❌ | ✅ |
| manage_billing | ✅ | ✅ | ❌ | ✅ |
| manage_team | ✅ | ✅ | ❌ | ✅ |
| view_analytics | ✅ | ✅ | ✅ | ✅ |
| super_admin_access | ✅ | ❌ | ❌ | ❌ |

---

## Dashboard Routing

| Role | Dashboard | Path |
|------|-----------|------|
| `super_admin` | CEO Boardroom | `/dashboard/ceo` |
| `brand_admin` | Brand Console | `/dashboard/brand` |
| `brand_member` | Brand Console | `/dashboard/brand` |
| `dispensary_admin` | Dispensary Console | `/dashboard/dispensary` |
| `dispensary_staff` | Dispensary Console | `/dashboard/dispensary` |
| `customer` | Customer Portal | `/dashboard/customer` |

---

## Checking Permissions

```typescript
import { hasPermission, requirePermission } from '@/server/services/permissions';

// Soft check
if (hasPermission(session, 'manage_products')) {
  // allowed
}

// Hard check (throws if denied)
requirePermission(session, 'manage_billing');
```

---

## Tenant Scoping

Users are scoped to their tenant:
- **Brands**: `brandId` in session
- **Dispensaries**: `retailerId` in session

```typescript
// Data queries are always scoped
const products = await db.collection('products')
  .where('brandId', '==', session.brandId)
  .get();
```

---

## Related Files
- `src/lib/auth.ts` — Session management
- `src/server/services/permissions.ts` — RBAC logic
- `src/server/auth/` — Auth middleware
