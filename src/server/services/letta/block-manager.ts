/**
 * LettaBlockManager - Role-Based Shared Memory Management
 * 
 * Manages shared memory blocks for different user roles:
 * - Brand (CEO): brand_context
 * - Dispensary: dispensary_context
 * - Customer: customer_insights
 * - Executive Board: executive_workspace
 * - All: compliance_policies (read-only)
 */

import { lettaClient, LettaBlock } from './client';
import { logger } from '@/lib/logger';

// Block labels by role - SHARED blocks
export const BLOCK_LABELS = {
    // Shared blocks (all agents can read)
    BRAND_CONTEXT: 'brand_context',
    DISPENSARY_CONTEXT: 'dispensary_context',
    CUSTOMER_INSIGHTS: 'customer_insights',
    EXECUTIVE_WORKSPACE: 'executive_workspace',
    COMPLIANCE_POLICIES: 'compliance_policies',
    PLAYBOOK_STATUS: 'playbook_status',
    
    // Cross-agent learning blocks
    OVERNIGHT_LEARNINGS: 'overnight_learnings',  // Coaching patches + audit insights from overnight training

    // Agent-Specific blocks (each agent's private memory)
    AGENT_LEO: 'agent_leo_memory',           // COO - Operations
    AGENT_JACK: 'agent_jack_memory',         // CEO - Strategy
    AGENT_POPS: 'agent_pops_memory',         // CMO/Analytics
    AGENT_CRAIG: 'agent_craig_memory',       // Marketing
    AGENT_MRS_PARKER: 'agent_mrsparker_memory', // Customer Success/Loyalty
    AGENT_DEEBO: 'agent_deebo_memory',       // Compliance
    AGENT_EZAL: 'agent_ezal_memory',         // Competitive Intel
    AGENT_MONEY_MIKE: 'agent_moneymike_memory', // Finance
    AGENT_LINUS: 'agent_linus_memory',       // Code Agent
} as const;

export type BlockLabel = typeof BLOCK_LABELS[keyof typeof BLOCK_LABELS];

// In-memory cache for block IDs (tenant -> label -> blockId)
const blockCache: Map<string, Map<string, string>> = new Map();

