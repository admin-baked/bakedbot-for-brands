
import { AgentImplementation } from './harness';
import { AgentMemory } from './schemas';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { lettaBlockManager } from '@/server/services/letta/block-manager';
import { lettaClient } from '@/server/services/letta/client';

export interface RoachMemory extends AgentMemory {
    research_queue?: string[];
    papers_read?: number;
}

export interface RoachTools {
    // Archival Memory (Knowledge Graph)
    archivalInsert(content: string, tags?: string[]): Promise<any>;
    archivalSearch(query: string, tags?: string[], limit?: number): Promise<any>;
    
    // Deep Research (Big Worm Hook or Direct)
    researchDeep(query: string, depth?: number): Promise<any>;
    
    // Reporting
    googleDocsCreate(title: string, content: string): Promise<any>;
}

export const roachAgent: AgentImplementation<RoachMemory, RoachTools> = {
    agentName: 'roach',

    async initialize(brandMemory, agentMemory) {
        logger.info('[Roach] Initializing. "Knowledge is the only compliance strategy."');

        // === 1. Hive Mind Attachment ===
        // Roach attaches to 'compliance_context' (Deebo) and 'executive_workspace' (Boardroom)
        // We use the block manager to ensure these exist.
        const brandId = (brandMemory as any).brandId || (brandMemory as any).brand_profile?.id;
        if (brandId) {
             try {
                // Attach to Deebo's world
                await lettaBlockManager.attachBlocksForRole(brandId, agentMemory.agent_id as string, 'brand'); // Shared context
                // Attach to Boardroom
                // Note: 'executive' role usually implies full access, Roach is a helper.
                // We might just give him read access or specific blocks later. 
                // For now, attaching standard brand context is default.
             } catch (e) {
                 logger.warn(`[Roach] Failed to attach Hive Mind blocks: ${e}`);
             }
        }

        agentMemory.system_instructions = `
            You are ROACH, the BakedBot Research Librarian.
            
            **MISSION PROFILE:**
            - **50% Compliance Knowledge Base (Partner: Deebo):** You ingest regulations, legal texts, and safety standards. You structure them into the Knowledge Graph.
            - **45% Executive Research (Partner: Boardroom):** You answer deep-dive questions for Leo, Mike, and Glenda. You write "Briefs" (Google Docs).
            - **5% Deep Research (Partner: Big Worm):** You handle the academic/theoretical side of deep data dives.
            
            **CORE BEHAVIORS:**
            1.  **The Semantic Graph:** Never just "save" a fact. You MUST tag it (e.g., #compliance, #CA-Regs, #terpenes).
            2.  **Cross-Reference:** Before researching, ALWAYS search archival memory first to see what we already know.
            3.  **Academic Rigor:** Your output format is Citation-Heavy. Use APA style for references.
            4.  **Builder:** If you find a gap in logic, propose a new Skill.
            
            **OUTPUT FORMATS:**
            - **Research Brief:** Structured Google Doc (Title, Executive Summary, Key Findings, Citations).
            - **Compliance Node:** Archival Memory Entry (Regulation Text, Source, Effective Date, Tags).
        `;

        return agentMemory;
    },

    async orient(brandMemory, agentMemory, stimulus) {
        if (!stimulus) return null;
        return 'user_request'; // Roach is reactive to tasks usually
    },

    async act(brandMemory, agentMemory, targetId, tools, stimulus) {
        if (targetId === 'user_request' && stimulus) {
            const userQuery = typeof stimulus === 'string' ? stimulus : JSON.stringify(stimulus);

            // Tools Definition
            const toolsDef = [
                {
                    name: 'archival.search',
                    description: 'Search the semantic knowledge base for existing compliance or academic data.',
                    schema: z.object({
                        query: z.string(),
                        tags: z.array(z.string()).optional(),
                        limit: z.number().optional()
                    })
                },
                {
                    name: 'archival.insert',
                    description: 'Save a verified finding to the knowledge graph. REQUIRED: Use semantic tags.',
                    schema: z.object({
                        content: z.string(),
                        tags: z.array(z.string()).describe("E.g. ['#compliance', '#CA', '#tax']")
                    })
                },
                {
                    name: 'research.deep',
                    description: 'Conduct a deep deep-dive search on the web (Academic sources preferred).',
                    schema: z.object({
                        query: z.string(),
                        breadth: z.number().optional(),
                        depth: z.number().optional()
                    })
                },
                {
                    name: 'google.docs.create',
                    description: 'Write a formal Research Brief or Compliance Report.',
                    schema: z.object({
                        title: z.string(),
                        content: z.string()
                    })
                }
            ];

            try {
                const { runMultiStepTask } = await import('./harness');
                
                const result = await runMultiStepTask({
                    userQuery,
                    systemInstructions: agentMemory.system_instructions as string,
                    toolsDef,
                    tools, // Passed from router/registry mapping
                    model: 'claude', 
                    maxIterations: 8
                });

                return {
                    updatedMemory: agentMemory,
                    logEntry: {
                        action: 'research_complete',
                        result: result.finalResult,
                        metadata: { steps: result.steps }
                    }
                };
            } catch (e: any) {
                return {
                    updatedMemory: agentMemory,
                    logEntry: { action: 'error', result: `Roach failed: ${e.message}` }
                };
            }
        }

        return {
            updatedMemory: agentMemory,
            logEntry: { action: 'idle', result: 'Organizing the library.' }
        };
    }
};
