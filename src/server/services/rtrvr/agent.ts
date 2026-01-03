/**
 * RTRVR Agent API - Autonomous Web Automation
 * 
 * Wrapper for the /agent endpoint.
 * Enables full end-to-end browser automation for tasks like:
 * - Creating ad campaigns (Reddit, Twitter, Facebook)
 * - Filling forms and signing up
 * - Scraping and processing web data
 * 
 * @see https://www.rtrvr.ai/docs/agent
 */

import { getRTRVRClient, RTRVRResponse } from './client';
import { logger } from '@/lib/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface AgentRequest {
    /** Main user instruction for what the agent should do */
    input: string;
    /** URLs to open in the browser before executing */
    urls?: string[];
    /** Expected result shape (OpenAPI-style schema) */
    schema?: Record<string, unknown>;
    /** Tabular data inputs (CSV, JSON, etc.) */
    dataInputs?: AgentDataInput[];
    /** Response verbosity: 'final' | 'steps' | 'debug' */
    verbosity?: 'final' | 'steps' | 'debug';
    /** Tool configuration overrides */
    tools?: AgentToolsConfig;
    /** Continuation from previous run */
    trajectoryId?: string;
    phase?: number;
}

export interface AgentDataInput {
    description: string;
    format: 'csv' | 'tsv' | 'json' | 'text' | 'xlsx' | 'parquet';
    inline?: string;
    url?: string;
}

export interface AgentToolsConfig {
    enabled?: string[];
    disabled?: string[];
}

export interface AgentResult {
    status: 'success' | 'continuation' | 'blocked' | 'error';
    result?: unknown;
    output?: AgentOutput[];
    steps?: AgentStep[];
    trajectoryId?: string;
    phase?: number;
}

export interface AgentOutput {
    type: 'text' | 'json' | 'table' | 'file';
    content: unknown;
}

export interface AgentStep {
    tool: string;
    input: Record<string, unknown>;
    output?: unknown;
    status: 'success' | 'error';
    durationMs?: number;
}

// ============================================================================
// AGENT FUNCTIONS
// ============================================================================

/**
 * Execute an autonomous browser automation task
 * 
 * @example
 * ```typescript
 * const result = await executeAgentTask({
 *     input: 'Go to example.com and extract the main heading',
 *     urls: ['https://example.com'],
 *     verbosity: 'steps'
 * });
 * ```
 */
export async function executeAgentTask(
    request: AgentRequest
): Promise<RTRVRResponse<AgentResult>> {
    const client = getRTRVRClient();

    if (!client.isAvailable()) {
        return {
            success: false,
            error: 'RTRVR API not configured',
        };
    }

    logger.info('[RTRVR Agent] Executing task', { 
        inputLength: request.input.length,
        urlCount: request.urls?.length || 0 
    });

    const body: Record<string, unknown> = {
        input: request.input,
        response: {
            verbosity: request.verbosity || 'final',
        },
    };

    if (request.urls?.length) {
        body.urls = request.urls;
    }

    if (request.schema) {
        body.schema = request.schema;
    }

    if (request.dataInputs?.length) {
        body.dataInputs = request.dataInputs;
    }

    if (request.tools) {
        body.tools = request.tools;
    }

    if (request.trajectoryId) {
        body.trajectoryId = request.trajectoryId;
        body.phase = request.phase || 1;
    }

    const response = await client.agent<AgentResult>(body);

    if (response.success && response.data) {
        logger.info('[RTRVR Agent] Task completed', { 
            status: response.data.status,
            hasResult: !!response.data.result 
        });
    }

    return response;
}

/**
 * Continue a multi-phase automation task
 */
export async function continueAgentTask(
    trajectoryId: string,
    additionalInput?: string,
    phase?: number
): Promise<RTRVRResponse<AgentResult>> {
    return executeAgentTask({
        input: additionalInput || 'Continue from where you left off.',
        trajectoryId,
        phase: phase || 2,
    });
}

// ============================================================================
// PRESET TASKS - Common automation patterns
// ============================================================================

/**
 * Summarize a webpage
 */
export async function summarizeUrl(url: string): Promise<RTRVRResponse<AgentResult>> {
    return executeAgentTask({
        input: 'Summarize the main content of this page in 5 bullet points.',
        urls: [url],
        schema: {
            type: 'object',
            properties: {
                bullets: { type: 'array', items: { type: 'string' } },
                title: { type: 'string' },
            },
            required: ['bullets'],
        },
    });
}

/**
 * Extract structured data from a webpage
 */
export async function extractFromUrl(
    url: string,
    instruction: string,
    schema: Record<string, unknown>
): Promise<RTRVRResponse<AgentResult>> {
    return executeAgentTask({
        input: instruction,
        urls: [url],
        schema,
    });
}

/**
 * Fill a form on a webpage
 */
export async function fillForm(
    url: string,
    formData: Record<string, string>,
    submitButtonText?: string
): Promise<RTRVRResponse<AgentResult>> {
    const fieldInstructions = Object.entries(formData)
        .map(([field, value]) => `- "${field}": "${value}"`)
        .join('\n');

    return executeAgentTask({
        input: `
            Go to the form on this page and fill it with the following values:
            ${fieldInstructions}
            ${submitButtonText ? `Then click the "${submitButtonText}" button.` : ''}
            Return success status and any confirmation message.
        `,
        urls: [url],
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                confirmation: { type: 'string' },
            },
        },
    });
}

/**
 * Create a Reddit ad campaign (requires MCP for login)
 */
export async function createRedditAdCampaign(config: {
    name: string;
    objective: 'traffic' | 'conversions' | 'awareness';
    targetSubreddits: string[];
    budget: number;
    creative?: {
        headline: string;
        body: string;
        imageUrl?: string;
    };
}): Promise<RTRVRResponse<AgentResult>> {
    return executeAgentTask({
        input: `
            Go to Reddit Ads Manager at ads.reddit.com.
            Create a new campaign with:
            - Name: "${config.name}"
            - Objective: ${config.objective}
            - Target subreddits: ${config.targetSubreddits.join(', ')}
            - Daily budget: $${config.budget}
            ${config.creative ? `
            - Headline: "${config.creative.headline}"
            - Body text: "${config.creative.body}"
            ${config.creative.imageUrl ? `- Image URL: ${config.creative.imageUrl}` : ''}
            ` : ''}
            Extract the campaign ID when done.
        `,
        urls: ['https://ads.reddit.com'],
        schema: {
            type: 'object',
            properties: {
                campaignId: { type: 'string' },
                status: { type: 'string' },
                error: { type: 'string' },
            },
        },
    });
}
