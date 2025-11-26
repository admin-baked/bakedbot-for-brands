export type PricingRecommendation = {
    id: string;
    brandId: string;
    productId: string;
    productName: string;
    currentPrice: number;
    recommendedPrice: number;
    marketAverage: number;
    marketLow: number;
    marketHigh: number;
    reason: string;
    status: 'pending' | 'applied' | 'dismissed';
    createdAt: string;
};
