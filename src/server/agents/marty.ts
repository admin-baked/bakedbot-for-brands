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
