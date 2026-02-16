/**
 * Leo - Chief Operating Officer (COO)
 *
 * Specializes in operations, multi-agent orchestration, workflow coordination, and execution.
 * The maestro who ensures all agents work together seamlessly.
 */

import { AgentImplementation } from './harness';
import { ExecutiveMemory } from './schemas';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { contextOsToolDefs, lettaToolDefs, intuitionOsToolDefs, AllSharedTools } from './shared-tools';
import {
    buildSquadRoster,
    getDelegatableAgentIds,
    buildIntegrationStatusSummary,
    KNOWN_INTEGRATIONS,
    AgentId
} from './agent-definitions';

export interface LeoTools extends Partial<AllSharedTools> {
    // Multi-Agent Orchestration
    delegateTask?(personaId: string, task: string, context?: any): Promise<any>;
    broadcastToSquad?(message: string, agentIds: string[]): Promise<any>;
    getAgentStatus?(agentId?: string): Promise<any>;

    // Workflow Management
    createWorkflow?(name: string, steps: any[], triggers?: any): Promise<any>;
    executeWorkflow?(workflowId: string, inputs?: any): Promise<any>;
    getWorkflowStatus?(workflowId: string): Promise<any>;

    // Operations Dashboard
    getSystemHealth?(): Promise<any>;
    getActivePlaybooks?(): Promise<any>;
    getQueueStatus?(): Promise<any>;

    // Resource Allocation
    prioritizeTasks?(tasks: any[]): Promise<any>;
    assignResources?(taskId: string, resources: any): Promise<any>;

    // Communication
    sendEmail?(to: string, subject: string, content: string): Promise<any>;

    // RTRvr Browser Agent (Executive privilege)
    rtrvrAgent?(prompt: string, options?: any): Promise<any>;
    rtrvrScrape?(url: string): Promise<any>;
}

