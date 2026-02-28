import { UserRole } from './roles';
import { OrgMembership } from './org-membership';
import type { BillingAddress } from './orders';

export type DomainUserProfile = {
    id: string;
    uid: string;
    email: string | null;
    displayName: string | null;
    role: UserRole | null;

    // Enterprise Context
    organizationIds: string[]; // List of IDs this user belongs to
    currentOrgId?: string; // Active Organization Context

    // Per-org role mapping (vertical integration support)
    // Maps orgId → OrgMembership for users with multiple org roles
    orgMemberships?: Record<string, OrgMembership>;

    // Legacy / Convenience (Keep for backward compatibility during migration)
    brandId: string | null;
    locationId: string | null;

    // Personal Details
    firstName?: string;
    lastName?: string;
    phone?: string;
    billingAddress?: BillingAddress;

    favoriteRetailerId?: string | null;
};
