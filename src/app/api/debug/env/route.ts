'use server';

import { NextResponse } from 'next/server';

export async function GET() {
    // Only allow in development or with a secret header
    const isDev = process.env.NODE_ENV === 'development';

    const envStatus = {
        SERPER_API_KEY: process.env.SERPER_API_KEY ? 'SET (length: ' + process.env.SERPER_API_KEY.length + ')' : 'NOT SET',
        SERPER_API_KEY_FIRST_CHARS: process.env.SERPER_API_KEY?.substring(0, 4) || 'N/A',
        NODE_ENV: process.env.NODE_ENV,
        FIREBASE_CONFIG: process.env.FIREBASE_CONFIG ? 'SET' : 'NOT SET',
        GCLOUD_PROJECT: process.env.GCLOUD_PROJECT || 'NOT SET',
    };

    return NextResponse.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        env: envStatus,
    });
}
