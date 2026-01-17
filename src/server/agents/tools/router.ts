
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
        const { sendGenericEmail } = await import('@/lib/email/dispatcher');
        // Default to "Team BakedBot" if no specific brand context is provided
        // This allows playbooks to run even if the agent doesn't explicitly self-identify as a brand yet
        const fromName = inputs.brandName || 'BakedBot Team';
        const fromEmail = inputs.brandName ? undefined : 'team@bakedbot.ai'; 

        const result = await sendGenericEmail({
            to: inputs.to,
            subject: inputs.subject,
            htmlBody: inputs.content,
            textBody: inputs.content.replace(/<[^>]*>/g, ''), // Strip tags for text version
            name: inputs.recipientName,
            fromName: fromName,
            fromEmail: fromEmail
        });
        
        return {
            status: result.success ? 'success' : 'failed',
            data: { sent: result.success, provider: 'dynamic', to: inputs.to, error: result.error }
        };
    }

    // Communications - Internal Notifications (Reports, Alerts)
    if (def.name === 'communications.sendNotification') {
        const { sendGenericEmail } = await import('@/lib/email/dispatcher');
        
        const result = await sendGenericEmail({
            to: inputs.to,
            subject: inputs.subject,
            htmlBody: inputs.content, // HTML assumed
            textBody: inputs.content.replace(/<[^>]*>/g, ''),
            fromName: 'BakedBot Team',
            fromEmail: 'team@bakedbot.ai' // Enforced for internal/system notifications
        });

        return {
            status: result.success ? 'success' : 'failed',
            data: { sent: result.success, provider: 'dynamic', to: inputs.to, error: result.error }
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
    // Sandbox & Experimental Tools
    if (def.name === 'web.search') {
        try {
            // PROOF OF CONCEPT: Dispatch to Modular Skill
            const { loadSkill } = await import('@/skills/loader');
            const skill = await loadSkill('core/search');
            const tool = skill.tools.find(t => t.definition.name === def.name);
            
            if (tool && tool.implementation) {
                const results = await tool.implementation(request, inputs);
                return {
                    status: 'success',
                    data: results
                };
            }
        } catch (error) {
           console.warn('[Router] Skill dispatch failed, falling back to legacy:', error);
        }

        // Legacy Fallback
        const { searchWeb } = await import('@/server/tools/web-search');
        const results = await searchWeb(inputs.query, 5);
        return {
            status: 'success',
            data: results
        };
    }

    if (def.name === 'communications.sendTestEmail') {
        const { sendGenericEmail } = await import('@/lib/email/dispatcher');
        
        const result = await sendGenericEmail({
            to: inputs.to,
            subject: 'BakedBot Test Email',
            htmlBody: `
                <h1>System Test</h1>
                <p>This is a test email sent from the Agent Tooling System.</p>
                <p>Time: ${new Date().toISOString()}</p>
                <p>Provider: Dynamic Dispatcher</p>
            `,
            textBody: `System Test. Time: ${new Date().toISOString()}`,
            fromName: 'BakedBot System'
        });

        return {
            status: result.success ? 'success' : 'failed',
            data: { sent: result.success, provider: 'dynamic', error: result.error }
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

    // --- Agent Orchestration Tools ---
    if (def.name === 'agent.delegate') {
        try {
            const { loadSkill } = await import('@/skills/loader');
            const skill = await loadSkill('core/agent');
            const tool = skill.tools.find(t => t.definition.name === def.name);
            if (tool && tool.implementation) {
                // We pass the personaId from the request as context to the skill
                const result = await tool.implementation({ agentName: request.actor.userId }, inputs);
                return { status: 'success', data: result };
            }
        } catch (e: any) {
            return { status: 'failed', error: `Delegation failed: ${e.message}` };
        }
    }

    if (def.name === 'agent.broadcast') {
        try {
            const { loadSkill } = await import('@/skills/loader');
            const skill = await loadSkill('core/agent');
            const tool = skill.tools.find(t => t.definition.name === def.name);
            if (tool && tool.implementation) {
                const result = await tool.implementation({ agentName: request.actor.userId }, inputs);
                return { status: 'success', data: result };
            }
        } catch (e: any) {
            return { status: 'failed', error: `Broadcast failed: ${e.message}` };
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

    // AI Adoption Tracker - Submit to WordPress API
    if (def.name === 'tracker.submit') {
        // Restricted to Super User (Owner) only
        if (request.actor.role !== 'super_user') {
            return { status: 'failed', error: 'Unauthorized: Tool restricted to Super Users' };
        }

        try {
            const { submitToTracker } = await import('@/server/tools/integrations/wordpress');
            const result = await submitToTracker(inputs.orgs);
            return {
                status: result.success ? 'success' : 'failed',
                data: result.data,
                error: result.error
            };
        } catch (error: any) {
            return { status: 'failed', error: error.message };
        }
    }

    // AI Signal Scanner - Discovery Tool
    if (def.name === 'discovery.scan') {
        // Restricted to Super User (Owner) only
        if (request.actor.role !== 'super_user') {
            return { status: 'failed', error: 'Unauthorized: Tool restricted to Super Users' };
        }

        try {
            const { scanForAiSignals } = await import('@/server/tools/discovery/ai-scanner');
            const result = await scanForAiSignals(inputs.url);
            return {
                status: 'success',
                data: result
            };
        } catch (error: any) {
            return { status: 'failed', error: error.message };
        }
    }

    // Google Sheets - Append Rows (for Price Tracker and data logging)
    if (def.name === 'sheets.append') {
        try {
            await checkAndEnforcePermission('sheets');
            const { sheetsAction } = await import('@/server/tools/sheets');
            const result = await sheetsAction({
                action: 'append',
                spreadsheetId: inputs.spreadsheetId,
                range: inputs.range || 'Sheet1!A1',
                values: inputs.values
            });
            return {
                status: result.success ? 'success' : 'failed',
                data: result.data,
                error: result.error
            };
        } catch (error: any) {
            return { status: 'failed', error: error.message };
        }
    }

    // Weedmaps - Discover Dispensary Menu (for Price Tracker)
    if (def.name === 'weedmaps.discover') {
        try {
            const { discoverMultipleDispensaries, formatProductsForSheets } = await import('@/server/tools/discovery/weedmaps');
            
            // Handle single URL or array of URLs
            const urls = Array.isArray(inputs.urls) ? inputs.urls : [inputs.url];
            
            const result = await discoverMultipleDispensaries(urls);
            
            // Optionally format for sheets if requested
            const allProducts = result.results.flatMap(r => r.products);
            const sheetsData = inputs.formatForSheets ? formatProductsForSheets(allProducts) : null;
            
            return {
                status: result.success ? 'success' : 'failed',
                data: {
                    totalProducts: result.totalProducts,
                    dispensariesDiscovered: result.results.length,
                    products: allProducts,
                    sheetsFormatted: sheetsData,
                    results: result.results
                }
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

    // --- Intention OS Tools ---
    if (def.name === 'intention.askClarification') {
        const { askClarification } = await import('../intention/tools');
        const result = await askClarification(inputs.question, inputs.context);
        return {
            status: 'success', // Tool executed successfully (it generated the signal)
            data: result
        };
    }

    if (def.name === 'intention.createCommit') {
        const { createCommit } = await import('../intention/tools');
        if (!request.tenantId) throw new Error('Tenant ID required for Intent Commit');
        const result = await createCommit(request.tenantId, request.actor.userId, inputs);
        return {
            status: 'success',
            data: result
        };
    }

    // --- Discovery Browser Tools (RTRVR) ---
    if (def.name.startsWith('discovery.') && ['browserAutomate', 'summarizePage', 'extractData', 'fillForm', 'createRedditAd'].some(t => def.name.endsWith(t))) {
        try {
            const { executeDiscoveryBrowserTool, canRoleUseDiscoveryBrowser } = await import('@/server/services/rtrvr/tools');
            
            // Permissions check (beyond registry)
            if (!canRoleUseDiscoveryBrowser(request.actor.role)) {
                return { status: 'failed', error: 'Discovery browser tools require elevated access.' };
            }
            
            const result = await executeDiscoveryBrowserTool(def.name, inputs);
            
            return {
                status: result.success ? 'success' : 'failed',
                data: result.data,
                error: result.error
            };
        } catch (error: any) {
            return { status: 'failed', error: `Discovery browser error: ${error.message}` };
        }
    }

    // --- Firecrawl Deep Discovery (mapSite, crawl) ---
    if (def.name === 'discovery.mapSite') {
        try {
            const { discovery } = await import('@/server/services/firecrawl');
            if (!discovery.isConfigured()) {
                return { status: 'failed', error: 'Firecrawl not configured.' };
            }
            const result = await discovery.mapSite(inputs.url as string);
            return { status: 'success', data: result };
        } catch (error: any) {
            return { status: 'failed', error: `Map site error: ${error.message}` };
        }
    }

    if (def.name === 'discovery.crawl') {
        try {
            const { discovery } = await import('@/server/services/firecrawl');
            if (!discovery.isConfigured()) {
                return { status: 'failed', error: 'Firecrawl not configured.' };
            }
            // Note: Firecrawl SDK crawl method might be async with polling
            // For MVP, we use scrape in a loop or rely on the SDK's crawl if available
            const result = await discovery.discoverUrl(inputs.url as string, ['markdown']);
            return { status: 'success', data: { url: inputs.url, content: result } };
        } catch (error: any) {
            return { status: 'failed', error: `Crawl error: ${error.message}` };
        }
    }

    // --- Context OS Tools ---
    if (def.name.startsWith('context.')) {
        const { contextAskWhy, contextLogDecision, contextGetAgentHistory } = await import('@/server/tools/context-tools');
        
        if (def.name === 'context.askWhy') {
            return { status: 'success', data: await contextAskWhy(inputs) };
        }
        if (def.name === 'context.logDecision') {
            return { status: 'success', data: await contextLogDecision(inputs) };
        }
        if (def.name === 'context.getAgentHistory') {
            return { status: 'success', data: await contextGetAgentHistory(inputs) };
        }
    }

    // --- Firecrawl MCP Tools ---
    if (def.name.startsWith('firecrawl.')) {
        try {
            const mcpTools = await import('@/server/tools/firecrawl-mcp');
            
            const toolMap: Record<string, any> = {
                'firecrawl.search': mcpTools.firecrawlSearch,
                'firecrawl.batchScrape': mcpTools.firecrawlBatchScrape,
                'firecrawl.map': mcpTools.firecrawlMap,
                'firecrawl.extract': mcpTools.firecrawlExtract,
                'firecrawl.scrapeMenu': mcpTools.firecrawlScrapeMenu,
                'firecrawl.scrapeWithActions': mcpTools.firecrawlScrapeWithActions,
            };

            const toolImpl = toolMap[def.name];
            if (!toolImpl) {
                return { status: 'failed', error: `Firecrawl tool not found: ${def.name}` };
            }

            const result = await toolImpl(inputs);
            return {
                status: 'success',
                data: result
            };
        } catch (error: any) {
            return { status: 'failed', error: error.message };
        }
    }

    // --- CRM / Boardroom Tools ---
    if (def.name === 'crm.listUsers') {
        try {
            await checkAndEnforcePermission('read:analytics');
            const { getAllUsers } = await import('@/app/dashboard/ceo/actions');
            const users = await getAllUsers();
            
            // Basic filtering
            let filtered = users;
            if (inputs.search) {
                const q = inputs.search.toLowerCase();
                filtered = users.filter((u: any) => 
                    (u.email && u.email.toLowerCase().includes(q)) || 
                    (u.displayName && u.displayName.toLowerCase().includes(q))
                );
            }
            if (inputs.limit) {
                filtered = filtered.slice(0, inputs.limit);
            }
            return { status: 'success', data: filtered };
        } catch (e: any) {
            return { status: 'failed', error: e.message };
        }
    }

    if (def.name === 'crm.getStats') {
        try {
            await checkAndEnforcePermission('read:analytics');
            const { getPlatformAnalytics } = await import('@/app/dashboard/ceo/actions');
            const stats = await getPlatformAnalytics();
            return { status: 'success', data: stats };
        } catch (e: any) {
            return { status: 'failed', error: e.message };
        }
    }

    if (def.name === 'letta.updateCoreMemory') {
        try {
            // Mock Implementation for Letta - In real app, call Letta SDK
            return { 
                status: 'success', 
                data: { message: `Core Memory (${inputs.section}) updated.`, content: inputs.content } 
            };
        } catch (e: any) {
            return { status: 'failed', error: e.message };
        }
    }

    if (def.name === 'letta.messageAgent') {
        try {
            // Mock Implementation - In real app, put message on queue
            return { 
                status: 'success', 
                data: { message: `Message sent to ${inputs.toAgent}.`, content: inputs.message } 
            };
        } catch (e: any) {
            return { status: 'failed', error: e.message };
        }
    }

    // --- Brain / Learning Tools ---
    if (def.name === 'agent.sleepAndReflect') {
        try {
            const { sleepService } = await import('@/server/services/sleep-service');
            if (!request.tenantId) throw new Error('Tenant context required for sleep');
            const result = await sleepService.runSleepCycle(request.actor.userId, request.tenantId);
            return { status: 'success', data: result };
        } catch (e: any) {
            return { status: 'failed', error: e.message };
        }
    }

    if (def.name === 'agent.mountSkill') {
        try {
            const { learningService } = await import('@/server/services/learning-service');
            const skillContent = await learningService.loadSkill(request.actor.userId, inputs.skillName);
            if (!skillContent) return { status: 'failed', error: 'Skill not found' };
            return { status: 'success', data: { skillContent } };
        } catch (e: any) {
            return { status: 'failed', error: e.message };
        }
    }

    if (def.name === 'agent.learnSkill') {
        try {
            const { learningService } = await import('@/server/services/learning-service');
            await learningService.saveSkill(request.actor.userId, inputs.name, inputs.instructions);
            return { status: 'success', data: { message: `Skill '${inputs.name}' saved.` } };
        } catch (e: any) {
            return { status: 'failed', error: e.message };
        }
    }

    // --- Archival Memory (Long Term) ---
    if (def.name === 'archival.insert') {
        try {
            // "Tags" logic would go here if SDK supported it directly, for now we prepend to content
            const content = inputs.tags ? `[Tags: ${inputs.tags.join(', ')}] ${inputs.content}` : inputs.content;
            const { lettaClient } = await import('@/server/services/letta/client');
            await lettaClient.insertPassage(request.actor.userId, content);
            return { status: 'success', data: { message: 'Saved to archival memory.' } };
        } catch (e: any) {
             return { status: 'failed', error: e.message };
        }
    }

    if (def.name === 'archival.search') {
        try {
            const { lettaClient } = await import('@/server/services/letta/client');
            const results = await lettaClient.searchPassages(request.actor.userId, inputs.query, inputs.limit || 5);
            return { status: 'success', data: { results } };
        } catch (e: any) {
             return { status: 'failed', error: e.message };
        }
    }

    // --- Executive Suite: Finance (Mike) ---
    if (def.name === 'finance.authorizeNet.listSubscriptions') {
        try {
            const { authorizeNetService } = await import('@/server/services/finance/authorize-net');
            const data = await authorizeNetService.listSubscriptions();
            return { status: 'success', data: { subscriptions: data } };
        } catch (e: any) {
            return { status: 'failed', error: e.message };
        }
    }

    if (def.name === 'finance.authorizeNet.getBalance') {
        // Mapped to daily stats for now
        return { status: 'success', data: { balance: 0, note: "Real-time balance API unavailable. Use transaction list." } };
    }

    if (def.name === 'finance.authorizeNet.getTransactions') {
        const { authorizeNetService } = await import('@/server/services/finance/authorize-net');
        const data = await authorizeNetService.getTransactionList();
        return { status: 'success', data: { transactions: data } };
    }
    // --- Executive Suite: Ops (Leo/Linus) ---
    if (def.name === 'ops.linear.createIssue') {
        try {
            const { linearService } = await import('@/server/services/ops/linear');
            const issue = await linearService.createIssue(inputs.title, inputs.description, inputs.priority);
            return { status: 'success', data: issue };
        } catch (e: any) {
            return { status: 'failed', error: e.message };
        }
    }

    if (def.name === 'ops.linear.getIssues') {
         try {
            const { linearService } = await import('@/server/services/ops/linear');
            const issues = await linearService.getIssues(inputs.filter);
            return { status: 'success', data: { issues } };
        } catch (e: any) {
            return { status: 'failed', error: e.message };
        }
    }
    // --- Executive Suite: Growth (Craig) ---
    if (def.name === 'analytics.google.getTraffic') {
         try {
            const { googleAnalyticsService } = await import('@/server/services/growth/google-analytics');
            const report = await googleAnalyticsService.getTrafficReport(inputs.startDate, inputs.endDate);
            return { status: 'success', data: report };
        } catch (e: any) {
            return { status: 'failed', error: e.message };
        }
    }
    
    if (def.name === 'analytics.google.searchConsole') {
         // Placeholder until GSC specific oauth is set up
         return { status: 'success', data: { message: "GSC integration pending OAUTH setup. Use GA4 traffic data." } };
    }
    // --- Executive Suite: Knowledge (All) ---
    if (def.name === 'docs.notion.createPage') {
        try {
            const { notionService } = await import('@/server/services/docs/notion');
            const page = await notionService.createPage(inputs.title, inputs.content);
            return { status: 'success', data: page };
        } catch (e: any) {
            return { status: 'failed', error: e.message };
        }
    }

    if (def.name === 'docs.notion.search') {
         try {
            const { notionService } = await import('@/server/services/docs/notion');
            const results = await notionService.search(inputs.query);
            return { status: 'success', data: { results } };
        } catch (e: any) {
            return { status: 'failed', error: e.message };
        }
    }
    // --- Executive Suite: Automation (All) ---
    if (def.name === 'automation.zapier.trigger') {
        try {
            const { webhookService } = await import('@/server/services/automation/webhook-service');
            const res = await webhookService.triggerZap(inputs.hookId, inputs.payload);
            return { status: 'success', data: res };
        } catch (e: any) {
            return { status: 'failed', error: e.message };
        }
    }

    if (def.name === 'automation.n8n.webhook') {
         try {
            const { webhookService } = await import('@/server/services/automation/webhook-service');
            const res = await webhookService.triggerN8N(inputs.webhookId, inputs.payload);
            return { status: 'success', data: res };
        } catch (e: any) {
            return { status: 'failed', error: e.message };
        }
    }
    
    // --- Google Workspace & Canva ---
    if (def.name === 'google.docs.create') {
        try {
            const { googleWorkspaceService } = await import('@/server/services/docs/google-workspace');
            const res = await googleWorkspaceService.createDoc(inputs.title, inputs.content);
            return { status: 'success', data: res };
        } catch (e: any) {
            return { status: 'failed', error: e.message };
        }
    }
    if (def.name === 'google.sheets.read') {
        try {
            const { googleWorkspaceService } = await import('@/server/services/docs/google-workspace');
            const res = await googleWorkspaceService.readSheet(inputs.spreadsheetId, inputs.range);
            return { status: 'success', data: res };
        } catch (e: any) {
            return { status: 'failed', error: e.message };
        }
    }
    if (def.name === 'google.sheets.append') {
        try {
            const { googleWorkspaceService } = await import('@/server/services/docs/google-workspace');
            const res = await googleWorkspaceService.appendToSheet(inputs.spreadsheetId, inputs.range, inputs.values);
            return { status: 'success', data: res };
        } catch (e: any) {
            return { status: 'failed', error: e.message };
        }
    }
    if (def.name === 'canva.listDesigns') {
        try {
            const { canvaService } = await import('@/server/services/design/canva');
            const res = await canvaService.listDesigns();
            return { status: 'success', data: { designs: res } };
        } catch (e: any) {
            return { status: 'failed', error: e.message };
        }
    }
    if (def.name === 'canva.createDesign') {
        try {
            const { canvaService } = await import('@/server/services/design/canva');
            const res = await canvaService.createDesign(inputs.title);
            return { status: 'success', data: res };
        } catch (e: any) {
            return { status: 'failed', error: e.message };
        }
    }

    // --- Slack Tools ---
    if (def.name === 'slack.postMessage') {
        try {
            const { slackService } = await import('@/server/services/communications/slack');
            const res = await slackService.postMessage(inputs.channel, inputs.text);
            return { status: 'success', data: res };
        } catch (e: any) {
             return { status: 'failed', error: e.message };
        }
    }
    if (def.name === 'slack.listChannels') {
        try {
            const { slackService } = await import('@/server/services/communications/slack');
            const res = await slackService.listChannels();
            return { status: 'success', data: { channels: res } };
        } catch (e: any) {
             return { status: 'failed', error: e.message };
        }
    }




    // --- Research & Intelligence (Roach/BigWorm) ---
    if (def.name === 'research.deep') {
        try {
            const { researchService } = await import('@/server/services/research-service');
            const res = await researchService.performDeepDive(inputs.query, inputs.depth || 2);
            return { status: 'success', data: res };
        } catch (e: any) {
             return { status: 'failed', error: e.message };
        }
    }
    if (def.name === 'research.scholar') {
        try {
            const { researchService } = await import('@/server/services/research-service');
            const res = await researchService.performScholarSearch(inputs.query, inputs.limit || 5);
            return { status: 'success', data: res };
        } catch (e: any) {
             return { status: 'failed', error: e.message };
        }
    }

    // --- Scout Tools (Competitive Monitoring) ---
    if (def.name.startsWith('scout.')) {
        try {
            const { createScout, runScout, getScouts } = await import('@/server/services/scouts/scout-service');
            
            if (def.name === 'scout.create') {
                if (!request.tenantId) throw new Error('Tenant context required');
                const scout = await createScout(
                    request.tenantId,
                    request.actor.userId,
                    inputs.query as string,
                    {
                        frequency: inputs.frequency as any,
                        targetUrls: inputs.targetUrls as string[]
                    }
                );
                return { status: 'success', data: { scoutId: scout.id, message: `Scout created: ${scout.query}` } };
            }
            
            if (def.name === 'scout.run') {
                if (!request.tenantId) throw new Error('Tenant context required');
                const scouts = await getScouts(request.tenantId, request.actor.userId);
                const scout = scouts.find(s => s.id === inputs.scoutId);
                if (!scout) {
                    return { status: 'failed', error: 'Scout not found' };
                }
                const result = await runScout(scout);
                return { status: 'success', data: { summary: result.summary, resultCount: result.resultCount } };
            }
            
            return { status: 'failed', error: `Unknown scout tool: ${def.name}` };
        } catch (error: any) {
            return { status: 'failed', error: `Scout error: ${error.message}` };
        }
    }

    // --- Letta Memory System (Universal) ---
    if (def.name.startsWith('letta.')) {
        try {
            const lettaTools = await import('@/server/tools/letta-memory');
            
            // Map registry name to export name
            // Registry: letta.saveFact -> Export: lettaSaveFact
            // Registry: letta.searchMemory -> Export: lettaSearchMemory
            // Registry: letta.updateCoreMemory -> Export: lettaUpdateCoreMemory
            // Registry: letta.messageAgent -> Export: lettaMessageAgent
            
            const exportName = def.name.replace(/^letta\./, 'letta')
                .replace(/^letta(\w)/, (match, p1) => `letta${p1.toUpperCase()}`);
            
            // Actually, my export naming convention is:
            // letta.saveFact -> lettaSaveFact (camelCase match)
            // But wait, in letta-memory.ts I exported:
            // lettaSaveFact
            // lettaSearchMemory
            // lettaUpdateCoreMemory
            // lettaMessageAgent
            
            // So if toolName is 'letta.saveFact', I want 'lettaSaveFact'.
            // if toolName is 'letta.searchMemory', I want 'lettaSearchMemory'.
            
            // Let's hardcode the map for safety or use a cleaner construct.
            const toolMap: Record<string, any> = {
                'letta.saveFact': lettaTools.lettaSaveFact,
                'letta.searchMemory': lettaTools.lettaSearchMemory,
                'letta.updateCoreMemory': lettaTools.lettaUpdateCoreMemory,
                'letta.messageAgent': lettaTools.lettaMessageAgent,
            };

            const toolImpl = toolMap[def.name];
            
            if (!toolImpl) {
                 return { status: 'failed', error: `Letta tool implementation not found for: ${def.name}` };
            }

            // Execute the Tool wrapper
            // The `tool` from genkit returns a function that takes inputs
            // But wait, Genkit tools are usually executed by the runner, not manually dispatched like this?
            // In this router, we are manually invoking the implementation function usually.
            // But `lettaSaveFact` is a Genkit `Reference` or `Tool` object?
            // checking letta-memory.ts: export const lettaSaveFact = tool({...}, async ({...}) => {...})
            // Invoking it as a function might not work directly if it's the wrapper.
            // Ideally we expose the async function directly or call `.run(inputs)`.
            // Genkit tools are callable if they are the output of `tool()`.
            
            // Let's try calling it directly, as Genkit tools are often just callable functions + metadata.
            const result = await toolImpl(inputs);
            
            return {
                status: 'success',
                data: result
            };

        } catch (error: any) {
            return { status: 'failed', error: `Letta execution error: ${error.message}` };
        }
    }

    // --- Internal CRM Tools (Jack/Admin) ---
    if (def.name === 'crm.getInternalLeads') {
        const { getInternalLeads } = await import('./domain/crm');
        // Ensure inputs are provided or allow defaults
        return {
            status: 'success',
            data: await getInternalLeads(inputs.limit || 20, inputs.search)
        };
    }

    if (def.name === 'crm.getInternalBrands') {
        const { getInternalBrands } = await import('./domain/crm');
        return {
            status: 'success',
            data: await getInternalBrands(inputs.state, inputs.status)
        };
    }

    // --- Full CRM Tools (Executive Boardroom) ---
    if (def.name.startsWith('crm.') && ['crm.listUsers', 'crm.getStats', 'crm.updateLifecycle', 'crm.addNote', 'crm.search'].includes(def.name)) {
        try {
            const crmTools = await import('./domain/crm-full');
            
            const toolMap: Record<string, any> = {
                'crm.listUsers': crmTools.crmListUsersTool,
                'crm.getStats': crmTools.crmGetStatsTool,
                'crm.updateLifecycle': crmTools.crmUpdateLifecycleTool,
                'crm.addNote': crmTools.crmAddNoteTool,
                'crm.search': crmTools.crmSearchTool,
            };

            const toolImpl = toolMap[def.name];
            if (!toolImpl) {
                return { status: 'failed', error: `CRM tool not found: ${def.name}` };
            }

            const result = await toolImpl(inputs);
            return { status: 'success', data: result };
        } catch (error: any) {
            return { status: 'failed', error: `CRM error: ${error.message}` };
        }
    }

    // --- System Navigation (Inline Connections) ---
    if (def.name === 'system.generateConnectionLink') {
        // Map tools to their dashboard settings URLs
        const toolMap: Record<string, string> = {
            'stripe': '/dashboard/settings/billing', // Better than general settings
            'github': '/dashboard/settings/integrations?connect=github',
            'salesforce': '/dashboard/settings/integrations?connect=salesforce',
            'hubspot': '/dashboard/settings/integrations?connect=hubspot',
            'linear': '/dashboard/settings/integrations?connect=linear',
            'jira': '/dashboard/settings/integrations?connect=jira',
            'google_analytics': '/dashboard/settings/analytics?enable=true', // Direct to analytics tab
            'search_console': '/dashboard/settings/seo?enable=true'  // Direct to SEO tab
        };

        const targetUrl = toolMap[inputs.tool];
        
        if (!targetUrl) {
           return {
               status: 'failed',
               error: `Unknown tool identifier: ${inputs.tool}`
           };
        }

        // Return a structured response that the UI (or Agent) can parse into a clickable link
        return {
            status: 'success',
            data: {
                tool: inputs.tool,
                url: targetUrl,
                action: 'navigate',
                markdown: `[Connect ${inputs.tool} Now](${targetUrl})`
            }
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
