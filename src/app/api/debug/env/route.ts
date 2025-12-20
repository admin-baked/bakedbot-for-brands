import { NextResponse } from 'next/server';

// Force dynamic rendering to prevent caching
export const dynamic = 'force-dynamic';

export async function GET() {
    // Only allow in development or with a secret header
    const isDev = process.env.NODE_ENV === 'development';

    const envStatus = {
        SERPER_API_KEY: process.env.SERPER_API_KEY ? 'SET (length: ' + process.env.SERPER_API_KEY.length + ')' : 'NOT SET',
        SERPER_API_KEY_FIRST_CHARS: process.env.SERPER_API_KEY?.substring(0, 4) || 'N/A',
        NODE_ENV: process.env.NODE_ENV,
        FIREBASE_CONFIG: process.env.FIREBASE_CONFIG ? 'SET' : 'NOT SET',
        GCLOUD_PROJECT: process.env.GCLOUD_PROJECT || 'NOT SET',
        // Check other secrets to see if they're working
        GEMINI_API_KEY: process.env.GEMINI_API_KEY ? 'SET (length: ' + process.env.GEMINI_API_KEY.length + ')' : 'NOT SET',
        CLAUDE_API_KEY: process.env.CLAUDE_API_KEY ? 'SET (length: ' + process.env.CLAUDE_API_KEY.length + ')' : 'NOT SET',
        SENDGRID_API_KEY: process.env.SENDGRID_API_KEY ? 'SET' : 'NOT SET',
        CANNMENUS_API_KEY: process.env.CANNMENUS_API_KEY ? 'SET' : 'NOT SET',
    };

    return NextResponse.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        env: envStatus,
    });
}
