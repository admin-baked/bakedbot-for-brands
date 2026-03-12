import { NextResponse } from 'next/server';
import { PlaybookRunCoordinator } from '@/server/services/playbook-run-coordinator';
import { FirestorePlaybookAdapter, CloudTasksDispatcher } from '@/server/services/playbook-infra-adapters';

const adapter = new FirestorePlaybookAdapter();
const dispatcher = new CloudTasksDispatcher();
const coordinator = new PlaybookRunCoordinator(adapter, adapter, dispatcher);

export async function POST(req: Request, { params }: { params: { runId: string } }) {
    try {
        const { runId } = params;
        const body = await req.json();

        if (typeof body.approved !== 'boolean' || !body.reviewerId) {
            return NextResponse.json({ error: 'Missing approved or reviewerId' }, { status: 400 });
        }

        await coordinator.handleApproval({
            runId,
            approved: body.approved,
            reviewerId: body.reviewerId,
            notes: body.notes
        });

        return NextResponse.json({ success: true, runId, approved: body.approved });
    } catch (error) {
        console.error('[API] Playbook approve error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal Server Error' },
            { status: 500 }
        );
    }
}
