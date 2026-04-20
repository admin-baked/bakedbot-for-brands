import {
  UserRole,
  isBrandRole,
  isDispensaryRole,
} from '@/types/roles';

export type Role = UserRole;

/**
 * Check if a user's role matches one of the required roles.
 * Handles role hierarchy (e.g., brand_admin can act as brand_member)
 *
 * Extracted from auth.ts so it can be imported by tests without
 * triggering 'use server' constraints.
 */
export function roleMatches(userRole: string, requiredRoles: Role[]): boolean {
  if (requiredRoles.includes(userRole as Role)) {
    return true;
  }

  for (const required of requiredRoles) {
    if (required === 'brand' && isBrandRole(userRole)) {
      return true;
    }
    if (required === 'dispensary' && isDispensaryRole(userRole)) {
      return true;
    }
    if (required === 'brand_member' && (userRole === 'brand_admin' || userRole === 'brand')) {
      return true;
    }
    if (required === 'dispensary_staff' && (userRole === 'dispensary_admin' || userRole === 'dispensary')) {
      return true;
    }
  }

  return false;
}
