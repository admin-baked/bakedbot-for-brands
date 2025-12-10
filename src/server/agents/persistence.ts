import { BrandDomainMemory, AgentMemory, AgentLogEntry, BrandDomainMemorySchema } from './schemas';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// Mock DB for Phase 4 (In reality, use firebase-admin here)
// This persistence layer allows us to swap backend storage easily.

export const persistence = {

    async loadBrandMemory(brandId: string): Promise<BrandDomainMemory> {
        // Stub: Return default memory if not found
        return {
            brand_profile: { name: 'Demo Brand' },
            priority_objectives: [],
            constraints: { jurisdictions: ['IL'] },
            segments: [],
            experiments_index: [],
            playbooks: {}
        };
    },

    async loadAgentMemory<T extends AgentMemory>(brandId: string, agentName: string, schema: z.ZodType<T>): Promise<T> {
        // Stub: In real app, fetch from `brands/{brandId}/agents/{agentName}`
        // Return empty/default structure validatable by schema
        // We construct a minimal valid object based on the schema if possible, or expect init to handle it.

        // For the purpose of this harness, we return a "blank" memory that the agent's initialize() will hydrate/fix.
        // This is a bit tricky with Zod types without defaults, so we mock a "fresh" state.

        const base = {
            last_active: new Date(),
            current_task_id: undefined
        };

        // Specific mocks for known agents to avoid schema validation errors in this non-DB env
        if (agentName === 'craig') return { ...base, campaigns: [] } as any;
        if (agentName === 'smokey') return { ...base, rec_policies: [], ux_experiments: [], faq_coverage: { unanswered_questions_last_7d: [], todo_items: [] } } as any;
        if (agentName === 'pops') return { ...base, hypotheses_backlog: [], decision_journal: [] } as any;
        if (agentName === 'ezal') return { ...base, competitor_watchlist: [], menu_snapshots: [], open_gaps: [] } as any;
        if (agentName === 'money_mike') return { ...base, pricing_rules: [], pricing_experiments: [] } as any;
        if (agentName === 'mrs_parker') return { ...base, loyalty_segments: [], journeys: [] } as any;

        return base as T;
    },

    async saveAgentMemory<T extends AgentMemory>(brandId: string, agentName: string, memory: T): Promise<void> {
        logger.info(`[Persistence] Saved memory for ${agentName} (Brand: ${brandId})`);
        // Stub: Firestore.doc(...).set(memory)
    },

    async appendLog(brandId: string, agentName: string, entry: AgentLogEntry): Promise<void> {
        logger.info(`[Persistence] Log appended for ${agentName}: ${entry.action} -> ${entry.result}`);
        // Stub: Firestore.collection(...).add(entry)
    },

    // Specific method to get recent logs for UI
    async getRecentLogs(brandId: string, limit: number = 20): Promise<AgentLogEntry[]> {
        return [
            {
                id: 'log_stub_1',
                timestamp: new Date(),
                agent_name: 'craig',
                action: 'monitor_campaign',
                result: 'Campaign showing positive lift.',
                target_id: 'camp_1'
            },
            {
                id: 'log_stub_2',
                timestamp: new Date(),
                agent_name: 'smokey',
                action: 'optimize_menu',
                result: 'Re-ranked homepage carousel.',
                target_id: 'exp_ux_1'
            }
        ];
    }
};
