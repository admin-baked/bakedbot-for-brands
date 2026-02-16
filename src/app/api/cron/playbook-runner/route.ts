/**
 * Playbook Runner - Cloud Scheduler Endpoint
 *
 * Executes operational playbooks on schedule:
 * - Daily System Health Check
 * - Weekly Growth Review
 * - Integration Health Monitor
 * - Customer Churn Prevention
 *
 * Triggered by Cloud Scheduler with CRON_SECRET auth.
 *
 * POST /api/cron/playbook-runner?playbookId=ops_daily_health_check
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeFirebaseAdmin } from '@/lib/firebase-admin';
import { logger } from '@/lib/logger';

initializeFirebaseAdmin();
const firestore = getFirestore();

interface PlaybookStep {
    id: string;
    type: 'tool_call' | 'delegate' | 'synthesize' | 'notify' | 'create_thread' | 'condition';
    name: string;
    agent?: string;
    tool?: string;
    task?: string;
    storeResultAs?: string;
    condition?: string;
    config?: Record<string, any>;
}

interface Playbook {
    id: string;
    name: string;
    description: string;
    segment: string;
    schedule: string;
    cronExpression: string;
    agent: string;
    steps: PlaybookStep[];
    enabled: boolean;
}

interface ExecutionContext {
    playbookId: string;
    playbookName: string;
    startTime: number;
    results: Record<string, any>;
    conditions: Record<string, boolean>;
}

/**
 * Verify CRON_SECRET authorization
 */
function verifyCronAuth(request: NextRequest): boolean {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
        logger.error('[PlaybookRunner] CRON_SECRET not configured');
        return false;
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        logger.warn('[PlaybookRunner] Missing or invalid Authorization header');
        return false;
    }

    const providedSecret = authHeader.slice(7); // Remove "Bearer "
    return providedSecret === cronSecret;
}

/**
 * Execute a playbook step
 */
async function executeStep(
    step: PlaybookStep,
    context: ExecutionContext
): Promise<any> {
    logger.info(`[PlaybookRunner] Executing step: ${step.name}`, { type: step.type });

    // Check condition if present
    if (step.condition && !context.conditions[step.condition]) {
        logger.info(`[PlaybookRunner] Skipping step due to condition: ${step.condition}`);
        return { skipped: true, reason: `condition_not_met: ${step.condition}` };
    }

    try {
        switch (step.type) {
            case 'tool_call':
                return await executeToolCall(step, context);

            case 'delegate':
                return await executeDelegation(step, context);

            case 'synthesize':
                return await executeSynthesis(step, context);

            case 'notify':
                return await executeNotification(step, context);

            case 'create_thread':
                return await executeThreadCreation(step, context);

            case 'condition':
                return await evaluateCondition(step, context);

            default:
                logger.warn(`[PlaybookRunner] Unknown step type: ${step.type}`);
                return { error: `Unknown step type: ${step.type}` };
        }
    } catch (error: any) {
        logger.error(`[PlaybookRunner] Step execution failed: ${step.name}`, {
            error: error.message,
            step: step.id,
        });
        return { error: error.message, step: step.id };
    }
}

async function executeToolCall(step: PlaybookStep, context: ExecutionContext): Promise<any> {
    // TODO: Implement tool execution
    // This would call the actual agent tools (getSystemHealth, crmGetStats, etc.)
    logger.info(`[PlaybookRunner] Tool call: ${step.tool}`, step.config);

    return {
        success: true,
        tool: step.tool,
        result: `Placeholder: Tool ${step.tool} would be executed here`,
    };
}

async function executeDelegation(step: PlaybookStep, context: ExecutionContext): Promise<any> {
    // TODO: Implement agent delegation
    // This would call the agent harness to delegate tasks
    logger.info(`[PlaybookRunner] Delegating to: ${step.agent}`, { task: step.task });

    return {
        success: true,
        agent: step.agent,
        task: step.task,
        result: `Placeholder: Task delegated to ${step.agent}`,
    };
}

async function executeSynthesis(step: PlaybookStep, context: ExecutionContext): Promise<any> {
    // TODO: Implement AI synthesis
    // This would use Claude/Gemini to generate reports
    logger.info(`[PlaybookRunner] Synthesizing report with: ${step.agent}`);

    const template = step.config?.template || '';
    // Replace template variables with results from context
    let synthesized = template;
    for (const [key, value] of Object.entries(context.results)) {
        synthesized = synthesized.replace(new RegExp(`{{${key}}}`, 'g'), JSON.stringify(value));
    }

    return {
        success: true,
        synthesized,
    };
}

async function executeNotification(step: PlaybookStep, context: ExecutionContext): Promise<any> {
    // TODO: Implement multi-channel notifications
    // This would send emails, Slack messages, dashboard notifications
    logger.info(`[PlaybookRunner] Sending notification`, {
        channels: step.config?.channels,
        recipients: step.config?.recipients,
    });

    return {
        success: true,
        channels: step.config?.channels,
        recipients: step.config?.recipients,
    };
}

