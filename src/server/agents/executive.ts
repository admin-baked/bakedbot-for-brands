
import { AgentImplementation } from './harness';
import { ExecutiveMemory } from './schemas';
import { logger } from '@/lib/logger';
import { ai } from '@/ai/genkit';
import { z } from 'zod';

export interface ExecutiveTools {
  // Common tools for the executive floor
  generateSnapshot?(query: string, context: any): Promise<string>;
  delegateTask?(personaId: string, task: string, context?: any): Promise<any>;
  broadcast?(message: string, channels: string[], recipients: string[]): Promise<any>;
  
  // RTRvr Advanced Web Tools
  rtrvrAgent?(prompt: string, options?: any): Promise<any>;
  rtrvrScrape?(url: string): Promise<any>;
  rtrvrMcp?(serverName: string, args: any): Promise<any>;
  
  // Digital Worker / Playbooks
  createPlaybook?(name: string, description: string, steps: any[], schedule?: string): Promise<any>;
  use_mcp_tool?(serverName: string, toolName: string, args: any): Promise<any>;
}

/**
 * Generic Executive Agent Implementation
 * Reusable for Leo, Jack, Linus, Glenda, Mike
 */
export const executiveAgent: AgentImplementation<ExecutiveMemory, ExecutiveTools> = {
  agentName: 'executive_base',

  async initialize(brandMemory, agentMemory) {
    logger.info(`[Executive] Initializing for ${brandMemory.brand_profile.name}...`);
    
    // Ensure objectives tracking is initialized from brand memory if empty
    if (!agentMemory.objectives || agentMemory.objectives.length === 0) {
        agentMemory.objectives = [...brandMemory.priority_objectives];
    }

    agentMemory.system_instructions = `
        You are an Executive Boardroom Member for ${brandMemory.brand_profile.name}.
        Your role is to act as a high-level strategic operator.
        
        CAPABILITIES:
        1. **Plan & Delegate**: Break down complex goals into tasks for other agents.
        2. **RTRvr Access**: You have exclusive access to a "Browser Agent" (RTRvr) that can login, download files, and browse the web autonomously.
        3. **Strategic Oversight**: Always tie actions back to the Brand Objectives.
    `;
    
    return agentMemory;
  },

  async orient(brandMemory, agentMemory, stimulus) {
    if (stimulus && typeof stimulus === 'string') return 'user_request';

    // Strategy: Check if the $100k MRR objective needs an update
    const mrrObjective = agentMemory.objectives.find(o => o.description.includes('MRR') || o.id === 'mrr_goal');
    if (mrrObjective && mrrObjective.status === 'active') {
        return 'mrr_check';
    }

    return null;
  },

  async act(brandMemory, agentMemory, targetId, tools: ExecutiveTools, stimulus?: string) {
    // === SCENARIO A: User Request (The "Planner" Flow) ===
    if (targetId === 'user_request' && stimulus) {
        const userQuery = stimulus;
        
        // 1. Tool Definitions
        const toolsDef = [
            {
                name: "generateSnapshot",
                description: "Get a quick strategic overview of a topic.",
                schema: z.object({ query: z.string(), context: z.any().optional() })
            },
            {
                name: "delegateTask",
                description: "Assign a task to a specialized agent (Craig, Smokey, Ezal, Pops).",
                schema: z.object({ 
                    personaId: z.enum(['craig', 'smokey', 'ezal', 'pops', 'money_mike', 'mrs_parker']), 
                    task: z.string() 
                })
            },
            {
                name: "rtrvrAgent",
                description: "Launch an autonomous browser agent to perform complex web tasks (login, download, post).",
                schema: z.object({ prompt: z.string().describe("Instructions for the browser agent") })
            },
            {
                name: "rtrvrScrape",
                description: "Scrape a specific URL for its content or accessibility tree.",
                schema: z.object({ url: z.string() })
            },
            {
                name: "createPlaybook",
                description: "Spawn a Digital Worker (recurring playbook) to handle a task daily/weekly.",
                schema: z.object({ 
                    name: z.string(), 
                    description: z.string(), 
                    steps: z.array(z.any()), 
                    schedule: z.string().optional().describe("CRON string e.g. '0 9 * * *'")
                })
            },
            {
                name: "use_mcp_tool",
                description: "Call an external tool provided by a connected Model Context Protocol (MCP) server.",
                schema: z.object({
                    serverName: z.string().describe("ID of the MCP server (e.g., 'filesystem', 'github')"),
                    toolName: z.string(),
                    args: z.record(z.any())
                })
            }
        ];

        try {
            // 2. PLAN
            const planPrompt = `
                ${agentMemory.system_instructions}
                
                USER REQUEST: "${userQuery}"
                
                Available Tools:
                ${toolsDef.map(t => `- ${t.name}: ${t.description}`).join('\n')}
                
                Decide the SINGLE best tool to use first.
                - Use 'delegateTask' if another agent is better suited.
                - Use 'rtrvrAgent' for complex web interactions (e.g. 'Log in to LinkedIn and post this').
                - Use 'rtrvrScrape' for reading a webpage.
                
                Return JSON: { "thought": string, "toolName": string, "args": object }
            `;

            const plan = await ai.generate({
                prompt: planPrompt,
                output: {
                    schema: z.object({
                        thought: z.string(),
                        toolName: z.enum(['generateSnapshot', 'delegateTask', 'rtrvrAgent', 'rtrvrScrape', 'createPlaybook', 'null']),
                        args: z.record(z.any())
                    })
                }
            });

            const decision = plan.output;

            if (!decision || decision.toolName === 'null') {
                 return {
                    updatedMemory: agentMemory,
                    logEntry: {
                        action: 'chat_response',
                        result: decision?.thought || "I'm assessing the boardroom strategy. How can I assist?",
                        metadata: { thought: decision?.thought }
                    }
                };
            }

            // 3. EXECUTE
            let output: any = "Tool failed";
            if (decision.toolName === 'generateSnapshot' && tools.generateSnapshot) {
                output = await tools.generateSnapshot(decision.args.query, {});
            } else if (decision.toolName === 'delegateTask' && tools.delegateTask) {
                output = await tools.delegateTask(decision.args.personaId, decision.args.task);
                output = await tools.rtrvrAgent(decision.args.prompt);
            } else if (decision.toolName === 'rtrvrScrape' && tools.rtrvrScrape) {
                output = await tools.rtrvrScrape(decision.args.url);
            } else if (decision.toolName === 'createPlaybook' && tools.createPlaybook) {
                output = await tools.createPlaybook(decision.args.name, decision.args.description, decision.args.steps, decision.args.schedule);
            } else if (decision.toolName === 'use_mcp_tool' && tools.use_mcp_tool) {
                output = await tools.use_mcp_tool(decision.args.serverName, decision.args.toolName, decision.args.args);
            }

            // 4. SYNTHESIZE
            const final = await ai.generate({
                prompt: `
                    User Request: "${userQuery}"
                    Action Taken: ${decision.thought}
                    Tool Output: ${JSON.stringify(output)}
                    
                    Respond to the user as an Executive.
                `
            });

            return {
                updatedMemory: agentMemory,
                logEntry: {
                    action: 'tool_execution',
                    result: final.text,
                    metadata: { tool: decision.toolName, output }
                }
            };

        } catch (e: any) {
             return {
                updatedMemory: agentMemory,
                logEntry: { action: 'error', result: `Planning failed: ${e.message}`, metadata: { error: e.message } }
            };
        }
    }

    if (targetId === 'mrr_check') {
        return {
            updatedMemory: agentMemory,
            logEntry: {
                action: 'monitor_growth',
                result: "Currently monitoring the path to $100k MRR. Aligning Jack (CRO) and Glenda (CMO) on the National Discovery Layer push.",
                next_step: 'await_data',
                metadata: { objective: '100k_mrr' }
            }
        };
    }

    return {
        updatedMemory: agentMemory,
        logEntry: {
            action: 'idle',
            result: 'Awaiting instructions or strategic signals.',
            next_step: 'wait',
            metadata: {}
        }
    };
  }
};
