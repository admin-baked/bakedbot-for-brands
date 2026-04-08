export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { PlaybookArtifactMemoryService } from '@/server/services/playbook-artifact-memory';
import { getPlaybookArtifactRuntime } from '@/server/services/playbook-artifact-runtime';
import { PlaybookRunCoordinator } from '@/server/services/playbook-run-coordinator';
import {
    CloudTasksDispatcher,
    FirestorePlaybookAdapter,
} from '@/server/services/playbook-infra-adapters';
import {
    PlaybookApiError,
    getAuthorizedRun,
} from '@/server/services/playbook-auth';

const adapter = new FirestorePlaybookAdapter();
const dispatcher = new CloudTasksDispatcher();
const { artifactService } = getPlaybookArtifactRuntime();
const artifactMemory = new PlaybookArtifactMemoryService(artifactService);
const coordinator = new PlaybookRunCoordinator(adapter, adapter, dispatcher, artifactMemory);

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ runId: string }> },
) {
    try {
        const { runId } = await params;
        const body = await req.json();
        const approved = typeof body.approved === 'boolean' ? body.approved : undefined;

        if (approved === undefined) {
            return NextResponse.json({ error: 'Missing approved value' }, { status: 400 });
        }

        const { user, run, playbook } = await getAuthorizedRun(runId);
        const approvalRecord = {
            approved,
            reviewerId: user.uid,
            reviewerEmail: user.email ?? null,
            notes: typeof body.notes === 'string' ? body.notes : null,
            resolvedAt: new Date().toISOString(),
        };

        await coordinator.handleApproval({
            runId,
            approved,
            reviewerId: user.uid,
            notes: approvalRecord.notes ?? undefined,
        });

        await getAdminFirestore()
            .collection('playbook_runs')
            .doc(runId)
            .collection('approval')
            .doc('current')
            .set(approvalRecord);

        await artifactService.persist({
            runId,
            workspaceId: playbook.orgId,
            playbookId: playbook.id,
            stageName: 'awaiting_approval',
            artifactType: 'approval',
            filename: 'approval.json',
            body: JSON.stringify(approvalRecord, null, 2),
            contentType: 'application/json',
            commitToRepo: true,
            runDate: typeof run.startedAt === 'string' ? run.startedAt : undefined,
        });

        return NextResponse.json({ success: true, runId, approved, reviewerId: user.uid });
    } catch (error) {
        if (error instanceof PlaybookApiError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        console.error('[API] Playbook approve error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal Server Error' },
            { status: 500 }
        );
    }
}
