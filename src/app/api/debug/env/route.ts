// src/app/api/debug/env/route.ts
/**
 * DEV ONLY: Environment variable status check
 *
 * SECURITY: Blocked in production and requires Super User authentication.
 * Only shows whether keys are SET or NOT SET - never exposes actual values or partial keys.
 */
import { NextResponse } from 'next/server';
import { requireSuperUser } from '@/server/auth/auth';
import { logger } from '@/lib/logger';

// Force dynamic rendering to prevent caching
export const dynamic = 'force-dynamic';

export async function GET() {
    // SECURITY: Block in production
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
            { error: 'Dev route disabled in production' },
            { status: 403 }
        );
    }

    // SECURITY: Require Super User authentication
    try {
        await requireSuperUser();
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // SECURITY: Only show SET/NOT SET status - never expose values, lengths, or partial keys
    const envStatus = {
        SERPER_API_KEY: process.env.SERPER_API_KEY ? 'SET' : 'NOT SET',
        NODE_ENV: process.env.NODE_ENV,
        FIREBASE_CONFIG: process.env.FIREBASE_CONFIG ? 'SET' : 'NOT SET',
        GCLOUD_PROJECT: process.env.GCLOUD_PROJECT ? 'SET' : 'NOT SET',
        GEMINI_API_KEY: process.env.GEMINI_API_KEY ? 'SET' : 'NOT SET',
        CLAUDE_API_KEY: process.env.CLAUDE_API_KEY ? 'SET' : 'NOT SET',
        SENDGRID_API_KEY: process.env.SENDGRID_API_KEY ? 'SET' : 'NOT SET',
        CANNMENUS_API_KEY: process.env.CANNMENUS_API_KEY ? 'SET' : 'NOT SET',
    };

    logger.info('[DEBUG] Environment status check requested');

    return NextResponse.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        env: envStatus,
        // SECURITY: Removed availableKeys - never expose full list of environment variable names
    });
}
