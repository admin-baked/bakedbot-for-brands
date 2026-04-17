export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/admin/sync-retailers-crm
 *
 * Syncs unclaimed retailers → crm_dispensaries → ny_dispensary_leads.
 *
 * Step 1: Any retailer not yet in crm_dispensaries gets a new CRM record
 *         with claimStatus='unclaimed', source='import'.
 * Step 2: syncCRMDispensariesToOutreachQueue() pulls from crm_dispensaries
 *         into ny_dispensary_leads for the outreach pipeline.
 *
 * Auth: CRON_SECRET header (same as other admin/cron routes)
 * Or: super_user session cookie
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { syncCRMDispensariesToOutreachQueue } from '@/server/services/ny-outreach/crm-queue-sync';
import { logger } from '@/lib/logger';
import { requireUser } from '@/server/auth/auth';

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(request: NextRequest) {
    // Allow either cron secret or authenticated super user
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const isCronCall = CRON_SECRET && token === CRON_SECRET;

    if (!isCronCall) {
        try {
            const user = await requireUser(['super_user']);
            if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        } catch {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    try {
        const body = await request.json().catch(() => ({}));
        const { state, limit = 200 } = body as { state?: string; limit?: number };

        const db = getAdminFirestore();
        const now = Date.now();

        // ── Step 1: retailers → crm_dispensaries ───────────────────────────
        let retailersQ = state
            ? db.collection('retailers').where('state', '==', state).limit(limit)
            : db.collection('retailers').limit(limit);

        const [retailersSnap, crmSnap] = await Promise.all([
            retailersQ.get(),
            state
                ? db.collection('crm_dispensaries').where('state', '==', state).get()
                : db.collection('crm_dispensaries').get(),
        ]);

        const existingSlugs = new Set(crmSnap.docs.map(d => (d.data().slug as string) || d.id));

        let batch = db.batch();
        let batchCount = 0;
        let crmCreated = 0;

        for (const doc of retailersSnap.docs) {
            const r = doc.data();
            const slug = (r.slug as string) || doc.id;
            const name = (r.name as string) || '';
            const city = (r.city as string) || '';
            const retailerState = (r.state as string) || '';

            if (existingSlugs.has(slug) || !name || !city || !retailerState) continue;
            if (r.claimStatus === 'claimed' || r.claimedOrgId) continue;

            const crmRef = db.collection('crm_dispensaries').doc(slug);
            batch.set(crmRef, {
                name,
                slug,
                address: (r.address as string) || '',
                city,
                state: retailerState,
                zip: (r.zip as string) || '',
                ...(r.website ? { website: r.website } : {}),
                ...(r.phone ? { phone: r.phone } : {}),
                ...(r.email ? { email: r.email } : {}),
                source: 'import',
                claimStatus: 'unclaimed',
                retailerId: doc.id,
                discoveredAt: now,
                updatedAt: now,
                createdAt: now,
            }, { merge: true });

            batchCount++;
            crmCreated++;

            if (batchCount >= 400) {
                await batch.commit();
                batch = db.batch();
                batchCount = 0;
            }
        }

        if (batchCount > 0) await batch.commit();

        // ── Step 2: crm_dispensaries → ny_dispensary_leads ─────────────────
        const queueResult = await syncCRMDispensariesToOutreachQueue({
            states: state ? [state] : undefined,
            limit: Math.min(limit, 100),
        });

        logger.info('[SyncRetailersCRM] Sync complete', {
            state,
            retailersScanned: retailersSnap.size,
            crmCreated,
            queueCreated: queueResult.created,
            queueUpdated: queueResult.updated,
        });

        return NextResponse.json({
            ok: true,
            retailers: { scanned: retailersSnap.size, crmCreated },
            queue: {
                created: queueResult.created,
                updated: queueResult.updated,
                skipped: queueResult.skipped,
            },
        });
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error('[SyncRetailersCRM] Failed', { error: msg });
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
