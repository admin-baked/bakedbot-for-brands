import { z } from 'zod';

const LETTA_BASE_URL = process.env.LETTA_BASE_URL || 'https://api.letta.com/v1';
const LETTA_API_KEY = process.env.LETTA_API_KEY;

if (!LETTA_API_KEY) {
    console.warn('LETTA_API_KEY is not set. Letta integration will fail if used.');
}

// Minimal types for Letta interaction
interface LettaAgent {
    id: string;
    name: string;
    created_at: string;
    memory: any;
    // Add other fields as needed
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

    async listAgents(): Promise<LettaAgent[]> {
        return this.request('/agents');
    }

    async createAgent(name: string, systemInstructions: string): Promise<LettaAgent> {
        return this.request('/agents', {
            method: 'POST',
            body: JSON.stringify({
                name,
                system: systemInstructions,
                // Default settings for standard Letta agent
                llm_config: {
                    model: 'gpt-4', // Or desired default
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

    async sendMessage(agentId: string, message: string, role: 'user' | 'system' = 'user') {
        return this.request(`/agents/${agentId}/messages`, {
            method: 'POST',
            body: JSON.stringify({
                role,
                message
            })
        });
    }

    async getCoreMemory(agentId: string): Promise<any> {
        return this.request(`/agents/${agentId}/core-memory`);
    }
}

export const lettaClient = new LettaClient();
