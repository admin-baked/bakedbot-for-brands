export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');

    if (secret !== 'bakedbot-dev-secret') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { bookingId, startAt, endAt } = body;
        const firestore = getAdminFirestore();

        if (bookingId) {
            logger.info(`[Debug] Repairing booking: ${bookingId} to ${startAt}`);
            await firestore.collection('meeting_bookings').doc(bookingId).update({
                startAt: new Date(startAt),
                endAt: new Date(endAt),
                calendarEventId: null, // Reset to force re-sync
                updatedAt: new Date()
            });
            return NextResponse.json({ success: true, message: `Repaired booking ${bookingId}` });
        }
        return NextResponse.json({ error: 'No bookingId provided' }, { status: 400 });
    } catch (err: any) {
        logger.error('[Debug] Repair failed:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

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

        // Also search by name "Tahir"
        const nameSnap = await firestore.collection('meeting_bookings').get();
        const nameResults = nameSnap.docs
            .filter(d => (d.data().externalName || '').toLowerCase().includes('tahir'))
            .map(d => ({
                id: d.id,
                ...d.data(),
                startAt: d.data().startAt?.toDate()?.toISOString()
            }));

        // NEW: Check Google Calendar for the profile
        let calendarEvents: any[] = [];
        const profileDoc = await firestore.collection('executive_profiles').doc('martez').get();
        const profileData = profileDoc.data();
        if (profileData?.googleCalendarTokens) {
            try {
                const { listGoogleCalendarEvents } = await import('@/server/services/executive-calendar/google-calendar');
                const now = new Date();
                const start = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 day ago
                const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
                calendarEvents = await listGoogleCalendarEvents(profileData.googleCalendarTokens, start, end);
            } catch (calErr: any) {
                logger.error('[Debug] GCal listing failed:', calErr);
            }
        }

        return NextResponse.json({ 
            success: true, 
            byEmail: results, 
            byName: nameResults,
            calendarEvents: calendarEvents.slice(0, 10), // Return last 10
            profileGCal: !!profileData?.googleCalendarTokens
        });
    } catch (err: any) {
        logger.error('[Debug] Search failed:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
