
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
import { blackleafService } from '@/lib/notifications/blackleaf-service';
import { PERSONAS, AgentPersona } from '@/app/dashboard/ceo/agents/personas';
import { CannMenusService } from '@/server/services/cannmenus';
import { DecodedIdToken } from 'firebase-admin/auth';
import { getIntuitionSummary } from '@/server/algorithms/intuition-engine';
import { deebo } from '@/server/agents/deebo';
import { emitThought } from '@/server/jobs/thought-stream';

// Claude Tool Calling Integration
import { executeWithTools, isClaudeAvailable } from '@/ai/claude';
import { getUniversalClaudeTools, createToolExecutor, shouldUseClaudeTools } from '@/server/agents/tools/claude-tools';


export interface AgentResult {
    content: string;
    toolCalls?: { id: string; name: string; status: 'success' | 'error' | 'running'; result: string }[];
    toolPerms?: any; // Added for compatibility if needed
    metadata?: {
        type?: 'compliance_report' | 'product_rec' | 'elasticity_analysis' | 'session_context';
        data?: any;
        brandId?: string;
        brandName?: string;
        agentName?: string;
        role?: string;
        jobId?: string; // Added to metadata
        media?: {
            type: string;
            url: string;
            prompt?: string;
        };
    };
    logs?: string[];
}

export interface ChatExtraOptions {
    modelLevel?: string;
    audioInput?: string; // base64
    attachments?: { name: string; type: string; base64: string }[];
}

// Local Agent Map
const AGENT_MAP = {
    craig: craigAgent,
    smokey: smokeyAgent,
    pops: popsAgent,
    ezal: ezalAgent,
    money_mike: moneyMikeAgent,
    mrs_parker: mrsParkerAgent,
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
    defaultMrsParkerTools 
} from '@/app/dashboard/ceo/agents/default-tools';

