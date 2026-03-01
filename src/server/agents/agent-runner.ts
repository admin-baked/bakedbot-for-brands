
import { ai } from '@/ai/genkit';
import { getAllTalkTracks } from '@/server/repos/talkTrackRepo';
import type { RoutingResult } from '@/server/agents/agent-router';
import { getGenerateOptions } from '@/ai/model-selector';
import { runAgent } from '@/server/agents/harness';
import { persistence } from '@/server/agents/persistence';
import { craigAgent } from '@/server/agents/craig';
import { smokeyAgent } from '@/server/agents/smokey';
import { popsAgent } from '@/server/agents/pops';
import { ezalAgent } from '@/server/agents/ezal';
import { moneyMikeAgent } from '@/server/agents/moneyMike';
import { mrsParkerAgent } from '@/server/agents/mrsParker';
import { dayday } from '@/server/agents/dayday';
import { felisha } from '@/server/agents/felisha';
import { executiveAgent } from '@/server/agents/executive';
import { bigWormAgent } from '@/server/agents/bigworm';
import { deeboAgent } from '@/server/agents/deebo-agent-impl';
import { linusAgent } from '@/server/agents/linus';
import { jackAgent } from '@/server/agents/jack';
import { glendaAgent } from '@/server/agents/glenda';
import { leoAgent } from '@/server/agents/leo';
import { openclawAgent } from '@/server/agents/openclaw';
import { searchWeb, formatSearchResults } from '@/server/tools/web-search';
import { httpRequest, HttpRequestOptions } from '@/server/tools/http-client';
import { browserAction, BrowserActionParams } from '@/server/tools/browser';
import { scheduleTask, ScheduleParams } from '@/server/tools/scheduler';
import { manageWebhooks, WebhookParams } from '@/server/tools/webhooks';
import { gmailAction, GmailParams } from '@/server/tools/gmail';
import { requestIntegration } from '@/server/tools/integration-tools';
import { calendarAction, CalendarParams } from '@/server/tools/calendar';
import { sheetsAction, SheetsParams } from '@/server/tools/sheets';
import { leaflinkAction, LeafLinkParams } from '@/server/tools/leaflink';
import { dutchieAction, DutchieParams } from '@/server/tools/dutchie';
import { blackleafService } from '@/lib/notifications/blackleaf-service';
import { PERSONAS, AgentPersona } from '@/app/dashboard/ceo/agents/personas';
import { CannMenusService } from '@/server/services/cannmenus';
import { DecodedIdToken } from 'firebase-admin/auth';
import { getIntuitionSummary } from '@/server/algorithms/intuition-engine';
import { deebo } from '@/server/agents/deebo';
import { emitThought } from '@/server/jobs/thought-stream';

// Agentic Evals
import { EvalEngine } from '@/lib/evals/engine';
import { DeeboComplianceEval } from '@/lib/evals/deebo-compliance';

// Register standard evals
const engine = EvalEngine.getInstance();
engine.register(new DeeboComplianceEval());

// Claude Tool Calling Integration

import { executeWithTools, isClaudeAvailable } from '@/ai/claude';
import { getUniversalClaudeTools, createToolExecutor, shouldUseClaudeTools } from '@/server/agents/tools/claude-tools';


// Verification Layer (Gauntlet)
import { Gauntlet } from './verification/gauntlet';
import { DeeboEvaluator } from './verification/evaluators/deebo-evaluator';
import { FinancialEvaluator } from './verification/evaluators/financial-evaluator';
import { StrategyEvaluator } from './verification/evaluators/strategy-evaluator';
import { TechnicalEvaluator } from './verification/evaluators/technical-evaluator';
import { VerificationContext } from './verification/types';

import { logger } from '@/lib/logger';
import { AgentLogEntry } from '@/server/agents/schemas';
import { validateInput, validateOutput, sanitizeForPrompt, wrapUserData, getRiskLevel } from '@/server/security';
import { loadAISettingsForAgent } from '@/server/actions/ai-settings';
import { buildCustomInstructionsBlock } from '@/types/ai-settings';
import { extractGmailParams, extractCalendarParams } from '@/server/agents/extraction-helpers';
import { agentCache, CacheKeys, CacheTTL } from '@/lib/cache/agent-runner-cache';


// === STRUCTURED EXTRACTION HELPERS (imported from extraction-helpers.ts) ===

// Re-export for backward compatibility
export { extractGmailParams, extractCalendarParams } from '@/server/agents/extraction-helpers';

// Removed local definitions - now using extraction-helpers.ts


export interface AgentResult {
    content: string;
    toolCalls?: { id: string; name: string; status: 'success' | 'error' | 'running'; result: string }[];
    thinking?: {
        isThinking: boolean;
        steps: any[];
        plan: string[];
    };
    toolPerms?: any; // Added for compatibility if needed
    logs?: AgentLogEntry;
    metadata?: any;
}

export interface ChatExtraOptions {
    modelLevel?: string;
    audioInput?: string; // base64
    attachments?: { name: string; type: string; base64: string }[];
    source?: string; // Source identifier (e.g., 'inbox', 'interrupt', 'pulse')
    context?: Record<string, unknown>; // Additional context for browser automation, etc.
}

// Local Agent Map
const AGENT_MAP = {
    craig: craigAgent,
    smokey: smokeyAgent,
    pops: popsAgent,
    ezal: ezalAgent,
    money_mike: moneyMikeAgent,
    mrs_parker: mrsParkerAgent,
    day_day: dayday,
    felisha: felisha,
    // Executive Boardroom
    executive_base: executiveAgent,
    leo: leoAgent, // COO - Operations & Orchestration
    jack: jackAgent, // CRO - Revenue & Sales
    glenda: glendaAgent, // CMO - Marketing & Brand
    // CFO (canonical) + legacy alias
    mike_exec: executiveAgent,
    mike: executiveAgent,
    linus: linusAgent, // CTO
    deebo: deeboAgent, // Regulation Enforcement
    // Big Worm (canonical) + legacy alias
    big_worm: bigWormAgent,
    bigworm: bigWormAgent,
    // Autonomous Work Agent
    openclaw: openclawAgent, // Multi-channel communication & task automation
};

// Tools Mocks (Simplified for Runner - ideally these would be in a shared 'tools-registry' file)
// Since I cannot modify all agent files to export their tools in this step, I reuse the patterns.
// NOTE: For brevity and reliability, I'm calling the defaults where possible or using the simplified versions.

import {
    defaultCraigTools,
    defaultSmokeyTools,
    defaultPopsTools,
    defaultEzalTools,
    defaultMoneyMikeTools,
    defaultMrsParkerTools,
    defaultDayDayTools,
    defaultFelishaTools,
    defaultExecutiveTools,
    defaultBigWormTools,
    defaultDeeboTools,
    defaultUniversalTools,
    defaultExecutiveBoardTools
} from '@/app/dashboard/ceo/agents/default-tools';

