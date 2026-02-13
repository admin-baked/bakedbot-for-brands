'use server';

import { getAdminFirestore } from '@/firebase/admin';
import { requireUser } from '@/server/auth/auth';
import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/logger';

export interface AgentConfigOverride {
    name?: string;
    title?: string;
    description?: string;
    systemPrompt?: string;
    status?: 'online' | 'training' | 'paused';
}

const COLLECTION = 'agent_configs';

/**
 * Update configuration for a specific agent
 */
export async function updateAgentConfigAction(agentId: string, data: AgentConfigOverride) {
    try {
        const user = await requireUser(['brand', 'super_user']);
        if (!user) return { success: false, error: 'Unauthorized' };

        const db = getAdminFirestore();
        // Configs are per agent ID, but in a production multi-tenant system 
        // they might be per orgId AND agentId. 
        // For this requirement, we'll store them in a way that respects the current context.
        // If the current user has an orgId, we store it under that.
        const orgId = (user as any).orgId || (user as any).locationId || 'default';

        const docId = `${orgId}_${agentId}`;
        await db.collection(COLLECTION).doc(docId).set({
            ...data,
            agentId,
            orgId,
            updatedAt: new Date().toISOString(),
            updatedBy: user.uid
        }, { merge: true });

        revalidatePath(`/dashboard/agents/${agentId}`);
        return { success: true };
    } catch (error) {
        logger.error('[AgentConfigAction] Failed to update config', { error, agentId });
        return { success: false, error: 'Failed to update agent configuration' };
    }
}

/**
 * Get configuration override for a specific agent
 */
export async function getAgentConfigOverride(agentId: string, orgId: string): Promise<AgentConfigOverride | null> {
    try {
        const db = getAdminFirestore();
        const docId = `${orgId}_${agentId}`;
        const doc = await db.collection(COLLECTION).doc(docId).get();

        if (doc.exists) {
            return doc.data() as AgentConfigOverride;
        }
        return null;
    } catch (error) {
        logger.error('[AgentConfigAction] Failed to get config', { error, agentId, orgId });
        return null;
    }
}
