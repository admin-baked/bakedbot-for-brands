# Authentication Reference

## Overview
BakedBot uses Firebase Authentication with custom role-based access control.

---

## Auth Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client (Browser)                        │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐      │
│  │ Firebase    │   │ Session     │   │ Role        │      │
│  │ Auth SDK    │──▶│ Cookie      │──▶│ Context     │      │
│  └─────────────┘   └─────────────┘   └─────────────┘      │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     Server (Next.js)                        │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐      │
│  │ getServer   │   │ Role        │   │ Permission  │      │
│  │ Session()   │──▶│ Resolver    │──▶│ Check       │      │
│  └─────────────┘   └─────────────┘   └─────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

## Session Management

### Getting Session (Server)
```typescript
import { getServerSession } from '@/lib/auth';

export async function myAction() {
  const session = await getServerSession();
  if (!session) {
    throw new Error('Unauthorized');
  }
  
  const { userId, role, brandId, retailerId } = session;
}
```

### Session Shape
```typescript
interface UserSession {
  userId: string;
  email: string;
  displayName?: string;
  role: UserRole;
  brandId?: string;      // For brand users
  retailerId?: string;   // For dispensary users
  isSuperUser: boolean;
  photoURL?: string;
}
```

---

## Role Hierarchy

| Role | Level | Access |
|------|-------|--------|
| `super_admin` | 5 | Full platform access |
| `bakedbot_staff` | 4 | Internal team |
| `brand_admin` | 3 | Brand owner |
| `brand_member` | 2 | Brand team |
| `dispensary_admin` | 3 | Dispensary owner |
| `dispensary_staff` | 2 | Dispensary team |
| `customer` | 1 | End consumer |
| `guest` | 0 | Unauthenticated |

### Role Type Definition
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

## Permission Checks

### File: `src/server/services/permissions.ts`

```typescript
import { hasPermission, requirePermission } from '@/server/services/permissions';

// Check permission
if (hasPermission(session, 'manage_products')) {
  // allowed
}

// Throw if denied
requirePermission(session, 'manage_playbooks');
```

### Common Permissions
| Permission | Required Role |
|------------|---------------|
| `manage_products` | brand_member+ |
| `manage_customers` | brand_member+ |
| `manage_playbooks` | brand_admin+ |
| `manage_billing` | brand_admin+ |
| `manage_team` | brand_admin+ |
| `view_analytics` | brand_member+ |
| `super_admin_access` | super_admin |

---

## Super User Protocol

Super Users (`super_admin` role) have special privileges:

1. **Bypass All Paywalls** — Access all features without subscription
2. **View All Tenants** — Can switch context to any brand/dispensary
3. **Full Tool Access** — Agent Discovery, Advanced Analytics
4. **Executive Boardroom** — Access to CEO dashboard

### Checking Super User
```typescript
const isSuperUser = session.role === 'super_admin' || session.isSuperUser;
```

---

## Dashboard Routing

Users are routed to role-appropriate dashboards:

| Role | Dashboard | Path |
|------|-----------|------|
| `super_admin` | CEO Boardroom | `/dashboard/ceo` |
| `brand_admin` | Brand Console | `/dashboard/brand` |
| `dispensary_admin` | Dispensary Console | `/dashboard/dispensary` |
| `customer` | Customer Portal | `/dashboard/customer` |

### Route Protection
```typescript
// In page.tsx
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth';

export default async function ProtectedPage() {
  const session = await getServerSession();
  
  if (!session) {
    redirect('/login');
  }
  
  if (session.role !== 'brand_admin') {
    redirect('/unauthorized');
  }
  
  return <PageContent />;
}
```

---

## Login Methods

1. **Email/Password** — Standard Firebase Auth
2. **Google OAuth** — For quick signup
3. **Super Admin Login** — Component: `src/components/super-admin-login.tsx`

---

## Related Files
- `src/lib/auth.ts` — Session utilities
- `src/server/auth/` — Auth middleware
- `src/server/services/permissions.ts` — RBAC
- `src/components/auth/` — Login components
