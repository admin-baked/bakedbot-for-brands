import { createServerClient } from '@/firebase/server-client';
import { ProductDoc } from '@/types/cannmenus';
import { v4 as uuidv4 } from 'uuid';

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

export class PricingService {

    async getCompetitorPricing(brandId: string, category: string): Promise<{
        average: number;
        low: number;
        high: number;
        count: number;
    }> {
        const { firestore } = await createServerClient();

        // Query products in the same category but NOT from this brand
        // Note: Firestore inequality filters have limitations, might need to filter in code
        // or use a composite index if we had one.
        // For now, we'll fetch products in the category and filter.

        const productsRef = firestore.collection('products');
        const snapshot = await productsRef.where('category', '==', category).get();

        let total = 0;
        let low = Infinity;
        let high = -Infinity;
        let count = 0;

        snapshot.forEach(doc => {
            const data = doc.data() as ProductDoc;
            // Filter out own brand
            if (data.brand_id !== brandId && data.price) {
                total += data.price;
                if (data.price < low) low = data.price;
                if (data.price > high) high = data.price;
                count++;
            }
        });

        if (count === 0) {
            return { average: 0, low: 0, high: 0, count: 0 };
        }

        return {
            average: parseFloat((total / count).toFixed(2)),
            low,
            high,
            count
        };
    }

    async generateRecommendations(brandId: string): Promise<PricingRecommendation[]> {
        const { firestore } = await createServerClient();

        // 1. Fetch brand products
        const productsRef = firestore.collection('products');
        const brandProductsSnapshot = await productsRef.where('brand_id', '==', brandId).get();

        const recommendations: PricingRecommendation[] = [];

        // 2. Analyze each product
        for (const doc of brandProductsSnapshot.docs) {
            const product = doc.data() as ProductDoc;

            if (!product.category || !product.price) continue;

            const marketStats = await this.getCompetitorPricing(brandId, product.category);

            if (marketStats.count < 3) continue; // Not enough data

            // Simple heuristic: If price is > 20% above average, suggest lowering
            // If price is < 20% below average, suggest raising (opportunity)

            const deviation = (product.price - marketStats.average) / marketStats.average;

            if (deviation > 0.2) {
                recommendations.push({
                    id: uuidv4(),
                    brandId,
                    productId: product.id,
                    productName: product.name,
                    currentPrice: product.price,
                    recommendedPrice: parseFloat((marketStats.average * 1.1).toFixed(2)), // Still premium but closer
                    marketAverage: marketStats.average,
                    marketLow: marketStats.low,
                    marketHigh: marketStats.high,
                    reason: `Price is ${Math.round(deviation * 100)}% above market average for ${product.category}. Consider lowering to capture more volume.`,
                    status: 'pending',
                    createdAt: new Date().toISOString()
                });
            } else if (deviation < -0.2) {
                recommendations.push({
                    id: uuidv4(),
                    brandId,
                    productId: product.id,
                    productName: product.name,
                    currentPrice: product.price,
                    recommendedPrice: parseFloat((marketStats.average * 0.9).toFixed(2)), // Still value but capturing margin
                    marketAverage: marketStats.average,
                    marketLow: marketStats.low,
                    marketHigh: marketStats.high,
                    reason: `Price is ${Math.round(Math.abs(deviation) * 100)}% below market average. Opportunity to increase margin.`,
                    status: 'pending',
                    createdAt: new Date().toISOString()
                });
            }
        }

        // 3. Store recommendations
        if (recommendations.length > 0) {
            const batch = firestore.batch();
            recommendations.forEach(rec => {
                const ref = firestore.collection('pricing_recommendations').doc(rec.id);
                batch.set(ref, rec);
            });
            await batch.commit();
        }

        return recommendations;
    }

    async getRecommendations(brandId: string): Promise<PricingRecommendation[]> {
        const { firestore } = await createServerClient();
        const snapshot = await firestore.collection('pricing_recommendations')
            .where('brandId', '==', brandId)
            .where('status', '==', 'pending')
            .get();

        return snapshot.docs.map(doc => doc.data() as PricingRecommendation);
    }
}
