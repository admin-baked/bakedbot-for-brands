// API Route: Create Task
// POST /api/tasks/create

import { NextRequest, NextResponse } from 'next/server';
import { getTaskParser } from '@/server/tasks/task-parser';
import { getTaskEngine } from '@/server/tasks/task-engine';
import { getUserFromRequest } from '@/server/auth/auth-helpers';
import { requireBrandAccess } from '@/server/auth/rbac';

import { logger } from '@/lib/logger';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        // Authenticate user
        const user = await getUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { input, brandId, executeImmediately } = body;

        if (!input) {
            return NextResponse.json(
                { error: 'Missing required fields: input' },
                { status: 400 }
            );
        }

        // Verify brand access if brandId is provided
        if (brandId) {
            try {
                requireBrandAccess(user, brandId);
            } catch (error: any) {
                return NextResponse.json({ error: error.message }, { status: 403 });
            }
        }

        // Parse the natural language input into a structured task
        // Use the authenticated user's ID
        const parser = getTaskParser();
        const task = await parser.parseTask(input, {
            userId: user.uid,
            brandId: brandId || user.brandId
        });

        // Optionally execute immediately
        if (executeImmediately) {
            const engine = getTaskEngine();
            const executedTask = await engine.executeTask(task);

            return NextResponse.json({
                success: true,
                task: executedTask,
                executed: true
            });
        }

        // Return the planned task for review
        return NextResponse.json({
            success: true,
            task,
            executed: false
        });

    } catch (error) {
        logger.error('Task creation error:', error);
        return NextResponse.json(
            {
                error: 'Failed to create task',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
