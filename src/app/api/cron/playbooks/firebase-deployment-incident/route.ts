import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { queueFirebaseDeploymentPlaybookEvent } from '@/server/services/firebase-deployment-incident';

export const dynamic = 'force-dynamic';

function authGuard(req: NextRequest): NextResponse | null {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
        logger.error('[FirebaseDeploymentIncidentRoute] CRON_SECRET not configured');
        return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return null;
}

export async function POST(req: NextRequest) {
    const authError = authGuard(req);
    if (authError) {
        return authError;
    }

    let body: {
        orgId?: string;
        playbookId?: string;
        triggeredBy?: 'manual' | 'schedule' | 'event';
        eventData?: Record<string, unknown>;
        step?: { params?: Record<string, unknown> } | null;
    };

    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (!body.playbookId || !body.eventData) {
        return NextResponse.json({ error: 'Missing playbookId or eventData' }, { status: 400 });
    }

    const result = await queueFirebaseDeploymentPlaybookEvent(body);
    return NextResponse.json(result, { status: 202 });
}
