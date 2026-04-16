export const dynamic = 'force-dynamic';
/**
 * POST /api/admin/sync-alleaves-customers
 *
 * Manual trigger for the Alleaves customer roster sync.
 * For scheduled runs see: /api/cron/sync-alleaves-customers (daily 4 AM ET)
 *
 * Syncs phone → alleaves_id, updates LTV fields, recalculates segments.
 * Safe to re-run (merge writes, duplicate guard on alleaves_synced flag).
 *
 * Auth: Bearer CRON_SECRET
 * Body: { orgId: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { syncAlleavesCustomersForOrg } from '@/server/services/alleaves/customer-sync';
import { logger } from '@/lib/logger';

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
    if (!orgId) return NextResponse.json({ error: 'orgId is required' }, { status: 400 });

    logger.info('[ALLEAVES_SYNC] Manual trigger', { orgId });

    try {
        const result = await syncAlleavesCustomersForOrg(orgId);
        return NextResponse.json({ ok: true, ...result });
    } catch (error: any) {
        logger.error('[ALLEAVES_SYNC] Failed', { orgId, error: error.message });
        return NextResponse.json({ error: error.message, orgId }, { status: 500 });
    }
}

export async function GET(req: NextRequest) { return POST(req); }
