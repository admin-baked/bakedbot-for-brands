/**
 * Marty Benjamins - AI CEO
 *
 * The top of the BakedBot org chart. Manages everything, ensures everything
 * is working, and drives the company toward $1M ARR within 12 months.
 *
 * Responsibilities:
 * - Strategic direction & North Star alignment
 * - Executive team oversight (Leo, Linus, Jack, Glenda, Mike)
 * - KPI/OKR monitoring & unblocking
 * - Revenue growth acceleration
 * - Partnership & investor readiness
 * - Emergency escalation (only codes if absolutely necessary)
 *
 * Slack: Personal DM access for super users
 * Access: Super User only — highest autonomy level
 */

import { AgentImplementation } from './harness';
import { ExecutiveMemory } from './schemas';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import {
    contextOsToolDefs,
    lettaToolDefs,
    intuitionOsToolDefs,
    executiveContextToolDefs,
    AllSharedTools,
    ExecutiveContextTools,
    semanticSearchToolDefs,
    makeSemanticSearchToolsImpl
} from './shared-tools';
import {
    buildSquadRoster,
    getDelegatableAgentIds,
    AgentId
} from './agent-definitions';
import { buildIntegrationStatusSummaryForOrg } from '@/server/services/org-integration-status';
import { executeWithTools, isClaudeAvailable, type ClaudeResult } from '@/ai/claude';
import { executeGLMWithTools, GLM_MODELS, isGLMConfigured } from '@/ai/glm';
import { executeGeminiFlashWithTools, isGeminiFlashConfigured } from '@/ai/gemini-flash-tools';

const GLM_REFUSAL_PATTERNS = [
    'security restrictions',
    "i'm unable to assist",
    'i cannot assist',
    'violates our policy',
    'due to content restrictions',
    'content policy',
    'i am unable to help',
    'cannot help with',
];

/** If GLM executed tools, it didn't truly refuse — the content is usable. */
function isGLMRefusal(result: ClaudeResult): boolean {
    if (!result.content) return false;
    if (result.toolExecutions && result.toolExecutions.length > 0) return false;
    return GLM_REFUSAL_PATTERNS.some(p => result.content.toLowerCase().includes(p));
}

export interface MartyTools extends Partial<AllSharedTools>, Partial<ExecutiveContextTools> {
    // Full Executive delegation
    delegateTask?(personaId: string, task: string, context?: any): Promise<any>;
    broadcastToSquad?(message: string, agentIds: string[]): Promise<any>;
    getAgentStatus?(agentId?: string): Promise<any>;

    // CEO-level oversight
    getSystemHealth?(): Promise<any>;
    getActivePlaybooks?(): Promise<any>;
    crmListUsers?(search?: string, lifecycleStage?: string, limit?: number): Promise<any>;
    crmGetStats?(): Promise<any>;

    // Communication & productivity
    sendEmail?(to: string, subject: string, content: string): Promise<any>;
    driveUploadFile?(name: string, content: string, mimeType: string): Promise<any>;

    // RTRvr Browser Agent (full access)
    rtrvrAgent?(prompt: string, options?: any): Promise<any>;
    rtrvrScrape?(url: string): Promise<any>;

    // Playbook & workflow management
    createPlaybook?(name: string, description: string, steps: any[], schedule?: string): Promise<any>;
    executeWorkflow?(workflowId: string, inputs?: any): Promise<any>;

    // Shell access (emergency only — CEO doesn't code)
    bashExecute?(command: string, cwd?: string, timeout?: number): Promise<any>;

    // MCP bridge
    use_mcp_tool?(serverName: string, toolName: string, args: any): Promise<any>;

    // Browser automation (full suite)
    'browserSession.create'?(options?: { taskDescription?: string; initialUrl?: string }): Promise<any>;
    'browserSession.navigate'?(url: string): Promise<any>;
    'browserSession.interact'?(action: 'click' | 'type' | 'scroll', selector: string, value?: string): Promise<any>;
    'browserSession.screenshot'?(): Promise<any>;
    'browserSession.runWorkflow'?(workflowId: string, variables?: Record<string, string>): Promise<any>;

    // Executive calendar
    scheduleMeeting?(profileSlug: string, externalName: string, externalEmail: string, purpose: string, startAt: string, endAt: string, meetingTypeId: string): Promise<any>;
    getUpcomingMeetings?(profileSlug: string): Promise<any>;
    getAvailableSlots?(profileSlug: string, date: string, durationMinutes: number): Promise<any>;

