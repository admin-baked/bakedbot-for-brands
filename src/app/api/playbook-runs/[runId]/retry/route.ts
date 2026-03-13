import { NextRequest, NextResponse } from 'next/server';
import { CloudTasksDispatcher } from '@/server/services/playbook-infra-adapters';
import {
    PlaybookApiError,
    getAuthorizedRun,
} from '@/server/services/playbook-auth';
import { RUN_STAGE_ORDER, type OrderedRunStage } from '@/types/playbook-v2';

const dispatcher = new CloudTasksDispatcher();

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ runId: string }> },
) {
    try {
        const { runId } = await params;
        const body = await req.json();

        const stageName = body.stageName as OrderedRunStage;
        if (!stageName || !RUN_STAGE_ORDER.includes(stageName)) {
            return NextResponse.json({ error: 'Missing stageName' }, { status: 400 });
        }

        const { run } = await getAuthorizedRun(runId);

        await dispatcher.enqueueStage({
            runId,
            playbookId: String(run.playbookId),
            stageName,
            attempt: body.attempt || 1,
            triggerEvent: (run.triggerEvent as Record<string, unknown>) || {},
        });

        return NextResponse.json({ success: true, runId, stageRequeued: stageName });
    } catch (error) {
        if (error instanceof PlaybookApiError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        console.error('[API] Playbook retry error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal Server Error' },
            { status: 500 }
        );
    }
}
