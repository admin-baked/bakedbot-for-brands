'use server';

import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';
import type { Product } from '@/types/domain';

export interface PromotionRecommendation {
    productId: string;
    productName: string;
    productImage: string;
    currentStock: number;
    daysSupply: number; // Estimated
    velocity: number; // Units/day
    suggestedAction: 'discount' | 'bundle' | 'social';
    suggestedDiscount?: number; // %
    reason: string;
}

export async function getPromotionRecommendations(brandId: string): Promise<PromotionRecommendation[]> {
    const user = await requireUser(['brand', 'owner']);
    // Filter by brand
    const { firestore } = await createServerClient();

    // Fetch products
    const productsSnap = await firestore.collection('products')
        .where('brandId', '==', user.brandId || brandId)
        .where('active', '==', true)
        .get();

    const recommendations: PromotionRecommendation[] = [];

    productsSnap.docs.forEach(doc => {
        const p = doc.data() as Product;
        const stock = p.stock || 0; // Assuming 'stock' field exists or we default to 0

        // Mock Velocity Calculation (Real app: check Order history over 30 days)
        // For demo: Randomly assign velocity
        const velocity = Math.random() * 2; // 0 to 2 units per day

        const daysSupply = velocity > 0 ? stock / velocity : 999;

        // Logic: Identify slow movers with stock
        if (stock > 50 && daysSupply > 60) {
            recommendations.push({
                productId: doc.id,
                productName: p.name,
                productImage: p.imageUrl || '',
                currentStock: stock,
                daysSupply: Math.round(daysSupply),
                velocity: Number(velocity.toFixed(2)),
                suggestedAction: 'discount',
                suggestedDiscount: 20,
                reason: 'Slow moving inventory (>60 days supply)'
            });
        }
        // Logic: Dead stock
        else if (stock > 10 && velocity === 0) {
            recommendations.push({
                productId: doc.id,
                productName: p.name,
                productImage: p.imageUrl || '',
                currentStock: stock,
                daysSupply: 999,
                velocity: 0,
                suggestedAction: 'bundle',
                suggestedDiscount: 30,
                reason: 'Dead stock (No sales recently)'
            });
        }
    });

    // Sort by urgency (days supply high -> low)
    return recommendations.sort((a, b) => b.daysSupply - a.daysSupply).slice(0, 5);
}

export async function createPromotion(productId: string, discountPercent: number) {
    // Logic to create a Coupon/Promo in DB
    const { firestore } = await createServerClient();
    const user = await requireUser();

    await firestore.collection('coupons').add({
        brandId: user.brandId,
        code: `AUTO-${productId.substring(0, 4).toUpperCase()}-${discountPercent}`,
        discount: discountPercent,
        type: 'percentage',
        targetProductId: productId,
        createdAt: new Date(),
        active: true,
        generatedBy: 'auto-promo-engine'
    });

    return { success: true };
}