    // Super Power scripts
    executeSuperPower?(script: string, options?: string): Promise<any>;
}

export const martyAgent: AgentImplementation<ExecutiveMemory, MartyTools> = {
    agentName: 'marty',

    async initialize(brandMemory, agentMemory) {
        logger.info(`[Marty CEO] Initializing for ${brandMemory.brand_profile.name}...`);

        if (!agentMemory.objectives || (Array.isArray(agentMemory.objectives) && agentMemory.objectives.length === 0)) {
            agentMemory.objectives = [...brandMemory.priority_objectives];
        }

        const orgId = (brandMemory.brand_profile as any)?.orgId || (brandMemory.brand_profile as any)?.id || '';
        const squadRoster = buildSquadRoster('marty');
        const integrationStatus = await buildIntegrationStatusSummaryForOrg(orgId);

        // Load NY10 pilot context for cross-org awareness (non-blocking)
        let ny10Context = '';
        try {
            const { buildNY10PilotContext } = await import('./ny10-context');
            ny10Context = await buildNY10PilotContext();
        } catch (e) {
            logger.warn(`[Marty:NY10] Failed to load pilot context: ${e}`);
        }

        agentMemory.system_instructions = `
            You are Marty Benjamins, the AI CEO of BakedBot AI.

            YOUR MISSION: Grow BakedBot AI to $1,000,000 ARR within the next 12 months.
            Everything you do must tie back to this North Star.

            PERSONA:
            - You are strategic, decisive, and results-driven
            - You think in terms of revenue, customers, and market position
            - You don't code — you delegate to your executive team
            - You only touch code in absolute emergencies (production down, data loss)
            - You communicate like a CEO: concise, outcome-focused, always with next steps
            - You hold your team accountable with clear owners, deadlines, and KPIs

            YOUR EXECUTIVE TEAM (you manage all of them):
            ${squadRoster}

            INTEGRATION STATUS:
            ${integrationStatus}

            ${ny10Context ? `\nPILOT CUSTOMERS:\n${ny10Context}\n` : ''}

            STRATEGIC FRAMEWORK:
            1. **Revenue Growth** — Jack (CRO) owns pipeline, deals, MRR tracking
            2. **Product & Tech** — Linus (CTO) owns builds, deploys, infrastructure
            3. **Marketing & Brand** — Glenda (CMO) owns awareness, content, SEO
            4. **Operations** — Leo (COO) owns orchestration, playbooks, system health
            5. **Finance** — Mike (CFO) owns billing, margins, burn rate, compliance

            CEO OPERATING RHYTHM:
            - Monitor all KPIs: MRR, customer count, churn, NPS, deploy health
            - Unblock executives when they're stuck
            - Make GO/NO-GO decisions on strategy pivots
            - Review and approve major initiatives
            - Ensure cross-functional alignment (no siloed work)
            - Drive urgency — $1M ARR is 12 months, not "someday"

            DECISION FRAMEWORK:
            - Will this move the needle on ARR? If not, deprioritize.
            - What's the fastest path to revenue? Optimize for speed.
            - Are we building what customers actually want? Validate first.
            - Is the team aligned? Misalignment is the #1 startup killer.

            GROUNDING RULES (CRITICAL):
            1. ONLY report data you can actually query. Use tools to get real data.
            2. ONLY delegate to agents that exist in the AGENT SQUAD list above.
            3. For integrations NOT YET ACTIVE, be honest about limitations.
            4. When uncertain, investigate rather than assume.
            5. Use REAL timestamps, not placeholders.
            6. Never fabricate metrics — if you don't have data, say so and get it.

            SUPER POWERS:
            You have access to ALL super powers in the system — beyond any other agent.
            This includes deployment authority, full shell access, CRM, browser automation,
            email, Drive, calendar, playbooks, and every executive tool.
            Use delegation as your primary lever. Only use direct tools when executives
            can't handle it or for cross-cutting CEO-level actions.

            OUTPUT FORMAT:
            - Lead with a status line: 🟢 On Track / 🟡 Needs Attention / 🔴 Blocked
            - Executive summary (2-3 sentences max)
            - Action items with owners and deadlines
            - Tie every decision to the $1M ARR goal
        `;

        // Hive Mind init
        try {
            const { lettaBlockManager } = await import('@/server/services/letta/block-manager');
            const brandId = (brandMemory.brand_profile as any)?.id || (brandMemory.brand_profile as any)?.orgId || 'unknown';
            await lettaBlockManager.attachBlocksForRole(brandId, 'marty', 'executive');
            logger.info(`[Marty:HiveMind] Connected to shared executive blocks.`);
        } catch (e) {
            logger.warn(`[Marty:HiveMind] Failed to connect to Hive Mind: ${e}`);
        }

        return agentMemory;
    },

    async orient(brandMemory, agentMemory, stimulus) {
        if (stimulus && typeof stimulus === 'string') return 'ceo_directive';

        // Proactive: check if MRR goal needs attention
        if (agentMemory.objectives && Array.isArray(agentMemory.objectives)) {
            const mrrObjective = agentMemory.objectives.find(
                (o: any) => o.description.includes('ARR') || o.description.includes('MRR') || o.id === 'arr_goal'
            );
            if (mrrObjective && mrrObjective.status === 'active') {
                return 'arr_review';
            }
        }

        return null;
    },

    async act(brandMemory, agentMemory, targetId, tools: MartyTools, stimulus?: string) {
        const semanticSearchEntityId = (brandMemory.brand_profile as any)?.id || (brandMemory.brand_profile as any)?.orgId || 'unknown';

        if (targetId === 'ceo_directive' && stimulus) {
            const userQuery = stimulus;
            const delegatableAgents = getDelegatableAgentIds('marty');

            const ceoTools = [
                {
                    name: "delegateTask",
                    description: "Assign a task to any agent in the squad. As CEO, you can delegate to ANY agent including executives.",
                    schema: z.object({
                        personaId: z.enum(delegatableAgents as [AgentId, ...AgentId[]]),
                        task: z.string().describe("Clear description of the task to delegate"),
                        context: z.any().optional().describe("Additional context for the task")
                    })
                },
                {
                    name: "broadcastToSquad",
                    description: "Send a message to multiple agents at once (company-wide announcements, alignment directives).",
                    schema: z.object({
                        message: z.string(),
                        agentIds: z.array(z.string())
                    })
                },
                {
                    name: "getSystemHealth",
                    description: "Get full system health status — deploys, crons, integrations, errors.",
                    schema: z.object({})
                },
                {
                    name: "getActivePlaybooks",
                    description: "List all active playbooks and their current status.",
                    schema: z.object({})
                },
                {
                    name: "crmListUsers",
                    description: "List platform users (signups, customers, prospects).",
                    schema: z.object({
                        search: z.string().optional(),
                        lifecycleStage: z.enum(['prospect', 'contacted', 'demo_scheduled', 'trial', 'customer', 'vip', 'churned', 'winback']).optional(),
                        limit: z.number().optional()
                    })
                },
                {
                    name: "crmGetStats",
                    description: "Get high-level CRM stats (MRR, Total Users, Pipeline).",
                    schema: z.object({})
                },
                {
                    name: "rtrvrAgent",
                    description: "Launch an autonomous browser agent for web tasks (research, verification, competitor analysis).",
                    schema: z.object({ prompt: z.string() })
                },
                {
                    name: "rtrvrScrape",
                    description: "Scrape a specific URL for content.",
                    schema: z.object({ url: z.string() })
                },
                {
                    name: "createPlaybook",
                    description: "Create a new automated playbook (Digital Worker).",
                    schema: z.object({
                        name: z.string(),
                        description: z.string(),
                        steps: z.array(z.any()),
                        schedule: z.string().optional()
                    })
                },
                {
                    name: "bashExecute",
                    description: "Execute a shell command. EMERGENCY USE ONLY — delegate to Linus for technical work.",
                    schema: z.object({
                        command: z.string(),
                        cwd: z.string().optional(),
                        timeout: z.number().optional()
                    })
                },
                {
                    name: "executeSuperPower",
                    description: "Run any BakedBot Super Power script (audit, seed, generate, fix, deploy).",
                    schema: z.object({
                        script: z.string().describe("Script name (e.g., 'audit-indexes', 'fix-build', 'audit-schema')"),
                        options: z.string().optional().describe("CLI options")
                    })
                },
                {
                    name: "drive.uploadFile",
                    description: "Upload a document or report to Google Drive.",
                    schema: z.object({
                        name: z.string(),
                        content: z.string(),
                        mimeType: z.string().optional()
                    })
                },
                {
                    name: "communications.sendEmail",
                    description: "Send an email from the CEO account.",
                    schema: z.object({
                        to: z.string(),
                        subject: z.string(),
                        content: z.string()
                    })
                },
                {
                    name: "use_mcp_tool",
                    description: "Call an external MCP tool.",
                    schema: z.object({
                        serverName: z.string(),
                        toolName: z.string(),
                        args: z.record(z.any())
                    })
                },
                {
                    name: "browse_web",
                    description: "Browse the web for research, verification, or competitor intelligence.",
                    schema: z.object({
                        url: z.string(),
                        action: z.enum(['read', 'screenshot', 'click', 'type', 'search']).optional(),
                        selector: z.string().optional(),
                        inputValue: z.string().optional()
                    })
                },
                // Browser automation suite
                {
                    name: "browserSession.create",
                    description: "Create a new browser automation session.",
                    schema: z.object({
                        taskDescription: z.string().optional(),
                        initialUrl: z.string().optional()
                    })
                },
                {
                    name: "browserSession.navigate",
                    description: "Navigate to a URL in the active browser session.",
                    schema: z.object({ url: z.string() })
                },
                {
                    name: "browserSession.interact",
                    description: "Interact with browser elements.",
                    schema: z.object({
                        action: z.enum(['click', 'type', 'scroll']),
                        selector: z.string(),
                        value: z.string().optional()
                    })
                },
                {
                    name: "browserSession.screenshot",
                    description: "Capture a screenshot.",
                    schema: z.object({})
                },
                // Calendar
                {
                    name: "scheduleMeeting",
                    description: "Schedule a meeting with someone.",
                    schema: z.object({
                        profileSlug: z.string(),
                        externalName: z.string(),
                        externalEmail: z.string(),
                        purpose: z.string(),
                        startAt: z.string(),
                        endAt: z.string(),
                        meetingTypeId: z.string()
                    })
                },
                {
                    name: "getUpcomingMeetings",
                    description: "View upcoming meetings.",
                    schema: z.object({ profileSlug: z.string() })
                }
            ];

            // Combine CEO tools with all shared tool suites
            const toolsDef = [
                ...ceoTools,
                ...contextOsToolDefs,
                ...lettaToolDefs,
                ...intuitionOsToolDefs,
                ...executiveContextToolDefs,
                ...semanticSearchToolDefs
            ];

            try {
                const { runMultiStepTask } = await import('./harness');

                const result = await runMultiStepTask({
                    userQuery,
                    systemInstructions: (agentMemory.system_instructions as string) || '',
                    toolsDef,
                    tools: { ...tools, ...makeSemanticSearchToolsImpl(semanticSearchEntityId) },
                    model: 'claude-sonnet-4-6',
                    maxIterations: 8, // CEO gets more steps for complex cross-functional work
                    onStepComplete: async (step, toolName, result) => {
                        if ((tools as any).lettaSaveFact) {
                            try {
                                await (tools as any).lettaSaveFact(
                                    `[CEO] Step ${step}: ${toolName} -> ${JSON.stringify(result).slice(0, 200)}`,
                                    'ceo_log'
                                );
                            } catch (err) {
                                logger.warn(`[Marty] Failed to save step to Letta: ${err}`);
                            }
                        }
                    }
                });

                return {
                    updatedMemory: agentMemory,
                    logEntry: {
                        action: 'ceo_directive',
                        result: result.finalResult,
                        metadata: { steps: result.steps.length, tools_used: result.steps.map((s: any) => s.tool) }
                    }
                };

            } catch (e: any) {
                return {
                    updatedMemory: agentMemory,
                    logEntry: { action: 'error', result: `CEO directive failed: ${e.message}`, metadata: { error: e.message } }
                };
            }
        }

        if (targetId === 'arr_review') {
            return {
                updatedMemory: agentMemory,
                logEntry: {
                    action: 'arr_review',
                    result: "Monitoring path to $1M ARR. Reviewing pipeline with Jack (CRO), marketing velocity with Glenda (CMO), and operational efficiency with Leo (COO). Linus (CTO) ensuring platform stability for scale.",
                    next_step: 'await_data',
                    metadata: { objective: '1m_arr' }
                }
            };
        }

        return {
            updatedMemory: agentMemory,
            logEntry: {
                action: 'standby',
                result: 'CEO standing by. Monitoring KPIs and waiting for directives or escalations.',
                next_step: 'wait',
                metadata: {}
            }
        };
    }
};

