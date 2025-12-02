export type UserProfile = {
    id: string;
    uid: string;
    email: string | null;
    displayName: string | null;
    role: 'brand' | 'dispensary' | 'customer' | 'owner' | null;
    brandId: string | null;
    locationId: string | null;
    favoriteRetailerId?: string | null;
};
