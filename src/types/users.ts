export type DomainUserProfile = {
    id: string;
    uid: string;
    email: string | null;
    displayName: string | null;
    role: 'brand' | 'dispensary' | 'customer' | 'owner' | 'super_admin' | null;

    // Enterprise Context
    organizationIds: string[]; // List of IDs this user belongs to
    currentOrgId?: string; // Active Organization Context

    // Legacy / Convenience (Keep for backward compatibility during migration)
    brandId: string | null;
    locationId: string | null;

    // Personal Details
    firstName?: string;
    lastName?: string;
    phone?: string;

    favoriteRetailerId?: string | null;
};
