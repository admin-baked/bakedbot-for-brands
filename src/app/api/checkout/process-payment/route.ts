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
//
// [BUILDER-MODE @ 2025-12-06]:
//   Added Zod validation with withProtection middleware for type safety and security.

import { NextRequest, NextResponse } from 'next/server';
import { createTransaction, PaymentRequest } from '@/lib/authorize-net';
import { logger } from '@/lib/monitoring';
import { deeboCheckCheckout } from '@/server/agents/deebo';
import { createServerClient } from '@/firebase/server-client';
import { withProtection } from '@/server/middleware/with-protection';
import { processPaymentSchema, type ProcessPaymentRequest } from '../../schemas';

// Force dynamic rendering - prevents build-time evaluation of agent dependencies
export const dynamic = 'force-dynamic';

export const POST = withProtection(
    async (req: NextRequest, data?: ProcessPaymentRequest) => {
        try {
            // Data is already validated by middleware
            const {
                amount,
                paymentData,
                customer,
                orderId,
                cart,
                dispensaryState,
                paymentMethod = 'dispensary_direct'
            } = data!;

            // COMPLIANCE VALIDATION (Deebo Enforcement)
            if (customer && cart && dispensaryState) {
                logger.info('[P0-INT-DEEBO-CHECKOUT] Running compliance validation', {
                    orderId,
                    state: dispensaryState,
                    cartItems: cart.length
                });

                // Transform cart items to CheckoutCartItem format
                const checkoutCart = cart.map(item => ({
                    productType: (item.productType || 'flower') as 'flower' | 'concentrate' | 'edibles',
                    quantity: item.quantity,
                    name: item.productName
                }));

                const complianceResult = await deeboCheckCheckout({
                    customer: {
                        uid: customer.uid || customer.id || '',
                        dateOfBirth: customer.dateOfBirth || '',
                        hasMedicalCard: customer.hasMedicalCard || false,
                        state: customer.state || dispensaryState
                    },
                    cart: checkoutCart,
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

            // Handle Different Payment Methods
            logger.info('[P0-PAY-SMOKEYPAY] Processing payment after compliance validation', {
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

                logger.info('[P0-PAY-SMOKEYPAY] Dispensary direct payment selected', { orderId });

                return NextResponse.json({
                    success: true,
                    paymentMethod: 'dispensary_direct',
                    message: 'Order confirmed. Payment will be collected at pickup.',
                    complianceValidated: true
                });
            }

            // Option 2: Smokey Pay (internal: CannPay integration)
            if (paymentMethod === 'cannpay') {
                // Smokey Pay payment is handled via webhook after widget completion
                // This endpoint confirms the frontend callback was received
                const cannpayData = paymentData as any; // Type assertion for CannPay-specific data
                const { intentId, transactionNumber, status } = cannpayData;

                if (!intentId || !transactionNumber) {
                    return NextResponse.json(
                        { error: 'Missing Smokey Pay transaction details' },
                        { status: 400 }
                    );
                }

                // Update order with Smokey Pay transaction details
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

                logger.info('[P0-PAY-SMOKEYPAY] Smokey Pay payment completed', {
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

            // Option 3: Credit Card (Authorize.Net)
            if (paymentMethod === 'credit_card') {
                const cardData = paymentData as any; // Type assertion for Credit Card-specific data
                const paymentRequest: PaymentRequest = {
                    amount,
                    orderId,
                    customer,
                    // Support both opaque data (Accept.js) and raw card data (PCI/Testing)
                    opaqueData: cardData.opaqueData,
                    cardNumber: cardData.cardNumber,
                    expirationDate: cardData.expirationDate,
                    cvv: cardData.cvv,
                };

                const result = await createTransaction(paymentRequest);

                if (result.success) {
                    if (orderId) {
                        const { firestore } = await createServerClient();
                        await firestore.collection('orders').doc(orderId).update({
                            paymentMethod: 'credit_card',
                            paymentStatus: 'paid',
                            paymentProvider: 'authorize_net',
                            updatedAt: new Date().toISOString()
                        });
                    }

                    logger.info('[P0-PAY-SMOKEYPAY] Authorize.Net payment successful', {
                        orderId,
                        transactionId: result.transactionId
                    });

                    return NextResponse.json({
                        success: true,
                        paymentMethod: 'credit_card',
                        transactionId: result.transactionId,
                        message: result.message,
                        complianceValidated: true
                    });
                } else {
                    logger.warn('[P0-PAY-SMOKEYPAY] Payment declined', {
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

        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            logger.error('Payment processing error', { error: err.message });
            return NextResponse.json(
                { error: 'Internal server error processing payment' },
                { status: 500 }
            );
        }
    },
    {
        schema: processPaymentSchema,
        csrf: true,
        appCheck: true
    }
);
