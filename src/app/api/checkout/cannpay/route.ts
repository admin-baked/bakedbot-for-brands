// src/app/api/checkout/cannpay/route.ts
/**
 * CanPay Checkout API
 * Creates a CanPay payment intent for dispensary purchases
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/monitoring';
import { authorizePayment, CANNPAY_TRANSACTION_FEE_CENTS } from '@/lib/payments/cannpay';
import { requireUser } from '@/server/auth/auth';
import { z } from 'zod';

const DOCUMENT_ID_REGEX = /^[A-Za-z0-9_-]{1,128}$/;

const cannpayCheckoutSchema = z.object({
    dispId: z.string().trim().regex(DOCUMENT_ID_REGEX, 'Invalid dispensary id'),
    amount: z.number().int().min(1).max(500000),
    items: z.array(z.unknown()).optional(),
    draftCartId: z.string().trim().regex(DOCUMENT_ID_REGEX, 'Invalid draft cart id').optional(),
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
        const userId = session.uid;

        const body = cannpayCheckoutSchema.parse(await request.json());
        const { dispId, amount, items, draftCartId } = body;

        // Validate request
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

        // Check CanPay is enabled
        if (!dispensary.cannpayEnabled || !dispensary.cannpayMerchantId) {
            return NextResponse.json(
                { success: false, error: 'CanPay not configured for this dispensary' },
                { status: 400 }
            );
        }

        // Create CanPay payment intent
        const paymentResult = await authorizePayment({
            amount: amount, // Amount in cents
            deliveryFee: CANNPAY_TRANSACTION_FEE_CENTS,
            merchantOrderId: draftCartId || `order_${Date.now()}`,
            passthrough: JSON.stringify({
                userId,
                dispId,
                items,
                draftCartId,
            }),
        });

        // Save payment intent to Firestore
        await firestore.collection('cannpayIntents').add({
            intentId: paymentResult.intent_id,
            userId,
            dispId,
            amount,
            items,
            draftCartId,
            status: 'pending',
            createdAt: new Date(),
            expiresAt: paymentResult.expires_at,
        });

        // Log event
        await firestore.collection('events').add({
            type: 'cannpay.intentCreated',
            userId,
            payload: {
                intentId: paymentResult.intent_id,
                dispId,
                amount,
            },
            createdAt: new Date(),
        });

        logger.info('CanPay intent created', {
            intentId: paymentResult.intent_id,
            userId,
            dispId,
        });

        return NextResponse.json({
            success: true,
            intentId: paymentResult.intent_id,
            widgetUrl: paymentResult.widget_url,
            expiresAt: paymentResult.expires_at,
        });

    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, error: error.issues[0]?.message || 'Invalid request payload' },
                { status: 400 }
            );
        }
        logger.error('CanPay checkout failed:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