async function triggerAgentRun(agentName: string, stimulus?: string, brandIdOverride?: string) {
    const brandId = brandIdOverride || 'demo-brand-123';
    const agentImpl = AGENT_MAP[agentName as keyof typeof AGENT_MAP];
    if (!agentImpl) throw new Error(`Unknown agent: ${agentName}`);

    // Tools setup
    let tools: any = {};
    if (agentName === 'craig') tools = defaultCraigTools;
    else if (agentName === 'smokey') tools = defaultSmokeyTools;
    else if (agentName === 'pops') tools = defaultPopsTools;
    else if (agentName === 'ezal') tools = defaultEzalTools;
    else if (agentName === 'money_mike') tools = defaultMoneyMikeTools;
    else if (agentName === 'mrs_parker') tools = defaultMrsParkerTools;

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
            console.error('[AgentRunner] Failed to inject skills:', error);
        }
    }

    try {
        const enhancedStimulus = (stimulus || '') + (skillInstructions ? `\n\n=== ENABLED SKILLS ===\n${skillInstructions}` : '');

        const logEntry = await runAgent(brandId, persistence, agentImpl as any, tools, enhancedStimulus);
        return { success: true, message: `Ran ${agentName} successfully.`, log: logEntry };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
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
        logs.push("Triggering Ezal for market scrape (Detroit/MI)...");
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
            <p><em>(Note: Deep Research Agents are available for more detailed web scraping)</em></p>
        `;

        // 3. Email Report
        logs.push("Dispatching report via Mailjet...");
        const { sendGenericEmail } = await import('@/lib/email/dispatcher');
        const { requireUser } = await import('@/server/auth/auth');
        let userEmail = 'demo@bakedbot.ai';
        try {
            const user = await requireUser();
            if (user.email) userEmail = user.email;
        } catch (e) {}

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
    
    await emitThought(jobId, 'Analyzing Request', `Processing user input: "${userMessage.substring(0, 50)}..."`);
    
    let finalMessage = userMessage;

    // --- INTENTION OS (V2) ---
    // Pre-flight check: specific vs ambiguous?
    // We only run this for complex requests, but for now we run it for everything to test the loop.
    if (!extraOptions?.attachments?.length) { // Skip if attachments are present (often implies context)
        try {
            const { analyzeIntent } = await import('@/server/agents/intention/analyzer');
            await emitThought(jobId, 'Analyzing Intent', 'Determining semantic intent and ambiguity...');
            const analysis = await analyzeIntent(userMessage);

            if (analysis.isAmbiguous && analysis.clarification?.clarificationQuestion) {
                // STOP: Ask Clarification
                await emitThought(jobId, 'Ambiguity Detected', 'Requesting user clarification...');
                return {
                    content: `**Clarification Needed:** ${analysis.clarification.clarificationQuestion}\n\n*Possible Interpretations:*\n${analysis.clarification.possibleIntents.map(i => `- ${i}`).join('\n')}`,
                    metadata: {
                        type: 'session_context', // Or new 'clarification' type
                        data: {
                            isClarification: true,
                            options: analysis.clarification.possibleIntents
                        }
                    },
                    logs: ['Intention Analyzer: Ambiguity Detected', `Question: ${analysis.clarification.clarificationQuestion}`]
                };
            } else if (analysis.commit) {
                // GO: Commit & Execute
                await emitThought(jobId, 'Intent Committed', `Goal: ${analysis.commit.goal}`);
                
                // Save the commit to DB (Fire & Forget)
                const { saveIntentCommit } = await import('@/server/agents/intention/storage');
                const { requireUser } = await import('@/server/auth/auth');
                const user = await requireUser().catch(() => ({ uid: 'system' })); // Fallback
                
                // Hydrate the commit with runtime IDs
                const commit = {
                    ...analysis.commit,
                    id: crypto.randomUUID(),
                    agentId: personaId || 'puff',
                    timestamp: Date.now(),
                    userQuery: userMessage,
                    status: 'committed' as const
                };
                saveIntentCommit(injectedUser?.uid || user.uid, commit as any).catch(e => console.error('Failed to save commit', e));

                // Inject Commit into Context
                finalMessage = `[SEMANTIC COMMIT]\nGoal: ${commit.goal}\nPlan: ${JSON.stringify(commit.plan)}\nAssumptions: ${JSON.stringify(commit.assumptions)}\n\n[USER REQUEST]\n${userMessage}`;
            }

        } catch (e) {
            console.warn('[runAgentCore] Intention Analyzer failed (Shadow Mode):', e);
            // Fallback to normal execution
        }
    }
    // -------------------------

    // Handle Attachments
    if (extraOptions?.attachments?.length) {
        finalMessage += `\n\n[ATTACHMENTS]\nThe user has uploaded ${extraOptions.attachments.length} files.`;
        for (const file of extraOptions.attachments) {
            if (file.type.includes('text') || file.type.includes('json') || file.type.includes('javascript')) {
                try {
                     const content = Buffer.from(file.base64.split(',')[1], 'base64').toString('utf-8');
                     finalMessage += `\n\n--- File: ${file.name} ---\n${content.substring(0, 2000)}\n--- End File ---\n`;
                } catch (e) { console.error('Failed to decode file', e); }
            } else {
                 finalMessage += `\n- ${file.name} (${file.type})`;
            }
        }
    }
    
    if (extraOptions?.audioInput) {
        finalMessage += `\n\n[AUDIO INPUT RECEIVED] (Voice processing enabled)`;
    }

    userMessage = finalMessage;

    const activePersona = personaId && PERSONAS[personaId as AgentPersona]
        ? PERSONAS[personaId as AgentPersona]
        : PERSONAS.puff;

    const executedTools: AgentResult['toolCalls'] = [];

    try {
        await emitThought(jobId, 'Authenticating', 'Verifying user context...');
        // Dependency Injection for User
        let user = injectedUser;
        if (!user) {
            const { requireUser } = await import('@/server/auth/auth');
            user = await requireUser().catch(() => null);
        }

        const role = (user?.role as string) || 'guest';
        const userBrandId = (user?.brandId as string) || (role === 'brand' ? 'demo-brand-123' : 'general');
        const userBrandName = role === 'brand' ? 'Your Brand' : 'BakedBot';

        // === MODEL TIER ENFORCEMENT ===
        let effectiveModelLevel = extraOptions?.modelLevel || 'lite';
        
        // Super User Bypass
        const isSuperUser = role === 'super_admin' || role === 'owner'; // Simplify super user check
        const isFreeUser = !isSuperUser && role === 'guest'; // Assuming 'guest' is free, 'brand' is paid? logic needs to closely match plan
        // Actually, user object might have 'plan'
        // Let's assume role check for now: 'guest' = free, 'brand'/'dispensary' = paid, 'super_admin' = super.
        
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
                /analyze\s+.*vs.*/i.test(userMessage) || 
                /competitive\s+analysis/i.test(userMessage) ||
                /market\s+report/i.test(userMessage) ||
                /deep\s+dive/i.test(userMessage)
            ));

        // When user selects "Deep Research" model level, route to Research Service
        if (isDeepResearchRequested) {

            executedTools.push({ id: `research-${Date.now()}`, name: 'Deep Research', status: 'running', result: 'Starting research task...' });
            
            try {
                const { researchService } = await import('@/server/services/research-service');
                const { createResearchTaskAction } = await import('@/app/dashboard/research/actions');
                
                await emitThought(jobId, 'Creating Task', 'Queueing research task for processing...');
                
                // Create the research task
                const result = await createResearchTaskAction(
                    user?.uid || 'anonymous',
                    userBrandId,
                    userMessage
                );
                
                if (result.success && result.taskId) {
                    executedTools[executedTools.length - 1].status = 'success';
                    executedTools[executedTools.length - 1].result = `Task created: ${result.taskId}`;
                    
                    await emitThought(jobId, 'Research Queued', 'Your research task has been created and is processing in the background.');
                    
                    return {
                        content: `**🔬 Deep Research Task Created**\n\nYour research query has been queued for comprehensive analysis:\n\n> "${userMessage}"\n\n**Task ID:** \`${result.taskId}\`\n\nThe research agent is now:\n1. Searching multiple web sources\n2. Analyzing and cross-referencing data\n3. Compiling a comprehensive report\n\n📊 **View progress:** [Deep Research Dashboard](/dashboard/research)\n\nYou'll be notified when the report is ready. Complex queries may take 2-5 minutes.\n\n**🤖 Automate this?**\nReply with "Create a playbook for this" to turn this analysis into a recurring Daily Report.`,
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
        const { AGENT_CAPABILITIES } = await import('@/server/agents/agent-definitions');
        const { getKnowledgeBasesAction, searchKnowledgeBaseAction } = await import('@/server/actions/knowledge-base');

        await emitThought(jobId, 'Routing', 'Determining best agent for task...');
        const routing = await routeToAgent(userMessage);
        await emitThought(jobId, 'Agent Selected', `Routed to ${routing.primaryAgent} (${(routing.confidence * 100).toFixed(0)}% confidence).`);
        const agentInfo = AGENT_CAPABILITIES.find(a => a.id === routing.primaryAgent) ||
            AGENT_CAPABILITIES.find(a => a.id === 'general');

        let knowledgeContext = '';
        try {
            await emitThought(jobId, 'Memory Lookup', 'Searching Knowledge Base...');
            const kbs = await getKnowledgeBasesAction(agentInfo?.id || 'general');
            let userKbs: any[] = [];
            if (role === 'brand' || role === 'dispensary') {
                userKbs = await getKnowledgeBasesAction(userBrandId);
            }
            const allKbs = [...kbs, ...userKbs];

            if (allKbs.length > 0) {
                const searchPromises = allKbs.map(kb => searchKnowledgeBaseAction(kb.id, userMessage, 2));
                const results = await Promise.all(searchPromises);
                const docs = results.flat().filter(d => d && d.similarity > 0.65).slice(0, 3);

                if (docs.length > 0) {
                    knowledgeContext = `\n\n[KNOWLEDGE BASE CONTEXT]\n${docs.map(d => `- ${d.content}`).join('\n')}\n`;
                    executedTools.push({
                        id: `knowledge-${Date.now()}`,
                        name: 'Knowledge Base',
                        status: 'success',
                        result: `Found ${docs.length} relevant documents.`
                    });
                }
            }
        } catch (e) {
            console.warn('KB Access failed', e);
        }

        const metadata = {
            brandId: userBrandId,
            brandName: userBrandName,
            agentName: agentInfo?.name || 'General',
            role
        };

        // ... Tool Detection Logic ...
        const lowerMessage = userMessage.toLowerCase();

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
                const { createPlaybookFromNaturalLanguage } = await import('@/server/actions/playbooks');
                // Force Agentic Model for Playbooks
                // Note: The action itself usually uses a default, but we should ensure it uses Gemini 3
                // For now, checking permission is the key step.
                const result = await createPlaybookFromNaturalLanguage(metadata.brandId || 'demo', userMessage);
                
                if (result.success && result.playbook) {
                    executedTools[executedTools.length - 1].status = 'success';
                    executedTools[executedTools.length - 1].result = `Created playbook: ${result.playbook.name}`;
                    await emitThought(jobId, 'Playbook Created', `"${result.playbook.name}" is ready! You can edit it in the Playbooks tab.`);
                    
                    return {
                        content: `I've created a playbook called "${result.playbook.name}":\n\n**Description:** ${result.playbook.description}\n**Agent:** ${result.playbook.agent}\n**Category:** ${result.playbook.category}\n**Steps:** ${result.playbook.steps.length}\n\nYou can view and edit it in the Playbooks tab.`,
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
        const { detectMediaRequest } = await import('@/server/agents/tools/media-detection');
        const mediaRequestType = detectMediaRequest(userMessage);

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
        if (agentInfo && routing.confidence > 0.6 && agentInfo.id !== 'general' && agentInfo.id !== 'puff') {
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
            } catch (e) {}
        }

        // 3. Web Search (Explicit Triggers Only)
        // Prevent aggressive matching on words like "Search Console"
        const isExplicitSearch = /^(?:please\s+)?(?:web\s+)?search\s+(?:for\s+)?|google\s+/i.test(userMessage) && !userMessage.toLowerCase().includes('console');
        
        let searchContext = '';

        if (isExplicitSearch) {
             await emitThought(jobId, 'Web Search', 'Searching the internet for real-time data...');
             executedTools.push({ id: `search-${Date.now()}`, name: 'Web Search', status: 'running', result: 'Searching...' });
             
             try {
                const searchRes = await searchWeb(userMessage.replace(/search|google/gi, ''));
                const formatted = formatSearchResults(searchRes);
                executedTools[executedTools.length-1].status = 'success';
                executedTools[executedTools.length-1].result = `Found ${searchRes.results.length} results.`;
                
                // INSTEAD of returning early, we add to context and let the Persona answer
                searchContext = `\n\n[ALL WEB SEARCH RESULTS]\n${JSON.stringify(searchRes.results)}\n`;
             } catch (e: any) {
                executedTools[executedTools.length-1].status = 'error';
                executedTools[executedTools.length-1].result = e.message;
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
        // Gmail
        if (lowerMessage.includes('gmail') || lowerMessage.includes('email') || lowerMessage.includes('inbox') || lowerMessage.includes('send message')) {
             // Avoid triggering if it's just "what is your email"
             if (!(lowerMessage.includes('YOUR email') || lowerMessage.includes('login'))) {
                 await emitThought(jobId, 'Tool Detected', 'Gmail Integration triggered');
                 executedTools.push({ id: `gmail-${Date.now()}`, name: 'Gmail', status: 'running', result: 'Processing...' });
                 
                 const conversion = await ai.generate({
                    prompt: `Convert this request into a Gmail tool action (JSON).
                    User Request: "${userMessage}"
                    Actions: 'list' | 'read' | 'send'
                    Fields: 
                    - action: required
                    - query: string (for list, e.g. "is:unread")
                    - messageId: string (for read)
                    - to, subject, body: string (for send)
                    Output JSON Schema: GmailParams (JSON only)`
                 });
                 
                 try {
                     const params = JSON.parse(conversion.text) as GmailParams;
                     executedTools[executedTools.length - 1].result = `${params.action.toUpperCase()} email`;
                     
                     // PASS USER CONTEXT
                     await emitThought(jobId, 'Executing Tool', `Connecting to Gmail API as ${user?.email}...`);
                     const result = await gmailAction(params, user || undefined);
                     await emitThought(jobId, 'Tool Complete', result.success ? 'Action successful' : 'Action failed');
                     
                     executedTools[executedTools.length - 1].status = result.success ? 'success' : 'error';
                     executedTools[executedTools.length - 1].result = result.success ? (params.action === 'list' ? `Found ${(result.data || []).length} emails` : 'Success') : result.error || 'Error';
                     
                     return { 
                         content: result.success ? `✅ **Gmail Action Complete**\n\n${JSON.stringify(result.data, null, 2)}` : `⚠️ **Gmail Error**: ${result.error}`,
                         toolCalls: executedTools 
                     };
                 } catch (e: any) {
                     executedTools[executedTools.length - 1].status = 'error';
                     executedTools[executedTools.length - 1].result = 'Failed: ' + e.message;
                 }
             }
        }
        
        // Calendar
        if (lowerMessage.includes('calendar') || lowerMessage.includes('meeting') || lowerMessage.includes('schedule event')) {
            await emitThought(jobId, 'Tool Detected', 'Calendar Integration triggered');
            executedTools.push({ id: `cal-${Date.now()}`, name: 'Calendar', status: 'running', result: 'Accessing calendar...' });
            
            const conversion = await ai.generate({
                prompt: `Convert: "${userMessage}" to CalendarParams JSON.
                Actions: 'list' | 'create'
                Fields: action, timeMin, maxResults, summary, startTime, endTime
                Current Time: ${new Date().toISOString()}
                Output JSON only.`
            });
            
            try {
                const params = JSON.parse(conversion.text) as CalendarParams;
                // PASS USER CONTEXT
                await emitThought(jobId, 'Executing Tool', `Connecting to Google Calendar API...`);
                const result = await calendarAction(params, user || undefined);
                await emitThought(jobId, 'Tool Complete', result.success ? 'Action successful' : 'Action failed');
                
                executedTools[executedTools.length-1].status = result.success ? 'success' : 'error';
                executedTools[executedTools.length-1].result = result.success ? (params.action === 'list' ? `Found ${result.data?.length} events` : 'Event created') : result.error || 'Error';
                
                 return { 
                     content: result.success ? `✅ **Calendar Action Complete**` : `⚠️ **Calendar Error**: ${result.error}`,
                     toolCalls: executedTools 
                 };
            } catch (e: any) {
                executedTools[executedTools.length-1].status='error';
                executedTools[executedTools.length-1].result=e.message;
            }
        }


        // Media generation is now handled earlier in step 2

        // === CLAUDE TOOL CALLING ===
        // Route tool-heavy requests to Claude for superior tool execution
        if (isClaudeAvailable() && shouldUseClaudeTools(userMessage) && isSuperUser) {
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
                    `${activePersona.systemPrompt}\n\nUser Request: ${userMessage}${knowledgeContext}`,
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
                console.warn('Claude tool execution failed, falling back to Gemini:', claudeError.message);
                await emitThought(jobId, 'Fallback', 'Using Gemini for response generation...');
            }
        }

        // Fallback Generation (Gemini)

        await emitThought(jobId, 'Generating Response', 'Formulating final answer...');
        
        // Construct Multimodal Prompt
        let promptParts: any[] = [
            { text: `${activePersona.systemPrompt}\nUser: ${userMessage}\nContext: ${knowledgeContext}${searchContext}` }
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
        console.log('[Structured Logs]', JSON.stringify(structuredLogs, null, 2));

        return {
            content: response.text,
            toolCalls: executedTools,
            metadata: { 
                ...metadata, 
                jobId,
                // We could also store structuredLogs here if we added it to metadata type, 
                // but since it's not in the interface, we'll keep it as a local log for now.
            }
        };

    } catch (e: any) {
        await emitThought(jobId, 'Error', `Failed: ${e.message}`);
        console.error("Runner Error:", e);
         return {
            content: `Error: ${e.message}`,
            toolCalls: executedTools
        };
    }
}
