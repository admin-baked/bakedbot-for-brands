'use server';

// src/server/services/playbook-executor.ts
/**
 * Playbook Executor
 * Runs playbook workflows by delegating to appropriate agents
 * 
 * Integrates with .claude/hooks/validators for self-validating agent pattern.
 */

import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/logger';
import { FieldValue } from 'firebase-admin/firestore';

// Validation Pipeline - Self-Validating Agent Pattern
import { createValidationPipeline } from '@/server/validators/validation-pipeline';
import type { ValidationResult } from '@/server/validators/base-validator';

// Types
export interface PlaybookExecutionRequest {
    playbookId: string;
    orgId: string;
    userId: string;
    triggeredBy: 'manual' | 'schedule' | 'event';
    eventData?: Record<string, any>;
}

export interface PlaybookExecutionResult {
    executionId: string;
    status: 'running' | 'completed' | 'failed' | 'cancelled';
    startedAt: Date;
    completedAt?: Date;
    stepResults: StepResult[];
    error?: string;
}

export interface StepResult {
    stepIndex: number;
    action: string;
    agent?: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
    startedAt?: Date;
    completedAt?: Date;
    output?: any;
    error?: string;
    // Validation tracking
    validation?: {
        valid: boolean;
        score: number;
        issues: string[];
        remediation?: string;
        validatorsRun?: string[];
    };
    retryCount?: number;
}

// Agent Handler Types
type AgentHandler = (task: string, input: any, context: ExecutionContext) => Promise<any>;

interface ExecutionContext {
    orgId: string;
    userId: string;
    variables: Record<string, any>;
    previousResults: Record<string, any>;
}

// =============================================================================
// AGENT HANDLERS - These call the actual agent implementations
// =============================================================================

const AGENT_HANDLERS: Record<string, AgentHandler> = {
    smokey: async (task, input, ctx) => {
        logger.info('[PlaybookExecutor] Smokey executing:', { task });
        // In production, this would call the Smokey agent
        return {
            success: true,
            summary: `Smokey analyzed: ${task}`,
            insights: ['Customer sentiment is positive', 'Top request: edibles'],
        };
    },

    ezal: async (task, input, ctx) => {
        logger.info('[PlaybookExecutor] Ezal executing:', { task });
        // In production, this would call the Ezal competitive intel agent
        return {
            success: true,
            summary: `Ezal scanned competitors: ${task}`,
            competitor_intel: {
                price_changes: [],
                stockouts: [],
            },
        };
    },

    craig: async (task, input, ctx) => {
        logger.info('[PlaybookExecutor] Craig executing:', { task });
        // In production, this would call the Craig content agent
        return {
            success: true,
            summary: `Craig generated content: ${task}`,
            content: {
                type: 'marketing',
                draft: 'Sample marketing content...',
            },
        };
    },

    pops: async (task, input, ctx) => {
        logger.info('[PlaybookExecutor] Pops executing:', { task });
        // In production, this would call the Pops analytics agent
        return {
            success: true,
            summary: `Pops analyzed data: ${task}`,
            analytics: {
                metrics: {},
                trends: {},
            },
        };
    },

    money_mike: async (task, input, ctx) => {
        logger.info('[PlaybookExecutor] Money Mike executing:', { task });
        // In production, this would call the Money Mike finance agent
        return {
            success: true,
            summary: `Money Mike optimized: ${task}`,
            recommendations: [],
        };
    },

    deebo: async (task, input, ctx) => {
        logger.info('[PlaybookExecutor] Deebo executing:', { task });
        // In production, this would call the Deebo compliance agent
        return {
            success: true,
            summary: `Deebo reviewed: ${task}`,
            compliance_status: 'approved',
            issues: [],
        };
    },
};

// =============================================================================
// STEP EXECUTORS - Handle different playbook action types
// =============================================================================

async function executeDelegate(
    step: any,
    context: ExecutionContext
): Promise<any> {
    const agent = step.params?.agent || step.agent;
    const task = step.params?.task || step.task || 'Execute task';
    const input = step.params?.input || step.input || {};

    // Resolve variables in input
    const resolvedInput = resolveVariables(input, context.variables);

    const handler = AGENT_HANDLERS[agent];
    if (!handler) {
        throw new Error(`Unknown agent: ${agent}`);
    }

    const result = await handler(task, resolvedInput, context);

    // Store result for future steps
    context.previousResults[agent] = result;
    context.variables[agent] = result;

    return result;
}

