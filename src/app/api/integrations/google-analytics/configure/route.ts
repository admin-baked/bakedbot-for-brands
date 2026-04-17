export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/auth';
import { requireActorOrgId } from '@/server/auth/actor-context';
import { createServerClient } from '@/firebase/server-client';

export async function POST(req: Request) {
    try {
        const user = await requireUser();
        const { propertyId } = await req.json();
        
        if (typeof propertyId !== 'string') {
            return NextResponse.json({ success: false, error: 'Invalid propertyId' }, { status: 400 });
        }
        
        const orgId = requireActorOrgId(user, 'configureGoogleAnalytics');
        
        const { firestore } = await createServerClient();
        await firestore.collection('tenants').doc(orgId).set({ ga4PropertyId: propertyId.trim() }, { merge: true });
        
        return NextResponse.json({ success: true, orgId });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
