export type OrganizationType = 'brand' | 'dispensary';

export interface Organization {
    id: string;
    name: string;
    type: OrganizationType;
    ownerId: string; // The user who owns this org
    createdAt: any; // Firestore Timestamp
    updatedAt: any;

    settings: {
        policyPack: string; // 'strict', 'relaxed'
        allowOverrides: boolean;
        hipaaMode: boolean;
    };

    billing: {
        stripeCustomerId?: string;
        subscriptionStatus: 'active' | 'past_due' | 'trial' | 'canceled' | 'none';
        planId?: string;
    };

    // Future: Integrations at Org Level (e.g. Brand-wide CRM)
    integrations?: Record<string, any>;
}
