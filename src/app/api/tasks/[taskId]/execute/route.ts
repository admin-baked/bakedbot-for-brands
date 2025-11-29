// API Route: Execute Task
// POST /api/tasks/[taskId]/execute

import { NextRequest, NextResponse } from 'next/server';
import { getTaskEngine } from '@/server/tasks/task-engine';
import type { Task } from '@/types/task';
import { getUserFromRequest } from '@/server/auth/auth-helpers';
import { canAccessBrand } from '@/server/auth/rbac';

import { logger } from '@/lib/logger';
export const dynamic = 'force-dynamic';

export async function POST(
    request: NextRequest,
    { params }: { params: { taskId: string } }
) {
    try {
        // Authenticate user
        const user = await getUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const task: Task = await request.json();

        if (!task || task.id !== params.taskId) {
            return NextResponse.json(
                { error: 'Invalid task data' },
                { status: 400 }
            );
        }

        // Verify ownership or access
        const isOwner = task.createdBy === user.uid;
        const hasBrandAccess = task.brandId ? canAccessBrand(user, task.brandId) : false;

        if (!isOwner && !hasBrandAccess) {
            return NextResponse.json(
                { error: 'Forbidden: You do not have permission to execute this task' },
                { status: 403 }
            );
        }

        // Execute the task
        const engine = getTaskEngine();
        const executedTask = await engine.executeTask(task);

        return NextResponse.json({
            success: true,
            task: executedTask
        });

    } catch (error) {
        logger.error(`Task execution error (${params.taskId}):`, error);
        return NextResponse.json(
            {
                error: 'Failed to execute task',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
