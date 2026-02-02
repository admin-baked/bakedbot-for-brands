// src/server/auth/rbac.ts

import { DomainUserProfile } from '@/types/domain';
import { 
    UserRole as RoleType, 
    isBrandRole, 
    isBrandAdmin, 
    isDispensaryRole, 
    isDispensaryAdmin,
    normalizeRole 
} from '@/types/roles';

export type Permission =
    // Product permissions
    | 'read:products'
    | 'write:products'
    | 'manage:inventory'

    // Order permissions
    | 'read:orders'
    | 'write:orders'
    | 'manage:orders'

    // Customer permissions
    | 'read:customers'
    | 'write:customers'
    | 'manage:customers'

    // Loyalty permissions
    | 'read:loyalty'
    | 'write:loyalty'
    | 'manage:loyalty'

    // Analytics permissions
    | 'read:analytics'
    | 'write:analytics'

    // Marketing permissions
    | 'manage:campaigns'
    | 'manage:playbooks'
    | 'manage:agents'

    // Brand/Dispensary management
    | 'manage:brand'
    | 'manage:dispensary'
    | 'manage:users'
    | 'manage:billing'
    | 'manage:team'
    | 'sync:menus'

    // Admin
    | 'admin:all';

// Re-export UserRole from types/roles.ts for backward compatibility
export type UserRole = RoleType;

/**
 * Role-based permission matrix
 * 
 * New hierarchy:
 * - brand_admin: Full brand access (products, billing, team, settings)
 * - brand_member: Operational access (products, analytics, campaigns)
 * - dispensary_admin: Full dispensary access
 * - dispensary_staff: Operational access
 */
const ROLE_PERMISSIONS: Record<string, Permission[]> = {
    // Platform level
    super_user: ['admin:all'],
    super_admin: ['admin:all'], // Legacy, same as super_user
    
    // Brand admin (owner) - full access
    brand_admin: [
        'read:products',
        'write:products',
        'manage:inventory',
        'read:orders',
        'read:customers',
        'write:customers',
        'manage:customers',
        'read:loyalty',
        'write:loyalty',
        'manage:loyalty',
        'read:analytics',
        'write:analytics',
        'manage:campaigns',
        'manage:playbooks',
        'manage:agents',
        'manage:brand',
        'manage:billing',   // Admin only
        'manage:team',      // Admin only
        'manage:users',     // Admin only
        'sync:menus',
    ],

    // Brand member (team) - operational access
    brand_member: [
        'read:products',
        'write:products',
        'read:orders',
        'read:customers',
        'read:loyalty',
        'read:analytics',
        'manage:campaigns',
        // NO: manage:billing, manage:team, manage:users
    ],

    // Legacy brand role (treated as brand_admin for backward compat)
    brand: [
        'read:products',
        'write:products',
        'manage:inventory',
        'read:orders',
        'read:customers',
        'write:customers',
        'manage:customers',
        'read:loyalty',
        'write:loyalty',
        'manage:loyalty',
        'read:analytics',
        'write:analytics',
        'manage:campaigns',
        'manage:playbooks',
        'manage:agents',
        'manage:brand',
        'manage:billing',
        'manage:team',
        'manage:users',
        'sync:menus',
    ],
    
    // Dispensary admin (owner) - full access
    dispensary_admin: [
        'read:products',
        'manage:inventory',
        'read:orders',
        'write:orders',
        'manage:orders',
        'read:customers',
        'write:customers',
        'manage:customers',
        'read:loyalty',
        'write:loyalty',
        'manage:loyalty',
        'read:analytics',
        'manage:playbooks',
        'manage:dispensary',
        'manage:billing',
        'manage:team',
        'manage:users',
        'sync:menus',
    ],

    // Dispensary staff - operational access (no admin/billing/team management)
    dispensary_staff: [
        'read:products',
        'manage:inventory',
        'read:orders',
        'write:orders',
        'read:customers',
        'write:customers',
        'read:loyalty',
        'write:loyalty',
        'read:analytics',
        // NO: manage:billing, manage:team, manage:users
    ],

    // Legacy dispensary role (treated as dispensary_admin)
    dispensary: [
        'read:products',
        'manage:inventory',
        'read:orders',
        'write:orders',
        'manage:orders',
        'read:customers',
        'write:customers',
        'manage:customers',
        'read:loyalty',
        'write:loyalty',
        'manage:loyalty',
        'read:analytics',
        'manage:playbooks',
        'manage:dispensary',
        'manage:billing',
        'manage:team',
        'manage:users',
        'sync:menus',
    ],

    // Budtender: Front-line staff with read-mostly access
    budtender: [
        'read:products',    // View menu
        'read:orders',      // View orders for their location
        'write:orders',     // Update order status only
        'read:customers',   // View customer info for service
        'read:loyalty',     // View customer loyalty points
    ],
    
    // Customer: End consumers
    customer: [
        'read:products',
        'read:orders', // Only their own orders
    ],
};

