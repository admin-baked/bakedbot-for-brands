
import {
    ToolRequest,
    ToolResponse,
    AuditLogEntry,
    ToolDefinition
} from '@/types/agent-toolkit';
import { getToolDefinition } from './registry';
import { v4 as uuidv4 } from 'uuid';
import { hasRolePermission } from '@/server/auth/rbac';

// In a real implementation, we would import the actual implementation functions here
// or use a dynamic import map. For Phase 1, we will mock the dispatch or leave it abstract.

/**
 * The Central Nervous System for Agent Tools.
 * - Validates existence
 * - Checks permissions
 * - Enforces idempotency (TODO)
 * - Logs to Audit
 * - Dispatches execution
 */
export async function routeToolCall(request: ToolRequest): Promise<ToolResponse> {
    const startTime = Date.now();
    const { toolName, actor, inputs } = request;

    // 1. Definition Lookup
    const definition = getToolDefinition(toolName);
    if (!definition) {
        return createErrorResponse(request, startTime, `Tool '${toolName}' not found.`);
    }

    // 2. Permission Check
    // We check if the actor's role grants the SPECIFIC permission required by the tool.
    if (definition.requiredPermission) {
        if (!hasRolePermission(actor.role, definition.requiredPermission)) {
            return createErrorResponse(request, startTime, `Permission denied. User role '${actor.role}' lacks permission '${definition.requiredPermission}' to execute '${toolName}'.`);
        }
    }

    // 3. Schema Validation (Placeholder)
    // TODO: Implement Zod schema validation against definition.inputSchema

    // 4. Execution Dispatch
    try {
        const result = await dispatchExecution(definition, inputs, request);

        // 5. Audit Logging (Success)
        await logAudit(request, startTime, result);

        return result;

    } catch (error: any) {
        // Audit Logging (Failure)
        const diff = Date.now() - startTime;
        const errorResponse: ToolResponse = {
            status: 'failed',
            error: error.message || 'Unknown execution error'
        };

        await logAudit(request, startTime, errorResponse);
        return errorResponse;
    }
}

/**
 * Dispatches the call to the actual code.
 * In Phase 1, this is largely a router to mock functions or the "Universal" implementations.
 */
async function dispatchExecution(def: ToolDefinition, inputs: any, request: ToolRequest): Promise<ToolResponse> {

    // TODO: Map string name to actual function import
    // const impl = await import(`../implementations/${def.name}`);

    // Mock Response for Phase 1 "Hello World"
    if (def.name === 'context.getTenantProfile') {
        return {
            status: 'success',
            data: {
                tenantId: request.tenantId || 'demo-tenant',
                name: 'BakedBot Demo Tenant',
                plan: 'growth',
                locations: 5
            }
        };
    }

    if (def.name === 'audit.log') {
        // This is a meta-tool, it just logs (which happens anyway)
        return { status: 'success', data: { logged: true } };
    }

    return {
        status: 'success',
        data: { message: `Executed tool: ${def.name}`, inputs }
    };
}

/**
 * Helper to construct standard error responses.
 */
function createErrorResponse(req: ToolRequest, start: number, msg: string): ToolResponse {
    return {
        status: 'failed',
        error: msg
    };
}

/**
 * Writes to the immutable audit log.
 * In production, this writes to Firestore `tenants/{id}/audit`.
 */
async function logAudit(req: ToolRequest, start: number, res: ToolResponse) {
    const entry: AuditLogEntry = {
        id: uuidv4(),
        timestamp: Date.now(),
        tenantId: req.tenantId,
        actorId: req.actor.userId,
        actorRole: req.actor.role,
        actionType: 'tool_execution',
        details: {
            toolName: req.toolName,
            inputs: req.inputs,
            outputs: res.data, // Be careful with PII here in real logs
            status: res.status,
            error: res.error,
            latencyMs: Date.now() - start
        },
        idempotencyKey: req.idempotencyKey
    };

    console.log(`[AUDIT] Tool:${req.toolName} Status:${res.status} Actor:${req.actor.userId}`, entry);
    // TODO: await firestore.collection(...).add(entry);
}
