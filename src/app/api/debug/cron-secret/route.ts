/**
 * Temporary debug endpoint to verify CRON_SECRET
 * DELETE THIS FILE after verification
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    const secret = process.env.CRON_SECRET;

    return NextResponse.json({
        exists: !!secret,
        length: secret?.length || 0,
        // Show first and last 4 chars only for security
        preview: secret
            ? `${secret.substring(0, 4)}...${secret.substring(secret.length - 4)}`
            : 'NOT SET',
    });
}