/**
 * Check if a user has a specific role (or equivalent)
 */
export function hasRole(user: DomainUserProfile | null, role: UserRole): boolean {
    if (!user || !user.role) return false;
    
    const userRole = user.role as string;
    
    // Super users have all roles
    if (userRole === 'super_user' || userRole === 'super_admin') return true;
    
    // Direct match
    if (userRole === role) return true;
    
    // Brand hierarchy: brand_admin can act as brand_member
    if (role === 'brand_member' && isBrandAdmin(userRole)) return true;
    
    // Dispensary hierarchy: dispensary_admin can act as dispensary_staff or budtender
    if ((role === 'dispensary_staff' || role === 'budtender') && isDispensaryAdmin(userRole)) return true;
    
    // Legacy compatibility: 'brand' check should match brand_admin/brand_member
    if (role === 'brand' && isBrandRole(userRole)) return true;
    if (role === 'dispensary' && isDispensaryRole(userRole)) return true;
    
    return false;
}

/**
 * Check if a user has a specific permission
 */
export function hasPermission(
    user: DomainUserProfile | null,
    permission: Permission
): boolean {
    if (!user || !user.role) return false;

    const userRole = user.role as string;
    
    // Super Users have all permissions
    if (userRole === 'super_user' || userRole === 'super_admin') return true;

    const userPermissions = ROLE_PERMISSIONS[userRole] || [];
    return userPermissions.includes(permission) || userPermissions.includes('admin:all');
}

/**
 * Check permission by role directly
 */
export function hasRolePermission(role: UserRole, permission: Permission): boolean {
    if (role === 'super_user' || role === 'super_admin') return true;
    const permissions = ROLE_PERMISSIONS[role] || [];
    return permissions.includes(permission) || permissions.includes('admin:all');
}

/**
 * Check if a user can access a specific brand
 */
export function canAccessBrand(
    user: DomainUserProfile | null,
    brandId: string
): boolean {
    if (!user) return false;

    const userRole = user.role as string;
    
    // Super Users can access all brands
    if (userRole === 'super_user' || userRole === 'super_admin') return true;

    // Any brand role can access their own brand
    if (isBrandRole(userRole)) {
        return user.brandId === brandId;
    }

    return false;
}

/**
 * Check if a user can access a specific dispensary
 */
export function canAccessDispensary(
    user: DomainUserProfile | null,
    dispensaryId: string
): boolean {
    if (!user) return false;

    const userRole = user.role as string;
    
    // Super Users can access all dispensaries
    if (userRole === 'super_user' || userRole === 'super_admin') return true;

    // Any dispensary role can access their own location
    if (isDispensaryRole(userRole)) {
        return user.locationId === dispensaryId;
    }

    return false;
}

/**
 * Check if a user can access a specific order
 */
export function canAccessOrder(
    user: DomainUserProfile | null,
    order: { userId?: string; brandId?: string; retailerId?: string }
): boolean {
    if (!user) return false;

    const userRole = user.role as string;
    
    // Super Users can access all orders
    if (userRole === 'super_user' || userRole === 'super_admin') return true;

    // Customers can only access their own orders
    if (userRole === 'customer') {
        return order.userId === user.uid;
    }

    // Brand roles can access orders for their brand
    if (isBrandRole(userRole) && order.brandId) {
        return user.brandId === order.brandId;
    }

    // Dispensary roles can access orders for their location
    if (isDispensaryRole(userRole) && order.retailerId) {
        return user.locationId === order.retailerId;
    }

    return false;
}

/**
 * Get all permissions for a user
 */
export function getUserPermissions(user: DomainUserProfile | null): Permission[] {
    if (!user || !user.role) return [];
    return ROLE_PERMISSIONS[user.role as string] || [];
}

/**
 * Require a specific permission (throws error if not authorized)
 */
export function requirePermission(
    user: DomainUserProfile | null,
    permission: Permission
): void {
    if (!hasPermission(user, permission)) {
        throw new Error(`Unauthorized: missing permission ${permission}`);
    }
}

