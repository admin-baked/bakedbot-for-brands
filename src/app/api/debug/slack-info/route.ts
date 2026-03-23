import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { WebClient } from '@slack/web-api';

export const dynamic = 'force-dynamic';

// Simple diagnostic endpoint — guarded by SLACK_DEBUG_TOKEN query param
// Usage: GET /api/debug/slack-info?token=<SLACK_DEBUG_TOKEN>
export async function GET(req: NextRequest): Promise<NextResponse> {
    const debugToken = process.env.SLACK_DEBUG_TOKEN;
    const provided = req.nextUrl.searchParams.get('token');

    if (!debugToken || provided !== debugToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const botToken = process.env.SLACK_BOT_TOKEN;
    if (!botToken) {
        return NextResponse.json({ error: 'SLACK_BOT_TOKEN not configured' }, { status: 500 });
    }

    try {
        const client = new WebClient(botToken);
        const authResult = await client.auth.test();
        return NextResponse.json({
            ok: true,
            bot_id: authResult.bot_id,
            app_id: (authResult as any).app_id,
            user_id: authResult.user_id,
            team: authResult.team,
            url: authResult.url,
            SLACK_LINUS_APP_ID_env: process.env.SLACK_LINUS_APP_ID ?? '(not set)',
            match: (authResult as any).app_id === process.env.SLACK_LINUS_APP_ID,
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
