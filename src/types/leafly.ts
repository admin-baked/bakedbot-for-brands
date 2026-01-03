/**
 * Leafly Data Types
 * Types for data ingested from Apify's Leafly discovery tool
 */

export interface LeaflyDispensary {
    id: string;
    slug: string;
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    latitude?: number;
    longitude?: number;
    phone?: string;
    website?: string;
    hours?: Record<string, string>;
    rating?: number;
    reviewCount?: number;
    isOpen?: boolean;
    leaflyUrl: string;
    lastDiscoveredAt: Date;
}

export interface LeaflyProduct {
    id: string;  // Hash of dispensary + product key fields
    dispensarySlug: string;
    dispensaryName: string;
    productName: string;
    brandName: string;
    category: string;
    subcategory?: string;
    thcPercent?: number;
    cbdPercent?: number;
    weightGrams?: number;
    price: number;
    originalPrice?: number;  // If on sale
    inStock: boolean;
    strainType?: 'indica' | 'sativa' | 'hybrid';
    imageUrl?: string;
    leaflyUrl?: string;
    lastSeenAt: Date;
    lastPrice: number;  // Track price changes
}

export interface LeaflyOffer {
    id: string;  // Hash of dispensary + offer key fields
    dispensarySlug: string;
    dispensaryName: string;
    offerType: 'deal' | 'discount' | 'bundle' | 'freebie';
    title: string;
    description: string;
    discountPercent?: number;
    discountAmount?: number;
    conditions?: string;
    validFrom?: Date;
    validUntil?: Date;
    productCategories?: string[];
    lastSeenAt: Date;
}

export interface LeaflyIngestionRun {
    id: string;
    apifyRunId: string;
    mode: 'single_url' | 'state';
    targetUrl?: string;  // For single_url mode
    targetState?: string;  // For state mode
    status: 'running' | 'completed' | 'failed';
    startedAt: Date;
    completedAt?: Date;
    storesDiscovered?: number;
    storesScanned?: number;  // Legacy alias for storesDiscovered
    productsIngested: number;
    offersIngested: number;
    errors: string[];
    estimatedCost?: number;
}

export interface ApifyTaskInput {
    mode: 'single_url' | 'state';
    dispensaryUrl?: string;
    state?: string;
    maxStores?: number;
    taskCount?: number;
    workerCount?: number;
    proxyType: 'residential' | 'datacenter' | 'none';
    includeOffers: boolean;
    includeStrainData: boolean;
    outputFormat: 'dataset' | 'csv' | 'both';
    debugMode?: boolean;
}

export interface ApifyRunResponse {
    id: string;
    actId: string;
    status: string;
    startedAt: string;
    finishedAt?: string;
    defaultDatasetId: string;
    defaultKeyValueStoreId: string;
}

export interface CompetitorWatchlistEntry {
    id: string;
    name: string;
    leaflyUrl: string;
    state: string;
    city: string;
    discoveryFrequency: 'daily' | 'weekly' | 'monthly';
    lastDiscoveredAt?: Date;
    nextDiscoveryAt?: Date;
    enabled: boolean;
    createdAt: Date;
}