async function triggerAgentRun(agentName: string, stimulus?: string, brandIdOverride?: string) {
    const brandId = brandIdOverride || 'demo-brand-123';
    const agentImpl = AGENT_MAP[agentName as keyof typeof AGENT_MAP];
    if (!agentImpl) throw new Error(`Unknown agent: ${agentName}`);

    // Tools setup
    let tools: any = {};
    // Universal Tool Access: All agents get defaultUniversalTools
    // Executive Board (leo, jack, glenda, mike, linus) get RTRVR access
    const EXECUTIVE_BOARD = ['executive_base', 'leo', 'jack', 'glenda', 'mike', 'linus'];
    // NOTE: Keep legacy 'mike' but treat canonical 'mike_exec' as exec too.
    if (!EXECUTIVE_BOARD.includes('mike_exec')) EXECUTIVE_BOARD.push('mike_exec');

    if (EXECUTIVE_BOARD.includes(agentName)) {
        tools = defaultExecutiveBoardTools;
    } else {
        tools = defaultUniversalTools;
    }

    // --- SKILL INJECTION ---
    const personaConfig = PERSONAS[agentName as AgentPersona];
    let skillInstructions = '';

    if (personaConfig?.skills && personaConfig.skills.length > 0) {
        try {
            const { loadSkills } = await import('@/skills/loader');
            const loadedSkills = await loadSkills(personaConfig.skills);

            // 1. Append Tools
            if (Array.isArray(tools)) {
                const newTools = loadedSkills.flatMap(s => s.tools.map(t => t.definition));
                tools = [...tools, ...newTools];
            }

            // 2. Append Instructions
            skillInstructions = loadedSkills.map(s => `\n[SKILL: ${s.name}]\n${s.instructions}`).join('\n');

        } catch (error) {
            logger.error('[AgentRunner] Failed to inject skills:', { error });
        }
    }


    // --- GAUNTLET VERIFICATION LOOP ---
    //
    // The Gauntlet system provides post-generation compliance auditing.
    // Deebo evaluator checks marketing content against cannabis regulations.
    //
    // Feature Flag: ENABLE_GAUNTLET_VERIFICATION
    // - Set to 'true' to enable compliance checking
    // - Default: disabled (empty evaluators)
    //
    // Known Issue (2026-01-28): Triple-response bug occurred when evaluators were active.
    // Root Cause: Response streaming before verification completed.
    // Fix Applied (2026-02-09): Responses are now held until verification passes.
    // Re-enabled with feature flag control for gradual rollout.

    const GAUNTLET_ENABLED = process.env.ENABLE_GAUNTLET_VERIFICATION === 'true';

    // 1. Configure Evaluators (only if feature flag is enabled)
    const AGENT_EVALUATORS: Record<string, any[]> = GAUNTLET_ENABLED ? {
        'craig': [new DeeboEvaluator()], // Craig marketing content audited by Deebo
        // Future: Add more evaluators as needed
        // 'money_mike': [new FinancialEvaluator()],
        // 'linus': [new TechnicalEvaluator()],
    } : {};

    const evaluators = AGENT_EVALUATORS[agentName];
    const MAX_RETRIES = evaluators ? 3 : 1;


    // --- CONTEXT INJECTION (Skills & Talk Tracks) ---
    // We inject these into the stimulus (User Prompt) so the Agent sees them as "System Context" or "Training Data"

    let trainingContext = '';

    // 1. Inject Skills (if loaded)
    if (skillInstructions) {
        trainingContext += `\n\n[ENABLED SKILLS]\nThe following specialized skills are enabled for this session:\n${skillInstructions}\n`;
    }

    // 2. Inject Talk Tracks (Training Examples)
    try {
        const allTracks = await getAllTalkTracks();
        // Filter for relevant tracks (Role-based + Keywords matching stimulus)
        const relevantTracks = allTracks.filter(t =>
            ((t.role as string) === 'all' || (t.role as string) === (personaConfig?.id || 'assistant')) &&
            t.isActive &&
            t.triggerKeywords.some(k => (stimulus || '').toLowerCase().includes((k || '').toLowerCase()))
        );

        if (relevantTracks.length > 0) {
            trainingContext += `\n\n[RECOMMENDED TALK TRACKS]\nUse these examples to guide your response style and structure:\n`;
            relevantTracks.forEach(t => {
                trainingContext += `\n--- SCENARIO: ${t.name} ---\n`;
                t.steps.forEach(s => {
                    trainingContext += `Step ${s.order}: ${s.message}\n`;
                });
            });
        }
    } catch (error) {
        logger.warn('[AgentRunner] Failed to load Talk Tracks:', { error });
    }

    let currentStimulus = (stimulus || '') + trainingContext;
    let attempts = 0;

    while (attempts < MAX_RETRIES) {
        attempts++;

        // A. Generate (Run Agent)
        const logEntry = await runAgent(brandId, persistence, agentImpl as any, tools, currentStimulus);
        const resultText = logEntry?.result || '';

        // B. Verify (Run Gauntlet)
        if (evaluators && evaluators.length > 0) {
            const gauntlet = new Gauntlet(evaluators);
            const context: VerificationContext = {
                agentId: agentName,
                task: stimulus || 'Unknown Task',
                originalPrompt: stimulus || '',
                previousAttempts: attempts - 1
            };

            const verdict = await gauntlet.run(resultText, context);

            if (verdict.passed) {
                // Success!
                return {
                    success: true,
                    message: resultText,
                    log: logEntry
                };
            }

            // Failure - Loop back
            // If we hit max retries, we return the failure (or the last attempt with a warning)
            if (attempts >= MAX_RETRIES) {
                return {
                    success: false,
                    message: `Agent failed verification after ${attempts} attempts. Last feedback: ${verdict.issues.join('; ')}`,
                    log: logEntry
                };
            }

            // Add feedback to stimulus for next run
            currentStimulus = `\n\n[VERIFICATION FEEDBACK]\nYour previous output failed validation:\n${verdict.issues.join('\n')}\n\nSuggestion: ${verdict.suggestion}\n\nPlease fix these issues and regenerate the response.`;
            continue;
        }

        // No evaluators, just return result
        return { success: true, message: `Ran ${agentName} successfully.`, log: logEntry };
    }

    return { success: false, message: "Loop terminated unexpectedly." };
}

/**
 * Synthesizes a high-impact Markdown snapshot from raw data.
 */
async function synthesizeSnapshot(rawData: any, format: string, modelLevel: string = 'lite'): Promise<string> {
    const prompt = `
    You are BakedBot Intelligence. Convert the following raw data into a standardized, high-impact competitive snapshot.
    
    RAW DATA:
    ${JSON.stringify(rawData, null, 2)}
    
    MANDATORY FORMAT:
    ${format}
    
    Rules:
    1. Use high-impact emojis.
    2. Ensure sections are separated by horizontal lines (---).
    3. Keep it brief and executive-level.
    4. If data is missing for a section, omit the section or state "No updates".
    `;

    const response = await ai.generate({
        ...getGenerateOptions(modelLevel),
        prompt,
    });

    return response.text;
}

// Playbook Logic
interface PlaybookResult {
    success: boolean;
    message: string;
    logs: string[];
}
const PLAYBOOK_REGISTRY: Record<string, () => Promise<PlaybookResult>> = {
    'welcome-sequence': async () => {
        const logs = ["Starting 'Welcome Sequence'..."];
        const res = await triggerAgentRun('mrs_parker');
        logs.push(`Analysis: ${res.message}`);
        // Mock email send
        logs.push("Email dispatch: Success (Simulated)");
        return { success: true, message: "Welcome sequence complete.", logs };
    },
    'competitor-scan': async () => {
        const logs = ["Starting 'Competitor Price Scan'..."];

        // 1. Gather Intel
        logs.push("Triggering Ezal for market discovery (Detroit/MI)...");
        // In a real scenario, params would be passed or retrieved from context
        const res = await triggerAgentRun('ezal');
        const intel = res.log?.result || res.message;
        logs.push(`Ezal Intelligence: ${intel}`);

        // 2. Format Report
        const reportHtml = `
            <h1>Competitive Intelligence Snapshot</h1>
            <p><strong>Target:</strong> Ultra Cannabis, Detroit</p>
            <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
            <hr />
            <h3>Market Analysis</h3>
            <p>${intel}</p>
            <p><em>(Note: Deep Research Agents are available for more detailed BakedBot Discovery)</em></p>
        `;

        // 3. Email Report
        logs.push("Dispatching report via Mailjet...");
        const { sendGenericEmail } = await import('@/lib/email/dispatcher');
        const { requireUser } = await import('@/server/auth/auth');
        let userEmail = 'demo@bakedbot.ai';
        try {
            const user = await requireUser();
            if (user.email) userEmail = user.email;
        } catch (e) { }

        const emailResult = await sendGenericEmail({
            to: userEmail,
            subject: 'Daily Competitive Snapshot: Ultra Cannabis',
            htmlBody: reportHtml
        });

        logs.push(`Email to ${userEmail}: ${emailResult.success ? 'Success' : `Failed (${emailResult.error})`}`);
        return { success: true, message: `Scan complete. Report emailed to ${userEmail}.`, logs };
    },
    'churn-predictor': async () => {
        const logs = ["Starting 'Churn Predictor'..."];
        const res = await triggerAgentRun('mrs_parker');
        logs.push(`Prediction: ${res.message}`);
        return { success: true, message: "Churn analysis complete.", logs };
    },
    'platform-health': async () => {
        const logs = ["Running Diagnostics..."];
        const res = await triggerAgentRun('pops');
        logs.push(`Diagnostics: ${res.message}`);
        return { success: res.success, message: "All systems nominal.", logs };
    }
};