export class LettaBlockManager {
    /**
     * Get or create a shared memory block for a tenant + label combination.
     */
    async getOrCreateBlock(
        tenantId: string, 
        label: BlockLabel,
        initialValue?: string,
        readOnly: boolean = false
    ): Promise<LettaBlock> {
        const cacheKey = `${tenantId}:${label}`;
        
        // Check cache first
        const tenantCache = blockCache.get(tenantId);
        if (tenantCache?.has(label)) {
            const blockId = tenantCache.get(label)!;
            try {
                return await lettaClient.getBlock(blockId);
            } catch (e) {
                // Block may have been deleted, continue to create new one
                tenantCache.delete(label);
            }
        }

        // Search existing blocks
        try {
            const blocks = await lettaClient.listBlocks();
            const existingBlock = blocks.find(b => 
                b.label === `${tenantId}:${label}`
            );
            
            if (existingBlock) {
                // Cache it
                this.cacheBlock(tenantId, label, existingBlock.id);
                return existingBlock;
            }
        } catch (e) {
            logger.warn(`[LettaBlockManager] Failed to list blocks: ${e}`);
        }

        // Create new block
        const defaultValues: Record<BlockLabel, string> = {
            // Shared blocks
            [BLOCK_LABELS.BRAND_CONTEXT]: `Brand Context for ${tenantId}\n---\nBrand Profile: (pending)\nGoals: (pending)\nCompetitive Intel: (pending)`,
            [BLOCK_LABELS.DISPENSARY_CONTEXT]: `Dispensary Context for ${tenantId}\n---\nLocation: (pending)\nInventory Status: (pending)\nCompliance Status: Active`,
            [BLOCK_LABELS.CUSTOMER_INSIGHTS]: `Customer Insights for ${tenantId}\n---\nSegments: (pending)\nTop Products: (pending)\nLoyalty Status: (pending)`,
            [BLOCK_LABELS.EXECUTIVE_WORKSPACE]: `Executive Workspace for ${tenantId}\n---\nStrategic Plans: (pending)\nKPIs: (pending)\nDelegation Notes: (pending)`,
            [BLOCK_LABELS.COMPLIANCE_POLICIES]: `Compliance Policies\n---\nNo medical claims\nAge-gate required (21+)\nNo interstate commerce\nState-specific regulations apply`,
            [BLOCK_LABELS.PLAYBOOK_STATUS]: `Playbook Status for ${tenantId}\n---\nActive Playbooks: None\nLast Run: Never`,
            
            // Cross-agent learning
            [BLOCK_LABELS.OVERNIGHT_LEARNINGS]: `Overnight Training Learnings\n---\nCoaching patches and audit insights shared across all agents.\nUpdated nightly by the training orchestrator.`,

            // Agent-Specific blocks (private memories)
            [BLOCK_LABELS.AGENT_LEO]: `Leo's Operations Memory\n---\nCurrent Tasks: None\nRecent Decisions: None\nTeam Status: Healthy`,
            [BLOCK_LABELS.AGENT_JACK]: `Jack's Strategic Memory\n---\nVision: Grow BakedBot to $10M ARR\nCurrent Focus: Customer acquisition\nKey Relationships: None recorded`,
            [BLOCK_LABELS.AGENT_POPS]: `Pops' Analytics Memory\n---\nActive Reports: None\nKey Metrics Tracked: MRR, Churn, NPS\nInsights: Awaiting data`,
            [BLOCK_LABELS.AGENT_CRAIG]: `Craig's Marketing Memory\n---\nActive Campaigns: None\nAudience Insights: None\nContent Calendar: Empty`,
            [BLOCK_LABELS.AGENT_MRS_PARKER]: `Mrs. Parker's Customer Success Memory\n---\nVIP Customers: None identified\nOnboarding Queue: Empty\nLoyalty Tier Changes: None\nSleep-Time Reflections: Ready for new signups`,
            [BLOCK_LABELS.AGENT_DEEBO]: `Deebo's Compliance Memory\n---\nAudits Complete: 0\nActive Violations: 0\nState Regulations Cache: [CA, CO, WA, OR]`,
            [BLOCK_LABELS.AGENT_EZAL]: `Ezal's Competitive Intel Memory\n---\nTracked Competitors: None\nRecent Alerts: None\nPrice Changes Detected: 0`,
            [BLOCK_LABELS.AGENT_MONEY_MIKE]: `Money Mike's Finance Memory\n---\nTotal MRR: $693\nOutstanding Invoices: 0\nCashflow Alerts: None`,
            [BLOCK_LABELS.AGENT_LINUS]: `Linus' Code Memory\n---\nRecent Commits: None tracked\nActive PRs: None\nCodebase Insights: Ready to analyze`,
        };

        const block = await lettaClient.createBlock(
            `${tenantId}:${label}`,
            initialValue || defaultValues[label] || '',
            { limit: 8000, readOnly }
        );

        this.cacheBlock(tenantId, label, block.id);
        logger.info(`[LettaBlockManager] Created block ${label} for tenant ${tenantId}`);
        
        return block;
    }

    /**
     * Append content to a block with agent attribution.
     * When the block overflows, the oldest content is summarized via LLM
     * and archived as a Letta passage before being dropped.
     */
    async appendToBlock(
        tenantId: string,
        label: BlockLabel,
        content: string,
        agentName: string
    ): Promise<LettaBlock> {
        const block = await this.getOrCreateBlock(tenantId, label);

        if (block.read_only) {
            throw new Error(`Cannot modify read-only block: ${label}`);
        }

        const timestamp = new Date().toISOString().split('T')[0];
        const newValue = `${block.value}\n\n[${agentName} @ ${timestamp}]: ${content}`;

        // If within limit, no truncation needed
        if (newValue.length <= block.limit) {
            return await lettaClient.updateBlock(block.id, newValue);
        }

        // Content will overflow — summarize the portion being dropped
        const keepLength = block.limit - 500; // buffer
        const droppedContent = newValue.slice(0, newValue.length - keepLength);
        const keptContent = newValue.slice(-keepLength);

        // Fire-and-forget: summarize dropped content and archive it
        this.summarizeAndArchive(tenantId, label, droppedContent, agentName).catch(err => {
            logger.warn('[LettaBlockManager] Failed to archive truncated content', { error: err instanceof Error ? err.message : String(err) });
        });

        logger.info(`[LettaBlockManager] Block ${label} overflow: archived ${droppedContent.length} chars, kept ${keptContent.length} chars`);

        return await lettaClient.updateBlock(block.id, keptContent);
    }

