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
import { getTransactionDetails as getCannPayTransactionDetails } from '@/lib/payments/cannpay';
import { getTransactionDetails as getAeropayTransactionDetails, AEROPAY_TRANSACTION_FEE_CENTS } from '@/lib/payments/aeropay';
import { logger } from '@/lib/monitoring';
import { deeboCheckCheckout } from '@/server/agents/deebo';
import { createServerClient } from '@/firebase/server-client';
import { withProtection } from '@/server/middleware/with-protection';
import { processPaymentSchema, type ProcessPaymentRequest } from '../../schemas';
import { recordProductSale } from '@/server/services/order-analytics';
import { requireUser } from '@/server/auth/auth';
import type { BillingAddress } from '@/types/orders';

// Force dynamic rendering - prevents build-time evaluation of agent dependencies
export const dynamic = 'force-dynamic';

function normalizeBillingAddress(address: any): BillingAddress | null {
    if (!address || typeof address !== 'object') return null;

    const street = typeof address.street === 'string' ? address.street.trim() : '';
    const street2 = typeof address.street2 === 'string' ? address.street2.trim() : undefined;
    const city = typeof address.city === 'string' ? address.city.trim() : '';
    const state = typeof address.state === 'string' ? address.state.trim().toUpperCase() : '';
    const zip = typeof address.zip === 'string' ? address.zip.trim() : '';
    const countryRaw = typeof address.country === 'string' ? address.country.trim().toUpperCase() : 'US';
    const country = countryRaw || 'US';

    if (!street || !city || !state || !zip) return null;
    if (state.length !== 2) return null;
    if (!/^\d{5}(-\d{4})?$/.test(zip)) return null;

    return {
        street,
        ...(street2 ? { street2 } : {}),
        city,
        state,
        zip,
        country,
    };
}

function parseCustomerName(fullName: string | undefined | null): { firstName: string; lastName: string } {
    const safeName = (fullName || '').trim();
    if (!safeName) {
        return { firstName: 'Customer', lastName: 'Checkout' };
    }

    const parts = safeName.split(/\s+/);
    return {
        firstName: parts[0] || 'Customer',
        lastName: parts.slice(1).join(' ') || parts[0] || 'Checkout',
    };
}

function isPaidLikeStatus(paymentStatus: string | undefined): boolean {
    return paymentStatus === 'paid' || paymentStatus === 'refunded' || paymentStatus === 'voided';
}

function getOrderTotal(order: any): number {
    return Number(order?.totals?.total ?? order?.amount ?? 0);
}

/**
 * Record sales analytics for a completed order (async, non-blocking)
 */
async function recordSalesForOrder(orderId: string, firestore: any) {
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

        const orgId = order.orgId || order.brandId;
        if (!orgId) {
            logger.warn('[CHECKOUT] Order missing orgId/brandId for sales tracking', { orderId });
            return;
        }

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
    }
}

