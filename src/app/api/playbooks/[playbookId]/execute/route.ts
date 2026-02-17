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
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps } from 'firebase-admin/app';

export const maxDuration = 300; // 5 minutes

// Initialize Firebase Admin if not already done
if (!getApps().length) {
    initializeApp();
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ playbookId: string }> }
) {
    let playbookId: string | undefined;
    try {
        playbookId = (await params).playbookId;

        // Verify authorization (CRON_SECRET or authenticated user)
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        let userId: string | undefined;
        let isAuthorized = false;

        // Check if it's a CRON request
        const isCronRequest = cronSecret && authHeader === `Bearer ${cronSecret}`;

        if (isCronRequest) {
            isAuthorized = true;
            userId = 'system'; // System-triggered execution
        } else if (authHeader?.startsWith('Bearer ')) {
            // Check if it's a user session token
            try {
                const token = authHeader.replace('Bearer ', '');
                const decodedToken = await getAuth().verifyIdToken(token);

                // Only allow super_user role to manually trigger playbooks
                if (decodedToken.role === 'super_user') {
                    isAuthorized = true;
                    userId = decodedToken.uid;
                } else {
                    return NextResponse.json(
                        { error: 'Forbidden: Only super users can manually trigger playbooks' },
                        { status: 403 }
                    );
                }
            } catch (error) {
                return NextResponse.json(
                    { error: 'Invalid authentication token' },
                    { status: 401 }
                );
            }
        }

        if (!isAuthorized || !userId) {
            return NextResponse.json(
                { error: 'Unauthorized: Valid authentication required' },
                { status: 401 }
            );
        }

        // Parse request body
        const body = await request.json();
        const {
            triggeredBy = 'manual',
            orgId,
            eventData = {},
        } = body;

        // orgId is required for execution
        if (!orgId) {
            return NextResponse.json(
                { error: 'Missing required field: orgId' },
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
            playbookId,
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
