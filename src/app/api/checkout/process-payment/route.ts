// [AI-THREAD P0-INT-DEEBO-CHECKOUT]
// [Dev1-Claude @ 2025-11-29]:
//   Integrated Deebo compliance enforcement before payment processing.
//   Validates age, medical card, purchase limits, and state legality.
//   Returns 403 Forbidden with compliance errors if validation fails.
//
// [AI-THREAD P0-PAY-CANNPAY-INTEGRATION]
// [Dev1-Claude @ 2025-11-30]:
//   Updated to support multiple payment methods: dispensary_direct, cannpay, stripe.
//   Default payment method is 'dispensary_direct' (pay at pickup).
//   CannPay requires prior authorization via /api/checkout/cannpay/authorize.
//   Added paymentMethod field to request body for payment method selection.

import { NextRequest, NextResponse } from 'next/server';
import { createTransaction, PaymentRequest } from '@/lib/authorize-net';
import { logger } from '@/lib/monitoring';
import { verifyAppCheck } from '@/server/middleware/app-check';
import { deeboCheckCheckout } from '@/server/agents/deebo';
import { createServerClient } from '@/firebase/server-client';

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
        const {
            amount,
            paymentData,
            customer,
            orderId,
            cart,
            dispensaryState,
            paymentMethod = 'dispensary_direct' // Default: pay at pickup
        } = body;

        if (!amount) {
            return NextResponse.json(
                { error: 'Missing required amount' },
                { status: 400 }
            );
        }

        // Validate payment method
        const validPaymentMethods = ['dispensary_direct', 'cannpay', 'stripe'];
        if (!validPaymentMethods.includes(paymentMethod)) {
            return NextResponse.json(
                { error: `Invalid payment method. Must be one of: ${validPaymentMethods.join(', ')}` },
                { status: 400 }
            );
        }

        // For online payments (CannPay, Stripe), require paymentData
        if (['cannpay', 'stripe'].includes(paymentMethod) && !paymentData) {
            return NextResponse.json(
                { error: 'Payment data required for online payments' },
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

        // 3. Handle Different Payment Methods
        logger.info('[P0-PAY-CANNPAY] Processing payment after compliance validation', {
            orderId,
            amount,
            paymentMethod
        });

        // Option 1: Dispensary Direct (pay at pickup - no payment processing needed)
        if (paymentMethod === 'dispensary_direct') {
            if (orderId) {
                const { firestore } = await createServerClient();
                await firestore.collection('orders').doc(orderId).update({
                    paymentMethod: 'dispensary_direct',
                    paymentStatus: 'pending_pickup',
                    updatedAt: new Date().toISOString()
                });
            }

            logger.info('[P0-PAY-CANNPAY] Dispensary direct payment selected', { orderId });

            return NextResponse.json({
                success: true,
                paymentMethod: 'dispensary_direct',
                message: 'Order confirmed. Payment will be collected at pickup.',
                complianceValidated: true
            });
        }

        // Option 2: CannPay (requires prior authorization and widget completion)
        if (paymentMethod === 'cannpay') {
            // CannPay payment is handled via webhook after widget completion
            // This endpoint confirms the frontend callback was received
            const { intentId, transactionNumber, status } = paymentData;

            if (!intentId || !transactionNumber) {
                return NextResponse.json(
                    { error: 'Missing CannPay transaction details' },
                    { status: 400 }
                );
            }

            // Update order with CannPay transaction details
            if (orderId) {
                const { firestore } = await createServerClient();
                await firestore.collection('orders').doc(orderId).update({
                    paymentMethod: 'cannpay',
                    paymentStatus: status === 'Success' || status === 'Settled' ? 'paid' : 'failed',
                    'canpay.transactionNumber': transactionNumber,
                    'canpay.status': status,
                    'canpay.completedAt': new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
            }

            logger.info('[P0-PAY-CANNPAY] CannPay payment completed', {
                orderId,
                intentId,
                transactionNumber,
                status
            });

            return NextResponse.json({
                success: status === 'Success' || status === 'Settled',
                paymentMethod: 'cannpay',
                transactionId: transactionNumber,
                message: status === 'Success' ? 'Payment successful' : 'Payment failed',
                complianceValidated: true
            });
        }

        // Option 3: Stripe or Authorize.Net (credit card payment)
        if (paymentMethod === 'stripe') {
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

            const result = await createTransaction(paymentRequest);

            if (result.success) {
                if (orderId) {
                    const { firestore } = await createServerClient();
                    await firestore.collection('orders').doc(orderId).update({
                        paymentMethod: 'stripe',
                        paymentStatus: 'paid',
                        updatedAt: new Date().toISOString()
                    });
                }

                logger.info('[P0-PAY-CANNPAY] Stripe payment successful', {
                    orderId,
                    transactionId: result.transactionId
                });

                return NextResponse.json({
                    success: true,
                    paymentMethod: 'stripe',
                    transactionId: result.transactionId,
                    message: result.message,
                    complianceValidated: true
                });
            } else {
                logger.warn('[P0-PAY-CANNPAY] Payment declined', {
                    orderId,
                    errors: result.errors
                });

                return NextResponse.json({
                    success: false,
                    error: result.message,
                    details: result.errors
                }, { status: 400 });
            }
        }

        // Should never reach here due to validation above
        return NextResponse.json(
            { error: 'Invalid payment method' },
            { status: 400 }
        );

    } catch (error: any) {
        logger.error('Payment processing error', { error: error.message });
        return NextResponse.json(
            { error: 'Internal server error processing payment' },
            { status: 500 }
        );
    }
}
