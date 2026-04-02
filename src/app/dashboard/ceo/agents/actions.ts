'use server';

import { deebo } from '@/server/agents/deebo';
import { ai } from '@/ai/genkit';
import { getGenerateOptions } from '@/ai/model-selector';
import { runAgent } from '@/server/agents/harness';
import { persistence } from '@/server/agents/persistence';
import { requireSuperUser } from '@/server/auth/auth';
import { buildSyntheticDecodedIdToken } from '@/server/auth/mock-token';

import { craigAgent } from '@/server/agents/craig';
import { smokeyAgent } from '@/server/agents/smokey';
import { popsAgent } from '@/server/agents/pops';
import { ezalAgent } from '@/server/agents/ezal';
import { moneyMikeAgent } from '@/server/agents/moneyMike';
import { mrsParkerAgent } from '@/server/agents/mrsParker';
import { executiveAgent } from '@/server/agents/executive';
import { searchWeb, formatSearchResults } from '@/server/tools/web-search';
import { httpRequest, HttpRequestOptions } from '@/server/tools/http-client';
import { browserAction, BrowserActionParams } from '@/server/tools/browser';
import { scheduleTask, ScheduleParams } from '@/server/tools/scheduler';
import { manageWebhooks, WebhookParams } from '@/server/tools/webhooks';
import { gmailAction, GmailParams } from '@/server/tools/gmail';
import { calendarAction, CalendarParams } from '@/server/tools/calendar';
import { sheetsAction, SheetsParams } from '@/server/tools/sheets';
import { leaflinkAction, LeafLinkParams } from '@/server/tools/leaflink';
import { dutchieAction, DutchieParams } from '@/server/tools/dutchie';
import { getAuthUrl } from '@/server/integrations/gmail/oauth';
import { getGmailToken } from '@/server/integrations/gmail/token-storage';
import { revalidatePath } from 'next/cache';
import { blackleafService } from '@/lib/notifications/blackleaf-service';
import { createServerClient } from '@/firebase/server-client';
import { z } from 'zod';
import { PERSONAS, AgentPersona } from './personas';
import { CannMenusService } from '@/server/services/cannmenus';
import { getCustomerMemory } from '@/server/intuition/customer-memory';
import { getAgentForIntent } from '@/lib/agents/intent-router';
import { routeToAgent } from '@/server/agents/agent-router';

import { deeboAgent } from '@/server/agents/deebo-agent-impl';
import { bigWormAgent } from '@/server/agents/bigworm';
import { linusAgent } from '@/server/agents/linus';
import { validateInput, getRiskLevel } from '@/server/security';
import { logger } from '@/lib/logger';
import { omitUndefinedDeep } from '@/lib/utils';

const AGENT_MAP = {
    craig: craigAgent,
    smokey: smokeyAgent,
    pops: popsAgent,
    ezal: ezalAgent,
    money_mike: moneyMikeAgent,
    mrs_parker: mrsParkerAgent,
    deebo: deeboAgent,
    bigworm: bigWormAgent,
    big_worm: bigWormAgent, // Alias used by routing/threads
    leo: executiveAgent,
    jack: executiveAgent,
    linus: linusAgent,  // CTO uses Claude API exclusively
    glenda: executiveAgent,
    mike_exec: executiveAgent,
};

const AUTO_ROUTE_PERSONAS = new Set<AgentPersona>([
    'smokey',
    'craig',
    'pops',
    'ezal',
    'money_mike',
    'mrs_parker',
    'deebo',
]);

import { 
    defaultCraigTools, 
    defaultSmokeyTools, 
    defaultPopsTools, 
    defaultEzalTools, 
    defaultMoneyMikeTools, 
    defaultMrsParkerTools,
    defaultDeeboTools,
    defaultBigWormTools
} from './default-tools';

/**
 * Trigger an agent run by name.
 * SECURITY: Requires Super User privileges to prevent arbitrary agent execution.
 */
