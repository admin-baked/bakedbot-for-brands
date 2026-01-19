import { logger } from '@/lib/logger';
import { AgentMemory, AgentLogEntry, BrandDomainMemory } from './schemas';
import { MemoryAdapter } from './persistence';

// Define the shape of an Agent implementation
// TTools: A specific type defining the external capabilities this agent is allowed to use.
export interface AgentImplementation<TMemory extends AgentMemory, TTools = any> {
    agentName: string;

    // 1. Initialize & Sanity Checks
    initialize(brandMemory: BrandDomainMemory, agentMemory: TMemory): Promise<TMemory>;

    // 2. Orient
    // Stimulus: Optional external trigger (e.g. Chat Message, Webhook Event)
    orient(brandMemory: BrandDomainMemory, agentMemory: TMemory, stimulus?: any): Promise<string | null>;

    // 3. Act
    // Now accepts tools explicitly injected by the harness/caller
    act(
        brandMemory: BrandDomainMemory,
        agentMemory: TMemory,
        targetId: string,
        tools: TTools,
        stimulus?: any
    ): Promise<{
        updatedMemory: TMemory;
        logEntry: Omit<AgentLogEntry, 'id' | 'timestamp' | 'agent_name'>
    }>;
}

/**
 * The Standard Agent Harness
 */
export async function runAgent<TMemory extends AgentMemory, TTools = any>(
    brandId: string,
    adapter: MemoryAdapter,
    implementation: AgentImplementation<TMemory, TTools>,
    tools: TTools, // Dependency Injection for effects
    stimulus?: any // Optional input (e.g. user message)
): Promise<AgentLogEntry | undefined> {

    const { agentName } = implementation;
    logger.info(`[Harness] Starting ${agentName} for brand ${brandId}`);

    try {
        // A. Load State
        const brandMemory = await adapter.loadBrandMemory(brandId);
        let agentMemory = await adapter.loadAgentMemory<TMemory>(brandId, agentName);

        // B. Initialize
        agentMemory = await implementation.initialize(brandMemory, agentMemory);

        // C. Orient
        // Check for urgent messages on the bus
        try {
            // Import dynamically to avoid circular deps
            const { getPendingMessages } = await import('../intuition/agent-bus');
            const messages = await getPendingMessages(brandId, agentName as any);
            if (messages.length > 0) {
                logger.info(`[Harness] ${agentName}: Has ${messages.length} pending messages. (Topic: ${messages[0].topic})`);
                // TODO: In future, inject these messages into 'stimulus' or 'agentMemory' context
            }
        } catch (e) {
            // Ignore bus errors, don't crash agent
        }

        const targetId = await implementation.orient(brandMemory, agentMemory, stimulus);

        if (!targetId) {
            logger.info(`[Harness] ${agentName}: No work target selected. Exiting.`);
            return;
        }

        logger.info(`[Harness] ${agentName}: Selected target ${targetId}`);

        // D. Act
        const result = await implementation.act(brandMemory, agentMemory, targetId, tools, stimulus);

        // E. Persist
        await adapter.saveAgentMemory(brandId, agentName, result.updatedMemory);

        const now = new Date(); // Capture time for consistency and type safety

        const logEntry: AgentLogEntry = {
            id: crypto.randomUUID(),
            timestamp: now,
            agent_name: agentName,
            target_id: targetId,
            stimulus: stimulus ? JSON.stringify(stimulus).slice(0, 100) : undefined,
            ...result.logEntry
        };

        await adapter.appendLog(brandId, agentName, logEntry);

        // --- Intuition OS Integration: Loop 1 (Log Everything) ---
        // Fire and forget logging to global event stream
        try {
            // Import dynamically to avoid circular deps if any (though clear here)
            const { logAgentEvent } = await import('../intuition/agent-events');

            await logAgentEvent({
                id: logEntry.id, // Align IDs for traceability
                tenantId: brandId,
                agent: agentName as any, // Cast to AgentName
                sessionId: 'harness_session', // TODO: Pass session ID through harness
                type: 'task_completed',
                payload: {
                    action: result.logEntry.action,
                    result: result.logEntry.result,
                    targetId,
                    stimulus: logEntry.stimulus,
                    ...(result.logEntry.metadata || {})
                },
                confidenceScore: result.logEntry.metadata?.confidence ? Number(result.logEntry.metadata.confidence) : undefined,
                systemMode: 'slow', // Harness runs are generally "System 2" / Offline / Slow
                createdAt: now.toISOString(),
            });
        } catch (e) {
            logger.warn(`[Harness] Failed to log intuition event: ${e}`);
        }

        logger.info(`[Harness] ${agentName}: Cycle complete. Target ${targetId} processed.`);
        return logEntry;

    } catch (error) {
        logger.error(`[Harness] ${agentName} failed:`, error as any);
        throw error;
    }
}

