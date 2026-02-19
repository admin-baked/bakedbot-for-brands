import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
    try {
        const user = await requireUser();
        const { orgId } = await req.json() as { orgId?: string };

        // Only allow marking own org's alerts
        const targetOrgId = orgId ?? user.currentOrgId;
        if (!targetOrgId) {
            return NextResponse.json({ error: 'orgId required' }, { status: 400 });
        }

        const firestore = getAdminFirestore();
        const snap = await firestore
            .collection('inbox_notifications')
            .where('orgId', '==', targetOrgId)
            .where('read', '==', false)
            .get();

        if (snap.empty) return NextResponse.json({ updated: 0 });

        const batch = firestore.batch();
        for (const doc of snap.docs) {
            batch.update(doc.ref, { read: true, readAt: Timestamp.now() });
        }
        await batch.commit();

        return NextResponse.json({ updated: snap.size });
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
