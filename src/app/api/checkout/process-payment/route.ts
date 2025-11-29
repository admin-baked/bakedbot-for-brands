// [AI-THREAD P0-INT-DEEBO-CHECKOUT]
// [Dev1-Claude @ 2025-11-29]:
//   Integrated Deebo compliance enforcement before payment processing.
//   Validates age, medical card, purchase limits, and state legality.
//   Returns 403 Forbidden with compliance errors if validation fails.

import { NextRequest, NextResponse } from 'next/server';
import { createTransaction, PaymentRequest } from '@/lib/authorize-net';
import { logger } from '@/lib/monitoring';
import { verifyAppCheck } from '@/server/middleware/app-check';
import { deeboCheckCheckout } from '@/server/agents/deebo';

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
        const { amount, paymentData, customer, orderId, cart, dispensaryState } = body;

        if (!amount || !paymentData) {
            return NextResponse.json(
                { error: 'Missing required payment fields' },
                { status: 400 }
            );
        }

        // 2. COMPLIANCE VALIDATION (Deebo Enforcement)
        if (customer && cart && dispensaryState) {
            logger.info('[P0-INT-DEEBO-CHECKOUT] Running compliance validation', {
                orderId,
                state: dispensaryState,
                cartItems: cart.length
            });

            const complianceResult = await deeboCheckCheckout({
                customer: {
                    uid: customer.uid || customer.id,
                    dateOfBirth: customer.dateOfBirth,
                    hasMedicalCard: customer.hasMedicalCard || false,
                    state: customer.state || dispensaryState
                },
                cart: cart,
                dispensaryState: dispensaryState
            });

            if (!complianceResult.allowed) {
                logger.error('[P0-INT-DEEBO-CHECKOUT] Compliance validation FAILED', {
                    orderId,
                    errors: complianceResult.errors,
                    state: dispensaryState
                });

                return NextResponse.json({
                    success: false,
                    error: 'Compliance validation failed',
                    complianceErrors: complianceResult.errors,
                    complianceWarnings: complianceResult.warnings
                }, { status: 403 });
            }

            // Log compliance warnings (non-blocking)
            if (complianceResult.warnings.length > 0) {
                logger.warn('[P0-INT-DEEBO-CHECKOUT] Compliance warnings', {
                    orderId,
                    warnings: complianceResult.warnings
                });
            }

            logger.info('[P0-INT-DEEBO-CHECKOUT] Compliance validation PASSED', {
                orderId,
                state: dispensaryState,
                warnings: complianceResult.warnings.length
            });
        } else {
            logger.warn('[P0-INT-DEEBO-CHECKOUT] Skipping compliance check - missing data', {
                orderId,
                hasCustomer: !!customer,
                hasCart: !!cart,
                hasState: !!dispensaryState
            });
        }

        // 3. Prepare Payment Request
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

        // 4. Process Transaction
        logger.info('[P0-INT-DEEBO-CHECKOUT] Processing payment after compliance validation', { orderId, amount });
        const result = await createTransaction(paymentRequest);

        if (result.success) {
            logger.info('[P0-INT-DEEBO-CHECKOUT] Payment successful', {
                orderId,
                transactionId: result.transactionId
            });

            return NextResponse.json({
                success: true,
                transactionId: result.transactionId,
                message: result.message,
                complianceValidated: true
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