// ============================================================================
// MULTI-STEP PLANNING HELPER
// Enables agents to execute complex tasks requiring multiple tool calls
// ============================================================================

import { ai } from '@/ai/genkit';
import { z } from 'zod';

export interface MultiStepPlan {
    thought: string;
    status: 'CONTINUE' | 'COMPLETE' | 'BLOCKED';
    toolName: string | null;
    args: Record<string, any>;
}

import { executeWithTools } from '@/ai/claude';
import { zodToClaudeSchema } from '@/server/utils/zod-to-json';

// ============================================================================
// VALIDATION HOOK TYPES
// ============================================================================

export interface PreToolHookResult {
    /** Whether to proceed with tool execution */
    proceed: boolean;
    /** Optionally modify the args before execution */
    modifiedArgs?: any;
    /** Reason if not proceeding */
    reason?: string;
}

export interface PostToolHookResult {
    /** Whether validation passed */
    valid: boolean;
    /** Issues found during validation */
    issues?: string[];
    /** Instructions for remediation */
    remediation?: string;
    /** Whether agent should retry with remediation */
    shouldRetry?: boolean;
}

export interface MultiStepContext {
    userQuery: string;
    systemInstructions: string;
    toolsDef: Array<{ name: string; description: string; schema: z.ZodType<any> }>;
    tools: any;
    maxIterations?: number;
    model?: string;
    /** Agent ID for validation pipeline selection */
    agentId?: string;
    /** Maximum remediation attempts before failing */
    maxRemediationAttempts?: number;

    // === EXISTING CALLBACKS ===
    onStepComplete?: (step: number, toolName: string, result: any) => Promise<void>;
    onHITLRequired?: (params: { tool: string; args: any; reason: string }) => Promise<{ approved: boolean; reason?: string }>;
    onReplanRequired?: (toolName: string, error: string) => Promise<void>;
    onDriftDetected?: (pei: any) => Promise<void>;

    // === NEW VALIDATION HOOKS ===
    /** Called before tool execution - can block or modify args */
    onPreToolUse?: (toolName: string, args: any) => Promise<PreToolHookResult>;
    /** Called after tool execution - validates result */
    onPostToolUse?: (toolName: string, args: any, result: any) => Promise<PostToolHookResult>;
    /** Called when validation fails after max remediation attempts */
    onValidationFailed?: (toolName: string, issues: string[], remediation: string) => Promise<void>;
}

// ============================================================================
// VALIDATION HELPER
// ============================================================================

/**
 * Execute a tool with validation hooks and auto-remediation.
 * Returns the result if valid, or throws if validation fails after max attempts.
 */
