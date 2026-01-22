// src/app/api/playbooks/execute/route.ts
/**
 * Playbook Execution API
 * POST - Execute a playbook
 * GET - Get execution status
 *
 * SECURITY: Requires authentication and org membership verification.
 */

import { NextRequest, NextResponse } from 'next/server';
import { executePlaybook, getPlaybookExecution } from '@/server/services/playbook-executor';
import { logger } from '@/lib/logger';
import { requireUser } from '@/server/auth/auth';
import { createServerClient } from '@/firebase/server-client';

/**
 * Verify that a user has access to an organization
 */
async function verifyOrgMembership(uid: string, orgId: string): Promise<boolean> {
    const { firestore } = await createServerClient();

    // Check if user is a member of the organization
    const memberDoc = await firestore
        .collection('organizations')
        .doc(orgId)
        .collection('members')
        .doc(uid)
        .get();

    if (memberDoc.exists) {
        return true;
    }

    // Also check if org document has this user as owner
    const orgDoc = await firestore.collection('organizations').doc(orgId).get();
    if (orgDoc.exists) {
        const orgData = orgDoc.data();
        if (orgData?.ownerId === uid || orgData?.ownerUid === uid) {
            return true;
        }
    }

    return false;
}

export async function POST(request: NextRequest) {
    try {
        // SECURITY: Require authenticated session
        const session = await requireUser();

        const body = await request.json();
        const { playbookId, orgId } = body;

        if (!playbookId || !orgId) {
            return NextResponse.json(
                { error: 'playbookId and orgId are required' },
                { status: 400 }
            );
        }

        // SECURITY: Verify user belongs to the organization
        const hasAccess = await verifyOrgMembership(session.uid, orgId);
        if (!hasAccess) {
            logger.warn('[PlaybookAPI] Unauthorized org access attempt', {
                uid: session.uid,
                orgId,
                playbookId,
            });
            return NextResponse.json(
                { error: 'Forbidden: You do not have access to this organization' },
                { status: 403 }
            );
        }

        const result = await executePlaybook({
            playbookId,
            orgId,
            userId: session.uid, // SECURITY: Use session UID, not request body
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
