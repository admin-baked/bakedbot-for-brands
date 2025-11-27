import { NextRequest, NextResponse } from 'next/server';
import { createTransaction, PaymentRequest } from '@/lib/authorize-net';
import { logger } from '@/lib/monitoring';
import { verifyAppCheck } from '@/server/middleware/app-check';

export async function POST(req: NextRequest) {
    try {
        // 1. App Check Verification
        const isAppCheckValid = await verifyAppCheck(req);
        if (!isAppCheckValid) {
            return NextResponse.json(
                { error: 'Unauthorized: Invalid App Check token' },
                { status: 401 }
            );
        }

        const body = await req.json();
        const { amount, paymentData, customer, orderId } = body;

        if (!amount || !paymentData) {
            return NextResponse.json(
                { error: 'Missing required payment fields' },
                { status: 400 }
            );
        }

        // 2. Prepare Payment Request
        const paymentRequest: PaymentRequest = {
            amount,
            orderId,
            customer,
            // Support both opaque data (Accept.js) and raw card data (PCI/Testing)
            opaqueData: paymentData.opaqueData,
            cardNumber: paymentData.cardNumber,
            expirationDate: paymentData.expirationDate,
            cvv: paymentData.cvv,
        };

        // 3. Process Transaction
        logger.info('Processing payment', { orderId, amount });
        const result = await createTransaction(paymentRequest);

        if (result.success) {
            logger.info('Payment successful', {
                orderId,
                transactionId: result.transactionId
            });

            return NextResponse.json({
                success: true,
                transactionId: result.transactionId,
                message: result.message
            });
        } else {
            logger.warn('Payment declined', {
                orderId,
                errors: result.errors
            });

            return NextResponse.json({
                success: false,
                error: result.message,
                details: result.errors
            }, { status: 400 });
        }

    } catch (error: any) {
        logger.error('Payment processing error', { error: error.message });
        return NextResponse.json(
            { error: 'Internal server error processing payment' },
            { status: 500 }
        );
    }
}
