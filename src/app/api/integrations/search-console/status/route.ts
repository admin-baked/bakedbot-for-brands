import { NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/auth';
import { searchConsoleService } from '@/server/services/growth/search-console';

/**
 * GET /api/integrations/search-console/status
 *
 * Returns the current Google Search Console connection status for the authenticated user.
 * Falls back to platform service-account configuration when available.
 */
export async function GET() {
    try {
        const user = await requireUser();
        const orgId = (user as any).brandId || (user as any).locationId || (user as any).orgId || (user as any).currentOrgId || user.uid;
        const status = await searchConsoleService.getConnectionStatus(user.uid, orgId);
        return NextResponse.json(status);
    } catch (error) {
        return NextResponse.json({
            connected: false,
            mode: 'disconnected',
            siteUrl: null,
            siteConfigured: false,
            error: error instanceof Error ? error.message : String(error),
        });
    }
}
