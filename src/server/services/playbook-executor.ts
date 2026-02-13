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

// Media Generation - Cost Tracking
import {
    trackMediaGeneration,
    calculateVideoCost,
    calculateImageCost,
} from '@/server/services/media-tracking';
import { generateVeoVideo } from '@/ai/generators/veo';
import { generateSoraVideo } from '@/ai/generators/sora';
import { generateImageFromPrompt } from '@/ai/flows/generate-social-image';

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
// MEDIA GENERATION STEP EXECUTORS
// =============================================================================

/**
 * Fetch deals from POS or dynamic pricing rules
 * Action: fetch_deals
 */
export async function executeFetchDeals(
    step: any,
    context: ExecutionContext
): Promise<any> {
    const source = step.params?.source || 'firestore';
    const { firestore } = await createServerClient();

    logger.info('[PlaybookExecutor] Fetching deals:', { source, orgId: context.orgId });

    try {
        // Fetch from dynamic_pricing collection (active rules)
        const rulesSnap = await firestore
            .collection('tenants')
            .doc(context.orgId)
            .collection('dynamic_pricing')
            .where('status', '==', 'active')
            .get();

        const deals = rulesSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));

        // Store in context for subsequent steps
        context.variables.deals = deals;
        context.previousResults.deals = deals;

        logger.info('[PlaybookExecutor] Fetched deals:', { count: deals.length });

        return {
            success: true,
            deals,
            count: deals.length,
        };
    } catch (error) {
        logger.error('[PlaybookExecutor] Failed to fetch deals:', { error });
        return {
            success: false,
            deals: [],
            count: 0,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Generate a video using Veo or Sora with cost tracking
 * Action: generate_video
 */
export async function executeGenerateVideo(
    step: any,
    context: ExecutionContext
): Promise<any> {
    const provider = step.params?.provider || 'veo';
    const aspectRatio = step.params?.aspectRatio || '9:16';
    const duration = step.params?.duration || '5';
    const style = step.params?.style || 'professional';
    const template = step.params?.template || 'general';

    // Build prompt from deals or custom prompt
    let prompt = step.params?.prompt;
    if (!prompt && context.variables.deals) {
        prompt = buildDealsVideoPrompt(context.variables.deals, style, template);
    }
    if (!prompt) {
        prompt = 'Create a professional promotional video';
    }

    // Resolve any variables in prompt
    prompt = resolveVariables(prompt, context.variables);

    logger.info('[PlaybookExecutor] Generating video:', {
        provider,
        aspectRatio,
        duration,
        promptLength: prompt.length,
    });

    const startTime = Date.now();
    let videoUrl: string;
    let actualDuration: number;

    try {
        if (provider === 'sora') {
            const result = await generateSoraVideo({
                prompt,
                aspectRatio: aspectRatio as '16:9' | '9:16' | '1:1',
                duration: duration as '5' | '10',
            });
            videoUrl = result.videoUrl;
            actualDuration = result.duration;
        } else {
            const result = await generateVeoVideo({
                prompt,
                aspectRatio: aspectRatio as '16:9' | '9:16' | '1:1',
                duration: duration as '5' | '10',
            });
            videoUrl = result.videoUrl;
            actualDuration = result.duration;
        }

        // Track the generation
        const costUsd = calculateVideoCost(provider as 'veo' | 'sora', actualDuration);
        await trackMediaGeneration({
            tenantId: context.orgId,
            userId: context.userId,
            type: 'video',
            provider: provider as 'veo' | 'sora',
            model: provider === 'sora' ? 'sora-2' : 'veo-3.1-generate-preview',
            prompt,
            durationSeconds: actualDuration,
            aspectRatio,
            costUsd,
            success: true,
            metadata: {
                generationTimeMs: Date.now() - startTime,
                template,
                style,
            },
        });

        // Store in context
        context.variables.videoUrl = videoUrl;
        context.variables.videoDuration = actualDuration;
        context.previousResults.video = { videoUrl, duration: actualDuration };

        logger.info('[PlaybookExecutor] Video generated:', {
            videoUrl,
            duration: actualDuration,
            costUsd,
        });

        return {
            success: true,
            videoUrl,
            duration: actualDuration,
            costUsd,
        };
    } catch (error) {
        logger.error('[PlaybookExecutor] Video generation failed:', { error });

        // Track failed generation
        const durationNum = parseInt(duration, 10) || 5;
        await trackMediaGeneration({
            tenantId: context.orgId,
            userId: context.userId,
            type: 'video',
            provider: provider as 'veo' | 'sora',
            model: provider === 'sora' ? 'sora-2' : 'veo-3.1-generate-preview',
            prompt,
            durationSeconds: durationNum,
            costUsd: 0,
            success: false,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
        });

        throw error;
    }
}

/**
 * Generate a caption for social media content
 * Action: generate_caption
 */
export async function executeGenerateCaption(
    step: any,
    context: ExecutionContext
): Promise<any> {
    const platform = step.params?.platform || 'instagram';
    const includeHashtags = step.params?.includeHashtags !== false;
    const includeCTA = step.params?.includeCTA !== false;
    const brandVoice = step.params?.brandVoice || context.variables.brandVoice || 'professional';

    // Build caption based on deals
    const deals = context.variables.deals || [];
    let caption = '';

    if (deals.length > 0) {
        // Simple caption generation (in production, use Craig agent)
        const dealLines = deals.slice(0, 3).map((deal: any) => {
            if (deal.discountType === 'percentage') {
                return `${deal.discountValue}% off ${deal.name || 'select items'}`;
            } else if (deal.discountType === 'fixed') {
                return `$${deal.discountValue} off ${deal.name || 'select items'}`;
            }
            return deal.name || 'Special deal';
        });

        caption = `🔥 This week's deals are here!\n\n${dealLines.join('\n')}\n\n`;
    } else {
        caption = '🌿 Check out our latest offerings!\n\n';
    }

    if (includeCTA) {
        caption += 'Shop now at the link in bio! 🛒\n\n';
    }

    if (includeHashtags) {
        const hashtags = ['#cannabis', '#deals', '#dispensary', '#420', '#weed'];
        caption += hashtags.join(' ');
    }

    // Store in context
    context.variables.caption = caption;
    context.previousResults.caption = caption;

    logger.info('[PlaybookExecutor] Caption generated:', {
        platform,
        captionLength: caption.length,
    });

    return {
        success: true,
        caption,
        platform,
    };
}

/**
 * Generate an image using Nano Banana with cost tracking
 * Action: generate_image
 */
export async function executeGenerateImage(
    step: any,
    context: ExecutionContext
): Promise<any> {
    const tier = step.params?.tier || 'free';
    const style = step.params?.style || 'professional';
    let prompt = step.params?.prompt;

    // Build prompt from deals if not provided
    if (!prompt && context.variables.deals) {
        const deals = context.variables.deals.slice(0, 3);
        const dealText = deals.map((d: any) => d.name || 'Special deal').join(', ');
        prompt = `Professional cannabis dispensary promotional image featuring: ${dealText}. Style: ${style}. High quality, modern design.`;
    }
    if (!prompt) {
        prompt = `Professional cannabis dispensary promotional image. Style: ${style}. High quality, modern design.`;
    }

    // Resolve variables
    prompt = resolveVariables(prompt, context.variables);

    logger.info('[PlaybookExecutor] Generating image:', {
        tier,
        style,
        promptLength: prompt.length,
    });

    const startTime = Date.now();
    const provider = tier === 'free' ? 'gemini-flash' : 'gemini-pro';

    try {
        const imageUrl = await generateImageFromPrompt(prompt, {
            tier: tier as 'free' | 'paid' | 'super',
        });

        // Track the generation
        const costUsd = calculateImageCost(provider);
        await trackMediaGeneration({
            tenantId: context.orgId,
            userId: context.userId,
            type: 'image',
            provider,
            model: provider === 'gemini-flash' ? 'gemini-2.5-flash-image' : 'gemini-3-pro-image-preview',
            prompt,
            costUsd,
            success: true,
            metadata: {
                generationTimeMs: Date.now() - startTime,
                tier,
                style,
            },
        });

        // Store in context
        context.variables.imageUrl = imageUrl;
        context.previousResults.image = { imageUrl };

        logger.info('[PlaybookExecutor] Image generated:', { imageUrl, costUsd });

        return {
            success: true,
            imageUrl,
            costUsd,
        };
    } catch (error) {
        logger.error('[PlaybookExecutor] Image generation failed:', { error });

        // Track failed generation
        await trackMediaGeneration({
            tenantId: context.orgId,
            userId: context.userId,
            type: 'image',
            provider,
            model: provider === 'gemini-flash' ? 'gemini-2.5-flash-image' : 'gemini-3-pro-image-preview',
            prompt,
            costUsd: 0,
            success: false,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
        });

        throw error;
    }
}

/**
 * Submit content to approval queue
 * Action: submit_approval
 */
export async function executeSubmitApproval(
    step: any,
    context: ExecutionContext
): Promise<any> {
    const platform = step.params?.platform || 'instagram';
    const { firestore } = await createServerClient();

    const videoUrl = context.variables.videoUrl;
    const imageUrl = context.variables.imageUrl;
    const caption = context.variables.caption || '';

    if (!videoUrl && !imageUrl) {
        throw new Error('No media URL found in context. Generate video or image first.');
    }

    const mediaType = videoUrl ? 'video' : 'image';
    const mediaUrls = videoUrl ? [videoUrl] : [imageUrl];

    logger.info('[PlaybookExecutor] Submitting to approval:', {
        platform,
        mediaType,
    });

    // Create creative content in pending status
    const contentRef = await firestore.collection('tenants').doc(context.orgId).collection('creative_content').add({
        tenantId: context.orgId,
        brandId: context.orgId,
        platform,
        status: 'pending',
        complianceStatus: 'active',
        caption,
        mediaUrls,
        mediaType,
        generatedBy: 'nano-banana-pro',
        createdBy: 'playbook',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        approvalState: {
            currentLevel: 1,
            approvals: [],
            status: 'pending_approval',
            nextRequiredRoles: ['marketing_manager', 'admin'],
        },
    });

    // Store in context
    context.variables.contentId = contentRef.id;
    context.previousResults.approval = { contentId: contentRef.id };

    logger.info('[PlaybookExecutor] Content submitted for approval:', {
        contentId: contentRef.id,
    });

    return {
        success: true,
        contentId: contentRef.id,
        status: 'pending',
    };
}

/**
 * Build a video prompt from deals data
 */
function buildDealsVideoPrompt(deals: any[], style: string, template: string): string {
    if (!deals || deals.length === 0) {
        return `Create a ${style} promotional video for a cannabis dispensary. Feature modern design and vibrant energy.`;
    }

    const dealDescriptions = deals.slice(0, 3).map((deal: any) => {
        if (deal.discountType === 'percentage') {
            return `${deal.discountValue}% off ${deal.name || 'select items'}`;
        } else if (deal.discountType === 'fixed') {
            return `$${deal.discountValue} off ${deal.name || 'select items'}`;
        }
        return deal.name || 'Special promotion';
    });

    const templatePrompts: Record<string, string> = {
        'deals-showcase': `Create an energetic promotional video showcasing this week's cannabis deals: ${dealDescriptions.join(', ')}. Use dynamic transitions, vibrant colors, and modern motion graphics. Style: ${style}. Include text overlays for each deal. Professional dispensary marketing video.`,
        'flash-sale': `Create an urgent, exciting flash sale video for cannabis products. Feature these deals: ${dealDescriptions.join(', ')}. Use fast cuts, countdown elements, and bold text. Style: ${style}. High energy, modern design.`,
        'weekly-update': `Create a friendly weekly update video for a cannabis dispensary. Highlight these current offers: ${dealDescriptions.join(', ')}. Use smooth transitions and warm, inviting visuals. Style: ${style}.`,
        'general': `Create a ${style} promotional video featuring these cannabis deals: ${dealDescriptions.join(', ')}. Modern design, professional quality, suitable for social media.`,
    };

    return templatePrompts[template] || templatePrompts['general'];
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
                    // Media Generation Actions
                    case 'fetch_deals':
                        output = await executeFetchDeals(step, context);
                        break;
                    case 'generate_video':
                        output = await executeGenerateVideo(step, context);
                        break;
                    case 'generate_caption':
                        output = await executeGenerateCaption(step, context);
                        break;
                    case 'generate_image':
                        output = await executeGenerateImage(step, context);
                        break;
                    case 'submit_approval':
                        output = await executeSubmitApproval(step, context);
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
