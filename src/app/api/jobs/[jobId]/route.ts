import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { getServerSessionUser } from '@/server/auth/session';
import { logger } from '@/lib/logger';

/**
 * GET /api/jobs/[jobId]
 *
 * Poll for job status and results
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ jobId: string }> }
) {
    try {
        // Authenticate user
        const user = await getServerSessionUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { jobId } = await params;

        if (!jobId) {
            return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
        }

        // Get job from Firestore
        const db = getAdminFirestore();
        const jobDoc = await db.collection('jobs').doc(jobId).get();

        if (!jobDoc.exists) {
            return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        }

        const jobData = jobDoc.data();

        // Verify user owns this job
        if (jobData?.userId !== user.uid) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Return job status
        return NextResponse.json({
            status: jobData.status || 'pending',
            progress: jobData.progress,
            result: jobData.result,
            error: jobData.error,
            thoughts: jobData.thoughts || [],
            updatedAt: jobData.updatedAt,
        });
    } catch (error) {
        logger.error('[GET /api/jobs/[jobId]] Error fetching job status', { error });
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
