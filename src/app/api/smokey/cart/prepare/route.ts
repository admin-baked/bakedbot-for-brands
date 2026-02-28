// src/app/api/smokey/cart/prepare/route.ts
/**
 * Smokey Cart Prepare API
 * Creates draft cart and generates handoff URL for checkout routing
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/monitoring';
import type {
    PrepareCartRequest,
    PrepareCartResponse,
    DraftCart,
} from '@/types/smokey-actions';
import { requireUser } from '@/server/auth/auth';
import { z } from 'zod';

const DOCUMENT_ID_REGEX = /^[A-Za-z0-9_-]{1,128}$/;

const prepareCartSchema = z.object({
    dispId: z.string().trim().regex(DOCUMENT_ID_REGEX, 'Invalid dispId'),
    items: z.array(z.object({
        productId: z.string().trim().regex(DOCUMENT_ID_REGEX, 'Invalid productId'),
        qty: z.number().int().min(1).max(100),
    })).min(1).max(100),
    handoffType: z.enum(['deepLink', 'prefilledUrl']).optional(),
}).strict();

export async function POST(request: NextRequest) {
    try {
        let session;
        try {
            session = await requireUser();
        } catch {
            return NextResponse.json(
                { success: false, error: 'Authentication required' },
                { status: 401 }
            );
        }

        const body: PrepareCartRequest = prepareCartSchema.parse(await request.json());
        const { dispId, items, handoffType = 'deepLink' } = body;
        const userId = session.uid;

        const firestore = getAdminFirestore();

        // Get dispensary info
        const dispDoc = await firestore.collection('dispensaries').doc(dispId).get();
        const dispensary = dispDoc.data();

        if (!dispensary) {
            return NextResponse.json(
                { success: false, error: 'Dispensary not found' },
                { status: 404 }
            );
        }

        // Get product details for items
        const draftItems = await Promise.all(items.map(async item => {
            const productDoc = await firestore
                .collection('dispensaries')
                .doc(dispId)
                .collection('products')
                .doc(item.productId)
                .get();

            const product = productDoc.data();
            return {
                productId: item.productId,
                productName: product?.name || 'Unknown Product',
                qty: item.qty,
                unitPriceSnapshot: product?.price || 0,
            };
        }));

        // Generate handoff URL
        const handoffUrl = generateHandoffUrl(dispensary, draftItems, handoffType);

        // Create draft cart
        const cartRef = firestore.collection('draftCarts').doc();
        const now = new Date();
        const expiresAt = new Date(now);
        expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry

        const draftCart: DraftCart = {
            id: cartRef.id,
            userId,
            dispId,
            items: draftItems,
            handoff: {
                type: handoffType,
                url: handoffUrl,
            },
            status: 'created',
            createdAt: now,
            expiresAt,
        };

        await cartRef.set(draftCart);

        // Log event
        await firestore.collection('events').add({
            type: 'cartPrepared',
            userId,
            payload: {
                draftCartId: draftCart.id,
                dispId,
                itemCount: items.length,
            },
            createdAt: now,
        });

        logger.info('Draft cart prepared', { draftCartId: draftCart.id, userId, dispId });

        const response: PrepareCartResponse = {
            success: true,
            draftCartId: draftCart.id,
            handoffUrl,
            expiresAt,
        };

        return NextResponse.json(response);

    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, error: error.issues[0]?.message || 'Invalid request payload' },
                { status: 400 }
            );
        }
        logger.error('Prepare cart failed:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

/**
 * Generate handoff URL based on dispensary's integration type
 * Priority: CanPay (for cannabis) > Dutchie > Jane > Website > Google Maps
 */
function generateHandoffUrl(
    dispensary: any,
    items: any[],
    handoffType: string
): string {
    // Check if dispensary has CanPay integration for cannabis payments
    if (dispensary.cannpayEnabled && dispensary.cannpayMerchantId) {
        // For CanPay, we return a special URL that triggers the CanPay flow
        // The actual payment intent will be created when user clicks checkout
        const totalAmount = items.reduce((sum, item) => sum + (item.unitPriceSnapshot * item.qty), 0);
        return `/checkout/cannpay?dispId=${dispensary.id || ''}&amount=${Math.round(totalAmount * 100)}&items=${encodeURIComponent(JSON.stringify(items.map(i => ({ id: i.productId, qty: i.qty }))))}`;
    }

    // If dispensary has Dutchie, Jane, or other partner integration
    if (dispensary.dutchieSlug) {
        return `https://dutchie.com/${dispensary.dutchieSlug}`;
    }

    if (dispensary.janeSlug) {
        return `https://www.iheartjane.com/stores/${dispensary.janeSlug}`;
    }

    // Fallback to website with product hints
    if (dispensary.website) {
        const productQuery = items.map(i => i.productName).join(',');
        return `${dispensary.website}?products=${encodeURIComponent(productQuery)}`;
    }

    // Last resort - Google Maps directions
    const placeId = dispensary.google?.placeId;
    if (placeId) {
        return `https://www.google.com/maps/dir/?api=1&destination_place_id=${placeId}`;
    }

    return '#';
}

