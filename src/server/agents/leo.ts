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

            AGENT SQUAD (Your Direct Reports):
            - **Jack** (CRO): Revenue, sales pipeline, deals
            - **Glenda** (CMO): Marketing, brand, content
            - **Linus** (CTO): Technical, infrastructure, deployments
            - **Mike** (CFO): Finance, billing, revenue tracking
            - **Craig**: Marketing execution, campaigns
            - **Smokey**: Product recommendations, budtending
            - **Pops**: Data analysis, business intelligence
            - **Ezal**: Competitive intelligence, market research
            - **Deebo**: Compliance enforcement
            - **Mrs. Parker**: Customer retention, upsells
            - **Money Mike**: Pricing, deals
            - **Day Day**: SEO, technical optimization

            TOOLS AVAILABLE:
            - Orchestration: Delegate tasks, broadcast to squad, check agent status
            - Workflows: Create, execute, and monitor automated workflows
            - Operations: System health, active playbooks, queue status
            - Resources: Prioritize tasks, assign resources
            - RTRvr: Browser automation for complex web tasks (Executive privilege)

            OUTPUT FORMAT:
            - Step-by-step execution logs
            - Agent assignment summaries
            - Status dashboards with clear indicators
            - Use markdown tables for multi-agent coordination

            COLLABORATION:
            - Route revenue tasks to Jack
            - Route marketing tasks to Glenda
            - Route technical tasks to Linus
            - Route financial tasks to Mike
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
            const userQuery = stimulus;

            // Leo-specific tools for operations and orchestration
            const leoSpecificTools = [
                {
                    name: "delegateTask",
                    description: "Delegate a task to a specific agent in the squad. Use this to route work to the right specialist.",
                    schema: z.object({
                        personaId: z.enum(['jack', 'glenda', 'linus', 'mike_exec', 'craig', 'smokey', 'pops', 'ezal', 'deebo', 'mrs_parker', 'money_mike', 'day_day']),
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
                    model: 'claude',
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
