import { NextResponse } from 'next/server';
import { createServerClient } from '@/firebase/server-client';
import { getAuth } from 'firebase-admin/auth';

export async function GET(request: Request) {
    try {
        const { firestore } = await createServerClient();
        
        // Get user from session cookie
        const cookieHeader = request.headers.get('cookie') || '';
        const sessionCookie = cookieHeader
            .split(';')
            .find(c => c.trim().startsWith('session='))
            ?.split('=')[1];
            
        if (!sessionCookie) {
            return NextResponse.json({ linkedDispensary: null }, { status: 200 });
        }
        
        // Verify session and get user
        const { getAdminAuth } = await import('@/firebase/admin');
        const auth = getAdminAuth();
        const decodedClaims = await auth.verifySessionCookie(sessionCookie);
        const userId = decodedClaims.uid;
        
        // Get user profile with linked dispensary
        const userDoc = await firestore.collection('users').doc(userId).get();
        const userData = userDoc.data();
        
        if (userData?.linkedDispensary) {
            return NextResponse.json({ 
                linkedDispensary: userData.linkedDispensary 
            });
        }
        
        // Also check the dispensaries collection
        const dispensaryDoc = await firestore.collection('dispensaries').doc(userId).get();
        if (dispensaryDoc.exists) {
            const dispensaryData = dispensaryDoc.data();
            return NextResponse.json({
                linkedDispensary: {
                    id: userId,
                    name: dispensaryData?.name || 'My Dispensary',
                    source: dispensaryData?.source || 'manual'
                }
            });
        }
        
        return NextResponse.json({ linkedDispensary: null });
    } catch (error) {
        console.error('[API] linked-dispensary error:', error);
        return NextResponse.json({ linkedDispensary: null }, { status: 200 });
    }
}
