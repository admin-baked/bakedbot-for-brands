/**
 * Agent Wakeup Endpoint
 * 
 * POST /api/agent-wakeup
 * 
 * Receives task notifications and spawns the opencode agent to process them.
 * Uses CRON_SECRET for authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { logger } from '@/lib/logger';
import { requireCronSecret } from '@/server/auth/cron';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const authError = await requireCronSecret(req, 'agent-wakeup');
    if (authError) return authError;

    try {
        const body = await req.json();
        const { taskId, taskType, context } = body;

        logger.info('[Agent Wakeup] Triggered', { taskId, taskType });

        const workspacePath = process.env.AGENT_WORKSPACE || '/workspace/bakedbot-for-brands';
        
        const args = [
            '--project', workspacePath,
            '--prompt', context || `Process agent task: ${taskId}`
        ];

        const opencodePath = process.env.OPENCODE_PATH || '/usr/local/bin/opencode';

        const child = spawn(opencodePath, args, {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
                PATH: process.env.PATH,
                NODE_ENV: process.env.NODE_ENV,
                OPENCODE_TASK_ID: taskId,
                OPENCODE_TASK_TYPE: taskType || 'bug-hunt',
            }
        });

        let output = '';
        let errorOutput = '';

        child.stdout.on('data', (data) => {
            output += data.toString();
            logger.info('[Opencode] output:', { data: data.toString().slice(0, 200) });
        });

        child.stderr.on('data', (data) => {
            errorOutput += data.toString();
            logger.error('[Opencode] error:', { data: data.toString().slice(0, 200) });
        });

        child.on('close', (code) => {
            logger.info('[Opencode] exited with code:', { code });
        });

        return NextResponse.json({ 
            success: true, 
            message: 'Agent spawned',
            taskId,
            pid: child.pid 
        });

    } catch (error) {
        logger.error('[Agent Wakeup] Failed:', { error });
        return NextResponse.json({ 
            error: 'Failed to spawn agent',
            details: String(error)
        }, { status: 500 });
    }
}
