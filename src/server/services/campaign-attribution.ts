import { getAdminFirestore } from '@/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';

const ATTRIBUTION_WINDOW_HOURS = 72;

interface OrderForAttribution {
    id: string;
    customerEmail?: string;
    customerPhone?: string;
    total: number;
    createdAt: Date;
    orgId: string;
    items?: Array<{ name?: string; qty?: number; price?: number }>;
}

interface AttributionResult {
    orderId: string;
    campaignId: string;
    campaignName: string;
    recipientEmail: string;
    orderTotal: number;
    attributedAt: Date;
}

/**
 * Attribute a single order to any campaigns that targeted the same customer
 * within the attribution window (72 hours before the order).
 *
 * Returns the list of campaigns this order was attributed to (usually 0 or 1).
 */
export async function attributeOrderToCampaigns(order: OrderForAttribution): Promise<AttributionResult[]> {
    if (!order.customerEmail || order.customerEmail.includes('@alleaves.local')) {
        return [];
    }

    const db = getAdminFirestore();
    const email = order.customerEmail.toLowerCase().trim();
    const windowStart = new Date(order.createdAt.getTime() - ATTRIBUTION_WINDOW_HOURS * 60 * 60 * 1000);

    const campaignsSnap = await db.collection('campaigns')
        .where('orgId', '==', order.orgId)
        .where('status', 'in', ['sent', 'completed', 'sending'])
        .where('sentAt', '>=', Timestamp.fromDate(windowStart))
        .where('sentAt', '<=', Timestamp.fromDate(order.createdAt))
        .get();

    if (campaignsSnap.empty) return [];

    const results: AttributionResult[] = [];

    for (const campaignDoc of campaignsSnap.docs) {
        const campaign = campaignDoc.data();
        const campaignId = campaignDoc.id;

        const recipientSnap = await db.collection('campaigns').doc(campaignId)
            .collection('recipients')
            .where('email', '==', email)
            .limit(1)
            .get();

        if (recipientSnap.empty) continue;

        const attrRef = db.collection('campaigns').doc(campaignId)
            .collection('attributions').doc(order.id);
        const existing = await attrRef.get();
        if (existing.exists) continue;

        const attribution: AttributionResult = {
            orderId: order.id,
            campaignId,
            campaignName: campaign.name ?? campaign.subject ?? 'Unknown',
            recipientEmail: email,
            orderTotal: order.total,
            attributedAt: new Date(),
        };

        const batch = db.batch();

        batch.set(attrRef, {
            ...attribution,
            attributedAt: Timestamp.fromDate(attribution.attributedAt),
            orderCreatedAt: Timestamp.fromDate(order.createdAt),
            itemCount: order.items?.length ?? 0,
        });

        batch.update(campaignDoc.ref, {
            'performance.revenue': FieldValue.increment(order.total),
            'performance.conversions': FieldValue.increment(1),
            'performance.lastUpdated': Timestamp.now(),
        });

        const recipientDoc = recipientSnap.docs[0];
        batch.update(recipientDoc.ref, {
            converted: true,
            convertedAt: Timestamp.now(),
            orderTotal: order.total,
            orderId: order.id,
        });

        await batch.commit();

        results.push(attribution);

        logger.info('[CampaignAttribution] Order attributed', {
            orderId: order.id,
            campaignId,
            email,
            total: order.total,
        });
    }

    return results;
}

/**
 * Batch-attribute all orders for an org within a date range.
 * Used for backfilling attribution on historical orders.
 */
export async function backfillCampaignAttribution(
    orgId: string,
    startDate: Date,
    endDate: Date
): Promise<{ processed: number; attributed: number; revenue: number }> {
    const db = getAdminFirestore();

    const ordersSnap = await db.collection('orders')
        .where('orgId', '==', orgId)
        .where('createdAt', '>=', Timestamp.fromDate(startDate))
        .where('createdAt', '<=', Timestamp.fromDate(endDate))
        .where('status', 'in', ['completed', 'packed'])
        .get();

    let attributed = 0;
    let totalRevenue = 0;

    for (const doc of ordersSnap.docs) {
        const data = doc.data();
        const email = data.customer?.email ?? data.customerEmail;
        const total = data.totals?.total ?? data.totalAmount ?? data.total ?? 0;
        const createdAt = data.createdAt?.toDate?.() ?? new Date(data.createdAt);

        const results = await attributeOrderToCampaigns({
            id: doc.id,
            customerEmail: email,
            customerPhone: data.customer?.phone ?? data.phone,
            total,
            createdAt,
            orgId,
            items: data.items ?? data.lineItems,
        });

        if (results.length > 0) {
            attributed += results.length;
            totalRevenue += total;
        }
    }

    logger.info('[CampaignAttribution] Backfill complete', {
        orgId,
        processed: ordersSnap.size,
        attributed,
        revenue: totalRevenue,
    });

    return { processed: ordersSnap.size, attributed, revenue: totalRevenue };
}
