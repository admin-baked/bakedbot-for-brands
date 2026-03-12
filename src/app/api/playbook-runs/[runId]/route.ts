import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';

export async function GET(req: Request, { params }: { params: { runId: string } }) {
    try {
        const { runId } = params;
        const db = getAdminFirestore();

        // 1. Fetch Run Doc
        const runDoc = await db.collection('playbook_runs').doc(runId).get();
        if (!runDoc.exists) {
            return NextResponse.json({ error: 'Run not found' }, { status: 404 });
        }
        const runData = runDoc.data();

        // 2. Fetch Subcollections in parallel (Firestore has no joins)
        const [stagesSnap, artifactsSnap, deliveriesSnap] = await Promise.all([
            db.collection(`playbook_runs/${runId}/stages`).get(),
            db.collection(`playbook_runs/${runId}/artifacts`).get(),
            db.collection(`playbook_runs/${runId}/deliveries`).get()
        ]);

        const stages = stagesSnap.docs.map(doc => doc.data());
        const artifacts = artifactsSnap.docs.map(doc => doc.data());
        const deliveries = deliveriesSnap.docs.map(doc => doc.data());

        return NextResponse.json({
            run: runData,
            stages,
            artifacts,
            deliveries
        });
    } catch (error) {
        console.error('[API] Get playbook run error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal Server Error' },
            { status: 500 }
        );
    }
}
