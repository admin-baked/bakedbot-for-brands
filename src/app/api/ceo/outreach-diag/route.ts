export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';

/**
 * Temporary diagnostic endpoint — reveals the real server error behind outreach tab 500s.
 * DELETE after root cause is confirmed.
 * Access: GET /api/ceo/outreach-diag (requires __session cookie with super_user role)
 */
export async function GET() {
    const steps: Record<string, unknown> = {};

    // Step 1: Auth
    try {
        const user = await requireUser(['super_user']);
        steps.auth = { ok: true, uid: user.uid, email: user.email, role: (user as any).role };
    } catch (e: any) {
        steps.auth = { ok: false, error: e?.message, stack: e?.stack?.slice(0, 500) };
        return NextResponse.json({ steps }, { status: 200 });
    }

    // Step 2: Firebase Admin init
    let db: ReturnType<typeof getAdminFirestore> | null = null;
    try {
        db = getAdminFirestore();
        steps.firebaseAdmin = { ok: true };
    } catch (e: any) {
        steps.firebaseAdmin = { ok: false, error: e?.message, stack: e?.stack?.slice(0, 500) };
        return NextResponse.json({ steps }, { status: 200 });
    }

    // Step 3: Simple Firestore read
    try {
        const snap = await db.collection('ny_outreach_log').limit(1).get();
        steps.firestoreRead = { ok: true, size: snap.size };
    } catch (e: any) {
        steps.firestoreRead = { ok: false, error: e?.message };
    }

    // Step 4: Compound query (requires Firestore composite index)
    try {
        const queueSnap = await db.collection('ny_dispensary_leads')
            .where('status', '==', 'researched')
            .where('outreachSent', '==', false)
            .limit(1)
            .get();
        steps.queueQuery = { ok: true, size: queueSnap.size };
    } catch (e: any) {
        steps.queueQuery = { ok: false, error: e?.message };
    }

    // Step 5: CRM contacts query with orderBy
    try {
        const crmSnap = await db.collection('crm_outreach_contacts')
            .orderBy('lastOutreachAt', 'desc')
            .limit(1)
            .get();
        steps.crmQuery = { ok: true, size: crmSnap.size };
    } catch (e: any) {
        steps.crmQuery = { ok: false, error: e?.message };
    }

    // Step 6: Dynamic import of outreach-read-model
    try {
        const { getOutreachStats } = await import('@/server/services/ny-outreach/outreach-read-model');
        const stats = await getOutreachStats(Date.now() - 24 * 60 * 60 * 1000);
        steps.dynamicImport = { ok: true, totalSent: stats.totalSent };
    } catch (e: any) {
        steps.dynamicImport = { ok: false, error: e?.message };
    }

    // Step 7: Count query (uses .count())
    try {
        const db2 = getAdminFirestore();
        const countSnap = await db2.collection('ny_outreach_drafts')
            .where('status', '==', 'draft')
            .count()
            .get();
        steps.countQuery = { ok: true, count: countSnap.data().count };
    } catch (e: any) {
        steps.countQuery = { ok: false, error: e?.message };
    }

    return NextResponse.json({ steps }, { status: 200 });
}