async function executeParallel(
    step: any,
    context: ExecutionContext
): Promise<any> {
    const tasks = step.tasks || step.params?.tasks || [];

    if (tasks.length === 0) {
        // If no explicit tasks, run all agents in params
        const agents = step.params?.agents || [];
        const results = await Promise.all(
            agents.map(async (agent: string) => {
                const handler = AGENT_HANDLERS[agent];
                if (handler) {
                    return { agent, result: await handler('Parallel task', {}, context) };
                }
                return { agent, result: null };
            })
        );

        results.forEach(({ agent, result }) => {
            context.previousResults[agent] = result;
            context.variables[agent] = result;
        });

        return results;
    }

    // Execute explicit tasks in parallel
    const results = await Promise.all(
        tasks.map(async (task: any) => {
            const agent = task.agent;
            const handler = AGENT_HANDLERS[agent];
            if (handler) {
                return { agent, result: await handler(task.task, {}, context) };
            }
            return { agent, result: null };
        })
    );

    results.forEach(({ agent, result }) => {
        context.previousResults[agent] = result;
        context.variables[agent] = result;
    });

    return results;
}

async function executeNotify(
    step: any,
    context: ExecutionContext
): Promise<any> {
    const channels = step.channels || step.params?.channels || ['dashboard'];
    const to = resolveVariables(step.to, context.variables);
    const subject = resolveVariables(step.subject, context.variables);
    const body = resolveVariables(step.body, context.variables);

    logger.info('[PlaybookExecutor] Sending notification:', {
        channels,
        to,
        subject,
    });

    // In production, this would actually send notifications
    // For now, just log and save to Firestore
    const { firestore } = await createServerClient();
    await firestore.collection('notifications').add({
        channels,
        to,
        subject,
        body,
        orgId: context.orgId,
        sentAt: new Date(),
        source: 'playbook',
    });

    return {
        success: true,
        channels,
        sentTo: to,
    };
}

async function executeQuery(
    step: any,
    context: ExecutionContext
): Promise<any> {
    const agent = step.agent || step.params?.agent || 'pops';
    const task = step.task || step.params?.task || 'Query data';

    const handler = AGENT_HANDLERS[agent];
    if (!handler) {
        throw new Error(`Unknown agent for query: ${agent}`);
    }

    const result = await handler(task, {}, context);
    context.previousResults[agent] = result;
    context.variables[agent] = result;

    return result;
}

async function executeGenerate(
    step: any,
    context: ExecutionContext
): Promise<any> {
    const outputType = step.output_type || step.params?.type || 'text';
    const agent = step.agent || step.params?.agent || 'craig';

    const handler = AGENT_HANDLERS[agent];
    if (!handler) {
        throw new Error(`Unknown agent for generate: ${agent}`);
    }

    const result = await handler(`Generate ${outputType}`, {}, context);

    return {
        type: outputType,
        ...result,
    };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Resolve {{variable}} placeholders in strings or objects
 */
function resolveVariables(input: any, variables: Record<string, any>): any {
    if (typeof input === 'string') {
        return input.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
            const value = getNestedValue(variables, path.trim());
            return value !== undefined ? String(value) : match;
        });
    }

    if (Array.isArray(input)) {
        return input.map(item => resolveVariables(item, variables));
    }

    if (typeof input === 'object' && input !== null) {
        const resolved: Record<string, any> = {};
        for (const [key, value] of Object.entries(input)) {
            resolved[key] = resolveVariables(value, variables);
        }
        return resolved;
    }

    return input;
}

function getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
}

// =============================================================================
// VALIDATION - Self-Validating Agent Pattern
// =============================================================================

interface ValidationInfo {
    valid: boolean;
    score: number;
    issues: string[];
    remediation?: string;
    validatorsRun?: string[];
}

/**
 * Run validation pipeline for a step if it has an agent specified.
 * Returns validation result that can be used for retry logic.
 */
async function runStepValidation(
    step: any,
    output: any,
    context: ExecutionContext
): Promise<ValidationInfo | null> {
    const agent = step.agent || step.params?.agent;
    
    // No agent means no validation
    if (!agent) {
        return null;
    }
    
    try {
        const pipeline = createValidationPipeline(agent);
        const action = step.action || 'delegate';
        const params = step.params || {};
        
        const result = await pipeline.validate(action, params, output);
        
        logger.info('[PlaybookExecutor] Validation result:', {
            agent,
            action,
            valid: result.valid,
            score: result.score,
            issues: result.issues,
        });
        
        return {
            valid: result.valid,
            score: result.score,
            issues: result.issues,
            remediation: result.remediation,
            validatorsRun: result.metadata?.validatorsRun as string[] | undefined,
        };
    } catch (error) {
        logger.warn('[PlaybookExecutor] Validation error:', {
            agent,
            error: error instanceof Error ? error.message : String(error),
        });
        // Validation errors don't fail the step, just log
        return null;
    }
}