async function executeToolWithValidation(
    toolName: string,
    args: any,
    toolFn: Function,
    context: MultiStepContext,
    addRemediationPrompt: (remediation: string) => void
): Promise<{ result: any; skipped: boolean }> {
    const maxAttempts = context.maxRemediationAttempts ?? 2;
    let attempts = 0;
    let currentArgs = args;

    // === PRE-TOOL VALIDATION ===
    if (context.onPreToolUse) {
        const preResult = await context.onPreToolUse(toolName, currentArgs);
        if (!preResult.proceed) {
            logger.info(`[Harness:Validation] Pre-tool check blocked ${toolName}: ${preResult.reason}`);
            return {
                result: { blocked: true, reason: preResult.reason || 'Pre-validation failed' },
                skipped: true
            };
        }
        if (preResult.modifiedArgs) {
            currentArgs = preResult.modifiedArgs;
        }
    }

    while (attempts < maxAttempts) {
        attempts++;

        // === EXECUTE TOOL ===
        let result: any;
        try {
            const argValues = Object.values(currentArgs);
            result = await toolFn(...argValues);
        } catch (e: any) {
            result = { error: e.message };
            if (context.onReplanRequired) {
                await context.onReplanRequired(toolName, e.message);
            }
            return { result, skipped: false };
        }

        // === POST-TOOL VALIDATION ===
        if (context.onPostToolUse) {
            const postResult = await context.onPostToolUse(toolName, currentArgs, result);

            if (!postResult.valid) {
                logger.warn(`[Harness:Validation] Post-tool validation failed for ${toolName} (attempt ${attempts}/${maxAttempts})`);

                if (postResult.shouldRetry && attempts < maxAttempts && postResult.remediation) {
                    // Inject remediation into agent context
                    addRemediationPrompt(
                        `⚠️ VALIDATION FAILED for ${toolName}:\n` +
                        `Issues: ${postResult.issues?.join(', ') || 'Unknown'}\n\n` +
                        `Remediation: ${postResult.remediation}\n\n` +
                        `Please fix and try again.`
                    );
                    continue; // Retry with remediation
                }

                // Max attempts reached or no retry
                if (context.onValidationFailed) {
                    await context.onValidationFailed(
                        toolName,
                        postResult.issues || ['Validation failed'],
                        postResult.remediation || 'No remediation available'
                    );
                }

                // Return result with validation metadata
                return {
                    result: {
                        ...result,
                        _validation: {
                            valid: false,
                            issues: postResult.issues,
                            attempts
                        }
                    },
                    skipped: false
                };
            }
        }

        // Validation passed
        return { result, skipped: false };
    }

    // Should not reach here, but fallback
    return { result: { error: 'Max validation attempts exceeded' }, skipped: false };
}

/**
 * Execute a multi-step task with iterative planning.
 * The agent will continue calling tools until it declares COMPLETE or hits max iterations.
 */
