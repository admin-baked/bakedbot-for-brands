// src/app/api/playbooks/execute/route.ts
/**
 * Playbook Execution API
 * POST - Execute a playbook
 * GET - Get execution status
 */

import { NextRequest, NextResponse } from 'next/server';
import { executePlaybook, getPlaybookExecution } from '@/server/services/playbook-executor';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { playbookId, orgId, userId } = body;

        if (!playbookId || !orgId || !userId) {
            return NextResponse.json(
                { error: 'playbookId, orgId, and userId are required' },
                { status: 400 }
            );
        }

        const result = await executePlaybook({
            playbookId,
            orgId,
            userId,
            triggeredBy: body.triggeredBy || 'manual',
            eventData: body.eventData,
        });

        return NextResponse.json({
            success: true,
            data: result,
        });

    } catch (error) {
        logger.error('[PlaybookAPI] Execution failed:', error instanceof Error ? error : new Error(String(error)));
        return NextResponse.json(
            { error: 'Failed to execute playbook' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const executionId = searchParams.get('executionId');

        if (!executionId) {
            return NextResponse.json(
                { error: 'executionId parameter is required' },
                { status: 400 }
            );
        }

        const result = await getPlaybookExecution(executionId);

        if (!result) {
            return NextResponse.json(
                { error: 'Execution not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: result,
        });

    } catch (error) {
        logger.error('[PlaybookAPI] Status check failed:', error instanceof Error ? error : new Error(String(error)));
        return NextResponse.json(
            { error: 'Failed to get execution status' },
            { status: 500 }
        );
    }
}
