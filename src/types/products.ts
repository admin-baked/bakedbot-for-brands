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

export type Product = {
    id: string;
    name: string;
    category: string;
    price: number;
    prices?: { [retailerId: string]: number };
    imageUrl: string;
    imageHint: string;
    description: string;
    likes?: number;
    dislikes?: number;
    brandId: string;
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
    lat?: number;
    lon?: number;
    distance?: number;
    tabletDeviceToken?: string | null;
    acceptsOrders?: boolean;
    status?: 'active' | 'inactive';
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
