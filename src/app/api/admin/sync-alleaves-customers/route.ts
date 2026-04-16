export const dynamic = 'force-dynamic';
/**
 * POST /api/admin/sync-alleaves-customers
 *
 * Syncs the Alleaves customer roster into BakedBot customer profiles.
 * For each Alleaves customer, matches by phone number to an existing BakedBot
 * customer doc and writes `alleaves_id` + LTV fields (totalSpent, orderCount,
 * lastOrderDate, lifetimeValue).
 *
 * Safe to re-run — uses `merge: true`. New customers are NOT created here
 * (only existing BakedBot customers get enriched with POS data).
 *
 * Auth: Bearer CRON_SECRET
 * Body: { orgId: string }
 *
 * Trigger manually:
 *   curl -X POST https://bakedbot.ai/api/admin/sync-alleaves-customers \
 *     -H "Authorization: Bearer $CRON_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{"orgId":"org_thrive_syracuse"}'
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { ALLeavesClient, type ALLeavesConfig } from '@/lib/pos/adapters/alleaves';
import { logger } from '@/lib/logger';

const BATCH_SIZE = 400;

/** Strip non-digits and return last 10 digits (US phone) or all digits. */
function normalizePhone(raw: string | null | undefined): string {
    if (!raw) return '';
    const digits = raw.replace(/\D/g, '');
    return digits.length >= 10 ? digits.slice(-10) : digits;
}

export async function POST(req: NextRequest) {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: { orgId?: string };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { orgId } = body;
    if (!orgId) {
        return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
    }

    const startTime = Date.now();
    logger.info('[ALLEAVES_SYNC] Starting customer roster sync', { orgId });

    try {
        const firestore = getAdminFirestore();

        // ── 1. Load POS config from the org's location ──────────────────────
        const locationsSnap = await firestore.collection('locations')
            .where('orgId', '==', orgId)
            .limit(1)
            .get();

        if (locationsSnap.empty) {
            return NextResponse.json({ error: 'No location found for orgId' }, { status: 404 });
        }

        const posConfig = locationsSnap.docs[0].data()?.posConfig;
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

        // ── 2. Fetch all Alleaves customers ──────────────────────────────────
        logger.info('[ALLEAVES_SYNC] Fetching all customers from Alleaves', { orgId });
        const alleavesCustomers = await client.getAllCustomersPaginated(200);
        logger.info('[ALLEAVES_SYNC] Customers fetched', { orgId, count: alleavesCustomers.length });

        if (alleavesCustomers.length === 0) {
            return NextResponse.json({ ok: true, orgId, alleavesFetched: 0, matched: 0, updated: 0 });
        }

        // ── 3. Build phone → Alleaves customer map ───────────────────────────
        // Alleaves field names vary — handle both flat and nested formats
        const phoneMap = new Map<string, {
            alleaves_id: string;
            totalSpent: number;
            orderCount: number;
            lastOrderDate: string | null;
        }>();

        for (const ac of alleavesCustomers) {
            const raw = ac.phone || ac.phone_number || ac.cell_phone || '';
            const norm = normalizePhone(raw);
            if (!norm || norm.length < 4) continue;

            const alleaves_id = String(ac.id || ac.id_customer || '');
            if (!alleaves_id) continue;

            phoneMap.set(norm, {
                alleaves_id,
                totalSpent:    parseFloat(ac.total_spent || ac.totalSpent || 0),
                orderCount:    parseInt(ac.order_count || ac.orderCount || 0, 10),
                lastOrderDate: ac.last_order_date || ac.lastOrderDate || ac.last_purchase || null,
            });
        }

        logger.info('[ALLEAVES_SYNC] Phone map built', { orgId, phonesWithData: phoneMap.size });

        // ── 4. Load all BakedBot customers for this org ──────────────────────
        // Pull in batches to avoid loading everything into memory at once
        let matched = 0;
        let updated = 0;
        let batch = firestore.batch();
        let batchCount = 0;

        const baseQuery = firestore.collection('customers')
            .where('orgId', '==', orgId)
            .orderBy('createdAt', 'desc')
            .limit(1000);

        let snap = await baseQuery.get();

        while (!snap.empty) {
            for (const doc of snap.docs) {
                const data = doc.data();
                const custPhone = normalizePhone(data.phone as string | undefined);
                if (!custPhone) continue;

                const alleaves = phoneMap.get(custPhone);
                if (!alleaves) continue;

                matched++;

                // Skip if already linked with same id (no-op optimization)
                if (data.alleaves_id === alleaves.alleaves_id && data.alleaves_synced) continue;

                const update: Record<string, unknown> = {
                    alleaves_id:        alleaves.alleaves_id,
                    alleaves_synced:    true,
                    alleaves_synced_at: new Date().toISOString(),
                };

                // Only overwrite LTV fields if Alleaves has better data
                if (alleaves.totalSpent > 0) {
                    update.totalSpent    = alleaves.totalSpent;
                    update.lifetimeValue = alleaves.totalSpent;
                }
                if (alleaves.orderCount > 0) {
                    update.orderCount = alleaves.orderCount;
                }
                if (alleaves.lastOrderDate) {
                    update.lastOrderDate = alleaves.lastOrderDate;
                }

                batch.set(doc.ref, update, { merge: true });
                batchCount++;
                updated++;

                if (batchCount >= BATCH_SIZE) {
                    await batch.commit();
                    batch = firestore.batch();
                    batchCount = 0;
                    logger.info('[ALLEAVES_SYNC] Batch committed', { orgId, updated });
                }
            }

            if (snap.docs.length < 1000) break;
            snap = await baseQuery.startAfter(snap.docs[snap.docs.length - 1]).get();
        }

        if (batchCount > 0) {
            await batch.commit();
        }

        const durationMs = Date.now() - startTime;
        logger.info('[ALLEAVES_SYNC] Sync complete', { orgId, alleavesFetched: alleavesCustomers.length, matched, updated, durationMs });

        return NextResponse.json({
            ok: true,
            orgId,
            alleavesFetched: alleavesCustomers.length,
            phonesMatched: phoneMap.size,
            matched,
            updated,
            durationMs,
        });

    } catch (error: any) {
        logger.error('[ALLEAVES_SYNC] Failed', { orgId, error: error.message });
        return NextResponse.json({ error: error.message, orgId }, { status: 500 });
    }
}

export async function GET(req: NextRequest) { return POST(req); }
