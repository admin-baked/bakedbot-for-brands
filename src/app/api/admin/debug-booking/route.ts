
import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email') || 'ceo@simplypuretrenton.com';
    const secret = searchParams.get('secret');

    if (secret !== 'bakedbot-dev-secret') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const firestore = getAdminFirestore();
        logger.info(`[Debug] Searching for booking: ${email}`);
        
        const snap = await firestore.collection('meeting_bookings')
            .where('externalEmail', '==', email)
            .get();

        const results = snap.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            startAt: doc.data().startAt?.toDate()?.toISOString()
        }));

        // Also search by name "Tahir" just in case
        const nameSnap = await firestore.collection('meeting_bookings').get();
        const nameResults = nameSnap.docs
            .filter(d => (d.data().externalName || '').toLowerCase().includes('tahir'))
            .map(d => ({
                id: d.id,
                ...d.data(),
                startAt: d.data().startAt?.toDate()?.toISOString()
            }));

        return NextResponse.json({ 
            success: true, 
            byEmail: results, 
            byName: nameResults 
        });
    } catch (err: any) {
        logger.error('[Debug] Search failed:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
