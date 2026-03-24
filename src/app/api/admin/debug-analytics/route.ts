/**
 * GET /api/admin/debug-analytics?orgId=<orgId>
 *
 * Diagnostics endpoint — shows exactly what the analytics fallback chain finds
 * in Firestore for a given orgId. Returns per-query counts and a sample doc.
 *
 * Auth: Bearer CRON_SECRET (same as other admin endpoints)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/logger';
import { ANALYTICS_ORDER_STATUSES } from '@/app/dashboard/orders/order-utils';

const CRON_SECRET = process.env.CRON_SECRET;

async function countQuery(
    firestore: FirebaseFirestore.Firestore,
    field: string,
    value: string,
): Promise<{ raw: number; withStatus: number | string }> {
    const [raw, withStatus] = await Promise.all([
        firestore.collection('orders').where(field, '==', value).get()
            .then((s) => s.size)
            .catch(() => 0),
        firestore.collection('orders')
            .where(field, '==', value)
            .where('status', 'in', [...ANALYTICS_ORDER_STATUSES])
            .get()
            .then((s) => s.size)
            .catch((err: Error) =>
                err.message.includes('index') ? 'needs_composite_index' : `error: ${err.message.slice(0, 60)}`
            ),
    ]);
    return { raw, withStatus };
}

export async function GET(request: NextRequest) {
    // Auth
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!CRON_SECRET || token !== CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = request.nextUrl.searchParams.get('orgId');
    if (!orgId) {
        return NextResponse.json({ error: 'orgId query param required' }, { status: 400 });
    }

    logger.info('[DEBUG-ANALYTICS] Running diagnostics', { orgId });

    const { firestore } = await createServerClient();

    // Resolve location + POS config
    const locSnap = await firestore.collection('locations').where('orgId', '==', orgId).limit(1).get()
        .catch(() => ({ empty: true, docs: [] } as any));

    const locationDoc = locSnap.empty ? null : locSnap.docs[0].data();
    const posConfig = locationDoc?.posConfig ?? null;
    const firestoreLocationId = posConfig?.locationId || posConfig?.storeId || null;

    // Run all query paths that analytics uses
    const queryPlans = [
        { label: 'retailerId == firestoreLocationId', field: 'retailerId', value: firestoreLocationId ?? '' },
        { label: 'retailerId == orgId',               field: 'retailerId', value: orgId },
        { label: 'brandId == orgId',                  field: 'brandId',    value: orgId },
        { label: 'orgId == orgId',                    field: 'orgId',      value: orgId },
    ].filter((p) => p.value);

    const results = await Promise.all(
        queryPlans.map(async (plan) => ({
            ...plan,
            ...(await countQuery(firestore, plan.field, plan.value)),
        }))
    );

    // Sample doc
    const sampleSnap = await firestore
        .collection('orders')
        .where('brandId', '==', orgId)
        .limit(1)
        .get()
        .catch(() => ({ empty: true, docs: [] } as any));

    const sampleDoc = sampleSnap.empty
        ? null
        : (() => {
              const d = sampleSnap.docs[0].data();
              return {
                  id: d.id,
                  brandId: d.brandId,
                  retailerId: d.retailerId,
                  status: d.status,
                  mode: d.mode,
                  source: d.source,
                  totalAmount: d.totals?.total,
                  createdAt: d.createdAt?.toDate?.()?.toISOString() ?? String(d.createdAt),
              };
          })();

    // Recommendation
    const firestoreHit = results.find((r) => typeof r.raw === 'number' && r.raw > 0);
    const recommendation = firestoreHit
        ? `✅ Firestore has ${firestoreHit.raw} orders via [${firestoreHit.label}]. Analytics should work.`
        : posConfig?.provider === 'alleaves' && posConfig?.status === 'active'
        ? '⚠️ No Firestore orders — analytics will try Alleaves live fallback. Run the backfill endpoint to populate history.'
        : '❌ No Firestore orders AND no active Alleaves POS config. Check location posConfig in Firestore.';

    return NextResponse.json({
        orgId,
        posConfig: posConfig
            ? { provider: posConfig.provider, status: posConfig.status, locationId: firestoreLocationId }
            : null,
        queryResults: results,
        sampleDoc,
        recommendation,
    });
}
