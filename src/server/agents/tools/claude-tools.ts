/**
 * Claude Tool Conversion Layer
 * 
 * Converts BakedBot tool definitions from the registry to Claude's tool format.
 * Also provides a tool executor that dispatches calls to the actual implementations.
 */

import type { Tool as ClaudeTool } from '@anthropic-ai/sdk/resources/messages';
import { TOOL_REGISTRY, getToolsForRole } from './registry';
import type { ToolDefinition } from '@/types/agent-toolkit';
import type { UserRole } from '@/server/auth/rbac';
import { routeToolCall } from './router';

/**
 * Convert a BakedBot ToolDefinition to Claude's Tool format
 */
export function convertToClaudeTool(def: ToolDefinition): ClaudeTool {
    return {
        name: def.name,
        description: def.description,
        input_schema: def.inputSchema as ClaudeTool['input_schema'],
    };
}

/**
 * Convert all tools in the registry to Claude format
 */
export function getAllClaudeTools(): ClaudeTool[] {
    return Object.values(TOOL_REGISTRY).map(convertToClaudeTool);
}

/**
 * Get Claude-formatted tools available to a specific role
 */
export function getClaudeToolsForRole(role: UserRole): ClaudeTool[] {
    return getToolsForRole(role).map(convertToClaudeTool);
}

/**
 * Get Claude-formatted tools for a specific agent
 * 
 * @param agentId - The agent ID (e.g., 'craig', 'smokey')
 * @param role - The user's role for permission filtering
 */
export function getClaudeToolsForAgent(agentId: string, role: UserRole): ClaudeTool[] {
    // Agent-specific tool mappings
    const agentToolMappings: Record<string, string[]> = {
        craig: [
            'marketing.createCampaignDraft',
            'marketing.segmentBuilder',
            'marketing.send',
            'marketing.sendEmail',
            'docs.search',
            'context.getTenantProfile',
        ],
        smokey: [
            'catalog.searchProducts',
            'catalog.getProduct',
            'docs.search',
            'context.getTenantProfile',
        ],
        pops: [
            'analytics.getKPIs',
            'docs.search',
            'context.getTenantProfile',
        ],
        ezal: [
            'intel.scanCompetitors',
            'intel.generateCompetitiveReport',
            'web.search',
            'docs.search',
            'context.getTenantProfile',
        ],
        money_mike: [
            'analytics.getKPIs',
            'context.getTenantProfile',
        ],
        mrs_parker: [
            'marketing.segmentBuilder',
            'analytics.getKPIs',
            'context.getTenantProfile',
        ],
        deebo: [
            'deebo.checkContent',
            'context.getTenantProfile',
        ],
    };

    // Get tools for this agent, falling back to common tools
    const toolNames = agentToolMappings[agentId] || [
        'context.getTenantProfile',
        'docs.search',
        'web.search',
    ];

    // Filter by role permissions and convert
    const roleTools = getToolsForRole(role);
    const roleToolNames = new Set(roleTools.map(t => t.name));

    return toolNames
        .filter(name => TOOL_REGISTRY[name] && roleToolNames.has(name))
        .map(name => convertToClaudeTool(TOOL_REGISTRY[name]));
}

/**
 * Universal tools available to all agents
 */
export function getUniversalClaudeTools(role: UserRole): ClaudeTool[] {
    const universalToolNames = [
        'context.getTenantProfile',
        'audit.log',
        'docs.search',
        'web.search',
        'creative.generateImage',
        'creative.generateVideo',
    ];

    const roleTools = getToolsForRole(role);
    const roleToolNames = new Set(roleTools.map(t => t.name));

    return universalToolNames
        .filter(name => TOOL_REGISTRY[name] && roleToolNames.has(name))
        .map(name => convertToClaudeTool(TOOL_REGISTRY[name]));
}

/**
 * Create a tool executor function for use with Claude
 * 
 * This wraps the existing tool router to execute tools
 * and return results in a format Claude can understand.
 * 
 * @param context - Execution context (userId, brandId, etc.)
 */
export function createToolExecutor(context: {
    userId?: string;
    brandId?: string;
    role?: string;
    email?: string;
    approvedApprovalId?: string;
}): (toolName: string, input: Record<string, unknown>) => Promise<unknown> {
    return async (toolName: string, input: Record<string, unknown>) => {
        const approvedApprovalId = context.approvedApprovalId;
        const response = await routeToolCall({
            toolName,
            tenantId: context.brandId || null,
            actor: {
                userId: context.userId || 'anonymous',
                role: (context.role as UserRole) || 'guest',
                email: context.email,
            },
            inputs: input as Record<string, any>,
            approvedApprovalId,
            idempotencyKey: approvedApprovalId
                ? `claude-approved-${approvedApprovalId}-${toolName}`
                : `claude-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        });

        if (response.status === 'blocked') {
            throw new Error(JSON.stringify({
                blocked: true,
                toolName,
                approvalId: typeof response.data === 'object' && response.data && 'approvalId' in response.data
                    ? (response.data as { approvalId?: string }).approvalId
                    : undefined,
                error: response.error || `Tool ${toolName} is awaiting approval`,
            }));
        }

        if (response.status !== 'success') {
            throw new Error(response.error || `Tool ${toolName} failed`);
        }

        return response.data;
    };
}


const CLAUDE_RESEARCH_ACTION_PATTERN = /\b(search|look\s*up|lookup|find|research|scan|check|review|read|summari[sz]e)\b/i;
const CLAUDE_RESEARCH_TARGET_PATTERN = /\b(web|internet|online|google|website|site|docs?|documentation|knowledge\s*base|knowledgebase|kb|page|pages|latest|current)\b/i;
const CLAUDE_ASSET_ACTION_PATTERN = /\b(generate|create|make|design|render|produce)\b/i;
const CLAUDE_ASSET_TARGET_PATTERN = /\b(image|graphic|photo|poster|banner|thumbnail|mockup|video|animation|reel|asset)\b/i;
const CLAUDE_EXPLICIT_TOOL_PATTERN = /\b(use|run)\b.{0,30}\b(web\s*search|docs?|documentation|knowledge\s*base|image|video)\b/i;

/**
 * Detect whether a message maps to the small universal Claude tool set.
 *
 * This should stay narrow: broad verbs like "analyze" or "generate" alone
 * should not wake up Claude when the request is better handled by a specialist
 * agent or the one-shot general assistant.
 */
export function shouldUseClaudeTools(message: string): boolean {
    const text = message.trim();
    if (!text) {
        return false;
    }

    const isExplicitResearchRequest =
        CLAUDE_RESEARCH_ACTION_PATTERN.test(text) &&
        CLAUDE_RESEARCH_TARGET_PATTERN.test(text);
    const isExplicitAssetRequest =
        CLAUDE_ASSET_ACTION_PATTERN.test(text) &&
        CLAUDE_ASSET_TARGET_PATTERN.test(text);

    return (
        isExplicitResearchRequest ||
        isExplicitAssetRequest ||
        CLAUDE_EXPLICIT_TOOL_PATTERN.test(text)
    );
}