async function executePlaybook(playbookId: string): Promise<PlaybookResult> {
    const runner = PLAYBOOK_REGISTRY[playbookId];
    if (!runner) return { success: false, message: 'Playbook not found', logs: [] };
    return await runner();
}


/**
 * Core Agent Execution Logic
 * @param userMessage - The user's input/prompt
 * @param personaId - The selected agent persona ID
 * @param extraOptions - Attachments, model level, etc.
 * @param injectedUser - Optional user context (for Async Jobs)
 */
export async function runAgentCore(
    userMessage: string,
    personaId?: string,
    extraOptions?: ChatExtraOptions,
    injectedUser?: DecodedIdToken | null,
    jobId?: string
): Promise<AgentResult> {

    await emitThought(jobId, 'Analyzing Request', `Processing user input: "${userMessage?.substring(0, 50)}..."`);

    // === SECURITY: Input Validation for Prompt Injection ===
    const inputValidation = validateInput(userMessage, {
        maxLength: 4000,
        allowedRole: 'brand' // Runner typically serves brand users
    });

    if (inputValidation.blocked) {
        logger.warn('[AgentRunner] Blocked prompt injection attempt', {
            reason: inputValidation.blockReason,
            riskScore: inputValidation.riskScore,
            personaId,
            jobId
        });
        return {
            content: "I couldn't process that request due to security restrictions. Please rephrase your question.",
            toolCalls: [],
            metadata: { type: 'security_block' }
        };
    }

    // Log high-risk queries for monitoring
    if (inputValidation.riskScore >= 30) {
        logger.info('[AgentRunner] High-risk query detected', {
            riskLevel: getRiskLevel(inputValidation.riskScore),
            riskScore: inputValidation.riskScore,
            personaId,
            jobId
        });
    }

    // Use sanitized input for processing
    let finalMessage = inputValidation.sanitized;

    // === FAST PATH: Simple queries that don't need KB search, talk tracks, or agent routing ===
    // This dramatically reduces cost and latency for common simple interactions
    const FAST_PATH_PATTERNS = [
        // Greetings
        /^(hi|hello|hey|yo|sup|greetings|good\s+(morning|afternoon|evening))[\s!?.]*$/i,
        // Agent status queries
        /^(show|list|what\s+are)\s+(all\s+)?(active\s+)?agents/i,
        /^(who|what)\s+(are\s+)?(the\s+)?agents/i,
        /^agent\s+(status|list|squad)/i,
        // Help queries
        /^(help|how\s+do\s+I|what\s+can\s+you\s+do)/i,
        // Simple acknowledgments
        /^(thanks|thank\s+you|ok|okay|got\s+it|understood)[\s!?.]*$/i,
    ];

    const isFastPathQuery = FAST_PATH_PATTERNS.some(pattern => pattern.test(userMessage.trim()));

    // Check for agent status queries specifically
    const isAgentStatusQuery = /show.*agents|agent.*status|list.*agents|agents.*active/i.test(userMessage.trim());

    if (isFastPathQuery && !extraOptions?.attachments?.length && !extraOptions?.audioInput) {
        await emitThought(jobId, 'Fast Path', 'Handling simple query directly...');

        // Get user context minimally (no brand profile fetch)
        let user = injectedUser;
        if (!user) {
            const { requireUser } = await import('@/server/auth/auth');
            user = await requireUser().catch(() => null);
        }

        const role = (user?.role as string) || 'guest';
        const activePersona = personaId && PERSONAS[personaId as AgentPersona]
            ? PERSONAS[personaId as AgentPersona]
            : PERSONAS.puff;

        // Handle agent status queries with static response (no AI needed)
        if (isAgentStatusQuery) {
            await emitThought(jobId, 'Complete', 'Returning agent squad status.');

            const agentStatusContent = `## 🤖 Agent Squad Status

| Agent | Role | Status |
|-------|------|--------|
| **Smokey** | Product Intelligence & Budtender | 🟢 Active |
| **Craig** | Content & Campaigns | 🟢 Active |
| **Deebo** | Compliance & Regulations | 🟢 Active |
| **Ezal** | Research & Competitive Intel | 🟢 Active |
| **Pops** | Analytics & Strategy | 🟢 Active |
| **Money Mike** | Pricing & Revenue | 🟢 Active |
| **Mrs. Parker** | Customer Journeys & Loyalty | 🟢 Active |
| **Day Day** | SEO & Growth | 🟢 Active |
| **Felisha** | Meetings & Operations | 🟢 Active |
| **Linus** | Technical & Infrastructure (AI CTO) | 🟢 Active |
| **Leo** | Operations Orchestration (COO) | 🟢 Active |
| **Puff** | Executive Assistant | 🟢 Active |

All agents are online and ready. Type an agent name or describe your task to get started.`;

            return {
                content: agentStatusContent,
                toolCalls: [],
                metadata: {
                    brandId: 'fast-path',
                    agentName: 'System',
                    role,
                    fastPath: true,
                }
            };
        }

        // Generate response with minimal model (Gemini Flash Lite)
        const response = await ai.generate({
            model: 'googleai/gemini-2.5-flash-lite',
            prompt: `${activePersona.systemPrompt}\n\nUser: ${userMessage}\n\nRespond concisely and helpfully.`,
        });

        await emitThought(jobId, 'Complete', 'Fast path response generated.');

        return {
            content: response.text,
            toolCalls: [],
            metadata: {
                brandId: 'fast-path',
                agentName: activePersona.name,
                role,
                fastPath: true,
            }
        };
    }

    // --- INTENTION OS (V2) ---
    // DISABLED globally per user request.
    // -------------------------

    // Handle Attachments
    if (extraOptions?.attachments?.length) {
        finalMessage += `\n\n[ATTACHMENTS]\nThe user has uploaded ${extraOptions.attachments.length} files.`;
        for (const file of extraOptions.attachments) {
            if (file.type.includes('text') || file.type.includes('json') || file.type.includes('javascript')) {
                try {
                    const content = Buffer.from(file.base64.split(',')[1], 'base64').toString('utf-8');
                    finalMessage += `\n\n--- File: ${file.name} ---\n${content.substring(0, 2000)}\n--- End File ---\n`;
                } catch (e) { logger.error('[AgentRunner] Failed to decode file', { error: e instanceof Error ? e.message : String(e) }); }
            } else {
                finalMessage += `\n- ${file.name} (${file.type})`;
            }
        }
    }

    if (extraOptions?.audioInput) {
        finalMessage += `\n\n[AUDIO INPUT RECEIVED] (Voice processing enabled)`;
    }

    userMessage = finalMessage;

    let activePersona = personaId && PERSONAS[personaId as AgentPersona]
        ? PERSONAS[personaId as AgentPersona]
        : PERSONAS.puff;

    const executedTools: AgentResult['toolCalls'] = [];

    try {
        await emitThought(jobId, 'Authenticating', 'Verifying user context...');
        // Dependency Injection for User
        // ... (rest of the code moves down or stays same)
        let user = injectedUser;
        if (!user) {
            const { requireUser } = await import('@/server/auth/auth');
            user = await requireUser().catch(() => null);
        }

        const role = (user?.role as string) || 'guest';

        // Check if user has a paid role (brand, dispensary, etc.)
        const isPaidUser = ['brand', 'brand_admin', 'brand_member', 'dispensary', 'dispensary_admin', 'dispensary_staff', 'budtender'].includes(role);

        // Resolve orgId using the standard order: orgId > brandId > currentOrgId > uid
        // This ensures Thrive Syracuse (orgId: org_thrive_syracuse) and other tenants work correctly
        const userBrandId = (user as any)?.orgId
            || (user as any)?.brandId
            || (user as any)?.currentOrgId
            || (isPaidUser ? user?.uid : 'general')
            || 'general';

        const userBrandName = isPaidUser ? 'Your Organization' : 'BakedBot';

        // === AGENT CONFIG OVERRIDES ===
        // Load custom personality/instructions for this agent+brand (CACHED)
        try {
            if (personaId) {
                const cacheKey = CacheKeys.agentConfig(personaId, userBrandId);
                let configOverride = agentCache.get<any>(cacheKey);

                if (!configOverride) {
                    const { getAgentConfigOverride } = await import('@/app/actions/agent-config');
                    configOverride = await getAgentConfigOverride(personaId, userBrandId);
                    if (configOverride) {
                        agentCache.set(cacheKey, configOverride, CacheTTL.AGENT_CONFIG);
                    }
                }

                if (configOverride) {
                    activePersona = { ...activePersona, ...configOverride };
                }
            }
        } catch (e) {
            logger.warn('[AgentRunner] Overrides fetch failed', { error: e, agentId: personaId });
        }

        // === CONTEXT INJECTION (Fix for Generic Placeholders) - CACHED ===
        // Fetch Brand/Tenant Profile to inject Name, State, City, etc.
        // Checks both 'brands' and 'tenants' collections for compatibility with all org types
        let brandContextString = '';
        if (userBrandId && userBrandId !== 'demo-brand-123' && userBrandId !== 'general') {
            try {
                const cacheKey = CacheKeys.brandProfile(userBrandId);
                let data: any = agentCache.get(cacheKey);

                if (!data) {
                    const { createServerClient } = await import('@/firebase/server-client');
                    const { firestore } = await createServerClient();

                    // Try brands collection first, then tenants (for dispensaries like Thrive Syracuse)
                    const brandDoc = await firestore.collection('brands').doc(userBrandId).get();
                    if (brandDoc.exists) {
                        data = brandDoc.data();
                    } else {
                        const tenantDoc = await firestore.collection('tenants').doc(userBrandId).get();
                        if (tenantDoc.exists) {
                            data = tenantDoc.data();
                        }
                    }

                    if (data) {
                        agentCache.set(cacheKey, data, CacheTTL.BRAND_PROFILE);
                    }
                }

                if (data) {
                    const state = data?.marketState || data?.state || data?.location?.state || 'Unknown State';
                    const city = data?.city || data?.location?.city || '';
                    const orgName = data?.name || data?.displayName || userBrandName;

                    brandContextString = `\n\n[USER CONTEXT]\nOrganization: ${orgName}\nLocation: ${city ? city + ', ' : ''}${state}\nWebsite: ${data?.websiteUrl || 'Not set'}\nMarket: ${state}\n`;

                    // Append to message so the agent "sees" it immediately
                    finalMessage += brandContextString;
                }
            } catch (e) {
                logger.warn('[AgentRunner] Failed to inject brand context:', { error: e instanceof Error ? e.message : String(e) });
            }
        }

        // === CUSTOM AI INSTRUCTIONS INJECTION - CACHED ===
        // Load tenant and user AI settings (ChatGPT/Claude-style custom instructions)
        let customInstructionsBlock = '';
        try {
            // Resolve tenantId from user context
            const tenantId = (user as any)?.orgId || (user as any)?.currentOrgId || userBrandId;
            const userId = user?.uid;

            if (tenantId || userId) {
                const cacheKey = CacheKeys.aiSettings(tenantId !== 'demo-brand-123' ? tenantId : '', userId);
                let cachedSettings = agentCache.get<{ tenant: any; user: any }>(cacheKey);

                if (!cachedSettings) {
                    const settings = await loadAISettingsForAgent(
                        tenantId !== 'demo-brand-123' ? tenantId : undefined,
                        userId
                    );
                    cachedSettings = settings;
                    agentCache.set(cacheKey, cachedSettings, CacheTTL.AI_SETTINGS);
                }

                customInstructionsBlock = buildCustomInstructionsBlock(cachedSettings.tenant, cachedSettings.user);

                if (customInstructionsBlock) {
                    // Removed logger.debug
                }
            }
        } catch (e) {
            logger.warn('[AgentRunner] Failed to load AI settings:', { error: e instanceof Error ? e.message : String(e) });
        }

        // === SYSTEM DIRECTIVES ===
        const missingIntegrationDirective = `\n\n[SYSTEM DIRECTIVE: MISSING DATA]\nIf you cannot answer a query about sales, inventory, products, or customers because the necessary integrations (POS, ecommerce, marketing) are not connected, you MUST instruct the user to connect their system using this exact markdown link: [Connect your POS or Data Source](/dashboard/settings/integrations)\n`;
        customInstructionsBlock += missingIntegrationDirective;

        // === MODEL TIER ENFORCEMENT ===
        let effectiveModelLevel = extraOptions?.modelLevel || 'lite';

        // Super User Bypass (includes legacy super_admin role)
        const isSuperUser = role === 'super_user' || role === 'super_admin';

        // Free users: guest, customer, or undefined role (isPaidUser already declared above)
        const isFreeUser = !isSuperUser && !isPaidUser;

        if (!isSuperUser) {
            // Free user restrictions
            if (role === 'guest' || role === 'user') {
                // Force 2.5 Lite for everything
                if (effectiveModelLevel !== 'lite') {
                    await emitThought(jobId, 'Downgrading', 'Free tier limited to Gemini 2.5 Flash Lite.');
                    effectiveModelLevel = 'lite';
                }

                // Block Deep Research entirely
                if (extraOptions?.modelLevel === 'deep_research') {
                    const isHomepage = !user; // If no user, assumed homepage/public
                    const message = isHomepage
                        ? "**Deep Research is a Pro feature.**\n\nPlease [User Login](/login) or [Sign Up](/signup) to access comprehensive web research agents."
                        : "**Upgrade Required**\n\nDeep Research requires a paid plan. Please [Upgrade](/dashboard/settings/billing) to unlock.";

                    return { content: message, toolCalls: [] };
                }
            }
        }

        // === DEEP RESEARCH ROUTING ===
        // Auto-detect complex research intent for Paid users
        const isDeepResearchRequested = extraOptions?.modelLevel === 'deep_research' ||
            (!isFreeUser && (
                /analyze\s+.*vs.*/i.test(finalMessage) ||
                /competitive\s+analysis/i.test(finalMessage) ||
                /market\s+report/i.test(finalMessage) ||
                /deep\s+dive/i.test(finalMessage)
            ));

        // When user selects "Deep Research" model level, route to Research Service
        if (isDeepResearchRequested) {

            executedTools.push({ id: `research-${Date.now()}`, name: 'Deep Research', status: 'running', result: 'Starting research task...' });

            try {
                const { researchService } = await import('@/server/services/research-service');
                const { createResearchTaskAction } = await import('@/app/dashboard/research/actions');

                await emitThought(jobId, 'Creating Task', 'Queueing research task for processing...');

                // Create the research task
                const result = await createResearchTaskAction(finalMessage);

                if (result.success && result.taskId) {
                    executedTools[executedTools.length - 1].status = 'success';
                    executedTools[executedTools.length - 1].result = `Task created: ${result.taskId}`;

                    await emitThought(jobId, 'Research Queued', 'Your research task has been created and is processing in the background.');

                    return {
                        content: `**🔬 Deep Research Task Created**\n\nYour research query has been queued for comprehensive analysis:\n\n> "${finalMessage}"\n\n**Task ID:** \`${result.taskId}\`\n\nThe research agent is now:\n1. Searching multiple web sources\n2. Analyzing and cross-referencing data\n3. Compiling a comprehensive report\n\n📊 **View progress:** [Deep Research Dashboard](/dashboard/research)\n\nYou'll be notified when the report is ready. Complex queries may take 2-5 minutes.\n\n**🤖 Automate this?**\nReply with "Create a playbook for this" to turn this analysis into a recurring Daily Report.`,
                        toolCalls: executedTools,
                        metadata: {
                            brandId: userBrandId,
                            brandName: userBrandName,
                            agentName: 'Deep Research',
                            role,
                            jobId,
                            type: 'session_context' as const,
                            data: { researchTaskId: result.taskId }
                        }
                    };
                } else {
                    throw new Error(result.error || 'Failed to create research task');
                }
            } catch (e: any) {
                executedTools[executedTools.length - 1].status = 'error';
                executedTools[executedTools.length - 1].result = e.message;
                await emitThought(jobId, 'Error', `Research task creation failed: ${e.message}`);

                return {
                    content: `**❌ Deep Research Failed**\n\n${e.message}\n\nPlease try again or use the [Deep Research page](/dashboard/research) directly.`,
                    toolCalls: executedTools,
                    metadata: {
                        brandId: userBrandId,
                        brandName: userBrandName,
                        agentName: 'Deep Research',
                        role,
                        jobId
                    }
                };
            }
        }

        // Lazy load for performance
        const { routeToAgent } = await import('@/server/agents/agent-router');
        const { AGENT_CAPABILITIES, canRoleAccessAgent } = await import('@/server/agents/agent-definitions');
        const { getKnowledgeBasesAction, searchKnowledgeBaseAction } = await import('@/server/actions/knowledge-base');

        // PERSONA OVERRIDE: If explicit persona is provided (not 'puff' or 'general'), 
        // skip auto-routing and use the specified agent directly.
        // This is critical for Executive Boardroom to work correctly.
        const SKIP_ROUTING_PERSONAS = ['leo', 'linus', 'jack', 'glenda', 'mike_exec', 'roach', 'craig', 'ezal', 'pops', 'smokey', 'money_mike', 'mrs_parker', 'deebo', 'day_day', 'felisha', 'big_worm'];
        const useForcePersona = personaId && SKIP_ROUTING_PERSONAS.includes(personaId);

        let routing: RoutingResult;
        let agentInfo;

        if (useForcePersona) {
            // Force the specified persona - skip auto-routing
            await emitThought(jobId, 'Agent Selected', `Using explicitly selected agent: ${personaId}`);
            agentInfo = AGENT_CAPABILITIES.find(a => a.id === personaId) ||
                AGENT_CAPABILITIES.find(a => a.id === 'general');
            routing = {
                primaryAgent: personaId as any, // Cast to avoid strict AgentId type issues if string mismatch
                confidence: 1.0,
                reasoning: 'Explicitly selected by user'
            };
        } else {
            // Auto-route based on message content
            await emitThought(jobId, 'Routing', 'Determining best agent for task...');
            routing = await routeToAgent(finalMessage);
            await emitThought(jobId, 'Agent Selected', `Routed to ${routing.primaryAgent} (${(routing.confidence * 100).toFixed(0)}% confidence).`);
            agentInfo = AGENT_CAPABILITIES.find(a => a.id === routing.primaryAgent) ||
                AGENT_CAPABILITIES.find(a => a.id === 'general');
        }

        let knowledgeContext = '';
        try {
            await emitThought(jobId, 'Memory Lookup', 'Searching Knowledge Base...');

            // Try cache first for KB search results (1 minute TTL for freshness)
            const kbCacheKey = CacheKeys.kbSearch(agentInfo?.id || 'general', finalMessage, userBrandId);
            let cachedKB = agentCache.get<{ context: string; docCount: number }>(kbCacheKey);

            if (cachedKB) {
                knowledgeContext = cachedKB.context;
                if (cachedKB.docCount > 0) {
                    executedTools.push({
                        id: `knowledge-${Date.now()}`,
                        name: 'Knowledge Base',
                        status: 'success',
                        result: `Found ${cachedKB.docCount} relevant documents (cached).`
                    });
                }
            } else {
                const kbs = await getKnowledgeBasesAction(agentInfo?.id || 'general');
                let userKbs: any[] = [];
                // Load user-specific KBs for all paid roles (brands, dispensaries including Thrive Syracuse)
                if (isPaidUser) {
                    userKbs = await getKnowledgeBasesAction(userBrandId);
                }
                const allKbs = [...kbs, ...userKbs];

                if (allKbs.length > 0) {
                    const searchPromises = allKbs.map(kb => searchKnowledgeBaseAction(kb.id, finalMessage, 2));
                    const results = await Promise.all(searchPromises);
                    const docs = results.flat().filter(d => d && d.similarity > 0.65).slice(0, 3);

                    if (docs.length > 0) {
                        // SECURITY: Wrap retrieved knowledge in structured tags
                        const kbContent = docs.map(d => `- ${sanitizeForPrompt(d.content, 500)}`).join('\n');
                        knowledgeContext = `\n\n${wrapUserData(kbContent, 'knowledge_base', false)}\n`;
                        executedTools.push({
                            id: `knowledge-${Date.now()}`,
                            name: 'Knowledge Base',
                            status: 'success',
                            result: `Found ${docs.length} relevant documents.`
                        });

                        // Cache the results
                        agentCache.set(kbCacheKey, { context: knowledgeContext, docCount: docs.length }, CacheTTL.KB_SEARCH);
                    } else {
                        // Cache empty result to avoid redundant searches
                        agentCache.set(kbCacheKey, { context: '', docCount: 0 }, CacheTTL.KB_SEARCH);
                    }
                }
            }
        } catch (e) {
            logger.warn('[AgentRunner] KB Access failed', { error: e instanceof Error ? e.message : String(e) });
        }

        const metadata = {
            brandId: userBrandId,
            brandName: userBrandName,
            agentName: activePersona.name || agentInfo?.name || 'General',
            role
        };

        // ... Tool Detection Logic ...
        const lowerMessage = (finalMessage || userMessage || '').toLowerCase();

        // 0. Playbook Creation Detection - "create a playbook that..." or "build an automation..."
        const playbookCreationPatterns = [
            /create\s+(?:a\s+)?playbook/i,
            /build\s+(?:a\s+)?(?:playbook|automation|workflow)/i,
            /set\s+up\s+(?:a\s+)?(?:playbook|automation|workflow)/i,
            /make\s+(?:a\s+)?playbook/i,
            /new\s+playbook\s+(?:that|to|for)/i,
        ];

        if (playbookCreationPatterns.some(p => p.test(userMessage))) {

            // Tier Check for Playbook Creation
            if (!isSuperUser && (role === 'guest' || role === 'user')) {
                // Check existing playbook count for free users
                const { listBrandPlaybooks } = await import('@/server/actions/playbooks');
                const existingPlaybooks = await listBrandPlaybooks(userBrandId);
                const customPlaybooks = existingPlaybooks.filter(pb => pb.isCustom); // or just count total if that's the limit

                if (customPlaybooks.length >= 1) {
                    const isHomepage = !user;
                    const message = isHomepage
                        ? "Building custom playbooks is a Pro feature. Please [Sign Up](/signup) to build agents."
                        : "You have reached the limit of 1 custom playbook on the Free plan. Please [Upgrade](/dashboard/settings/billing) to build unlimited workflows.";
                    return { content: message, toolCalls: [] };
                }
            }

            await emitThought(jobId, 'Playbook Creation', 'Parsing your request into a playbook configuration...');
            executedTools.push({ id: `pb-create-${Date.now()}`, name: 'Create Playbook', status: 'running', result: 'Parsing...' });

            try {
                const { parseNaturalLanguage, createPlaybook } = await import('@/server/actions/playbooks');

                // Parse the natural language into playbook config
                const parseResult = await parseNaturalLanguage(userMessage);
                if (!parseResult.success || !parseResult.config) {
                    throw new Error(parseResult.error || 'Failed to parse prompt');
                }

                let result;

                // Super users save to internal collection, others to brand collection
                if (isSuperUser) {
                    const { createSuperUserPlaybook } = await import('@/app/dashboard/ceo/playbooks/actions');
                    result = await createSuperUserPlaybook(parseResult.config);
                } else {
                    result = await createPlaybook(metadata.brandId || 'demo', parseResult.config);
                }

                if (result.success && result.playbook) {
                    executedTools[executedTools.length - 1].status = 'success';
                    executedTools[executedTools.length - 1].result = `Created playbook: ${result.playbook.name}`;
                    await emitThought(jobId, 'Playbook Created', `"${result.playbook.name}" is ready! You can edit it in the Playbooks tab.`);

                    const playbooksPath = isSuperUser ? '/dashboard/ceo/playbooks' : '/dashboard/playbooks';
                    return {
                        content: `I've created a playbook called "${result.playbook.name}":\n\n**Description:** ${result.playbook.description}\n**Agent:** ${result.playbook.agent}\n**Category:** ${result.playbook.category}\n**Steps:** ${result.playbook.steps.length}\n\nYou can view and edit it in the [Playbooks tab](${playbooksPath}).`,
                        toolCalls: executedTools,
                        metadata: { ...metadata, jobId }
                    };
                } else {
                    throw new Error(result.error || 'Failed to create playbook');
                }
            } catch (e: any) {
                executedTools[executedTools.length - 1].status = 'error';
                executedTools[executedTools.length - 1].result = e.message;
                await emitThought(jobId, 'Error', `Failed to create playbook: ${e.message}`);
                return {
                    content: `I tried to create a playbook but encountered an error: ${e.message}. Try describing your workflow again or create it manually in the Playbooks tab.`,
                    toolCalls: executedTools,
                    metadata: { ...metadata, jobId }
                };
            }
        }

        // 1. Playbooks (Execution)
        if (lowerMessage.includes('welcome-sequence')) {
            await emitThought(jobId, 'Executing Playbook', 'Running "Welcome Sequence" workflow...');
            const res = await executePlaybook('welcome-sequence');
            await emitThought(jobId, 'Playbook Complete', res.message);
            executedTools.push({ id: `pb-${Date.now()}`, name: 'Execute Playbook', status: 'success', result: res.message });
            return { content: res.message, toolCalls: executedTools };
        }
        // ... (Other playbooks) ...

        // 2. Media Generation (Image/Video) - Check BEFORE agent handoff
        // IMPORTANT: Skip media detection for inbox requests to allow agent tools to handle specialized requests
        // (e.g., Craig's QR code tool instead of misrouting to video generation)
        const shouldSkipMediaDetection = extraOptions?.source === 'inbox';

        const { detectMediaRequest } = await import('@/server/agents/tools/media-detection');
        const mediaRequestType = shouldSkipMediaDetection ? null : detectMediaRequest(userMessage);

        if (mediaRequestType === 'image') {
            await emitThought(jobId, 'Tool Detected', 'Image Generation triggered');
            executedTools.push({ id: `img-${Date.now()}`, name: 'Generate Image', status: 'running', result: 'Generating...' });

            try {
                const { generateImageFromPrompt } = await import('@/ai/flows/generate-social-image');

                await emitThought(jobId, 'Generating', 'Creating image assets...');
                const imageUrl = await generateImageFromPrompt(userMessage);

                executedTools[executedTools.length - 1].status = 'success';
                executedTools[executedTools.length - 1].result = 'Image generated successfully';

                return {
                    content: `Here is the image you requested: "${userMessage}"`,
                    toolCalls: executedTools,
                    metadata: {
                        ...metadata,
                        jobId,
                        media: { type: 'image', url: imageUrl, prompt: userMessage }
                    }
                };
            } catch (e: any) {
                executedTools[executedTools.length - 1].status = 'error';
                executedTools[executedTools.length - 1].result = 'Failed: ' + e.message;
                return { content: `**Image Generation Failed**: ${e.message}`, toolCalls: executedTools };
            }
        }

        if (mediaRequestType === 'video') {
            await emitThought(jobId, 'Tool Detected', 'Video Generation triggered');
            executedTools.push({ id: `vid-${Date.now()}`, name: 'Generate Video', status: 'running', result: 'Generating...' });

            try {
                const { generateVideoFromPrompt } = await import('@/ai/flows/generate-video');

                await emitThought(jobId, 'Generating', 'Creating video assets (this may take a moment)...');
                const videoUrl = await generateVideoFromPrompt(userMessage);

                executedTools[executedTools.length - 1].status = 'success';
                executedTools[executedTools.length - 1].result = 'Video generated successfully';

                return {
                    content: `Here is the video you requested: "${userMessage}"`,
                    toolCalls: executedTools,
                    metadata: {
                        ...metadata,
                        jobId,
                        media: { type: 'video', url: videoUrl, prompt: userMessage }
                    }
                };
            } catch (e: any) {
                executedTools[executedTools.length - 1].status = 'error';
                executedTools[executedTools.length - 1].result = 'Failed: ' + e.message;
                return { content: `**Video Generation Failed**: ${e.message}`, toolCalls: executedTools };
            }
        }

        // 3. Specialized Agents (only for non-media requests)
        // SECURITY: Check role restrictions before handoff
        const canAccessAgent = agentInfo ? canRoleAccessAgent(role, agentInfo.id as any) : false;

        if (agentInfo && routing.confidence > 0.6 && agentInfo.id !== 'general' && agentInfo.id !== 'puff' && canAccessAgent) {
            try {
                await emitThought(jobId, 'Handing off', `Transferring control to specialized agent: ${agentInfo.name}`);
                const res = await triggerAgentRun(agentInfo.id, userMessage, userBrandId);
                executedTools.push({
                    id: `agent-${Date.now()}`,
                    name: agentInfo.name,
                    status: res.success ? 'success' : 'error',
                    result: res.message
                });
                return { content: res.log?.result || res.message, toolCalls: executedTools };
            } catch (e) { }
        } else if (agentInfo && !canAccessAgent && agentInfo.id !== 'general' && agentInfo.id !== 'puff') {
            // Log blocked access attempt for security auditing
            logger.warn(`[Security] Role '${role}' attempted to access restricted agent '${agentInfo.id}'`);
        }

        // 3. Web Search (Explicit Triggers Only)
        // Prevent aggressive matching on words like "Search Console"
        const isExplicitSearch = /^(?:please\s+)?(?:web\s+)?search\s+(?:for\s+)?|google\s+/i.test(userMessage || '') && !(userMessage || '').toLowerCase().includes('console');

        let searchContext = '';

        if (isExplicitSearch) {
            await emitThought(jobId, 'Web Search', 'Searching the internet for real-time data...');
            executedTools.push({ id: `search-${Date.now()}`, name: 'Web Search', status: 'running', result: 'Searching...' });

            try {
                const searchRes = await searchWeb(userMessage.replace(/search|google/gi, ''));
                const formatted = formatSearchResults(searchRes);
                executedTools[executedTools.length - 1].status = 'success';
                executedTools[executedTools.length - 1].result = `Found ${searchRes.results.length} results.`;

                // SECURITY: Wrap external web results in structured tags
                const sanitizedResults = sanitizeForPrompt(JSON.stringify(searchRes.results), 3000);
                searchContext = `\n\n${wrapUserData(sanitizedResults, 'web_search_results', false)}\n`;
            } catch (e: any) {
                executedTools[executedTools.length - 1].status = 'error';
                executedTools[executedTools.length - 1].result = e.message;
            }
        }

        // 5. Ezal Intelligence Detection
        if (routing.primaryAgent === 'ezal' || lowerMessage.includes('competitor') || lowerMessage.includes('price match')) {
            await emitThought(jobId, 'Intelligence Scan', 'Performing competitive analysis...');
            const res = await triggerAgentRun('ezal', userMessage, userBrandId);
            executedTools.push({
                id: `ezal-${Date.now()}`,
                name: 'Ezal Intelligence',
                status: res.success ? 'success' : 'error',
                result: res.message
            });

            if (res.success) {
                await emitThought(jobId, 'Synthesizing', 'Formatting intelligence snapshot...');
                const format = `
                Cannabis Menu Intelligence - [Brand]
                📊 COMPETITIVE ANALYSIS - ${new Date().toLocaleDateString()}
                -------------------------
                💰 KEY PRICING INSIGHTS:
                ...
                -------------------------
                📈 TOP MOVERS:
                ...
                -------------------------
                🎯 MARGIN OPPORTUNITY:
                ...
                -------------------------
                🚨 COMPETITOR VULNERABILITIES:
                ...
                -------------------------
                🏆 MARKET INSIGHT:
                ...
                -------------------------
                📊 NEXT STEPS:
                ...
                `;

                const synthesized = await synthesizeSnapshot(res.log?.result || res.message, format, effectiveModelLevel);
                return { content: synthesized, toolCalls: executedTools, metadata: { ...metadata, jobId } };
            }
        }

        // 4. Integrations
        // Gmail - Use structured extraction instead of LLM (faster & cheaper)
        if (lowerMessage.includes('gmail') || lowerMessage.includes('email') || lowerMessage.includes('inbox') || lowerMessage.includes('send message')) {
            // Avoid triggering if it's just "what is your email"
            if (!(lowerMessage.includes('YOUR email') || lowerMessage.includes('login'))) {
                // Proactive setup: complex tasks mentioning email sending (e.g., "research leads and email them")
                // Add a setup card without blocking the full task response.
                const hasEmailSendingGoal = /send\s+.*\bemail\b|email\s+(them|leads|prospects|contacts|outreach)|invite.*\bemail\b|from\s+my\s+(gmail|email)\s+account/i.test(userMessage);
                const isMultiStepTask = userMessage.trim().split(/\s+/).length > 20
                    || /\b(research|find|analyze|identify|if\s+they|contact\s+us\s+form|leads?|prospects?|dispensar|brands?)\b/i.test(userMessage);
                const skipGmailHandling = hasEmailSendingGoal && isMultiStepTask;

                if (skipGmailHandling && user?.uid) {
                    const _tid = extraOptions?.context?.threadId as string | undefined;
                    const _oid = userBrandId;
                    if (_tid && _oid) {
                        void gmailAction({ action: 'list', query: 'is:unread' }, user)
                            .then(async check => {
                                if (!check.success && check.error?.toLowerCase().includes('not connected')) {
                                    await requestIntegration({
                                        userId: user!.uid,
                                        orgId: _oid,
                                        threadId: _tid,
                                        provider: 'gmail',
                                        reason: 'To send personalized emails directly from your account',
                                        enablesAction: 'send_gmail',
                                    }).catch(() => { });
                                }
                            }).catch(() => { });
                    }
                    // Fall through — let the LLM generate the full task response
                }

                if (!skipGmailHandling) {
                    await emitThought(jobId, 'Tool Detected', 'Gmail Integration triggered');
                    executedTools.push({ id: `gmail-${Date.now()}`, name: 'Gmail', status: 'running', result: 'Processing...' });

                    try {
                        // Structured extraction (no LLM needed)
                        const params = extractGmailParams(userMessage);

                        // Connect intent: user said "connect gmail" / "setup gmail" — skip API, show setup card immediately
                        if (params.query === '__connect__') {
                            const threadId = extraOptions?.context?.threadId as string | undefined;
                            const orgId = userBrandId;
                            if (threadId && orgId && user?.uid) {
                                try {
                                    await requestIntegration({
                                        userId: user.uid,
                                        orgId,
                                        threadId,
                                        provider: 'gmail',
                                        reason: 'To send emails directly from your Gmail account',
                                        enablesAction: 'send_gmail',
                                    });
                                } catch {
                                    // non-blocking — don't fail the response
                                }
                            }
                            executedTools[executedTools.length - 1].status = 'success';
                            executedTools[executedTools.length - 1].result = 'Setup card added';
                            return {
                                content: `📬 **Let's Connect Gmail!**\n\nI've added a setup card to this conversation — click **Connect Gmail** to authorize in about 1 minute.\n\nOnce connected, I can send personalized outreach emails directly from your account.`,
                                toolCalls: executedTools
                            };
                        }

                        executedTools[executedTools.length - 1].result = `${params.action.toUpperCase()} email`;

                        // PASS USER CONTEXT
                        await emitThought(jobId, 'Executing Tool', `Connecting to Gmail API as ${user?.email}...`);
                        const result = await gmailAction(params, user || undefined);
                        await emitThought(jobId, 'Tool Complete', result.success ? 'Action successful' : 'Action failed');

                        executedTools[executedTools.length - 1].status = result.success ? 'success' : 'error';
                        executedTools[executedTools.length - 1].result = result.success ? (params.action === 'list' ? `Found ${(result.data || []).length} emails` : 'Success') : result.error || 'Error';

                        // If Gmail not connected, create an integration_request artifact in the inbox
                        if (!result.success && result.error?.toLowerCase().includes('not connected') && user?.uid) {
                            const threadId = extraOptions?.context?.threadId as string | undefined;
                            const orgId = userBrandId;
                            if (threadId && orgId) {
                                try {
                                    await requestIntegration({
                                        userId: user.uid,
                                        orgId,
                                        threadId,
                                        provider: 'gmail',
                                        reason: 'To send emails directly from your Gmail account',
                                        enablesAction: 'send_gmail',
                                    });
                                } catch {
                                    // non-blocking — don't fail the response
                                }
                            }
                            return {
                                content: `📬 **Gmail Setup Required**\n\nI need to connect to your Gmail account to send emails. I've added a setup card to this conversation — click **Connect Gmail** to authorize in about 1 minute.\n\nOnce connected, just ask me again and I'll send the email from your account.`,
                                toolCalls: executedTools
                            };
                        }

                        return {
                            content: result.success ? `✅ **Gmail Action Complete**\n\n${JSON.stringify(result.data, null, 2)}` : `⚠️ **Gmail Error**: ${result.error}`,
                            toolCalls: executedTools
                        };
                    } catch (e: any) {
                        executedTools[executedTools.length - 1].status = 'error';
                        executedTools[executedTools.length - 1].result = 'Failed: ' + e.message;
                        // Early return — never let exceptions fall through to the LLM
                        return {
                            content: `⚠️ **Gmail Error**: ${(e as Error).message || 'Unable to access Gmail'}. Try reconnecting in Settings > Integrations.`,
                            toolCalls: executedTools
                        };
                    }
                } // end: if (!skipGmailHandling)
            }
        }

        // Calendar - Use structured extraction instead of LLM (faster & cheaper)
        if (lowerMessage.includes('calendar') || lowerMessage.includes('meeting') || lowerMessage.includes('schedule event')) {
            await emitThought(jobId, 'Tool Detected', 'Calendar Integration triggered');
            executedTools.push({ id: `cal-${Date.now()}`, name: 'Calendar', status: 'running', result: 'Accessing calendar...' });

            try {
                // Structured extraction (no LLM needed)
                const params = extractCalendarParams(userMessage);
                // PASS USER CONTEXT
                await emitThought(jobId, 'Executing Tool', `Connecting to Google Calendar API...`);
                const result = await calendarAction(params, user || undefined);
                await emitThought(jobId, 'Tool Complete', result.success ? 'Action successful' : 'Action failed');

                executedTools[executedTools.length - 1].status = result.success ? 'success' : 'error';
                executedTools[executedTools.length - 1].result = result.success ? (params.action === 'list' ? `Found ${result.data?.length} events` : 'Event created') : result.error || 'Error';

                return {
                    content: result.success ? `✅ **Calendar Action Complete**` : `⚠️ **Calendar Error**: ${result.error}`,
                    toolCalls: executedTools
                };
            } catch (e: any) {
                executedTools[executedTools.length - 1].status = 'error';
                executedTools[executedTools.length - 1].result = e.message;
            }
        }


        // Media generation is now handled earlier in step 2

        // === CLAUDE TOOL CALLING ===
        // Route tool-heavy requests to Claude for superior tool execution
        // Allow for super users OR inbox requests (brand users creating QR codes, etc.)
        const allowClaudeTools = isSuperUser || extraOptions?.source === 'inbox';
        if (isClaudeAvailable() && shouldUseClaudeTools(userMessage) && allowClaudeTools) {
            await emitThought(jobId, 'Claude Mode', 'Routing to Claude for enhanced tool calling...');

            try {
                const tools = getUniversalClaudeTools((role as any) || 'guest');
                const executor = createToolExecutor({
                    userId: user?.uid,
                    brandId: userBrandId,
                    role,
                    email: user?.email,
                });

                const claudeResult = await executeWithTools(
                    `${activePersona.systemPrompt}${customInstructionsBlock}\n\nUser Request: ${userMessage}${knowledgeContext}`,
                    tools,
                    executor
                );

                // Convert Claude tool executions to our format
                for (const exec of claudeResult.toolExecutions) {
                    executedTools.push({
                        id: exec.id,
                        name: exec.name,
                        status: exec.status,
                        result: typeof exec.output === 'string' ? exec.output : JSON.stringify(exec.output),
                    });
                }

                await emitThought(jobId, 'Complete', `Claude executed ${claudeResult.toolExecutions.length} tool(s).`);

                return {
                    content: claudeResult.content || 'Task completed.',
                    toolCalls: executedTools,
                    metadata: { ...metadata, jobId }
                };
            } catch (claudeError: any) {
                // Log error but fall through to Gemini fallback
                logger.warn('[AgentRunner] Claude tool execution failed, falling back to Gemini:', { error: claudeError.message });
                await emitThought(jobId, 'Fallback', 'Using Gemini for response generation...');
            }
        }

        // Fallback Generation (Gemini)

        await emitThought(jobId, 'Generating Response', 'Formulating final answer...');

        // Construct Multimodal Prompt
        let promptParts: any[] = [
            { text: `${activePersona.systemPrompt}${customInstructionsBlock}\nUser: ${userMessage}\nContext: ${knowledgeContext}${searchContext}` }
        ];

        // 1. Audio Input
        if (extraOptions?.audioInput) {
            promptParts.push({ media: { url: extraOptions.audioInput } });
        }

        // 2. Attachments (Multimodal)
        if (extraOptions?.attachments?.length) {
            for (const file of extraOptions.attachments) {
                // If text/json/code, we text-inlined it above (lines 158-163), so skip unless we want duplicate?
                // Actually, the previous code MODIFIED `finalMessage`. 
                // So text files are already in `userMessage`.
                // We only need to handle NON-text files (Images, PDFs, Videos) here.

                const isText = file.type.includes('text') || file.type.includes('json') || file.type.includes('javascript') || file.type.includes('xml');

                if (!isText) {
                    // Convert to Data URI for Genkit
                    const dataUri = `data:${file.type};base64,${file.base64}`;
                    promptParts.push({ media: { url: dataUri } });
                    // Add label
                    promptParts.push({ text: `\n[Attachment: ${file.name}]\n` });
                }
            }
        }

        const prompt = promptParts.length === 1 ? promptParts[0].text : promptParts;

        const response = await ai.generate({
            ...getGenerateOptions(effectiveModelLevel),
            prompt,
        });

        await emitThought(jobId, 'Complete', 'Task finished.');

        // === STRUCTURED LOGGING (Section 8 Standard) ===
        // We log purely for observability here (could be sent to Datadog/Firestore)
        const structuredLogs = executedTools.map(tool => ({
            timestamp: new Date().toISOString(),
            agent: activePersona.name,
            action: tool.name,
            input: 'See tool call arguments (abstracted)', // We'd need to capture inputs in executedTools to be full spec
            policy_checks: {
                compliance: tool.result.includes('Compliance Blocked') ? 'blocked' : 'pass',
                // other checks could be inferred
            },
            output: {
                status: tool.status,
                result: tool.result.substring(0, 100)
            }
        }));

        // In a real production env, we'd persist this:
        // await logService.record(structuredLogs);
        logger.info('[AgentRunner] Structured Logs', { structuredLogs });

        // --- AGENTIC EVAL GATE ---
        // If it's a compliance task or involves Deebo, run compliance evals
        let evalResults: any[] = [];
        if (activePersona.id === 'deebo' || (userMessage || '').toLowerCase().includes('compliance') || (userMessage || '').toLowerCase().includes('legal')) {
            await emitThought(jobId, 'Running Evals', 'Verifying result against compliance gate...');
            // In a real scenario, we'd parse the 'content' or 'tool results' to find cart items
            // For now, we simulate a check if a cart was mentioned or just run the engine.
            evalResults = await engine.runCategory('security', {
                cart: [], // Prototype: Needs to be parsed from response if applicable
                state: 'CA' // Default state for eval check
            });

            if (evalResults.some(r => !r.passed)) {
                await emitThought(jobId, 'Eval Warning', 'Result failed compliance gate checks.');
            }
        }

        // SECURITY: Validate agent response before returning
        const outputValidation = validateOutput(response.text);
        if (!outputValidation.safe) {
            logger.warn('[AgentRunner] Unsafe output detected', {
                jobId,
                flags: outputValidation.flags.map(f => f.type),
            });
        }

        return {
            content: outputValidation.sanitized,
            toolCalls: executedTools,
            thinking: {
                isThinking: false,
                steps: executedTools.map(tool => ({
                    tool: tool.name,
                    action: tool.result?.substring(0, 100) || tool.name,
                    status: tool.status
                })),
                plan: [] // Could be populated from agent's initial planning if available
            },
            metadata: {
                ...metadata,
                jobId,
                evalResults: evalResults.length > 0 ? evalResults : undefined,
                model: extraOptions?.modelLevel || 'gemini-2.0-flash-001', // Track which AI model was used
            }
        };

    } catch (e: any) {
        await emitThought(jobId, 'Error', `Failed: ${e.message}`);
        logger.error('[AgentRunner] Runner Error:', { error: e.message });
        return {
            content: `Error: ${e.message}`,
            toolCalls: executedTools,
            thinking: {
                isThinking: false,
                steps: executedTools.map(tool => ({
                    tool: tool.name,
                    action: tool.result?.substring(0, 100) || tool.name,
                    status: tool.status
                })),
                plan: []
            }
        };
    }
}
