/**
 * POST /api/admin/backfill-orders
 *
 * One-time / on-demand endpoint to fetch ALL historical Alleaves orders
 * and persist them to Firestore `orders` collection.
 *
 * Auth: Bearer CRON_SECRET (same as other cron endpoints)
 * Body: { orgId: string, startDate?: string (YYYY-MM-DD, default "2020-01-01") }
 *
 * Uses batched upserts (merge) so it's safe to re-run — no duplicates.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/firebase/server-client';
import { ALLeavesClient, type ALLeavesConfig } from '@/lib/pos/adapters/alleaves';
import { logger } from '@/lib/logger';

const CRON_SECRET = process.env.CRON_SECRET;
const BATCH_SIZE = 400; // Firestore max is 500

async function persistOrdersToFirestore(
    firestore: FirebaseFirestore.Firestore,
    orgId: string,
    locationId: string,
    rawOrders: any[]
): Promise<number> {
    const { Timestamp } = await import('firebase-admin/firestore');
    let batch = firestore.batch();
    let batchCount = 0;
    let total = 0;
    let skipped = 0;

    const mapStatus = (s: string): string => {
        const map: Record<string, string> = {
            pending: 'pending', submitted: 'submitted', confirmed: 'confirmed',
            preparing: 'preparing', ready: 'ready', completed: 'completed',
            cancelled: 'cancelled', processing: 'preparing', delivered: 'completed',
        };
        return map[s?.toLowerCase()] || 'pending';
    };

    for (const ao of rawOrders) {
        const orderId = ao.id?.toString() || ao.id_order?.toString();
        if (!orderId) { skipped++; continue; }

        const docId = `alleaves_${orderId}`;
        // Alleaves uses date_created (not created_at)
        const rawDate = ao.date_created || ao.created_at;
        const rawUpdated = ao.date_updated || ao.updated_at || rawDate;
        const orderDate = rawDate ? new Date(rawDate) : new Date();
        const updatedDate = rawUpdated ? new Date(rawUpdated) : orderDate;

        // Alleaves returns flat customer fields: id_customer, name_first, name_last
        // Some adapter versions may nest them under `customer`
        const customerName =
            ao.customer?.name ||
            `${ao.customer?.first_name || ao.name_first || ao.customer_first_name || ''} ${ao.customer?.last_name || ao.name_last || ao.customer_last_name || ''}`.trim() ||
            ao.customer_name || 'Unknown';
        const customerEmail = ao.customer?.email || ao.email || ao.customer_email || 'no-email@alleaves.local';
        const customerPhone = ao.customer?.phone || ao.phone || ao.customer_phone || '';

        const docRef = firestore.collection('orders').doc(docId);
        batch.set(docRef, {
            id: docId,
            brandId: orgId,
            retailerId: locationId,
            userId: ao.customer?.id?.toString() || ao.id_customer?.toString() || 'alleaves_customer',
            status: mapStatus(ao.status),
            customer: { name: customerName, email: customerEmail, phone: customerPhone },
            items: (ao.items || []).map((item: any) => ({
                productId: item.id_item?.toString() || item.product_id?.toString() || 'unknown',
                name: item.item || item.product_name || 'Unknown Item',
                qty: parseInt(item.quantity || 1),
                price: parseFloat(item.price || item.unit_price || 0),
                category: item.category || 'other',
            })),
            totals: {
                subtotal: parseFloat(ao.subtotal || 0),
                tax: parseFloat(ao.tax || 0),
                discount: parseFloat(ao.discount || 0),
                total: parseFloat(ao.total || ao.amount || 0),
            },
            mode: 'live',
            source: 'alleaves',
            createdAt: Timestamp.fromDate(orderDate),
            updatedAt: Timestamp.fromDate(updatedDate),
        }, { merge: true });

        batchCount++;
        total++;

        if (batchCount >= BATCH_SIZE) {
            await batch.commit();
            batch = firestore.batch();
            batchCount = 0;
            logger.info('[BACKFILL] Batch committed', { total });
        }
    }

    if (batchCount > 0) {
        await batch.commit();
    }

    logger.info('[BACKFILL] Persist complete', { orgId, total, skipped });
    return total;
}

export async function POST(req: NextRequest) {
    // Auth check
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!CRON_SECRET || token !== CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startTime = Date.now();

    let body: { orgId?: string; startDate?: string };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { orgId, startDate = '2020-01-01' } = body;

    if (!orgId) {
        return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
    }

    logger.info('[BACKFILL] Starting order backfill', { orgId, startDate });

    try {
        const { firestore } = await createServerClient();

        // Get location + POS config for this org
        const locationsSnap = await firestore.collection('locations')
            .where('orgId', '==', orgId)
            .limit(1)
            .get();

        if (locationsSnap.empty) {
            return NextResponse.json({ error: 'No location found for orgId' }, { status: 404 });
        }

        const locationData = locationsSnap.docs[0].data();
        const posConfig = locationData?.posConfig;

        if (!posConfig || posConfig.provider !== 'alleaves' || posConfig.status !== 'active') {
            return NextResponse.json({ error: 'No active Alleaves POS config for this org' }, { status: 400 });
        }

        const alleavesConfig: ALLeavesConfig = {
            apiKey: posConfig.apiKey,
            username: posConfig.username || process.env.ALLEAVES_USERNAME,
            password: posConfig.password || process.env.ALLEAVES_PASSWORD,
            pin: posConfig.pin || process.env.ALLEAVES_PIN,
            storeId: posConfig.storeId,
            locationId: posConfig.locationId || posConfig.storeId,
            partnerId: posConfig.partnerId,
            environment: posConfig.environment || 'production',
        };

        const client = new ALLeavesClient(alleavesConfig);
        const today = new Date().toISOString().split('T')[0];

        logger.info('[BACKFILL] Fetching all orders', { orgId, startDate, today });

        // Fetch up to 100k orders across the full date range
        const orders = await client.getAllOrders(100000, startDate, today);

        logger.info('[BACKFILL] Orders fetched from Alleaves', { orgId, count: orders.length });

        if (orders.length === 0) {
            return NextResponse.json({
                success: true,
                orgId,
                fetched: 0,
                persisted: 0,
                message: 'No orders returned from Alleaves',
                durationMs: Date.now() - startTime,
            });
        }

        const persisted = await persistOrdersToFirestore(
            firestore,
            orgId,
            posConfig.locationId || posConfig.storeId,
            orders
        );

        logger.info('[BACKFILL] Backfill complete', {
            orgId,
            fetched: orders.length,
            persisted,
            durationMs: Date.now() - startTime,
        });

        return NextResponse.json({
            success: true,
            orgId,
            startDate,
            fetched: orders.length,
            persisted,
            durationMs: Date.now() - startTime,
        });
    } catch (error: any) {
        logger.error('[BACKFILL] Failed', { orgId, error: error.message });
        return NextResponse.json(
            { error: error.message, orgId, durationMs: Date.now() - startTime },
            { status: 500 }
        );
    }
}
