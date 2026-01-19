/**
 * Unified Tool Executor
 *
 * Bridges the gap between:
 * - Tool definitions in shared-tools.ts (camelCase names, Zod schemas)
 * - Tool implementations in context-tools.ts & letta-memory.ts (Genkit tools)
 *
 * Uses lazy loading to avoid import issues during testing.
 * Provides a single interface for agents to execute any registered tool.
 */

import { logger } from '@/lib/logger';

// Type definitions
export type ToolExecutorFn = (...args: any[]) => Promise<any>;

export interface ToolExecutorContext {
    agentId: string;
    brandId: string;
    userId?: string;
    sessionId?: string;
}

/**
 * Lazily loaded tool implementations cache
 */
let toolImplementations: Record<string, any> | null = null;

/**
 * Load tool implementations on demand.
 * This prevents test failures from Genkit initialization.
 */
async function getToolImplementations(): Promise<Record<string, any>> {
    if (toolImplementations) {
        return toolImplementations;
    }

    try {
        // Dynamically import to avoid test initialization issues
        const [contextTools, lettaTools, intuitionTools] = await Promise.all([
            import('@/server/tools/context-tools'),
            import('@/server/tools/letta-memory'),
            import('@/server/tools/intuition-tools')
        ]);

        toolImplementations = {
            // Context OS Tools
            contextAskWhy: contextTools.contextAskWhy,
            contextLogDecision: contextTools.contextLogDecision,
            contextGetAgentHistory: contextTools.contextGetAgentHistory,
            contextCreateEntity: contextTools.contextCreateEntity,
            contextLinkEntities: contextTools.contextLinkEntities,
            contextFindRelated: contextTools.contextFindRelated,

            // Letta Memory Tools
            lettaSaveFact: lettaTools.lettaSaveFact,
            lettaAsk: lettaTools.lettaAsk,
            lettaSearchMemory: lettaTools.lettaSearchMemory,
            lettaUpdateCoreMemory: lettaTools.lettaUpdateCoreMemory,
            lettaMessageAgent: lettaTools.lettaMessageAgent,
            lettaReadSharedBlock: lettaTools.lettaReadSharedBlock,

            // Intuition OS Tools
            intuitionEvaluateHeuristics: intuitionTools.intuitionEvaluateHeuristics,
            intuitionGetConfidence: intuitionTools.intuitionGetConfidence,
            intuitionLogOutcome: intuitionTools.intuitionLogOutcome
        };

        logger.info('[ToolExecutor] Tool implementations loaded successfully');
        return toolImplementations;
    } catch (error: any) {
        logger.error('[ToolExecutor] Failed to load tool implementations:', error);
        // Return empty object to allow graceful degradation
        return {};
    }
}

/**
 * Execute a tool by name with given arguments.
 * Handles the mapping from agent tool definitions to Genkit implementations.
 */
export async function executeTool(
    toolName: string,
    args: Record<string, any>,
    context?: ToolExecutorContext
): Promise<any> {
    // Set global context for tools that need it
    if (context) {
        (global as any).currentAgentContext = {
            agentId: context.agentId,
            brandId: context.brandId,
            userId: context.userId,
            sessionId: context.sessionId
        };
        (global as any).currentTenantId = context.brandId;
    }

    const tools = await getToolImplementations();
    const tool = tools[toolName];

    if (!tool) {
        logger.warn(`[ToolExecutor] Tool not found: ${toolName}`);
        return { error: `Tool '${toolName}' not found in registry` };
    }

    try {
        // Genkit tools are callable directly with input object
        const result = await tool(args);
        logger.info(`[ToolExecutor] ${toolName} executed successfully`);
        return result;
    } catch (error: any) {
        logger.error(`[ToolExecutor] ${toolName} failed:`, error);
        return { error: error.message };
    }
}

/**
 * Create a tools object that can be injected into an agent.
 * Each tool is a callable function that delegates to executeTool.
 */
