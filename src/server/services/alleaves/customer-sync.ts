/**
 * Alleaves Customer Sync Service
 *
 * Fetches the full Alleaves customer roster, matches by normalized phone to
 * existing BakedBot customer docs, and writes:
 *   - alleaves_id (bridges phone lookup → POS order history)
 *   - totalSpent / lifetimeValue / orderCount / lastOrderDate (real POS LTV)
 *   - segment (recalculated from fresh LTV fields)
 *
 * Called by:
 *   - POST /api/admin/sync-alleaves-customers  (manual, one-off)
 *   - POST /api/cron/sync-alleaves-customers   (daily at 4 AM ET)
 */

import { getAdminFirestore } from '@/firebase/admin';
import { ALLeavesClient, type ALLeavesConfig } from '@/lib/pos/adapters/alleaves';
import { calculateSegment } from '@/types/customers';
import { logger } from '@/lib/logger';
import { FieldPath } from 'firebase-admin/firestore';

const BATCH_SIZE = 400;

export interface AlleavesSyncResult {
    orgId: string;
    alleavesFetched: number;
    phonesMatched: number;
    matched: number;
    updated: number;
    durationMs: number;
}

/** Strip non-digits → last 10 digits (US) or all digits. */
function normalizePhone(raw: string | null | undefined): string {
    if (!raw) return '';
    const digits = raw.replace(/\D/g, '');
    return digits.length >= 10 ? digits.slice(-10) : digits;
}

