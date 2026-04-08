export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/firebase/server-client';
import { getPhoneLast4 } from '@/lib/customers/profile-derivations';
import { logger } from '@/lib/logger';

const CRON_SECRET = process.env.CRON_SECRET;
const BATCH_SIZE = 400;

function getOrderPhoneValue(data: Record<string, unknown>): string | null {
    const customer = data.customer;
    if (customer && typeof customer === 'object' && !Array.isArray(customer)) {
        const phone = (customer as Record<string, unknown>).phone;
        if (typeof phone === 'string' && phone.trim()) {
            return phone;
        }
    }

    return typeof data.phone === 'string' ? data.phone : null;
}

async function getScopedOrderDocs(
    firestore: FirebaseFirestore.Firestore,
    orgId: string,
): Promise<FirebaseFirestore.QueryDocumentSnapshot[]> {
    const scopeFields: Array<'brandId' | 'retailerId' | 'orgId'> = ['brandId', 'retailerId', 'orgId'];
    const snapshots = await Promise.all(
        scopeFields.map((scopeField) => (
            firestore.collection('orders')
                .where(scopeField, '==', orgId)
                .get()
        )),
    );

    const dedupedDocs = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
    for (const snapshot of snapshots) {
        for (const doc of snapshot.docs) {
            dedupedDocs.set(doc.id, doc);
        }
    }

    return Array.from(dedupedDocs.values());
}

export async function POST(req: NextRequest) {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!CRON_SECRET || token !== CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: { orgId?: string };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const orgId = typeof body.orgId === 'string' ? body.orgId.trim() : '';
    if (!orgId) {
        return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
    }

    const startedAt = Date.now();

    try {
        const { firestore } = await createServerClient();
        const [customerSnapshot, orderDocs] = await Promise.all([
            firestore.collection('customers').where('orgId', '==', orgId).get(),
            getScopedOrderDocs(firestore, orgId),
        ]);

        let batch = firestore.batch();
        let batchCount = 0;
        let customersUpdated = 0;
        let ordersUpdated = 0;

        const commitBatch = async () => {
            if (batchCount === 0) {
                return;
            }

            await batch.commit();
            batch = firestore.batch();
            batchCount = 0;
        };

        for (const customerDoc of customerSnapshot.docs) {
            const data = customerDoc.data();
            const phoneLast4 = getPhoneLast4(typeof data.phone === 'string' ? data.phone : null);
            if (!phoneLast4 || data.phoneLast4 === phoneLast4) {
                continue;
            }

            batch.update(customerDoc.ref, { phoneLast4 });
            batchCount++;
            customersUpdated++;

            if (batchCount >= BATCH_SIZE) {
                await commitBatch();
            }
        }

        for (const orderDoc of orderDocs) {
            const data = orderDoc.data() as Record<string, unknown>;
            const phoneLast4 = getPhoneLast4(getOrderPhoneValue(data));
            if (!phoneLast4 || data.phoneLast4 === phoneLast4) {
                continue;
            }

            batch.update(orderDoc.ref, { phoneLast4 });
            batchCount++;
            ordersUpdated++;

            if (batchCount >= BATCH_SIZE) {
                await commitBatch();
            }
        }

        await commitBatch();

        logger.info('[BackfillPhoneLast4] Completed org backfill', {
            orgId,
            customersUpdated,
            ordersUpdated,
            durationMs: Date.now() - startedAt,
        });

        return NextResponse.json({
            success: true,
            orgId,
            customersUpdated,
            ordersUpdated,
            durationMs: Date.now() - startedAt,
        });
    } catch (error) {
        logger.error('[BackfillPhoneLast4] Failed org backfill', {
            orgId,
            error: error instanceof Error ? error.message : String(error),
        });

        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Failed to backfill phoneLast4',
            },
            { status: 500 },
        );
    }
}
