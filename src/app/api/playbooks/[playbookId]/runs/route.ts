import { NextResponse } from 'next/server';
import { PlaybookRunCoordinator } from '@/server/services/playbook-run-coordinator';
import { FirestorePlaybookAdapter, CloudTasksDispatcher } from '@/server/services/playbook-infra-adapters';
import { getAdminFirestore } from '@/firebase/admin';

const adapter = new FirestorePlaybookAdapter();
const dispatcher = new CloudTasksDispatcher();
const coordinator = new PlaybookRunCoordinator(adapter, adapter, dispatcher);

export async function POST(req: Request, { params }: { params: { playbookId: string } }) {
    try {
        const { playbookId } = params;
        const body = await req.json();

        const db = getAdminFirestore();
        const playbookDoc = await db.collection('playbooks').doc(playbookId).get();

        if (!playbookDoc.exists) {
            return NextResponse.json({ error: 'Playbook not found' }, { status: 404 });
        }

        const runResult = await coordinator.startRun({
            playbookId,
            playbookVersion: playbookDoc.data()?.version || 1,
            triggerEvent: body.triggerEvent || { type: 'manual' }
        });

        return NextResponse.json(runResult);
    } catch (error) {
        console.error('[API] Playbook manual run error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal Server Error' },
            { status: 500 }
        );
    }
}