async function executeThreadCreation(step: PlaybookStep, context: ExecutionContext): Promise<any> {
    // TODO: Implement inbox thread creation
    logger.info(`[PlaybookRunner] Creating thread: ${step.config?.title}`);

    return {
        success: true,
        threadId: `thread_${Date.now()}`,
        title: step.config?.title,
    };
}

async function evaluateCondition(step: PlaybookStep, context: ExecutionContext): Promise<any> {
    // TODO: Implement condition evaluation
    // This would evaluate expressions like "inactive_customers.length > 0"
    logger.info(`[PlaybookRunner] Evaluating condition: ${step.condition}`);

    const conditionMet = true; // Placeholder
    if (step.condition) {
        context.conditions[step.condition] = conditionMet;
    }

    return {
        success: true,
        condition: step.condition,
        result: conditionMet,
    };
}

/**
 * Execute a complete playbook
 */
async function executePlaybook(playbook: Playbook): Promise<ExecutionContext> {
    const context: ExecutionContext = {
        playbookId: playbook.id,
        playbookName: playbook.name,
        startTime: Date.now(),
        results: {},
        conditions: {},
    };

    logger.info(`[PlaybookRunner] Starting playbook execution: ${playbook.name}`);

    for (const step of playbook.steps) {
        const result = await executeStep(step, context);

        // Store result if requested
        if (step.storeResultAs) {
            context.results[step.storeResultAs] = result;
        }

        // Log step completion
        logger.info(`[PlaybookRunner] Step completed: ${step.name}`, {
            success: !result.error,
            duration: Date.now() - context.startTime,
        });
    }

    const duration = Date.now() - context.startTime;
    logger.info(`[PlaybookRunner] Playbook completed: ${playbook.name}`, {
        duration,
        steps: playbook.steps.length,
    });

    return context;
}

/**
 * Main handler
 */
export async function POST(request: NextRequest) {
    const startTime = Date.now();

    // 1. Verify authorization
    if (!verifyCronAuth(request)) {
        logger.error('[PlaybookRunner] Unauthorized request');
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        );
    }

    // 2. Get playbook ID
    const { searchParams } = new URL(request.url);
    const playbookId = searchParams.get('playbookId');

    if (!playbookId) {
        logger.error('[PlaybookRunner] Missing playbookId parameter');
        return NextResponse.json(
            { error: 'Missing playbookId parameter' },
            { status: 400 }
        );
    }

    logger.info(`[PlaybookRunner] Received execution request`, { playbookId });

    try {
        // 3. Load playbook from Firestore
        const playbookDoc = await firestore
            .collection('playbooks_internal')
            .doc(playbookId)
            .get();

        if (!playbookDoc.exists) {
            logger.error(`[PlaybookRunner] Playbook not found: ${playbookId}`);
            return NextResponse.json(
                { error: `Playbook not found: ${playbookId}` },
                { status: 404 }
            );
        }

        const playbook = playbookDoc.data() as Playbook;

        // 4. Check if playbook is enabled
        if (!playbook.enabled) {
            logger.warn(`[PlaybookRunner] Playbook is disabled: ${playbookId}`);
            return NextResponse.json(
                { error: `Playbook is disabled: ${playbookId}` },
                { status: 403 }
            );
        }

        // 5. Execute playbook
        const executionContext = await executePlaybook(playbook);

        // 6. Store execution record
        const executionRecord = {
            playbookId: playbook.id,
            playbookName: playbook.name,
            startedAt: new Date(startTime),
            completedAt: new Date(),
            duration: Date.now() - startTime,
            stepsExecuted: playbook.steps.length,
            results: executionContext.results,
            conditions: executionContext.conditions,
            success: true,
        };

        await firestore
            .collection('playbook_executions')
            .add(executionRecord);

        logger.info(`[PlaybookRunner] Execution record stored`, {
            playbookId,
            duration: executionRecord.duration,
        });

        // 7. Return success
        return NextResponse.json({
            success: true,
            playbookId: playbook.id,
            playbookName: playbook.name,
            duration: executionRecord.duration,
            stepsExecuted: playbook.steps.length,
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        logger.error('[PlaybookRunner] Execution failed', {
            error: error.message,
            playbookId,
        });

        // Store failure record
        try {
            await firestore.collection('playbook_executions').add({
                playbookId,
                startedAt: new Date(startTime),
                completedAt: new Date(),
                duration: Date.now() - startTime,
                success: false,
                error: error.message,
            });
        } catch (recordError) {
            logger.error('[PlaybookRunner] Failed to store error record', recordError);
        }

        return NextResponse.json(
            {
                error: 'Playbook execution failed',
                message: error.message,
                playbookId,
            },
            { status: 500 }
        );
    }
}
