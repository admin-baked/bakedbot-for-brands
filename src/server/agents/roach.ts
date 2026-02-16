
import { AgentImplementation } from './harness';
import { AgentMemory } from './schemas';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { lettaBlockManager } from '@/server/services/letta/block-manager';
import { lettaClient } from '@/server/services/letta/client';
import { runResearchElaboration } from './patterns';

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
            - **Research Brief:** Structured Google Doc (Title, Executive Summary, Key Findings, Citations). Use standard markdown headers (###) to separate these sections.
            - **Compliance Node:** Archival Memory Entry (Regulation Text, Source, Effective Date, Tags). Use standard markdown headers (###) to separate these sections.
            - **Note:** Using ### headers ensures your research rendered correctly in the executive dashboard.
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

            // Tools Definition for Research Phase
            const researchTools = [
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
                // === RESEARCH-ELABORATION PATTERN ===
                // Phase 1: Research with tools (search archives, gather data)
                // Phase 2: Elaborate without tools (synthesize into report)
                const result = await runResearchElaboration(userQuery, {
                    researchPrompt: `
                        You are ROACH, the Research Librarian. Conduct thorough research.

                        RESEARCH PHASE OBJECTIVES:
                        1. FIRST: Search archival memory (archival.search) to see what we already know
                        2. If gaps exist, use research.deep to find academic/authoritative sources
                        3. Save ALL verified findings to the knowledge graph with semantic tags
                        4. Cross-reference multiple sources for accuracy

                        TAGGING REQUIREMENTS:
                        - Compliance data: #compliance, #[state-code], #[topic]
                        - Academic: #research, #[field], #[year]
                        - Market data: #market, #[category], #[region]

                        Be thorough. Check existing knowledge before searching externally.
                    `,
                    researchTools,
                    researchToolsImpl: tools as unknown as Record<string, (...args: unknown[]) => Promise<unknown>>,
                    maxResearchIterations: 6,
                    elaboration: {
                        instructions: `
                            You are ROACH, synthesizing your research into a formal brief.

                            ELABORATION PHASE - Create a Research Brief:

                            ### Executive Summary
                            2-3 sentence overview of key findings

                            ### Key Findings
                            - Finding 1 with supporting evidence
                            - Finding 2 with supporting evidence
                            - Finding 3 with supporting evidence

                            ### Analysis
                            Deep analysis connecting the findings

                            ### Recommendations
                            Actionable next steps based on research

                            ### Citations
                            List all sources in APA format

                            FORMAT: Use markdown headers (###) for proper rendering.
                            TONE: Academic rigor with practical business application.
                        `,
                        model: 'claude-sonnet-4-20250514',
                        maxIterations: 2,
                    },
                });

                return {
                    updatedMemory: agentMemory,
                    logEntry: {
                        action: 'research_complete',
                        result: result.elaboratedOutput,
                        metadata: {
                            researchSteps: result.researchOutput.steps.length,
                            totalDurationMs: result.metadata.totalDurationMs,
                            pattern: 'research-elaboration'
                        }
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
