
import { logger } from '@/lib/logger';

export interface SidecarResult {
    status: 'success' | 'error';
    message?: string;
    [key: string]: unknown;
}

export interface McpToolInfo {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
}

export class PythonSidecar {
    private baseUrl: string;

    constructor() {
        // Default to a local dev URL if not provided, but in Cloud Run we use the real one.
        this.baseUrl = process.env.PYTHON_SIDECAR_URL || 'http://localhost:8080';
    }

    /**
     * Execute a general action on the sidecar
     */
    async execute(action: string, data: Record<string, unknown> = {}): Promise<SidecarResult> {
        try {
            // Legacy/Compatibility check: if action is 'mcp_call', route to the /mcp endpoint
            if (action === 'mcp_call') {
                const result = await this.callMcp(
                    data.tool_name as string,
                    data.arguments as Record<string, unknown>
                );
                return { status: 'success', result };
            }

            // Standard Sidecar Task Execution (e.g. for Big Worm)
            const response = await fetch(`${this.baseUrl}/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, data })
            });

            if (!response.ok) {
                return {
                    status: 'error',
                    message: `Sidecar HTTP Error: ${response.status} ${response.statusText}`
                };
            }

            return await response.json();
        } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            return {
                status: 'error',
                message: `Sidecar Connection Failed: ${message}. Is PYTHON_SIDECAR_URL set?`
            };
        }
    }

    /**
     * List available MCP tools from the sidecar
     */
    async listMcpTools(): Promise<McpToolInfo[]> {
        try {
            const response = await fetch(`${this.baseUrl}/mcp/list`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const tools = await response.json();
            return tools as McpToolInfo[];
        } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            logger.warn('[Sidecar] Failed to list MCP tools', { error: message });
            throw new Error(`Failed to list MCP tools: ${message}`);
        }
    }

    /**
     * Call an MCP tool via the sidecar
     */
    async callMcp(toolName: string, args: Record<string, unknown>): Promise<unknown> {
        try {
            const response = await fetch(`${this.baseUrl}/mcp/call`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tool_name: toolName, arguments: args })
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Unknown MCP error');
            }

            return result.result;
        } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            throw new Error(`Remote MCP Call Failed: ${message}`);
        }
    }

    /**
     * Check sidecar health
     */
    async healthCheck(): Promise<{ healthy: boolean; details?: Record<string, unknown> }> {
        try {
            const response = await fetch(`${this.baseUrl}/health`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });

            if (!response.ok) {
                return { healthy: false };
            }

            const details = await response.json();
            return { healthy: true, details };
        } catch {
            return { healthy: false };
        }
    }
}

export const sidecar = new PythonSidecar();
