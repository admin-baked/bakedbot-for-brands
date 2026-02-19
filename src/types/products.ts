import { Timestamp } from 'firebase/firestore';

export type Brand = {
    id: string;
    name: string;
    logoUrl?: string;
    useLogoInHeader?: boolean;
    tagline?: string; // Short brand tagline
    chatbotConfig?: {
        basePrompt?: string;
        welcomeMessage?: string;
        personality?: string;
        tone?: string;
        sellingPoints?: string;
        enabled?: boolean; // Toggle chatbot on/off
        botName?: string; // Custom name (Empire only)
        mascotImageUrl?: string; // Custom mascot image (Empire only)
        updatedAt?: any;
    };
    theme?: {
        primaryColor?: string;
        secondaryColor?: string;
        accentColor?: string;
        heroImageUrl?: string;
    };
    verificationStatus?: 'verified' | 'unverified' | 'featured';
    dispensaryCount?: number;
    slug?: string;
    claimStatus?: 'claimed' | 'unclaimed';
    description?: string;
    website?: string;

    // Entity Type (brand or dispensary)
    type?: 'brand' | 'dispensary';

    // E-Commerce Configuration
    purchaseModel?: 'online_only' | 'local_pickup' | 'hybrid';
    shipsNationwide?: boolean;

    // Menu Design Choice (dispensary = hero carousel, brand = brand hero)
    menuDesign?: 'dispensary' | 'brand';

    // Contact Info (for online_only brands)
    contactEmail?: string;
    contactPhone?: string;
    shippingAddress?: {
        street: string;
        city: string;
        state: string;
        zip: string;
    };

    // Dispensary-specific location fields (when type = 'dispensary')
    location?: {
        address: string;
        city: string;
        state: string;
        zip: string;
        phone?: string;
        lat?: number;
        lng?: number;
    };
    // Flat location fields (alternative structure)
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    phone?: string;
    hours?: Record<string, string>;
    licenseNumber?: string;
    coordinates?: {
        lat: number;
        lng: number;
    };
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
    imageUrl: string; // Primary image (backward compatible)
    images?: string[]; // Multiple product images
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
    brandName?: string; // Display name of the brand/manufacturer (stored from POS sync)
    source?: 'manual' | 'pos' | 'cannmenus' | 'leafly' | 'discovery' | 'url-import'; // Data source
    sourceTimestamp?: Date; // Last synced with source
    strainType?: string;
    featured?: boolean; // Show in featured section
    sortOrder?: number; // Custom sort order (lower = higher priority)

    // Hemp E-Commerce Fields
    weight?: number; // Product weight in grams
    weightUnit?: 'g' | 'oz'; // Weight unit
    servings?: number; // Number of servings (for edibles)
    mgPerServing?: number; // mg CBD/THC per serving
    shippable?: boolean; // Can this product be shipped?
    shippingRestrictions?: string[]; // State codes where shipping is blocked

    // Dynamic Pricing Fields (Public Menu Integration)
    originalPrice?: number; // Original price before dynamic pricing
    dynamicPricingApplied?: boolean; // Whether dynamic pricing is active on this product
    dynamicPricingBadge?: string | null; // Badge text to display (e.g., "20% OFF")
    dynamicPricingReason?: string | null; // Reason for price change (e.g., "Clearance - Expiring Soon")
    dynamicPricingUpdatedAt?: Date | string; // Timestamp of last dynamic pricing update
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
    brandIds?: string[];
    logo?: string;
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
