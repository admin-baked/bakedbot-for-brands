import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';

export async function POST(req: Request, { params }: { params: { playbookId: string } }) {
    try {
        const { playbookId } = params;
        const db = getAdminFirestore();

        await db.collection('playbooks').doc(playbookId).update({
            status: 'active',
            updatedAt: new Date().toISOString()
        });

        return NextResponse.json({ success: true, playbookId, status: 'active' });
    } catch (error) {
        console.error('[API] Playbook activate error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal Server Error' },
            { status: 500 }
        );
    }
}