export async function runMultiStepTask(context: MultiStepContext): Promise<{
    finalResult: string;
    steps: Array<{ tool: string; args: any; result: any }>;
}> {
    const { userQuery, systemInstructions, toolsDef, tools, maxIterations = 5, onStepComplete, model = 'hybrid' } = context;
    
    // === HYBRID EXECUTION PATH (Gemini Planning + Claude Synthesis) ===
    if (model === 'hybrid') {
        const steps: Array<{ tool: string; args: any; result: any }> = [];
        let iteration = 0;
        
        while (iteration < maxIterations) {
            iteration++;
            
            // Build history from prior steps
            const historyPrompt = steps.length > 0 
                ? `\n\nPRIOR STEPS:\n${steps.map((s, i) => `${i + 1}. ${s.tool}(${JSON.stringify(s.args)}) -> ${JSON.stringify(s.result).slice(0, 300)}`).join('\n')}`
                : '';
            
            // PLAN with Gemini 3 Pro
            const planPrompt = `
                ${systemInstructions}
                
                USER REQUEST: "${userQuery}"
                ${historyPrompt}
                
                Available Tools:
                ${toolsDef.map(t => `- ${t.name}: ${t.description}`).join('\n')}
                
                Based on the user request and prior steps, decide your next action:
                - If more work is needed, select a tool.
                - If the task is complete, set status to 'COMPLETE'.
                - If blocked (e.g., missing info), set status to 'BLOCKED'.
                
                Return JSON: { "thought": string, "status": "CONTINUE" | "COMPLETE" | "BLOCKED", "toolName": string | null, "args": object }
            `;
            
            const plan = await ai.generate({
                model: 'googleai/gemini-2.5-flash', // Gemini for fast planning
                prompt: planPrompt,
                output: {
                    schema: z.object({
                        thought: z.string(),
                        status: z.enum(['CONTINUE', 'COMPLETE', 'BLOCKED']),
                        toolName: z.string().nullable(),
                        args: z.record(z.any())
                    })
                }
            });
            
            const decision = plan.output as MultiStepPlan;
            
            if (decision.status === 'COMPLETE' || decision.status === 'BLOCKED') {
                // Synthesize final response with Claude 4.5 Opus
                const { executeWithTools: claudeSynthesize } = await import('@/ai/claude');
                const synthesisResult = await claudeSynthesize(
                    `User Request: "${userQuery}"
                    Steps Taken: ${steps.length}
                    Final Thought: ${decision.thought}
                    All Results: ${JSON.stringify(steps.map(s => s.result)).slice(0, 2000)}
                    
                    Synthesize a comprehensive response for the user.`,
                    [], // No tools for synthesis
                    async () => ({}), // Dummy executor
                    { maxIterations: 1 }
                );
                
                return { finalResult: synthesisResult.content, steps };
            }
            
            if (!decision.toolName) {
                break;
            }

            // HITL Check
            const HITL_TOOLS = ['sendSms', 'rtrvrAgent', 'createPlaybook', 'sendEmail'];
            if (HITL_TOOLS.includes(decision.toolName) && context.onHITLRequired) {
                const approval = await context.onHITLRequired({
                    tool: decision.toolName,
                    args: decision.args,
                    reason: decision.thought
                });
                
                if (!approval.approved) {
                    steps.push({ 
                        tool: decision.toolName, 
                        args: decision.args, 
                        result: { blocked: true, reason: approval.reason || 'User denied action' } 
                    });
                    continue;
                }
            }
            
            // EXECUTE with VALIDATION
            const toolFn = tools[decision.toolName];
            let result: any = { error: 'Tool not found' };

            if (typeof toolFn === 'function') {
                // Use validation helper if hooks are provided
                if (context.onPreToolUse || context.onPostToolUse) {
                    let remediationPrompt = '';
                    const validatedResult = await executeToolWithValidation(
                        decision.toolName,
                        decision.args,
                        toolFn,
                        context,
                        (remediation) => { remediationPrompt = remediation; }
                    );
                    result = validatedResult.result;

                    // If validation failed with remediation, add to history for re-planning
                    if (remediationPrompt) {
                        steps.push({
                            tool: decision.toolName,
                            args: decision.args,
                            result: { ...result, _remediationRequested: remediationPrompt }
                        });
                        continue; // Re-plan with remediation context
                    }
                } else {
                    // Original execution without validation
                    try {
                        const argValues = Object.values(decision.args);
                        result = await toolFn(...argValues);
                    } catch (e: any) {
                        result = { error: e.message };
                        if (context.onReplanRequired) await context.onReplanRequired(decision.toolName, e.message);
                    }
                }
            }

            steps.push({ tool: decision.toolName, args: decision.args, result });
            if (onStepComplete) await onStepComplete(steps.length, decision.toolName, result);
        }
        
        // Fallback synthesis if loop exits without COMPLETE
        return { 
            finalResult: `Completed ${steps.length} steps. Last thought: ${steps[steps.length - 1]?.result || 'No steps taken.'}`, 
            steps 
        };
    }
    
    // === CLAUDE EXECUTION PATH (LOGIC MASTER) ===
    // Routing: Trigger if model is explicitly 'claude' OR if it's a specific Anthropic model string
    if (model === 'claude' || (model && model.startsWith('claude-'))) {
        const { executeWithTools } = await import('@/ai/claude');
        const { zodToClaudeSchema } = await import('@/server/utils/zod-to-json');

        // Convert Tools
        const claudeTools = toolsDef.map(t => ({
            name: t.name,
            description: t.description,
            input_schema: zodToClaudeSchema(t.schema)
        }));

        // Executor Wrapper to bridge Harness -> Claude
        const steps: Array<{ tool: string; args: any; result: any }> = [];
        
        const executor = async (toolName: string, args: Record<string, unknown>) => {
            // HITL Check
            const HITL_TOOLS = ['sendSms', 'rtrvrAgent', 'createPlaybook', 'sendEmail'];
            if (HITL_TOOLS.includes(toolName) && context.onHITLRequired) {
                const approval = await context.onHITLRequired({
                    tool: toolName,
                    args,
                    reason: "Automated tool call by Claude"
                });
                
                if (!approval.approved) {
                    const result = { blocked: true, reason: approval.reason || 'User denied action' };
                    // Log step via callback
                    if (onStepComplete) {
                        // Step counting is fuzzy here, simple mapping to indicate a step occurred
                        await onStepComplete(context.maxIterations ? context.maxIterations - 1 : 1, toolName, result); 
                    }
                    return result; // Return blockage to Claude
                }
            }

            // Lookup the tool function
            const toolFn = (tools as any)[toolName];
            let result: any = { error: 'Tool not found' };

            if (typeof toolFn === 'function') {
                // Use validation helper if hooks are provided
                if (context.onPreToolUse || context.onPostToolUse) {
                    const validatedResult = await executeToolWithValidation(
                        toolName,
                        args,
                        toolFn,
                        context,
                        (remediation) => {
                            // For Claude path, we return remediation in result for Claude to handle
                            logger.info(`[Harness:Claude] Remediation requested: ${remediation.slice(0, 100)}`);
                        }
                    );
                    result = validatedResult.result;
                } else {
                    // Original execution without validation
                    try {
                        const argValues = Object.values(args);
                        result = await toolFn(...argValues);
                    } catch (e: any) {
                        result = { error: e.message };
                        if (context.onReplanRequired) await context.onReplanRequired(toolName, e.message);
                    }
                }
            }

            steps.push({ tool: toolName, args, result });
            if (onStepComplete) await onStepComplete(steps.length, toolName, result);
            return result;
        };

        const result = await executeWithTools(
            `${systemInstructions}\n\nUser Request: ${userQuery}`,
            claudeTools,
            executor,
            { maxIterations }
        );

        return { finalResult: result.content, steps };
    }

    // === GEMINI EXECUTION PATH (DEFAULT) ===
    
    const steps: Array<{ tool: string; args: any; result: any }> = [];
    let iteration = 0;
    
    // Build tool names enum dynamically
    const toolNames = [...toolsDef.map(t => t.name), 'null'] as const;
    
    while (iteration < maxIterations) {
        iteration++;
        
        // Build history from prior steps
        const historyPrompt = steps.length > 0 
            ? `\n\nPRIOR STEPS:\n${steps.map((s, i) => `${i + 1}. ${s.tool}(${JSON.stringify(s.args)}) -> ${JSON.stringify(s.result).slice(0, 300)}`).join('\n')}`
            : '';
        
        // PLAN
        const planPrompt = `
            ${systemInstructions}
            
            USER REQUEST: "${userQuery}"
            ${historyPrompt}
            
            Available Tools:
            ${toolsDef.map(t => `- ${t.name}: ${t.description}`).join('\n')}
            
            Based on the user request and prior steps, decide your next action:
            - If more work is needed, select a tool.
            - If the task is complete, set status to 'COMPLETE'.
            - If blocked (e.g., missing info), set status to 'BLOCKED'.
            
            Return JSON: { "thought": string, "status": "CONTINUE" | "COMPLETE" | "BLOCKED", "toolName": string | null, "args": object }
        `;
        
        const plan = await ai.generate({
            model: model !== 'claude' && model !== 'gemini' ? model : undefined,
            prompt: planPrompt,
            output: {
                schema: z.object({
                    thought: z.string(),
                    status: z.enum(['CONTINUE', 'COMPLETE', 'BLOCKED']),
                    toolName: z.string().nullable(),
                    args: z.record(z.any())
                })
            }
        });
        
        const decision = plan.output as MultiStepPlan;
        
        if (decision.status === 'COMPLETE' || decision.status === 'BLOCKED') {
            // Synthesize final response
            const final = await ai.generate({
                model: model !== 'claude' && model !== 'gemini' ? model : undefined,
                prompt: `
                    User Request: "${userQuery}"
                    Steps Taken: ${steps.length}
                    Final Thought: ${decision.thought}
                    All Results: ${JSON.stringify(steps.map(s => s.result)).slice(0, 2000)}
                    
                    Synthesize a comprehensive response for the user.
                `
            });
            
            return { finalResult: final.text, steps };
        }
        
        if (!decision.toolName) {
            break; // No tool selected, exit loop
        }

        // =========================================================
        // HITL (Human-in-the-Loop) CHECKPOINT
        // High-risk actions require approval before execution
        // =========================================================
        const HITL_TOOLS = ['sendSms', 'rtrvrAgent', 'createPlaybook', 'sendEmail'];
        
        if (HITL_TOOLS.includes(decision.toolName) && context.onHITLRequired) {
            const approval = await context.onHITLRequired({
                tool: decision.toolName,
                args: decision.args,
                reason: decision.thought
            });
            
            if (!approval.approved) {
                steps.push({ 
                    tool: decision.toolName, 
                    args: decision.args, 
                    result: { blocked: true, reason: approval.reason || 'User denied action' } 
                });
                continue; // Re-plan without executing
            }
        }
        
        // EXECUTE
        const toolFn = tools[decision.toolName];
        let result: any = { error: 'Tool not found' };
        
        if (typeof toolFn === 'function') {
            try {
                // Call the tool with appropriate args
                const argValues = Object.values(decision.args);
                result = await toolFn(...argValues);
            } catch (e: any) {
                result = { error: e.message };
                
                // =========================================================
                // RE-PLANNING ON ERROR
                // If tool fails, trigger re-planning
                // =========================================================
                if (context.onReplanRequired) {
                    await context.onReplanRequired(decision.toolName, e.message);
                }
            }
        }
        
        steps.push({ tool: decision.toolName, args: decision.args, result });
        
        // =========================================================
        // PEI (Planning Efficiency Index) CHECK
        // Detect behavioral drift and trigger self-correction
        // =========================================================
        const pei = calculatePEI(steps);
        if (pei.driftDetected && context.onDriftDetected) {
            await context.onDriftDetected(pei);
        }
        
        // Callback for persistence
        if (onStepComplete) {
            await onStepComplete(iteration, decision.toolName, result);
        }
    }
    
    // Hit max iterations
    const final = await ai.generate({
        model: model !== 'claude' && model !== 'gemini' ? model : undefined,
        prompt: `
            User Request: "${userQuery}"
            Steps Taken: ${steps.length} (reached max iterations)
            All Results: ${JSON.stringify(steps.map(s => s.result)).slice(0, 2000)}
            
            Synthesize the best possible response given the work completed.
        `
    });
    
    return { finalResult: final.text, steps };
}

