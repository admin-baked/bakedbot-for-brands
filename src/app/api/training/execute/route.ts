/**
 * Code Execution API Route
 *
 * Proxies code execution requests to Cloud Run service.
 * Handles authentication, rate limiting, and logging.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import { Timestamp } from '@google-cloud/firestore';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const ExecuteRequestSchema = z.object({
    challengeId: z.string(),
    code: z.string().min(10).max(50000),
});

interface ExecutionResult {
    success: boolean;
    output: string;
    testResults?: {
        numPassedTests: number;
        numFailedTests: number;
        numTotalTests: number;
        testResults: Array<{
            title: string;
            status: 'passed' | 'failed';
            duration: number;
            failureMessage?: string;
        }>;
    };
    executionTime: number;
    error?: string;
}

/**
 * POST /api/training/execute
 *
 * Execute code for a training challenge
 */
export async function POST(req: NextRequest) {
    try {
        // Authenticate user
        const user = await requireUser(['intern', 'super_user']);

        // Parse and validate request
        const body = await req.json();
        const validation = ExecuteRequestSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { success: false, error: 'Invalid request', details: validation.error.errors },
                { status: 400 }
            );
        }

        const { challengeId, code } = validation.data;

        // Rate limiting check
        const rateLimitOk = await checkRateLimit(user.uid);
        if (!rateLimitOk) {
            logger.warn('[Code Execution] Rate limit exceeded', { userId: user.uid, challengeId });

            return NextResponse.json(
                {
                    success: false,
                    error: 'Rate limit exceeded',
                    message: 'You can run code 10 times per minute. Please wait and try again.',
                },
                { status: 429 }
            );
        }

        // Get challenge and test code
        const db = getAdminFirestore();
        const challengeDoc = await db.collection('trainingChallenges').doc(challengeId).get();

        if (!challengeDoc.exists) {
            return NextResponse.json({ success: false, error: 'Challenge not found' }, { status: 404 });
        }

        const challenge = challengeDoc.data();

        // Check if challenge supports code execution
        if (!challenge?.testCode) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Code execution not supported',
                    message: 'This challenge does not have automated tests.',
                },
                { status: 400 }
            );
        }

        logger.info('[Code Execution] Starting execution', {
            userId: user.uid,
            challengeId,
            codeLength: code.length,
        });

        // Call Cloud Run service
        const codeRunnerUrl = process.env.CODE_RUNNER_URL;
        if (!codeRunnerUrl) {
            throw new Error('CODE_RUNNER_URL not configured');
        }

        const startTime = Date.now();

        const response = await fetch(`${codeRunnerUrl}/execute`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                code,
                tests: challenge.testCode,
                language: 'typescript',
                timeout: 15000,
            }),
        });

        const result: ExecutionResult = await response.json();
        const totalTime = Date.now() - startTime;

        // Log execution result
        await logExecution({
            userId: user.uid,
            challengeId,
            success: result.success,
            executionTime: result.executionTime,
            totalTime,
            numPassedTests: result.testResults?.numPassedTests || 0,
            numFailedTests: result.testResults?.numFailedTests || 0,
        });

        logger.info('[Code Execution] Execution complete', {
            userId: user.uid,
            challengeId,
            success: result.success,
            executionTime: result.executionTime,
            totalTime,
        });

        return NextResponse.json(result);
    } catch (error) {
        logger.error('[Code Execution] Execution failed', { error });

        return NextResponse.json(
            {
                success: false,
                error: 'Execution failed',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

/**
 * Check rate limit for user
 * Limit: 10 executions per minute
 */
async function checkRateLimit(userId: string): Promise<boolean> {
    const db = getAdminFirestore();
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;

    // Query recent executions
    const recentExecutions = await db
        .collection('codeExecutions')
        .where('userId', '==', userId)
        .where('timestamp', '>=', Timestamp.fromMillis(oneMinuteAgo))
        .count()
        .get();

    const count = recentExecutions.data().count;

    // Allow up to 10 executions per minute
    return count < 10;
}

/**
 * Log code execution to Firestore
 */
async function logExecution(data: {
    userId: string;
    challengeId: string;
    success: boolean;
    executionTime: number;
    totalTime: number;
    numPassedTests: number;
    numFailedTests: number;
}): Promise<void> {
    const db = getAdminFirestore();

    await db.collection('codeExecutions').add({
        ...data,
        timestamp: Timestamp.now(),
    });
}
