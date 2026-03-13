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
            .where('artifactType', '==', 'summary_for_ai_engineers')
            .get();

        const artifacts = artifactsSnap.docs.map((doc) => doc.data() as Record<string, unknown>);
        const latestSummary = artifacts.sort((left, right) => {
            return String(right.createdAt ?? '').localeCompare(String(left.createdAt ?? ''));
        })[0];

        if (!latestSummary) {
            return NextResponse.json(
                { error: 'summary_for_ai_engineers artifact not found' },
                { status: 404 },
            );
        }

        return NextResponse.json({ artifact: latestSummary });
    } catch (error) {
        if (error instanceof PlaybookApiError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        console.error('[API] Get playbook run summary error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal Server Error' },
            { status: 500 },
        );
    }
}
