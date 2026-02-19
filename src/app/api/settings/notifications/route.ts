import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
    try {
        const user = await requireUser();
        const orgId = user.currentOrgId;
        if (!orgId) return NextResponse.json({ error: 'No org context' }, { status: 400 });

        const { prefs } = await req.json() as { prefs?: Record<string, unknown> };
        if (!prefs) return NextResponse.json({ error: 'prefs required' }, { status: 400 });

        const firestore = getAdminFirestore();
        await firestore
            .collection('notification_preferences')
            .doc(orgId)
            .set({
                orgId,
                prefs,
                updatedAt: Timestamp.now(),
                updatedBy: user.uid,
            }, { merge: true });

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function GET() {
    try {
        const user = await requireUser();
        const orgId = user.currentOrgId;
        if (!orgId) return NextResponse.json({ error: 'No org context' }, { status: 400 });

        const firestore = getAdminFirestore();
        const doc = await firestore.collection('notification_preferences').doc(orgId).get();
        if (!doc.exists) return NextResponse.json({ prefs: null });
        return NextResponse.json({ prefs: doc.data()?.prefs ?? null });
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
