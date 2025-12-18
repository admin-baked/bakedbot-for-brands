// src/app/api/checkout/cannpay/route.ts
/**
 * CanPay Checkout API
 * Creates a CanPay payment intent for dispensary purchases
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/monitoring';
import { cookies } from 'next/headers';
import { authorizePayment, CANNPAY_TRANSACTION_FEE_CENTS } from '@/lib/payments/cannpay';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { dispId, amount, items, draftCartId } = body;

        // Get user ID from session
        const cookieStore = await cookies();
        const userId = cookieStore.get('userId')?.value;

        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'Authentication required' },
                { status: 401 }
            );
        }

        // Validate request
        if (!dispId || !amount) {
            return NextResponse.json(
                { success: false, error: 'dispId and amount are required' },
                { status: 400 }
            );
        }

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
        logger.error('CanPay checkout failed:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

