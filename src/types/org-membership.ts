import { UserRole } from './roles';

/**
 * Represents a user's membership in an organization with a specific role.
 * Users can belong to multiple organizations with different roles (vertical integration).
 */
export interface OrgMembership {
  orgId: string;
  orgName: string;
  orgType: 'brand' | 'dispensary';
  role: UserRole;
  joinedAt: string; // ISO string timestamp
}

/**
 * Org context for switcher/display purposes
 */
export interface OrgContext {
  id: string;
  name: string;
  type: 'brand' | 'dispensary';
  role: UserRole;
  logoUrl?: string;
  joinedAt: string;
}
