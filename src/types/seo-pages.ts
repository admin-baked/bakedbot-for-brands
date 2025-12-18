
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
    source: 'cannmenus_scan' | 'leafly_scan' | 'manual';
    enrichment?: {
        googlePlaces?: boolean;
        leafly?: boolean;
        websiteScrape?: boolean;
        qrCode?: string; // Data URL
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
    createdAt: Date;
    updatedAt: Date;
    analytics: {
        views: number;
        clicks: number;
    };
}

export interface CitySEOPage {
    id: string; // city_slug
    slug: string;
    name: string;
    state: string;
    zipCodes: string[];
    dispensaryCount: number;
    description?: string; // AI generated intro
    createdAt: Date;
    updatedAt: Date;
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
