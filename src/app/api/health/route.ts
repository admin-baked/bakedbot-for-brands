/**
 * GET /api/health
 * Deploy landing verification endpoint.
 *
 * Used by `scripts/pinky.mjs verify-deploy` to confirm a new production
 * build is live before running smoke tests. Returns current Cloud Run
 * revision (changes on every deploy) so callers can detect a new build.
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    return NextResponse.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        // K_REVISION is injected by Cloud Run / Firebase App Hosting on every deploy
        // Format: "bakedbot-prod-00042-abc" — changes each build
        revision: process.env.K_REVISION || 'local',
    });
}
