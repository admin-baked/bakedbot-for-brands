/**
 * Centralized User Role Definitions
 * 
 * Standardizes roles across the application:
 * - super_user: Platform admins (formerly 'owner', 'executive')
 * - brand: Brand owners/managers
 * - dispensary: Dispensary owners/managers
 * - customer: End consumers
 * - budtender: Store staff
 */

export type UserRole = 
    | 'super_user' 
    | 'super_admin'
    | 'brand' 
    | 'dispensary' 
    | 'customer' 
    | 'budtender';

export const ALL_ROLES: UserRole[] = [
    'super_user',
    'super_admin',
    'brand',
    'dispensary',
    'customer',
    'budtender'
];

export const DASHBOARD_ROLES: UserRole[] = [
    'super_user',
    'super_admin',
    'brand',
    'dispensary',
    'budtender'
];
