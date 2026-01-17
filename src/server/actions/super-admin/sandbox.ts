'use server';

import { z } from 'zod';
import { AGENT_CAPABILITIES, AgentId } from '@/server/agents/agent-definitions';
import { TOOL_REGISTRY } from '@/server/agents/tools/registry';
import { routeToolCall } from '@/server/agents/tools/router';
import { requireUser, isSuperUser } from '@/server/auth/auth';
import { ToolRequest, ToolResponse } from '@/types/agent-toolkit';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/lib/logger';

/**
 * Returns available agents for the sandbox.
 */
export async function listAgentsAction() {
    try {
        await requireUser();
        if (!await isSuperUser()) throw new Error('Unauthorized');
        return AGENT_CAPABILITIES;
    } catch (error: unknown) {
        logger.error('[sandbox] listAgentsAction failed:', error instanceof Error ? { message: error.message } : { error });
        throw new Error('Failed to load agents. Please refresh.');
    }
}

/**
 * Returns available tools for the sandbox.
 */
export async function listToolsAction() {
    try {
        await requireUser();
        if (!await isSuperUser()) throw new Error('Unauthorized');
        
        // Convert registry object to array
        return Object.values(TOOL_REGISTRY).map(tool => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
            category: tool.category
        }));
    } catch (error: unknown) {
        logger.error('[sandbox] listToolsAction failed:', error instanceof Error ? { message: error.message } : { error });
        throw new Error('Failed to load tools. Please refresh.');
    }
}

const ExecuteToolSchema = z.object({
    toolName: z.string(),
    inputs: z.any(),
    agentId: z.string().optional(),
    tenantId: z.string().optional() // Sandbox allows picking a tenant context
});

/**
 * Executes a tool in the sandbox environment.
 */
export async function executeToolAction(params: z.infer<typeof ExecuteToolSchema>) {
    const user = await requireUser();
    if (!await isSuperUser()) throw new Error('Unauthorized');

    // Super user acts as super_user (has admin:all permissions)
    const mockActor = {
        userId: user.uid,
        role: 'super_user' as const
    };

    const request: ToolRequest = {
        toolName: params.toolName,
        inputs: params.inputs,
        actor: mockActor,
        tenantId: params.tenantId || 'sandbox-demo-brand', // Default to sandbox context
        idempotencyKey: uuidv4() // Always unique for sandbox
    };

    try {
        const result = await routeToolCall(request);
        return { success: true, result };
    } catch (error: any) {
        return { 
            success: false, 
            error: error.message,
            result: { status: 'failed', error: error.message } as ToolResponse
        };
    }
}
