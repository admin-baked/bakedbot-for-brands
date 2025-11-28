/**
 * Personalized Recommendation Engine
 * Generates tailored product suggestions based on user history and preferences
 */

import { createServerClient } from '@/firebase/server-client';

export interface UserPreferences {
    likedProducts: string[];
    dislikedProducts: string[];
    viewedProducts: { productId: string; timestamp: Date }[];
    purchaseHistory: string[];
    preferredCategories: string[];
    preferredEffects: string[];
    priceRange: { min: number; max: number };
}

export interface Recommendation {
    productId: string;
    productName: string;
    score: number;
    reason: string;
    imageUrl?: string;
    price: number;
    category: string;
}

export class RecommendationEngine {
    async getRecommendations(userId: string, limit: number = 10): Promise<Recommendation[]> {
        const { firestore } = await createServerClient();

        const userDoc = await firestore.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            throw new Error('User not found');
        }

        const userData = userDoc.data();
        const preferences = (userData?.preferences || {
            likedProducts: [],
            dislikedProducts: [],
            viewedProducts: [],
            purchaseHistory: [],
            preferredCategories: [],
            preferredEffects: [],
            priceRange: { min: 0, max: 1000 },
        }) as UserPreferences;

        const productsSnapshot = await firestore
            .collection('products')
            .where('status', '==', 'active')
            .limit(100)
            .get();

        const candidates = productsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        })) as any[];

        const scoredCandidates: Recommendation[] = candidates.map(product => {
            let score = 0;
            const reasons: string[] = [];

            if (preferences.dislikedProducts.includes(product.id)) {
                return {
                    productId: product.id,
                    productName: product.name,
                    imageUrl: product.images?.[0],
                    price: product.price,
                    category: product.category,
                    score: -1,
                    reason: 'Disliked'
                };
            }

            if (preferences.purchaseHistory.includes(product.id)) {
                score += 5;
                reasons.push('Buy again');
            }

            if (preferences.preferredCategories.includes(product.category)) {
                score += 10;
                reasons.push(`Matches preferred category: ${product.category}`);
            }

            if (product.effects && Array.isArray(product.effects)) {
                const matchingEffects = product.effects.filter((e: string) =>
                    preferences.preferredEffects.includes(e)
                );
                if (matchingEffects.length > 0) {
                    score += matchingEffects.length * 3;
                    reasons.push(`Matches effects: ${matchingEffects.join(', ')}`);
                }
            }

            if (product.price >= preferences.priceRange.min && product.price <= preferences.priceRange.max) {
                score += 5;
            }

            return {
                productId: product.id,
                productName: product.name,
                imageUrl: product.images?.[0],
                price: product.price,
                category: product.category,
                score,
                reason: reasons[0] || 'Recommended for you',
            };
        });

        const recommendations = scoredCandidates
            .filter(p => p.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);

        return recommendations;
    }

    async trackInteraction(userId: string, type: 'view' | 'like' | 'dislike' | 'purchase', productId: string) {
        const { firestore } = await createServerClient();
        const userRef = firestore.collection('users').doc(userId);

        await firestore.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) return;

            const data = userDoc.data();
            const preferences = data?.preferences || {
                likedProducts: [],
                dislikedProducts: [],
                viewedProducts: [],
                purchaseHistory: [],
            };

            if (type === 'like') {
                if (!preferences.likedProducts.includes(productId)) {
                    preferences.likedProducts.push(productId);
                }
                preferences.dislikedProducts = preferences.dislikedProducts.filter((id: string) => id !== productId);
            } else if (type === 'dislike') {
                if (!preferences.dislikedProducts.includes(productId)) {
                    preferences.dislikedProducts.push(productId);
                }
                preferences.likedProducts = preferences.likedProducts.filter((id: string) => id !== productId);
            } else if (type === 'view') {
                preferences.viewedProducts.push({ productId, timestamp: new Date() });
                if (preferences.viewedProducts.length > 50) {
                    preferences.viewedProducts.shift();
                }
            } else if (type === 'purchase') {
                if (!preferences.purchaseHistory.includes(productId)) {
                    preferences.purchaseHistory.push(productId);
                }
            }

            transaction.update(userRef, { preferences });
        });
    }
}

export const recommendationEngine = new RecommendationEngine();
