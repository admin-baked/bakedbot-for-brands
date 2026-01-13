// src/server/auth/rbac.ts

import { DomainUserProfile } from '@/types/domain';

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
    | 'sync:menus'
    | 'manage:users'
    | 'admin:all';

export type UserRole = 'brand' | 'dispensary' | 'customer' | 'budtender' | 'super_user';

/**
 * Role-based permission matrix
 */
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
    super_user: ['admin:all'],
    brand: [
        'read:products',
        'write:products',
        'read:orders',
        'read:analytics',
        'manage:campaigns',
        'manage:playbooks',
        'manage:agents',
        'manage:brand',
        'sync:menus',
        'manage:users',
    ],
    dispensary: [
        'read:products',
        'read:orders',
        'write:orders',
        'read:analytics',
    ],
    // Budtender: FREE role - dispensary employees with limited access
    // They can read products for recommendations and manage orders at their location
    budtender: [
        'read:products',  // For AI recommendations
        'read:orders',    // For their dispensary only
        'write:orders',   // To update order status
    ],
    customer: [
        'read:products',
        'read:orders', // Only their own orders
    ],
};

/**
 * Check if a user has a specific role
 */
export function hasRole(user: DomainUserProfile | null, role: UserRole): boolean {
    if (!user || !user.role) return false;
    return user.role === role || user.role === 'super_user';
}

/**
 * Check if a user has a specific permission
 */
export function hasPermission(
    user: DomainUserProfile | null,
    permission: Permission
): boolean {
    if (!user || !user.role) return false;

    // Super Users have all permissions
    if (user.role === 'super_user') return true;

    const userPermissions = ROLE_PERMISSIONS[user.role as UserRole] || [];
    return userPermissions.includes(permission) || userPermissions.includes('admin:all');
}

/**
 * Check permission by role directly
 */
export function hasRolePermission(role: UserRole, permission: Permission): boolean {
    if (role === 'super_user') return true;
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

    // Super Users can access all brands
    if (user.role === 'super_user') return true;

    // Brand users can only access their own brand
    if (user.role === 'brand') {
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

    // Super Users can access all dispensaries
    if (user.role === 'super_user') return true;

    // Dispensary users can only access their own location
    if (user.role === 'dispensary') {
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

    // Super Users can access all orders
    if (user.role === 'super_user') return true;

    // Customers can only access their own orders
    if (user.role === 'customer') {
        return order.userId === user.uid;
    }

    // Brands can access orders for their brand
    if (user.role === 'brand' && order.brandId) {
        return user.brandId === order.brandId;
    }

    // Dispensaries can access orders for their location
    if (user.role === 'dispensary' && order.retailerId) {
        return user.locationId === order.retailerId;
    }

    // Budtenders can access orders for their dispensary
    if (user.role === 'budtender' && order.retailerId) {
        return user.locationId === order.retailerId;
    }

    return false;
}

/**
 * Get all permissions for a user
 */
export function getUserPermissions(user: DomainUserProfile | null): Permission[] {
    if (!user || !user.role) return [];
    return ROLE_PERMISSIONS[user.role as UserRole] || [];
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
