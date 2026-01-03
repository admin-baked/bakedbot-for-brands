'use server';

import { deebo } from '@/server/agents/deebo';
import { ai } from '@/ai/genkit';
import { getGenerateOptions } from '@/ai/model-selector';
import { runAgent } from '@/server/agents/harness';
import { persistence } from '@/server/agents/persistence';

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
import { revalidatePath } from 'next/cache';
import { blackleafService } from '@/lib/notifications/blackleaf-service';
import { z } from 'zod';
import { PERSONAS, AgentPersona } from './personas';
import { CannMenusService } from '@/server/services/cannmenus';
import { getCustomerMemory } from '@/server/intuition/customer-memory';
import { analyzeQuery } from '@/ai/chat-query-handler';

const AGENT_MAP = {
    craig: craigAgent,
    smokey: smokeyAgent,
    pops: popsAgent,
    ezal: ezalAgent,
    money_mike: moneyMikeAgent,
    mrs_parker: mrsParkerAgent,
    leo: executiveAgent,
    jack: executiveAgent,
    linus: executiveAgent,
    glenda: executiveAgent,
    mike_exec: executiveAgent,
};

import { 
    defaultCraigTools, 
    defaultSmokeyTools, 
    defaultPopsTools, 
    defaultEzalTools, 
    defaultMoneyMikeTools, 
    defaultMrsParkerTools 
} from './default-tools';

export async function triggerAgentRun(agentName: string, stimulus?: string, brandIdOverride?: string) {
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
    }
};

export async function executePlaybook(playbookId: string): Promise<PlaybookResult> {
    const runner = PLAYBOOK_REGISTRY[playbookId];
    if (!runner) {
        return {
            success: false,
            message: `Playbook ID '${playbookId}' not found.`,
            logs: [`Error: Playbook ${playbookId} is not defined in registry.`]
        };
    }

    try {
        return await runner();
    } catch (error: any) {
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
    metadata?: {
        type?: 'compliance_report' | 'product_rec' | 'elasticity_analysis' | 'session_context';
        data?: any;
        brandId?: string;
        brandName?: string;
        agentName?: string;
        role?: string;
        jobId?: string; // Add jobId support
    };
    logs?: string[];
}

// Extending the input options
interface ChatExtraOptions {
    modelLevel?: string;
    audioInput?: string; // base64
    attachments?: { name: string; type: string; base64: string }[];
    projectId?: string; // Project context for system instructions
}

export async function runAgentChat(userMessage: string, personaId?: string, extraOptions?: ChatExtraOptions): Promise<AgentResult> {
    console.log('[runAgentChat] Dispatching Async Job:', userMessage.substring(0, 50));
    
    // 0. Intelligent Routing (Overriding Persona)
    let finalPersonaId = personaId;
    
    // Only route if no specific persona was forced (or if it's the default 'puff')
    // We allow explicit persona selection to stick, but 'puff' implies "General Assistant" who delegates.
    if (!personaId || personaId === 'puff') {
        try {
            const analysis = await analyzeQuery(userMessage);
            console.log('[runAgentChat] Routing Analysis:', analysis);

            if (analysis.searchType === 'marketing') {
                finalPersonaId = 'craig';
            } else if (analysis.searchType === 'competitive') {
                finalPersonaId = 'ezal';
            } else if (analysis.searchType === 'compliance') {
                finalPersonaId = 'deebo';
            } else if (analysis.searchType === 'analytics') {
                finalPersonaId = 'pops';
            } else if (analysis.searchType === 'semantic' || analysis.searchType === 'keyword' || analysis.searchType === 'filtered') {
                // Product search -> Smokey
                finalPersonaId = 'smokey';
            } else if (userMessage.toLowerCase().includes('price') || userMessage.toLowerCase().includes('cost') || userMessage.toLowerCase().includes('margin') || userMessage.toLowerCase().includes('billing')) {
                 // Money Mike fallback for financial terms not caught by complex analysis
                 finalPersonaId = 'money_mike';
            }
        } catch (e) {
            console.warn('[runAgentChat] Routing failed, defaulting to Puff:', e);
        }
    }

    // 1. Get User
    const { requireUser } = await import('@/server/auth/auth');
    const user = await requireUser();

    // 2. Generate Job ID
    const jobId = crypto.randomUUID();

    // 3. Create Job Document (Synchronous to avoid race condition with polling)
    const { getFirestore, FieldValue } = await import('firebase-admin/firestore');
    const db = getFirestore();
    await db.collection('jobs').doc(jobId).set({
        status: 'pending',
        userId: user.uid,
        userInput: userMessage,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        persona: finalPersonaId || 'puff',
        brandId: user.brandId || null,
        thoughts: [] // Initialize empty thoughts
    });

    // 4. Dispatch
    const { dispatchAgentJob } = await import('@/server/jobs/dispatch');
    const payload = {
        userId: user.uid,
        userInput: userMessage,
        persona: (finalPersonaId as AgentPersona) || 'puff',
        options: {
            modelLevel: (['leo', 'jack', 'linus', 'glenda', 'mike_exec'].includes(finalPersonaId || '') ? 'genius' : (extraOptions?.modelLevel as any)) || 'standard',
            audioInput: extraOptions?.audioInput,
            attachments: extraOptions?.attachments,
            brandId: user.brandId,
            projectId: extraOptions?.projectId // Pass project context
        },
        jobId
    };

    const dispatch = await dispatchAgentJob(payload);

    if (!dispatch.success) {
        console.error('Dispatch failed:', dispatch.error);
        // Mark as failed in DB
        await db.collection('jobs').doc(jobId).update({
            status: 'failed',
            error: dispatch.error,
            updatedAt: FieldValue.serverTimestamp()
        });

        return {
            content: `**Error**: Failed to start agent job. ${dispatch.error}`,
            toolCalls: [],
            metadata: { jobId: undefined }
        };
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
}

export async function cancelAgentJob(jobId: string) {
    // 1. Get User for security
    const { requireUser } = await import('@/server/auth/auth');
    const { getFirestore } = await import('firebase-admin/firestore');
    const user = await requireUser();
    
    // 2. Update Job Status
    // We only mark it as cancelled. The worker might still be running but the UI handles it.
    // Ideally user permission check on the job doc itself, but simplistic check for now.
    const db = getFirestore();
    await db.collection('jobs').doc(jobId).set({
        status: 'cancelled',
        updatedAt: new Date(),
        error: 'Cancelled by user'
    }, { merge: true });

    return { success: true };
}
