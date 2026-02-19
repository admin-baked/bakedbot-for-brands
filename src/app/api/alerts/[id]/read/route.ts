import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';

export async function POST(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await requireUser();
        const { id } = await params;
        const orgId = user.currentOrgId;
        if (!orgId || !id) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

        const firestore = getAdminFirestore();
        const doc = await firestore.collection('inbox_notifications').doc(id).get();

        if (!doc.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        // Verify alert belongs to user's org
        if (doc.data()?.orgId !== orgId && user.role !== 'super_user') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await doc.ref.update({ read: true, readAt: Timestamp.now() });
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
