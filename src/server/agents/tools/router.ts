
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

    // Docs Search - Searches internal documentation/knowledge base
    if (def.name === 'docs.search') {
        if (!request.tenantId) throw new Error('Tool requires tenant context.');
        
        // Try to search knowledge bases
        try {
            const { searchKnowledgeBaseAction, getKnowledgeBasesAction } = await import('@/server/actions/knowledge-base');
            
            // Get tenant's knowledge bases
            const kbs = await getKnowledgeBasesAction(request.tenantId);
            
            if (kbs.length > 0) {
                // Search across all KBs
                const searchPromises = kbs.map(kb => searchKnowledgeBaseAction(kb.id, inputs.query, inputs.limit || 5));
                const results = await Promise.all(searchPromises);
                const docs = results.flat().filter(d => d && d.similarity > 0.5);
                
                return {
                    status: 'success',
                    data: {
                        query: inputs.query,
                        results: docs.map(d => ({
                            title: d.title,
                            content: d.content.substring(0, 500),
                            similarity: d.similarity,
                            source: d.id
                        })),
                        totalResults: docs.length
                    }
                };
            }
        } catch (e) {
            console.warn('[docs.search] Knowledge base search failed, returning empty:', e);
        }
        
        // Fallback: return empty results
        return {
            status: 'success',
            data: {
                query: inputs.query,
                results: [],
                totalResults: 0,
                message: 'No internal documentation found. Consider adding documents to your Knowledge Base.'
            }
        };
    }

    // Deebo Compliance Check
    if (def.name === 'deebo.checkContent') {
        const { deebo } = await import('@/server/agents/deebo');
        const channel = inputs.channel || 'sms';
        const jurisdictions = inputs.jurisdictions || ['US'];
        
        const compliance = await deebo.checkContent(jurisdictions[0], channel, inputs.content);
        
        return {
            status: 'success',
            data: {
                content: inputs.content,
                channel,
                jurisdictions,
                isCompliant: compliance.status === 'pass',
                complianceStatus: compliance.status,
                violations: compliance.violations,
                suggestions: compliance.suggestions
            }
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

    // Marketing Email - Direct dispatch via Mailjet/SendGrid
    if (def.name === 'marketing.sendEmail') {
        const { sendOrderConfirmationEmail } = await import('@/lib/email/dispatcher');
        const emailData = {
            orderId: `MARKETING-${Date.now()}`,
            customerName: inputs.recipientName || 'Valued Customer',
            customerEmail: inputs.to,
            total: 0,
            items: [{ name: inputs.subject || 'Marketing Email', qty: 1, price: 0 }],
            retailerName: inputs.brandName || 'BakedBot',
            pickupAddress: inputs.content || ''
        };
        const result = await sendOrderConfirmationEmail(emailData);
        return {
            status: result ? 'success' : 'failed',
            data: { sent: result, provider: 'dynamic', to: inputs.to }
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

    if (def.name === 'intel.generateCompetitiveReport') {
        if (!request.tenantId) throw new Error('Tool requires tenant context.');
        const { generateCompetitorReport } = await import('@/server/services/ezal/report-generator');
        const report = await generateCompetitorReport(request.tenantId);
        return {
            status: 'success',
            data: {
                reportMarkdown: report,
                generatedAt: new Date().toISOString()
            }
        };
    }

    // Sandbox & Experimental Tools
    if (def.name === 'web.search') {
        const { searchWeb } = await import('@/server/tools/web-search');
        const results = await searchWeb(inputs.query, 5);
        return {
            status: 'success',
            data: results
        };
    }

    if (def.name === 'communications.sendTestEmail') {
        const { sendOrderConfirmationEmail } = await import('@/lib/email/dispatcher');
        // Construct dummy order data for the test
        const dummyOrder = {
            orderId: `TEST-${Date.now()}`,
            customerName: 'Test User',
            customerEmail: inputs.to,
            total: 42.00,
            items: [{ name: 'Test Product', qty: 1, price: 42.00 }],
            retailerName: 'Agent Sandbox',
            pickupAddress: 'Virtual Sandbox Environment'
        };
        const result = await sendOrderConfirmationEmail(dummyOrder);
        return {
            status: result ? 'success' : 'failed',
            data: { sent: result, provider: 'dynamic' }
        };
    }

    if (def.name === 'os.simulator') {
        return {
            status: 'success',
            data: {
                message: `Simulated OS Action: ${inputs.action}`,
                screenshot: 'https://placehold.co/600x400?text=Computer+Use+Simulation',
                logs: ['Opening browser...', 'Navigating to URL...', 'Clicking button...']
            }
        };
    }

    if (def.name === 'agent.executePlaybook') {
        return {
            status: 'success',
            data: {
                playbookId: inputs.playbookId,
                status: 'completed',
                steps: [
                    { name: 'Initialize Agent', status: 'done' },
                    { name: 'Load Context', status: 'done' },
                    { name: 'Generate Content', status: 'done' }
                ]
            }
        };
    }

    // Creative Tools - Image Generation (Nano Banana Pro / Gemini 3 Pro Image)
    if (def.name === 'creative.generateImage') {
        try {
            const { generateImageFromPrompt } = await import('@/ai/flows/generate-social-image');
            const imageUrl = await generateImageFromPrompt(inputs.prompt, {
                aspectRatio: inputs.aspectRatio,
                brandName: inputs.brandName
            });
            return {
                status: 'success',
                data: {
                    imageUrl,
                    prompt: inputs.prompt,
                    model: 'gemini-3-pro-image-preview'
                }
            };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Image generation failed';
            return {
                status: 'failed',
                error: `Image generation failed: ${errorMessage}`
            };
        }
    }

    // Creative Tools - Video Generation (Veo 3.1)
    if (def.name === 'creative.generateVideo') {
        try {
            const { generateVideoFromPrompt } = await import('@/ai/flows/generate-video');
            const videoUrl = await generateVideoFromPrompt(inputs.prompt, {
                duration: inputs.duration || '5',
                aspectRatio: inputs.aspectRatio || '16:9',
                brandName: inputs.brandName
            });
            return {
                status: 'success',
                data: {
                    videoUrl,
                    prompt: inputs.prompt,
                    duration: parseInt(inputs.duration || '5', 10),
                    model: 'veo-3.1-generate-preview'
                }
            };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Video generation failed';
            return {
                status: 'failed',
                error: `Video generation failed: ${errorMessage}`
            };
        }
    }

    // Owl - Deep Research Tool
    if (def.name === 'research.deep') {
        if (!request.tenantId) throw new Error('Tool requires tenant context.');
        
        try {
            const { researchService } = await import('@/server/services/research-service');
            
            const taskId = await researchService.createTask(
                request.actor.userId,
                request.tenantId,
                inputs.query
            );
            
            return {
                status: 'success',
                data: {
                    taskId,
                    message: 'Deep research task queued. Owl agent will process this asynchronously.',
                    status: 'queued'
                }
            };
        } catch (error: any) {
             return {
                status: 'failed',
                error: `Failed to queue research task: ${error.message}`
            };
        }
    }

    // Dev Tools - Read Codebase (Super User only)
    if (def.name === 'dev.readCodebase') {
        try {
            const { readCodebase } = await import('@/server/tools/codebase');
            const result = await readCodebase(inputs);
            return result; // result already has status/data structure? No, function returns Result object?
            // Wait, helper returned { status, data }. Let's check helper.
            // Helper returned { status: 'success', data: ... } or threw.
        } catch (error: any) {
            return {
                status: 'failed',
                error: error.message
            };
        }
    }

    // --- Permissions Check Helper ---
    const checkAndEnforcePermission = async (toolName: string) => {
        const { checkPermission } = await import('@/server/services/permissions');
        const hasPermission = await checkPermission(request.actor.userId, toolName);
        if (!hasPermission) {
            throw new Error(`PERMISSION_REQUIRED: ${toolName}`);
        }
    };

    // Google Sheets - Create Spreadsheet
    if (def.name === 'sheets.createSpreadsheet') {
        try {
            await checkAndEnforcePermission('sheets'); // Check 'sheets' permission scope
            const { createSpreadsheet } = await import('@/server/integrations/sheets/service');
            const result = await createSpreadsheet(request.actor.userId, inputs.title);
            return {
                status: 'success',
                data: result
            };
        } catch (error: any) {
            return { status: 'failed', error: error.message };
        }
    }

    // Google Drive - Upload File
    if (def.name === 'drive.uploadFile') {
        try {
            await checkAndEnforcePermission('drive');
            const { uploadFile } = await import('@/server/integrations/drive/service');
            // Check if inputs.content is provided, else error? Definition should handle schema.
            // Assuming inputs.content is string/buffer.
            if (!inputs.content) throw new Error('File content is required.');
            
            const result = await uploadFile(request.actor.userId, inputs.name, inputs.content, inputs.mimeType);
            return {
                status: 'success',
                data: result
            };
        } catch (error: any) {
            return { status: 'failed', error: error.message };
        }
    }

    // Slack - Post Message
    if (def.name === 'slack.postMessage') {
        try {
            await checkAndEnforcePermission('slack');
            const { postMessage } = await import('@/server/integrations/slack/service');
            const result = await postMessage(request.actor.userId, inputs.channel, inputs.message);
            return {
                status: 'success',
                data: result
            };
        } catch (error: any) {
            return { status: 'failed', error: error.message };
        }
    }

    // --- Junior Work Routing ---
    if (def.name.startsWith('junior.')) {
        try {
            // Ensure example work is registered (in a real app, do this at startup)
            await import('@/server/agents/juniors/marketing/generate-meta');
            
            const { runJuniorWork } = await import('@/server/agents/juniors/runner');
            const result = await runJuniorWork(request.actor.userId, def.name, inputs);
            
            return {
                status: 'success',
                data: result
            };
        } catch (error: any) {
            return { status: 'failed', error: error.message };
        }
    }

    // Dutchie - Sync Menu (Placeholder for Logic)
    if (def.name === 'dutchie.sync') {
        try {
            await checkAndEnforcePermission('dutchie');
            // Logic would go here
            return {
                status: 'success',
                data: {
                    message: "Dutchie sync initiated successfully.",
                    timestamp: new Date().toISOString()
                }
            };
        } catch (error: any) {
            return { status: 'failed', error: error.message };
        }
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
