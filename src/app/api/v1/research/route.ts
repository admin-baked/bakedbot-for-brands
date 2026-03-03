/**
 * /api/v1/research
 *
 * POST — Start a new research task
 * GET  — Get research task status
 *
 * Requires API key with appropriate permissions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAPIKey, APIKeyError } from '@/server/auth/api-key-auth';
import { makeAPIResponse, makeAPIError } from '@/types/api-contract';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    const start = Date.now();

    try {
        const keyRecord = await requireAPIKey(request, 'research:start');

        const body = await request.json().catch(() => null);
        if (!body || !body.query) {
            return NextResponse.json(
                makeAPIError('invalid_request', 'Request body must include "query"'),
                { status: 400 },
            );
        }

        const { query, orgId } = body as {
            query: string;
            orgId?: string;
        };

        // Create research task via existing action
        const { createServerClient } = await import('@/firebase/server-client');
        const { firestore } = await createServerClient();

        const taskDoc = await firestore.collection('research_tasks').add({
            query,
            status: 'queued',
            orgId: orgId ?? keyRecord.orgId,
            createdBy: `api_key:${keyRecord.id}`,
            createdAt: new Date(),
            progress: 0,
        });

        // Trigger research job (non-blocking)
        void fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? 'https://bakedbot.ai'}/api/jobs/research`, {
            method: 'POST',
        }).catch(() => {});

        return NextResponse.json(
            makeAPIResponse(
                {
                    taskId: taskDoc.id,
                    status: 'queued',
                    query,
                },
                {
                    requestId: `req_${Date.now()}`,
                    durationMs: Date.now() - start,
                    version: 'v1',
                },
            ),
            { status: 201 },
        );
    } catch (error) {
        if (error instanceof APIKeyError) {
            return error.toResponse();
        }

        logger.error(`[API/v1/research] Start error: ${String(error)}`);
        return NextResponse.json(
            makeAPIError('internal_error', 'Failed to start research task'),
            { status: 500 },
        );
    }
}

export async function GET(request: NextRequest) {
    const start = Date.now();

    try {
        await requireAPIKey(request, 'research:status');

        const taskId = request.nextUrl.searchParams.get('taskId');
        if (!taskId) {
            return NextResponse.json(
                makeAPIError('invalid_request', 'Query parameter "taskId" is required'),
                { status: 400 },
            );
        }

        const { createServerClient } = await import('@/firebase/server-client');
        const { firestore } = await createServerClient();

        const taskDoc = await firestore.collection('research_tasks').doc(taskId).get();
        if (!taskDoc.exists) {
            return NextResponse.json(
                makeAPIError('not_found', `Research task "${taskId}" not found`),
                { status: 404 },
            );
        }

        const data = taskDoc.data()!;

        return NextResponse.json(
            makeAPIResponse(
                {
                    taskId,
                    status: data.status,
                    progress: data.progress ?? 0,
                    query: data.query,
                    report: data.report ?? null,
                    plan: data.plan ?? null,
                    sources: data.sources ?? [],
                    createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
                    completedAt: data.completedAt?.toDate?.()?.toISOString() ?? null,
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

        logger.error(`[API/v1/research] Status error: ${String(error)}`);
        return NextResponse.json(
            makeAPIError('internal_error', 'Failed to get research status'),
            { status: 500 },
        );
    }
}
