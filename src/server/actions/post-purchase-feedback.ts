'use server';

import { getAdminFirestore } from '@/firebase/admin';
import { normalizeEmail } from '@/lib/customer-import/column-mapping';
import { logger } from '@/lib/logger';
import { getGoogleReviewUrl } from '@/lib/reviews/google-review-url';
import { z } from 'zod';

const feedbackContextSchema = z.object({
    orgId: z.string().min(1),
    orderId: z.string().min(1),
    email: z.string().email(),
});

const submitFeedbackSchema = feedbackContextSchema.extend({
    rating: z.number().int().min(1).max(5),
    reviewText: z.string().trim().max(2000).optional().or(z.literal('')),
});

type ResolvedOrder = {
    id: string;
    data: Record<string, unknown>;
};

type OrderSummary = {
    orderId: string;
    customerName: string | null;
    customerEmail: string | null;
    customerId: string | null;
    primaryItemName: string | null;
    itemCount: number;
    orderDateLabel: string | null;
    orderedAt: string | null;
    total: number;
    status: string | null;
};

export interface PostPurchaseFeedbackContextResult {
    success: boolean;
    orderId?: string;
    customerName?: string | null;
    primaryItemName?: string | null;
    itemCount?: number;
    orderDateLabel?: string | null;
    orderedAt?: string | null;
    total?: number;
    googleReviewUrl?: string;
    alreadySubmitted?: boolean;
    error?: string;
}

export interface SubmitPostPurchaseFeedbackResult {
    success: boolean;
    googleReviewUrl?: string;
    googleReviewEligible?: boolean;
    managerAlertCreated: boolean;
    error?: string;
}

function toDate(value: unknown): Date | null {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value;
    }

    if (typeof value === 'string' || typeof value === 'number') {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    if (
        value &&
        typeof value === 'object' &&
        typeof (value as { toDate?: () => Date }).toDate === 'function'
    ) {
        const parsed = (value as { toDate: () => Date }).toDate();
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    return null;
}

function toNumber(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === 'string') {
        const parsed = Number.parseFloat(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    return 0;
}

function normalizeOrderStatus(value: unknown): string | null {
    return typeof value === 'string' ? value.trim().toLowerCase() : null;
}

function isCompletedOrderStatus(value: unknown): boolean {
    const normalized = normalizeOrderStatus(value);
    return normalized === 'completed'
        || normalized === 'fulfilled'
        || normalized === 'picked_up'
        || normalized === 'delivered';
}

function getOrderCustomerEmail(orderData: Record<string, unknown>): string | null {
    const customerRecord = orderData.customer;
    if (customerRecord && typeof customerRecord === 'object') {
        const nestedEmail = normalizeEmail((customerRecord as { email?: string }).email);
        if (nestedEmail) {
            return nestedEmail;
        }
    }

    return normalizeEmail(
        typeof orderData.customerEmail === 'string'
            ? orderData.customerEmail
            : typeof orderData.email === 'string'
                ? orderData.email
                : undefined,
    ) || null;
}

function summarizeOrder(order: ResolvedOrder): OrderSummary {
    const items = Array.isArray(order.data.items) ? order.data.items : [];
    const firstItem = items.find((item): item is Record<string, unknown> => (
        !!item &&
        typeof item === 'object' &&
        typeof (item as { name?: string }).name === 'string'
    ));
    const orderedAt = toDate(order.data.createdAt ?? order.data.updatedAt);
    const customerRecord = order.data.customer;
    const customerName = customerRecord && typeof customerRecord === 'object'
        ? typeof (customerRecord as { name?: string }).name === 'string'
            ? (customerRecord as { name: string }).name
            : null
        : typeof order.data.customerName === 'string'
            ? order.data.customerName
            : null;
    const customerId = typeof order.data.userId === 'string'
        ? order.data.userId
        : typeof order.data.customerId === 'string'
            ? order.data.customerId
            : null;
    const totalSource = order.data.totals && typeof order.data.totals === 'object'
        ? (order.data.totals as { total?: unknown }).total
        : order.data.total;

    return {
        orderId: order.id,
        customerName,
        customerEmail: getOrderCustomerEmail(order.data),
        customerId,
        primaryItemName: firstItem ? String(firstItem.name || '') : null,
        itemCount: items.length,
        orderDateLabel: orderedAt
            ? orderedAt.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
            })
            : null,
        orderedAt: orderedAt ? orderedAt.toISOString() : null,
        total: toNumber(totalSource),
        status: normalizeOrderStatus(order.data.status),
    };
}

