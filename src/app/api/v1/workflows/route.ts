/**
 * /api/v1/workflows
 *
 * GET  — List registered workflows
 * POST — Execute a workflow by ID
 *
 * Requires API key with appropriate permissions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAPIKey, APIKeyError } from '@/server/auth/api-key-auth';
import { makeAPIResponse, makeAPIError } from '@/types/api-contract';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const start = Date.now();

    try {
        await requireAPIKey(request, 'workflows:list');

        const { listWorkflows } = await import('@/server/services/workflow-registry');
        const workflows = listWorkflows();

        return NextResponse.json(
            makeAPIResponse(
                workflows.map(w => ({
                    id: w.id,
                    name: w.name,
                    description: w.description,
                    version: w.version,
                    agent: w.agent,
                    category: w.category,
                    tags: w.tags,
                    trigger: w.trigger,
                    stepCount: w.steps.length,
                })),
                {
                    requestId: `req_${Date.now()}`,
                    durationMs: Date.now() - start,
                    version: 'v1',
                },
            ),
        );
    } catch (error) {
        if (error instanceof APIKeyError) {
            return error.toResponse();
        }

        logger.error(`[API/v1/workflows] List error: ${String(error)}`);
        return NextResponse.json(
            makeAPIError('internal_error', 'Failed to list workflows'),
            { status: 500 },
        );
    }
}

export async function POST(request: NextRequest) {
    const start = Date.now();

    try {
        const keyRecord = await requireAPIKey(request, 'workflows:run');

        const body = await request.json().catch(() => null);
        if (!body || !body.workflowId) {
            return NextResponse.json(
                makeAPIError('invalid_request', 'Request body must include "workflowId"'),
                { status: 400 },
            );
        }

        const { workflowId, variables, orgId } = body as {
            workflowId: string;
            variables?: Record<string, unknown>;
            orgId?: string;
        };

        const { executeWorkflow } = await import('@/server/services/workflow-runtime');
        const execution = await executeWorkflow(workflowId, {
            triggeredBy: `api_key:${keyRecord.id}`,
            variables,
            orgId: orgId ?? keyRecord.orgId,
        });

        return NextResponse.json(
            makeAPIResponse(
                {
                    executionId: execution.id,
                    workflowId: execution.workflowId,
                    status: execution.status,
                    durationMs: execution.durationMs,
                    stepsCompleted: execution.stepResults.filter(r => r.status === 'completed').length,
                    stepsFailed: execution.stepResults.filter(r => r.status === 'failed').length,
                    error: execution.error,
                },
                {
                    requestId: `req_${Date.now()}`,
                    durationMs: Date.now() - start,
                    version: 'v1',
                },
            ),
        );
    } catch (error) {
        if (error instanceof APIKeyError) {
            return error.toResponse();
        }

        const message = error instanceof Error ? error.message : String(error);

        if (message.includes('not found in registry')) {
            return NextResponse.json(
                makeAPIError('not_found', message),
                { status: 404 },
            );
        }

        logger.error(`[API/v1/workflows] Run error: ${message}`);
        return NextResponse.json(
            makeAPIError('internal_error', 'Failed to execute workflow'),
            { status: 500 },
        );
    }
}
