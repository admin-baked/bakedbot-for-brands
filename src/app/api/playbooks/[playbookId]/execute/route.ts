/**
 * Execute Playbook API Endpoint
 *
 * POST /api/playbooks/{playbookId}/execute
 *
 * Triggers:
 * - Manual (user clicks "Run Now")
 * - Schedule (Cloud Scheduler cron job)
 * - Event (Firestore trigger)
 * - Agent (during chat conversation)
 */

import { NextRequest, NextResponse } from 'next/server';
import { executePlaybook } from '@/server/services/playbook-executor';
import { logger } from '@/lib/logger';

export const maxDuration = 300; // 5 minutes

export async function POST(
    request: NextRequest,
    { params }: { params: { playbookId: string } }
) {
    try {
        const { playbookId } = params;

        // Verify authorization
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        // Allow CRON_SECRET or authenticated user
        const isCronRequest = cronSecret && authHeader === `Bearer ${cronSecret}`;

        if (!isCronRequest) {
            // TODO: Add user authentication check
            // For now, reject non-cron requests
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Parse request body
        const body = await request.json();
        const {
            triggeredBy = 'manual',
            orgId,
            userId,
            eventData = {},
        } = body;

        if (!orgId || !userId) {
            return NextResponse.json(
                { error: 'Missing required fields: orgId, userId' },
                { status: 400 }
            );
        }

        logger.info('[PlaybookExecute] Starting execution:', {
            playbookId,
            triggeredBy,
            orgId,
        });

        // Execute playbook
        const result = await executePlaybook({
            playbookId,
            orgId,
            userId,
            triggeredBy,
            eventData,
        });

        logger.info('[PlaybookExecute] Execution complete:', {
            playbookId,
            executionId: result.executionId,
            status: result.status,
        });

        return NextResponse.json({
            success: result.status === 'completed',
            executionId: result.executionId,
            status: result.status,
            startedAt: result.startedAt,
            completedAt: result.completedAt,
            stepResults: result.stepResults.map(s => ({
                action: s.action,
                status: s.status,
                error: s.error,
            })),
        });
    } catch (error: any) {
        logger.error('[PlaybookExecute] Execution failed:', {
            error: error.message,
            playbookId: params.playbookId,
        });

        return NextResponse.json(
            {
                success: false,
                error: error.message,
            },
            { status: 500 }
        );
    }
}
