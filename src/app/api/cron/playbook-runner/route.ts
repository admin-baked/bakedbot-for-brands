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
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import {
    checkAIStudioActionAllowed,
    chargeAIStudioCredits,
} from '@/server/services/ai-studio-billing-service';
import {
    classifyPlaybookStepType,
    resolvePlaybookToolActionType,
} from '@/lib/ai-studio/playbook-step-classifier';
import type { AIStudioActionType } from '@/types/ai-studio';

interface PlaybookStep {
    id: string;
    type: 'tool_call' | 'delegate' | 'synthesize' | 'notify' | 'create_thread' | 'condition';
    name: string;
    agent?: string;
    tool?: string;
    task?: string;
    storeResultAs?: string;
    condition?: string;
    /** Model tier override for this step (optional — defaults to economy for automation) */
    modelTier?: 'economy' | 'premium_reasoning' | 'flagship';
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
    /** orgId of the org this playbook belongs to. Present on org playbooks; absent on system-internal playbooks. */
    orgId?: string;
}

interface ExecutionContext {
    playbookId: string;
    playbookName: string;
    playbookRunId: string;
    orgId?: string;
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
 * Execute a playbook step — with AI Studio credit gating for ai_powered steps.
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

    // AI Studio credit gate for ai_powered steps
    const stepCategory = classifyPlaybookStepType(step.type, step.tool);
    if (stepCategory === 'ai_powered' && context.orgId) {
        const actionType = resolvePlaybookActionType(step) as AIStudioActionType;
        const check = await checkAIStudioActionAllowed({
            orgId: context.orgId,
            actionType,
            automationTriggered: true,
            playbookId: context.playbookId,
            requestedModelTier: step.modelTier,
        });

        if (!check.allowed) {
            logger.warn(`[PlaybookRunner] AI credit gate blocked step: ${step.name}`, {
                orgId: context.orgId,
                playbookId: context.playbookId,
                actionType,
                errorCode: check.errorCode,
                reason: check.reason,
            });
            return {
                skipped: true,
                reason: `ai_credit_denied:${check.errorCode}`,
                creditDenied: true,
                errorCode: check.errorCode,
            };
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result: any;
    try {
        switch (step.type) {
            case 'tool_call':
                result = await executeToolCall(step, context);
                break;

            case 'delegate':
                result = await executeDelegation(step, context);
                break;

            case 'synthesize':
                result = await executeSynthesis(step, context);
                break;

            case 'notify':
                result = await executeNotification(step, context);
                break;

            case 'create_thread':
                result = await executeThreadCreation(step, context);
                break;

            case 'condition':
                result = await evaluateCondition(step, context);
                break;

            default:
                logger.warn(`[PlaybookRunner] Unknown step type: ${step.type}`);
                result = { error: `Unknown step type: ${step.type}` };
        }

        // Charge AI credits after successful ai_powered step execution
        if (stepCategory === 'ai_powered' && context.orgId) {
            const actionType = resolvePlaybookActionType(step) as AIStudioActionType;
            const stepSuccess = !result?.error;
            chargeAIStudioCredits({
                orgId: context.orgId,
                actionType,
                sourceSurface: 'playbooks',
                automationTriggered: true,
                playbookId: context.playbookId,
                playbookRunId: context.playbookRunId,
                success: stepSuccess,
                modelTier: step.modelTier,
            }).catch((err: unknown) =>
                logger.error('[PlaybookRunner] Credit charge failed', {
                    orgId: context.orgId,
                    stepId: step.id,
                    err,
                })
            );
        }

        return result;
    } catch (error: any) {
        logger.error(`[PlaybookRunner] Step execution failed: ${step.name}`, {
            error: error.message,
            step: step.id,
        });

        // Still charge for failed AI steps (action was attempted and resources consumed)
        if (stepCategory === 'ai_powered' && context.orgId) {
            const actionType = resolvePlaybookActionType(step) as AIStudioActionType;
            chargeAIStudioCredits({
                orgId: context.orgId,
                actionType,
                sourceSurface: 'playbooks',
                automationTriggered: true,
                playbookId: context.playbookId,
                playbookRunId: context.playbookRunId,
                success: false,
                errorCode: error.message,
                modelTier: step.modelTier,
            }).catch((chargeErr: unknown) =>
                logger.error('[PlaybookRunner] Credit charge on failure failed', {
                    orgId: context.orgId,
                    stepId: step.id,
                    chargeErr,
                })
            );
        }

        return { error: error.message, step: step.id };
    }
}

/**
 * Resolve the AIStudioActionType for a playbook step.
 */
function resolvePlaybookActionType(step: PlaybookStep): string {
    if (step.type === 'synthesize') return 'research';
    if (step.type === 'delegate') return 'research';
    if (step.type === 'tool_call' && step.tool) {
        return resolvePlaybookToolActionType(step.tool);
    }
    return 'chat';
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
        playbookRunId: `run_${playbook.id}_${Date.now()}`,
        orgId: playbook.orgId,
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
        const db = getAdminFirestore();
        const playbookDoc = await db
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

        await db
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
            const db = getAdminFirestore();
            await db.collection('playbook_executions').add({
                playbookId,
                startedAt: new Date(startTime),
                completedAt: new Date(),
                duration: Date.now() - startTime,
                success: false,
                error: error.message,
            });
        } catch (recordError) {
            logger.error('[PlaybookRunner] Failed to store error record', { error: recordError });
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
