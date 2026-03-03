/**
 * POST /api/v1/compliance/check
 *
 * Run compliance check against Deebo rules.
 * Requires API key with 'compliance:check' permission.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAPIKey, APIKeyError } from '@/server/auth/api-key-auth';
import { makeAPIResponse, makeAPIError } from '@/types/api-contract';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    const start = Date.now();

    try {
        // Authenticate
        const keyRecord = await requireAPIKey(request, 'compliance:check');

        // Parse body
        const body = await request.json().catch(() => null);
        if (!body || !body.content) {
            return NextResponse.json(
                makeAPIError('invalid_request', 'Request body must include "content" field'),
                { status: 400 },
            );
        }

        const { content, rulePack, context: ruleContext } = body as {
            content: string;
            rulePack?: string;
            context?: Record<string, unknown>;
        };

        // Run compliance check
        const { checkBlogCompliance } = await import('@/server/services/blog-compliance');
        const result = await checkBlogCompliance({
            content,
            title: (ruleContext?.title as string) ?? '',
        } as Parameters<typeof checkBlogCompliance>[0]);

        const passed = result?.status !== 'failed';
        const violations = (result?.issues ?? []).map((i: { message: string }) => i.message);

        return NextResponse.json(
            makeAPIResponse(
                {
                    passed,
                    violations,
                    rulePack: rulePack ?? 'default',
                    checkedAt: new Date().toISOString(),
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

        logger.error(`[API/v1/compliance] Error: ${String(error)}`);
        return NextResponse.json(
            makeAPIError('internal_error', 'Compliance check failed'),
            { status: 500 },
        );
    }
}