function buildFeedbackDocId(orgId: string, orderId: string, email: string): string {
    return `${orgId}_${orderId}_${encodeURIComponent(email)}`;
}

async function resolveOrder(
    orgId: string,
    orderId: string,
): Promise<ResolvedOrder | null> {
    const db = getAdminFirestore();
    const candidateIds = Array.from(new Set([
        orderId,
        orderId.startsWith('alleaves_') ? orderId : `alleaves_${orderId}`,
    ]));

    for (const candidateId of candidateIds) {
        const orderDoc = await db.collection('orders').doc(candidateId).get();
        if (!orderDoc.exists) {
            continue;
        }

        const data = orderDoc.data() as Record<string, unknown>;
        const matchesOrg = data.brandId === orgId || data.retailerId === orgId || data.orgId === orgId;
        if (!matchesOrg) {
            continue;
        }

        return {
            id: orderDoc.id,
            data,
        };
    }

    return null;
}

async function feedbackAlreadySubmitted(
    orgId: string,
    orderId: string,
    email: string,
): Promise<boolean> {
    const db = getAdminFirestore();
    const feedbackDoc = await db.collection('customer_feedback')
        .doc(buildFeedbackDocId(orgId, orderId, email))
        .get();

    return feedbackDoc.exists;
}

async function validateFeedbackContext(
    orgId: string,
    orderId: string,
    email: string,
): Promise<{ order: ResolvedOrder; summary: OrderSummary } | { error: string }> {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
        return { error: 'Valid email required' };
    }

    const order = await resolveOrder(orgId, orderId);
    if (!order) {
        return { error: 'Order not found' };
    }

    const summary = summarizeOrder(order);
    if (!summary.customerEmail || summary.customerEmail !== normalizedEmail) {
        return { error: 'Order email mismatch' };
    }

    if (!isCompletedOrderStatus(summary.status)) {
        return { error: 'Order is not completed' };
    }

    return { order, summary };
}

export async function getPostPurchaseFeedbackContext(
    request: { orgId: string; orderId: string; email: string },
): Promise<PostPurchaseFeedbackContextResult> {
    try {
        const validated = feedbackContextSchema.parse(request);
        const normalizedEmail = normalizeEmail(validated.email);
        if (!normalizedEmail) {
            return { success: false, error: 'Valid email required' };
        }

        const result = await validateFeedbackContext(
            validated.orgId,
            validated.orderId,
            normalizedEmail,
        );

        if ('error' in result) {
            logger.warn('[PostPurchaseFeedback] Context validation failed', {
                orgId: validated.orgId,
                orderId: validated.orderId,
                email: normalizedEmail,
                reason: result.error,
            });
            return { success: false, error: result.error };
        }

        const alreadySubmitted = await feedbackAlreadySubmitted(
            validated.orgId,
            result.order.id,
            normalizedEmail,
        );
        const googleReviewUrl = await getGoogleReviewUrl(validated.orgId);

        return {
            success: true,
            orderId: result.order.id,
            customerName: result.summary.customerName,
            primaryItemName: result.summary.primaryItemName,
            itemCount: result.summary.itemCount,
            orderDateLabel: result.summary.orderDateLabel,
            orderedAt: result.summary.orderedAt,
            total: result.summary.total,
            googleReviewUrl: googleReviewUrl || undefined,
            alreadySubmitted,
        };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return {
                success: false,
                error: error.errors[0]?.message || 'Invalid feedback context payload',
            };
        }

        logger.error('[PostPurchaseFeedback] Failed to resolve feedback context', {
            error: error instanceof Error ? error.message : String(error),
            request,
        });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to resolve feedback context',
        };
    }
}

