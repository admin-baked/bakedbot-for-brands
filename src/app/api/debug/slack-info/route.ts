import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { slackService } from '@/server/services/communications/slack';

export const dynamic = 'force-dynamic';

// Simple diagnostic endpoint — guarded by SLACK_DEBUG_TOKEN query param
// Usage: GET /api/debug/slack-info?token=<SLACK_DEBUG_TOKEN>
export async function GET(req: NextRequest): Promise<NextResponse> {
    const debugToken = process.env.SLACK_DEBUG_TOKEN;
    const provided = req.nextUrl.searchParams.get('token');

    if (!debugToken || provided !== debugToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authResult = await slackService.authTest();
    if (!authResult) {
        return NextResponse.json({ error: 'SLACK_BOT_TOKEN not configured or auth.test failed' }, { status: 500 });
    }

    return NextResponse.json({
        ok: true,
        ...authResult,
        SLACK_LINUS_APP_ID_env: process.env.SLACK_LINUS_APP_ID ?? '(not set)',
        match: authResult.app_id === process.env.SLACK_LINUS_APP_ID,
    });
}
