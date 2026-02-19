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
    thcMg?: number;        // THC in milligrams (absolute amount)
    cbdMg?: number;        // CBD in milligrams (absolute amount)
    imageUrl?: string;
    cost?: number;         // Cost of goods sold (COGS) from POS
    batchCost?: number;    // Batch-level COGS (may differ from item cost)
    expirationDate?: Date; // Product/batch expiration date for clearance bundles
    packageDate?: Date;    // Package/harvest date — used to calculate product age
    rawData?: Record<string, unknown>; // Store original payload for debugging

    // Inventory metadata
    sku?: string;          // Barcode / SKU for shelf labels & scanning
    strain?: string;       // Strain name (e.g. "Blue Dream")
    uom?: string;          // Unit of measure ("Each", "g", "oz", "mg")
    onHand?: number;       // Total units on hand (before reservations)
    batchId?: string;      // POS batch identifier
    metrcTag?: string;     // METRC / state traceability tag (e.g. "1A412030000013B000011417")
    batchStatus?: string;  // Batch status ("open", "closed", etc.)
    areaName?: string;     // Storage area name (e.g. "Sales Floor", "Back Room")

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
