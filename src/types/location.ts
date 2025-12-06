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
        provider: 'dutchie' | 'jane' | 'none';
        apiKey?: string;
        id?: string; // Shop ID
        sourceOfTruth: 'pos' | 'cannmenus';
        connectedAt?: string;
        status: 'active' | 'inactive' | 'error';
    };

    // CannMenus Mapping
    cannMenusId?: string;

    createdAt: any;
    updatedAt: any;
}
