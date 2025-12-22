
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

    // 3. Idempotency Check
    if (request.idempotencyKey) {
        const { checkIdempotency } = await import('../approvals/service');
        const cachedResult = await checkIdempotency(request.idempotencyKey);
        if (cachedResult) {
            await logAudit(request, startTime, { ...cachedResult.result, status: 'success' }); // Log replay
            return cachedResult.result;
        }
    }

    // 4. Side-Effect Gate
    if (definition.category === 'side-effect') {
        // In Phase 3, we auto-create an approval request and block
        // Unless specific "approved" override logic is generic (not yet implemented)
        const { createApprovalRequest } = await import('../approvals/service');
        if (!request.tenantId) throw new Error('Side-effects require tenant context.');

        const approval = await createApprovalRequest(
            request.tenantId,
            toolName,
            inputs,
            actor.userId,
            actor.role
        );

        const response: ToolResponse = {
            status: 'blocked',
            error: `Approval required. Request ID: ${approval.id}`,
            data: { approvalId: approval.id }
        };

        await logAudit(request, startTime, response);
        return response;
    }

    // 5. Schema Validation (Placeholder)
    // TODO: Implement Zod schema validation against definition.inputSchema

    // 6. Execution Dispatch
    try {
        const result = await dispatchExecution(definition, inputs, request);

        // 7. Audit Logging (Success)
        await logAudit(request, startTime, result);

        // Save Idempotency
        if (request.idempotencyKey) {
            const { saveIdempotency } = await import('../approvals/service');
            await saveIdempotency(request.idempotencyKey, result);
        }

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
        if (!request.tenantId) throw new Error('Tool requires tenant context.');
        const { getTenantProfile } = await import('./universal/context-tools');
        return {
            status: 'success',
            data: await getTenantProfile(request.tenantId)
        };
    }

    if (def.name === 'audit.log') {
        const { auditLog } = await import('./universal/context-tools');
        return {
            status: 'success',
            data: await auditLog(request.tenantId || 'system', inputs.message, inputs.level || 'info', inputs.metadata)
        };
    }

    // Phase 2: Catalog Tools
    if (def.name === 'catalog.searchProducts') {
        if (!request.tenantId) throw new Error('Tool requires tenant context.');
        const { searchProducts } = await import('./domain/catalog');
        return {
            status: 'success',
            data: await searchProducts(request.tenantId, inputs)
        };
    }

    if (def.name === 'catalog.getProduct') {
        if (!request.tenantId) throw new Error('Tool requires tenant context.');
        const { getProduct } = await import('./domain/catalog');
        return {
            status: 'success',
            data: await getProduct(request.tenantId, inputs.productId)
        };
    }

    // Phase 2: Marketing Tools
    if (def.name === 'marketing.createCampaignDraft') {
        if (!request.tenantId) throw new Error('Tool requires tenant context.');
        const { createCampaignDraft } = await import('./domain/marketing');
        return {
            status: 'success',
            data: await createCampaignDraft(request.tenantId, inputs)
        };
    }

    if (def.name === 'marketing.segmentBuilder') {
        if (!request.tenantId) throw new Error('Tool requires tenant context.');
        const { segmentBuilder } = await import('./domain/marketing');
        return {
            status: 'success',
            data: await segmentBuilder(request.tenantId, inputs)
        };
    }

    // Phase 3: Side Effect Stub
    if (def.name === 'marketing.send') {
        return {
            status: 'blocked',
            error: 'Approval required for marketing.send'
        };
    }

    // Phase 2: BI & Intel
    if (def.name === 'analytics.getKPIs') {
        if (!request.tenantId) throw new Error('Tool requires tenant context.');
        const { getKPIs } = await import('./domain/analytics');
        return {
            status: 'success',
            data: await getKPIs(request.tenantId, inputs)
        };
    }

    if (def.name === 'intel.scanCompetitors') {
        if (!request.tenantId) throw new Error('Tool requires tenant context.');
        const { scanCompetitors } = await import('./domain/intel');
        return {
            status: 'success',
            data: await scanCompetitors(request.tenantId, inputs)
        };
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

    // Intuition OS: Trace Logging
    if (req.tenantId && req.actor.userId) {
        try {
            const { persistence } = await import('../persistence');

            // Map Audit -> AgentLogEntry
            // We use the actorId as agent_name if it's an agent, or 'user:${userId}' if human
            // For now, let's assume agent calls have agent names or we just log whatever actorId is.
            const agentName = req.actor.userId;

            await persistence.appendLog(req.tenantId, agentName, {
                id: entry.id,
                timestamp: new Date(entry.timestamp),
                agent_name: agentName,
                action: req.toolName,
                result: JSON.stringify(res.data || res.error),
                metadata: {
                    inputs: req.inputs,
                    status: res.status,
                    latency: Date.now() - start,
                    role: req.actor.role
                }
            });
        } catch (e) {
            console.error('[IntuitionOS] Failed to log trace:', e);
            // Don't fail the request completely if logging fails
        }
    }
}
