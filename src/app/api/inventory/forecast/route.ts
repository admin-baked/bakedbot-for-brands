// [AI-THREAD P0-SEC-RBAC-API]
// [Dev1-Claude @ 2025-11-29]:
//   Added server-side role-based authorization.
//   Now requires 'brand' or 'owner' role and validates brand access.

/**
 * API Route: Get Inventory Forecast
 */

import { NextRequest, NextResponse } from 'next/server';
import { inventoryForecastingService } from '@/lib/analytics/inventory-forecasting';
import { getUserFromRequest } from '@/server/auth/auth-helpers';
import { requireRole, requireBrandAccess } from '@/server/auth/rbac';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        // Authenticate and authorize user
        const user = await getUserFromRequest(req);
        if (!user) {
            logger.warn('[P0-SEC-RBAC-API] Unauthorized request - no valid token', {
                path: req.nextUrl.pathname,
            });
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Require brand or owner role
        try {
            requireRole(user, 'brand');
        } catch (error: any) {
            logger.error('[P0-SEC-RBAC-API] Forbidden - insufficient role', {
                path: req.nextUrl.pathname,
                userRole: user.role,
                requiredRole: 'brand',
                uid: user.uid,
            });
            return NextResponse.json({ error: error.message }, { status: 403 });
        }

        const brandId = user.brandId;

        if (!brandId) {
            return NextResponse.json({ error: 'Brand ID not found' }, { status: 404 });
        }

        // Verify brand access
        try {
            requireBrandAccess(user, brandId);
        } catch (error: any) {
            logger.error('[P0-SEC-RBAC-API] Forbidden - cannot access brand', {
                path: req.nextUrl.pathname,
                userRole: user.role,
                brandId,
                uid: user.uid,
            });
            return NextResponse.json({ error: error.message }, { status: 403 });
        }

        const forecasts = await inventoryForecastingService.generateInventoryForecast(brandId);

        return NextResponse.json({ forecasts });
    } catch (error: any) {
        logger.error('Error generating inventory forecast:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to generate inventory forecast' },
            { status: 500 }
        );
    }
}
