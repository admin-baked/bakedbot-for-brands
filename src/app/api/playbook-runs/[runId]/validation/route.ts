export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import {
    PlaybookApiError,
    getAuthorizedRun,
} from '@/server/services/playbook-auth';

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ runId: string }> },
) {
    try {
        const { runId } = await params;
        const { run } = await getAuthorizedRun(runId);
        const validationReport = run.validationReport ?? null;

        if (!validationReport) {
            return NextResponse.json({ error: 'Validation report not found' }, { status: 404 });
        }

        return NextResponse.json({ validationReport });
    } catch (error) {
        if (error instanceof PlaybookApiError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        console.error('[API] Get playbook run validation error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal Server Error' },
            { status: 500 },
        );
    }
}