/**
 * Execute a step with validation and optional retry
 */
async function executeStepWithValidation(
    step: any,
    context: ExecutionContext,
    stepExecutor: () => Promise<any>,
    maxRetries: number = 3
): Promise<{ output: any; validation: ValidationInfo | null; retryCount: number }> {
    let output: any;
    let validation: ValidationInfo | null = null;
    let retryCount = 0;
    
    const shouldRetry = step.retryOnFailure === true;
    const threshold = step.validationThreshold ?? 60;
    
    while (retryCount <= maxRetries) {
        // Execute the step
        output = await stepExecutor();
        
        // Run validation
        validation = await runStepValidation(step, output, context);
        
        // If no validation or passed, we're done
        if (!validation || validation.valid || validation.score >= threshold) {
            break;
        }
        
        // If validation failed and retry is enabled
        if (shouldRetry && retryCount < maxRetries) {
            logger.info('[PlaybookExecutor] Retrying step due to validation failure:', {
                retryCount: retryCount + 1,
                score: validation.score,
                threshold,
                remediation: validation.remediation,
            });
            
            // Add remediation context for next attempt
            context.variables._remediation = validation.remediation;
            context.variables._previousIssues = validation.issues;
            retryCount++;
        } else {
            // No retry, exit loop
            break;
        }
    }
    
    return { output, validation, retryCount };
}

// =============================================================================
// MAIN EXECUTOR
// =============================================================================

/**
 * Execute a playbook
 */
