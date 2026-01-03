
/**
 * SEO Page Types
 * Shared definitions between generator and frontend
 */

export interface DispensarySEOPage {
    id: string; // dispensary_slug
    slug: string;
    city: string;
    state: string;
    zipCodes: string[];
    claimStatus: 'claimed' | 'unclaimed';
    verificationStatus: 'verified' | 'unverified';
    createdAt: Date;
    updatedAt: Date;
    analytics: {
        views: number;
        clicks: number;
        lastViewedAt: Date | null;
    };
    source: 'cannmenus_discovery' | 'leafly_discovery' | 'manual';
    enrichment?: {
        googlePlaces?: boolean;
        leafly?: boolean;
        websiteDiscovery?: boolean;
        qrCode?: string; // Data URL
    };
    // Deebo SEO Review
    deeboReview?: {
        screenshotUrl?: string; // URL to screenshot in storage
        seoScore?: number; // 1-10 ranking
        complianceStatus?: 'passed' | 'failed' | 'pending';
        reviewNotes?: string;
        reviewedAt?: Date;
    };
}

export interface ZipSEOPage {
    id: string;
    zipCode: string;
    city: string;
    state: string;
    hasDispensaries: boolean;
    dispensaryCount: number;
    nearbyDispensaryIds: string[];
    nearbyZipCodes?: string[];
    status: 'published' | 'draft';
    indexable: boolean; // If false, page should have noindex meta tag
    createdAt: Date;
    updatedAt: Date;
    analytics: {
        views: number;
        clicks: number;
    };
    // Deebo SEO Review
    deeboReview?: {
        screenshotUrl?: string;
        seoScore?: number; // 1-10 ranking
        complianceStatus?: 'passed' | 'failed' | 'pending';
        reviewNotes?: string;
        reviewedAt?: Date;
    };
}

export interface CitySEOPage {
    id: string; // city_slug
    slug: string;
    name: string;
    state: string;
    zipCodes: string[];
    dispensaryCount: number;
    status: 'published' | 'draft';
    indexable: boolean; // If false, page should have noindex meta tag
    description?: string; // AI generated intro
    createdAt: Date;
    updatedAt: Date;
    // Deebo SEO Review
    deeboReview?: {
        screenshotUrl?: string;
        seoScore?: number; // 1-10 ranking
        complianceStatus?: 'passed' | 'failed' | 'pending';
        reviewNotes?: string;
        reviewedAt?: Date;
    };
}

export interface BrandSEOPage {
    slug: string;
    name: string;
    cities: string[];
    retailerCount: number;
    claimStatus: 'claimed' | 'unclaimed';
    verificationStatus: 'verified' | 'unverified';
    createdAt: Date;
    updatedAt: Date;
    analytics: {
        views: number;
    };
}
