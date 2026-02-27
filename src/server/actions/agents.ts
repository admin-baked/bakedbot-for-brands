'use server';

import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';
import { agents as DEFAULT_AGENTS, AgentId } from '@/config/agents';

function isSuperRole(role: unknown): boolean {
    return role === 'super_user' || role === 'super_admin';
}

function getActorOrgId(user: unknown): string | null {
    if (!user || typeof user !== 'object') return null;
    const token = user as {
        uid?: string;
        currentOrgId?: string;
        orgId?: string;
        brandId?: string;
    };
    return token.currentOrgId || token.orgId || token.brandId || token.uid || null;
}

export interface AgentEntity {
    id: string; // "smokey", "craig", etc.
    name: string;
    title: string;
    description: string;
    status: 'online' | 'training' | 'paused';
    // We don't store the Icon component in DB
    primaryMetricLabel: string;
    primaryMetricValue: string;
    href: string;
    tag?: string;
    updatedAt: Date;
}

/**
 * List all agents for a brand.
 * Seeds default agents if none exist.
 */
export async function listBrandAgents(brandId: string): Promise<AgentEntity[]> {
    if (!brandId || brandId.includes('/')) {
        throw new Error('Invalid brandId');
    }

    const user = await requireUser();
    const role = typeof user === 'object' && user ? (user as { role?: string }).role : null;
    const isSuperUser = isSuperRole(role);
    const actorOrgId = getActorOrgId(user);
    if (!isSuperUser && actorOrgId && brandId !== actorOrgId) {
        throw new Error('Unauthorized');
    }

    const { firestore } = await createServerClient();

    const collectionRef = firestore.collection('brands').doc(brandId).collection('agents');
    const snap = await collectionRef.get();

    if (snap.empty) {
        // Seed defaults
        const batch = firestore.batch();
        const seededAgents: AgentEntity[] = [];
        const timestamp = new Date();

        DEFAULT_AGENTS.forEach(agent => {
            const newDocRef = collectionRef.doc(agent.id); // Use specific ID (smokey, craig)

            // Exclude icon from DB payload
            const { icon, ...agentData } = agent;

            const dbPayload = {
                ...agentData,
                updatedAt: timestamp,
            };

            batch.set(newDocRef, dbPayload);

            seededAgents.push({
                ...dbPayload,
                id: agent.id,
                updatedAt: timestamp
            } as AgentEntity);
        });

        await batch.commit();
        return seededAgents;
    }

    return snap.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            // Convert Firestore timestamps to Dates if needed
            updatedAt: data.updatedAt?.toDate() || new Date()
        } as AgentEntity;
    });
}
