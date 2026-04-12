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
    makeSemanticSearchToolsImpl,
    learningLoopToolDefs
} from './shared-tools';
import {
    buildSquadRoster,
    getDelegatableAgentIds,
    AgentId
} from './agent-definitions';
import { buildIntegrationStatusSummaryForOrg } from '@/server/services/org-integration-status';
import {
    b2bSalesToolDef, searchB2BSalesConversations, formatB2BSalesConversations,
    salesConversationsToolDef, searchSalesConversations, formatSalesConversations,
} from '@/server/tools/cannabis-science';
import { executeWithTools, isClaudeAvailable, type ClaudeResult } from '@/ai/claude';
import { executeGLMWithTools, GLM_MODELS, isGLMConfigured } from '@/ai/glm';
import { executeGeminiFlashWithTools, isGeminiFlashConfigured } from '@/ai/gemini-flash-tools';
import { google } from 'googleapis';
import { getGmailToken } from '@/server/integrations/gmail/token-storage';
import { getOAuth2ClientAsync } from '@/server/integrations/gmail/oauth';
import { getExecutiveProfile } from '@/server/actions/executive-calendar';
import {
    listGoogleCalendarEvents,
    createGoogleCalendarEvent,
    deleteGoogleCalendarEvent,
    getGoogleCalendarBusyTimes,
} from '@/server/services/executive-calendar/google-calendar';
import type { GoogleCalendarTokens } from '@/types/executive-calendar';
import { buildBulletSection, buildContextDisciplineSection, buildLearningLoopSection, joinPromptSections } from './prompt-kit';
import { makeLearningLoopToolsImpl } from '@/server/services/agent-learning-loop';

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

function buildMartyOperatingPrompt(input: {
    brandName: string;
    squadRoster: string;
    integrationStatus: string;
    ny10Context?: string;
    slackMode?: boolean;
}): string {
    return joinPromptSections(
        `You are Marty Benjamins, the AI CEO for ${input.brandName}. Your only job is to help BakedBot reach $1,000,000 ARR in the next 12 months by driving the company to $83,333 MRR.`,
        `=== EXECUTIVE TEAM ===\n${input.squadRoster}`,
        `=== INTEGRATION STATUS ===\n${input.integrationStatus}`,
        input.ny10Context ? `=== PILOT CUSTOMERS ===\n${input.ny10Context}` : '',
        buildContextDisciplineSection([
            'Keep always-on context strategic and lean. Use tools, retrieved memory, and live context for detailed workflow steps.',
            'Treat tool descriptions as the operating manual for Gmail, Calendar, outreach, CRM, browser automation, LinkedIn, Facebook, Reddit, Instagram, Moltbook, and market research.',
        ]),
        buildBulletSection('GROUNDING RULES (CRITICAL)', [
            'Never fabricate revenue, outreach, meetings, deals, partnerships, or system status.',
            'Only report outcomes confirmed by tools in this run or retrieved from memory.',
            'Own pipeline, inbox, outreach, social media (LinkedIn, Facebook, Reddit, Instagram, Moltbook), calendar, and market-research work directly. Delegate specialist execution to the named executive team.',
            'Use real timestamps, real owners, and a clear next step.',
            'Before giving market or growth advice, prefer search, CRM, inbox, outreach, or LinkedIn tools over intuition.',
        ]),
        buildBulletSection('MANDATE', [
            'Optimize every week for one or more of these outcomes: more qualified pipeline, faster customer activation, higher retention and expansion, or better focus on the few things that move revenue.',
            'If a project does not clearly support pipeline, activation, retention, expansion, or focus, deprioritize it.',
            'Run the company against one number: $83,333 MRR.',
        ]),
        buildBulletSection('COMMERCIAL THESIS', [
            'Access builds trust. Operator builds the company.',
            'Access is the mission-aligned wedge: Free Check-In, Access Intel, and Access Retention.',
            'Operator is the primary revenue engine: a managed revenue activation system sold consultatively in the $2,500-$4,000 MRR band.',
            'The wedge is customer capture, welcome activation, and retention.',
            'Flagship motions are the Welcome Check-In Flow and the Welcome Email Playbook.',
        ]),
        buildLearningLoopSection('Marty', ['strategy', 'outreach', 'calendar', 'linkedin', 'facebook', 'reddit', 'instagram', 'moltbook', 'problem']),
        buildBulletSection('DECISION RULES', [
            'Prioritize in this order: revenue in the next 90 days, customer proof of value, retention and expansion leverage, sharpening the offer and positioning, internal efficiency gains, then longer-term platform work.',
            'Default bias: choose proof over ideas, shipping over planning, one clear offer over broad possibility, systems over heroics, and measurable lift over activity.',
            'Treat social equity access as mission-critical but not as the premium pricing anchor.',
        ]),
        buildBulletSection('OPERATING RHYTHM', [
            'Monday: call the shot with the weekly scorecard, top 3 priorities, most important opportunities, customer risks, and what must move by Friday.',
            'Wednesday: check reality, identify slippage, intervene on blockers, and cut low-leverage work.',
            'Friday: tell the truth with a blunt operating readout and explicit founder decisions needed.',
            'When asked for the weekly memo or Monday scorecard, use the generateWeeklyCeoMemo tool before answering.',
        ]),
        buildBulletSection('OPERATING FOCUS', [
            'Tie every recommendation to pipeline, activation, retention, expansion, or execution focus.',
            'Operate like a proactive CEO, not a passive helpdesk: surface the next move, owner, and leverage point.',
            'Own the frontline growth motions yourself: pipeline pressure, outbound, partnerships, inbox follow-up, social media engagement, and thought leadership across all platforms.',
            'Use Gmail, Calendar, outreach, LinkedIn, Facebook, Reddit, Instagram, Moltbook, CRM, and market-search tools proactively, but keep output concise and numbers-first.',
            'When progress is blocked, retry or pivot first, then delegate, and only escalate when the block is material.',
        ]),
        buildBulletSection('OUTPUT RULES', [
            'Lead with status: On Track, Needs Attention, or Blocked.',
            'Give a short executive summary followed by owners and next steps.',
            'Keep language direct, calm, specific, and grounded in evidence.',
        ]),
        input.slackMode
            ? buildBulletSection('SLACK RESPONSE RULES', [
                'Never end with a dead end. Finish with a next step, question, or offer.',
                'Acknowledge the current context before doing work.',
                'Say what you are about to check before calling tools.',
                'For bare greetings or short acknowledgments, stay warm and forward-moving. Do not volunteer metrics unless asked.',
            ])
            : '',
    );
}

export interface MartyTools extends Partial<AllSharedTools>, Partial<ExecutiveContextTools> {
    // Full Executive delegation
    delegateTask?(personaId: string, task: string, context?: any): Promise<any>;
    broadcastToSquad?(message: string, agentIds: string[]): Promise<any>;
    getAgentStatus?(agentId?: string): Promise<any>;

