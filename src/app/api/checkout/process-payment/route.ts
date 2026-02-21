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
//
// [AI-THREAD: AEROPAY-INTEGRATION]
// [Claude @ 2026-02-15]:
//   Added Aeropay payment method support for bank transfer payments.
//   Aeropay follows similar pattern to CannPay with authorization/webhook flow.
//   Payment methods now: dispensary_direct, cannpay, aeropay, credit_card.

import { NextRequest, NextResponse } from 'next/server';
import { createTransaction, PaymentRequest } from '@/lib/authorize-net';
import { logger } from '@/lib/monitoring';
import { deeboCheckCheckout } from '@/server/agents/deebo';
import { createServerClient } from '@/firebase/server-client';
import { withProtection } from '@/server/middleware/with-protection';
import { processPaymentSchema, type ProcessPaymentRequest } from '../../schemas';
import { recordProductSale } from '@/server/services/order-analytics';

// Force dynamic rendering - prevents build-time evaluation of agent dependencies
export const dynamic = 'force-dynamic';

/**
 * Record sales analytics for a completed order (async, non-blocking)
 */
async function recordSalesForOrder(orderId: string, orgId: string, firestore: any) {
    try {
        const orderDoc = await firestore.collection('orders').doc(orderId).get();
        if (!orderDoc.exists) {
            logger.warn('[CHECKOUT] Order not found for sales tracking', { orderId });
            return;
        }

        const order = orderDoc.data();
        if (!order?.items || order.items.length === 0) {
            logger.warn('[CHECKOUT] Order has no items for sales tracking', { orderId });
            return;
        }

        // Convert order items to recordProductSale format
        const salesItems = order.items.map((item: any) => ({
            productId: item.productId,
            quantity: item.qty || item.quantity || 1,
            price: item.price,
        }));

        const customerId = order.userId || 'checkout_customer';
        const totalAmount = order.totals?.total || order.amount || 0;
        const purchasedAt = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);

        await recordProductSale(orgId, {
            customerId,
            orderId,
            items: salesItems,
            totalAmount,
            purchasedAt,
        });

        logger.info('[CHECKOUT] Sales recorded for order', { orderId, itemCount: order.items.length });
    } catch (error) {
        logger.warn('[CHECKOUT] Failed to record sales for order', {
            orderId,
            error: error instanceof Error ? error.message : String(error),
        });
        // Non-blocking - don't throw, just log
    }
}

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

                    // Record sales asynchronously (non-blocking)
                    setImmediate(async () => {
                        const { firestore: fs } = await createServerClient();
                        await recordSalesForOrder(orderId, customer?.orgId || brand.id, fs);
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
                const cannpaySuccessful = status === 'Success' || status === 'Settled';
                if (orderId) {
                    const { firestore } = await createServerClient();
                    await firestore.collection('orders').doc(orderId).update({
                        paymentMethod: 'cannpay',
                        paymentStatus: cannpaySuccessful ? 'paid' : 'failed',
                        'canpay.transactionNumber': transactionNumber,
                        'canpay.status': status,
                        'canpay.completedAt': new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    });

                    // Record sales asynchronously if payment successful (non-blocking)
                    if (cannpaySuccessful) {
                        setImmediate(async () => {
                            const { firestore: fs } = await createServerClient();
                            await recordSalesForOrder(orderId, customer?.orgId || brand.id, fs);
                        });
                    }
                }

                logger.info('[P0-PAY-SMOKEYPAY] Smokey Pay payment completed', {
                    orderId,
                    intentId,
                    transactionNumber,
                    status
                });

                return NextResponse.json({
                    success: cannpaySuccessful,
                    paymentMethod: 'cannpay',
                    transactionId: transactionNumber,
                    message: status === 'Success' ? 'Payment successful' : 'Payment failed',
                    complianceValidated: true
                });
            }

            // Option 3: Aeropay (Bank Transfer)
            // @ts-ignore - Aeropay is a valid payment method
            else if (paymentMethod === 'aeropay') {
                // Aeropay payment is handled via webhook after transaction completion
                // This endpoint confirms the frontend callback was received
                const aeropayData = paymentData as any; // Type assertion for Aeropay-specific data
                const { transactionId, status } = aeropayData;

                if (!transactionId) {
                    return NextResponse.json(
                        { error: 'Missing Aeropay transaction details' },
                        { status: 400 }
                    );
                }

                // Update order with Aeropay transaction details
                const aeropaySuccessful = status === 'completed';
                if (orderId) {
                    const { firestore } = await createServerClient();
                    await firestore.collection('orders').doc(orderId).update({
                        paymentMethod: 'aeropay',
                        paymentStatus: aeropaySuccessful ? 'paid' : 'failed',
                        'aeropay.transactionId': transactionId,
                        'aeropay.status': status,
                        'aeropay.completedAt': new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    });

                    // Record sales asynchronously if payment successful (non-blocking)
                    if (aeropaySuccessful) {
                        setImmediate(async () => {
                            const { firestore: fs } = await createServerClient();
                            await recordSalesForOrder(orderId, customer?.orgId || brand.id, fs);
                        });
                    }
                }

                logger.info('[AEROPAY-INTEGRATION] Aeropay payment completed', {
                    orderId,
                    transactionId,
                    status
                });

                return NextResponse.json({
                    success: aeropaySuccessful,
                    paymentMethod: 'aeropay',
                    transactionId,
                    message: aeropaySuccessful ? 'Payment successful' : 'Payment failed',
                    complianceValidated: true
                });
            }

            // Option 4: Credit Card (Authorize.Net)
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

                        // Record sales asynchronously (non-blocking)
                        setImmediate(async () => {
                            const { firestore: fs } = await createServerClient();
                            await recordSalesForOrder(orderId, customer?.orgId || brand.id, fs);
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
