import { NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/auth';
import { createServerClient } from '@/firebase/server-client';

export async function POST(req: Request) {
    try {
        const user = await requireUser();
        const { propertyId } = await req.json();
        
        if (typeof propertyId !== 'string') {
            return NextResponse.json({ success: false, error: 'Invalid propertyId' }, { status: 400 });
        }
        
        const orgId = (user as any).brandId || (user as any).locationId || (user as any).orgId || (user as any).currentOrgId || user.uid;
        
        const { firestore } = await createServerClient();
        await firestore.collection('tenants').doc(orgId).set({ ga4PropertyId: propertyId.trim() }, { merge: true });
        
        return NextResponse.json({ success: true, orgId });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
