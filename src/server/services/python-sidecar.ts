
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

export interface SidecarResult {
    status: 'success' | 'error';
    message?: string;
    [key: string]: any;
}

export class PythonSidecar {
    private baseUrl: string;

    constructor() {
        // Default to a local dev URL if not provided, but in Cloud Run we use the real one.
        this.baseUrl = process.env.PYTHON_SIDECAR_URL || 'http://localhost:8080';
    }

    async execute(action: string, data: any = {}): Promise<SidecarResult> {
        try {
            // Legacy/Compatibility check: if action is 'mcp_call', route to the /mcp endpoint
            if (action === 'mcp_call') {
                return await this.callMcp(data.tool_name, data.arguments);
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
        } catch (e: any) {
            return {
                status: 'error',
                message: `Sidecar Connection Failed: ${e.message}. Is PYTHON_SIDECAR_URL set?`
            };
        }
    }

    async callMcp(toolName: string, args: any): Promise<any> {
        try {
            const response = await fetch(`${this.baseUrl}/mcp/call`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tool_name: toolName, arguments: args })
            });

            const result = await response.json();
            if (!result.success) throw new Error(result.error || 'Unknown MCP error');
            return result.result;
        } catch (e: any) {
            throw new Error(`Remote MCP Call Failed: ${e.message}`);
        }
    }
}

export const sidecar = new PythonSidecar();