export async function syncAlleavesCustomersForOrg(orgId: string): Promise<AlleavesSyncResult> {
    const startTime = Date.now();
    const firestore = getAdminFirestore();

    // ── POS config ───────────────────────────────────────────────────────────
    const locSnap = await firestore.collection('locations')
        .where('orgId', '==', orgId)
        .limit(1)
        .get();

    if (locSnap.empty) throw new Error(`No location found for orgId ${orgId}`);

    const posConfig = locSnap.docs[0].data()?.posConfig;
    if (!posConfig || posConfig.provider !== 'alleaves' || posConfig.status !== 'active') {
        throw new Error(`No active Alleaves POS config for ${orgId}`);
    }

    const config: ALLeavesConfig = {
        apiKey:      posConfig.apiKey,
        username:    posConfig.username    || process.env.ALLEAVES_USERNAME,
        password:    posConfig.password    || process.env.ALLEAVES_PASSWORD,
        pin:         posConfig.pin         || process.env.ALLEAVES_PIN,
        storeId:     posConfig.storeId,
        locationId:  posConfig.locationId  || posConfig.storeId,
        partnerId:   posConfig.partnerId,
        environment: posConfig.environment || 'production',
    };

    // ── Fetch Alleaves customer roster ───────────────────────────────────────
    const client = new ALLeavesClient(config);
    const alleavesCustomers = await client.getAllCustomersPaginated(200);
    logger.info('[ALLEAVES_SYNC] Customers fetched', { orgId, count: alleavesCustomers.length });

    if (alleavesCustomers.length === 0) {
        return { orgId, alleavesFetched: 0, phonesMatched: 0, matched: 0, updated: 0, durationMs: Date.now() - startTime };
    }

    // ── Build two lookup maps from Alleaves roster ────────────────────────────
    // Primary: id_customer → LTV (covers all 3700+ customers, even those without phone)
    // Secondary: normalized phone → LTV+id (covers ~150 customers with phone in bulk response)
    interface AlleavesEntry {
        alleaves_id:   string;
        totalSpent:    number;
        orderCount:    number;
        lastOrderDate: string | null;
    }
    const byId    = new Map<string, AlleavesEntry>();
    const phoneMap = new Map<string, AlleavesEntry>();

    for (const ac of alleavesCustomers) {
        const alleaves_id = String(ac.id_customer || ac.id || '');
        if (!alleaves_id) continue;

        const entry: AlleavesEntry = {
            alleaves_id,
            totalSpent:    parseFloat(ac.total_spent    || ac.totalSpent    || 0),
            orderCount:    parseInt(ac.order_count      || ac.orderCount    || 0, 10),
            lastOrderDate: ac.last_order_date || ac.lastOrderDate || ac.last_purchase || null,
        };

        byId.set(alleaves_id, entry);

        const norm = normalizePhone(ac.phone || ac.phone_number || ac.cell_phone || '');
        if (norm && norm.length >= 4) phoneMap.set(norm, entry);
    }

    // ── Walk BakedBot customers, match, write ────────────────────────────────
    let matched = 0;
    let updated = 0;
    let batch = firestore.batch();
    let batchCount = 0;
    const syncedAt = new Date().toISOString();

    // Use document ID ordering — every doc has it, unlike createdAt which
    // alleaves_sync docs (written by persistCustomerProfiles) don't set.
    const baseQuery = firestore.collection('customers')
        .where('orgId', '==', orgId)
        .orderBy(FieldPath.documentId())
        .limit(1000);

    let snap = await baseQuery.get();

    while (!snap.empty) {
        for (const doc of snap.docs) {
            const data = doc.data();

            // Primary match: alleavesCustomerId field (set by persistCustomerProfiles)
            // Format: 'cid_1338' → alleaves_id '1338'
            let alleaves: AlleavesEntry | undefined;
            const existingCid = data.alleavesCustomerId as string | undefined;
            if (existingCid?.startsWith('cid_')) {
                alleaves = byId.get(existingCid.slice(4));
                // If not in LTV map, at least set the ID so tablet history works
                if (!alleaves) alleaves = { alleaves_id: existingCid.slice(4), totalSpent: 0, orderCount: 0, lastOrderDate: null };
            }

            // Fallback: phone matching (for tablet check-in customers without alleavesCustomerId)
            if (!alleaves) {
                const norm = normalizePhone(data.phone as string | undefined);
                if (norm) alleaves = phoneMap.get(norm);
            }

            if (!alleaves) continue;

            matched++;
            if (data.alleaves_id === alleaves.alleaves_id && data.alleaves_synced) continue;

            const totalSpent  = alleaves.totalSpent  > 0 ? alleaves.totalSpent  : ((data.totalSpent  as number) || 0);
            const orderCount  = alleaves.orderCount  > 0 ? alleaves.orderCount  : ((data.orderCount  as number) || 0);
            const lastOrderDateStr = alleaves.lastOrderDate ?? (data.lastOrderDate as string | undefined) ?? null;
            const lastOrderDate = lastOrderDateStr ? new Date(lastOrderDateStr) : undefined;
            const avgOrderValue = orderCount > 0 ? totalSpent / orderCount : 0;

            const daysSinceLastOrder = lastOrderDate
                ? Math.floor((Date.now() - lastOrderDate.getTime()) / 86_400_000)
                : undefined;

            const newSegment = calculateSegment({
                totalSpent,
                orderCount,
                avgOrderValue,
                lifetimeValue: totalSpent,
                lastOrderDate,
                daysSinceLastOrder,
                firstOrderDate: data.firstOrderDate ? new Date(data.firstOrderDate as string) : undefined,
            });

            const update: Record<string, unknown> = {
                alleaves_id:        alleaves.alleaves_id,
                alleaves_synced:    true,
                alleaves_synced_at: syncedAt,
                segment:            newSegment,
            };

            if (alleaves.totalSpent > 0) {
                update.totalSpent    = totalSpent;
                update.lifetimeValue = totalSpent;
                update.avgOrderValue = avgOrderValue;
            }
            if (alleaves.orderCount > 0) update.orderCount    = orderCount;
            if (alleaves.lastOrderDate)  update.lastOrderDate = alleaves.lastOrderDate;

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

    if (batchCount > 0) await batch.commit();

    const result: AlleavesSyncResult = {
        orgId,
        alleavesFetched: alleavesCustomers.length,
        phonesMatched:   byId.size,
        matched,
        updated,
        durationMs: Date.now() - startTime,
    };
    logger.info('[ALLEAVES_SYNC] Sync complete', result);
    return result;
}
