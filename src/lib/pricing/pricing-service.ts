/**
 * Pricing Intelligence Service
 * Analyzes competitor pricing and generates recommendations
 */

'use server';

import { createServerClient } from '@/firebase/server-client';

export interface PricingData {
    productId: string;
    productName: string;
    brandPrice: number;
    marketAverage: number;
    marketMin: number;
    marketMax: number;
    competitorCount: number;
    pricePosition: 'low' | 'average' | 'high';
}

export interface PricingRecommendation {
    id: string;
    productId: string;
    productName: string;
    currentPrice: number;
    recommendedPrice: number;
    expectedImpact: {
        revenueChange: number; // percentage
        volumeChange: number; // percentage
    };
    reasoning: string;
    confidence: number; // 0-1
    createdAt: Date;
    status: 'pending' | 'applied' | 'dismissed';
}

export class PricingService {
    /**
     * Get competitor pricing data for a brand's products
     */
    async getCompetitorPricing(brandId: string): Promise<PricingData[]> {
        const { firestore } = await createServerClient();

        // Get brand's products
        const productsSnapshot = await firestore
            .collection('products')
            .where('brandId', '==', brandId)
            .get();

        const pricingData: PricingData[] = [];

        for (const productDoc of productsSnapshot.docs) {
            const product = productDoc.data();

            // Find similar products from competitors
            // In a real implementation, this would use more sophisticated matching
            const competitorSnapshot = await firestore
                .collection('products')
                .where('category', '==', product.category)
                .where('brandId', '!=', brandId)
                .limit(50)
                .get();

            const competitorPrices = competitorSnapshot.docs
                .map(doc => doc.data().price)
                .filter(price => price > 0);

            if (competitorPrices.length === 0) continue;

            const marketAverage = competitorPrices.reduce((a, b) => a + b, 0) / competitorPrices.length;
            const marketMin = Math.min(...competitorPrices);
            const marketMax = Math.max(...competitorPrices);

            let pricePosition: 'low' | 'average' | 'high' = 'average';
            if (product.price < marketAverage * 0.9) pricePosition = 'low';
            else if (product.price > marketAverage * 1.1) pricePosition = 'high';

            pricingData.push({
                productId: productDoc.id,
                productName: product.name,
                brandPrice: product.price,
                marketAverage,
                marketMin,
                marketMax,
                competitorCount: competitorPrices.length,
                pricePosition,
            });
        }

        return pricingData;
    }

    /**
     * Generate pricing recommendations based on market data
     */
    async generateRecommendations(brandId: string): Promise<PricingRecommendation[]> {
        const pricingData = await this.getCompetitorPricing(brandId);
        const { firestore } = await createServerClient();

        const recommendations: PricingRecommendation[] = [];

        for (const data of pricingData) {
            // Simple heuristic-based recommendations
            // In production, this would use ML models
            let recommendedPrice = data.brandPrice;
            let reasoning = '';
            let confidence = 0.5;

            if (data.pricePosition === 'high') {
                // Price is too high - recommend lowering
                recommendedPrice = Math.round(data.marketAverage * 1.05 * 100) / 100;
                reasoning = `Your price is ${((data.brandPrice / data.marketAverage - 1) * 100).toFixed(1)}% above market average. Lowering to ${recommendedPrice.toFixed(2)} could increase sales volume by 15-20%.`;
                confidence = 0.75;
            } else if (data.pricePosition === 'low') {
                // Price is too low - recommend raising
                recommendedPrice = Math.round(data.marketAverage * 0.95 * 100) / 100;
                reasoning = `Your price is ${((1 - data.brandPrice / data.marketAverage) * 100).toFixed(1)}% below market average. Raising to ${recommendedPrice.toFixed(2)} could increase revenue by 10-15% with minimal volume impact.`;
                confidence = 0.70;
            } else {
                // Price is optimal - minor adjustment
                recommendedPrice = Math.round(data.marketAverage * 100) / 100;
                reasoning = `Your price is competitive. Consider matching market average of ${recommendedPrice.toFixed(2)} for optimal positioning.`;
                confidence = 0.60;
            }

            // Only create recommendation if there's a meaningful change
            if (Math.abs(recommendedPrice - data.brandPrice) > 0.50) {
                const recommendation: PricingRecommendation = {
                    id: `rec_${data.productId}_${Date.now()}`,
                    productId: data.productId,
                    productName: data.productName,
                    currentPrice: data.brandPrice,
                    recommendedPrice,
                    expectedImpact: {
                        revenueChange: data.pricePosition === 'low' ? 12 : -5,
                        volumeChange: data.pricePosition === 'high' ? 18 : -8,
                    },
                    reasoning,
                    confidence,
                    createdAt: new Date(),
                    status: 'pending',
                };

                // Store recommendation in Firestore
                await firestore
                    .collection('brands')
                    .doc(brandId)
                    .collection('pricingRecommendations')
                    .doc(recommendation.id)
                    .set(recommendation);

                recommendations.push(recommendation);
            }
        }

        return recommendations;
    }

    /**
     * Get active recommendations for a brand
     */
    async getRecommendations(brandId: string): Promise<PricingRecommendation[]> {
        const { firestore } = await createServerClient();

        const snapshot = await firestore
            .collection('brands')
            .doc(brandId)
            .collection('pricingRecommendations')
            .where('status', '==', 'pending')
            .orderBy('createdAt', 'desc')
            .limit(20)
            .get();

        return snapshot.docs.map(doc => ({
            ...doc.data(),
            createdAt: doc.data().createdAt.toDate(),
        })) as PricingRecommendation[];
    }

    /**
     * Apply a pricing recommendation
     */
    async applyRecommendation(brandId: string, recommendationId: string): Promise<void> {
        const { firestore } = await createServerClient();

        const recDoc = await firestore
            .collection('brands')
            .doc(brandId)
            .collection('pricingRecommendations')
            .doc(recommendationId)
            .get();

        if (!recDoc.exists) {
            throw new Error('Recommendation not found');
        }

        const rec = recDoc.data() as PricingRecommendation;

        // Update product price
        await firestore
            .collection('products')
            .doc(rec.productId)
            .update({
                price: rec.recommendedPrice,
                updatedAt: new Date(),
            });

        // Mark recommendation as applied
        await recDoc.ref.update({
            status: 'applied',
            appliedAt: new Date(),
        });
    }

    /**
     * Dismiss a pricing recommendation
     */
    async dismissRecommendation(brandId: string, recommendationId: string): Promise<void> {
        const { firestore } = await createServerClient();

        await firestore
            .collection('brands')
            .doc(brandId)
            .collection('pricingRecommendations')
            .doc(recommendationId)
            .update({
                status: 'dismissed',
                dismissedAt: new Date(),
            });
    }
}

export const pricingService = new PricingService();