export async function submitPostPurchaseFeedback(
    request: { orgId: string; orderId: string; email: string; rating: number; reviewText?: string },
): Promise<SubmitPostPurchaseFeedbackResult> {
    try {
        const validated = submitFeedbackSchema.parse(request);
        const normalizedEmail = normalizeEmail(validated.email);
        if (!normalizedEmail) {
            return {
                success: false,
                managerAlertCreated: false,
                error: 'Valid email required',
            };
        }

        const validation = await validateFeedbackContext(
            validated.orgId,
            validated.orderId,
            normalizedEmail,
        );

        if ('error' in validation) {
            logger.warn('[PostPurchaseFeedback] Submission validation failed', {
                orgId: validated.orgId,
                orderId: validated.orderId,
                email: normalizedEmail,
                reason: validation.error,
            });
            return {
                success: false,
                managerAlertCreated: false,
                error: validation.error,
            };
        }

        const feedbackDocId = buildFeedbackDocId(
            validated.orgId,
            validation.order.id,
            normalizedEmail,
        );
        const db = getAdminFirestore();
        const feedbackRef = db.collection('customer_feedback').doc(feedbackDocId);
        const existingFeedback = await feedbackRef.get();

        if (existingFeedback.exists) {
            logger.warn('[PostPurchaseFeedback] Duplicate feedback prevented', {
                orgId: validated.orgId,
                orderId: validation.order.id,
                email: normalizedEmail,
            });
            return {
                success: false,
                managerAlertCreated: false,
                error: 'Feedback already submitted',
            };
        }

        const reviewText = validated.reviewText?.trim() || null;
        const googleReviewUrl = validated.rating >= 4
            ? await getGoogleReviewUrl(validated.orgId)
            : null;
        let managerAlertCreated = false;

        await feedbackRef.set({
            orgId: validated.orgId,
            orderId: validation.order.id,
            customerId: validation.summary.customerId,
            email: normalizedEmail,
            rating: validated.rating,
            reviewText,
            googleReviewEligible: Boolean(googleReviewUrl),
            customerName: validation.summary.customerName,
            primaryItemName: validation.summary.primaryItemName,
            itemCount: validation.summary.itemCount,
            orderDateLabel: validation.summary.orderDateLabel,
            orderedAt: validation.summary.orderedAt,
            total: validation.summary.total,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        if (validated.rating <= 3) {
            managerAlertCreated = true;
            await db.collection('heartbeat_notifications').add({
                orgId: validated.orgId,
                type: 'customer_feedback',
                priority: validated.rating <= 2 ? 'high' : 'medium',
                title: `Low purchase feedback: ${validation.summary.primaryItemName || validation.order.id}`,
                message: `${validated.rating}-star feedback from ${validation.summary.customerName || normalizedEmail}${reviewText ? ` - ${reviewText}` : ''}`,
                metadata: {
                    orderId: validation.order.id,
                    email: normalizedEmail,
                    rating: validated.rating,
                    reviewText,
                    primaryItemName: validation.summary.primaryItemName,
                    total: validation.summary.total,
                },
                createdAt: new Date(),
                read: false,
                notified: false,
            });
        }

        logger.info('[PostPurchaseFeedback] Feedback submitted', {
            orgId: validated.orgId,
            orderId: validation.order.id,
            email: normalizedEmail,
            rating: validated.rating,
            hasReviewText: Boolean(reviewText),
            googleReviewEligible: Boolean(googleReviewUrl),
            managerAlertCreated,
        });

        return {
            success: true,
            googleReviewUrl: googleReviewUrl || undefined,
            googleReviewEligible: Boolean(googleReviewUrl),
            managerAlertCreated,
        };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return {
                success: false,
                managerAlertCreated: false,
                error: error.errors[0]?.message || 'Invalid feedback submission payload',
            };
        }

        logger.error('[PostPurchaseFeedback] Failed to submit feedback', {
            error: error instanceof Error ? error.message : String(error),
            request,
        });
        return {
            success: false,
            managerAlertCreated: false,
            error: error instanceof Error ? error.message : 'Failed to submit feedback',
        };
    }
}
