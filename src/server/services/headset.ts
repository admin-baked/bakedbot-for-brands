import { logger } from '@/lib/logger';

const HEADSET_API_KEY = process.env.HEADSET_API_KEY;

export interface MarketTrend {
    category: string;
    growth: number; // Percentage
    topBrand: string;
    avgPrice: number;
}

export async function getCategoryTrends(category: string, state: string): Promise<MarketTrend> {
    if (!HEADSET_API_KEY) {
        logger.warn('[Headset] No API key, returning mock data');
        return {
            category,
            growth: 12.5,
            topBrand: 'Wyld',
            avgPrice: 24.50
        };
    }

    // Placeholder for real API call
    return {
        category,
        growth: 0,
        topBrand: 'Unknown',
        avgPrice: 0
    };
}

export async function getCompetitorPricing(brand: string, product: string): Promise<any> {
    logger.info(`[Headset] Checking pricing for ${brand} - ${product}`);
    // Mock response
    return {
        avgRetail: 35.00,
        low: 28.00,
        high: 45.00,
        competitors: ['Sunnyside', 'Zen Leaf']
    };
}
