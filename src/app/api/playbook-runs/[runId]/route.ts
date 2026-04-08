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
        const db = getAdminFirestore();
        const { run } = await getAuthorizedRun(runId);

        const [stagesSnap, artifactsSnap, deliveriesSnap, approvalSnap] = await Promise.all([
            db.collection('playbook_runs').doc(runId).collection('stages').get(),
            db.collection('playbook_runs').doc(runId).collection('artifacts').get(),
            db.collection('playbook_runs').doc(runId).collection('deliveries').get(),
            db.collection('playbook_runs').doc(runId).collection('approval').doc('current').get(),
        ]);

        const stages = stagesSnap.docs.map(doc => doc.data());
        const artifacts = artifactsSnap.docs.map(doc => doc.data());
        const deliveries = deliveriesSnap.docs.map(doc => doc.data());
        const approval = approvalSnap.exists ? approvalSnap.data() : null;
        const summaryForAIEngineers = [...artifacts]
            .sort((left, right) => String(right.createdAt ?? '').localeCompare(String(left.createdAt ?? '')))
            .find((artifact) => artifact.artifactType === 'summary_for_ai_engineers') ?? null;

        return NextResponse.json({
            run,
            stages,
            artifacts,
            validationReport: run.validationReport ?? null,
            approval,
            deliveries,
            summaryForAIEngineers,
        });
    } catch (error) {
        if (error instanceof PlaybookApiError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        console.error('[API] Get playbook run error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal Server Error' },
            { status: 500 }
        );
    }
}
