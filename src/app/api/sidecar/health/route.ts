import { NextResponse } from 'next/server';
import { getRemoteMcpClient } from '@/server/services/remote-mcp-client';

/**
 * Sidecar Health Check API
 *
 * GET /api/sidecar/health
 *
 * Returns health status of the Python sidecar.
 */
export async function GET() {
    try {
        const client = getRemoteMcpClient();

        if (!client) {
            return NextResponse.json({
                healthy: false,
                error: 'Sidecar not configured (PYTHON_SIDECAR_ENDPOINT missing)',
            });
        }

        const health = await client.healthCheck();

        return NextResponse.json(health);
    } catch (error) {
        return NextResponse.json({
            healthy: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}
