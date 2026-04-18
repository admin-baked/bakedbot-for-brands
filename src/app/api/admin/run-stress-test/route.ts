/**
 * POST /api/admin/run-stress-test
 *
 * Triggers the Linus full-platform stress test as a background process.
 * Returns 202 immediately; results are posted to agent_tasks by the script.
 *
 * Auth: requireSuperUser (session-based)
 */

import { NextResponse } from 'next/server';
import { requireSuperUser } from '@/server/auth/auth';
import { spawn } from 'child_process';
import path from 'path';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST() {
    try {
        await requireSuperUser();
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const scriptPath = path.join(process.cwd(), 'scripts', 'linus-stress-test-checkin.mjs');
    const startedAt = new Date().toISOString();

    try {
        const child = spawn(process.execPath, [scriptPath], {
            detached: true,
            stdio:    'ignore',
            env: {
                ...process.env,
                FORCE_COLOR: '0',
            },
        });
        child.unref();

        logger.info('[run-stress-test] Stress test spawned', { pid: child.pid, startedAt });
        return NextResponse.json({ message: 'Stress test started', startedAt }, { status: 202 });
    } catch (err) {
        logger.error('[run-stress-test] Failed to spawn', { err });
        return NextResponse.json({ error: 'Failed to start stress test' }, { status: 500 });
    }
}
