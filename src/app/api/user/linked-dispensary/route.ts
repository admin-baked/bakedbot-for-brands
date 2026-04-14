export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/auth';
import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/logger';

export async function GET(request: Request) {
    try {
        const user = await requireUser();
        const userId = user.uid;
        const { firestore } = await createServerClient();
        
        // Get user profile with linked dispensary
        const userDoc = await firestore.collection('users').doc(userId).get();
        const userData = userDoc.data();
        
        if (userData?.linkedDispensary) {
            return NextResponse.json({ 
                linkedDispensary: userData.linkedDispensary 
            });
        }
        
        // Check POS Connection (Location based first, then dispensary)
        let posConnected = false;
        
        // 1. Check Location Config (Preferred)
        // Need to resolve locationId. userData might have it.
        const locationId = userData?.locationId; // Assuming saved on profile
        if (locationId) {
            const locDoc = await firestore.collection('locations').doc(locationId).get();
            if (locDoc.exists && locDoc.data()?.posConfig?.status === 'active') {
                posConnected = true;
            }
        }

        // 2. Check Dispensary Config (Fallback)
        const dispensaryDoc = await firestore.collection('dispensaries').doc(userId).get();
        if (dispensaryDoc.exists) {
            const dispensaryData = dispensaryDoc.data();
            const legacyPos = dispensaryData?.posConfig?.provider || dispensaryData?.posConfig?.active;
            if (legacyPos) posConnected = true;

            // Return combined result
             return NextResponse.json({
                linkedDispensary: {
                    id: userId,
                    name: dispensaryData?.name || 'My Dispensary',
                    source: dispensaryData?.source || 'manual'
                },
                posConnected
            });
        }
        
        return NextResponse.json({ linkedDispensary: null, posConnected: false });
    } catch (error) {
        logger.error('[API] linked-dispensary error', { error });
        return NextResponse.json({ linkedDispensary: null }, { status: 200 });
    }
}
