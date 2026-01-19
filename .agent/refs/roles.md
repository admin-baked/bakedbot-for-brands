# Roles Reference

## Overview
BakedBot uses role-based access control (RBAC) with hierarchical permissions.

---

## Role Hierarchy

### Current Implementation (v1 — Simplified)

| Role | Level | Scope | Description |
|------|-------|-------|-------------|
| `super_user` | 5 | Platform | Full unrestricted access (formerly `super_admin`, `owner`, `executive`) |
| `brand` | 3 | Brand | Brand owner/manager (unified role) |
| `dispensary` | 3 | Retailer | Dispensary owner/manager (unified role) |
| `budtender` | 2 | Retailer | Dispensary employee (read-only for products/orders) |
| `customer` | 1 | Self | End consumer |

> [!NOTE]
> Legacy roles (`owner`, `executive`, `super_admin`) are automatically mapped to `super_user` at authentication time in `src/middleware/require-role.ts`.

### Future Enhancement (v2 — Team Hierarchy)

| Role | Level | Scope | Description |
|------|-------|-------|-------------|
| `super_user` | 5 | Platform | Full unrestricted access |
| `brand_admin` | 3 | Brand | Brand owner with billing/team access |
| `brand_member` | 2 | Brand | Brand team member (limited admin access) |
| `dispensary_admin` | 3 | Retailer | Dispensary owner with billing/team access |
| `dispensary_staff` | 2 | Retailer | Dispensary employee |
| `budtender` | 2 | Retailer | Dispensary front-line staff |
| `customer` | 1 | Self | End consumer |

---

## Role Type

### Current Implementation
```typescript
// src/types/roles.ts
export type UserRole = 
  | 'super_user' 
  | 'super_admin'  // Legacy, maps to super_user
  | 'brand' 
  | 'dispensary' 
  | 'customer' 
  | 'budtender';
```

### Future Enhancement
```typescript
export type UserRole = 
  | 'super_user'
  | 'brand_admin'
  | 'brand_member'
  | 'dispensary_admin'
  | 'dispensary_staff'
  | 'budtender'
  | 'customer';
```

---

## Permission Matrix

### Current Implementation

| Permission | super_user | brand | dispensary | budtender | customer |
|------------|------------|-------|------------|-----------|----------|
| `admin:all` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `read:products` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `write:products` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `read:orders` | ✅ | ✅ | ✅ | ✅ | ✅ (own) |
| `write:orders` | ✅ | ❌ | ✅ | ✅ | ❌ |
| `read:analytics` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `manage:campaigns` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `manage:playbooks` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `manage:agents` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `manage:brand` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `manage:users` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `sync:menus` | ✅ | ✅ | ❌ | ❌ | ❌ |

### Future Enhancement (brand_admin vs brand_member)

| Permission | super_user | brand_admin | brand_member | dispensary_admin |
|------------|------------|-------------|--------------|------------------|
| `manage:products` | ✅ | ✅ | ✅ | ❌ |
| `manage:customers` | ✅ | ✅ | ✅ | ✅ |
| `manage:playbooks` | ✅ | ✅ | ❌ | ✅ |
| `manage:billing` | ✅ | ✅ | ❌ | ✅ |
| `manage:team` | ✅ | ✅ | ❌ | ✅ |
| `view:analytics` | ✅ | ✅ | ✅ | ✅ |
| `super_admin_access` | ✅ | ❌ | ❌ | ❌ |

---

## Dashboard Routing

| Role | Dashboard | Path |
|------|-----------|------|
| `super_user` | CEO Boardroom | `/dashboard/ceo` |
| `brand` | Brand Console | `/dashboard/brand` |
| `dispensary` | Dispensary Console | `/dashboard/dispensary` |
| `budtender` | Dispensary Console | `/dashboard/dispensary` |
| `customer` | Customer Portal | `/dashboard/customer` |

---

## Checking Permissions

### Server Actions (Recommended)
```typescript
import { requireUser } from '@/server/auth/auth';

// Require authentication only
const user = await requireUser();

// Require specific roles
const user = await requireUser(['brand', 'super_user']);
```

### RBAC Helpers
```typescript
import { hasPermission, requirePermission, canAccessBrand } from '@/server/auth/rbac';

// Soft check
if (hasPermission(user, 'write:products')) {
  // allowed
}

// Hard check (throws if denied)
requirePermission(user, 'manage:billing');

// Brand access check
if (canAccessBrand(user, brandId)) {
  // allowed to access this brand's data
}
```

### API Routes
```typescript
import { requireRole, requireBrandAccess } from '@/middleware/require-role';

export async function GET(req: NextRequest) {
  const user = await requireRole(req, 'brand');
  // or
  const user = await requireBrandAccess(req, brandId);
}
```

---

## Tenant Scoping

Users are scoped to their tenant:
- **Brands**: `brandId` in session/token
- **Dispensaries**: `locationId` in session/token

```typescript
// Data queries are always scoped
const products = await db.collection('products')
  .where('brandId', '==', user.brandId)
  .get();
```

---

## Related Files

| File | Purpose |
|------|---------|
| `src/types/roles.ts` | Role type definitions |
| `src/server/auth/auth.ts` | `requireUser()` server action helper |
| `src/server/auth/rbac.ts` | Permission matrix and access checks |
| `src/middleware/require-role.ts` | API route middleware |
| `src/lib/with-auth.tsx` | Client-side HOC for route protection |
| `src/hooks/use-user-role.ts` | Client-side role hook |
| `src/hooks/use-dashboard-config.ts` | Role-based navigation |
| `src/server/services/tool-permissions.ts` | Agent tool permission system (separate from RBAC) |