export const POST = withProtection(
    async (_req: NextRequest, data?: ProcessPaymentRequest) => {
        try {
            const session = await requireUser();
            const sessionUid = session.uid;
            const sessionEmail = typeof session.email === 'string' ? session.email.toLowerCase() : '';

            const {
                amount,
                paymentData,
                customer,
                orderId,
                cart,
                dispensaryState,
                paymentMethod = 'dispensary_direct',
                billingAddress,
            } = data!;

            const isEmailUnverified =
                (session as any).email_verified === false ||
                (session as any).emailVerified === false;
            if (paymentMethod !== 'dispensary_direct' && isEmailUnverified) {
                return NextResponse.json(
                    { success: false, error: 'Email verification is required before processing payment.' },
                    { status: 403 },
                );
            }

            const { firestore } = await createServerClient();

            let ownedOrderDoc: FirebaseFirestore.DocumentSnapshot | null = null;
            let ownedOrder: any = null;

            if (orderId) {
                const orderDoc = await firestore.collection('orders').doc(orderId).get();
                if (!orderDoc.exists) {
                    return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
                }

                const order = orderDoc.data() || {};
                const orderEmail = typeof order?.customer?.email === 'string' ? order.customer.email.toLowerCase() : '';
                const isOwner = order.userId === sessionUid || (!!sessionEmail && orderEmail === sessionEmail);
                if (!isOwner) {
                    return NextResponse.json({ success: false, error: 'Forbidden: order access denied' }, { status: 403 });
                }

                ownedOrderDoc = orderDoc;
                ownedOrder = order;
            }

            // COMPLIANCE VALIDATION (Deebo Enforcement)
            if (customer && cart && dispensaryState) {
                logger.info('[P0-INT-DEEBO-CHECKOUT] Running compliance validation', {
                    orderId,
                    state: dispensaryState,
                    cartItems: cart.length,
                    sessionUid,
                });

                const checkoutCart = cart.map(item => ({
                    productType: (item.productType || 'flower') as 'flower' | 'concentrate' | 'edibles',
                    quantity: item.quantity,
                    name: item.productName,
                }));

                const complianceResult = await deeboCheckCheckout({
                    customer: {
                        uid: customer.uid || customer.id || sessionUid,
                        dateOfBirth: customer.dateOfBirth || '',
                        hasMedicalCard: customer.hasMedicalCard || false,
                        state: customer.state || dispensaryState,
                    },
                    cart: checkoutCart,
                    dispensaryState,
                });

                if (!complianceResult.allowed) {
                    logger.error('[P0-INT-DEEBO-CHECKOUT] Compliance validation FAILED', {
                        orderId,
                        errors: complianceResult.errors,
                        state: dispensaryState,
                    });

                    return NextResponse.json({
                        success: false,
                        error: 'Compliance validation failed',
                        complianceErrors: complianceResult.errors,
                        complianceWarnings: complianceResult.warnings,
                    }, { status: 403 });
                }

                if (complianceResult.warnings.length > 0) {
                    logger.warn('[P0-INT-DEEBO-CHECKOUT] Compliance warnings', {
                        orderId,
                        warnings: complianceResult.warnings,
                    });
                }
            } else {
                logger.warn('[P0-INT-DEEBO-CHECKOUT] Skipping compliance check - missing data', {
                    orderId,
                    hasCustomer: !!customer,
                    hasCart: !!cart,
                    hasState: !!dispensaryState,
                });
            }

            logger.info('[P0-PAY-SMOKEYPAY] Processing payment after compliance validation', {
                orderId,
                clientAmount: amount,
                paymentMethod,
                sessionUid,
            });

            // Option 1: Dispensary Direct (pay at pickup - no payment processing needed)
            if (paymentMethod === 'dispensary_direct') {
                if (orderId && ownedOrderDoc) {
                    await ownedOrderDoc.ref.update({
                        userId: ownedOrder?.userId || sessionUid,
                        paymentMethod: 'dispensary_direct',
                        paymentStatus: 'pending_pickup',
                        updatedAt: new Date().toISOString(),
                    });

                    setImmediate(async () => {
                        const { firestore: fs } = await createServerClient();
                        await recordSalesForOrder(orderId, fs);
                    });
                }

                return NextResponse.json({
                    success: true,
                    paymentMethod: 'dispensary_direct',
                    message: 'Order confirmed. Payment will be collected at pickup.',
                    complianceValidated: true,
                });
            }

            // Option 2: Smokey Pay (internal: CannPay integration)
            if (paymentMethod === 'cannpay') {
                const cannpayData = paymentData as any;
                const { intentId, transactionNumber } = cannpayData;

                if (!intentId || !transactionNumber) {
                    return NextResponse.json(
                        { error: 'Missing Smokey Pay transaction details' },
                        { status: 400 },
                    );
                }

                if (!orderId || !ownedOrderDoc || !ownedOrder) {
                    return NextResponse.json(
                        { error: 'Order ID is required for Smokey Pay finalization' },
                        { status: 400 },
                    );
                }

                if (isPaidLikeStatus(ownedOrder.paymentStatus)) {
                    return NextResponse.json(
                        { success: false, error: 'Order has already been paid or closed' },
                        { status: 409 },
                    );
                }

                const expectedIntentId = ownedOrder?.canpay?.intentId;
                if (!expectedIntentId || intentId !== expectedIntentId) {
                    return NextResponse.json(
                        { success: false, error: 'CannPay intent does not match this order' },
                        { status: 403 },
                    );
                }

                const providerTxn = await getCannPayTransactionDetails(intentId);
                const providerStatus = providerTxn.status;
                const providerTransactionNumber = providerTxn.canpayTransactionNumber || transactionNumber;
                const cannpaySuccessful = providerStatus === 'Success' || providerStatus === 'Settled';

                const orderTotal = getOrderTotal(ownedOrder);
                const expectedAmountCents = Math.round(orderTotal * 100);
                if (!Number.isFinite(expectedAmountCents) || expectedAmountCents <= 0) {
                    return NextResponse.json(
                        { success: false, error: 'Order total is invalid for payment' },
                        { status: 400 },
                    );
                }
                if (providerTxn.amount && Math.abs(Number(providerTxn.amount) - expectedAmountCents) > 0) {
                    return NextResponse.json(
                        { success: false, error: 'CannPay transaction amount mismatch' },
                        { status: 409 },
                    );
                }
                if (providerTxn.merchantOrderId && providerTxn.merchantOrderId !== orderId) {
                    return NextResponse.json(
                        { success: false, error: 'CannPay transaction is not bound to this order' },
                        { status: 409 },
                    );
                }

                const resolvedPaymentStatus =
                    cannpaySuccessful ? 'paid' : (providerStatus === 'Failed' || providerStatus === 'Voided' ? 'failed' : 'pending');

                await ownedOrderDoc.ref.update({
                    userId: ownedOrder?.userId || sessionUid,
                    paymentMethod: 'cannpay',
                    paymentStatus: resolvedPaymentStatus,
                    'canpay.transactionNumber': providerTransactionNumber,
                    'canpay.status': providerStatus,
                    'canpay.completedAt': cannpaySuccessful ? new Date().toISOString() : ownedOrder?.canpay?.completedAt || null,
                    updatedAt: new Date().toISOString(),
                });

                if (cannpaySuccessful) {
                    setImmediate(async () => {
                        const { firestore: fs } = await createServerClient();
                        await recordSalesForOrder(orderId, fs);
                    });
                }

                return NextResponse.json({
                    success: cannpaySuccessful,
                    paymentMethod: 'cannpay',
                    transactionId: providerTransactionNumber,
                    message: cannpaySuccessful ? 'Payment successful' : 'Payment pending or failed',
                    providerStatus,
                    complianceValidated: true,
                });
            }

            // Option 3: Aeropay (Bank Transfer)
            // @ts-ignore - Aeropay is a valid runtime payment method
            if (paymentMethod === 'aeropay') {
                const aeropayData = paymentData as any;
                const { transactionId } = aeropayData;

                if (!transactionId) {
                    return NextResponse.json(
                        { error: 'Missing Aeropay transaction details' },
                        { status: 400 },
                    );
                }

                if (!orderId || !ownedOrderDoc || !ownedOrder) {
                    return NextResponse.json(
                        { error: 'Order ID is required for Aeropay finalization' },
                        { status: 400 },
                    );
                }

                if (isPaidLikeStatus(ownedOrder.paymentStatus)) {
                    return NextResponse.json(
                        { success: false, error: 'Order has already been paid or closed' },
                        { status: 409 },
                    );
                }

                const expectedAeropayTransactionId = ownedOrder?.aeropay?.transactionId || ownedOrder?.transactionId;
                if (expectedAeropayTransactionId && expectedAeropayTransactionId !== transactionId) {
                    return NextResponse.json(
                        { success: false, error: 'Aeropay transaction does not match this order' },
                        { status: 403 },
                    );
                }

                const providerTxn = await getAeropayTransactionDetails(transactionId);
                const providerStatus = providerTxn.status;
                const aeropaySuccessful = providerStatus === 'completed';

                const orderTotal = getOrderTotal(ownedOrder);
                const expectedAmountCents = Math.round(orderTotal * 100) + AEROPAY_TRANSACTION_FEE_CENTS;
                if (!Number.isFinite(expectedAmountCents) || expectedAmountCents <= 0) {
                    return NextResponse.json(
                        { success: false, error: 'Order total is invalid for payment' },
                        { status: 400 },
                    );
                }
                if (Math.abs(Number(providerTxn.amount) - expectedAmountCents) > 0) {
                    return NextResponse.json(
                        { success: false, error: 'Aeropay transaction amount mismatch' },
                        { status: 409 },
                    );
                }
                if (providerTxn.merchantOrderId && providerTxn.merchantOrderId !== orderId) {
                    return NextResponse.json(
                        { success: false, error: 'Aeropay transaction is not bound to this order' },
                        { status: 409 },
                    );
                }

                const resolvedPaymentStatus =
                    aeropaySuccessful ? 'paid' : (providerStatus === 'declined' ? 'failed' : providerStatus);

                await ownedOrderDoc.ref.update({
                    userId: ownedOrder?.userId || sessionUid,
                    paymentMethod: 'aeropay',
                    paymentStatus: resolvedPaymentStatus,
                    'aeropay.transactionId': transactionId,
                    'aeropay.status': providerStatus,
                    'aeropay.completedAt': aeropaySuccessful ? new Date().toISOString() : ownedOrder?.aeropay?.completedAt || null,
                    updatedAt: new Date().toISOString(),
                });

                if (aeropaySuccessful) {
                    setImmediate(async () => {
                        const { firestore: fs } = await createServerClient();
                        await recordSalesForOrder(orderId, fs);
                    });
                }

                return NextResponse.json({
                    success: aeropaySuccessful,
                    paymentMethod: 'aeropay',
                    transactionId,
                    message: aeropaySuccessful ? 'Payment successful' : 'Payment pending or failed',
                    providerStatus,
                    complianceValidated: true,
                });
            }

            // Option 4: Credit Card (Authorize.Net)
            if (paymentMethod === 'credit_card') {
                if (!orderId) {
                    return NextResponse.json(
                        { success: false, error: 'Order ID is required for credit card payments' },
                        { status: 400 },
                    );
                }
                if (!ownedOrderDoc || !ownedOrder) {
                    return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
                }
                if (isPaidLikeStatus(ownedOrder.paymentStatus)) {
                    return NextResponse.json(
                        { success: false, error: 'Order has already been paid or closed' },
                        { status: 409 },
                    );
                }

                const orderTotal = Number(ownedOrder?.totals?.total ?? ownedOrder?.amount ?? 0);
                if (!Number.isFinite(orderTotal) || orderTotal <= 0) {
                    return NextResponse.json(
                        { success: false, error: 'Order total is invalid for payment' },
                        { status: 400 },
                    );
                }

                if (Math.abs(Number(amount) - orderTotal) > 0.01) {
                    logger.warn('[P0-PAY-SMOKEYPAY] Client card amount mismatch; using order total', {
                        orderId,
                        clientAmount: amount,
                        serverAmount: orderTotal,
                    });
                }

                const requestBilling = normalizeBillingAddress(billingAddress);
                const orderBilling = normalizeBillingAddress(ownedOrder.billingAddress);
                const orderShipping = normalizeBillingAddress(ownedOrder.shippingAddress);

                const userDoc = await firestore.collection('users').doc(sessionUid).get();
                const userBilling = normalizeBillingAddress(userDoc.data()?.billingAddress);

                const resolvedBilling = requestBilling || orderBilling || orderShipping || userBilling;
                if (!resolvedBilling) {
                    return NextResponse.json(
                        { success: false, error: 'Billing address is required for credit card payments' },
                        { status: 400 },
                    );
                }

                const cardData = paymentData as any;
                const orderCustomerName = typeof ownedOrder?.customer?.name === 'string' ? ownedOrder.customer.name : '';
                const names = parseCustomerName(orderCustomerName || customer?.firstName || customer?.lastName);
                const payerEmail =
                    sessionEmail ||
                    (typeof ownedOrder?.customer?.email === 'string' ? ownedOrder.customer.email : '') ||
                    customer?.email ||
                    undefined;

                const paymentRequest: PaymentRequest = {
                    amount: orderTotal,
                    orderId,
                    customer: {
                        email: payerEmail,
                        firstName: names.firstName,
                        lastName: names.lastName,
                        address: resolvedBilling.street,
                        city: resolvedBilling.city,
                        state: resolvedBilling.state,
                        zip: resolvedBilling.zip,
                    },
                    opaqueData: cardData?.opaqueData,
                    cardNumber: cardData?.cardNumber,
                    expirationDate: cardData?.expirationDate,
                    cvv: cardData?.cvv,
                    description: `Checkout order ${orderId}`,
                };

                const result = await createTransaction(paymentRequest);

                if (result.success) {
                    await ownedOrderDoc.ref.update({
                        userId: ownedOrder?.userId || sessionUid,
                        billingAddress: resolvedBilling,
                        transactionId: result.transactionId || null,
                        paymentMethod: 'credit_card',
                        paymentStatus: 'paid',
                        paymentProvider: 'authorize_net',
                        updatedAt: new Date().toISOString(),
                    });

                    await firestore.collection('users').doc(sessionUid).set({
                        billingAddress: resolvedBilling,
                        billingAddressUpdatedAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    }, { merge: true });

                    setImmediate(async () => {
                        const { firestore: fs } = await createServerClient();
                        await recordSalesForOrder(orderId, fs);
                    });

                    return NextResponse.json({
                        success: true,
                        paymentMethod: 'credit_card',
                        transactionId: result.transactionId,
                        message: result.message,
                        complianceValidated: true,
                    });
                }

                await ownedOrderDoc.ref.update({
                    userId: ownedOrder?.userId || sessionUid,
                    billingAddress: resolvedBilling,
                    paymentStatus: 'failed',
                    updatedAt: new Date().toISOString(),
                });

                return NextResponse.json({
                    success: false,
                    error: result.message,
                    details: result.errors,
                }, { status: 400 });
            }

            return NextResponse.json(
                { error: 'Invalid payment method' },
                { status: 400 },
            );
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            logger.error('Payment processing error', { error: err.message });
            return NextResponse.json(
                { error: 'Internal server error processing payment' },
                { status: 500 },
            );
        }
    },
    {
        schema: processPaymentSchema,
        csrf: true,
        appCheck: true,
        requireAuth: true,
    },
);