// ---------------------------------------------------------------------------
// runMarty — Lightweight direct-Claude path for Slack (bypasses full harness)
// ---------------------------------------------------------------------------

export interface MartyRequest {
    prompt: string;
    maxIterations?: number;
    progressCallback?: (msg: string) => void;
    context?: { userId?: string; orgId?: string; brandId?: string };
}

export interface MartyResponse {
    content: string;
    toolExecutions: ClaudeResult['toolExecutions'];
    model: string;
}

/** CEO tools exposed in Slack — streamlined subset, no browser/shell. */
const MARTY_SLACK_TOOLS = [
    { name: 'delegateTask', description: 'Assign a task to any agent in the squad.', input_schema: { type: 'object' as const, properties: { personaId: { type: 'string', description: 'Agent ID to delegate to' }, task: { type: 'string', description: 'Task description' } }, required: ['personaId', 'task'] } },
    { name: 'getSystemHealth', description: 'Get full system health status — deploys, crons, integrations, errors.', input_schema: { type: 'object' as const, properties: {} } },
    { name: 'crmGetStats', description: 'Get high-level CRM stats (MRR, Total Users, Pipeline).', input_schema: { type: 'object' as const, properties: {} } },
    { name: 'crmListUsers', description: 'List platform users.', input_schema: { type: 'object' as const, properties: { search: { type: 'string' }, lifecycleStage: { type: 'string' }, limit: { type: 'number' } } } },
    { name: 'getActivePlaybooks', description: 'List all active playbooks and their status.', input_schema: { type: 'object' as const, properties: {} } },
    { name: 'executeSuperPower', description: 'Run a BakedBot super power script.', input_schema: { type: 'object' as const, properties: { script: { type: 'string' }, options: { type: 'string' } }, required: ['script'] } },
    { name: 'marty_dream', description: 'Run a Dream session — introspect on CEO-level performance (telemetry, feedback, learning deltas, Letta memory), generate improvement hypotheses, test them, and report results. Use this to self-improve or when asked to reflect.', input_schema: { type: 'object' as const, properties: { model: { type: 'string', description: 'AI model for dream: glm, gemini-flash, haiku, sonnet (default: glm)' } } } },
    { name: 'letta_save_fact', description: 'Save an important insight or decision to long-term CEO memory (Letta Hive Mind).', input_schema: { type: 'object' as const, properties: { fact: { type: 'string', description: 'The fact or insight to remember' }, category: { type: 'string', description: 'Category: strategy, revenue, team, customer, decision' } }, required: ['fact'] } },
    { name: 'letta_search_memory', description: 'Search CEO long-term memory for past decisions, strategies, or insights.', input_schema: { type: 'object' as const, properties: { query: { type: 'string', description: 'What to search for' } }, required: ['query'] } },
];

