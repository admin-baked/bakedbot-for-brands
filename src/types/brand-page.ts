export type BrandPageScope = 'global' | 'state' | 'metro' | 'zip';

export interface BrandPageConfig {
    id: string;
    brandId: string;
    slug: string;
    scope: BrandPageScope;

    // Geographic context (if not global)
    geo?: {
        state?: string;      // "MI"
        metro?: string;      // "detroit"
        zipCode?: string;    // "90210"
        lat?: number;
        lng?: number;
    };

    // Metadata
    metaTitle?: string;
    metaDescription?: string;
    h1?: string;

    // Feature flags / Paid tiers
    isFeatured: boolean;    // $100/mo tier status
    modules: {
        showDropAlerts: boolean;
        showWhereToBuy: boolean;
        showPriceComparison: boolean;
        showClaimCTA: boolean;
    };

    updatedAt: Date;
}

export interface BrandClaim {
    id: string;
    brandId: string;
    userId: string;

    // Business Info
    businessEmail: string;
    role: string;
    website?: string;
    socialHandles?: Record<string, string>; // { instagram: '@brand', etc }

    // Validation
    status: 'pending' | 'verified' | 'rejected';
    verificationMethod?: 'email_domain' | 'trademark' | 'manual';
    verifiedAt?: Date;
    verifiedBy?: string;

    submittedAt: Date;
}

export interface BrandProfileHeader {
    name: string;
    logoUrl?: string;
    coverImageUrl?: string;
    verified: boolean;
    description?: string;
    websiteUrl?: string;
}
