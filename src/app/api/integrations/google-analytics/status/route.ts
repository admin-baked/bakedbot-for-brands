import { NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/auth';
import { googleAnalyticsService } from '@/server/services/growth/google-analytics';

/**
 * GET /api/integrations/google-analytics/status
 *
 * Returns the current Google Analytics connection status for the authenticated user.
 * Falls back to platform service-account configuration when available.
 */
export async function GET() {
    try {
        const user = await requireUser();
        const status = await googleAnalyticsService.getConnectionStatus(user.uid);
        return NextResponse.json(status);
    } catch (error) {
        return NextResponse.json({
            connected: false,
            mode: 'disconnected',
            propertyId: null,
            propertyConfigured: false,
            error: error instanceof Error ? error.message : String(error),
        });
    }
}