export async function executePlaybook(
    request: PlaybookExecutionRequest
): Promise<PlaybookExecutionResult> {
    const { firestore } = await createServerClient();
    const startedAt = new Date();

    // Create execution record
    const executionRef = await firestore.collection('playbook_executions').add({
        playbookId: request.playbookId,
        orgId: request.orgId,
        userId: request.userId,
        triggeredBy: request.triggeredBy,
        status: 'running',
        startedAt,
        stepResults: [],
    });

    const executionId = executionRef.id;

    logger.info('[PlaybookExecutor] Starting execution:', {
        executionId,
        playbookId: request.playbookId,
    });

    try {
        // Load playbook
        const playbookRef = firestore.collection('playbooks').doc(request.playbookId);
        const playbookSnap = await playbookRef.get();

        if (!playbookSnap.exists) {
            throw new Error(`Playbook not found: ${request.playbookId}`);
        }

        const playbook = playbookSnap.data()!;
        const steps = playbook.steps || [];

        // Initialize context
        const context: ExecutionContext = {
            orgId: request.orgId,
            userId: request.userId,
            variables: {
                user: { id: request.userId },
                trigger: { type: request.triggeredBy, data: request.eventData },
                ...request.eventData,
            },
            previousResults: {},
        };

        const stepResults: StepResult[] = [];

        // Execute each step
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            const stepResult: StepResult = {
                stepIndex: i,
                action: step.action,
                agent: step.agent || step.params?.agent,
                status: 'running',
                startedAt: new Date(),
            };

            try {
                // Check condition if present
                if (step.condition) {
                    const conditionMet = evaluateCondition(step.condition, context.variables);
                    if (!conditionMet) {
                        stepResult.status = 'skipped';
                        stepResult.completedAt = new Date();
                        stepResults.push(stepResult);
                        continue;
                    }
                }

                // Execute based on action type
                let output: any;
                switch (step.action) {
                    case 'delegate':
                        output = await executeDelegate(step, context);
                        break;
                    case 'parallel':
                        output = await executeParallel(step, context);
                        break;
                    case 'notify':
                        output = await executeNotify(step, context);
                        break;
                    case 'query':
                        output = await executeQuery(step, context);
                        break;
                    case 'generate':
                        output = await executeGenerate(step, context);
                        break;
                    case 'analyze':
                        output = await executeDelegate(step, context); // Alias for delegate
                        break;
                    case 'forecast':
                        output = await executeDelegate(step, context); // Alias for delegate
                        break;
                    case 'review':
                        output = await executeDelegate(step, context); // Alias for delegate
                        break;
                    default:
                        logger.warn('[PlaybookExecutor] Unknown action:', step.action);
                        output = { warning: `Unknown action: ${step.action}` };
                }

                // Run validation if step has an agent
                const validation = await runStepValidation(step, output, context);
                if (validation) {
                    stepResult.validation = validation;
                    
                    // If validation failed and retry is enabled, handle retry
                    if (!validation.valid && step.retryOnFailure) {
                        const maxRetries = step.maxRetries ?? 3;
                        const threshold = step.validationThreshold ?? 60;
                        let retryCount = 0;
                        
                        while (!stepResult.validation?.valid && 
                               (stepResult.validation?.score ?? 0) < threshold && 
                               retryCount < maxRetries) {
                            retryCount++;
                            logger.info('[PlaybookExecutor] Retrying step:', {
                                stepIndex: i,
                                retryCount,
                                score: stepResult.validation?.score,
                            });
                            
                            // Add remediation context
                            context.variables._remediation = validation.remediation;
                            
                            // Re-execute the step (simplified - uses same action)
                            switch (step.action) {
                                case 'delegate':
                                case 'analyze':
                                case 'forecast':
                                case 'review':
                                    output = await executeDelegate(step, context);
                                    break;
                                case 'query':
                                    output = await executeQuery(step, context);
                                    break;
                                case 'generate':
                                    output = await executeGenerate(step, context);
                                    break;
                                default:
                                    break;
                            }
                            
                            // Re-validate
                            const newValidation = await runStepValidation(step, output, context);
                            if (newValidation) {
                                stepResult.validation = newValidation;
                            }
                        }
                        
                        stepResult.retryCount = retryCount;
                    }
                }

                stepResult.status = 'completed';
                stepResult.output = output;
                stepResult.completedAt = new Date();

            } catch (error) {
                stepResult.status = 'failed';
                stepResult.error = error instanceof Error ? error.message : String(error);
                stepResult.completedAt = new Date();
                logger.error('[PlaybookExecutor] Step failed:', {
                    stepIndex: i,
                    error: stepResult.error,
                });
            }

            stepResults.push(stepResult);

            // Update execution record
            await executionRef.update({
                stepResults,
                lastUpdated: new Date(),
            });
        }

        // Mark as completed
        const completedAt = new Date();
        await executionRef.update({
            status: 'completed',
            completedAt,
            stepResults,
        });

        // Update playbook stats
        await playbookRef.update({
            runCount: FieldValue.increment(1),
            successCount: FieldValue.increment(1),
            lastRunAt: completedAt,
        });

        logger.info('[PlaybookExecutor] Execution completed:', {
            executionId,
            duration: completedAt.getTime() - startedAt.getTime(),
        });

        return {
            executionId,
            status: 'completed',
            startedAt,
            completedAt,
            stepResults,
        };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('[PlaybookExecutor] Execution failed:', { executionId, error: errorMessage });

        // Update execution record as failed
        await executionRef.update({
            status: 'failed',
            error: errorMessage,
            completedAt: new Date(),
        });

        // Update playbook failure count
        try {
            const playbookRef = firestore.collection('playbooks').doc(request.playbookId);
            await playbookRef.update({
                runCount: FieldValue.increment(1),
                failureCount: FieldValue.increment(1),
                lastRunAt: new Date(),
            });
        } catch (e) {
            // Ignore update errors
        }

        return {
            executionId,
            status: 'failed',
            startedAt,
            completedAt: new Date(),
            stepResults: [],
            error: errorMessage,
        };
    }
}

/**
 * Simple condition evaluator
 */
function evaluateCondition(condition: string, variables: Record<string, any>): boolean {
    // Very basic condition evaluation
    // In production, use a proper expression parser
    try {
        const resolved = resolveVariables(condition, variables);
        // Check for common truthy patterns
        if (resolved.includes('.length > 0')) {
            const arrayPath = resolved.match(/\{\{([^}]+)\.length/)?.[1];
            if (arrayPath) {
                const arr = getNestedValue(variables, arrayPath);
                return Array.isArray(arr) && arr.length > 0;
            }
        }
        return Boolean(resolved && resolved !== 'false' && resolved !== '0');
    } catch {
        return false;
    }
}

/**
 * Get execution status
 */
export async function getPlaybookExecution(
    executionId: string
): Promise<PlaybookExecutionResult | null> {
    const { firestore } = await createServerClient();

    const snap = await firestore.collection('playbook_executions').doc(executionId).get();
    if (!snap.exists) {
        return null;
    }

    const data = snap.data()!;
    return {
        executionId,
        status: data.status,
        startedAt: data.startedAt?.toDate(),
        completedAt: data.completedAt?.toDate(),
        stepResults: data.stepResults || [],
        error: data.error,
    };
}
