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
        customerId?: string; // Authorize.net Customer Profile ID
        subscriptionStatus: 'active' | 'past_due' | 'trial' | 'canceled' | 'none';
        planId?: string;
    };

    // BakedBot-managed subdomain for email (e.g. "thrive" → thrive.bakedbot.ai)
    bakedBotSubdomain?: string;

    // Provisioning state — tracks which onboarding steps have been completed
    provisioning?: {
        sesVerified?: boolean;
        sesReceiptRule?: boolean;
        mxRecord?: boolean;
        posSync?: boolean;
        ezalSeeded?: boolean;
        welcomeEmailSent?: boolean;
        completedAt?: any;
    };

    // Future: Integrations at Org Level (e.g. Brand-wide CRM)
    integrations?: Record<string, any>;
}
