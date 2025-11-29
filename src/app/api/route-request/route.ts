// API Route: Smart Routing - determines if input is a task or chat
// POST /api/route-request

import { NextRequest, NextResponse } from 'next/server';
import { getTaskParser } from '@/server/tasks/task-parser';

import { logger } from '@/lib/logger';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const { input } = await request.json();

        if (!input) {
            return NextResponse.json(
                { error: 'Missing input' },
                { status: 400 }
            );
        }

        // Classify the intent
        const parser = getTaskParser();
        const intent = await parser.classifyIntent(input);

        return NextResponse.json({
            intent,
            input
        });

    } catch (error) {
        logger.error('Intent classification error:', error);
        return NextResponse.json(
            {
                error: 'Failed to classify intent',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
