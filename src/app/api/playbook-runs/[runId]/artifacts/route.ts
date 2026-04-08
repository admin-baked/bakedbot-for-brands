export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import {
    PlaybookApiError,
    getAuthorizedRun,
} from '@/server/services/playbook-auth';

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ runId: string }> },
) {
    try {
        const { runId } = await params;
        await getAuthorizedRun(runId);

        const artifactsSnap = await getAdminFirestore()
            .collection('playbook_runs')
            .doc(runId)
            .collection('artifacts')
            .orderBy('createdAt', 'asc')
            .get();

        return NextResponse.json({
            artifacts: artifactsSnap.docs.map((doc) => doc.data()),
        });
    } catch (error) {
        if (error instanceof PlaybookApiError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        console.error('[API] Get playbook run artifacts error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal Server Error' },
            { status: 500 },
        );
    }
}
