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
    rawData?: any; // Store original payload for debugging
}

export interface POSClient {
    validateConnection(): Promise<boolean>;
    fetchMenu(): Promise<POSProduct[]>;
    getInventory(externalIds: string[]): Promise<Record<string, number>>; // Map ID -> Stock
}
