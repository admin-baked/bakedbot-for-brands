/**
 * Discovery Browser Tools - Genkit Tool Wrappers
 * 
 * Provides agent tools for browser automation via the Discovery layer.
 * 
 * ACCESS CONTROL:
 * - These tools are RESTRICTED to Executive Boardroom (Leo, Linus, Glenda, Mike, Jack) and Super Users.
 * - Regular users (brand, dispensary, customer) do NOT have access until proven reliable.
 */

import { ToolDefinition } from '@/types/agent-toolkit';
import { 
    executeAgentTask, 
    summarizeUrl, 
    extractFromUrl,
    fillForm,
    createRedditAdCampaign,
    AgentRequest,
    AgentResult
} from './agent';
import { getRTRVRClient, RTRVRResponse } from './client';
import { logger } from '@/lib/logger';

// ============================================================================
// TOOL DEFINITIONS (For Registry)
// ============================================================================

/**
 * Discovery browser tools for the tool registry.
 * All restricted to admin:all (Super Users) for initial rollout.
 */
export const DISCOVERY_BROWSER_TOOLS: Record<string, ToolDefinition> = {
    'discovery.browserAutomate': {
        name: 'discovery.browserAutomate',
        description: 'Execute a browser automation task. Can navigate pages, fill forms, click buttons, and extract data.',
        inputSchema: {
            type: 'object',
            properties: {
                input: { type: 'string', description: 'Detailed instruction for the browser agent' },
                urls: { type: 'array', items: { type: 'string' }, description: 'URLs to open' },
                verbosity: { type: 'string', enum: ['final', 'steps', 'debug'], default: 'final' }
            },
            required: ['input']
        },
        category: 'side-effect',
        requiredPermission: 'admin:all',
    },
    'discovery.summarizePage': {
        name: 'discovery.summarizePage',
        description: 'Summarize the main content of a webpage in bullet points.',
        inputSchema: {
            type: 'object',
            properties: {
                url: { type: 'string', description: 'URL to summarize' }
            },
            required: ['url']
        },
        category: 'read',
        requiredPermission: 'admin:all',
    },
    'discovery.extractData': {
        name: 'discovery.extractData',
        description: 'Extract structured data from a webpage based on instructions.',
        inputSchema: {
            type: 'object',
            properties: {
                url: { type: 'string', description: 'URL to extract from' },
                instruction: { type: 'string', description: 'What data to extract' },
                schema: { type: 'object', description: 'Expected JSON schema for output' }
            },
            required: ['url', 'instruction']
        },
        category: 'read',
        requiredPermission: 'admin:all',
    },
    'discovery.fillForm': {
        name: 'discovery.fillForm',
        description: 'Fill a form on a webpage and optionally submit it.',
        inputSchema: {
            type: 'object',
            properties: {
                url: { type: 'string', description: 'URL of the form' },
                formData: { type: 'object', description: 'Field name to value mapping' },
                submitButtonText: { type: 'string', description: 'Text of submit button to click' }
            },
            required: ['url', 'formData']
        },
        category: 'side-effect',
        requiredPermission: 'admin:all',
    },
    'discovery.createRedditAd': {
        name: 'discovery.createRedditAd',
        description: 'Create a Reddit advertising campaign targeting specific subreddits.',
        inputSchema: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Campaign name' },
                objective: { type: 'string', enum: ['traffic', 'conversions', 'awareness'] },
                targetSubreddits: { type: 'array', items: { type: 'string' }, description: 'Subreddits to target' },
                budget: { type: 'number', description: 'Daily budget in USD' },
                headline: { type: 'string', description: 'Ad headline' },
                body: { type: 'string', description: 'Ad body text' }
            },
            required: ['name', 'objective', 'targetSubreddits', 'budget']
        },
        category: 'side-effect',
        requiredPermission: 'admin:all',
    }
};

// ============================================================================
// TOOL EXECUTORS
// ============================================================================

/**
 * Execute a discovery browser tool.
 * Route to the appropriate function based on tool name.
 */
export async function executeDiscoveryBrowserTool(
    toolName: string,
    params: Record<string, unknown>
): Promise<RTRVRResponse<AgentResult>> {
    const client = getRTRVRClient();
    
    if (!client.isAvailable()) {
        return {
            success: false,
            error: 'Discovery browser automation not configured. Contact admin to enable.',
        };
    }

    logger.info(`[Discovery Browser] Executing ${toolName}`, { params: Object.keys(params) });

    switch (toolName) {
        case 'discovery.browserAutomate':
            return executeAgentTask({
                input: params.input as string,
                urls: params.urls as string[],
                verbosity: (params.verbosity as 'final' | 'steps' | 'debug') || 'final',
            });

        case 'discovery.summarizePage':
            return summarizeUrl(params.url as string);

        case 'discovery.extractData':
            return extractFromUrl(
                params.url as string,
                params.instruction as string,
                (params.schema as Record<string, unknown>) || {}
            );

        case 'discovery.fillForm':
            return fillForm(
                params.url as string,
                params.formData as Record<string, string>,
                params.submitButtonText as string | undefined
            );

        case 'discovery.createRedditAd':
            return createRedditAdCampaign({
                name: params.name as string,
                objective: params.objective as 'traffic' | 'conversions' | 'awareness',
                targetSubreddits: params.targetSubreddits as string[],
                budget: params.budget as number,
                creative: params.headline ? {
                    headline: params.headline as string,
                    body: params.body as string || '',
                } : undefined,
            });

        default:
            return {
                success: false,
                error: `Unknown discovery browser tool: ${toolName}`,
            };
    }
}

// ============================================================================
// ACCESS CONTROL
// ============================================================================

/**
 * Executive Boardroom agents that have Discovery browser access.
 */
export const DISCOVERY_BROWSER_ALLOWED_AGENTS = [
    'leo',      // COO - Orchestration
    'linus',    // CTO - Technical automation & testing
    'glenda',   // CMO - Marketing automation
    'mike_exec', // CFO - Financial automation
    'jack',     // CRO - Growth automation
];

/**
 * Check if an agent can use Discovery browser tools.
 */
export function canAgentUseDiscoveryBrowser(agentId: string): boolean {
    return DISCOVERY_BROWSER_ALLOWED_AGENTS.includes(agentId);
}

/**
 * Check if a role can use Discovery browser tools.
 * Only Super Users have access in Phase 1.
 */
export function canRoleUseDiscoveryBrowser(role: string): boolean {
    return role === 'super_admin' || role === 'admin';
}
