import { z } from 'zod';

const LETTA_BASE_URL = process.env.LETTA_BASE_URL || 'https://api.letta.com/v1';
const LETTA_API_KEY = process.env.LETTA_API_KEY;

if (!LETTA_API_KEY) {
    console.warn('LETTA_API_KEY is not set. Letta integration will fail if used.');
}

// Types for Letta interaction
export interface LettaAgent {
    id: string;
    name: string;
    created_at: string;
    memory: any;
    block_ids?: string[];
}

export interface LettaBlock {
    id: string;
    label: string;
    value: string;
    limit: number;
    read_only: boolean;
    created_at: string;
}

export interface LettaMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    created_at: string;
}

export class LettaClient {
    private apiKey: string;
    private baseUrl: string;

    constructor(apiKey?: string, baseUrl?: string) {
        this.apiKey = apiKey || LETTA_API_KEY || '';
        this.baseUrl = baseUrl || LETTA_BASE_URL;
    }

    private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
        if (!this.apiKey) {
            throw new Error('Letta API Key is required');
        }

        const url = `${this.baseUrl}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            ...options.headers,
        };

        const response = await fetch(url, { ...options, headers });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Letta API Error (${response.status}): ${errorText}`);
        }

        return response.json();
    }

    // ============================================================================
    // AGENTS API
    // ============================================================================

    async listAgents(): Promise<LettaAgent[]> {
        return this.request('/agents');
    }

    async createAgent(name: string, systemInstructions: string, blockIds?: string[]): Promise<LettaAgent> {
        return this.request('/agents', {
            method: 'POST',
            body: JSON.stringify({
                name,
                system: systemInstructions,
                block_ids: blockIds || [],
                llm_config: {
                    model: 'gpt-4o-mini',
                    model_endpoint_type: 'openai',
                    context_window: 128000
                },
                embedding_config: {
                    model: 'text-embedding-ada-002',
                    model_endpoint_type: 'openai'
                }
            })
        });
    }

    async getAgent(agentId: string): Promise<LettaAgent> {
        return this.request(`/agents/${agentId}`);
    }

    async deleteAgent(agentId: string): Promise<void> {
        await this.request(`/agents/${agentId}`, { method: 'DELETE' });
    }

    // ============================================================================
    // MESSAGES API
    // ============================================================================

    async sendMessage(agentId: string, message: string, role: 'user' | 'system' = 'user'): Promise<any> {
        return this.request(`/agents/${agentId}/messages`, {
            method: 'POST',
            body: JSON.stringify({
                messages: [{ role, content: message }]
            })
        });
    }

    async getMessages(agentId: string, limit: number = 100): Promise<LettaMessage[]> {
        return this.request(`/agents/${agentId}/messages?limit=${limit}`);
    }

    // ============================================================================
    // BLOCKS API (Shared Memory)
    // ============================================================================

    async createBlock(label: string, value: string, options?: { 
        limit?: number; 
        readOnly?: boolean 
    }): Promise<LettaBlock> {
        return this.request('/blocks', {
            method: 'POST',
            body: JSON.stringify({
                label,
                value,
                limit: options?.limit || 4000,
                read_only: options?.readOnly || false
            })
        });
    }

    async getBlock(blockId: string): Promise<LettaBlock> {
        return this.request(`/blocks/${blockId}`);
    }

    async updateBlock(blockId: string, value: string): Promise<LettaBlock> {
        return this.request(`/blocks/${blockId}`, {
            method: 'PATCH',
            body: JSON.stringify({ value })
        });
    }

    async deleteBlock(blockId: string): Promise<void> {
        await this.request(`/blocks/${blockId}`, { method: 'DELETE' });
    }

    async listBlocks(): Promise<LettaBlock[]> {
        return this.request('/blocks');
    }

    async attachBlockToAgent(agentId: string, blockId: string): Promise<void> {
        await this.request(`/agents/${agentId}/blocks/${blockId}/attach`, {
            method: 'POST'
        });
    }

    async detachBlockFromAgent(agentId: string, blockId: string): Promise<void> {
        await this.request(`/agents/${agentId}/blocks/${blockId}/detach`, {
            method: 'POST'
        });
    }

    async getAgentBlocks(agentId: string): Promise<LettaBlock[]> {
        return this.request(`/agents/${agentId}/blocks`);
    }

    // ============================================================================
    // ASYNC AGENT-TO-AGENT MESSAGING
    // ============================================================================

    /**
     * Send an async message from one agent to another.
     * The sending agent receives a "delivery receipt" but doesn't wait for response.
     */
    async sendAsyncMessage(
        fromAgentId: string, 
        toAgentId: string, 
        message: string
    ): Promise<{ delivered: boolean; messageId: string }> {
        // First, send the message to the target agent as if from a user
        // with metadata indicating it's from another agent
        const result = await this.sendMessage(
            toAgentId, 
            `[INTER-AGENT MESSAGE from ${fromAgentId}]: ${message}`,
            'user'
        );
        
        return {
            delivered: true,
            messageId: result?.id || `msg-${Date.now()}`
        };
    }

    // ============================================================================
    // ARCHIVAL MEMORY (PASSAGES) API
    // ============================================================================

    async insertPassage(agentId: string, content: string): Promise<any> {
        return this.request(`/agents/${agentId}/archival-memory`, {
            method: 'POST',
            body: JSON.stringify({ content })
        });
    }

    async searchPassages(agentId: string, query: string, limit: number = 5): Promise<string[]> {
        // Note: API returns objects, we simplify to strings for the agent for now
        const response = await this.request(`/agents/${agentId}/archival-memory?query=${encodeURIComponent(query)}&limit=${limit}`);
        // Assuming response is an array of passage objects
        if (Array.isArray(response)) {
            return response.map((p: any) => p.content);
        }
        return [];
    }

    async listPassages(agentId: string, limit: number = 50): Promise<any[]> {
        return this.request(`/agents/${agentId}/archival-memory?limit=${limit}`);
    }

    // ============================================================================
    // CORE MEMORY (Legacy API)
    // ============================================================================

    async getCoreMemory(agentId: string): Promise<any> {
        return this.request(`/agents/${agentId}/core-memory`);
    }

    async updateCoreMemory(agentId: string, section: string, content: string): Promise<any> {
        return this.request(`/agents/${agentId}/core-memory/${section}`, {
            method: 'PATCH',
            body: JSON.stringify({ content })
        });
    }
}

export const lettaClient = new LettaClient();

