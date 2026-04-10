export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/server/auth/cron';
import { runThrivePilotSlackCleanup } from '@/server/services/slack-pilot-cleanup';

export const maxDuration = 300;

export async function POST(request: NextRequest) {
    const authError = await requireCronSecret(request, 'thrive-pilot-slack-cleanup');
    if (authError) return authError;

    const body = await request.json().catch(() => ({})) as {
        dryRun?: boolean;
        beforeTs?: string;
        maxMessages?: number;
        confirm?: string;
    };

    const dryRun = body.dryRun !== false;
    if (!dryRun && body.confirm !== 'DELETE_THRIVE_PILOT_HISTORY') {
        return NextResponse.json({
            ok: false,
            error: 'Missing confirm token. Re-run with confirm=DELETE_THRIVE_PILOT_HISTORY.',
        }, { status: 400 });
    }

    const result = await runThrivePilotSlackCleanup({
        dryRun,
        beforeTs: typeof body.beforeTs === 'string' ? body.beforeTs : undefined,
        maxMessages: typeof body.maxMessages === 'number' ? body.maxMessages : undefined,
    });

    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}

export async function GET(request: NextRequest) {
    return POST(request);
}
