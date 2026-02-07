export type POSProvider = 'dutchie' | 'jane' | 'alleaves' | 'metrc' | 'manual';

export interface POSConfig {
    apiKey?: string;
    storeId: string;
    menuId?: string; // Some use menu ID, some store ID
    environment?: 'sandbox' | 'production';
}

export interface POSProduct {
    externalId: string;
    name: string;
    brand: string;
    category: string;
    price: number;
    stock: number;
    thcPercent?: number;
    cbdPercent?: number;
    imageUrl?: string;
    expirationDate?: Date; // Product/batch expiration date for clearance bundles
    rawData?: Record<string, unknown>; // Store original payload for debugging

    // Sale/Discount fields (populated by fetchMenuWithDiscounts)
    isOnSale?: boolean;           // True if product has active discount
    originalPrice?: number;       // Original price before discount
    salePrice?: number;           // Discounted price
    saleBadgeText?: string;       // Display text (e.g., "20% OFF", "BOGO")
    discountId?: string;          // ID of applied discount rule
    discountName?: string;        // Name of discount for reference
}

export interface POSClient {
    validateConnection(): Promise<boolean>;
    fetchMenu(): Promise<POSProduct[]>;
    getInventory(externalIds: string[]): Promise<Record<string, number>>; // Map ID -> Stock
}
