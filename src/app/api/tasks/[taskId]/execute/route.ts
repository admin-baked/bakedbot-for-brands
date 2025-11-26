// API Route: Execute Task
// POST /api/tasks/[taskId]/execute

import { NextRequest, NextResponse } from 'next/server';
import { getTaskEngine } from '@/server/tasks/task-engine';
import type { Task } from '@/types/task';

export const dynamic = 'force-dynamic';

export async function POST(
    request: NextRequest,
    { params }: { params: { taskId: string } }
) {
    try {
        const task: Task = await request.json();

        if (!task || task.id !== params.taskId) {
            return NextResponse.json(
                { error: 'Invalid task data' },
                { status: 400 }
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
        console.error(`Task execution error (${params.taskId}):`, error);
        return NextResponse.json(
            {
                error: 'Failed to execute task',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
