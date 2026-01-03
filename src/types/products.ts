import { Timestamp } from 'firebase/firestore';

export type Brand = {
    id: string;
    name: string;
    logoUrl?: string;
    chatbotConfig?: {
        basePrompt?: string;
        welcomeMessage?: string;
        personality?: string;
        tone?: string;
        sellingPoints?: string;
        updatedAt?: any;
    };
    verificationStatus?: 'verified' | 'unverified' | 'featured';
    dispensaryCount?: number;
    slug?: string;
    claimStatus?: 'claimed' | 'unclaimed';
    description?: string;
    website?: string;
};

export type ReviewSummaryEmbedding = {
    productId: string;
    brandId: string;
    model: string;
    embedding: number[];
    reviewCount: number;
    updatedAt: Date;
    summary: string;
};

import { StrainLineage } from './taxonomy';

export type Product = {
    id: string;
    name: string;
    category: string;
    price: number;
    prices?: { [retailerId: string]: number };
    imageUrl: string;
    imageHint: string;
    description: string;
    likes?: number; // Deprecate?
    dislikes?: number; // Deprecate?
    brandId: string;
    retailerIds?: string[];
    sku_id?: string;
    cost?: number; // COGS
    wholesalePrice?: number; // Price sold to retailer
    stock?: number; // Inventory count

    // Rich Metadata (Data Infrastructure Update)
    terpenes?: { name: string; percent: number }[]; // e.g. [{name: 'Myrcene', percent: 1.2}]
    cannabinoids?: { name: string; percent: number }[]; // e.g. [{name: 'THC', percent: 24.5}]
    effects?: string[]; // e.g. ['Relaxed', 'Sleepy']
    lineage?: StrainLineage;
    thcPercent?: number; // Quick access
    cbdPercent?: number; // Quick access
    source?: 'manual' | 'pos' | 'cannmenus' | 'leafly' | 'discovery'; // Data source
    sourceTimestamp?: Date; // Last synced with source
};

export type Retailer = {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    phone?: string;
    email?: string;
    website?: string;
    lat?: number;
    lon?: number;
    distance?: number;
    tabletDeviceToken?: string | null;
    acceptsOrders?: boolean;
    status?: 'active' | 'inactive';
    claimStatus?: 'claimed' | 'unclaimed';
    updatedAt?: Date | string;
};

export type Location = Retailer & { zipCode?: string };

export type Review = {
    id: string;
    brandId?: string;
    productId: string;
    userId: string;
    rating: number;
    text: string;
    createdAt: Timestamp;
};

export type Coupon = {
    id: string;
    code: string;
    type: 'percentage' | 'fixed';
    value: number;
    expiresAt?: Timestamp;
    uses: number;
    maxUses?: number;
    brandId: string;
};