// ============================================================================
// PEI (Planning Efficiency Index) - Behavioral Drift Detection
// ============================================================================

export interface PEI {
    stepsCompleted: number;
    errorCount: number;
    successRate: number;
    driftDetected: boolean;
}

function calculatePEI(steps: Array<{ tool: string; args: any; result: any }>): PEI {
    const errorCount = steps.filter(s => s.result?.error || s.result?.blocked).length;
    const successRate = steps.length > 0 ? (steps.length - errorCount) / steps.length : 1;
    
    // Drift detected if:
    // 1. More than 2 errors in sequence
    // 2. Success rate drops below 50%
    // 3. Same tool called 3+ times (potential loop)
    const toolCounts = steps.reduce((acc, s) => {
        acc[s.tool] = (acc[s.tool] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    
    const hasLoop = Object.values(toolCounts).some(count => count >= 3);
    const driftDetected = errorCount > 2 || successRate < 0.5 || hasLoop;
    
    return {
        stepsCompleted: steps.length,
        errorCount,
        successRate,
        driftDetected
    };
}

// ============================================================================
// HITL (Human-in-the-Loop) Types
// ============================================================================

export interface HITLRequest {
    tool: string;
    args: Record<string, any>;
    reason: string;
}

export interface HITLResponse {
    approved: boolean;
    reason?: string;
}

// Extended context with HITL and PEI callbacks
export interface MultiStepContextExtended extends MultiStepContext {
    onHITLRequired?: (request: HITLRequest) => Promise<HITLResponse>;
    onReplanRequired?: (failedTool: string, error: string) => Promise<void>;
    onDriftDetected?: (pei: PEI) => Promise<void>;
}

