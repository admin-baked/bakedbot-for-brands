/**
 * Centralized User Role Definitions
 * 
 * Role Hierarchy:
 * 
 * Platform Level:
 * - super_user: Platform admins (formerly 'owner', 'executive', 'super_admin')
 * 
 * Brand Level:
 * - brand_admin: Brand owner/manager with full access (billing, team, settings)
 * - brand_member: Brand team member with operational access (products, analytics)
 * - brand: Legacy unified role (backward compatibility, treated as brand_admin)
 * 
 * Dispensary Level:
 * - dispensary_admin: Dispensary owner with full access
 * - dispensary_staff: Dispensary employee with operational access
 * - dispensary: Legacy unified role (backward compatibility, treated as dispensary_admin)
 * - budtender: Front-line staff with read access
 * 
 * Consumer Level:
 * - customer: End consumers
 *
 * Training:
 * - intern: Training program participants
 */

// Base role type including legacy roles for backward compatibility
export type UserRole =
    // Platform level
    | 'super_user'
    | 'super_admin'      // Legacy, treated as super_user

    // Brand level (new hierarchy)
    | 'brand_admin'      // NEW: Brand owner/manager
    | 'brand_member'     // NEW: Brand team member
    | 'brand'            // Legacy, treated as brand_admin

    // Dispensary level (new hierarchy)
    | 'dispensary_admin' // NEW: Dispensary owner
    | 'dispensary_staff' // NEW: Dispensary employee
    | 'dispensary'       // Legacy, treated as dispensary_admin
    | 'budtender'        // Front-line staff

    // Consumer level
    | 'customer'

    // Training
    | 'intern'          // Training program participants

    // Grower level
    | 'grower'          // NEW: Cultivators selling wholesale to brands

    // Delivery
    | 'delivery_driver'; // Delivery drivers

/**
 * Role groups for permission checks
 */
export const SUPER_USER_ROLES: UserRole[] = ['super_user', 'super_admin'];
export const BRAND_ADMIN_ROLES: UserRole[] = ['brand_admin', 'brand']; // brand = legacy admin
export const BRAND_ALL_ROLES: UserRole[] = ['brand_admin', 'brand_member', 'brand'];
export const DISPENSARY_ADMIN_ROLES: UserRole[] = ['dispensary_admin', 'dispensary'];
export const DISPENSARY_ALL_ROLES: UserRole[] = ['dispensary_admin', 'dispensary_staff', 'dispensary', 'budtender'];
export const INTERN_ROLES: UserRole[] = ['intern'];
export const DELIVERY_DRIVER_ROLES: UserRole[] = ['delivery_driver'];

// Export as tuple for Zod schemas
export const ROLES = [
    'super_user',
    'super_admin',
    'brand_admin',
    'brand_member',
    'brand',
    'dispensary_admin',
    'dispensary_staff',
    'dispensary',
    'budtender',
    'customer',
    'intern',
    'grower',
    'delivery_driver'
] as const;

export const ALL_ROLES: UserRole[] = [...ROLES];

export const DASHBOARD_ROLES: UserRole[] = [
    'super_user',
    'super_admin',
    'brand_admin',
    'brand_member',
    'brand',
    'dispensary_admin',
    'dispensary_staff',
    'dispensary',
    'budtender',
    'intern',
    'grower'
];

/**
 * Helper to check if a role is a "brand" role (any level)
 */
export function isBrandRole(role: UserRole | string | null): boolean {
    if (!role) return false;
    return ['brand_admin', 'brand_member', 'brand'].includes(role as string);
}

/**
 * Helper to check if a role is a brand admin (owner-level)
 */
export function isBrandAdmin(role: UserRole | string | null): boolean {
    if (!role) return false;
    return ['brand_admin', 'brand'].includes(role as string);
}

/**
 * Helper to check if a role is a "grower" (any level)
 */
export function isGrowerRole(role: UserRole | string | null): boolean {
    if (!role) return false;
    return role === 'grower';
}

/**
 * Helper to check if a role is a "dispensary" role (any level)
 */
export function isDispensaryRole(role: UserRole | string | null): boolean {
    if (!role) return false;
    return ['dispensary_admin', 'dispensary_staff', 'dispensary', 'budtender'].includes(role as string);
}

/**
 * Helper to check if a role is a dispensary admin (owner-level)
 */
export function isDispensaryAdmin(role: UserRole | string | null): boolean {
    if (!role) return false;
    return ['dispensary_admin', 'dispensary'].includes(role as string);
}

/**
 * Normalize legacy roles to their modern equivalents
 */
export function normalizeRole(role: UserRole | string | null): UserRole {
    if (!role) return 'customer';

    // Legacy super admin roles
    if (['owner', 'executive', 'super_admin'].includes(role)) {
        return 'super_user';
    }

    // Legacy brand role -> brand_admin (preserving admin access for existing users)
    if (role === 'brand') {
        return 'brand_admin';
    }

    // Legacy dispensary role -> dispensary_admin  
    if (role === 'dispensary') {
        return 'dispensary_admin';
    }

    return role as UserRole;
}
