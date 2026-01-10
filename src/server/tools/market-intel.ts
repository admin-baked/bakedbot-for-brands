import { getCategoryTrends } from '@/server/services/headset';
import { CannMenusService } from '@/server/services/cannmenus';
import { CannMenusProduct } from '@/types/cannmenus';

const cannMenusService = new CannMenusService();

export const MarketIntelTools = {
    getTrends: async (category: string, state: string = 'US') => {
        return await getCategoryTrends(category, state);
    },

    checkCompetitorPrice: async (brand: string, product: string) => {
        // Use real data from CannMenus if possible
        try {
            const results = await cannMenusService.searchProducts({
                search: product,
                brands: brand,
                limit: 5 // Get top 5 listings
            });

            if (results.products && results.products.length > 0) {
                const productList = results.products as CannMenusProduct[];
                const prices = productList
                    .map(p => p.latest_price)
                    .filter((p): p is number => typeof p === 'number');
                
                if (prices.length === 0) throw new Error('No valid prices');

                const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
                const competitors = productList.map(p => p.retailer_name || 'Unknown Retailer');

                return {
                    avgRetail: parseFloat(avg.toFixed(2)),
                    competitors: Array.from(new Set(competitors)), // Dedupe using Array.from
                    source: 'CannMenus (Live)'
                };
            }
        } catch (error) {
            console.error('CannMenus lookup failed, falling back to mock', error);
        }

        // Fallback to mock/Headset if no results or error
        return {
            avgRetail: 0,
            competitors: [],
            source: 'Mock (Fallback)'
        };
    }
};