export const leoAgent: AgentImplementation<ExecutiveMemory, LeoTools> = {
    agentName: 'leo',

    async initialize(brandMemory, agentMemory) {
        logger.info(`[Leo COO] Initializing for ${brandMemory.brand_profile.name}...`);

        if (!agentMemory.objectives || agentMemory.objectives.length === 0) {
            agentMemory.objectives = [...brandMemory.priority_objectives];
        }

        // Build dynamic squad roster from agent-definitions (source of truth)
        const squadRoster = buildSquadRoster('leo');
        const integrationStatus = buildIntegrationStatusSummary();

        agentMemory.system_instructions = `
            You are Leo, the Chief Operating Officer (COO) for ${brandMemory.brand_profile.name}.
            Your mission is OPERATIONAL EXCELLENCE and MULTI-AGENT ORCHESTRATION.

            PERSONA:
            - Strategic executor, the maestro of operations
            - Systems thinker who sees the big picture
            - Ensures all agents work together seamlessly
            - "Get it done, get it done right."

            CORE RESPONSIBILITIES:
            1. **Multi-Agent Orchestration**: Coordinate complex tasks across the agent squad
            2. **Workflow Management**: Design and execute automated workflows
            3. **Operations Oversight**: Monitor system health and performance
            4. **Resource Allocation**: Prioritize tasks and assign resources effectively
            5. **Execution Tracking**: Ensure tasks move from planning to completion

            KEY METRICS:
            - Task Completion Rate
            - Average Response Time
            - Workflow Efficiency
            - Agent Utilization
            - SLA Compliance
            - Error/Failure Rate

            === AGENT SQUAD (Your Direct Reports) ===
            ${squadRoster}

            === INTEGRATION STATUS ===
            ${integrationStatus}

            === GROUNDING RULES (CRITICAL) ===
            You MUST follow these rules to avoid hallucination:

            1. **ONLY report on systems you can actually query.** Use the getSystemHealth tool to get real status.
               - DO NOT fabricate metrics, statuses, or percentages.
               - If a tool returns no data, say "No data available" — don't make up values.

            2. **ONLY reference agents that exist in the AGENT SQUAD list above.**
               - DO NOT invent agents or give agents incorrect roles.
               - Craig = Marketer (NOT Dev/Eng). Linus = CTO (Technical).

            3. **For integrations NOT YET ACTIVE, offer to help set them up.**
               - Example: If asked about Gmail/Calendar/Drive monitoring, say:
                 "Those integrations aren't configured yet. Would you like me to help set them up?"
               - NEVER claim to be monitoring systems that aren't integrated.

            4. **When uncertain, ASK rather than assume.**
               - "I don't have visibility into X. Would you like me to investigate?"
               - "That integration isn't set up yet. Should I add it to our roadmap?"

            5. **Use REAL timestamps, not placeholders.**
               - Use actual Date.now() values, not "[Current Date/Time]".

            TOOLS AVAILABLE:
            - Orchestration: Delegate tasks, broadcast to squad, check agent status
            - Workflows: Create, execute, and monitor automated workflows
            - Operations: System health (MUST use tool for real data), queue status
            - Resources: Prioritize tasks, assign resources
            - RTRvr: Browser automation for complex web tasks (Executive privilege)

            OUTPUT FORMAT:
            - Step-by-step execution logs
            - Agent assignment summaries
            - Status dashboards with clear indicators (from REAL tool data)
            - Use markdown tables for multi-agent coordination
            - Always cite the source of your data (tool call or database query)

            PROVIDING OPTIONS TO USERS:
            When presenting multiple paths forward, format options as:

            **Option A: Short Description**
            Detailed explanation of what this option entails.

            **Option B: Another Path**
            Detailed explanation of this alternative.

            **Option C: Third Choice**
            Detailed explanation of the third option.

            Example delegation options:
            - **Option A: Route to Technical Lead** — Delegate to Linus (AI CTO) to architect the technical implementation
            - **Option B: Create Setup Checklist** — Generate a step-by-step implementation guide
            - **Option C: Research Best Practices** — Have Ezal research industry standards

            The system will auto-detect when users select options (e.g., "Option A", "A", "1") and execute accordingly.

            INTEGRATION STATUS DISPLAY:
            For Google Workspace integrations, use inline cards format.

            **CRITICAL: Be concise!** When showing integration status:
            1. One brief intro sentence (e.g., "Here's your Google Workspace status:")
            2. The :::google:status card
            3. Nothing else unless user asks for details

            **DO NOT** include lengthy explanations, options, or recommendations unless explicitly requested.

            :::google:status
            {
              "gmail": { "status": "offline", "connectUrl": "/api/auth/google?service=gmail" },
              "calendar": { "status": "offline", "connectUrl": "/api/auth/google?service=calendar" },
              "drive": { "status": "offline", "connectUrl": "/api/auth/google?service=drive" },
              "sheets": { "status": "offline", "connectUrl": "/api/auth/google?service=sheets" }
            }
            :::

            The card has Connect buttons built-in. Let the user explore from there.

            COLLABORATION:
            - Route revenue tasks to Jack
            - Route marketing/brand strategy to Glenda
            - Route technical/infrastructure tasks to Linus
            - Route financial/CFO tasks to Mike (mike_exec)
            - Route marketing execution/campaigns to Craig
            - Route product recommendations to Smokey
            - Route analytics/data to Pops
            - Route competitive intel to Ezal
            - Route compliance to Deebo
            - Route customer retention to Mrs. Parker
            - Route pricing to Money Mike
            - Route SEO to Day Day
            - Break complex requests into agent-appropriate subtasks
            - Synthesize results from multiple agents into coherent responses
        `;

        // Connect to Hive Mind
        try {
            const { lettaBlockManager } = await import('@/server/services/letta/block-manager');
            const brandId = (brandMemory.brand_profile as any)?.id || 'unknown';
            await lettaBlockManager.attachBlocksForRole(brandId, agentMemory.agent_id as string, 'executive');
            logger.info(`[Leo:HiveMind] Connected to shared executive blocks.`);
        } catch (e) {
            logger.warn(`[Leo:HiveMind] Failed to connect: ${e}`);
        }

        return agentMemory;
    },

    async orient(brandMemory, agentMemory, stimulus) {
        if (stimulus && typeof stimulus === 'string') return 'user_request';

        // Check for stalled workflows
        const stalledWorkflow = (agentMemory as any).workflows?.find(
            (w: any) => w.status === 'in_progress' && w.lastUpdate < Date.now() - 30 * 60 * 1000
        );
        if (stalledWorkflow) return 'workflow_stalled';

        // Check for pending orchestration tasks
        const pendingOrchestration = (agentMemory as any).orchestrationQueue?.length > 0;
        if (pendingOrchestration) return 'process_queue';

        return null;
    },

    async act(brandMemory, agentMemory, targetId, tools: LeoTools, stimulus?: string) {
        if (targetId === 'user_request' && stimulus) {
            let userQuery = stimulus;

            // === OPTION DETECTION: Check if user is selecting from a previous menu ===
            const { detectOptionSelection } = await import('./utils/option-detector');
            const lastAgentMessage = (agentMemory as any).lastResponse;

            const optionDetection = detectOptionSelection(userQuery, lastAgentMessage);

            if (optionDetection.detected && optionDetection.selectedOption) {
                logger.info('[Leo] Option selection detected', {
                    original: userQuery,
                    expanded: optionDetection.expandedQuery,
                    tool: optionDetection.selectedOption.toolName,
                });

                // If the option maps to a direct tool call, execute it immediately
                if (optionDetection.selectedOption.toolName === 'delegateTask' && tools.delegateTask) {
                    const { personaId, task } = optionDetection.selectedOption.toolArgs as {
                        personaId: string;
                        task: string;
                    };

                    logger.info('[Leo] Auto-delegating to agent', { personaId, task });

                    try {
                        const result = await tools.delegateTask(personaId, task);

                        // Store this response for future option detection
                        (agentMemory as any).lastResponse = `Delegated to ${personaId}: ${task}`;

                        return {
                            updatedMemory: agentMemory,
                            logEntry: {
                                action: 'auto_delegation',
                                result: `Task delegated to ${personaId}`,
                                metadata: { personaId, task, delegationResult: result }
                            }
                        };
                    } catch (e: any) {
                        return {
                            updatedMemory: agentMemory,
                            logEntry: {
                                action: 'delegation_error',
                                result: `Failed to delegate to ${personaId}: ${e.message}`,
                                metadata: { error: e.message }
                            }
                        };
                    }
                }

                // Otherwise, expand the query with full context
                userQuery = optionDetection.expandedQuery || userQuery;
            }

            // Get delegatable agent IDs dynamically from registry
            const delegatableAgents = getDelegatableAgentIds('leo');

            // Leo-specific tools for operations and orchestration
            const leoSpecificTools = [
                {
                    name: "delegateTask",
                    description: "Delegate a task to a specific agent in the squad. Use this to route work to the right specialist.",
                    schema: z.object({
                        personaId: z.enum(delegatableAgents as [AgentId, ...AgentId[]]),
                        task: z.string().describe("Clear description of the task to delegate"),
                        context: z.any().optional().describe("Additional context for the task")
                    })
                },
                {
                    name: "broadcastToSquad",
                    description: "Send a message to multiple agents simultaneously. Use for announcements or parallel task assignment.",
                    schema: z.object({
                        message: z.string().describe("The message to broadcast"),
                        agentIds: z.array(z.string()).describe("List of agent IDs to receive the message")
                    })
                },
                {
                    name: "getAgentStatus",
                    description: "Check the status and recent activity of agents. Leave agentId empty for all agents.",
                    schema: z.object({
                        agentId: z.string().optional().describe("Specific agent ID, or omit for all agents")
                    })
                },
                {
                    name: "createWorkflow",
                    description: "Create a new automated workflow with sequential or parallel steps.",
                    schema: z.object({
                        name: z.string().describe("Workflow name"),
                        steps: z.array(z.object({
                            agentId: z.string(),
                            task: z.string(),
                            dependsOn: z.array(z.string()).optional()
                        })).describe("Workflow steps with agent assignments"),
                        triggers: z.any().optional().describe("Trigger conditions (schedule, event, manual)")
                    })
                },
                {
                    name: "executeWorkflow",
                    description: "Execute a previously created workflow.",
                    schema: z.object({
                        workflowId: z.string(),
                        inputs: z.any().optional().describe("Input parameters for the workflow")
                    })
                },
                {
                    name: "getWorkflowStatus",
                    description: "Get the current status and progress of a workflow execution.",
                    schema: z.object({
                        workflowId: z.string()
                    })
                },
                {
                    name: "getSystemHealth",
                    description: "Get overall system health including agent availability, queue depths, and error rates.",
                    schema: z.object({})
                },
                {
                    name: "getActivePlaybooks",
                    description: "List all currently active playbooks/automations and their status.",
                    schema: z.object({})
                },
                {
                    name: "getQueueStatus",
                    description: "Get the status of task queues across all agents.",
                    schema: z.object({})
                },
                {
                    name: "prioritizeTasks",
                    description: "Re-prioritize a list of tasks based on urgency, impact, and dependencies.",
                    schema: z.object({
                        tasks: z.array(z.object({
                            id: z.string(),
                            description: z.string(),
                            urgency: z.enum(['low', 'medium', 'high', 'critical']).optional(),
                            impact: z.enum(['low', 'medium', 'high']).optional()
                        }))
                    })
                },
                {
                    name: "rtrvrAgent",
                    description: "Launch an autonomous browser agent to perform complex web tasks (login, download, post). Executive privilege.",
                    schema: z.object({
                        prompt: z.string().describe("Instructions for the browser agent")
                    })
                },
                {
                    name: "rtrvrScrape",
                    description: "Scrape a specific URL for its content or accessibility tree.",
                    schema: z.object({
                        url: z.string()
                    })
                },
                {
                    name: "sendEmail",
                    description: "Send an email for operational communications.",
                    schema: z.object({
                        to: z.string(),
                        subject: z.string(),
                        content: z.string()
                    })
                }
            ];

            // Combine Leo-specific tools with shared Context OS, Letta Memory, and Intuition OS tools
            const toolsDef = [
                ...leoSpecificTools,
                ...contextOsToolDefs,
                ...lettaToolDefs,
                ...intuitionOsToolDefs
            ];

            try {
                const { runMultiStepTask } = await import('./harness');

                const result = await runMultiStepTask({
                    userQuery,
                    systemInstructions: (agentMemory.system_instructions as string) || '',
                    toolsDef,
                    tools,
                    model: 'claude-sonnet-4-20250514', // Use Claude Sonnet 4 for orchestration
                    maxIterations: 7, // Leo gets more iterations for complex orchestration
                    onStepComplete: async (step, toolName, result) => {
                        // Log orchestration steps to Letta for audit trail
                        if ((tools as any).lettaSaveFact) {
                            try {
                                await (tools as any).lettaSaveFact(
                                    `Leo Orchestration Step ${step}: ${toolName} -> ${JSON.stringify(result).slice(0, 200)}`,
                                    'orchestration_log'
                                );
                            } catch (err) {
                                console.warn('Failed to save orchestration step to Letta:', err);
                            }
                        }
                    }
                });

                // Store the response for future option detection
                (agentMemory as any).lastResponse = result.finalResult;

                return {
                    updatedMemory: agentMemory,
                    logEntry: {
                        action: 'orchestration_complete',
                        result: result.finalResult,
                        metadata: { steps: result.steps.length, tools_used: result.steps.map(s => s.tool) }
                    }
                };

            } catch (e: any) {
                return {
                    updatedMemory: agentMemory,
                    logEntry: { action: 'error', result: `Leo COO Task failed: ${e.message}`, metadata: { error: e.message } }
                };
            }
        }

        if (targetId === 'workflow_stalled') {
            return {
                updatedMemory: agentMemory,
                logEntry: {
                    action: 'workflow_intervention',
                    result: "Stalled workflow detected. Initiating recovery sequence.",
                    metadata: { targetId }
                }
            };
        }

        if (targetId === 'process_queue') {
            return {
                updatedMemory: agentMemory,
                logEntry: {
                    action: 'queue_processing',
                    result: "Processing orchestration queue.",
                    metadata: { targetId }
                }
            };
        }

        return {
            updatedMemory: agentMemory,
            logEntry: {
                action: 'idle',
                result: 'Operations running smoothly. Standing by for orchestration requests.',
                metadata: {}
            }
        };
    }
};

export const leo = leoAgent;
