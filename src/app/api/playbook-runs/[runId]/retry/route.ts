import { NextResponse } from 'next/server';
import { CloudTasksDispatcher } from '@/server/services/playbook-infra-adapters';
import { getAdminFirestore } from '@/firebase/admin';
import type { OrderedRunStage } from '@/types/playbook-v2';

const dispatcher = new CloudTasksDispatcher();

export async function POST(req: Request, { params }: { params: { runId: string } }) {
    try {
        const { runId } = params;
        const body = await req.json();

        const stageName = body.stageName as OrderedRunStage;
        if (!stageName) {
            return NextResponse.json({ error: 'Missing stageName' }, { status: 400 });
        }

        const db = getAdminFirestore();
        const runDoc = await db.collection('playbook_runs').doc(runId).get();
        if (!runDoc.exists) {
            return NextResponse.json({ error: 'Run not found' }, { status: 404 });
        }

        const runData = runDoc.data();

        await dispatcher.enqueueStage({
            runId,
            playbookId: runData?.playbookId,
            stageName,
            attempt: body.attempt || 1,
            triggerEvent: runData?.triggerEvent || {}
        });

        return NextResponse.json({ success: true, runId, stageRequeued: stageName });
    } catch (error) {
        console.error('[API] Playbook retry error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal Server Error' },
            { status: 500 }
        );
    }
}