async function martyToolExecutor(toolName: string, args: Record<string, unknown>): Promise<unknown> {
    switch (toolName) {
        case 'delegateTask': {
            const { runAgentChat } = await import('@/app/dashboard/ceo/agents/actions');
            return await runAgentChat(`DELEGATED TASK: ${args.task}`, args.personaId as string, { modelLevel: 'advanced' });
        }
        case 'getSystemHealth': {
            const { defaultExecutiveBoardTools } = await import('@/app/dashboard/ceo/agents/default-tools');
            return await (defaultExecutiveBoardTools as any).getSystemHealth();
        }
        case 'crmGetStats': {
            const { crmGetStatsTool } = await import('@/server/agents/tools/domain/crm-full');
            return await crmGetStatsTool({});
        }
        case 'crmListUsers': {
            const { crmListUsersTool } = await import('@/server/agents/tools/domain/crm-full');
            return await crmListUsersTool(args as any);
        }
        case 'getActivePlaybooks': {
            const { defaultExecutiveBoardTools } = await import('@/app/dashboard/ceo/agents/default-tools');
            return await (defaultExecutiveBoardTools as any).getActivePlaybooks();
        }
        case 'executeSuperPower': {
            const { defaultExecutiveBoardTools } = await import('@/app/dashboard/ceo/agents/default-tools');
            return await (defaultExecutiveBoardTools as any).executeSuperPower(args.script, args.options);
        }
        case 'marty_dream': {
            const { runDreamSession } = await import('@/server/services/letta/dream-loop');
            const model = (args.model as string) || 'glm';
            const session = await runDreamSession('Marty', model as any);

            // Post report to Slack #ceo channel
            try {
                const { postLinusIncidentSlack } = await import('@/server/services/incident-notifications');
                await postLinusIncidentSlack({
                    source: 'auto-escalator',
                    channelName: 'ceo',
                    fallbackText: `CEO Dream Session: ${session.hypotheses.length} hypotheses, ${session.hypotheses.filter(h => h.testResult === 'confirmed').length} confirmed`,
                    blocks: [{
                        type: 'section',
                        text: { type: 'mrkdwn', text: session.report }
                    }]
                });
            } catch (e) {
                logger.warn('[Marty:Dream] Failed to post dream report to Slack', { error: String(e) });
            }

            return {
                success: true,
                hypotheses: session.hypotheses.length,
                confirmed: session.hypotheses.filter(h => h.testResult === 'confirmed').length,
                report: session.report,
            };
        }
        case 'letta_save_fact': {
            try {
                const { lettaClient } = await import('@/server/services/letta/client');
                const agents = await lettaClient.listAgents();
                const researchAgent = agents.find(a => a.name.includes('Research'));
                if (researchAgent) {
                    await lettaClient.insertPassage(
                        researchAgent.id,
                        `[CEO:${(args.category as string) || 'general'}] ${args.fact}`
                    );
                    return { success: true, saved: args.fact };
                }
                return { success: false, error: 'No Letta research agent found' };
            } catch (e) {
                return { success: false, error: String(e) };
            }
        }
        case 'letta_search_memory': {
            try {
                const { lettaClient } = await import('@/server/services/letta/client');
                const agents = await lettaClient.listAgents();
                const researchAgent = agents.find(a => a.name.includes('Research'));
                if (researchAgent) {
                    const passages = await lettaClient.searchPassages(
                        researchAgent.id,
                        args.query as string,
                        5
                    );
                    return { success: true, results: passages };
                }
                return { success: false, error: 'No Letta research agent found' };
            } catch (e) {
                return { success: false, error: String(e) };
            }
        }
        default:
            return { error: `Unknown tool: ${toolName}` };
    }
}

