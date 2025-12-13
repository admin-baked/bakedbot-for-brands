import { BrandDomainMemory, AgentMemory, AgentLogEntry } from './schemas';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// --- Memory Adapter Interface ---

export interface MemoryAdapter {
    loadBrandMemory(brandId: string): Promise<BrandDomainMemory>;
    loadAgentMemory<T extends AgentMemory>(brandId: string, agentName: string): Promise<T>;
    saveAgentMemory<T extends AgentMemory>(brandId: string, agentName: string, memory: T): Promise<void>;
    appendLog(brandId: string, agentName: string, entry: AgentLogEntry): Promise<void>;
    getRecentLogs(brandId: string, limit?: number): Promise<AgentLogEntry[]>;
}


// --- Mock Adapter (Dev/Test) ---

export const mockMemoryAdapter: MemoryAdapter = {
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

    async loadAgentMemory<T extends AgentMemory>(brandId: string, agentName: string): Promise<T> {
        const base = {
            last_active: new Date(),
            current_task_id: undefined
        };

        // Specific mocks for known agents to avoid schema validation errors in this non-DB env
        // Note: In a real adapter, we'd just fetch the JSON/Doc.
        if (agentName === 'craig') return { ...base, campaigns: [] } as any;
        if (agentName === 'smokey') return { ...base, rec_policies: [], ux_experiments: [], faq_coverage: { unanswered_questions_last_7d: [], todo_items: [] } } as any;
        if (agentName === 'pops') return { ...base, hypotheses_backlog: [], decision_journal: [] } as any;
        if (agentName === 'ezal') return { ...base, competitor_watchlist: [], menu_snapshots: [], open_gaps: [] } as any;
        if (agentName === 'money_mike') return { ...base, pricing_rules: [], pricing_experiments: [] } as any;
        if (agentName === 'mrs_parker') return { ...base, loyalty_segments: [], journeys: [] } as any;

        return base as T;
    },

    async saveAgentMemory<T extends AgentMemory>(brandId: string, agentName: string, memory: T): Promise<void> {
        logger.info(`[MockPersistence] Saved memory for ${agentName} (Brand: ${brandId})`);
    },

    async appendLog(brandId: string, agentName: string, entry: AgentLogEntry): Promise<void> {
        logger.info(`[MockPersistence] Log appended for ${agentName}: ${entry.action} -> ${entry.result}`);
    },

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


// --- Firestore Adapter (Prod) ---
// --- Firestore Adapter (Prod) ---

import { createServerClient } from '@/firebase/server-client';

export const firestoreMemoryAdapter: MemoryAdapter = {
    async loadBrandMemory(brandId: string): Promise<BrandDomainMemory> {
        const { firestore } = await createServerClient();
        const doc = await firestore.doc(`tenants/${brandId}/domain_memory/profile`).get();

        if (!doc.exists) {
            // Return default/empty structure if not found (or could throw)
            return {
                brand_profile: { name: 'New Brand' },
                priority_objectives: [],
                constraints: { jurisdictions: [] },
                segments: [],
                experiments_index: [],
                playbooks: {}
            };
        }
        return doc.data() as BrandDomainMemory;
    },

    async loadAgentMemory<T extends AgentMemory>(brandId: string, agentName: string): Promise<T> {
        const { firestore } = await createServerClient();
        const doc = await firestore.doc(`tenants/${brandId}/agents/${agentName}/memory`).get();

        if (!doc.exists) {
            // Fallback to mock/default for cold start
            return mockMemoryAdapter.loadAgentMemory(brandId, agentName);
        }
        return doc.data() as T;
    },

    async saveAgentMemory<T extends AgentMemory>(brandId: string, agentName: string, memory: T): Promise<void> {
        const { firestore } = await createServerClient();
        const docRef = firestore.doc(`tenants/${brandId}/agents/${agentName}/memory`);

        await docRef.set({
            ...memory,
            last_active: new Date() // Ensure timestamp update
        }, { merge: true });

        logger.info(`[FirestorePersistence] Saved memory for ${agentName} (Brand: ${brandId})`);
    },

    async appendLog(brandId: string, agentName: string, entry: AgentLogEntry): Promise<void> {
        const { firestore } = await createServerClient();
        const collection = firestore.collection(`tenants/${brandId}/agents/${agentName}/logs`);

        await collection.add({
            ...entry,
            timestamp: new Date() // Server timestamp preferrable but Date OK for now
        });
    },

    async getRecentLogs(brandId: string, limit: number = 20): Promise<AgentLogEntry[]> {
        // Return empty for now as we don't have a cross-agent log view efficiently indexed yet
        return [];
    }
};



// Export default adapter based on env
export const persistence = process.env.NODE_ENV === 'production' ? firestoreMemoryAdapter : mockMemoryAdapter;