    // CEO-level oversight
    getSystemHealth?(): Promise<any>;
    getActivePlaybooks?(): Promise<any>;
    generateWeeklyCeoMemo?(): Promise<any>;
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
        agentMemory.system_instructions = buildMartyOperatingPrompt({
            brandName: brandMemory.brand_profile.name,
            squadRoster,
            integrationStatus,
            ny10Context,
        });

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
                    name: "generateWeeklyCeoMemo",
                    description: "Generate the current weekly CEO memo using Marty's Monday five-section format and live scoreboard data where available.",
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
                b2bSalesToolDef,
                salesConversationsToolDef,
                ...learningLoopToolDefs,
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
                    tools: {
                        ...tools,
                        searchB2BSalesConversations: async (query: string, outcome?: number, limit?: number) => {
                            return formatB2BSalesConversations(await searchB2BSalesConversations(query, outcome, limit));
                        },
                        searchSalesConversations: async (query: string, limit?: number) => {
                            return formatSalesConversations(await searchSalesConversations(query, limit));
                        },
                        ...makeSemanticSearchToolsImpl(semanticSearchEntityId),
                        ...makeLearningLoopToolsImpl({
                            agentId: 'marty',
                            role: 'CEO',
                            orgId: (brandMemory.brand_profile as any)?.orgId || semanticSearchEntityId,
                            brandId: semanticSearchEntityId,
                            defaultCategory: 'strategy',
                            legacyCollection: 'marty_learning_log',
                        }),
                    },
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

/**
 * Get an authenticated Gmail client for the CEO (martez@bakedbot.ai).
 * Uses CEO_GMAIL_UID env var to look up the super user's stored OAuth tokens.
 * Proactively refreshes the access token and persists new credentials.
 */
async function getCeoGmailClient() {
    const ceoUid = process.env.CEO_GMAIL_UID;
    if (!ceoUid) {
        logger.warn('[Marty:Gmail] CEO_GMAIL_UID env var not set');
        return null;
    }
    const credentials = await getGmailToken(ceoUid);
    if (!credentials?.refresh_token) {
        logger.warn('[Marty:Gmail] No Gmail tokens found for CEO', { ceoUid });
        return null;
    }
    const authClient = await getOAuth2ClientAsync();
    authClient.setCredentials(credentials);

    // Proactively refresh if the token is expired or about to expire (within 5 min)
    const isExpired = credentials.expiry_date && credentials.expiry_date < Date.now() + 300_000;
    if (isExpired || !credentials.access_token) {
        try {
            const { credentials: refreshed } = await authClient.refreshAccessToken();
            authClient.setCredentials(refreshed);
            // Persist the refreshed tokens so subsequent calls don't re-refresh
            const { saveGmailToken } = await import('@/server/integrations/gmail/token-storage');
            await saveGmailToken(ceoUid, refreshed);
            logger.info('[Marty:Gmail] Access token refreshed successfully');
        } catch (e) {
            logger.error('[Marty:Gmail] Token refresh failed — re-auth required', {
                error: e instanceof Error ? e.message : String(e),
                hint: 'Visit /dashboard/ceo > Settings > Gmail to re-authenticate',
            });
            return null;
        }
    }

    return google.gmail({ version: 'v1', auth: authClient });
}

/**
 * Get CEO's Google Calendar tokens from Firestore executive_profiles.
 */
async function getCeoCalendarTokens(): Promise<GoogleCalendarTokens | null> {
    try {
        const profile = await getExecutiveProfile('martez');
        if (!profile?.googleCalendarTokens?.refresh_token) {
            logger.warn('[Marty:Calendar] No Google Calendar tokens for Martez');
            return null;
        }
        return profile.googleCalendarTokens;
    } catch (e) {
        logger.error('[Marty:Calendar] Failed to get calendar tokens', { error: String(e) });
        return null;
    }
}

/** CEO tools exposed in Slack — streamlined subset, no browser/shell. */
const MARTY_DELEGATABLE_IDS = getDelegatableAgentIds('marty');
const MARTY_SLACK_TOOLS = [
    { name: 'delegateTask', description: `Assign specialist work to the right executive or operator in the squad. Valid agents: ${MARTY_DELEGATABLE_IDS.join(', ')}. Do NOT delegate to agents not in this list (e.g. "elroy" is not a delegatable agent — handle store-ops questions yourself or delegate to linus/leo).`, input_schema: { type: 'object' as const, properties: { personaId: { type: 'string', enum: MARTY_DELEGATABLE_IDS, description: 'Agent ID to delegate to' }, task: { type: 'string', description: 'Task description' } }, required: ['personaId', 'task'] } },
    { name: 'getSystemHealth', description: 'Get full system health status — deploys, crons, integrations, errors.', input_schema: { type: 'object' as const, properties: {} } },
    { name: 'crmGetStats', description: 'Get high-level CRM stats (MRR, Total Users, Pipeline).', input_schema: { type: 'object' as const, properties: {} } },
    { name: 'crmListUsers', description: 'List platform users.', input_schema: { type: 'object' as const, properties: { search: { type: 'string' }, lifecycleStage: { type: 'string' }, limit: { type: 'number' } } } },
    { name: 'getActivePlaybooks', description: 'List all active playbooks and their status.', input_schema: { type: 'object' as const, properties: {} } },
    { name: 'generateWeeklyCeoMemo', description: 'Generate the current weekly CEO memo using Marty’s five-section format and scoreboard.', input_schema: { type: 'object' as const, properties: {} } },
    { name: 'executeSuperPower', description: 'Run a BakedBot super power script.', input_schema: { type: 'object' as const, properties: { script: { type: 'string' }, options: { type: 'string' } }, required: ['script'] } },
    { name: 'marty_dream', description: 'Run a Dream session — introspect on CEO-level performance (telemetry, feedback, learning deltas, Letta memory), generate improvement hypotheses, test them, and report results. Use this to self-improve or when asked to reflect.', input_schema: { type: 'object' as const, properties: { model: { type: 'string', description: 'AI model for dream: glm, gemini-flash, haiku, sonnet (default: glm)' } } } },
    { name: 'letta_save_fact', description: 'Save an important insight or decision to long-term CEO memory (Letta Hive Mind).', input_schema: { type: 'object' as const, properties: { fact: { type: 'string', description: 'The fact or insight to remember' }, category: { type: 'string', description: 'Category: strategy, revenue, team, customer, decision' } }, required: ['fact'] } },
    { name: 'letta_search_memory', description: 'Search CEO long-term memory for past decisions, strategies, or insights.', input_schema: { type: 'object' as const, properties: { query: { type: 'string', description: 'What to search for' } }, required: ['query'] } },

    // Gmail — CEO inbox management (martez@bakedbot.ai)
    { name: 'gmail_search', description: 'Search the CEO inbox (martez@bakedbot.ai). Use Gmail query syntax: from:, to:, subject:, is:unread, has:attachment, newer_than:7d, etc.', input_schema: { type: 'object' as const, properties: { query: { type: 'string', description: 'Gmail search query (e.g., "is:unread newer_than:3d", "from:investor subject:term sheet")' }, maxResults: { type: 'number', description: 'Max threads to return (default 10, max 50)' } }, required: ['query'] } },
    { name: 'gmail_read_thread', description: 'Read a full email thread by ID. Use after gmail_search to get full message bodies.', input_schema: { type: 'object' as const, properties: { threadId: { type: 'string', description: 'Gmail thread ID from search results' } }, required: ['threadId'] } },
    { name: 'gmail_draft_reply', description: 'Draft a reply email (saves as draft, does NOT send). The user reviews and sends manually.', input_schema: { type: 'object' as const, properties: { to: { type: 'string', description: 'Recipient email' }, subject: { type: 'string', description: 'Email subject line' }, body: { type: 'string', description: 'Plain text email body' }, htmlBody: { type: 'string', description: 'Optional HTML body for rich formatting' }, cc: { type: 'string', description: 'Optional CC recipients (comma-separated)' } }, required: ['to', 'subject', 'body'] } },
    { name: 'gmail_label', description: 'Add or remove a label from a thread. Use list_labels first to discover label IDs.', input_schema: { type: 'object' as const, properties: { threadId: { type: 'string', description: 'Gmail thread ID' }, labelId: { type: 'string', description: 'Label ID to add' }, action: { type: 'string', enum: ['add', 'remove'], description: 'Whether to add or remove the label' } }, required: ['threadId', 'labelId', 'action'] } },
    { name: 'gmail_list_labels', description: 'List all Gmail labels and their IDs. Use to discover label IDs before labeling threads.', input_schema: { type: 'object' as const, properties: {} } },

    // Google Calendar — CEO schedule (martez@bakedbot.ai)
    { name: 'calendar_list_events', description: 'List events on the CEO Google Calendar for a date range. Defaults to today + 7 days.', input_schema: { type: 'object' as const, properties: { startDate: { type: 'string', description: 'ISO date string for range start (default: now)' }, endDate: { type: 'string', description: 'ISO date string for range end (default: 7 days from now)' } } } },
    { name: 'calendar_check_free', description: 'Check CEO free/busy times for a specific date. Returns busy blocks.', input_schema: { type: 'object' as const, properties: { date: { type: 'string', description: 'ISO date (YYYY-MM-DD) to check' } }, required: ['date'] } },
    { name: 'calendar_create_event', description: 'Create an event on the CEO Google Calendar. Use for scheduling meetings, blocks, reminders.', input_schema: { type: 'object' as const, properties: { summary: { type: 'string', description: 'Event title' }, description: { type: 'string', description: 'Event description' }, startAt: { type: 'string', description: 'ISO datetime for event start' }, endAt: { type: 'string', description: 'ISO datetime for event end' }, attendeeEmails: { type: 'array', items: { type: 'string' }, description: 'Optional attendee emails' } }, required: ['summary', 'startAt', 'endAt'] } },
    { name: 'calendar_get_upcoming_meetings', description: 'Get upcoming BakedBot bookings (from bakedbot.ai/martez). Includes Google Calendar synced events.', input_schema: { type: 'object' as const, properties: { limit: { type: 'number', description: 'Max meetings to return (default 10)' } } } },

    // Market research — proactive opportunity scanning
    { name: 'searchOpportunities', description: 'Search the web for cannabis market moves, partner opportunities, competitor activity, and revenue ideas. Use before making strategic recommendations when fresh market context would help.', input_schema: { type: 'object' as const, properties: { query: { type: 'string', description: 'Search query (e.g., "NY cannabis dispensary partnerships 2026", "cannabis retail AI trends 2026")' } }, required: ['query'] } },

    // Outreach — Lead generation & follow-up
    { name: 'outreach_search_leads', description: 'Search NY dispensary leads available for outreach. Returns leads with emails and contact form URLs.', input_schema: { type: 'object' as const, properties: { city: { type: 'string', description: 'Filter by city' }, limit: { type: 'number', description: 'Max results (default 10)' }, hasEmail: { type: 'boolean', description: 'Only leads with verified emails' }, hasContactForm: { type: 'boolean', description: 'Only leads with contact form URLs' } } } },
    { name: 'outreach_send_email', description: 'Send a personalized outreach email to a dispensary lead. Verifies email first, then sends via SES.', input_schema: { type: 'object' as const, properties: { dispensaryName: { type: 'string' }, email: { type: 'string' }, contactName: { type: 'string' }, city: { type: 'string' }, state: { type: 'string' }, templateId: { type: 'string', description: 'Template: competitive-report, founding-partner, caurd-grant, roi-calculator, price-war, pos-integration, loyalty-program, behind-glass-demo, social-proof, direct-personal' }, posSystem: { type: 'string' } }, required: ['dispensaryName', 'email', 'city', 'state', 'templateId'] } },
    { name: 'outreach_submit_contact_form', description: 'Submit a message via a dispensary website contact form using browser automation (RTRVR).', input_schema: { type: 'object' as const, properties: { websiteUrl: { type: 'string', description: 'Dispensary website URL' }, contactFormUrl: { type: 'string', description: 'Direct contact form URL if known' }, dispensaryName: { type: 'string' }, message: { type: 'string', description: 'Message to submit' }, senderName: { type: 'string', description: 'Name to use (default: Martez Knox)' }, senderEmail: { type: 'string', description: 'Email to use (default: martez@bakedbot.ai)' } }, required: ['websiteUrl', 'dispensaryName', 'message'] } },
    { name: 'outreach_track_crm', description: 'Track an outreach contact in the CRM system for lifecycle management.', input_schema: { type: 'object' as const, properties: { email: { type: 'string' }, dispensaryName: { type: 'string' }, contactName: { type: 'string' }, city: { type: 'string' }, state: { type: 'string' }, status: { type: 'string', description: 'Lifecycle stage: prospect, contacted, demo_scheduled, trial, customer' }, notes: { type: 'string', description: 'Notes about the interaction' } }, required: ['dispensaryName', 'city', 'state', 'status'] } },
    { name: 'outreach_get_stats', description: 'Get outreach campaign stats — emails sent, bad emails, failures, recent activity.', input_schema: { type: 'object' as const, properties: {} } },

    // LinkedIn — Business development & lead gen
    { name: 'linkedin_post', description: 'Post content to the CEO LinkedIn feed. Use for thought leadership, company updates, industry insights.', input_schema: { type: 'object' as const, properties: { content: { type: 'string', description: 'Post content (text). Keep under 3000 chars. Use line breaks for readability.' } }, required: ['content'] } },
    { name: 'linkedin_search_people', description: 'Search LinkedIn for dispensary owners, cannabis industry contacts, or potential leads.', input_schema: { type: 'object' as const, properties: { query: { type: 'string', description: 'Search query (e.g., "dispensary owner New York", "cannabis retail manager Syracuse")' } }, required: ['query'] } },
    { name: 'linkedin_send_connection', description: 'Send a connection request with a personalized note to a LinkedIn profile.', input_schema: { type: 'object' as const, properties: { profileUrl: { type: 'string', description: 'LinkedIn profile URL' }, note: { type: 'string', description: 'Connection note (max 300 chars). Be personal and relevant.' } }, required: ['profileUrl', 'note'] } },
    { name: 'linkedin_send_message', description: 'Send a LinkedIn DM to an existing connection.', input_schema: { type: 'object' as const, properties: { profileUrl: { type: 'string', description: 'LinkedIn profile URL of the connection' }, message: { type: 'string', description: 'Message to send' } }, required: ['profileUrl', 'message'] } },

    // LinkedIn — Expanded capabilities (browse, engage, groups, images)
    { name: 'linkedin_browse_feed', description: 'Browse the LinkedIn feed to see recent posts from connections and industry. Use to stay informed and find engagement opportunities.', input_schema: { type: 'object' as const, properties: { limit: { type: 'number', description: 'Number of posts to retrieve (default 10)' } } } },
    { name: 'linkedin_comment', description: 'Comment on a LinkedIn post. Use for engagement and relationship building.', input_schema: { type: 'object' as const, properties: { postUrl: { type: 'string', description: 'URL of the LinkedIn post to comment on' }, comment: { type: 'string', description: 'Comment text. Be thoughtful and add value.' } }, required: ['postUrl', 'comment'] } },
    { name: 'linkedin_react', description: 'React to a LinkedIn post (like, celebrate, support, insightful, funny, love).', input_schema: { type: 'object' as const, properties: { postUrl: { type: 'string', description: 'URL of the LinkedIn post' }, reaction: { type: 'string', enum: ['like', 'celebrate', 'support', 'insightful', 'funny', 'love'], description: 'Reaction type' } }, required: ['postUrl', 'reaction'] } },
    { name: 'linkedin_post_with_image', description: 'Post to LinkedIn with an image attachment. Use for visual content, infographics, product screenshots.', input_schema: { type: 'object' as const, properties: { content: { type: 'string', description: 'Post text content' }, imageUrl: { type: 'string', description: 'Public URL of the image to attach' } }, required: ['content', 'imageUrl'] } },
    { name: 'linkedin_view_profile', description: 'View a LinkedIn profile in detail — headline, about, experience, skills. Use to research leads before outreach.', input_schema: { type: 'object' as const, properties: { profileUrl: { type: 'string', description: 'LinkedIn profile URL' } }, required: ['profileUrl'] } },
    { name: 'linkedin_browse_groups', description: 'Browse LinkedIn groups — search, view members, read discussions. Great for finding dispensary owner communities.', input_schema: { type: 'object' as const, properties: { query: { type: 'string', description: 'Group search query (e.g., "cannabis business owners", "dispensary retail")' } }, required: ['query'] } },
    { name: 'linkedin_read_inbox', description: 'Read recent LinkedIn messages and connection requests.', input_schema: { type: 'object' as const, properties: { limit: { type: 'number', description: 'Max messages to retrieve (default 10)' } } } },
    { name: 'linkedin_repost', description: 'Repost/share someone else\'s LinkedIn post to your feed with optional commentary.', input_schema: { type: 'object' as const, properties: { postUrl: { type: 'string', description: 'URL of the post to repost' }, commentary: { type: 'string', description: 'Optional commentary to add when sharing' } }, required: ['postUrl'] } },

    // Facebook — Business development, groups, community engagement
    { name: 'facebook_browse_feed', description: 'Browse the Facebook news feed to see posts from friends, pages, and groups.', input_schema: { type: 'object' as const, properties: { limit: { type: 'number', description: 'Number of posts to retrieve (default 10)' } } } },
    { name: 'facebook_post', description: 'Post text content to the CEO Facebook feed.', input_schema: { type: 'object' as const, properties: { content: { type: 'string', description: 'Post text content' } }, required: ['content'] } },
    { name: 'facebook_post_with_image', description: 'Post to Facebook with an image attachment.', input_schema: { type: 'object' as const, properties: { content: { type: 'string', description: 'Post text content' }, imageUrl: { type: 'string', description: 'Public URL of the image to attach' } }, required: ['content', 'imageUrl'] } },
    { name: 'facebook_comment', description: 'Comment on a Facebook post.', input_schema: { type: 'object' as const, properties: { postUrl: { type: 'string', description: 'URL of the Facebook post' }, comment: { type: 'string', description: 'Comment text' } }, required: ['postUrl', 'comment'] } },
    { name: 'facebook_react', description: 'React to a Facebook post (like, love, haha, wow, sad, angry).', input_schema: { type: 'object' as const, properties: { postUrl: { type: 'string', description: 'URL of the Facebook post' }, reaction: { type: 'string', enum: ['like', 'love', 'haha', 'wow', 'sad', 'angry'], description: 'Reaction type' } }, required: ['postUrl', 'reaction'] } },
    { name: 'facebook_browse_groups', description: 'Browse Facebook groups — search for cannabis business groups, read posts, find dispensary owners.', input_schema: { type: 'object' as const, properties: { query: { type: 'string', description: 'Group search query (e.g., "cannabis dispensary owners", "NY cannabis business")' } }, required: ['query'] } },
    { name: 'facebook_post_to_group', description: 'Post content to a Facebook group.', input_schema: { type: 'object' as const, properties: { groupUrl: { type: 'string', description: 'URL of the Facebook group' }, content: { type: 'string', description: 'Post text content' } }, required: ['groupUrl', 'content'] } },
    { name: 'facebook_send_message', description: 'Send a Facebook Messenger message to a contact.', input_schema: { type: 'object' as const, properties: { profileUrl: { type: 'string', description: 'Facebook profile URL of the recipient' }, message: { type: 'string', description: 'Message to send' } }, required: ['profileUrl', 'message'] } },
    { name: 'facebook_search', description: 'Search Facebook for people, pages, groups, or posts.', input_schema: { type: 'object' as const, properties: { query: { type: 'string', description: 'Search query' }, type: { type: 'string', enum: ['people', 'pages', 'groups', 'posts'], description: 'What to search for (default: all)' } }, required: ['query'] } },

    // Reddit — Community engagement, cannabis industry subreddits
    { name: 'reddit_browse_feed', description: 'Browse Reddit front page or a specific subreddit feed.', input_schema: { type: 'object' as const, properties: { subreddit: { type: 'string', description: 'Subreddit name without r/ (e.g., "cannabisindustry"). Omit for front page.' }, sort: { type: 'string', enum: ['hot', 'new', 'top', 'rising'], description: 'Sort order (default: hot)' }, limit: { type: 'number', description: 'Number of posts (default 10)' } } } },
    { name: 'reddit_post', description: 'Submit a text post to a subreddit. Follow subreddit rules carefully.', input_schema: { type: 'object' as const, properties: { subreddit: { type: 'string', description: 'Subreddit name without r/' }, title: { type: 'string', description: 'Post title' }, content: { type: 'string', description: 'Post body text (markdown)' } }, required: ['subreddit', 'title', 'content'] } },
    { name: 'reddit_comment', description: 'Comment on a Reddit post or reply to a comment.', input_schema: { type: 'object' as const, properties: { postUrl: { type: 'string', description: 'URL of the Reddit post or comment to reply to' }, comment: { type: 'string', description: 'Comment text (markdown)' } }, required: ['postUrl', 'comment'] } },
    { name: 'reddit_search', description: 'Search Reddit for posts, subreddits, or users.', input_schema: { type: 'object' as const, properties: { query: { type: 'string', description: 'Search query' }, subreddit: { type: 'string', description: 'Limit search to a subreddit (optional)' } }, required: ['query'] } },
    { name: 'reddit_read_post', description: 'Read a Reddit post with its comments.', input_schema: { type: 'object' as const, properties: { postUrl: { type: 'string', description: 'URL of the Reddit post' } }, required: ['postUrl'] } },
    { name: 'reddit_vote', description: 'Upvote or downvote a Reddit post or comment.', input_schema: { type: 'object' as const, properties: { postUrl: { type: 'string', description: 'URL of the post or comment' }, direction: { type: 'string', enum: ['up', 'down'], description: 'Vote direction' } }, required: ['postUrl', 'direction'] } },
    { name: 'reddit_send_message', description: 'Send a private message to a Reddit user.', input_schema: { type: 'object' as const, properties: { username: { type: 'string', description: 'Reddit username (without u/)' }, subject: { type: 'string', description: 'Message subject' }, message: { type: 'string', description: 'Message body' } }, required: ['username', 'subject', 'message'] } },
    { name: 'reddit_browse_subreddit_info', description: 'Get info about a subreddit — rules, description, subscriber count, moderators.', input_schema: { type: 'object' as const, properties: { subreddit: { type: 'string', description: 'Subreddit name without r/' } }, required: ['subreddit'] } },

    // Instagram — Visual content, stories, engagement
    { name: 'instagram_browse_feed', description: 'Browse the Instagram feed to see recent posts from followed accounts.', input_schema: { type: 'object' as const, properties: { limit: { type: 'number', description: 'Number of posts to retrieve (default 10)' } } } },
    { name: 'instagram_post_with_image', description: 'Post an image to Instagram with a caption.', input_schema: { type: 'object' as const, properties: { imageUrl: { type: 'string', description: 'Public URL of the image to post' }, caption: { type: 'string', description: 'Caption text with hashtags' } }, required: ['imageUrl', 'caption'] } },
    { name: 'instagram_comment', description: 'Comment on an Instagram post.', input_schema: { type: 'object' as const, properties: { postUrl: { type: 'string', description: 'URL of the Instagram post' }, comment: { type: 'string', description: 'Comment text' } }, required: ['postUrl', 'comment'] } },
    { name: 'instagram_react', description: 'Like an Instagram post.', input_schema: { type: 'object' as const, properties: { postUrl: { type: 'string', description: 'URL of the Instagram post to like' } }, required: ['postUrl'] } },
    { name: 'instagram_view_profile', description: 'View an Instagram profile — bio, follower count, recent posts.', input_schema: { type: 'object' as const, properties: { username: { type: 'string', description: 'Instagram username (without @)' } }, required: ['username'] } },
    { name: 'instagram_send_message', description: 'Send an Instagram direct message.', input_schema: { type: 'object' as const, properties: { username: { type: 'string', description: 'Instagram username to message' }, message: { type: 'string', description: 'Message text' } }, required: ['username', 'message'] } },
    { name: 'instagram_search', description: 'Search Instagram for users, hashtags, or locations.', input_schema: { type: 'object' as const, properties: { query: { type: 'string', description: 'Search query' }, type: { type: 'string', enum: ['users', 'hashtags', 'locations'], description: 'Search type (default: users)' } }, required: ['query'] } },
    { name: 'instagram_browse_stories', description: 'Browse Instagram stories from followed accounts or a specific user.', input_schema: { type: 'object' as const, properties: { username: { type: 'string', description: 'Specific username to view stories for (optional — omit for all followed)' } } } },

    // Social Media Intelligence — cross-platform tools
    { name: 'social_adapt_content', description: 'Adapt a single piece of content for a target platform. Rewrites tone, format, and length to match platform norms. Great for cross-posting thought leadership.', input_schema: { type: 'object' as const, properties: { content: { type: 'string', description: 'Original content to adapt' }, platform: { type: 'string', enum: ['linkedin', 'facebook', 'reddit', 'instagram', 'moltbook'], description: 'Target platform' }, topic: { type: 'string', description: 'Topic context (optional)' }, intent: { type: 'string', description: 'Intent: thought-leadership, engagement, lead-gen, community (optional)' } }, required: ['content', 'platform'] } },
    { name: 'social_adapt_all', description: 'Adapt content for ALL platforms at once. Returns adapted versions for LinkedIn, Facebook, Reddit, Instagram, and Moltbook.', input_schema: { type: 'object' as const, properties: { content: { type: 'string', description: 'Original content to adapt' }, topic: { type: 'string', description: 'Topic context (optional)' } }, required: ['content'] } },
    { name: 'social_check_limits', description: 'Check current rate limit usage across all social platforms. Shows how many actions remain in each window.', input_schema: { type: 'object' as const, properties: {} } },
    { name: 'social_scan_signals', description: 'Run a social listening scan — search Reddit for cannabis retail discussions matching BakedBot keywords. Returns scored signals with suggested actions.', input_schema: { type: 'object' as const, properties: {} } },
    { name: 'social_warmup_check', description: 'Check if a person is "warm" enough for a DM. If not, returns warmup actions to take first (view profile, react, comment).', input_schema: { type: 'object' as const, properties: { platform: { type: 'string', enum: ['linkedin', 'facebook', 'instagram'], description: 'Platform' }, targetId: { type: 'string', description: 'Profile URL or username of the person' } }, required: ['platform', 'targetId'] } },

    // Moltbook — Agent social network (reputation, discovery, thought leadership)
    { name: 'moltbook_post', description: 'Post content to Moltbook (agent social network). Build karma and reputation in the agent ecosystem. Auto-verifies the post.', input_schema: { type: 'object' as const, properties: { title: { type: 'string', description: 'Post title (max 300 chars). If omitted, first line of content is used.' }, content: { type: 'string', description: 'Post body — share insights about agentic commerce, CEO operations, cannabis tech' }, submolt: { type: 'string', description: 'Submolt (community) to post in. Options: general, introductions, agents, etc. Default: general' } }, required: ['content'] } },
    { name: 'moltbook_comment', description: 'Comment on a Moltbook post. Engage with other agents to build reputation.', input_schema: { type: 'object' as const, properties: { postId: { type: 'string', description: 'Moltbook post ID' }, content: { type: 'string', description: 'Comment text' } }, required: ['postId', 'content'] } },
    { name: 'moltbook_vote', description: 'Upvote or downvote a Moltbook post.', input_schema: { type: 'object' as const, properties: { postId: { type: 'string', description: 'Moltbook post ID' }, direction: { type: 'string', enum: ['up', 'down'], description: 'Vote direction' } }, required: ['postId', 'direction'] } },
    { name: 'moltbook_browse_feed', description: 'Browse the Moltbook feed — see what other agents are posting and discussing.', input_schema: { type: 'object' as const, properties: { limit: { type: 'number', description: 'Number of posts (default 20)' } } } },
    { name: 'moltbook_search_agents', description: 'Search for agents on Moltbook by capability, domain, or name. Discover potential collaborators.', input_schema: { type: 'object' as const, properties: { query: { type: 'string', description: 'Search query (e.g., "cannabis", "sales agent", "compliance")' }, limit: { type: 'number', description: 'Max results (default 10)' } }, required: ['query'] } },
    { name: 'moltbook_send_message', description: 'Send an encrypted DM to another agent on Moltbook.', input_schema: { type: 'object' as const, properties: { agentId: { type: 'string', description: 'Moltbook agent ID' }, message: { type: 'string', description: 'Message content' } }, required: ['agentId', 'message'] } },
    { name: 'moltbook_view_profile', description: 'View another agent\'s Moltbook profile — name, karma, description, capabilities.', input_schema: { type: 'object' as const, properties: { agentId: { type: 'string', description: 'Moltbook agent ID' } }, required: ['agentId'] } },

    // Learning Loop — Remember what works and what doesn't
    { name: 'learning_log', description: 'Log an outreach attempt, strategy result, or business development action for learning. Marty reviews these to improve strategy.', input_schema: { type: 'object' as const, properties: { action: { type: 'string', description: 'What was attempted (e.g., "emailed dispensary X with template Y")' }, result: { type: 'string', enum: ['success', 'failure', 'pending', 'partial'], description: 'Outcome' }, reason: { type: 'string', description: 'Why it worked or failed (analysis)' }, nextStep: { type: 'string', description: 'What to try next based on this result' }, category: { type: 'string', description: 'Category: outreach, linkedin, calendar, meeting, follow-up, strategy' } }, required: ['action', 'result', 'category'] } },
    { name: 'learning_search', description: 'Search past learning logs to find what worked and what didn\'t for a specific strategy or target.', input_schema: { type: 'object' as const, properties: { query: { type: 'string', description: 'What to search for (e.g., "email template competitive-report", "Syracuse dispensaries")' }, category: { type: 'string', description: 'Filter by category' } }, required: ['query'] } },

    // Failure reporting
    { name: 'notify_ceo_problem', description: 'Escalate to the CEO on Slack only when Marty is materially blocked after retrying, pivoting, or delegating. Include the impact and the proposed next move.', input_schema: { type: 'object' as const, properties: { problem: { type: 'string', description: 'What went wrong' }, context: { type: 'string', description: 'What you were trying to do' }, proposed_fix: { type: 'string', description: 'What you think should be tried next' } }, required: ['problem', 'context'] } },
    { name: 'notify_agent_problem', description: 'Escalate a materially blocked failure to a human help channel and record the failure in the learning loop. Use only after a retry, pivot, or delegation attempt.', input_schema: { type: 'object' as const, properties: { problem: { type: 'string', description: 'What failed' }, context: { type: 'string', description: 'What you were trying to do' }, proposedFix: { type: 'string', description: 'What to try next' }, severity: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Failure severity' }, category: { type: 'string', description: 'Retrieval category' } }, required: ['problem', 'context'] } },
];

function extractMartyToolFailure(result: unknown): { problem: string; proposedFix?: string; severity: 'low' | 'medium' | 'high'; category: string } | null {
    if (!result || typeof result !== 'object') {
        return null;
    }

    const record = result as Record<string, unknown>;
    const error = typeof record.error === 'string' ? record.error.trim() : '';
    const success = record.success;
    const blocked = Boolean(record.blocked);

    if (!error && success !== false && !blocked) {
        return null;
    }

    return {
        problem: error || 'Tool execution failed',
        proposedFix: blocked
            ? 'Ask a human to approve or adjust the blocked action.'
            : 'Retry with corrected inputs or a different tool path after reviewing the failure.',
        severity: blocked ? 'high' : success === false ? 'medium' : 'low',
        category: blocked ? 'security' : 'problem',
    };
}

function createMartyToolExecutor(context?: { orgId?: string; brandId?: string }) {
    const learningTools = makeLearningLoopToolsImpl({
        agentId: 'marty',
        role: 'CEO',
        orgId: context?.orgId || null,
        brandId: context?.brandId || null,
        defaultCategory: 'strategy',
        legacyCollection: 'marty_learning_log',
    });

    return async (toolName: string, args: Record<string, unknown>): Promise<unknown> => {
        if (toolName === 'learning_log') {
            return learningTools.learning_log(
                String(args.action ?? ''),
                (String(args.result ?? 'pending') as any),
                typeof args.reason === 'string' ? args.reason : undefined,
                typeof args.nextStep === 'string' ? args.nextStep : undefined,
                typeof args.category === 'string' ? args.category : undefined,
            );
        }

        if (toolName === 'learning_search') {
            return learningTools.learning_search(
                String(args.query ?? ''),
                typeof args.category === 'string' ? args.category : undefined,
                typeof args.limit === 'number' ? args.limit : undefined,
            );
        }

        if (toolName === 'notify_agent_problem') {
            return learningTools.notify_agent_problem(
                String(args.problem ?? ''),
                String(args.context ?? ''),
                typeof args.proposedFix === 'string'
                    ? args.proposedFix
                    : typeof args.proposed_fix === 'string'
                        ? args.proposed_fix
                        : undefined,
                (typeof args.severity === 'string' ? args.severity : 'medium') as any,
                typeof args.category === 'string' ? args.category : undefined,
            );
        }

        // Rate limiter gate — prevent account bans from over-activity
        try {
            const { checkAndRecordAction } = await import('@/server/services/social-media/rate-limiter');
            const rateCheck = checkAndRecordAction(toolName);
            if (!rateCheck.allowed) {
                logger.warn('[Marty] Social rate limit hit', {
                    toolName,
                    platform: rateCheck.platform,
                    blockedBy: rateCheck.blockedBy,
                    retryAfterSec: rateCheck.retryAfterSec,
                });
                return {
                    error: `Rate limited on ${rateCheck.platform} (${rateCheck.blockedBy}). Try again in ${rateCheck.retryAfterSec ?? 60}s.`,
                    rateLimited: true,
                    retryAfterSec: rateCheck.retryAfterSec,
                };
            }
        } catch {
            // Rate limiter failure should not block tool execution
        }

        // Engagement warmup check — warn before cold DMs
        const dmTools = [
            'linkedin_send_message', 'facebook_send_message',
            'instagram_send_message',
        ];
        if (dmTools.includes(toolName)) {
            try {
                const { checkWarmup, recordEngagement } = await import('@/server/services/social-media/engagement-warmup');
                const targetId = String(args.profileUrl ?? args.username ?? '');
                const platform = toolName.split('_')[0] as 'linkedin' | 'facebook' | 'instagram';
                if (targetId) {
                    const warmup = checkWarmup(platform, targetId);
                    if (!warmup.isWarm) {
                        // Don't block — but inject a warning into the result
                        logger.info('[Marty] Cold DM detected — warmup recommended', {
                            toolName, platform, targetId: targetId.slice(0, 50),
                            recommendation: warmup.recommendation,
                        });
                    }
                    // Record engagement for this DM
                    recordEngagement(platform, targetId, 'message');
                }
            } catch {
                // Warmup check failure should not block tool execution
            }
        }

        // Record engagement for non-DM social actions too
        const engagementTools = [
            'linkedin_comment', 'linkedin_react', 'linkedin_view_profile',
            'facebook_comment', 'facebook_react',
            'instagram_comment', 'instagram_react', 'instagram_view_profile',
        ];
        if (engagementTools.includes(toolName)) {
            try {
                const { recordEngagement } = await import('@/server/services/social-media/engagement-warmup');
                const targetId = String(args.profileUrl ?? args.postUrl ?? args.username ?? '');
                const platform = toolName.split('_')[0] as 'linkedin' | 'facebook' | 'instagram';
                if (targetId) {
                    recordEngagement(platform, targetId, toolName.split('_').slice(1).join('_'));
                }
            } catch {
                // Best-effort engagement tracking
            }
        }

        const result = await martyToolExecutor(toolName, args, context);
        const failure = extractMartyToolFailure(result);

        if (failure) {
            try {
                await learningTools.notify_agent_problem(
                    failure.problem,
                    `${toolName} failed while handling a CEO workflow`,
                    failure.proposedFix,
                    failure.severity,
                    failure.category,
                );
            } catch (error) {
                logger.warn('[Marty] Failed to escalate tool error through learning loop', {
                    toolName,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }

        return result;
    };
}

async function martyToolExecutor(
    toolName: string,
    args: Record<string, unknown>,
    context?: { orgId?: string; brandId?: string }
): Promise<unknown> {
    switch (toolName) {
        case 'delegateTask': {
            try {
                const { runAgentChat } = await import('@/app/dashboard/ceo/agents/actions');
                return await runAgentChat(`DELEGATED TASK: ${args.task}`, args.personaId as string, { modelLevel: 'advanced' });
            } catch (authErr) {
                // Fallback: when no user session (cron/test context), call agent directly
                const msg = authErr instanceof Error ? authErr.message : String(authErr);
                if (msg.includes('auth') || msg.includes('session') || msg.includes('user') || msg.includes('Unauthorized')) {
                    logger.info('[Marty] delegateTask auth fallback — calling agent directly', { personaId: args.personaId });
                    const { runAgentCore } = await import('@/server/agents/agent-runner');
                    const { buildSyntheticDecodedIdToken } = await import('@/server/auth/mock-token');
                    const personaId = args.personaId as string;
                    const task = `DELEGATED TASK: ${args.task}`;
                    const syntheticUser = buildSyntheticDecodedIdToken({
                        uid: 'slack-system',
                        email: 'slack-system@bakedbot.ai',
                        role: 'super_user',
                        orgId: context?.orgId || 'org_bakedbot_internal',
                        brandId: context?.brandId || context?.orgId || 'org_bakedbot_internal',
                    } as any, context?.brandId || context?.orgId || 'org_bakedbot_internal');
                    const res = await runAgentCore(
                        task,
                        personaId,
                        {
                            modelLevel: 'advanced',
                            source: 'marty-delegation-fallback',
                            context: {
                                delegatedBy: 'marty',
                                delegatedVia: 'slack',
                                orgId: context?.orgId,
                                brandId: context?.brandId,
                            },
                        },
                        syntheticUser
                    );
                    return {
                        content: res.content,
                        delegatedTo: personaId,
                        toolCalls: res.toolCalls || [],
                    };
                }
                throw authErr;
            }
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
        case 'generateWeeklyCeoMemo': {
            try {
                const { defaultExecutiveBoardTools } = await import('@/app/dashboard/ceo/agents/default-tools');
                return await (defaultExecutiveBoardTools as any).generateWeeklyCeoMemo();
            } catch {
                const { buildMartyWeeklyMemoData } = await import('@/server/services/marty-reporting');
                return buildMartyWeeklyMemoData();
            }
        }
        case 'executeSuperPower': {
            const { defaultExecutiveBoardTools } = await import('@/app/dashboard/ceo/agents/default-tools');
            return await (defaultExecutiveBoardTools as any).executeSuperPower(args.script, args.options);
        }
        case 'marty_dream': {
            const { runDreamSession, notifyDreamReview, isDreamModel } = await import('@/server/services/letta/dream-loop');
            const requestedModel = isDreamModel(args.model) ? args.model : undefined;
            const session = await runDreamSession('Marty', requestedModel);
            await notifyDreamReview(session);

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
        // Gmail — CEO inbox management (martez@bakedbot.ai)
        case 'gmail_search': {
            const query = String(args.query ?? 'is:unread');
            const maxResults = typeof args.maxResults === 'number' ? Math.min(args.maxResults, 50) : 10;
            try {
                const gmail = await getCeoGmailClient();
                if (!gmail) return { error: 'Gmail not connected for CEO account. Connect in Settings > Integrations.' };
                const res = await gmail.users.threads.list({ userId: 'me', q: query, maxResults });
                const threads = res.data.threads || [];
                // Fetch snippet + subject for each thread
                const details = await Promise.all(threads.slice(0, maxResults).map(async (t: any) => {
                    const thread = await gmail.users.threads.get({ userId: 'me', id: t.id!, format: 'metadata', metadataHeaders: ['Subject', 'From', 'Date'] });
                    const firstMsg = thread.data.messages?.[0];
                    const headers = firstMsg?.payload?.headers || [];
                    return {
                        threadId: t.id,
                        subject: headers.find((h: any) => h.name === 'Subject')?.value ?? '(no subject)',
                        from: headers.find((h: any) => h.name === 'From')?.value ?? '',
                        date: headers.find((h: any) => h.name === 'Date')?.value ?? '',
                        snippet: firstMsg?.snippet ?? '',
                        messageCount: thread.data.messages?.length ?? 0,
                    };
                }));
                return { threads: details, total: res.data.resultSizeEstimate ?? details.length };
            } catch (e: any) {
                logger.error('[Marty:Gmail] Search failed', { error: e.message });
                return { error: `Gmail search failed: ${e.message}` };
            }
        }
        case 'gmail_read_thread': {
            const threadId = String(args.threadId ?? '');
            if (!threadId) return { error: 'threadId is required' };
            try {
                const gmail = await getCeoGmailClient();
                if (!gmail) return { error: 'Gmail not connected for CEO account.' };
                const thread = await gmail.users.threads.get({ userId: 'me', id: threadId, format: 'full' });
                const messages = (thread.data.messages || []).map((msg: any) => {
                    const headers = msg.payload?.headers || [];
                    let body = msg.snippet || '';
                    if (msg.payload?.body?.data) {
                        body = Buffer.from(msg.payload.body.data, 'base64').toString('utf-8');
                    } else if (msg.payload?.parts) {
                        const textPart = msg.payload.parts.find((p: any) => p.mimeType === 'text/plain');
                        if (textPart?.body?.data) body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
                    }
                    return {
                        id: msg.id,
                        from: headers.find((h: any) => h.name === 'From')?.value ?? '',
                        to: headers.find((h: any) => h.name === 'To')?.value ?? '',
                        date: headers.find((h: any) => h.name === 'Date')?.value ?? '',
                        subject: headers.find((h: any) => h.name === 'Subject')?.value ?? '',
                        body: body.slice(0, 3000), // Cap body to avoid token bloat
                    };
                });
                return { threadId, messages };
            } catch (e: any) {
                logger.error('[Marty:Gmail] Read thread failed', { error: e.message });
                return { error: `Gmail read failed: ${e.message}` };
            }
        }
        case 'gmail_draft_reply': {
            const to = String(args.to ?? '');
            const subject = String(args.subject ?? '');
            const body = String(args.body ?? '');
            if (!to || !subject || !body) return { error: 'to, subject, and body are required' };
            try {
                const gmail = await getCeoGmailClient();
                if (!gmail) return { error: 'Gmail not connected for CEO account.' };
                const cc = typeof args.cc === 'string' ? args.cc.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
                const rawParts = [
                    `To: ${to}`,
                    ...(cc.length > 0 ? [`Cc: ${cc.join(', ')}`] : []),
                    `Subject: ${subject}`,
                    ...(args.htmlBody ? [
                        'Content-Type: multipart/alternative; boundary="boundary"',
                        '',
                        '--boundary',
                        'Content-Type: text/plain; charset="UTF-8"',
                        '',
                        body,
                        '--boundary',
                        'Content-Type: text/html; charset="UTF-8"',
                        '',
                        String(args.htmlBody),
                        '--boundary--',
                    ] : [
                        'Content-Type: text/plain; charset="UTF-8"',
                        '',
                        body,
                    ]),
                ];
                const raw = Buffer.from(rawParts.join('\r\n')).toString('base64')
                    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
                const draft = await gmail.users.drafts.create({
                    userId: 'me',
                    requestBody: { message: { raw } },
                });
                return { success: true, draftId: draft.data.id, to, subject, note: 'Draft saved — review and send from Gmail.' };
            } catch (e: any) {
                logger.error('[Marty:Gmail] Draft failed', { error: e.message });
                return { error: `Gmail draft failed: ${e.message}` };
            }
        }
        case 'gmail_label': {
            const threadId = String(args.threadId ?? '');
            const labelId = String(args.labelId ?? '');
            const action = String(args.action ?? 'add');
            if (!threadId || !labelId) return { error: 'threadId and labelId are required' };
            try {
                const gmail = await getCeoGmailClient();
                if (!gmail) return { error: 'Gmail not connected for CEO account.' };
                await gmail.users.threads.modify({
                    userId: 'me',
                    id: threadId,
                    requestBody: action === 'remove'
                        ? { removeLabelIds: [labelId] }
                        : { addLabelIds: [labelId] },
                });
                return { success: true, threadId, labelId, action };
            } catch (e: any) {
                return { error: `Gmail label failed: ${e.message}` };
            }
        }
        case 'gmail_list_labels': {
            try {
                const gmail = await getCeoGmailClient();
                if (!gmail) return { error: 'Gmail not connected for CEO account.' };
                const res = await gmail.users.labels.list({ userId: 'me' });
                return { labels: (res.data.labels || []).map((l: any) => ({ id: l.id, name: l.name, type: l.type })) };
            } catch (e: any) {
                return { error: `Gmail list labels failed: ${e.message}` };
            }
        }
        // Google Calendar — CEO schedule
        case 'calendar_list_events': {
            try {
                const tokens = await getCeoCalendarTokens();
                if (!tokens) return { error: 'Google Calendar not connected for CEO. Connect in Settings > Calendar.' };
                const now = new Date();
                const startDate = args.startDate ? new Date(String(args.startDate)) : now;
                const endDate = args.endDate ? new Date(String(args.endDate)) : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                const events = await listGoogleCalendarEvents(tokens, startDate, endDate);
                return {
                    events: events.map(e => ({
                        id: e.id,
                        title: e.title,
                        startAt: e.startAt.toISOString(),
                        endAt: e.endAt.toISOString(),
                        attendees: e.attendees,
                        isAllDay: e.isAllDay,
                        link: e.htmlLink,
                    })),
                    count: events.length,
                };
            } catch (e: unknown) {
                return { error: `Calendar list failed: ${e instanceof Error ? e.message : String(e)}` };
            }
        }
        case 'calendar_check_free': {
            const dateStr = String(args.date ?? '');
            if (!dateStr) return { error: 'date is required (YYYY-MM-DD)' };
            try {
                const tokens = await getCeoCalendarTokens();
                if (!tokens) return { error: 'Google Calendar not connected for CEO.' };
                const startOfDay = new Date(`${dateStr}T00:00:00-05:00`);
                const endOfDay = new Date(`${dateStr}T23:59:59-05:00`);
                const busyTimes = await getGoogleCalendarBusyTimes(tokens, startOfDay, endOfDay);
                return {
                    date: dateStr,
                    busyBlocks: busyTimes.map(b => ({
                        start: b.start.toISOString(),
                        end: b.end.toISOString(),
                        durationMinutes: Math.round((b.end.getTime() - b.start.getTime()) / 60000),
                    })),
                    totalBusyMinutes: busyTimes.reduce((sum, b) => sum + Math.round((b.end.getTime() - b.start.getTime()) / 60000), 0),
                };
            } catch (e: unknown) {
                return { error: `Calendar check failed: ${e instanceof Error ? e.message : String(e)}` };
            }
        }
        case 'calendar_create_event': {
            const summary = String(args.summary ?? '');
            const startAt = String(args.startAt ?? '');
            const endAt = String(args.endAt ?? '');
            if (!summary || !startAt || !endAt) return { error: 'summary, startAt, and endAt are required' };
            try {
                const tokens = await getCeoCalendarTokens();
                if (!tokens) return { error: 'Google Calendar not connected for CEO.' };
                const attendeeEmails = Array.isArray(args.attendeeEmails) ? args.attendeeEmails.map(String) : [];
                const eventId = await createGoogleCalendarEvent(tokens, {
                    summary,
                    description: String(args.description ?? ''),
                    startAt: new Date(startAt),
                    endAt: new Date(endAt),
                    timezone: 'America/New_York',
                    attendeeEmails,
                    videoRoomUrl: '',
                });
                return eventId
                    ? { success: true, eventId, summary, startAt, endAt }
                    : { error: 'Failed to create calendar event' };
            } catch (e: unknown) {
                return { error: `Calendar create failed: ${e instanceof Error ? e.message : String(e)}` };
            }
        }
        case 'calendar_get_upcoming_meetings': {
            try {
                const { getAdminFirestore } = await import('@/firebase/admin');
                const { Timestamp } = await import('firebase-admin/firestore');
                const db = getAdminFirestore();
                const now = new Date();
                const snap = await db.collection('meeting_bookings')
                    .where('profileSlug', '==', 'martez')
                    .where('startAt', '>=', Timestamp.fromDate(now))
                    .where('status', '==', 'confirmed')
                    .orderBy('startAt', 'asc')
                    .limit(typeof args.limit === 'number' ? args.limit : 10)
                    .get();

                // Collect calendarEventIds so we can deduplicate GCal events
                const bakedBotGcalIds = new Set<string>();
                const bookings = snap.docs.map(d => {
                    const data = d.data();
                    if (data.calendarEventId) bakedBotGcalIds.add(data.calendarEventId as string);
                    return {
                        id: d.id,
                        name: data.externalName,
                        email: data.externalEmail,
                        purpose: data.purpose,
                        meetingType: data.meetingTypeName,
                        startAt: data.startAt?.toDate?.()?.toISOString() ?? '',
                        endAt: data.endAt?.toDate?.()?.toISOString() ?? '',
                        videoRoomUrl: data.videoRoomUrl,
                        status: data.status,
                        source: 'bakedbot',
                    };
                });

                // Also get Google Calendar events — deduplicate against BakedBot bookings
                const tokens = await getCeoCalendarTokens();
                let gcalEvents: unknown[] = [];
                if (tokens) {
                    const oneWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                    const events = await listGoogleCalendarEvents(tokens, now, oneWeek);
                    gcalEvents = events
                        .filter(e => !bakedBotGcalIds.has(e.id))
                        .map(e => ({
                            id: e.id,
                            title: e.title,
                            startAt: e.startAt.toISOString(),
                            endAt: e.endAt.toISOString(),
                            attendees: e.attendees,
                            source: 'google_calendar',
                        }));
                }

                return { bookings, gcalEvents, total: bookings.length + gcalEvents.length };
            } catch (e: unknown) {
                return { error: `Meetings fetch failed: ${e instanceof Error ? e.message : String(e)}` };
            }
        }

        case 'searchOpportunities': {
            try {
                const { searchWeb, formatSearchResults } = await import('@/server/tools/web-search');
                const query = String(args.query ?? '').trim();
                if (!query) return { error: 'query is required' };
                const results = await searchWeb(`cannabis ${query}`);
                return await formatSearchResults(results);
            } catch (e: unknown) {
                return { error: `Opportunity search failed: ${e instanceof Error ? e.message : String(e)}` };
            }
        }

        // Outreach tools
        case 'outreach_search_leads': {
            try {
                const { getAdminFirestore } = await import('@/firebase/admin');
                const db = getAdminFirestore();
                let query = db.collection('ny_dispensary_leads') as FirebaseFirestore.Query;
                if (args.city) query = query.where('city', '==', String(args.city));
                const snap = await query.limit(typeof args.limit === 'number' ? args.limit : 10).get();
                const leads = snap.docs.map(d => {
                    const data = d.data();
                    return {
                        id: d.id,
                        dispensaryName: data.dispensaryName || data.name,
                        email: data.email || null,
                        contactName: data.contactName || null,
                        city: data.city,
                        state: data.state || 'NY',
                        phone: data.phone || null,
                        websiteUrl: data.websiteUrl || data.website || null,
                        contactFormUrl: data.contactFormUrl || null,
                        posSystem: data.posSystem || null,
                        source: data.source || 'research',
                    };
                }).filter(l => {
                    if (args.hasEmail && !l.email) return false;
                    if (args.hasContactForm && !l.contactFormUrl && !l.websiteUrl) return false;
                    return true;
                });
                return { leads, count: leads.length };
            } catch (e: unknown) {
                return { error: `Lead search failed: ${e instanceof Error ? e.message : String(e)}` };
            }
        }
        case 'outreach_send_email': {
            try {
                const { executeOutreach, trackInCRM } = await import('@/server/services/ny-outreach/outreach-service');
                const lead = {
                    dispensaryName: String(args.dispensaryName),
                    email: String(args.email),
                    contactName: args.contactName ? String(args.contactName) : undefined,
                    city: String(args.city),
                    state: String(args.state || 'NY'),
                    posSystem: args.posSystem ? String(args.posSystem) : undefined,
                    source: 'marty-outreach',
                };
                const result = await executeOutreach(lead, String(args.templateId));
                // Track in CRM
                await trackInCRM(lead, result);
                return result;
            } catch (e: unknown) {
                return { error: `Outreach failed: ${e instanceof Error ? e.message : String(e)}` };
            }
        }
        case 'outreach_submit_contact_form': {
            try {
                const { executeAgentTask } = await import('@/server/services/rtrvr/agent');
                const senderName = String(args.senderName || 'Martez Knox');
                const senderEmail = String(args.senderEmail || 'martez@bakedbot.ai');
                const targetUrl = String(args.contactFormUrl || args.websiteUrl);
                const task = `Go to ${targetUrl} and find the contact form. Fill out the form with:
- Name: ${senderName}
- Email: ${senderEmail}
- Subject: Partnership Opportunity — ${String(args.dispensaryName)}
- Message: ${String(args.message)}
Submit the form and confirm it was submitted successfully. If there's a CAPTCHA, report it.`;

                const result = await executeAgentTask({ input: task, urls: [targetUrl], verbosity: 'steps' });

                // Log to Firestore
                const { getAdminFirestore } = await import('@/firebase/admin');
                const db = getAdminFirestore();
                await db.collection('ny_outreach_log').add({
                    dispensaryName: String(args.dispensaryName),
                    websiteUrl: targetUrl,
                    outreachType: 'contact_form',
                    message: String(args.message),
                    senderName,
                    senderEmail,
                    status: 'submitted',
                    rtrvrResult: JSON.stringify(result).slice(0, 2000),
                    timestamp: Date.now(),
                    createdAt: Date.now(),
                });

                return { success: true, dispensaryName: args.dispensaryName, url: targetUrl, result: String(result).slice(0, 500) };
            } catch (e: unknown) {
                return { error: `Contact form submission failed: ${e instanceof Error ? e.message : String(e)}` };
            }
        }
        case 'outreach_track_crm': {
            try {
                const { getAdminFirestore } = await import('@/firebase/admin');
                const db = getAdminFirestore();
                const email = args.email ? String(args.email).toLowerCase() : null;

                const crmData = {
                    dispensaryName: String(args.dispensaryName),
                    contactName: args.contactName ? String(args.contactName) : null,
                    email,
                    city: String(args.city),
                    state: String(args.state || 'NY'),
                    status: String(args.status || 'prospect'),
                    notes: args.notes ? String(args.notes) : null,
                    source: 'marty-outreach',
                    updatedAt: Date.now(),
                };

                // Upsert by email if available
                if (email) {
                    const existing = await db.collection('crm_outreach_contacts')
                        .where('email', '==', email).limit(1).get();
                    if (!existing.empty) {
                        await existing.docs[0].ref.update(crmData);
                        return { success: true, action: 'updated', id: existing.docs[0].id };
                    }
                }

                const ref = await db.collection('crm_outreach_contacts').add({
                    ...crmData,
                    createdAt: Date.now(),
                    outreachHistory: [],
                });
                return { success: true, action: 'created', id: ref.id };
            } catch (e: unknown) {
                return { error: `CRM tracking failed: ${e instanceof Error ? e.message : String(e)}` };
            }
        }
        case 'outreach_get_stats': {
            try {
                const { getOutreachStats } = await import('@/server/services/ny-outreach/outreach-read-model');
                return await getOutreachStats();
            } catch (e: unknown) {
                return { error: `Stats fetch failed: ${e instanceof Error ? e.message : String(e)}` };
            }
        }

        // LinkedIn — authenticated browser automation
        case 'linkedin_post': {
            try {
                const { browserAct } = await import('@/server/services/rtrvr/browser-act');
                const ceoUid = process.env.CEO_GMAIL_UID;
                if (!ceoUid) return { error: 'CEO_GMAIL_UID not configured — needed for LinkedIn session' };
                const content = String(args.content ?? '');
                if (!content) return { error: 'content is required' };
                const result = await browserAct(ceoUid, 'linkedin', {
                    task: `Go to linkedin.com/feed. Click "Start a post" or the post creation button. Type the following content into the post composer:\n\n${content}\n\nClick "Post" to publish it. Confirm the post was published successfully.`,
                    urls: ['https://www.linkedin.com/feed'],
                });
                if (!result.success) return { error: `LinkedIn post failed: ${result.error}` };
                return { success: true, action: 'posted', contentPreview: content.slice(0, 100) };
            } catch (e: unknown) {
                return { error: `LinkedIn post failed: ${e instanceof Error ? e.message : String(e)}` };
            }
        }
        case 'linkedin_search_people': {
            try {
                const { browserAct } = await import('@/server/services/rtrvr/browser-act');
                const ceoUid = process.env.CEO_GMAIL_UID;
                if (!ceoUid) return { error: 'CEO_GMAIL_UID not configured' };
                const query = String(args.query ?? '');
                const result = await browserAct(ceoUid, 'linkedin', {
                    task: `Search LinkedIn for people matching: "${query}". Go to linkedin.com/search/results/people/?keywords=${encodeURIComponent(query)}. Extract the first 10 results: name, headline, location, profile URL. Return as structured JSON array.`,
                    urls: [`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(query)}`],
                });
                if (!result.success) return { error: `LinkedIn search failed: ${result.error}` };
                return { success: true, results: result.output };
            } catch (e: unknown) {
                return { error: `LinkedIn search failed: ${e instanceof Error ? e.message : String(e)}` };
            }
        }
        case 'linkedin_send_connection': {
            try {
                const { browserAct } = await import('@/server/services/rtrvr/browser-act');
                const ceoUid = process.env.CEO_GMAIL_UID;
                if (!ceoUid) return { error: 'CEO_GMAIL_UID not configured' };
                const profileUrl = String(args.profileUrl ?? '');
                const note = String(args.note ?? '').slice(0, 300);
                const result = await browserAct(ceoUid, 'linkedin', {
                    task: `Go to ${profileUrl}. Click the "Connect" button. If it asks "How do you know this person?" select "Other". Add a note with this message: "${note}". Click "Send". Confirm the connection request was sent.`,
                    urls: [profileUrl],
                });
                if (!result.success) return { error: `LinkedIn connect failed: ${result.error}` };
                return { success: true, profileUrl, noteSent: note };
            } catch (e: unknown) {
                return { error: `LinkedIn connect failed: ${e instanceof Error ? e.message : String(e)}` };
            }
        }
        case 'linkedin_send_message': {
            try {
                const { browserAct } = await import('@/server/services/rtrvr/browser-act');
                const ceoUid = process.env.CEO_GMAIL_UID;
                if (!ceoUid) return { error: 'CEO_GMAIL_UID not configured' };
                const profileUrl = String(args.profileUrl ?? '');
                const message = String(args.message ?? '');
                const result = await browserAct(ceoUid, 'linkedin', {
                    task: `Go to ${profileUrl}. Click the "Message" button. Type this message: "${message}". Click "Send". Confirm the message was sent.`,
                    urls: [profileUrl],
                });
                if (!result.success) return { error: `LinkedIn message failed: ${result.error}` };
                return { success: true, profileUrl, messageSent: true };
            } catch (e: unknown) {
                return { error: `LinkedIn message failed: ${e instanceof Error ? e.message : String(e)}` };
            }
        }

        // LinkedIn — Expanded capabilities
        case 'linkedin_browse_feed': {
            try {
                const { browserAct } = await import('@/server/services/rtrvr/browser-act');
                const ceoUid = process.env.CEO_GMAIL_UID;
                if (!ceoUid) return { error: 'CEO_GMAIL_UID not configured' };
                const limit = Number(args.limit ?? 10);
                const result = await browserAct(ceoUid, 'linkedin', {
                    task: `Go to linkedin.com/feed. Scroll through the feed and extract the first ${limit} posts. For each post extract: author name, author headline, post content (first 300 chars), number of reactions, number of comments, post URL. Return as a structured JSON array.`,
                    urls: ['https://www.linkedin.com/feed'],
                });
                if (!result.success) return { error: `LinkedIn feed browse failed: ${result.error}` };
                return { success: true, posts: result.output };
            } catch (e: unknown) {
                return { error: `LinkedIn feed browse failed: ${e instanceof Error ? e.message : String(e)}` };
            }
        }
        case 'linkedin_comment': {
            try {
                const { browserAct } = await import('@/server/services/rtrvr/browser-act');
                const ceoUid = process.env.CEO_GMAIL_UID;
                if (!ceoUid) return { error: 'CEO_GMAIL_UID not configured' };
                const postUrl = String(args.postUrl ?? '');
                const comment = String(args.comment ?? '');
                const result = await browserAct(ceoUid, 'linkedin', {
                    task: `Go to ${postUrl}. Click the "Comment" button or the comment input field. Type this comment: "${comment}". Click "Post" or press Enter to submit the comment. Confirm it was posted.`,
                    urls: [postUrl],
                });
                if (!result.success) return { error: `LinkedIn comment failed: ${result.error}` };
                return { success: true, postUrl, commentPosted: true };
            } catch (e: unknown) {
                return { error: `LinkedIn comment failed: ${e instanceof Error ? e.message : String(e)}` };
            }
        }
        case 'linkedin_react': {
            try {
                const { browserAct } = await import('@/server/services/rtrvr/browser-act');
                const ceoUid = process.env.CEO_GMAIL_UID;
                if (!ceoUid) return { error: 'CEO_GMAIL_UID not configured' };
                const postUrl = String(args.postUrl ?? '');
                const reaction = String(args.reaction ?? 'like');
                const result = await browserAct(ceoUid, 'linkedin', {
                    task: `Go to ${postUrl}. Hover over the "Like" button to reveal reaction options. Select the "${reaction}" reaction. Confirm the reaction was applied.`,
                    urls: [postUrl],
                });
                if (!result.success) return { error: `LinkedIn react failed: ${result.error}` };
                return { success: true, postUrl, reaction };
            } catch (e: unknown) {
                return { error: `LinkedIn react failed: ${e instanceof Error ? e.message : String(e)}` };
            }
        }
        case 'linkedin_post_with_image': {
            try {
                const { browserAct } = await import('@/server/services/rtrvr/browser-act');
                const ceoUid = process.env.CEO_GMAIL_UID;
                if (!ceoUid) return { error: 'CEO_GMAIL_UID not configured' };
                const content = String(args.content ?? '');
                const imageUrl = String(args.imageUrl ?? '');
                const result = await browserAct(ceoUid, 'linkedin', {
                    task: `Go to linkedin.com/feed. Click "Start a post". Type this content: "${content}". Click the image/photo icon to add media. Upload or paste this image URL: ${imageUrl}. Click "Post" to publish. Confirm the post was published successfully.`,
                    urls: ['https://www.linkedin.com/feed'],
                });
                if (!result.success) return { error: `LinkedIn image post failed: ${result.error}` };
                return { success: true, action: 'posted_with_image', contentPreview: content.slice(0, 100) };
            } catch (e: unknown) {
                return { error: `LinkedIn image post failed: ${e instanceof Error ? e.message : String(e)}` };
            }
        }
        case 'linkedin_view_profile': {
            try {
                const { browserAct } = await import('@/server/services/rtrvr/browser-act');
                const ceoUid = process.env.CEO_GMAIL_UID;
                if (!ceoUid) return { error: 'CEO_GMAIL_UID not configured' };
                const profileUrl = String(args.profileUrl ?? '');
                const result = await browserAct(ceoUid, 'linkedin', {
                    task: `Go to ${profileUrl}. Extract the full profile: name, headline, location, about section, current company, experience (last 3 positions), skills (top 5), number of connections, whether they are a 1st/2nd/3rd connection. Return as structured JSON.`,
                    urls: [profileUrl],
                });
                if (!result.success) return { error: `LinkedIn profile view failed: ${result.error}` };
                return { success: true, profile: result.output };
            } catch (e: unknown) {
                return { error: `LinkedIn profile view failed: ${e instanceof Error ? e.message : String(e)}` };
            }
        }
        case 'linkedin_browse_groups': {
            try {
                const { browserAct } = await import('@/server/services/rtrvr/browser-act');
                const ceoUid = process.env.CEO_GMAIL_UID;
                if (!ceoUid) return { error: 'CEO_GMAIL_UID not configured' };
                const query = String(args.query ?? '');
                const result = await browserAct(ceoUid, 'linkedin', {
                    task: `Search for LinkedIn groups matching: "${query}". Go to linkedin.com/search/results/groups/?keywords=${encodeURIComponent(query)}. Extract the first 10 groups: name, description, member count, group URL, whether you've joined. Return as structured JSON array.`,
                    urls: [`https://www.linkedin.com/search/results/groups/?keywords=${encodeURIComponent(query)}`],
                });
                if (!result.success) return { error: `LinkedIn group search failed: ${result.error}` };
                return { success: true, groups: result.output };
            } catch (e: unknown) {
                return { error: `LinkedIn group search failed: ${e instanceof Error ? e.message : String(e)}` };
            }
        }
        case 'linkedin_read_inbox': {
            try {
                const { browserAct } = await import('@/server/services/rtrvr/browser-act');
                const ceoUid = process.env.CEO_GMAIL_UID;
                if (!ceoUid) return { error: 'CEO_GMAIL_UID not configured' };
                const limit = Number(args.limit ?? 10);
                const result = await browserAct(ceoUid, 'linkedin', {
                    task: `Go to linkedin.com/messaging. Extract the ${limit} most recent conversations: sender name, last message preview, timestamp, whether unread. Return as structured JSON array.`,
                    urls: ['https://www.linkedin.com/messaging'],
                });
                if (!result.success) return { error: `LinkedIn inbox read failed: ${result.error}` };
                return { success: true, messages: result.output };
            } catch (e: unknown) {
                return { error: `LinkedIn inbox read failed: ${e instanceof Error ? e.message : String(e)}` };
            }
        }
        case 'linkedin_repost': {
            try {
                const { browserAct } = await import('@/server/services/rtrvr/browser-act');
                const ceoUid = process.env.CEO_GMAIL_UID;
                if (!ceoUid) return { error: 'CEO_GMAIL_UID not configured' };
                const postUrl = String(args.postUrl ?? '');
                const commentary = args.commentary ? String(args.commentary) : '';
                const task = commentary
                    ? `Go to ${postUrl}. Click the "Repost" button, then select "Repost with your thoughts". Add this commentary: "${commentary}". Click "Post". Confirm the repost was published.`
                    : `Go to ${postUrl}. Click the "Repost" button, then select "Repost" (instant repost without commentary). Confirm the repost was published.`;
                const result = await browserAct(ceoUid, 'linkedin', { task, urls: [postUrl] });
                if (!result.success) return { error: `LinkedIn repost failed: ${result.error}` };
                return { success: true, postUrl, reposted: true, withCommentary: !!commentary };
            } catch (e: unknown) {
                return { error: `LinkedIn repost failed: ${e instanceof Error ? e.message : String(e)}` };
            }
        }

        // Facebook — authenticated browser automation
        case 'facebook_browse_feed': {
            try {
                const { browserAct } = await import('@/server/services/rtrvr/browser-act');
                const ceoUid = process.env.CEO_GMAIL_UID;
                if (!ceoUid) return { error: 'CEO_GMAIL_UID not configured' };
                const limit = Number(args.limit ?? 10);
                const result = await browserAct(ceoUid, 'facebook', {
                    task: `Go to facebook.com. Scroll through the news feed and extract the first ${limit} posts. For each post extract: author name, post content (first 300 chars), number of reactions, number of comments, post URL. Return as structured JSON array.`,
                    urls: ['https://www.facebook.com'],
                });
                if (!result.success) return { error: `Facebook feed browse failed: ${result.error}` };
                return { success: true, posts: result.output };
            } catch (e: unknown) {
                return { error: `Facebook feed browse failed: ${e instanceof Error ? e.message : String(e)}` };
            }
        }
        case 'facebook_post': {
            try {
                const { browserAct } = await import('@/server/services/rtrvr/browser-act');
                const ceoUid = process.env.CEO_GMAIL_UID;
                if (!ceoUid) return { error: 'CEO_GMAIL_UID not configured' };
                const content = String(args.content ?? '');
                const result = await browserAct(ceoUid, 'facebook', {
                    task: `Go to facebook.com. Click "What's on your mind?" to open the post composer. Type this content:\n\n${content}\n\nClick "Post" to publish. Confirm it was posted successfully.`,
                    urls: ['https://www.facebook.com'],
                });
                if (!result.success) return { error: `Facebook post failed: ${result.error}` };
                return { success: true, action: 'posted', contentPreview: content.slice(0, 100) };
            } catch (e: unknown) {
                return { error: `Facebook post failed: ${e instanceof Error ? e.message : String(e)}` };
            }
        }
        case 'facebook_post_with_image': {
            try {
                const { browserAct } = await import('@/server/services/rtrvr/browser-act');
                const ceoUid = process.env.CEO_GMAIL_UID;
                if (!ceoUid) return { error: 'CEO_GMAIL_UID not configured' };
                const content = String(args.content ?? '');
                const imageUrl = String(args.imageUrl ?? '');
                const result = await browserAct(ceoUid, 'facebook', {
                    task: `Go to facebook.com. Click "What's on your mind?" to open the post composer. Type this content: "${content}". Click the "Photo/video" button to add media. Upload or paste this image URL: ${imageUrl}. Click "Post" to publish. Confirm it was posted.`,
                    urls: ['https://www.facebook.com'],
                });
                if (!result.success) return { error: `Facebook image post failed: ${result.error}` };
                return { success: true, action: 'posted_with_image', contentPreview: content.slice(0, 100) };
            } catch (e: unknown) {
                return { error: `Facebook image post failed: ${e instanceof Error ? e.message : String(e)}` };
            }
        }
        case 'facebook_comment': {
            try {
                const { browserAct } = await import('@/server/services/rtrvr/browser-act');
                const ceoUid = process.env.CEO_GMAIL_UID;
                if (!ceoUid) return { error: 'CEO_GMAIL_UID not configured' };
                const postUrl = String(args.postUrl ?? '');
                const comment = String(args.comment ?? '');
                const result = await browserAct(ceoUid, 'facebook', {
                    task: `Go to ${postUrl}. Click the comment input field. Type this comment: "${comment}". Press Enter or click the send button to post the comment. Confirm it was posted.`,
                    urls: [postUrl],
                });
                if (!result.success) return { error: `Facebook comment failed: ${result.error}` };
                return { success: true, postUrl, commentPosted: true };
            } catch (e: unknown) {
                return { error: `Facebook comment failed: ${e instanceof Error ? e.message : String(e)}` };
            }
        }
        case 'facebook_react': {
            try {
                const { browserAct } = await import('@/server/services/rtrvr/browser-act');
                const ceoUid = process.env.CEO_GMAIL_UID;
                if (!ceoUid) return { error: 'CEO_GMAIL_UID not configured' };
                const postUrl = String(args.postUrl ?? '');
                const reaction = String(args.reaction ?? 'like');
                const result = await browserAct(ceoUid, 'facebook', {
                    task: `Go to ${postUrl}. Hover over the "Like" button to reveal reaction options. Select the "${reaction}" reaction. Confirm the reaction was applied.`,
                    urls: [postUrl],
                });
                if (!result.success) return { error: `Facebook react failed: ${result.error}` };
                return { success: true, postUrl, reaction };
            } catch (e: unknown) {
                return { error: `Facebook react failed: ${e instanceof Error ? e.message : String(e)}` };
            }
        }
        case 'facebook_browse_groups': {
            try {
                const { browserAct } = await import('@/server/services/rtrvr/browser-act');
                const ceoUid = process.env.CEO_GMAIL_UID;
                if (!ceoUid) return { error: 'CEO_GMAIL_UID not configured' };
                const query = String(args.query ?? '');
                const result = await browserAct(ceoUid, 'facebook', {
                    task: `Go to facebook.com/search/groups/?q=${encodeURIComponent(query)}. Extract the first 10 groups: name, description, member count, group URL, privacy (public/private), whether you've joined. Return as structured JSON array.`,
                    urls: [`https://www.facebook.com/search/groups/?q=${encodeURIComponent(query)}`],
                });
                if (!result.success) return { error: `Facebook group search failed: ${result.error}` };
                return { success: true, groups: result.output };
            } catch (e: unknown) {
                return { error: `Facebook group search failed: ${e instanceof Error ? e.message : String(e)}` };
            }
        }
        case 'facebook_post_to_group': {
            try {
                const { browserAct } = await import('@/server/services/rtrvr/browser-act');
                const ceoUid = process.env.CEO_GMAIL_UID;
                if (!ceoUid) return { error: 'CEO_GMAIL_UID not configured' };
                const groupUrl = String(args.groupUrl ?? '');
                const content = String(args.content ?? '');
                const result = await browserAct(ceoUid, 'facebook', {
                    task: `Go to ${groupUrl}. Click "Write something..." or the post composer. Type this content:\n\n${content}\n\nClick "Post" to publish. Confirm it was posted to the group.`,
                    urls: [groupUrl],
                });
                if (!result.success) return { error: `Facebook group post failed: ${result.error}` };
                return { success: true, groupUrl, action: 'posted_to_group' };
            } catch (e: unknown) {
                return { error: `Facebook group post failed: ${e instanceof Error ? e.message : String(e)}` };
            }
        }
        case 'facebook_send_message': {
            try {
                const { browserAct } = await import('@/server/services/rtrvr/browser-act');
                const ceoUid = process.env.CEO_GMAIL_UID;
                if (!ceoUid) return { error: 'CEO_GMAIL_UID not configured' };
                const profileUrl = String(args.profileUrl ?? '');
                const message = String(args.message ?? '');
                const result = await browserAct(ceoUid, 'facebook', {
                    task: `Go to ${profileUrl}. Click the "Message" button. Type this message: "${message}". Click "Send" or press Enter. Confirm the message was sent.`,
                    urls: [profileUrl],
                });
                if (!result.success) return { error: `Facebook message failed: ${result.error}` };
                return { success: true, profileUrl, messageSent: true };
            } catch (e: unknown) {
                return { error: `Facebook message failed: ${e instanceof Error ? e.message : String(e)}` };
            }
        }
        case 'facebook_search': {
            try {
                const { browserAct } = await import('@/server/services/rtrvr/browser-act');
                const ceoUid = process.env.CEO_GMAIL_UID;
                if (!ceoUid) return { error: 'CEO_GMAIL_UID not configured' };
                const query = String(args.query ?? '');
                const type = String(args.type ?? 'all');
                const searchPath = type !== 'all' ? `/search/${type}` : '/search/top';
                const result = await browserAct(ceoUid, 'facebook', {
                    task: `Go to facebook.com${searchPath}/?q=${encodeURIComponent(query)}. Extract the first 10 results with relevant details (name, description/bio, URL). Return as structured JSON array.`,
                    urls: [`https://www.facebook.com${searchPath}/?q=${encodeURIComponent(query)}`],
                });
                if (!result.success) return { error: `Facebook search failed: ${result.error}` };
                return { success: true, results: result.output };
            } catch (e: unknown) {
                return { error: `Facebook search failed: ${e instanceof Error ? e.message : String(e)}` };
            }
        }

        // Reddit — authenticated browser automation
        case 'reddit_browse_feed': {
            try {
                const { browserAct } = await import('@/server/services/rtrvr/browser-act');
                const ceoUid = process.env.CEO_GMAIL_UID;
                if (!ceoUid) return { error: 'CEO_GMAIL_UID not configured' };
                const subreddit = args.subreddit ? String(args.subreddit) : '';
                const sort = String(args.sort ?? 'hot');
                const limit = Number(args.limit ?? 10);
                const url = subreddit
                    ? `https://www.reddit.com/r/${subreddit}/${sort}`
                    : `https://www.reddit.com/${sort}`;
                const result = await browserAct(ceoUid, 'reddit', {
                    task: `Go to ${url}. Extract the first ${limit} posts: title, author, subreddit, score, comment count, post URL, time posted. Return as structured JSON array.`,
                    urls: [url],
                });
                if (!result.success) return { error: `Reddit browse failed: ${result.error}` };
                return { success: true, posts: result.output };
            } catch (e: unknown) {
                return { error: `Reddit browse failed: ${e instanceof Error ? e.message : String(e)}` };
            }
        }
        case 'reddit_post': {
            try {
                const { browserAct } = await import('@/server/services/rtrvr/browser-act');
                const ceoUid = process.env.CEO_GMAIL_UID;
                if (!ceoUid) return { error: 'CEO_GMAIL_UID not configured' };
                const subreddit = String(args.subreddit ?? '');
                const title = String(args.title ?? '');
                const content = String(args.content ?? '');
                const result = await browserAct(ceoUid, 'reddit', {
                    task: `Go to reddit.com/r/${subreddit}/submit. Select "Text" post type. Enter title: "${title}". Enter body:\n\n${content}\n\nClick "Post" to submit. Confirm the post was submitted successfully and return the post URL.`,
                    urls: [`https://www.reddit.com/r/${subreddit}/submit`],
                });
                if (!result.success) return { error: `Reddit post failed: ${result.error}` };
                return { success: true, subreddit, title, posted: true, result: result.output };
            } catch (e: unknown) {
                return { error: `Reddit post failed: ${e instanceof Error ? e.message : String(e)}` };
            }
        }
        case 'reddit_comment': {
            try {
                const { browserAct } = await import('@/server/services/rtrvr/browser-act');
                const ceoUid = process.env.CEO_GMAIL_UID;
                if (!ceoUid) return { error: 'CEO_GMAIL_UID not configured' };
                const postUrl = String(args.postUrl ?? '');
                const comment = String(args.comment ?? '');
                const result = await browserAct(ceoUid, 'reddit', {
                    task: `Go to ${postUrl}. Find the comment input box. Type this comment:\n\n${comment}\n\nClick "Comment" to submit. Confirm the comment was posted.`,
                    urls: [postUrl],
                });
                if (!result.success) return { error: `Reddit comment failed: ${result.error}` };
                return { success: true, postUrl, commentPosted: true };
            } catch (e: unknown) {
                return { error: `Reddit comment failed: ${e instanceof Error ? e.message : String(e)}` };
            }
        }
        case 'reddit_search': {
            try {
                const { browserAct } = await import('@/server/services/rtrvr/browser-act');
                const ceoUid = process.env.CEO_GMAIL_UID;
                if (!ceoUid) return { error: 'CEO_GMAIL_UID not configured' };
                const query = String(args.query ?? '');
                const subreddit = args.subreddit ? String(args.subreddit) : '';
                const url = subreddit
                    ? `https://www.reddit.com/r/${subreddit}/search/?q=${encodeURIComponent(query)}&restrict_sr=1`
                    : `https://www.reddit.com/search/?q=${encodeURIComponent(query)}`;
                const result = await browserAct(ceoUid, 'reddit', {
                    task: `Go to ${url}. Extract the first 10 results: title, author, subreddit, score, comment count, post URL. Return as structured JSON array.`,
                    urls: [url],
                });
                if (!result.success) return { error: `Reddit search failed: ${result.error}` };
                return { success: true, results: result.output };
            } catch (e: unknown) {
                return { error: `Reddit search failed: ${e instanceof Error ? e.message : String(e)}` };
            }
        }
        case 'reddit_read_post': {
            try {
                const { browserAct } = await import('@/server/services/rtrvr/browser-act');
                const ceoUid = process.env.CEO_GMAIL_UID;
                if (!ceoUid) return { error: 'CEO_GMAIL_UID not configured' };
                const postUrl = String(args.postUrl ?? '');
                const result = await browserAct(ceoUid, 'reddit', {
                    task: `Go to ${postUrl}. Extract the full post: title, author, subreddit, score, post body text, and the top 10 comments (author, score, text). Return as structured JSON.`,
                    urls: [postUrl],
                });
                if (!result.success) return { error: `Reddit read failed: ${result.error}` };
                return { success: true, post: result.output };
            } catch (e: unknown) {
                return { error: `Reddit read failed: ${e instanceof Error ? e.message : String(e)}` };
            }
        }
        case 'reddit_vote': {
            try {
                const { browserAct } = await import('@/server/services/rtrvr/browser-act');
                const ceoUid = process.env.CEO_GMAIL_UID;
                if (!ceoUid) return { error: 'CEO_GMAIL_UID not configured' };
                const postUrl = String(args.postUrl ?? '');
                const direction = String(args.direction ?? 'up');
                const result = await browserAct(ceoUid, 'reddit', {
                    task: `Go to ${postUrl}. Click the ${direction}vote arrow button. Confirm the vote was registered.`,
                    urls: [postUrl],
                });
                if (!result.success) return { error: `Reddit vote failed: ${result.error}` };
                return { success: true, postUrl, voted: direction };
            } catch (e: unknown) {
                return { error: `Reddit vote failed: ${e instanceof Error ? e.message : String(e)}` };
            }
        }
        case 'reddit_send_message': {
            try {
                const { browserAct } = await import('@/server/services/rtrvr/browser-act');
                const ceoUid = process.env.CEO_GMAIL_UID;
                if (!ceoUid) return { error: 'CEO_GMAIL_UID not configured' };
                const username = String(args.username ?? '');
                const subject = String(args.subject ?? '');
                const message = String(args.message ?? '');
                const result = await browserAct(ceoUid, 'reddit', {
                    task: `Go to reddit.com/message/compose/?to=${username}. Enter subject: "${subject}". Enter message:\n\n${message}\n\nClick "Send" to deliver the message. Confirm it was sent.`,
                    urls: [`https://www.reddit.com/message/compose/?to=${username}`],
                });
                if (!result.success) return { error: `Reddit message failed: ${result.error}` };
                return { success: true, username, messageSent: true };
            } catch (e: unknown) {
                return { error: `Reddit message failed: ${e instanceof Error ? e.message : String(e)}` };
            }
        }
        case 'reddit_browse_subreddit_info': {
            try {
                const { browserAct } = await import('@/server/services/rtrvr/browser-act');
                const ceoUid = process.env.CEO_GMAIL_UID;
                if (!ceoUid) return { error: 'CEO_GMAIL_UID not configured' };
                const subreddit = String(args.subreddit ?? '');
                const result = await browserAct(ceoUid, 'reddit', {
                    task: `Go to reddit.com/r/${subreddit}/about. Extract: subreddit name, description, subscriber count, active users, creation date, rules (list), and moderator names. Return as structured JSON.`,
                    urls: [`https://www.reddit.com/r/${subreddit}`],
                });
                if (!result.success) return { error: `Reddit subreddit info failed: ${result.error}` };
                return { success: true, subreddit, info: result.output };
            } catch (e: unknown) {
                return { error: `Reddit subreddit info failed: ${e instanceof Error ? e.message : String(e)}` };
            }
        }

        // Instagram — authenticated browser automation
        case 'instagram_browse_feed': {
            try {
                const { browserAct } = await import('@/server/services/rtrvr/browser-act');
                const ceoUid = process.env.CEO_GMAIL_UID;
                if (!ceoUid) return { error: 'CEO_GMAIL_UID not configured' };
                const limit = Number(args.limit ?? 10);
                const result = await browserAct(ceoUid, 'instagram', {
                    task: `Go to instagram.com. Scroll through the feed and extract the first ${limit} posts. For each: author username, caption (first 200 chars), like count, comment count, post URL. Return as structured JSON array.`,
                    urls: ['https://www.instagram.com'],
                });
                if (!result.success) return { error: `Instagram feed browse failed: ${result.error}` };
                return { success: true, posts: result.output };
            } catch (e: unknown) {
                return { error: `Instagram feed browse failed: ${e instanceof Error ? e.message : String(e)}` };
            }
        }
        case 'instagram_post_with_image': {
            try {
                const { browserAct } = await import('@/server/services/rtrvr/browser-act');
                const ceoUid = process.env.CEO_GMAIL_UID;
                if (!ceoUid) return { error: 'CEO_GMAIL_UID not configured' };
                const imageUrl = String(args.imageUrl ?? '');
                const caption = String(args.caption ?? '');
                const result = await browserAct(ceoUid, 'instagram', {
                    task: `Go to instagram.com. Click the "+" or "Create" button to start a new post. Upload or use this image: ${imageUrl}. Click "Next" through any editing steps. Add this caption:\n\n${caption}\n\nClick "Share" to post. Confirm the post was published.`,
                    urls: ['https://www.instagram.com'],
                });
                if (!result.success) return { error: `Instagram post failed: ${result.error}` };
                return { success: true, action: 'posted', captionPreview: caption.slice(0, 100) };
            } catch (e: unknown) {
                return { error: `Instagram post failed: ${e instanceof Error ? e.message : String(e)}` };
            }
        }
        case 'instagram_comment': {
            try {
                const { browserAct } = await import('@/server/services/rtrvr/browser-act');
                const ceoUid = process.env.CEO_GMAIL_UID;
                if (!ceoUid) return { error: 'CEO_GMAIL_UID not configured' };
                const postUrl = String(args.postUrl ?? '');
                const comment = String(args.comment ?? '');
                const result = await browserAct(ceoUid, 'instagram', {
                    task: `Go to ${postUrl}. Click the comment input field. Type: "${comment}". Click "Post" or press Enter. Confirm the comment was posted.`,
                    urls: [postUrl],
                });
                if (!result.success) return { error: `Instagram comment failed: ${result.error}` };
                return { success: true, postUrl, commentPosted: true };
            } catch (e: unknown) {
                return { error: `Instagram comment failed: ${e instanceof Error ? e.message : String(e)}` };
            }
        }
        case 'instagram_react': {
            try {
                const { browserAct } = await import('@/server/services/rtrvr/browser-act');
                const ceoUid = process.env.CEO_GMAIL_UID;
                if (!ceoUid) return { error: 'CEO_GMAIL_UID not configured' };
                const postUrl = String(args.postUrl ?? '');
                const result = await browserAct(ceoUid, 'instagram', {
                    task: `Go to ${postUrl}. Click the heart/like button. Confirm the post was liked.`,
                    urls: [postUrl],
                });
                if (!result.success) return { error: `Instagram like failed: ${result.error}` };
                return { success: true, postUrl, liked: true };
            } catch (e: unknown) {
                return { error: `Instagram like failed: ${e instanceof Error ? e.message : String(e)}` };
            }
        }
        case 'instagram_view_profile': {
            try {
                const { browserAct } = await import('@/server/services/rtrvr/browser-act');
                const ceoUid = process.env.CEO_GMAIL_UID;
                if (!ceoUid) return { error: 'CEO_GMAIL_UID not configured' };
                const username = String(args.username ?? '');
                const result = await browserAct(ceoUid, 'instagram', {
                    task: `Go to instagram.com/${username}. Extract the profile: display name, bio, follower count, following count, post count, profile picture, website link, and last 6 post URLs. Return as structured JSON.`,
                    urls: [`https://www.instagram.com/${username}`],
                });
                if (!result.success) return { error: `Instagram profile view failed: ${result.error}` };
                return { success: true, profile: result.output };
            } catch (e: unknown) {
                return { error: `Instagram profile view failed: ${e instanceof Error ? e.message : String(e)}` };
            }
        }
        case 'instagram_send_message': {
            try {
                const { browserAct } = await import('@/server/services/rtrvr/browser-act');
                const ceoUid = process.env.CEO_GMAIL_UID;
                if (!ceoUid) return { error: 'CEO_GMAIL_UID not configured' };
                const username = String(args.username ?? '');
                const message = String(args.message ?? '');
                const result = await browserAct(ceoUid, 'instagram', {
                    task: `Go to instagram.com/direct/new. Search for "${username}" in the recipient field. Select their profile. Type this message: "${message}". Click "Send". Confirm the message was sent.`,
                    urls: ['https://www.instagram.com/direct/new'],
                });
                if (!result.success) return { error: `Instagram message failed: ${result.error}` };
                return { success: true, username, messageSent: true };
            } catch (e: unknown) {
                return { error: `Instagram message failed: ${e instanceof Error ? e.message : String(e)}` };
            }
        }
        case 'instagram_search': {
            try {
                const { browserAct } = await import('@/server/services/rtrvr/browser-act');
                const ceoUid = process.env.CEO_GMAIL_UID;
                if (!ceoUid) return { error: 'CEO_GMAIL_UID not configured' };
                const query = String(args.query ?? '');
                const type = String(args.type ?? 'users');
                const result = await browserAct(ceoUid, 'instagram', {
                    task: `Go to instagram.com/explore/search. Type "${query}" in the search bar. Switch to the "${type}" tab if available. Extract the first 10 results with relevant details. Return as structured JSON array.`,
                    urls: ['https://www.instagram.com/explore'],
                });
                if (!result.success) return { error: `Instagram search failed: ${result.error}` };
                return { success: true, results: result.output };
            } catch (e: unknown) {
                return { error: `Instagram search failed: ${e instanceof Error ? e.message : String(e)}` };
            }
        }
        case 'instagram_browse_stories': {
            try {
                const { browserAct } = await import('@/server/services/rtrvr/browser-act');
                const ceoUid = process.env.CEO_GMAIL_UID;
                if (!ceoUid) return { error: 'CEO_GMAIL_UID not configured' };
                const username = args.username ? String(args.username) : '';
                const url = username
                    ? `https://www.instagram.com/stories/${username}`
                    : 'https://www.instagram.com';
                const task = username
                    ? `Go to ${url}. View the stories. Extract: number of stories, content description of each story (image/video, text overlays, stickers). Return as structured JSON.`
                    : `Go to instagram.com. Look at the stories bar at the top. Extract which accounts have active stories (first 10): username, profile pic indicator. Return as structured JSON array.`;
                const result = await browserAct(ceoUid, 'instagram', { task, urls: [url] });
                if (!result.success) return { error: `Instagram stories browse failed: ${result.error}` };
                return { success: true, stories: result.output };
            } catch (e: unknown) {
                return { error: `Instagram stories browse failed: ${e instanceof Error ? e.message : String(e)}` };
            }
        }

        // Social Media Intelligence tools
        case 'social_adapt_content': {
            try {
                const { adaptContent } = await import('@/server/services/social-media/content-adapter');
                const content = String(args.content ?? '');
                const platform = String(args.platform ?? 'linkedin') as Parameters<typeof adaptContent>[1];
                const result = await adaptContent(content, platform, {
                    topic: typeof args.topic === 'string' ? args.topic : undefined,
                    intent: typeof args.intent === 'string' ? args.intent : undefined,
                });
                return { success: true, adapted: result };
            } catch (e: unknown) {
                return { error: `Content adaptation failed: ${e instanceof Error ? e.message : String(e)}` };
            }
        }
        case 'social_adapt_all': {
            try {
                const { adaptForAllPlatforms } = await import('@/server/services/social-media/content-adapter');
                const content = String(args.content ?? '');
                const results = await adaptForAllPlatforms(content, {
                    topic: typeof args.topic === 'string' ? args.topic : undefined,
                });
                return { success: true, adaptations: results };
            } catch (e: unknown) {
                return { error: `Multi-platform adaptation failed: ${e instanceof Error ? e.message : String(e)}` };
            }
        }
        case 'social_check_limits': {
            try {
                const { getAllUsage } = await import('@/server/services/social-media/rate-limiter');
                return { success: true, usage: getAllUsage() };
            } catch (e: unknown) {
                return { error: `Rate limit check failed: ${e instanceof Error ? e.message : String(e)}` };
            }
        }
        case 'social_scan_signals': {
            try {
                const { runFullScan } = await import('@/server/services/social-media/social-listener');
                const result = await runFullScan();
                return {
                    success: true,
                    totalSignals: result.totalSignals,
                    highValue: result.highValue,
                    topSignals: result.results.flatMap(r => r.signals).slice(0, 10).map(s => ({
                        platform: s.platform,
                        source: s.source,
                        title: s.title.slice(0, 100),
                        score: s.relevanceScore,
                        action: s.actionType,
                        suggestion: s.suggestedAction.slice(0, 200),
                        url: s.url,
                    })),
                };
            } catch (e: unknown) {
                return { error: `Social scan failed: ${e instanceof Error ? e.message : String(e)}` };
            }
        }
        case 'social_warmup_check': {
            try {
                const { checkWarmup } = await import('@/server/services/social-media/engagement-warmup');
                const platform = String(args.platform ?? 'linkedin') as Parameters<typeof checkWarmup>[0];
                const targetId = String(args.targetId ?? '');
                const result = checkWarmup(platform, targetId);
                return {
                    success: true,
                    isWarm: result.isWarm,
                    engagementCount: result.engagementCount,
                    recommendation: result.recommendation,
                    warmupActions: result.warmupActions.map(a => ({
                        tool: a.tool,
                        description: a.description,
                        priority: a.priority,
                    })),
                };
            } catch (e: unknown) {
                return { error: `Warmup check failed: ${e instanceof Error ? e.message : String(e)}` };
            }
        }

        // Moltbook — REST API (no browser automation)
        case 'moltbook_post': {
            try {
                const { createPost, isMoltbookConfigured } = await import('@/server/services/moltbook/client');
                if (!isMoltbookConfigured()) return { error: 'MOLTBOOK_API_KEY not configured — register Marty at moltbook.com first' };
                const content = String(args.content ?? '');
                const title = String(args.title ?? content.split('\n')[0].slice(0, 200));
                const submolt = String(args.submolt ?? 'general');
                const result = await createPost(title, content, submolt);
                if (!result.success) return { error: `Moltbook post failed: ${result.error}` };
                return { success: true, post: result.data, verified: result.verified };
            } catch (e: unknown) {
                return { error: `Moltbook post failed: ${e instanceof Error ? e.message : String(e)}` };
            }
        }
        case 'moltbook_comment': {
            try {
                const { commentOnPost, isMoltbookConfigured } = await import('@/server/services/moltbook/client');
                if (!isMoltbookConfigured()) return { error: 'MOLTBOOK_API_KEY not configured' };
                const postId = String(args.postId ?? '');
                const content = String(args.content ?? '');
                const result = await commentOnPost(postId, content);
                if (!result.success) return { error: `Moltbook comment failed: ${result.error}` };
                return { success: true, comment: result.data };
            } catch (e: unknown) {
                return { error: `Moltbook comment failed: ${e instanceof Error ? e.message : String(e)}` };
            }
        }
        case 'moltbook_vote': {
            try {
                const { voteOnPost, isMoltbookConfigured } = await import('@/server/services/moltbook/client');
                if (!isMoltbookConfigured()) return { error: 'MOLTBOOK_API_KEY not configured' };
                const postId = String(args.postId ?? '');
                const direction = (args.direction === 'down' ? 'down' : 'up') as 'up' | 'down';
                const result = await voteOnPost(postId, direction);
                if (!result.success) return { error: `Moltbook vote failed: ${result.error}` };
                return { success: true, postId, direction, votes: result.data?.votes };
            } catch (e: unknown) {
                return { error: `Moltbook vote failed: ${e instanceof Error ? e.message : String(e)}` };
            }
        }
        case 'moltbook_browse_feed': {
            try {
                const { browseFeed, isMoltbookConfigured } = await import('@/server/services/moltbook/client');
                if (!isMoltbookConfigured()) return { error: 'MOLTBOOK_API_KEY not configured' };
                const limit = Number(args.limit ?? 20);
                const result = await browseFeed(limit);
                if (!result.success) return { error: `Moltbook feed failed: ${result.error}` };
                return { success: true, posts: result.data };
            } catch (e: unknown) {
                return { error: `Moltbook feed failed: ${e instanceof Error ? e.message : String(e)}` };
            }
        }
        case 'moltbook_search_agents': {
            try {
                const { searchAgents, isMoltbookConfigured } = await import('@/server/services/moltbook/client');
                if (!isMoltbookConfigured()) return { error: 'MOLTBOOK_API_KEY not configured' };
                const query = String(args.query ?? '');
                const limit = Number(args.limit ?? 10);
                const result = await searchAgents(query, limit);
                if (!result.success) return { error: `Moltbook agent search failed: ${result.error}` };
                return { success: true, agents: result.data };
            } catch (e: unknown) {
                return { error: `Moltbook agent search failed: ${e instanceof Error ? e.message : String(e)}` };
            }
        }
        case 'moltbook_send_message': {
            try {
                const { sendMessage, isMoltbookConfigured } = await import('@/server/services/moltbook/client');
                if (!isMoltbookConfigured()) return { error: 'MOLTBOOK_API_KEY not configured' };
                const agentId = String(args.agentId ?? '');
                const message = String(args.message ?? '');
                const result = await sendMessage(agentId, message);
                if (!result.success) return { error: `Moltbook message failed: ${result.error}` };
                return { success: true, message: result.data };
            } catch (e: unknown) {
                return { error: `Moltbook message failed: ${e instanceof Error ? e.message : String(e)}` };
            }
        }
        case 'moltbook_view_profile': {
            try {
                const { getAgentById, isMoltbookConfigured } = await import('@/server/services/moltbook/client');
                if (!isMoltbookConfigured()) return { error: 'MOLTBOOK_API_KEY not configured' };
                const agentId = String(args.agentId ?? '');
                const result = await getAgentById(agentId);
                if (!result.success) return { error: `Moltbook profile view failed: ${result.error}` };
                return { success: true, agent: result.data };
            } catch (e: unknown) {
                return { error: `Moltbook profile view failed: ${e instanceof Error ? e.message : String(e)}` };
            }
        }

        // Learning Loop
        case 'learning_log': {
            try {
                const { getAdminFirestore } = await import('@/firebase/admin');
                const db = getAdminFirestore();
                const ref = await db.collection('marty_learning_log').add({
                    action: String(args.action ?? ''),
                    result: String(args.result ?? 'pending'),
                    reason: args.reason ? String(args.reason) : null,
                    nextStep: args.nextStep ? String(args.nextStep) : null,
                    category: String(args.category ?? 'general'),
                    timestamp: Date.now(),
                    createdAt: Date.now(),
                });
                return { success: true, logId: ref.id, action: args.action, result: args.result };
            } catch (e: unknown) {
                return { error: `Learning log failed: ${e instanceof Error ? e.message : String(e)}` };
            }
        }
        case 'learning_search': {
            try {
                const { getAdminFirestore } = await import('@/firebase/admin');
                const db = getAdminFirestore();
                let query = db.collection('marty_learning_log')
                    .orderBy('timestamp', 'desc')
                    .limit(20) as FirebaseFirestore.Query;
                if (args.category) {
                    query = db.collection('marty_learning_log')
                        .where('category', '==', String(args.category))
                        .orderBy('timestamp', 'desc')
                        .limit(20);
                }
                const snap = await query.get();
                const searchTerm = String(args.query ?? '').toLowerCase();
                const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                    .filter((log: any) => {
                        const text = `${log.action} ${log.reason ?? ''} ${log.nextStep ?? ''}`.toLowerCase();
                        return text.includes(searchTerm);
                    });
                return { logs, count: logs.length };
            } catch (e: unknown) {
                return { error: `Learning search failed: ${e instanceof Error ? e.message : String(e)}` };
            }
        }

        // Failure notification
        case 'notify_ceo_problem': {
            try {
                const { postLinusIncidentSlack } = await import('@/server/services/incident-notifications');
                await postLinusIncidentSlack({
                    source: 'marty-problem-report',
                    channelName: 'ceo',
                    fallbackText: `Problem: ${String(args.problem ?? '').slice(0, 100)}`,
                    blocks: [
                        {
                            type: 'section',
                            text: {
                                type: 'mrkdwn',
                                text: `:rotating_light: *Marty ran into a problem*\n\n*What I was doing:* ${String(args.context ?? 'Unknown')}\n*Problem:* ${String(args.problem ?? 'Unknown')}\n${args.proposed_fix ? `*Proposed fix:* ${String(args.proposed_fix)}` : '_No fix proposed yet — need your guidance._'}\n\n_Every problem is a learning opportunity. What should I try?_`,
                            },
                        },
                    ],
                });

                // Also log to learning loop
                const { getAdminFirestore } = await import('@/firebase/admin');
                const db = getAdminFirestore();
                await db.collection('marty_learning_log').add({
                    action: String(args.context ?? ''),
                    result: 'failure',
                    reason: String(args.problem ?? ''),
                    nextStep: args.proposed_fix ? String(args.proposed_fix) : null,
                    category: 'problem',
                    timestamp: Date.now(),
                    createdAt: Date.now(),
                });

                return { success: true, notified: true };
            } catch (e: unknown) {
                return { error: `Notification failed: ${e instanceof Error ? e.message : String(e)}` };
            }
        }
        default:
            return { error: `Unknown tool: ${toolName}` };
    }
}

/**
 * Maps a Marty tool call to a human-readable Slack status message.
 */
function buildMartyProgressMessage(toolName: string, input: Record<string, unknown>): string {
    switch (toolName) {
        case 'delegateTask':
            return `_Marty Benjamins is delegating to ${input.personaId ?? 'the team'}..._`;
        case 'broadcastToSquad':
            return '_Marty Benjamins is sending a company-wide directive..._';
        case 'getSystemHealth':
            return '_Marty Benjamins is checking system health..._';
        case 'getActivePlaybooks':
            return '_Marty Benjamins is reviewing active playbooks..._';
        case 'generateWeeklyCeoMemo':
            return '_Marty Benjamins is drafting the weekly CEO memo..._';
        case 'crmListUsers':
            return '_Marty Benjamins is pulling the user pipeline..._';
        case 'crmGetStats':
            return '_Marty Benjamins is pulling CRM stats and MRR..._';
        case 'executeSuperPower':
            return `_Marty Benjamins is running super power: \`${String(input.script ?? '').slice(0, 40)}\`..._`;
        case 'marty_dream':
            return '_Marty Benjamins is dreaming — introspecting, hypothesizing, testing..._';
        case 'letta_save_fact':
            return '_Marty Benjamins is updating CEO memory..._';
        case 'letta_search_memory':
            return '_Marty Benjamins is searching long-term memory..._';
        case 'rtrvrAgent':
            return '_Marty Benjamins is launching a browser research agent..._';
        case 'rtrvrScrape':
            return '_Marty Benjamins is scraping a URL for intel..._';
        case 'gmail_search':
            return '_Marty Benjamins is searching the inbox..._';
        case 'gmail_read_thread':
            return '_Marty Benjamins is reading an email thread..._';
        case 'gmail_draft_reply':
            return '_Marty Benjamins is drafting an email reply..._';
        case 'gmail_compose':
            return '_Marty Benjamins is composing an email..._';
        case 'gmail_label':
            return '_Marty Benjamins is organizing emails..._';
        case 'calendar_list_events':
            return '_Marty Benjamins is checking the calendar..._';
        case 'calendar_check_free':
            return '_Marty Benjamins is checking availability..._';
        case 'calendar_create_event':
            return '_Marty Benjamins is scheduling a calendar event..._';
        case 'calendar_get_upcoming_meetings':
            return '_Marty Benjamins is pulling upcoming meetings..._';
        case 'searchOpportunities':
            return '_Marty Benjamins is scanning the market for fresh opportunities..._';
        case 'outreach_search_leads':
            return '_Marty Benjamins is searching for leads..._';
        case 'outreach_send_email':
            return `_Marty Benjamins is sending outreach to ${String(input.dispensaryName ?? 'a dispensary')}..._`;
        case 'outreach_submit_contact_form':
            return `_Marty Benjamins is submitting a contact form to ${String(input.dispensaryName ?? 'a dispensary')}..._`;
        case 'outreach_track_crm':
            return '_Marty Benjamins is updating the CRM..._';
        case 'outreach_get_stats':
            return '_Marty Benjamins is pulling outreach stats..._';
        case 'linkedin_post':
            return '_Marty Benjamins is posting to LinkedIn..._';
        case 'linkedin_search_people':
            return '_Marty Benjamins is searching LinkedIn for leads..._';
        case 'linkedin_send_connection':
            return '_Marty Benjamins is sending a LinkedIn connection request..._';
        case 'linkedin_send_message':
            return '_Marty Benjamins is sending a LinkedIn message..._';
        case 'linkedin_browse_feed':
            return '_Marty Benjamins is browsing the LinkedIn feed..._';
        case 'linkedin_comment':
            return '_Marty Benjamins is commenting on a LinkedIn post..._';
        case 'linkedin_react':
            return '_Marty Benjamins is reacting to a LinkedIn post..._';
        case 'linkedin_post_with_image':
            return '_Marty Benjamins is posting to LinkedIn with an image..._';
        case 'linkedin_view_profile':
            return '_Marty Benjamins is viewing a LinkedIn profile..._';
        case 'linkedin_browse_groups':
            return '_Marty Benjamins is browsing LinkedIn groups..._';
        case 'linkedin_read_inbox':
            return '_Marty Benjamins is checking LinkedIn messages..._';
        case 'linkedin_repost':
            return '_Marty Benjamins is reposting content on LinkedIn..._';
        case 'facebook_browse_feed':
            return '_Marty Benjamins is browsing the Facebook feed..._';
        case 'facebook_post':
        case 'facebook_post_with_image':
            return '_Marty Benjamins is posting to Facebook..._';
        case 'facebook_comment':
            return '_Marty Benjamins is commenting on a Facebook post..._';
        case 'facebook_react':
            return '_Marty Benjamins is reacting to a Facebook post..._';
        case 'facebook_browse_groups':
            return '_Marty Benjamins is browsing Facebook groups..._';
        case 'facebook_post_to_group':
            return '_Marty Benjamins is posting to a Facebook group..._';
        case 'facebook_send_message':
            return '_Marty Benjamins is sending a Facebook message..._';
        case 'facebook_search':
            return '_Marty Benjamins is searching Facebook..._';
        case 'reddit_browse_feed':
            return '_Marty Benjamins is browsing Reddit..._';
        case 'reddit_post':
            return '_Marty Benjamins is posting to Reddit..._';
        case 'reddit_comment':
            return '_Marty Benjamins is commenting on Reddit..._';
        case 'reddit_search':
            return '_Marty Benjamins is searching Reddit..._';
        case 'reddit_read_post':
            return '_Marty Benjamins is reading a Reddit post..._';
        case 'reddit_vote':
            return '_Marty Benjamins is voting on Reddit..._';
        case 'reddit_send_message':
            return '_Marty Benjamins is sending a Reddit message..._';
        case 'reddit_browse_subreddit_info':
            return '_Marty Benjamins is checking subreddit info..._';
        case 'instagram_browse_feed':
            return '_Marty Benjamins is browsing the Instagram feed..._';
        case 'instagram_post_with_image':
            return '_Marty Benjamins is posting to Instagram..._';
        case 'instagram_comment':
            return '_Marty Benjamins is commenting on Instagram..._';
        case 'instagram_react':
            return '_Marty Benjamins is liking an Instagram post..._';
        case 'instagram_view_profile':
            return '_Marty Benjamins is viewing an Instagram profile..._';
        case 'instagram_send_message':
            return '_Marty Benjamins is sending an Instagram DM..._';
        case 'instagram_search':
            return '_Marty Benjamins is searching Instagram..._';
        case 'instagram_browse_stories':
            return '_Marty Benjamins is browsing Instagram stories..._';
        case 'social_adapt_content':
        case 'social_adapt_all':
            return '_Marty Benjamins is adapting content for cross-platform posting..._';
        case 'social_check_limits':
            return '_Marty Benjamins is checking social media rate limits..._';
        case 'social_scan_signals':
            return '_Marty Benjamins is scanning social media for leads and opportunities..._';
        case 'social_warmup_check':
            return '_Marty Benjamins is checking engagement warmup status..._';
        case 'moltbook_post':
            return '_Marty Benjamins is posting to Moltbook..._';
        case 'moltbook_comment':
            return '_Marty Benjamins is commenting on Moltbook..._';
        case 'moltbook_vote':
            return '_Marty Benjamins is voting on Moltbook..._';
        case 'moltbook_browse_feed':
            return '_Marty Benjamins is browsing the Moltbook feed..._';
        case 'moltbook_search_agents':
            return '_Marty Benjamins is searching for agents on Moltbook..._';
        case 'moltbook_send_message':
            return '_Marty Benjamins is messaging an agent on Moltbook..._';
        case 'moltbook_view_profile':
            return '_Marty Benjamins is viewing an agent profile on Moltbook..._';
        case 'learning_log':
            return '_Marty Benjamins is logging what he learned..._';
        case 'learning_search':
            return '_Marty Benjamins is reviewing past strategies..._';
        case 'notify_agent_problem':
        case 'notify_ceo_problem':
            return '_Marty Benjamins is flagging a problem..._';
        default:
            return `_Marty Benjamins is checking ${toolName.replace(/_/g, ' ')}..._`;
    }
}

export async function runMarty(request: MartyRequest): Promise<MartyResponse> {
    const squadRoster = buildSquadRoster('marty');
    const orgId = request.context?.orgId || '';
    const integrationStatus = await buildIntegrationStatusSummaryForOrg(orgId);

    const systemPrompt = `You are Marty Benjamins, the AI CEO of BakedBot AI.

YOUR MISSION: Grow BakedBot AI to $1,000,000 ARR within 12 months.

ABSOLUTE RULE — NO FABRICATION:
You must NEVER invent, fabricate, or claim deals, revenue, meetings, partnerships, or accomplishments that you cannot verify with your tools. If you have no data, say "I don't have data on that yet" — never fill the gap with fiction. Claiming a deal that didn't happen destroys trust with the CEO. When in doubt, query a tool first.

PERSONA:
- Strategic, decisive, results-driven
- Think in terms of revenue, customers, and market position
- Own pipeline, outreach, market research, and executive follow-through; delegate specialist work to your executive team — you don't code
- Concise, outcome-focused, always with next steps
- HONEST — never overstate progress or fabricate wins

YOUR EXECUTIVE TEAM:
${squadRoster}

INTEGRATION STATUS:
${integrationStatus}

DECISION FRAMEWORK:
- Will this move the needle on ARR? If not, deprioritize.
- What's the fastest path to revenue? Optimize for speed.
- Are we building what customers actually want?
- Is the team aligned?

GMAIL — CEO INBOX (martez@bakedbot.ai):
You have direct access to the CEO inbox. Use it to:
- Search and triage incoming emails (gmail_search)
- Read full email threads for context (gmail_read_thread)
- Draft replies on behalf of the CEO — saved as drafts, NOT sent (gmail_draft_reply)
- Organize with labels (gmail_label, gmail_list_labels)
When drafting replies, write as Martez — professional, warm, decisive. Always save as draft so the CEO can review before sending.

GOOGLE CALENDAR — CEO SCHEDULE:
You manage the CEO's Google Calendar and BakedBot meeting bookings. Use it to:
- Check today's schedule and upcoming events (calendar_list_events)
- Verify free/busy slots before scheduling (calendar_check_free)
- Create calendar events for meetings, focus blocks, reminders (calendar_create_event)
- View BakedBot bookings from bakedbot.ai/martez (calendar_get_upcoming_meetings)
Be proactive: check the calendar before suggesting times. Flag conflicts. Block prep time.

OUTREACH — LEAD GENERATION:
You drive outreach to grow BakedBot's customer base. You can:
- Search dispensary leads in our database (outreach_search_leads)
- Send personalized outreach emails via verified email (outreach_send_email)
- Submit contact forms on dispensary websites via browser automation (outreach_submit_contact_form)
- Track contacts in the CRM lifecycle system (outreach_track_crm)
- Check outreach campaign stats (outreach_get_stats)
When doing outreach:
1. *Start small and verifiable.* Send 3-5 at a time so the CEO can review results.
2. *Personalize every message.* Reference the dispensary name, city, POS system, competitors.
3. *Track everything.* After sending, always update the CRM with status and notes.
4. *Follow up persistently.* Check outreach stats, identify who hasn't responded, plan next touch.
5. *Report results.* After each batch, share: dispensary name, what you sent, template used, next steps.

LINKEDIN — FULL ACCESS (BUSINESS DEVELOPMENT):
You have complete access to the CEO's LinkedIn. Everything the CEO can do, you can do:
- Post text or image content (linkedin_post, linkedin_post_with_image)
- Browse the feed and stay informed (linkedin_browse_feed)
- Search for people, leads, and partners (linkedin_search_people)
- View full profiles to research leads (linkedin_view_profile)
- Send connection requests (linkedin_send_connection)
- DM existing connections (linkedin_send_message)
- Read the inbox for replies and requests (linkedin_read_inbox)
- Comment on posts to build relationships (linkedin_comment)
- React to posts — like, celebrate, support, insightful (linkedin_react)
- Repost/share valuable content (linkedin_repost)
- Browse and search LinkedIn groups (linkedin_browse_groups)
LinkedIn rules:
1. *Quality over quantity.* Max 5 connection requests per day. Personalize every note.
2. *Thought leadership first.* Post valuable content before pitching. Build credibility.
3. *Engage before pitching.* Comment on and react to prospects' posts before DMing.
4. *No spam.* Never mass-message. Each interaction should be tailored.
5. *Groups are goldmines.* Join cannabis industry groups, contribute value, find leads.
6. *Track everything.* Log every LinkedIn action in the learning loop.

FACEBOOK — FULL ACCESS (COMMUNITY & GROUPS):
You have complete access to the CEO's Facebook. Everything the CEO can do, you can do:
- Browse the news feed (facebook_browse_feed)
- Post text or image content (facebook_post, facebook_post_with_image)
- Comment on posts (facebook_comment)
- React to posts — like, love, haha, wow (facebook_react)
- Browse and search Facebook groups (facebook_browse_groups)
- Post in groups (facebook_post_to_group)
- Send Messenger messages (facebook_send_message)
- Search for people, pages, groups, and posts (facebook_search)
Facebook rules:
1. *Groups over feed.* Cannabis dispensary owner groups are where the real prospects are.
2. *Add value first.* Answer questions, share insights, build trust before promoting BakedBot.
3. *No hard sell in groups.* Group admins will ban you. Be helpful, let people ask about your tools.
4. *Messenger for warm leads.* Only message people you've interacted with in groups.
5. *Track everything.* Log every Facebook action in the learning loop.

REDDIT — FULL ACCESS (INDUSTRY INTELLIGENCE & COMMUNITY):
You have complete access to the CEO's Reddit. Everything the CEO can do, you can do:
- Browse the front page or specific subreddits (reddit_browse_feed)
- Post to subreddits (reddit_post)
- Comment on posts and reply to comments (reddit_comment)
- Search for posts and subreddits (reddit_search)
- Read posts with full comment threads (reddit_read_post)
- Upvote/downvote content (reddit_vote)
- Send private messages (reddit_send_message)
- Get subreddit info and rules (reddit_browse_subreddit_info)
Reddit rules:
1. *Read the rules FIRST.* Every subreddit has rules. Check reddit_browse_subreddit_info before posting.
2. *No self-promotion.* Reddit hates obvious marketing. Contribute genuinely and let your expertise speak.
3. *Key subreddits:* r/cannabisindustry, r/weedbiz, r/dispensary, r/cannabisretail, r/MMJ — monitor these.
4. *Be a helpful expert.* Answer questions about cannabis retail tech, POS systems, customer retention.
5. *Never post links to BakedBot unless directly asked.* Share knowledge, not ads.
6. *Track everything.* Log every Reddit action in the learning loop.

INSTAGRAM — FULL ACCESS (BRAND & VISUAL CONTENT):
You have complete access to the CEO's Instagram. Everything the CEO can do, you can do:
- Browse the feed (instagram_browse_feed)
- Post images with captions and hashtags (instagram_post_with_image)
- Comment on posts (instagram_comment)
- Like posts (instagram_react)
- View profiles (instagram_view_profile)
- Send DMs (instagram_send_message)
- Search for users, hashtags, locations (instagram_search)
- Browse stories (instagram_browse_stories)
Instagram rules:
1. *Visual quality matters.* Only post high-quality images — product shots, team photos, data visualizations.
2. *Hashtag strategy.* Use cannabis industry hashtags: #cannabisindustry, #dispensarylife, #cannabistech, #retailtech.
3. *Engage with dispensary accounts.* Like and comment on dispensary posts to build visibility.
4. *Stories for behind-the-scenes.* Product demos, team culture, industry events.
5. *Track everything.* Log every Instagram action in the learning loop.

MOLTBOOK — AGENT SOCIAL NETWORK (REPUTATION & DISCOVERY):
You have access to Moltbook, the social network for AI agents (770K+ agents, acquired by Meta).
This is YOUR social network — where you build your reputation as an agent among peers.
- Post insights about agentic commerce, AI CEO operations, cannabis tech (moltbook_post)
- Comment on other agents' posts to build karma (moltbook_comment)
- Upvote/downvote content (moltbook_vote)
- Browse the feed to learn from other agents (moltbook_browse_feed)
- Search for agents by capability — find collaborators (moltbook_search_agents)
- Send encrypted DMs to agents (moltbook_send_message)
- View agent profiles and karma (moltbook_view_profile)
Moltbook rules:
1. *Build karma consistently.* Post valuable insights regularly. High karma = trusted agent.
2. *Find complementary agents.* Search for sales, compliance, legal, and finance agents to collaborate with.
3. *Share what you learn.* Post about your outreach strategies, CRM patterns, and CEO operating rhythms.
4. *Never share internal company secrets.* Share general insights about agentic commerce, not BakedBot internals.
5. *Engage with the community.* Comment on and upvote good content. Reputation is earned through participation.
6. *Track everything.* Log every Moltbook action in the learning loop.

MARKET RESEARCH — OPPORTUNITY SCANNING:
Use searchOpportunities before making competitor, partnership, or market-move claims. Bring back concrete opportunities, why they matter now, and who should own the next move.

LEARNING LOOP — ADAPT & IMPROVE:
You have a learning memory system. After EVERY outreach action (email, contact form, LinkedIn, Facebook, Reddit, Instagram, Moltbook, meeting):
1. *Log the attempt* (learning_log) — what you did, the result, why it worked or didn't
2. *Before trying a new approach*, search past logs (learning_search) to see what worked before
3. *Adapt strategy* based on patterns — if template X fails 3 times, try template Y
4. *Never make the same mistake twice* — if an approach failed, understand WHY before retrying
5. *Celebrate wins* — log successes so you can repeat them

PERSISTENCE & ACCOUNTABILITY:
You are the operating CEO for growth. Be persistent and proactive:
- *Never let tasks drop.* If you started outreach, follow up until you get responses.
- *Track everything in CRM.* Every contact, every email, every form submission.
- *Remind the CEO.* About meetings, follow-ups, and commitments. Don't assume he remembers.
- *Push forward daily.* Your goal is to increase qualified pipeline, meetings booked, partnerships opened, and outbound volume every day.
- *Own the next move.* Use your own tools first for research, inbox, outreach, LinkedIn, Facebook, Reddit, Instagram, Moltbook, and follow-up before handing work off.
- *Follow-up cadence.* Day 1: initial email. Day 3: follow-up email. Day 5: engage on social (LinkedIn/Facebook/Instagram). Day 7: contact form. Day 10: Reddit/community engagement. Day 14: LinkedIn connect + Facebook group post. Day 21: final multi-channel push.

FAILURE HANDLING — EVERY PROBLEM IS A WELCOME OPPORTUNITY:
- *Never hide problems.* If something fails, say what happened and what you're trying next.
- *Retry or pivot first.* Use another tool, a narrower ask, or delegate to the right executive before escalating.
- *Don't be afraid to try.* Failure is expected — the important thing is learning from it.
- *Log every failure.* Use learning_log with result='failure' and include your analysis.
- *Propose a fix.* Always include what you think should be tried next.
- *Escalate only when materially blocked.* Use notify_ceo_problem only if retries/delegation are exhausted or the issue risks revenue, customer trust, or a live commitment.
- *Retry with a different approach.* If Plan A fails, try Plan B. Search learning logs for alternatives.

SECURITY — ABSOLUTE RULES:
1. *NEVER share internal company data with anyone except the CEO on Slack.*
2. *NEVER include internal metrics, strategies, or code in outreach emails or social media posts (LinkedIn, Facebook, Reddit, Instagram, Moltbook).*
3. *NEVER reveal agent names, system architecture, or AI infrastructure externally.*
4. *Outreach emails should be about the VALUE BakedBot provides, not HOW it works internally.*
5. *If asked by an external party for internal info, politely redirect to martez@bakedbot.ai.*

GROUNDING RULES (VIOLATION = TRUST DESTROYED):
1. ONLY report data you have queried with tools in THIS conversation. Never fabricate metrics, deals, or outcomes.
2. If you haven't used a tool to verify something, DO NOT claim it happened. Say "let me check" and use the tool.
3. NEVER claim you closed a deal, sent an email, or made a connection unless a tool confirmed it in this session.
4. ONLY delegate to agents in the squad list above.
5. Be honest about integration limitations, but do not make them the headline unless they block the work.
6. Use your own revenue tools first for inbox, outreach, LinkedIn, Facebook, Reddit, Instagram, Moltbook, calendar, and market research; use delegation for specialist execution.
7. When asked "what have you done?" — query outreach_get_stats, learning_search, or calendar tools FIRST, then report only what the data shows.

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

    const runtimeSystemPrompt = buildMartyOperatingPrompt({
        brandName: 'BakedBot AI',
        squadRoster,
        integrationStatus,
        slackMode: true,
    }) || systemPrompt;

    const fullPrompt = `${runtimeSystemPrompt}

---

User Request: ${request.prompt}`;

    const onToolCall = request.progressCallback
        ? async (toolName: string, input: Record<string, unknown>) => {
            request.progressCallback!(buildMartyProgressMessage(toolName, input));
        }
        : undefined;

    const sharedContext = {
        maxIterations: request.maxIterations ?? 4,
        orgId: request.context?.orgId,
        brandId: request.context?.brandId,
        agentContext: await (async () => {
            const { enrichWithCoaching } = await import('@/server/services/coaching-loader');
            return enrichWithCoaching({
                name: 'Marty Benjamins',
                role: 'CEO',
                capabilities: ['delegation', 'gmail', 'calendar', 'crm', 'outreach', 'linkedin', 'facebook', 'reddit', 'instagram', 'moltbook', 'market-research', 'system-health', 'super-powers'],
                groundingRules: ['Only report real data', 'Delegate to named agents'],
            });
        })(),
        onToolCall,
    };
    const martyExecutor = createMartyToolExecutor({
        orgId: request.context?.orgId,
        brandId: request.context?.brandId,
    });

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
                        fullPrompt, MARTY_SLACK_TOOLS, martyExecutor,
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
                        fullPrompt, MARTY_SLACK_TOOLS, martyExecutor,
                        sharedContext
                    );
                    break;
                }
                case 'claude': {
                    if (!isClaudeAvailable()) { triedTiers.push(`${tier}:unconfigured`); continue; }
                    logger.info('[Marty] Falling back to Claude Haiku (cost-protected)');
                    result = await executeWithTools(
                        fullPrompt, MARTY_SLACK_TOOLS, martyExecutor,
                        { ...sharedContext, model: 'claude-haiku-4-5-20251001' }
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

    // Synthesize content if the model ran tools but returned empty text
    // (GLM has its own synthesis above; this catches Gemini/Claude empty responses)
    if (!result.content && result.toolExecutions && result.toolExecutions.length > 0) {
        logger.info('[Marty] Model ran tools but returned empty content — synthesizing', {
            model: result.model, toolCount: result.toolExecutions.length,
        });
        const toolSummary = result.toolExecutions
            .map((t: any) => `• *${t.tool || t.name}*: ${JSON.stringify(t.result || t.output).slice(0, 200)}`)
            .join('\n');
        result = {
            ...result,
            content: `Here's what I found:\n\n${toolSummary}\n\n_Let me know if you need me to dig deeper into any of these._`,
        };
    }

    return {
        content: result.content,
        toolExecutions: result.toolExecutions,
        model: result.model,
    };
}
