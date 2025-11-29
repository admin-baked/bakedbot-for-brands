import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/firebase/server-client';
import { CannMenusService } from '@/server/services/cannmenus';
import { getUserFromRequest } from '@/server/auth/auth-helpers';
import { requireBrandAccess, hasPermission } from '@/server/auth/rbac';

import { logger } from '@/lib/logger';
export async function POST(req: NextRequest) {
    try {
        // Authenticate user
        const user = await getUserFromRequest(req);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user has permission to sync menus
        if (!hasPermission(user, 'sync:menus')) {
            return NextResponse.json(
                { error: 'Forbidden: insufficient permissions' },
                { status: 403 }
            );
        }

        // Get brandId from request body
        const body = await req.json();
        const { brandId } = body;

        if (!brandId) {
            return NextResponse.json({ error: 'Missing brandId' }, { status: 400 });
        }

        // Verify user has access to this brand
        try {
            requireBrandAccess(user, brandId);
        } catch (error: any) {
            return NextResponse.json(
                { error: error.message },
                { status: 403 }
            );
        }

        // Fetch brand details
        const { firestore } = await createServerClient();
        const brandDoc = await firestore.collection('brands').doc(brandId).get();

        if (!brandDoc.exists) {
            return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
        }

        const brandName = brandDoc.data()?.name;

        // Execute sync
        const service = new CannMenusService();
        const result = await service.syncMenusForBrand(brandId, brandName);

        return NextResponse.json({ success: true, data: result });
    } catch (error: any) {
        logger.error('Error in sync route:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