/**
 * Require a specific role (throws error if not authorized)
 */
export function requireRole(user: DomainUserProfile | null, role: UserRole): void {
    if (!hasRole(user, role)) {
        throw new Error(`Unauthorized: requires role ${role}`);
    }
}

/**
 * Require brand access (throws error if not authorized)
 */
export function requireBrandAccess(
    user: DomainUserProfile | null,
    brandId: string
): void {
    if (!canAccessBrand(user, brandId)) {
        throw new Error(`Unauthorized: cannot access brand ${brandId}`);
    }
}

/**
 * Require dispensary access (throws error if not authorized)
 */
export function requireDispensaryAccess(
    user: DomainUserProfile | null,
    dispensaryId: string
): void {
    if (!canAccessDispensary(user, dispensaryId)) {
        throw new Error(`Unauthorized: cannot access dispensary ${dispensaryId}`);
    }
}

/**
 * Check if user can manage inventory (dispensary admin/staff only)
 */
export function canManageInventory(user: DomainUserProfile | null): boolean {
    return hasPermission(user, 'manage:inventory');
}

/**
 * Check if user can manage customers (admin only)
 */
export function canManageCustomers(user: DomainUserProfile | null): boolean {
    return hasPermission(user, 'manage:customers');
}

/**
 * Check if user can manage loyalty (admin only)
 */
export function canManageLoyalty(user: DomainUserProfile | null): boolean {
    return hasPermission(user, 'manage:loyalty');
}

/**
 * Check if user can view customer data (all dispensary roles + brands)
 */
export function canViewCustomers(user: DomainUserProfile | null): boolean {
    return hasPermission(user, 'read:customers');
}

/**
 * Check if user is a budtender (read-only staff)
 */
export function isBudtender(user: DomainUserProfile | null): boolean {
    return user?.role === 'budtender';
}

/**
 * Check if user is dispensary staff (not admin)
 */
export function isDispensaryStaff(user: DomainUserProfile | null): boolean {
    return user?.role === 'dispensary_staff';
}

/**
 * Get user's organization ID (brandId for brands, locationId for dispensaries)
 */
export function getUserOrgId(user: DomainUserProfile | null): string | null {
    if (!user) return null;

    const userRole = user.role as string;

    // Brand users use brandId
    if (isBrandRole(userRole)) {
        return user.brandId || null;
    }

    // Dispensary users use currentOrgId or locationId
    if (isDispensaryRole(userRole)) {
        return user.currentOrgId || user.locationId || null;
    }

    return null;
}

/**
 * Check if user can access data for a specific orgId
 */
export function canAccessOrg(
    user: DomainUserProfile | null,
    orgId: string
): boolean {
    if (!user) return false;

    const userRole = user.role as string;

    // Super Users can access all orgs
    if (userRole === 'super_user' || userRole === 'super_admin') return true;

    // Check if user's org matches
    const userOrgId = getUserOrgId(user);
    return userOrgId === orgId;
}

/**
 * Require org access (throws error if not authorized)
 */
export function requireOrgAccess(
    user: DomainUserProfile | null,
    orgId: string
): void {
    if (!canAccessOrg(user, orgId)) {
        throw new Error(`Unauthorized: cannot access organization ${orgId}`);
    }
}

/**
 * Check if user can access customer data (with org scoping)
 */
export function canAccessCustomer(
    user: DomainUserProfile | null,
    customer: { userId?: string; orgId?: string; brandId?: string; locationId?: string }
): boolean {
    if (!user) return false;

    const userRole = user.role as string;

    // Super Users can access all customers
    if (userRole === 'super_user' || userRole === 'super_admin') return true;

    // Customers can only access their own data
    if (userRole === 'customer') {
        return customer.userId === user.uid;
    }

    // Brand roles can access customers for their brand
    if (isBrandRole(userRole) && customer.brandId) {
        return user.brandId === customer.brandId;
    }

    // Dispensary roles can access customers for their org
    if (isDispensaryRole(userRole)) {
        const userOrgId = getUserOrgId(user);
        const customerOrgId = customer.orgId || customer.locationId;
        return userOrgId === customerOrgId ||
               user.locationId === customer.locationId;
    }

    return false;
}

// Re-export helper functions for convenience
export { isBrandRole, isBrandAdmin, isDispensaryRole, isDispensaryAdmin, normalizeRole };