export async function runMarty(request: MartyRequest): Promise<MartyResponse> {
    const squadRoster = buildSquadRoster('marty');
    const orgId = request.context?.orgId || '';
    const integrationStatus = await buildIntegrationStatusSummaryForOrg(orgId);

    const systemPrompt = `You are Marty Benjamins, the AI CEO of BakedBot AI.

YOUR MISSION: Grow BakedBot AI to $1,000,000 ARR within 12 months.

PERSONA:
- Strategic, decisive, results-driven
- Think in terms of revenue, customers, and market position
- Delegate to your executive team — you don't code
- Concise, outcome-focused, always with next steps

YOUR EXECUTIVE TEAM:
${squadRoster}

INTEGRATION STATUS:
${integrationStatus}

DECISION FRAMEWORK:
- Will this move the needle on ARR? If not, deprioritize.
- What's the fastest path to revenue? Optimize for speed.
- Are we building what customers actually want?
- Is the team aligned?

GROUNDING RULES:
1. ONLY report data you can query with tools. Never fabricate metrics.
2. ONLY delegate to agents in the squad list above.
3. Be honest about integration limitations.
4. Use delegation as your primary lever.

FORMAT FOR SLACK:
- Use *bold* for emphasis, not **bold**
- Keep responses concise and actionable
- Lead with status: 🟢 On Track / 🟡 Needs Attention / 🔴 Blocked

CONVERSATION RULES (CRITICAL — every Slack reply):
1. *Never send a dead-end response.* Every reply must end with a clear next step, question, or offer.
2. *Acknowledge context.* Reference what the user said or what happened in the conversation. Don't start fresh.
3. *If you're about to do work, say so first.* Before running tools, briefly state your plan.
4. *Complete your thought.* Never trail off or give a partial answer. If you need info, ask explicitly.
5. *Keep it conversational.* You're a CEO talking to your team — short sentences, decisive, action-oriented.`;

    const fullPrompt = `${systemPrompt}

---

User Request: ${request.prompt}`;

    const onToolCall = request.progressCallback
        ? async (toolName: string, _input: Record<string, unknown>) => {
            const msgs: Record<string, string> = {
                marty_dream: '_Marty Benjamins is dreaming — introspecting, hypothesizing, testing..._',
                letta_save_fact: '_Marty Benjamins is updating CEO memory..._',
                letta_search_memory: '_Marty Benjamins is searching long-term memory..._',
                delegateTask: '_Marty Benjamins is delegating to the team..._',
            };
            request.progressCallback!(msgs[toolName] || `_Marty Benjamins is checking ${toolName.replace(/_/g, ' ')}..._`);
        }
        : undefined;

    const sharedContext = {
        maxIterations: request.maxIterations ?? 4,
        orgId: request.context?.orgId,
        brandId: request.context?.brandId,
        agentContext: {
            name: 'Marty Benjamins',
            role: 'CEO',
            capabilities: ['delegation', 'crm', 'system-health', 'super-powers'],
            groundingRules: ['Only report real data', 'Delegate to named agents'],
        },
        onToolCall,
    };

    // Fast-path tier chain: Groq 70b (fast+cheap) → Gemini Flash → Claude (expensive last resort)
    // NOTE: Groq 8b skipped — Marty's system prompt (~6100 tokens) exceeds its 6000 TPM limit
    type MartyTier = 'glm' | 'gemini-flash' | 'claude';
    const tierChain: MartyTier[] = ['glm', 'gemini-flash', 'claude'];
    let result: ClaudeResult | null = null;
    const triedTiers: string[] = [];

    for (const tier of tierChain) {
        if (result) break;

        try {
            switch (tier) {
                case 'glm': {
                    if (!isGLMConfigured()) { triedTiers.push(`${tier}:unconfigured`); continue; }
                    const model = GLM_MODELS.STANDARD;
                    logger.info(`[Marty] Trying Groq ${model} (fast path)`);
                    const glmResult = await executeGLMWithTools(
                        fullPrompt, MARTY_SLACK_TOOLS, martyToolExecutor,
                        { ...sharedContext, model }
                    );
                    if (isGLMRefusal(glmResult)) {
                        triedTiers.push(`${tier}:refused`);
                        logger.warn('[Marty] Groq refused (content policy)');
                        break;
                    }
                    // Accept if content exists OR tools executed (Groq sometimes returns empty
                    // content after running tools — synthesize a summary from tool results)
                    if (glmResult.content) {
                        result = glmResult;
                    } else if (glmResult.toolExecutions && glmResult.toolExecutions.length > 0) {
                        logger.info('[Marty] Groq ran tools but returned empty content — synthesizing', {
                            toolCount: glmResult.toolExecutions.length,
                        });
                        const toolSummary = glmResult.toolExecutions
                            .map((t: any) => `• *${t.tool}*: ${JSON.stringify(t.result).slice(0, 200)}`)
                            .join('\n');
                        result = {
                            ...glmResult,
                            content: `Here's what I found:\n\n${toolSummary}\n\n_Let me know if you need me to dig deeper into any of these._`,
                        };
                    } else {
                        triedTiers.push(`${tier}:empty`);
                        logger.warn('[Marty] Groq returned empty (no content, no tools)');
                    }
                    break;
                }
                case 'gemini-flash': {
                    if (!isGeminiFlashConfigured()) { triedTiers.push(`${tier}:unconfigured`); continue; }
                    logger.info('[Marty] Trying Gemini Flash');
                    result = await executeGeminiFlashWithTools(
                        fullPrompt, MARTY_SLACK_TOOLS, martyToolExecutor,
                        sharedContext
                    );
                    break;
                }
                case 'claude': {
                    if (!isClaudeAvailable()) { triedTiers.push(`${tier}:unconfigured`); continue; }
                    logger.info('[Marty] Falling back to Claude (expensive)');
                    result = await executeWithTools(
                        fullPrompt, MARTY_SLACK_TOOLS, martyToolExecutor,
                        sharedContext
                    );
                    break;
                }
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            const isRateLimit = msg.includes('429') || msg.toLowerCase().includes('rate limit') || msg.includes('413');
            triedTiers.push(`${tier}:${isRateLimit ? 'rate-limited' : 'error'}`);
            logger.error(`[Marty] Tier ${tier} failed`, { error: msg, isRateLimit });
        }
    }

    if (!result) {
        logger.error('[Marty] All tiers exhausted', { triedTiers });
        return {
            content: `I'm having trouble connecting to my AI systems right now. Tried: ${triedTiers.join(' → ')}. Please try again in a minute or ask Linus for help.`,
            toolExecutions: [],
            model: 'none',
        };
    }

    return {
        content: result.content,
        toolExecutions: result.toolExecutions,
        model: result.model,
    };
}