    /**
     * Summarize truncated block content and store it in Letta archival memory.
     * Uses a fast model (Gemini Flash Lite) to keep cost near zero.
     */
    private async summarizeAndArchive(
        tenantId: string,
        label: BlockLabel,
        droppedContent: string,
        agentName: string
    ): Promise<void> {
        try {
            const { ai } = await import('@/ai/genkit');

            const summaryResponse = await ai.generate({
                model: 'googleai/gemini-2.5-flash-lite',
                prompt: `Summarize the following agent memory block content that is being archived. Keep only key facts, decisions, and insights. Be concise (max 200 words).\n\nContent:\n${droppedContent.slice(0, 3000)}`,
            });

            const summary = summaryResponse.text;

            // Store the summary in archival memory for future retrieval
            // Find the agent for this tenant using exact name match to prevent
            // cross-tenant data leaks (e.g., 'org_test' matching 'org_test_bakedbot')
            const agents = await lettaClient.listAgents();
            const tenantAgent = agents.find(a => a.name === tenantId)
                || agents.find(a => a.name === 'BakedBot Research Memory');

            if (tenantAgent) {
                await lettaClient.insertPassage(tenantAgent.id, JSON.stringify({
                    _type: 'block_archive',
                    _version: 1,
                    tenantId,
                    blockLabel: label,
                    summary,
                    archivedAt: new Date().toISOString(),
                    archivedBy: agentName,
                    originalLength: droppedContent.length,
                }));
            }

            logger.info(`[LettaBlockManager] Archived summary for block ${label} (${summary.length} chars)`);
        } catch (error) {
            // Log but don't throw — archival is best-effort
            logger.warn('[LettaBlockManager] Summarize-and-archive failed', {
                error: error instanceof Error ? error.message : String(error),
                label,
                tenantId,
            });
        }
    }

    /**
     * Get all blocks for a tenant.
     */
    async getBlocksForTenant(tenantId: string): Promise<Record<BlockLabel, LettaBlock | null>> {
        const result: Record<string, LettaBlock | null> = {};
        
        for (const label of Object.values(BLOCK_LABELS)) {
            try {
                result[label] = await this.getOrCreateBlock(tenantId, label);
            } catch (e) {
                result[label] = null;
            }
        }
        
        return result as Record<BlockLabel, LettaBlock | null>;
    }

    /**
     * Attach standard blocks to a Letta agent based on role.
     */
    async attachBlocksForRole(
        tenantId: string,
        agentId: string,
        role: 'brand' | 'dispensary' | 'customer' | 'executive'
    ): Promise<void> {
        const blockLabels: BlockLabel[] = [BLOCK_LABELS.COMPLIANCE_POLICIES]; // All roles get compliance

        switch (role) {
            case 'brand':
                blockLabels.push(BLOCK_LABELS.BRAND_CONTEXT, BLOCK_LABELS.PLAYBOOK_STATUS);
                break;
            case 'dispensary':
                blockLabels.push(BLOCK_LABELS.DISPENSARY_CONTEXT, BLOCK_LABELS.PLAYBOOK_STATUS);
                break;
            case 'customer':
                blockLabels.push(BLOCK_LABELS.CUSTOMER_INSIGHTS);
                break;
            case 'executive':
                blockLabels.push(
                    BLOCK_LABELS.EXECUTIVE_WORKSPACE,
                    BLOCK_LABELS.BRAND_CONTEXT,
                    BLOCK_LABELS.PLAYBOOK_STATUS,
                    BLOCK_LABELS.OVERNIGHT_LEARNINGS
                );
                break;
        }

        for (const label of blockLabels) {
            try {
                const block = await this.getOrCreateBlock(
                    tenantId, 
                    label,
                    undefined,
                    label === BLOCK_LABELS.COMPLIANCE_POLICIES // Compliance is read-only
                );
                await lettaClient.attachBlockToAgent(agentId, block.id);
                logger.info(`[LettaBlockManager] Attached ${label} to agent ${agentId}`);
            } catch (e) {
                logger.warn(`[LettaBlockManager] Failed to attach ${label}: ${e}`);
            }
        }
    }

    /**
     * Read block content.
     */
    async readBlock(tenantId: string, label: BlockLabel): Promise<string> {
        const block = await this.getOrCreateBlock(tenantId, label);
        return block.value;
    }

    /**
     * List blocks, optionally filtered to a tenant namespace.
     */
    async listBlocks(tenantId?: string): Promise<LettaBlock[]> {
        const blocks = await lettaClient.listBlocks();
        if (!tenantId) {
            return blocks;
        }

        return blocks.filter((block) => block.label.startsWith(`${tenantId}:`));
    }

    private cacheBlock(tenantId: string, label: BlockLabel, blockId: string): void {
        if (!blockCache.has(tenantId)) {
            blockCache.set(tenantId, new Map());
        }
        blockCache.get(tenantId)!.set(label, blockId);
    }
}

export const lettaBlockManager = new LettaBlockManager();