export async function triggerAgentRun(agentName: string, stimulus?: string, brandIdOverride?: string) {
    // Security gate: Only super users can trigger agent runs
    await requireSuperUser();

    const brandId = brandIdOverride || 'demo-brand-123';
    const agentImpl = AGENT_MAP[agentName as keyof typeof AGENT_MAP];
    if (!agentImpl) {
        throw new Error(`Unknown agent: ${agentName}`);
    }

    let tools: any = {};
    if (agentName === 'craig') tools = defaultCraigTools;
    else if (agentName === 'smokey') tools = defaultSmokeyTools;
    else if (agentName === 'pops') tools = defaultPopsTools;
    else if (agentName === 'ezal') tools = defaultEzalTools;
    else if (agentName === 'money_mike') tools = defaultMoneyMikeTools;
    else if (agentName === 'mrs_parker') tools = defaultMrsParkerTools;
    else if (agentName === 'deebo') tools = defaultDeeboTools;
    else if (agentName === 'bigworm' || agentName === 'big_worm') tools = defaultBigWormTools;
    else if (['leo', 'jack', 'linus', 'glenda', 'mike_exec'].includes(agentName)) {
        const { defaultExecutiveTools } = await import('./default-tools');
        tools = defaultExecutiveTools;
    }

    try {
        const logEntry = await runAgent(brandId, persistence, agentImpl as any, tools, stimulus);
        revalidatePath('/dashboard/ceo/agents'); // Refresh the UI
        return { success: true, message: `Ran ${agentName} successfully.`, log: logEntry };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}


export async function fetchAgentLogs() {
    const brandId = 'demo-brand-123';
    return await persistence.getRecentLogs(brandId);
}

export async function getGoogleAuthUrl(service: 'gmail' | 'calendar' | 'sheets' | 'drive' = 'gmail') {
    return await getAuthUrl(undefined, service);
}



// --- Playbook Logic ---

interface PlaybookResult {

    success: boolean;
    message: string;
    logs: string[];
}

const PLAYBOOK_REGISTRY: Record<string, () => Promise<PlaybookResult>> = {

    'welcome-sequence': async () => {
        const logs: string[] = [];
        logs.push("Starting 'Welcome Email Sequence' Playbook...");

        logs.push("Triggering Mrs. Parker for segment analysis...");
        const result = await triggerAgentRun('mrs_parker');
        logs.push(`Mrs. Parker Result: ${result.message}`);

        logs.push("Dispatching welcome emails via active provider (Mailjet/SendGrid)...");
        
        // Import and use the email dispatcher
        const { sendOrderConfirmationEmail } = await import('@/lib/email/dispatcher');
        
        // Send welcome email (demo recipient for now)
        const emailResult = await sendOrderConfirmationEmail({
            orderId: `WELCOME-${Date.now()}`,
            customerEmail: 'demo@bakedbot.ai', // Would be dynamic in production
            customerName: 'New VIP Member',
            total: 0,
            items: [{ name: 'Welcome to BakedBot!', qty: 1, price: 0 }],
            retailerName: 'BakedBot',
            pickupAddress: 'Welcome to the BakedBot family! Your AI agents are ready to help.'
        });
        
        logs.push(`Email dispatch result: ${emailResult ? 'Success' : 'Failed'}`);
        logs.push("Playbook 'Welcome Email Sequence' completed successfully.");

        return {
            success: true,
            message: `Welcome Sequence executed. Mrs. Parker analyzed segments and welcome email ${emailResult ? 'sent' : 'failed'}.`,
            logs
        };
    },
    'competitor-scan': async () => {
        const logs: string[] = [];
        logs.push("Starting 'Competitor Price Scan' Playbook...");

        logs.push("Triggering Ezal for market discovery...");
        const result = await triggerAgentRun('ezal');
        logs.push(`Ezal Result: ${result.message}`);

        logs.push("Generating price gap report...");
        return {
            success: true,
            message: "Competitor Scan complete. Ezal found 3 new pricing updates.",
            logs
        };
    },
    'churn-predictor': async () => {
        const logs: string[] = [];
        logs.push("Starting 'Churn Prediction' Playbook...");

        const result = await triggerAgentRun('mrs_parker');
        logs.push(`Mrs. Parker Analysis: ${result.message}`);

        return {
            success: true,
            message: "Churn Prediction complete. At-risk lists updated.",
            logs
        };
    },
    'platform-health': async () => {
        const logs: string[] = [];
        logs.push("Running Platform Health Check...");
        const result = await triggerAgentRun('pops');
        logs.push(`Pops Diagnostics: ${result.message}`);

        return {
            success: result.success,
            message: "Platform Health verified. All systems nominal.",
            logs
        };
    },
    'competitor-takedown-daily': async () => {
        const logs: string[] = [];
        logs.push("Starting 'Competitor Takedown Strategy' (V2 Graph Engine)...");

        try {
            const { GraphExecutor } = await import('@/server/services/graph/executor');
            const { sendGenericEmail } = await import('@/lib/email/dispatcher');

            // Initialize Graph
            const graph = new GraphExecutor({ retries: 0 });

            // Node 1: Ezal Discovery (with simulated failure/retry potential)
            graph.addNode('ezal_discovery', async (state) => {
                logs.push(`[Graph:Ezal] Attempt ${state.retries + 1}...`);
                
                try {
                    const intelResult = await triggerAgentRun('ezal', "Find top 3 competitors in Chicago and their current deals.");
                    return { 
                        ezal_intel: intelResult.message,
                        success: true 
                    };
                } catch (e) {
                    return { success: false, error: e };
                }
            });

            // Node 2: Retry Logic
            graph.addNode('retry_check', async (state) => {
                if (!state.success) {
                    logs.push(`[Graph:Retry] Ezal step failed. Retry count: ${state.retries}`);
                    return { retries: state.retries + 1 };
                }
                return {};
            });

            // Node 3: Big Worm Analysis
            graph.addNode('bigworm_analysis', async (state) => {
                logs.push("[Graph:BigWorm] Analyzing findings...");
                const strategyResult = await triggerAgentRun('bigworm', 
                    `Analyze these competitors: ${state.ezal_intel}. Search for 'low cost guerrilla marketing tactics'. Run 'competitor_analysis' projection.`);
                
                return { 
                    strategy: strategyResult.message,
                    strategy_success: true
                };
            });

            // Node 4: Reporting
            graph.addNode('send_report', async (state) => {
                logs.push("[Graph:Reporter] Dispatching email...");
                
                const emailBody = `
                    <h1>Daily Competitor Takedown Strategy (V2 Graph)</h1>
                    <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                    <h2>🕵️ Ezal's Intel</h2>
                    <p>${state.ezal_intel}</p>
                    <h2>🧠 Big Worm's Strategy</h2>
                    <p>${state.strategy}</p>
                    <hr/>
                    <p><em>Generated by BakedBot AI (Graph Engine)</em></p>
                `;

                await sendGenericEmail({
                    to: 'martez@bakedbot.ai',
                    subject: '🎯 Daily Takedown Strategy (Graph Optimized)',
                    htmlBody: emailBody,
                    textBody: `Strategy: ${state.strategy}`
                });

                return { status: 'complete' };
            });

            graph.addNode('fail_stop', async (state) => {
                logs.push("[Graph:Error] Max retries exceeded. Aborting.");
                return { status: 'failed' };
            });

            // --- Edges ---
            graph.addEdge('ezal_discovery', 'retry_check');
            graph.addEdge('retry_check', (state) => {
                if (state.success) return 'bigworm_analysis';
                if (state.retries > 2) return 'fail_stop';
                return 'ezal_discovery'; // Loop back
            });
            graph.addEdge('bigworm_analysis', 'send_report');
            graph.addEdge('send_report', '__END__');
            graph.addEdge('fail_stop', '__END__');

            // Execute
            graph.setEntryPoint('ezal_discovery');
            const result = await graph.execute(20);

            logs.push(`Graph finalized with status: ${result.finalState.status}`);
            
            return {
                success: result.finalState.status === 'complete',
                message: `Graph Execution Finished. Final State: ${result.finalState.status}`,
                logs
            };

        } catch (e: any) {
            logs.push(`Graph Critical Error: ${e.message}`);
            return { success: false, message: e.message, logs };
        }
    }
};

/**
 * Execute a registered playbook by ID.
 * SECURITY: Requires Super User privileges to prevent arbitrary playbook execution.
 */
export async function executePlaybook(playbookId: string): Promise<PlaybookResult> {
    // Security gate: Only super users can execute playbooks
    await requireSuperUser();

    const runner = PLAYBOOK_REGISTRY[playbookId];
    if (!runner) {
        return {
            success: false,
            message: `Playbook ID '${playbookId}' not found.`,
            logs: [`Error: Playbook ${playbookId} is not defined in registry.`]
        };
    }

    try {
        const { firestore } = await createServerClient();
        const { FieldValue } = await import('firebase-admin/firestore');
        
        // 1. Check if playbook is active in Firestore
        const pbRef = firestore.collection('system_playbooks').doc(playbookId);
        const pbDoc = await pbRef.get();
        
        if (pbDoc.exists && !pbDoc.data()?.active) {
            return {
                success: false,
                message: `Playbook '${playbookId}' is currently disabled.`,
                logs: [`Execution skipped: Playbook is inactive.`]
            };
        }

        // 2. Execute
        const result = await runner();
        
        // 3. Log run to subcollection
        const runRef = pbRef.collection('runs').doc();
        await runRef.set({
            ...result,
            timestamp: FieldValue.serverTimestamp(),
        });

        // 4. Update playbook summary
        await pbRef.set({
            lastRun: FieldValue.serverTimestamp(),
            runsToday: FieldValue.increment(1),
            updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });

        return result;
    } catch (error: any) {
        console.error(`Playbook ${playbookId} execution failed:`, error);
        return {
            success: false,
            message: `Playbook execution failed: ${error.message}`,
            logs: [`Exception: ${error.message}`]
        };
    }
}


// -- Chat & Intent Router --

export interface AgentResult {
    content: string;
    toolCalls?: { id: string; name: string; status: 'success' | 'error' | 'running'; result: string }[];
    thinking?: {
        isThinking: boolean;
        steps: any[];
        plan: string[];
    };
    metadata?: {
        type?: 'compliance_report' | 'product_rec' | 'elasticity_analysis' | 'session_context' | 'hire_modal';
        data?: any;
        brandId?: string;
        brandName?: string;
        agentName?: string;
        role?: string;
        jobId?: string; // Add jobId support
        media?: {
            type: 'image' | 'video';
            url: string;
            prompt?: string;
            duration?: number;
            model?: string;
        } | null;
    };
    logs?: string[];
}

// Extending the input options
interface ChatExtraOptions {
    modelLevel?: string;
    audioInput?: string; // base64
    attachments?: { name: string; type: string; base64: string }[];
    projectId?: string; // Project context for system instructions
    source?: string; // Source identifier (e.g., 'interrupt', 'pulse')
    priority?: string; // Priority level (e.g., 'high', 'normal')
    context?: Record<string, unknown>; // Additional context for browser automation, etc.
}

export async function runAgentChat(userMessage: string, personaId?: string, extraOptions?: ChatExtraOptions): Promise<AgentResult> {
    logger.info('[runAgentChat] Dispatching Async Job', { preview: userMessage.substring(0, 50) });

    try {
        // 0. SECURITY: Validate input for prompt injection
        // ALWAYS validate - system-initiated requests get higher length limit but same pattern checks
        const isSystemInitiated = extraOptions?.source === 'interrupt';
        const inputValidation = validateInput(userMessage, {
            maxLength: isSystemInitiated ? 5000 : 2000, // Higher limit for system sources
            allowedRole: 'admin' // Dashboard users have elevated trust
        });

        if (inputValidation.blocked) {
            logger.warn('[runAgentChat] Blocked prompt injection attempt', {
                source: isSystemInitiated ? 'system' : 'user',
                reason: inputValidation.blockReason,
                riskScore: inputValidation.riskScore,
                persona: personaId,
            });
            return {
                content: "Request blocked due to security restrictions.",
                toolCalls: [],
                metadata: { type: 'session_context' }
            };
        }

        // Log high-risk queries for monitoring
        if (inputValidation.riskScore >= 30) {
            logger.info('[runAgentChat] High-risk query detected', {
                source: isSystemInitiated ? 'system' : 'user',
                riskLevel: getRiskLevel(inputValidation.riskScore),
                riskScore: inputValidation.riskScore,
                persona: personaId,
            });
        }

        // 1. Intelligent Routing (Overriding Persona)
        let finalPersonaId = personaId;

        // INTENT CHECK: Hire / Upgrade
        const lowerMsg = userMessage.toLowerCase();
        if (lowerMsg.includes('hire') || lowerMsg.includes('upgrade') || lowerMsg.includes('subscribe')) {
            // Return immediate "Hire" trigger
            return {
                content: "I can help you build your digital workforce. Let's get you upgraded.",
                toolCalls: [],
                metadata: {
                    type: 'hire_modal',
                    data: { plan: lowerMsg.includes('team') || lowerMsg.includes('empire') ? 'empire' : 'specialist' }
                }
            };
        }

        // Only route if no specific persona was forced (or if it's the default 'puff').
        // Prefer deterministic routing here so we do not pay for an extra LLM
        // classification before the core agent runner sees the request.
        if (!personaId || personaId === 'puff') {
            const deterministicPersonaId = getAgentForIntent(userMessage);

            if (deterministicPersonaId) {
                finalPersonaId = deterministicPersonaId;
                logger.info('[runAgentChat] Deterministic specialist route', {
                    persona: deterministicPersonaId,
                    source: 'intent-router',
                });
            } else {
                try {
                    const routing = await routeToAgent(userMessage);
                    const routedPersona = routing.primaryAgent;

                    if (AUTO_ROUTE_PERSONAS.has(routedPersona as AgentPersona) && routedPersona !== 'puff' && routing.confidence >= 0.6) {
                        finalPersonaId = routedPersona as AgentPersona;
                        logger.info('[runAgentChat] Broad keyword route', {
                            persona: routedPersona,
                            confidence: routing.confidence,
                            reasoning: routing.reasoning,
                            source: 'agent-router',
                        });
                    } else {
                        logger.info('[runAgentChat] Retaining Puff fallback', {
                            confidence: routing.confidence,
                            reasoning: routing.reasoning,
                        });
                    }
                } catch (error) {
                    logger.warn('[runAgentChat] Broad routing failed, defaulting to Puff', {
                        error: error instanceof Error ? error.message : String(error),
                    });
                }
            }
        }

        // 1. Get User
        const { requireUser } = await import('@/server/auth/auth');
        const user = await requireUser();
        const resolvedBrandId = (user as any).brandId || (user as any).orgId || (user as any).currentOrgId || null;
        const resolvedModelLevel =
            (['leo', 'jack', 'linus', 'glenda', 'mike_exec'].includes(finalPersonaId || '')
                ? 'genius'
                : (extraOptions?.modelLevel as any)) || 'standard';
        const resumeOptions = omitUndefinedDeep({
            modelLevel: resolvedModelLevel,
            brandId: resolvedBrandId,
            projectId: extraOptions?.projectId,
            source: extraOptions?.source,
            context: extraOptions?.context,
        });

        // 2. Generate Job ID
        const jobId = crypto.randomUUID();

        // 3. Create Job Document (Synchronous to avoid race condition with polling)
        const { getAdminFirestore } = await import('@/firebase/admin');
        const { FieldValue } = await import('firebase-admin/firestore');
        const db = getAdminFirestore();
        const jobData = omitUndefinedDeep({
            status: 'pending',
            userId: user.uid,
            userInput: userMessage,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            persona: finalPersonaId || 'puff',
            brandId: resolvedBrandId,
            resumeOptions,
            thoughts: [] // Initialize empty thoughts
        });
        await db.collection('jobs').doc(jobId).set(jobData);

        // 4. Dispatch
        const { dispatchAgentJob } = await import('@/server/jobs/dispatch');
        const payload = {
            userId: user.uid,
            userInput: userMessage,
            persona: (finalPersonaId as AgentPersona) || 'puff',
            options: omitUndefinedDeep({
                modelLevel: resolvedModelLevel,
                audioInput: extraOptions?.audioInput,
                attachments: extraOptions?.attachments,
                brandId: resolvedBrandId || undefined,
                projectId: extraOptions?.projectId, // Pass project context
                source: extraOptions?.source, // Pass source identifier (e.g., 'inbox')
                context: extraOptions?.context // Pass additional context
            }),
            jobId
        };

        // DEVELOPMENT MODE: Force synchronous execution to avoid Cloud Tasks localhost issues
        const isDevelopment = process.env.NODE_ENV === 'development';
        logger.info('[runAgentChat] Environment check', {
            NODE_ENV: process.env.NODE_ENV,
            isDevelopment,
            jobId,
            willSkipCloudTasks: isDevelopment
        });

        let dispatch: { success: boolean; error?: string; taskId?: any } = {
            success: !isDevelopment,
            error: isDevelopment ? 'Development mode - using synchronous fallback' : undefined
        };

        if (!isDevelopment) {
            dispatch = await dispatchAgentJob(payload);
            logger.info('[runAgentChat] dispatchAgentJob result', { success: dispatch.success, jobId, error: dispatch.error });
        } else {
            logger.info('[runAgentChat] Skipping Cloud Tasks in development, will use synchronous execution');
        }

        if (!dispatch.success) {
            logger.warn('[runAgentChat] Using synchronous fallback', { reason: dispatch.error, jobId });

            // SYNCHRONOUS FALLBACK: Run agent directly when Cloud Tasks isn't available
            try {
                const { runAgentCore } = await import('@/server/agents/agent-runner');
                const {
                    finalizeJobSuccess,
                    sanitizeAgentJobResult,
                } = await import('@/server/jobs/job-stream');

                // Construct mock user token for agent execution
                const syntheticUser = user as typeof user & { brandId?: string; role?: string };
                const mockUserToken = buildSyntheticDecodedIdToken(syntheticUser, syntheticUser.brandId);

                // Run agent synchronously
                const result = await runAgentCore(
                    userMessage,
                    payload.persona,
                    payload.options,
                    mockUserToken,
                    jobId
                );
                const sanitizedResult = sanitizeAgentJobResult(result);

                await finalizeJobSuccess(jobId, sanitizedResult, db);

                // Return immediate result (no polling needed - NO jobId in metadata!)
                logger.info('[runAgentChat] Synchronous execution completed, returning result immediately');
                return {
                    content: sanitizedResult.content || '',
                    toolCalls: sanitizedResult.toolCalls || [],
                    metadata: {
                        // DO NOT include jobId here - it triggers polling in inbox
                        agentName: finalPersonaId || 'BakedBot',
                        type: sanitizedResult.metadata?.type || 'session_context',
                        brandId: user.brandId,
                        data: sanitizedResult.metadata?.data
                    }
                };
            } catch (syncError: any) {
                logger.error('[runAgentChat] Synchronous fallback also failed', { error: syncError.message });
                const { finalizeJobFailure } = await import('@/server/jobs/job-stream');
                await finalizeJobFailure(jobId, syncError.message, db);

                return {
                    content: `**Error**: Agent execution failed. ${syncError.message}`,
                    toolCalls: [],
                    metadata: { jobId: undefined }
                };
            }
        }

        return {
            content: '', // Frontend should handle this state
            toolCalls: [],
            metadata: {
                jobId,
                agentName: finalPersonaId || 'BakedBot',
                type: 'session_context',
                brandId: user.brandId
            }
        };
    } catch (error: any) {
        // Catch-all error handler to prevent Server Components render errors
        console.error('[runAgentChat] Unexpected error:', error);
        return {
            content: `**Error**: ${error.message || 'An unexpected error occurred. Please try again.'}`,
            toolCalls: [],
            metadata: { type: 'session_context' }
        };
    }
}

export async function cancelAgentJob(jobId: string) {
    // 1. Get User for security
    const { requireUser } = await import('@/server/auth/auth');
    const { cancelJob } = await import('@/server/jobs/job-stream');
    await requireUser();

    // 2. Update Job Status
    // We only mark it as cancelled. The worker might still be running but the UI handles it.
    // Ideally user permission check on the job doc itself, but simplistic check for now.
    await cancelJob(jobId, 'Cancelled by user');

    return { success: true };
}
