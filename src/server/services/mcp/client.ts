
import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { z } from 'zod';
import { logger } from '@/lib/logger';

/**
 * Model Context Protocol (MCP) Client
 * 
 * Implements a bridge to connect BakedBot Agents to external MCP Servers.
 * Supports stdio transport.
 */

export interface McpServerConfig {
    id: string;
    command: string;
    args: string[];
    env?: Record<string, string>;
}

export interface McpToolDefinition {
    name: string;
    description: string;
    inputSchema: any;
}

export class McpClient extends EventEmitter {
    private process: ChildProcess | null = null;
    private serverId: string;
    private messageId = 0;
    private pendingRequests = new Map<number, { resolve: (val: any) => void, reject: (err: any) => void }>();

    constructor(private config: McpServerConfig) {
        super();
        this.serverId = config.id;
    }

    async connect() {
        logger.info(`[MCP:${this.serverId}] Connecting to ${this.config.command}...`);

        this.process = spawn(this.config.command, this.config.args, {
            env: { ...process.env, ...this.config.env },
            stdio: ['pipe', 'pipe', 'pipe'] // stdin, stdout, stderr
        });

        this.process.stdout?.on('data', (data) => this.handleData(data));
        this.process.stderr?.on('data', (data) => logger.warn(`[MCP:${this.serverId}:STDERR] ${data}`));

        this.process.on('close', (code) => {
            logger.warn(`[MCP:${this.serverId}] Process exited with code ${code}`);
            this.process = null;
        });

        // Initial handshake could go here if required by specific MCP version
        logger.info(`[MCP:${this.serverId}] Connected.`);
    }

    private handleData(data: Buffer) {
        const lines = data.toString().split('\n');
        for (const line of lines) {
            if (!line.trim()) continue;
            try {
                const message = JSON.parse(line);
                if (message.id !== undefined && this.pendingRequests.has(message.id)) {
                    const { resolve, reject } = this.pendingRequests.get(message.id)!;
                    this.pendingRequests.delete(message.id);

                    if (message.error) reject(message.error);
                    else resolve(message.result);
                }
                // Handle notifications/events here if needed
            } catch (e) {
                // Ignore non-JSON output (maybe logs)
                logger.debug(`[MCP:${this.serverId}:RAW] ${line}`);
            }
        }
    }

    private async request(method: string, params?: any): Promise<any> {
        if (!this.process) throw new Error('MCP Client not connected');

        const id = this.messageId++;
        const payload = JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n';

        return new Promise((resolve, reject) => {
            this.pendingRequests.set(id, { resolve, reject });
            this.process!.stdin?.write(payload);
        });
    }

    async listTools(): Promise<McpToolDefinition[]> {
        const response = await this.request('tools/list');
        return response.tools || [];
    }

    async callTool(name: string, args: any): Promise<any> {
        const response = await this.request('tools/call', { name, arguments: args });
        return response.content;
    }

    async disconnect() {
        if (this.process) {
            this.process.kill();
            this.process = null;
        }
    }
}

// Global Registry (Simulated for this Pilot)
const registry = new Map<string, McpClient | RemoteMcpClient>();

export class RemoteMcpClient {
    private serverId: string;
    private connected: boolean = false;

    constructor(config: { id: string }) {
        this.serverId = config.id;
    }

    async connect(): Promise<void> {
        // HTTP is stateless, but we do a health check to verify connectivity
        const { sidecar } = await import('@/server/services/python-sidecar');
        const result = await sidecar.execute('test');
        if (result.status === 'error') {
            throw new Error(`Remote Sidecar Unreachable: ${result.message}`);
        }
        this.connected = true;
        logger.info(`[MCP:${this.serverId}] Connected to remote sidecar`);
    }

    async listTools(): Promise<McpToolDefinition[]> {
        const { sidecar } = await import('@/server/services/python-sidecar');
        try {
            const tools = await sidecar.listMcpTools();
            logger.info(`[MCP:${this.serverId}] Listed ${tools.length} tools`);
            return tools;
        } catch (error) {
            logger.warn(`[MCP:${this.serverId}] Failed to list tools, using fallback`, {
                error: error instanceof Error ? error.message : String(error)
            });
            // Fallback to known NotebookLLM tools
            return [
                { name: 'healthcheck', description: 'Check server health status', inputSchema: {} },
                { name: 'chat_with_notebook', description: 'Send a message to NotebookLM and get a grounded response', inputSchema: {} },
                { name: 'send_chat_message', description: 'Send a chat message without waiting for response', inputSchema: {} },
                { name: 'get_chat_response', description: 'Get the response from NotebookLM', inputSchema: {} },
                { name: 'navigate_to_notebook', description: 'Navigate to a specific notebook', inputSchema: {} },
                { name: 'get_default_notebook', description: 'Get the currently active notebook', inputSchema: {} },
                { name: 'set_default_notebook', description: 'Set the default notebook', inputSchema: {} }
            ];
        }
    }

    async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
        const { sidecar } = await import('@/server/services/python-sidecar');
        logger.info(`[MCP:${this.serverId}] Calling tool: ${name}`);
        return await sidecar.callMcp(name, args);
    }

    async disconnect(): Promise<void> {
        // No-op for HTTP - stateless
        this.connected = false;
        logger.info(`[MCP:${this.serverId}] Disconnected`);
    }

    isConnected(): boolean {
        return this.connected;
    }
}

export function getMcpClient(serverId: string): McpClient | RemoteMcpClient | undefined {
    return registry.get(serverId);
}

export function registerMcpServer(config: McpServerConfig) {
    const client = new McpClient(config);
    registry.set(config.id, client);
    return client;
}

// Initialize Default Servers
try {
    // NotebookLLM is now Remote (Cloud Run Sidecar)
    registry.set('notebooklm', new RemoteMcpClient({ id: 'notebooklm' }));
} catch (e) {
    logger.error('[MCP] Failed to register default servers', { error: e instanceof Error ? e.message : String(e) });
}
