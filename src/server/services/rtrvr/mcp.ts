/**
 * Discovery MCP - Logged-In Browser Control
 * 
 * Wrapper for the /mcp endpoint.
 * Enables control of a logged-in Chrome browser via the extension.
 * Used for tasks requiring authentication (Reddit, Twitter, admin panels).
 * 
 * ACCESS CONTROL:
 * - Executive Boardroom + Super Users only
 * - Requires Chrome extension installed on operator device
 */

import { getRTRVRClient, RTRVRResponse } from './client';
import { logger } from '@/lib/logger';

// ============================================================================
// TYPES
// ============================================================================

export type MCPTool = 
    // Free tools (no credits)
    | 'get_browser_tabs'
    | 'get_page_data'
    | 'take_page_action'
    | 'execute_javascript'
    // Credit-based tools
    | 'planner'
    | 'act'
    | 'extract'
    | 'crawl'
    // Utility tools
    | 'list_devices'
    | 'get_current_credits';

export interface MCPRequest {
    /** Tool to execute */
    tool: MCPTool;
    /** Tool parameters */
    params: Record<string, unknown>;
    /** Device ID (optional, auto-selects most recent if not provided) */
    deviceId?: string;
}

export interface MCPDevice {
    id: string;
    name: string;
    online: boolean;
    lastSeen: string;
}

export interface MCPResult {
    success: boolean;
    result?: unknown;
    error?: string;
    creditsUsed?: number;
}

// ============================================================================
// MCP FUNCTIONS
// ============================================================================

/**
 * Execute an MCP tool on a logged-in browser.
 */
export async function executeMCPTool(
    request: MCPRequest
): Promise<RTRVRResponse<MCPResult>> {
    const client = getRTRVRClient();

    if (!client.isAvailable()) {
        return {
            success: false,
            error: 'Discovery browser not configured',
        };
    }

    logger.info(`[Discovery MCP] Executing ${request.tool}`, { 
        hasDeviceId: !!request.deviceId 
    });

    const body: Record<string, unknown> = {
        tool: request.tool,
        params: request.params,
    };

    if (request.deviceId) {
        body.deviceId = request.deviceId;
    }

    return client.mcp<MCPResult>(body);
}

// ============================================================================
// FREE TOOLS (No Credits)
// ============================================================================

/**
 * List all open browser tabs
 */
export async function getBrowserTabs(options: {
    filter?: 'all' | 'active' | 'domain';
    domain?: string;
    deviceId?: string;
} = {}): Promise<RTRVRResponse<MCPResult>> {
    return executeMCPTool({
        tool: 'get_browser_tabs',
        params: {
            filter: options.filter || 'all',
            domain: options.domain,
        },
        deviceId: options.deviceId,
    });
}

/**
 * Get page accessibility tree data for specific tabs
 */
export async function getPageData(tabIds: number[], deviceId?: string): Promise<RTRVRResponse<MCPResult>> {
    return executeMCPTool({
        tool: 'get_page_data',
        params: { tabIds },
        deviceId,
    });
}

/**
 * Take actions on a page (click, type, scroll, etc.)
 */
export async function takePageAction(
    actions: Array<{
        tabId?: number;
        toolName: string;
        args: Record<string, unknown>;
    }>,
    deviceId?: string
): Promise<RTRVRResponse<MCPResult>> {
    return executeMCPTool({
        tool: 'take_page_action',
        params: {
            actions: actions.map(a => ({
                tab_id: a.tabId,
                tool_name: a.toolName,
                args: a.args,
            })),
        },
        deviceId,
    });
}

// ============================================================================
// CREDIT-BASED TOOLS
// ============================================================================

/**
 * Run multi-step planning from natural language.
 * This is the most powerful MCP tool - it can orchestrate complex workflows.
 */
export async function runPlanner(options: {
    userInput: string;
    tabUrls?: string[];
    maxSteps?: number;
    context?: string;
    deviceId?: string;
}): Promise<RTRVRResponse<MCPResult>> {
    return executeMCPTool({
        tool: 'planner',
        params: {
            user_input: options.userInput,
            tab_urls: options.tabUrls,
            max_steps: options.maxSteps,
            context: options.context,
        },
        deviceId: options.deviceId,
    });
}

/**
 * Perform an intelligent action on a page
 */
export async function act(options: {
    userInput: string;
    tabUrls?: string[];
    schema?: {
        fields: Array<{
            name: string;
            description: string;
            type: string;
            required?: boolean;
        }>;
    };
    tabId?: number;
    deviceId?: string;
}): Promise<RTRVRResponse<MCPResult>> {
    return executeMCPTool({
        tool: 'act',
        params: {
            user_input: options.userInput,
            tab_urls: options.tabUrls,
            schema: options.schema,
            tab_id: options.tabId,
        },
        deviceId: options.deviceId,
    });
}

/**
 * Extract structured data from a page
 */
export async function extract(options: {
    userInput: string;
    tabUrls?: string[];
    schema?: {
        fields: Array<{
            name: string;
            description: string;
            type: string;
            required?: boolean;
        }>;
    };
    outputDestination?: {
        type: 'json' | 'google_sheet';
        newSheetTitle?: string;
        existingSheetId?: string;
    };
    deviceId?: string;
}): Promise<RTRVRResponse<MCPResult>> {
    return executeMCPTool({
        tool: 'extract',
        params: {
            user_input: options.userInput,
            tab_urls: options.tabUrls,
            schema: options.schema,
            output_destination: options.outputDestination ? {
                type: options.outputDestination.type,
                new_sheet_title: options.outputDestination.newSheetTitle,
                existing_sheet_id: options.outputDestination.existingSheetId,
            } : undefined,
        },
        deviceId: options.deviceId,
    });
}

/**
 * Crawl multiple pages with schema extraction
 */
export async function crawl(options: {
    userInput: string;
    tabUrls?: string[];
    maxPages?: number;
    followLinks?: boolean;
    linkPattern?: string;
    schema?: {
        fields: Array<{
            name: string;
            description: string;
            type: string;
            required?: boolean;
        }>;
    };
    deviceId?: string;
}): Promise<RTRVRResponse<MCPResult>> {
    return executeMCPTool({
        tool: 'crawl',
        params: {
            user_input: options.userInput,
            tab_urls: options.tabUrls,
            max_pages: options.maxPages,
            follow_links: options.followLinks,
            link_pattern: options.linkPattern,
            schema: options.schema,
        },
        deviceId: options.deviceId,
    });
}

// ============================================================================
// UTILITY TOOLS
// ============================================================================

/**
 * List all registered devices
 */
export async function listDevices(): Promise<RTRVRResponse<MCPResult>> {
    return executeMCPTool({
        tool: 'list_devices',
        params: {},
    });
}

/**
 * Get current credits balance
 */
export async function getCredits(): Promise<RTRVRResponse<MCPResult>> {
    return executeMCPTool({
        tool: 'get_current_credits',
        params: {},
    });
}
