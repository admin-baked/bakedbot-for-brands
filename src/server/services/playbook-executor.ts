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

// =============================================================================
// COMPETITIVE INTELLIGENCE STEP EXECUTORS
// =============================================================================

/**
 * Scan competitor websites for pricing and product data
 * Action: scan_competitors
 */
export async function executeScanCompetitors(
    step: any,
    context: ExecutionContext
): Promise<any> {
    const competitors = step.params?.competitors || [];
    const { firestore } = await createServerClient();

    logger.info('[PlaybookExecutor] Scanning competitors:', { count: competitors.length });

    if (competitors.length === 0) {
        throw new Error('No competitors specified in step params');
    }

    try {
        // Import Ezal Lite service
        const { runLiteSnapshot, addEzalCompetitor } = await import('@/server/services/ezal-lite-connector');

        const results = [];

        for (const competitor of competitors) {
            const { name, url, state, city } = competitor;

            logger.info('[PlaybookExecutor] Scanning competitor:', { name, url });

            try {
                // Ensure competitor exists in database
                await addEzalCompetitor(name, url, state, city, context.userId);

                // Run snapshot
                const snapshot = await runLiteSnapshot(
                    url.replace(/https?:\/\//, '').replace(/[^a-z0-9]/gi, '_').toLowerCase().slice(0, 50),
                    name,
                    url,
                    false // Don't force refresh (use cache if fresh)
                );

                results.push({
                    name,
                    url,
                    status: snapshot.status,
                    priceRange: snapshot.priceRange,
                    promoCount: snapshot.promoCount,
                    promoSignals: snapshot.promoSignals,
                    categorySignals: snapshot.categorySignals,
                    discoveredAt: snapshot.discoveredAt,
                    freshness: snapshot.freshness,
                    errorMessage: snapshot.errorMessage,
                });
            } catch (error) {
                logger.error('[PlaybookExecutor] Competitor scan failed:', { name, error });
                results.push({
                    name,
                    url,
                    status: 'failed',
                    errorMessage: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }

        // Store in context for next steps
        context.variables.competitorData = results;
        context.previousResults.competitors = results;

        logger.info('[PlaybookExecutor] Competitor scan complete:', {
            total: competitors.length,
            successful: results.filter(r => r.status === 'success').length,
            failed: results.filter(r => r.status === 'failed').length,
        });

        return {
            success: true,
            competitors: results,
            scannedAt: new Date().toISOString(),
        };
    } catch (error) {
        logger.error('[PlaybookExecutor] Failed to scan competitors:', { error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Generate competitor intelligence report using Claude
 * Action: generate_competitor_report
 */
export async function executeGenerateCompetitorReport(
    step: any,
    context: ExecutionContext
): Promise<any> {
    const competitorData = context.variables.competitorData || [];
    const format = step.params?.format || 'markdown';
    const dispensaryName = step.params?.dispensaryName || 'Our Dispensary';

    logger.info('[PlaybookExecutor] Generating competitor report:', { format, dataCount: competitorData.length });

    if (competitorData.length === 0) {
        throw new Error('No competitor data available. Run scan_competitors first.');
    }

    try {
        // Import Claude service
        const Anthropic = await import('@anthropic-ai/sdk');
        const client = new Anthropic.default({
            apiKey: process.env.ANTHROPIC_API_KEY,
        });

        const reportPrompt = `You are a competitive intelligence analyst for ${dispensaryName}, a cannabis dispensary.

Generate a comprehensive daily competitive intelligence report based on the following competitor data:

${JSON.stringify(competitorData, null, 2)}

The report should include:

## Executive Summary
- 2-3 sentence overview of key insights and competitive threats
- Price positioning assessment

## Competitor Analysis
For each competitor, provide:
- **Name & URL**
- **Price Range**: Min, median, max
- **Promotional Activity**: Number of active promotions and signals (e.g., "20% off", "BOGO")
- **Product Categories**: Categories detected on their menu
- **Competitive Threat Level**: Low / Medium / High
- **Key Insights**: 2-3 bullet points

## Market Insights
- **Average Market Prices**: Calculate average min/median/max across all competitors
- **Promotional Trends**: Common promotion types and patterns
- **Product Mix**: Categories competitors are focusing on
- **Pricing Opportunities**: Where we can be more competitive

## Recommendations
- **Immediate Actions**: 2-3 tactical pricing or promotion recommendations
- **Strategic Considerations**: Longer-term competitive positioning
- **Product Gaps**: Categories or price points we should consider

Format: ${format === 'html' ? 'HTML with proper headings and styling' : 'Clean markdown with proper headers'}

Keep it professional, data-driven, and actionable.`;

        const response = await client.messages.create({
            model: 'claude-sonnet-4-20250514', // Use Sonnet for cost efficiency
            max_tokens: 4096,
            temperature: 0.3, // Low temperature for consistent, factual output
            messages: [
                {
                    role: 'user',
                    content: reportPrompt,
                },
            ],
        });

        const report = response.content[0].type === 'text' ? response.content[0].text : '';

        // Store in context
        context.variables.competitorReport = report;
        context.previousResults.report = report;

        // NEW: Analyze competitive intelligence and trigger automated actions
        try {
            const { analyzeCompetitiveIntelligence } = await import('@/server/services/competitive-actions');

            const triggers = competitorData.map((c: any) => ({
                competitorId: c.url?.replace(/https?:\/\//, '').replace(/[^a-z0-9]/gi, '_').toLowerCase().slice(0, 50) || 'unknown',
                competitorName: c.name,
                snapshot: {
                    id: c.url || 'unknown',
                    competitorId: c.url || 'unknown',
                    competitorName: c.name,
                    url: c.url || '',
                    discoveredAt: new Date(),
                    expiresAt: new Date(),
                    priceRange: c.priceRange || { min: 0, max: 0, median: 0, count: 0 },
                    promoCount: c.promoCount || 0,
                    promoSignals: c.promoSignals || [],
                    categorySignals: c.categorySignals || [],
                    costCents: 0,
                    proxyType: 'none' as const,
                    freshness: 'fresh' as const,
                    status: c.status || 'success' as const,
                    contentHash: '',
                },
                ourPricing: context.variables.ourPricing, // Optional: pass our pricing if available
            }));

            const actions = await analyzeCompetitiveIntelligence(context.orgId, triggers);

            context.variables.competitiveActions = actions;
            context.previousResults.competitiveActions = actions;

            logger.info('[PlaybookExecutor] Competitive actions triggered:', {
                total: actions.length,
                critical: actions.filter(a => a.priority === 'critical').length,
                high: actions.filter(a => a.priority === 'high').length,
            });
        } catch (error) {
            logger.warn('[PlaybookExecutor] Failed to analyze competitive actions:', { error });
            // Don't fail the whole step if action analysis fails
        }

        logger.info('[PlaybookExecutor] Report generated:', { length: report.length });

        return {
            success: true,
            report,
            format,
            generatedAt: new Date().toISOString(),
        };
    } catch (error) {
        logger.error('[PlaybookExecutor] Failed to generate report:', { error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Save report to BakedBot Drive
 * Action: save_to_drive
 */
export async function executeSaveToDrive(
    step: any,
    context: ExecutionContext
): Promise<any> {
    const report = context.variables.competitorReport;
    const category = step.params?.category || 'documents';
    const filename = step.params?.filename || `competitive-intelligence-${new Date().toISOString().split('T')[0]}.md`;

    logger.info('[PlaybookExecutor] Saving report to Drive:', { filename, category });

    if (!report) {
        throw new Error('No report available. Run generate_competitor_report first.');
    }

    try {
        // Import Drive service
        const { getDriveStorageService } = await import('@/server/services/drive-storage');
        const { initializeSystemFolders } = await import('@/server/actions/drive');
        const { firestore } = await createServerClient();

        // Initialize system folders if needed
        const foldersResult = await initializeSystemFolders();
        if (!foldersResult.success) {
            throw new Error('Failed to initialize Drive folders');
        }

        // Find the documents folder
        const documentsFolder = foldersResult.data?.find(f => f.category === category);
        if (!documentsFolder) {
            throw new Error(`Folder not found: ${category}`);
        }

        // Create a buffer from the report string
        const buffer = Buffer.from(report, 'utf-8');
        const size = buffer.length;

        // Upload to Firebase Storage
        const storage = getDriveStorageService();
        const uploadResult = await storage.uploadFile({
            userId: context.userId,
            userEmail: '', // Will be populated by the system
            file: {
                buffer,
                originalName: filename,
                mimeType: 'text/markdown',
                size,
            },
            category,
            folderId: documentsFolder.id,
            description: `Competitive intelligence report generated ${new Date().toLocaleDateString()}`,
            tags: ['competitive-intel', 'automated', 'ezal'],
        });

        if (!uploadResult.success) {
            throw new Error(uploadResult.error || 'Upload failed');
        }

        // Create file document in Firestore
        const fileDoc = {
            name: filename,
            path: uploadResult.storagePath!,
            downloadUrl: uploadResult.downloadUrl,
            size,
            mimeType: 'text/markdown',
            folderId: documentsFolder.id,
            ownerId: context.userId,
            ownerEmail: '',
            category,
            isShared: false,
            shareIds: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        const fileRef = await firestore.collection('drive_files').add(fileDoc);

        // Store in context
        context.variables.driveFileId = fileRef.id;
        context.variables.driveFilePath = uploadResult.storagePath;
        context.previousResults.driveFile = { id: fileRef.id, path: uploadResult.storagePath };

        logger.info('[PlaybookExecutor] Report saved to Drive:', { fileId: fileRef.id });

        return {
            success: true,
            fileId: fileRef.id,
            path: uploadResult.storagePath,
        };
    } catch (error) {
        logger.error('[PlaybookExecutor] Failed to save to Drive:', { error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Send email with report
 * Action: send_email
 */
export async function executeSendEmail(
    step: any,
    context: ExecutionContext
): Promise<any> {
    const to = resolveVariables(step.params?.to || '{{user.email}}', context.variables);
    const report = context.variables.competitorReport;
    const driveUrl = context.variables.driveFilePath;
    const actions = context.variables.competitiveActions || [];

    // Build dynamic subject line with threat count
    const criticalCount = actions.filter((a: any) => a.priority === 'critical').length;
    const highCount = actions.filter((a: any) => a.priority === 'high').length;

    let defaultSubject = '📊 Daily Competitive Intelligence Report';
    if (criticalCount > 0) {
        defaultSubject = `🚨 ${criticalCount} Critical Competitive Threat${criticalCount > 1 ? 's' : ''} Detected`;
    } else if (highCount > 0) {
        defaultSubject = `⚠️ ${highCount} High-Priority Competitive Alert${highCount > 1 ? 's' : ''}`;
    }

    const subject = resolveVariables(step.params?.subject || defaultSubject, context.variables);

    logger.info('[PlaybookExecutor] Sending email:', { to, subject, actions: actions.length });

    if (!report) {
        throw new Error('No report available. Run generate_competitor_report first.');
    }

    try {
        // Import email service
        const { sendGenericEmail } = await import('@/lib/email/dispatcher');

        // Build HTML email from markdown report
        const htmlBody = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1 { color: #2c5530; border-bottom: 3px solid #4ade80; padding-bottom: 10px; }
        h2 { color: #15803d; margin-top: 30px; }
        h3 { color: #166534; }
        code { background: #f3f4f6; padding: 2px 6px; border-radius: 3px; font-family: 'Courier New', monospace; }
        pre { background: #f9fafb; padding: 15px; border-left: 4px solid #4ade80; overflow-x: auto; }
        ul { padding-left: 20px; }
        li { margin: 8px 0; }
        .header { background: linear-gradient(135deg, #15803d 0%, #4ade80 100%); color: white; padding: 30px; border-radius: 8px; margin-bottom: 30px; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
        a { color: #15803d; text-decoration: none; }
        a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="header">
        <h1 style="margin: 0; color: white; border: none;">🔍 Daily Competitive Intelligence Report</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">Generated ${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}</p>
    </div>

    <div class="content">
        ${markdownToHtml(report)}
    </div>

    ${driveUrl ? `
    <p style="margin-top: 30px; padding: 15px; background: #f0fdf4; border-left: 4px solid #4ade80; border-radius: 4px;">
        📁 <strong>Full Report:</strong> View in BakedBot Drive (path: ${driveUrl})
    </p>
    ` : ''}

    <div class="footer">
        <p>This report was automatically generated by BakedBot AI.<br>
        Questions? Reply to this email or visit <a href="https://bakedbot.ai">bakedbot.ai</a></p>
    </div>
</body>
</html>`;

        // Add action summary to email if competitive actions were triggered
        let actionSummary = '';
        if (actions.length > 0) {
            actionSummary = `
    <div style="margin: 30px 0; padding: 20px; background: #fef2f2; border-left: 4px solid #dc2626; border-radius: 4px;">
        <h2 style="margin: 0 0 15px 0; color: #991b1b; font-size: 18px;">⚡ Automated Actions Triggered (${actions.length})</h2>
        ${actions.map((action: any) => `
        <div style="margin: 10px 0; padding: 10px; background: white; border-radius: 4px;">
            <strong style="color: ${action.priority === 'critical' ? '#dc2626' : action.priority === 'high' ? '#ea580c' : '#65a30d'}">
                ${action.priority.toUpperCase()}: ${action.competitorName}
            </strong>
            <p style="margin: 5px 0; font-size: 14px;">${action.trigger}</p>
            <p style="margin: 5px 0; font-size: 14px; color: #059669;">
                ✓ ${action.type === 'price_adjustment' ? 'Money Mike' : action.type === 'counter_campaign' ? 'Craig' : action.type === 'inventory_alert' ? 'Pops' : 'System'} created ${action.type.replace('_', ' ')} (pending review)
            </p>
        </div>
        `).join('')}
    </div>`;
        }

        const result = await sendGenericEmail({
            to,
            name: to.split('@')[0],
            fromEmail: 'hello@bakedbot.ai',
            fromName: 'BakedBot',
            subject,
            htmlBody: htmlBody.replace('</div>\n\n    <div class="footer">', `${actionSummary}</div>\n\n    <div class="footer"`),
            textBody: report,
            orgId: context.orgId,
            communicationType: 'campaign',
            agentName: 'ezal',
        });

        if (!result.success) {
            throw new Error(result.error || 'Email send failed');
        }

        logger.info('[PlaybookExecutor] Email sent:', { to });

        return {
            success: true,
            sentTo: to,
            subject,
        };
    } catch (error) {
        logger.error('[PlaybookExecutor] Failed to send email:', { error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Create inbox notification for competitive intelligence report
 * Action: create_inbox_notification
 */
export async function executeCreateInboxNotification(
    step: any,
    context: ExecutionContext
): Promise<any> {
    const report = context.variables.competitorReport;
    const actions = context.variables.competitiveActions || [];

    if (!report) {
        throw new Error('No report available. Run generate_competitor_report first.');
    }

    try {
        const { firestore } = await createServerClient();

        // Build notification title based on actions
        const criticalCount = actions.filter((a: any) => a.priority === 'critical').length;
        const highCount = actions.filter((a: any) => a.priority === 'high').length;

        let title = '📊 Daily Competitive Intelligence Report';
        let priority: 'normal' | 'high' | 'urgent' = 'normal';

        if (criticalCount > 0) {
            title = `🚨 ${criticalCount} Critical Competitive Threat${criticalCount > 1 ? 's' : ''}`;
            priority = 'urgent';
        } else if (highCount > 0) {
            title = `⚠️ ${highCount} High-Priority Competitive Alert${highCount > 1 ? 's' : ''}`;
            priority = 'high';
        }

        // Build notification message with action summary
        let message = report.split('\n').slice(0, 10).join('\n') + '\n\n...';

        if (actions.length > 0) {
            message = `**${actions.length} Automated Actions Triggered:**\n\n` +
                actions.slice(0, 3).map((a: any) =>
                    `• **${a.competitorName}**: ${a.trigger} → ${a.type.replace('_', ' ')} created`
                ).join('\n') +
                (actions.length > 3 ? `\n\n...and ${actions.length - 3} more` : '');
        }

        // Create inbox notification
        const notification = await firestore.collection('notifications').add({
            tenantId: context.orgId,
            recipientId: context.orgId,
            type: 'competitive_intel',
            title,
            message,
            priority,
            read: false,
            createdAt: new Date(),
            metadata: {
                source: 'playbook',
                playbookType: 'competitive_intelligence',
                competitorCount: context.variables.competitorData?.length || 0,
                actionsTriggered: actions.length,
                criticalActions: criticalCount,
                highActions: highCount,
                reportLength: report.length,
            },
        });

        logger.info('[PlaybookExecutor] Inbox notification created:', {
            notificationId: notification.id,
            priority,
            actions: actions.length,
        });

        return {
            success: true,
            notificationId: notification.id,
            title,
            priority,
        };
    } catch (error) {
        logger.error('[PlaybookExecutor] Failed to create inbox notification:', { error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Simple markdown to HTML converter (basic)
 */
function markdownToHtml(markdown: string): string {
    return markdown
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/gim, '<em>$1</em>')
        .replace(/^\- (.*$)/gim, '<li>$1</li>')
        .replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/^(?!<[hul])/gim, '<p>')
        .replace(/$/gim, '</p>');
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
                    // Competitive Intelligence Actions
                    case 'scan_competitors':
                        output = await executeScanCompetitors(step, context);
                        break;
                    case 'generate_competitor_report':
                        output = await executeGenerateCompetitorReport(step, context);
                        break;
                    case 'save_to_drive':
                        output = await executeSaveToDrive(step, context);
                        break;
                    case 'send_email':
                        output = await executeSendEmail(step, context);
                        break;
                    case 'create_inbox_notification':
                        output = await executeCreateInboxNotification(step, context);
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
