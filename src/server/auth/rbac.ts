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
    | 'read:products'
    | 'write:products'
    | 'read:orders'
    | 'write:orders'
    | 'read:analytics'
    | 'manage:campaigns'
    | 'manage:playbooks'
    | 'manage:agents'
    | 'manage:brand'
    | 'manage:users'
    | 'manage:billing'
    | 'manage:team'
    | 'sync:menus'
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
        'read:orders',
        'read:analytics',
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
        'read:analytics',
        'manage:campaigns',
        // NO: manage:billing, manage:team, manage:users
    ],
    
    // Legacy brand role (treated as brand_admin for backward compat)
    brand: [
        'read:products',
        'write:products',
        'read:orders',
        'read:analytics',
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
        'read:orders',
        'write:orders',
        'read:analytics',
        'manage:playbooks',
        'manage:billing',
        'manage:team',
        'manage:users',
        'sync:menus',
    ],
    
    // Dispensary staff - operational access
    dispensary_staff: [
        'read:products',
        'read:orders',
        'write:orders',
        'read:analytics',
        // NO: manage:billing, manage:team, manage:users
    ],
    
    // Legacy dispensary role (treated as dispensary_admin)
    dispensary: [
        'read:products',
        'read:orders',
        'write:orders',
        'read:analytics',
        'manage:playbooks',
        'manage:billing',
        'manage:team',
        'manage:users',
        'sync:menus',
    ],
    
    // Budtender: FREE role - dispensary employees with limited access
    budtender: [
        'read:products',  // For AI recommendations
        'read:orders',    // For their dispensary only
        'write:orders',   // To update order status
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

// Re-export helper functions for convenience
export { isBrandRole, isBrandAdmin, isDispensaryRole, isDispensaryAdmin, normalizeRole };
