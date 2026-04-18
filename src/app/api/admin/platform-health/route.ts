/**
 * GET /api/admin/platform-health
 *
 * Returns the last linus-stress-test result from agent_tasks.
 * Used by the Platform Health widget on the super user dashboard.
 *
 * Auth: requireSuperUser (session-based)
 */

import { NextResponse } from 'next/server';
import { requireSuperUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        await requireSuperUser();
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const db = getAdminFirestore();
        const snap = await db.collection('agent_tasks')
            .where('reportedBy', '==', 'linus-stress-test')
            .orderBy('createdAt', 'desc')
            .limit(1)
            .get();

        if (snap.empty) {
            return NextResponse.json({ lastRun: null });
        }

        const doc = snap.docs[0].data();
        // Parse pass/fail counts from title: "Thrive Full Platform Test #N — X/Y passed"
        const titleMatch = (doc.title as string || '').match(/(\d+)\/(\d+) passed/);
        const passed = titleMatch ? parseInt(titleMatch[1]) : null;
        const total  = titleMatch ? parseInt(titleMatch[2]) : null;
        const failed = passed !== null && total !== null ? total - passed : null;

        return NextResponse.json({
            lastRun: {
                id:        snap.docs[0].id,
                title:     doc.title,
                passed,
                failed,
                total,
                status:    doc.status,
                stoplight: doc.stoplight,
                createdAt: typeof doc.createdAt === 'string' ? doc.createdAt : doc.createdAt?.toDate?.()?.toISOString() ?? null,
            },
        });
    } catch (err) {
        logger.error('[platform-health] Failed to fetch last run', { err });
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
