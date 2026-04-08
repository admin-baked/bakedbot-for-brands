export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { PlaybookArtifactMemoryService } from '@/server/services/playbook-artifact-memory';
import { getPlaybookArtifactRuntime } from '@/server/services/playbook-artifact-runtime';
import { PlaybookRunCoordinator } from '@/server/services/playbook-run-coordinator';
import { FirestorePlaybookAdapter, CloudTasksDispatcher } from '@/server/services/playbook-infra-adapters';
import {
    PlaybookApiError,
    getAuthorizedPlaybook,
} from '@/server/services/playbook-auth';

const adapter = new FirestorePlaybookAdapter();
const dispatcher = new CloudTasksDispatcher();
const { artifactService } = getPlaybookArtifactRuntime();
const artifactMemory = new PlaybookArtifactMemoryService(artifactService);
const coordinator = new PlaybookRunCoordinator(adapter, adapter, dispatcher, artifactMemory);

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ playbookId: string }> },
) {
    try {
        const { playbookId } = await params;
        const body = await req.json();
        const { playbook } = await getAuthorizedPlaybook(playbookId);

        const runResult = await coordinator.startRun({
            playbookId,
            playbookVersion: playbook.version || 1,
            orgId: playbook.orgId,
            triggerEvent: body.triggerEvent || body.trigger || { type: 'manual' },
        });

        return NextResponse.json(runResult);
    } catch (error) {
        if (error instanceof PlaybookApiError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        console.error('[API] Playbook manual run error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal Server Error' },
            { status: 500 }
        );
    }
}
