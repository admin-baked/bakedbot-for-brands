// API Route: Create Task
// POST /api/tasks/create

import { NextRequest, NextResponse } from 'next/server';
import { getTaskParser } from '@/server/tasks/task-parser';
import { getTaskEngine } from '@/server/tasks/task-engine';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { input, userId, brandId, executeImmediately } = body;

        if (!input || !userId) {
            return NextResponse.json(
                { error: 'Missing required fields: input, userId' },
                { status: 400 }
            );
        }

        // Parse the natural language input into a structured task
        const parser = getTaskParser();
        const task = await parser.parseTask(input, { userId, brandId });

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
        console.error('Task creation error:', error);
        return NextResponse.json(
            {
                error: 'Failed to create task',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
