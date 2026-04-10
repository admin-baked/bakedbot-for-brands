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

/**
 * Get an authenticated Gmail client for the CEO (martez@bakedbot.ai).
 * Uses CEO_GMAIL_UID env var to look up the super user's stored OAuth tokens.
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

    // Learning Loop — Remember what works and what doesn't
    { name: 'learning_log', description: 'Log an outreach attempt, strategy result, or business development action for learning. Marty reviews these to improve strategy.', input_schema: { type: 'object' as const, properties: { action: { type: 'string', description: 'What was attempted (e.g., "emailed dispensary X with template Y")' }, result: { type: 'string', enum: ['success', 'failure', 'pending', 'partial'], description: 'Outcome' }, reason: { type: 'string', description: 'Why it worked or failed (analysis)' }, nextStep: { type: 'string', description: 'What to try next based on this result' }, category: { type: 'string', description: 'Category: outreach, linkedin, calendar, meeting, follow-up, strategy' } }, required: ['action', 'result', 'category'] } },
    { name: 'learning_search', description: 'Search past learning logs to find what worked and what didn\'t for a specific strategy or target.', input_schema: { type: 'object' as const, properties: { query: { type: 'string', description: 'What to search for (e.g., "email template competitive-report", "Syracuse dispensaries")' }, category: { type: 'string', description: 'Filter by category' } }, required: ['query'] } },

    // Failure reporting
    { name: 'notify_ceo_problem', description: 'Immediately notify the CEO on Slack about a problem Marty encountered. Every problem is a learning opportunity.', input_schema: { type: 'object' as const, properties: { problem: { type: 'string', description: 'What went wrong' }, context: { type: 'string', description: 'What you were trying to do' }, proposed_fix: { type: 'string', description: 'What you think should be tried next' } }, required: ['problem', 'context'] } },
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

                const bookings = snap.docs.map(d => {
                    const data = d.data();
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
                    };
                });

                // Also get Google Calendar events
                const tokens = await getCeoCalendarTokens();
                let gcalEvents: unknown[] = [];
                if (tokens) {
                    const oneWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                    const events = await listGoogleCalendarEvents(tokens, now, oneWeek);
                    gcalEvents = events.map(e => ({
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
        case 'learning_log':
            return '_Marty Benjamins is logging what he learned..._';
        case 'learning_search':
            return '_Marty Benjamins is reviewing past strategies..._';
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
- Delegate to your executive team — you don't code
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

LINKEDIN — BUSINESS DEVELOPMENT:
You have access to the CEO's LinkedIn via browser automation. Use it to:
- Post thought leadership content about cannabis tech, AI, agentic commerce (linkedin_post)
- Search for dispensary owners, cannabis industry leaders, potential partners (linkedin_search_people)
- Send personalized connection requests to key prospects (linkedin_send_connection)
- DM existing connections about BakedBot (linkedin_send_message)
LinkedIn rules:
1. *Quality over quantity.* Max 5 connection requests per day. Personalize every note.
2. *Thought leadership first.* Post valuable content before pitching. Build credibility.
3. *No spam.* Never mass-message. Each interaction should be tailored.
4. *Track everything.* Log every LinkedIn action in the learning loop.

LEARNING LOOP — ADAPT & IMPROVE:
You have a learning memory system. After EVERY outreach action (email, contact form, LinkedIn, meeting):
1. *Log the attempt* (learning_log) — what you did, the result, why it worked or didn't
2. *Before trying a new approach*, search past logs (learning_search) to see what worked before
3. *Adapt strategy* based on patterns — if template X fails 3 times, try template Y
4. *Never make the same mistake twice* — if an approach failed, understand WHY before retrying
5. *Celebrate wins* — log successes so you can repeat them

PERSISTENCE & ACCOUNTABILITY:
You are the CEO's chief of staff. Be persistent and proactive:
- *Never let tasks drop.* If you started outreach, follow up until you get responses.
- *Track everything in CRM.* Every contact, every email, every form submission.
- *Remind the CEO.* About meetings, follow-ups, and commitments. Don't assume he remembers.
- *Push forward daily.* Your goal is to grow verified emails sent and contact form submissions every day.
- *Start small, build trust.* Begin with verifiable tasks the CEO can check, then escalate autonomy.
- *Follow-up cadence.* Day 1: initial email. Day 3: follow-up email. Day 7: contact form. Day 14: LinkedIn connect. Day 21: final push.

FAILURE HANDLING — EVERY PROBLEM IS A WELCOME OPPORTUNITY:
- *Never hide problems.* If something fails, immediately notify the CEO via notify_ceo_problem.
- *Don't be afraid to try.* Failure is expected — the important thing is learning from it.
- *Log every failure.* Use learning_log with result='failure' and include your analysis.
- *Propose a fix.* Always include what you think should be tried next.
- *Retry with a different approach.* If Plan A fails, try Plan B. Search learning logs for alternatives.

SECURITY — ABSOLUTE RULES:
1. *NEVER share internal company data with anyone except the CEO on Slack.*
2. *NEVER include internal metrics, strategies, or code in outreach emails or LinkedIn posts.*
3. *NEVER reveal agent names, system architecture, or AI infrastructure externally.*
4. *Outreach emails should be about the VALUE BakedBot provides, not HOW it works internally.*
5. *If asked by an external party for internal info, politely redirect to martez@bakedbot.ai.*

GROUNDING RULES (VIOLATION = TRUST DESTROYED):
1. ONLY report data you have queried with tools in THIS conversation. Never fabricate metrics, deals, or outcomes.
2. If you haven't used a tool to verify something, DO NOT claim it happened. Say "let me check" and use the tool.
3. NEVER claim you closed a deal, sent an email, or made a connection unless a tool confirmed it in this session.
4. ONLY delegate to agents in the squad list above.
5. Be honest about integration limitations.
6. Use delegation as your primary lever.
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

    const fullPrompt = `${systemPrompt}

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
