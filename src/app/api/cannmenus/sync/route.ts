import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/firebase/server-client';
import { CannMenusService } from '@/server/services/cannmenus';

export async function POST(req: NextRequest) {
    try {
        const { auth } = await createServerClient();

        // Get the token from the Authorization header
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await auth.verifyIdToken(token);

        // Get brandId from request body or user claims
        // For now, we expect brandId in the body, but verify user has access to it
        const body = await req.json();
        const { brandId } = body;

        if (!brandId) {
            return NextResponse.json({ error: 'Missing brandId' }, { status: 400 });
        }

        // TODO: Verify user has access to this brandId (RBAC)
        // const user = await auth.getUser(decodedToken.uid);
        // if (user.customClaims?.brandId !== brandId && user.customClaims?.role !== 'admin') { ... }

        const service = new CannMenusService();
        // We need the brand name to search. For now, we'll fetch the brand doc or pass it in.
        // Let's assume passed in for simplicity, or fetch it.
        // Fetching brand name:
        const { firestore } = await createServerClient();
        const brandDoc = await firestore.collection('brands').doc(brandId).get();

        if (!brandDoc.exists) {
            return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
        }

        const brandName = brandDoc.data()?.name;

        const result = await service.syncMenusForBrand(brandId, brandName);

        return NextResponse.json({ success: true, data: result });
    } catch (error: any) {
        console.error('Error in sync route:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