export function createAgentToolset(
    context: ToolExecutorContext,
    additionalTools?: Record<string, ToolExecutorFn>
): Record<string, ToolExecutorFn> {
    const toolset: Record<string, ToolExecutorFn> = {};

    // Create wrapper functions for Context OS tools
    toolset.contextLogDecision = async (decision: string, reasoning: string, category: string) => {
        return executeTool('contextLogDecision', { decision, reasoning, category }, context);
    };

    toolset.contextAskWhy = async (question: string) => {
        return executeTool('contextAskWhy', { question }, context);
    };

    toolset.contextGetAgentHistory = async (agentId: string, limit?: number) => {
        return executeTool('contextGetAgentHistory', { agentId, limit }, context);
    };

    toolset.contextCreateEntity = async (type: string, name: string, attributes?: Record<string, any>) => {
        return executeTool('contextCreateEntity', { type, name, attributes }, context);
    };

    toolset.contextLinkEntities = async (
        sourceType: string,
        sourceName: string,
        relationship: string,
        targetType: string,
        targetName: string,
        weight?: number
    ) => {
        return executeTool('contextLinkEntities', {
            sourceType, sourceName, relationship, targetType, targetName, weight
        }, context);
    };

    toolset.contextFindRelated = async (entityType: string, entityName: string, maxDepth?: number, minWeight?: number) => {
        return executeTool('contextFindRelated', { entityType, entityName, maxDepth, minWeight }, context);
    };

    // Create wrapper functions for Letta Memory tools
    toolset.lettaSaveFact = async (fact: string, category?: string) => {
        return executeTool('lettaSaveFact', { fact, category }, context);
    };

    toolset.lettaAsk = async (question: string) => {
        return executeTool('lettaAsk', { question }, context);
    };

    toolset.lettaSearchMemory = async (query: string) => {
        return executeTool('lettaSearchMemory', { query }, context);
    };

    toolset.lettaUpdateCoreMemory = async (section: 'persona' | 'human', content: string) => {
        return executeTool('lettaUpdateCoreMemory', { section, content }, context);
    };

    toolset.lettaMessageAgent = async (toAgent: string, message: string) => {
        return executeTool('lettaMessageAgent', { toAgent, message }, context);
    };

    toolset.lettaReadSharedBlock = async (blockLabel: string) => {
        return executeTool('lettaReadSharedBlock', { blockLabel }, context);
    };

    // Create wrapper functions for Intuition OS tools
    toolset.intuitionEvaluateHeuristics = async (customerProfile?: any, products?: any[], sessionContext?: any) => {
        return executeTool('intuitionEvaluateHeuristics', { customerProfile, products, sessionContext }, context);
    };

    toolset.intuitionGetConfidence = async (interactionCount: number, heuristicsMatched: number, totalHeuristics: number, isAnomalous?: boolean) => {
        return executeTool('intuitionGetConfidence', { interactionCount, heuristicsMatched, totalHeuristics, isAnomalous }, context);
    };

    toolset.intuitionLogOutcome = async (
        action: string,
        outcome: 'positive' | 'negative' | 'neutral',
        heuristicId?: string,
        recommendedProducts?: string[],
        selectedProduct?: string,
        confidenceScore?: number
    ) => {
        return executeTool('intuitionLogOutcome', {
            heuristicId, action, outcome, recommendedProducts, selectedProduct, confidenceScore
        }, context);
    };

    // Merge additional agent-specific tools
    if (additionalTools) {
        Object.assign(toolset, additionalTools);
    }

    return toolset;
}

/**
 * Register a custom tool implementation.
 * Use this to add agent-specific tools at runtime.
 */
export async function registerTool(name: string, implementation: any): Promise<void> {
    const tools = await getToolImplementations();
    if (tools[name]) {
        logger.warn(`[ToolExecutor] Overwriting existing tool: ${name}`);
    }
    tools[name] = implementation;
    logger.info(`[ToolExecutor] Registered tool: ${name}`);
}

/**
 * Get list of all registered tool names.
 */
export async function getRegisteredTools(): Promise<string[]> {
    const tools = await getToolImplementations();
    return Object.keys(tools);
}

/**
 * Check if a tool is registered.
 */
export async function hasToolImplementation(toolName: string): Promise<boolean> {
    const tools = await getToolImplementations();
    return toolName in tools;
}

/**
 * Reset tool implementations cache (useful for testing).
 */
export function resetToolCache(): void {
    toolImplementations = null;
}
