/**
 * Remote MCP Client
 *
 * Client for connecting to the Python sidecar via MCP (Model Context Protocol).
 * Enables offloading heavy research tasks (Big Worm, NotebookLM) to prevent
 * blocking the Next.js server.
 */

import { logger } from '@/lib/logger';

export interface RemoteMcpConfig {
    endpoint: string;
    apiKey?: string;
    timeout?: number; // milliseconds
}

export interface RemoteMcpRequest {
    method: string;
    params: Record<string, unknown>;
    timeout?: number;
}

export interface RemoteMcpResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    jobId?: string; // For long-running tasks
}

export class RemoteMcpClient {
    private config: RemoteMcpConfig;
    private baseUrl: string;

    constructor(config: RemoteMcpConfig) {
        this.config = {
            timeout: 30000, // 30 seconds default
            ...config,
        };
        this.baseUrl = config.endpoint.replace(/\/$/, '');
    }

    /**
     * Execute a synchronous MCP method
     */
    async execute<T = unknown>(request: RemoteMcpRequest): Promise<RemoteMcpResponse<T>> {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => {
                controller.abort();
            }, request.timeout || this.config.timeout);

            const response = await fetch(`${this.baseUrl}/mcp/execute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.config.apiKey && {
                        'Authorization': `Bearer ${this.config.apiKey}`,
                    }),
                },
                body: JSON.stringify({
                    method: request.method,
                    params: request.params,
                }),
                signal: controller.signal,
            });

            clearTimeout(timeout);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return {
                success: true,
                data: data as T,
            };
        } catch (error) {
            logger.error('[RemoteMcpClient] Execution failed', error instanceof Error ? error : new Error(String(error)));
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Start a long-running background job
     */
    async startJob(request: RemoteMcpRequest): Promise<RemoteMcpResponse<{ jobId: string }>> {
        try {
            const response = await fetch(`${this.baseUrl}/mcp/jobs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.config.apiKey && {
                        'Authorization': `Bearer ${this.config.apiKey}`,
                    }),
                },
                body: JSON.stringify({
                    method: request.method,
                    params: request.params,
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return {
                success: true,
                data: { jobId: data.jobId },
            };
        } catch (error) {
            logger.error('[RemoteMcpClient] Job start failed', error instanceof Error ? error : new Error(String(error)));
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Check status of a background job
     */
    async getJobStatus(jobId: string): Promise<RemoteMcpResponse<{
        status: 'pending' | 'running' | 'completed' | 'failed';
        progress?: number;
        result?: unknown;
        error?: string;
    }>> {
        try {
            const response = await fetch(`${this.baseUrl}/mcp/jobs/${jobId}`, {
                headers: {
                    ...(this.config.apiKey && {
                        'Authorization': `Bearer ${this.config.apiKey}`,
                    }),
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return {
                success: true,
                data,
            };
        } catch (error) {
            logger.error('[RemoteMcpClient] Job status check failed', error instanceof Error ? error : new Error(String(error)));
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Health check for sidecar
     */
    async healthCheck(): Promise<{
        healthy: boolean;
        version?: string;
        uptime?: number;
        error?: string;
    }> {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(`${this.baseUrl}/health`, {
                signal: controller.signal,
            });

            clearTimeout(timeout);

            if (!response.ok) {
                return {
                    healthy: false,
                    error: `HTTP ${response.status}`,
                };
            }

            const data = await response.json();
            return {
                healthy: true,
                version: data.version,
                uptime: data.uptime,
            };
        } catch (error) {
            return {
                healthy: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
}

/**
 * Get or create singleton MCP client instance
 */
let mcpClientInstance: RemoteMcpClient | null = null;

export function getRemoteMcpClient(): RemoteMcpClient | null {
    if (mcpClientInstance) {
        return mcpClientInstance;
    }

    // Initialize from environment
    const endpoint = process.env.PYTHON_SIDECAR_ENDPOINT;
    const apiKey = process.env.PYTHON_SIDECAR_API_KEY;

    if (!endpoint) {
        logger.warn('[RemoteMcpClient] PYTHON_SIDECAR_ENDPOINT not configured');
        return null;
    }

    mcpClientInstance = new RemoteMcpClient({
        endpoint,
        apiKey,
    });

    logger.info('[RemoteMcpClient] Initialized', { endpoint });
    return mcpClientInstance;
}

/**
 * Execute a research task on the sidecar (convenience wrapper)
 */
export async function executeRemoteResearch(params: {
    query: string;
    context?: string;
    maxDepth?: number;
}): Promise<RemoteMcpResponse> {
    const client = getRemoteMcpClient();
    if (!client) {
        return {
            success: false,
            error: 'Remote sidecar not configured',
        };
    }

    return client.startJob({
        method: 'research.deep_analysis',
        params,
    });
}

/**
 * Execute NotebookLM analysis on the sidecar
 */
export async function executeNotebookAnalysis(params: {
    documents: string[];
    query: string;
}): Promise<RemoteMcpResponse> {
    const client = getRemoteMcpClient();
    if (!client) {
        return {
            success: false,
            error: 'Remote sidecar not configured',
        };
    }

    return client.startJob({
        method: 'notebooklm.analyze',
        params,
    });
}
