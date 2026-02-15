import { PaymentConfig } from './aeropay';

export interface Location {
    id: string;
    orgId: string;
    name: string;

    // Physical Address
    address?: {
        street: string;
        city: string;
        state: string;
        zip: string;
        country: string;
    };

    // POS Configuration (Location Specific)
    posConfig?: {
        provider: 'dutchie' | 'alleaves' | 'treez' | 'jane' | 'none';
        apiKey?: string;
        storeId?: string;
        id?: string; // Shop ID (legacy)
        sourceOfTruth: 'pos' | 'cannmenus';
        connectedAt?: string;
        syncedAt?: Date;
        lastSyncStatus?: 'success' | 'error';
        status: 'active' | 'inactive' | 'error';
        environment?: 'sandbox' | 'production';
        // Alleaves JWT Auth
        username?: string;
        password?: string;
        pin?: string;
        locationId?: string;
    };

    // Payment Configuration (Location Specific)
    paymentConfig?: PaymentConfig;

    // CannMenus Mapping
    cannMenusId?: string;

    createdAt: any;
    updatedAt: any;
}
