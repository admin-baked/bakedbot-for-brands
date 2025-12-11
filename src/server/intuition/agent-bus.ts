/**
 * Intuition OS - Multi-Agent Coordination
 * 
 * Agent Messaging Bus
 * 
 * Enables agents to share insights and coordinate actions.
 * Example: Pops detects demand spike → Smokey boosts product in recs
 */

import {
    AgentMessage,
    AgentName,
    MessageTopic,
} from './schema';
import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';

// --- Collection Path ---

function getMessagesCollection(tenantId: string) {
    return `tenants/${tenantId}/agentMessages`;
}

// --- Message Sending ---

/**
 * Sends a message from one agent to another (or broadcast).
 */
export async function sendAgentMessage(
    tenantId: string,
    message: {
        fromAgent: AgentName;
        toAgent: AgentName | 'broadcast';
        topic: MessageTopic;
        payload: Record<string, any>;
        requiredReactions?: AgentName[];
        expiresInHours?: number;
    }
): Promise<AgentMessage> {
    const { firestore } = await createServerClient();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (message.expiresInHours || 24) * 60 * 60 * 1000);

    const agentMessage: AgentMessage = {
        id: uuidv4(),
        tenantId,
        fromAgent: message.fromAgent,
        toAgent: message.toAgent,
        topic: message.topic,
        payload: message.payload,
        requiredReactions: message.requiredReactions || [],
        reactions: {},
        expiresAt: expiresAt.toISOString(),
        createdAt: now.toISOString(),
    };

    await firestore
        .collection(getMessagesCollection(tenantId))
        .doc(agentMessage.id)
        .set(agentMessage);

    logger.info(`[AgentBus] ${message.fromAgent} → ${message.toAgent}: ${message.topic}`);
    return agentMessage;
}

/**
 * Records an agent's reaction to a message.
 */
export async function recordReaction(
    tenantId: string,
    messageId: string,
    agent: AgentName,
    reaction: {
        acknowledged: boolean;
        actionTaken?: string;
    }
): Promise<void> {
    const { firestore } = await createServerClient();

    await firestore
        .collection(getMessagesCollection(tenantId))
        .doc(messageId)
        .update({
            [`reactions.${agent}`]: {
                ...reaction,
                timestamp: new Date().toISOString(),
            },
        });

    logger.debug(`[AgentBus] ${agent} reacted to ${messageId}: ${reaction.actionTaken || 'acknowledged'}`);
}

// --- Message Retrieval ---

/**
 * Gets pending messages for an agent.
 */
export async function getPendingMessages(
    tenantId: string,
    forAgent: AgentName
): Promise<AgentMessage[]> {
    try {
        const { firestore } = await createServerClient();
        const now = new Date().toISOString();

        // Get broadcasts and direct messages
        const [broadcasts, direct] = await Promise.all([
            firestore
                .collection(getMessagesCollection(tenantId))
                .where('toAgent', '==', 'broadcast')
                .where('expiresAt', '>', now)
                .get(),
            firestore
                .collection(getMessagesCollection(tenantId))
                .where('toAgent', '==', forAgent)
                .where('expiresAt', '>', now)
                .get(),
        ]);

        const messages = [
            ...broadcasts.docs.map(d => d.data() as AgentMessage),
            ...direct.docs.map(d => d.data() as AgentMessage),
        ];

        // Filter out already-reacted messages
        return messages.filter(m => !m.reactions[forAgent]);
    } catch (error) {
        logger.error('[AgentBus] Failed to get pending messages',
            error instanceof Error ? error : new Error(String(error)));
        return [];
    }
}

/**
 * Gets messages requiring reaction from an agent.
 */
export async function getMessagesRequiringReaction(
    tenantId: string,
    forAgent: AgentName
): Promise<AgentMessage[]> {
    const pending = await getPendingMessages(tenantId, forAgent);
    return pending.filter(m => m.requiredReactions.includes(forAgent));
}

// --- Common Message Patterns ---

/**
 * Broadcasts a demand spike alert (Pops → All).
 */
export async function broadcastDemandSpike(
    tenantId: string,
    productId: string,
    spikePercentage: number,
    suggestedAction?: string
): Promise<AgentMessage> {
    return sendAgentMessage(tenantId, {
        fromAgent: 'pops',
        toAgent: 'broadcast',
        topic: 'demand_spike',
        payload: {
            productId,
            spikePercentage,
            suggestedAction: suggestedAction || 'boost_recommendations',
            detectedAt: new Date().toISOString(),
        },
        requiredReactions: ['smokey'],
        expiresInHours: 12,
    });
}

/**
 * Broadcasts a compliance risk alert (Deebo → All).
 */
export async function broadcastComplianceRisk(
    tenantId: string,
    riskType: string,
    severity: 'info' | 'medium' | 'critical',
    details: Record<string, any>
): Promise<AgentMessage> {
    return sendAgentMessage(tenantId, {
        fromAgent: 'deebo',
        toAgent: 'broadcast',
        topic: 'compliance_risk',
        payload: {
            riskType,
            severity,
            ...details,
        },
        requiredReactions: severity === 'critical' ? ['smokey', 'craig', 'pops'] : [],
        expiresInHours: severity === 'critical' ? 6 : 24,
    });
}

/**
 * Sends a customer trend insight (Pops → Smokey).
 */
export async function sendCustomerTrend(
    tenantId: string,
    trend: {
        trendType: string;
        affectedSegment: string;
        insight: string;
        recommendation?: string;
    }
): Promise<AgentMessage> {
    return sendAgentMessage(tenantId, {
        fromAgent: 'pops',
        toAgent: 'smokey',
        topic: 'customer_trend',
        payload: trend,
        expiresInHours: 48,
    });
}

/**
 * Sends an inventory alert (Pops → Smokey).
 */
export async function sendInventoryAlert(
    tenantId: string,
    productId: string,
    status: 'low' | 'oos' | 'overstocked',
    recommendedAction: string
): Promise<AgentMessage> {
    return sendAgentMessage(tenantId, {
        fromAgent: 'pops',
        toAgent: 'smokey',
        topic: 'inventory_alert',
        payload: {
            productId,
            status,
            recommendedAction,
        },
        requiredReactions: ['smokey'],
        expiresInHours: 6,
    });
}

// --- Message Cleanup ---

/**
 * Cleans up expired messages.
 * Should be run as part of nightly dream cycle.
 */
export async function cleanupExpiredMessages(tenantId: string): Promise<number> {
    try {
        const { firestore } = await createServerClient();
        const now = new Date().toISOString();

        const expired = await firestore
            .collection(getMessagesCollection(tenantId))
            .where('expiresAt', '<', now)
            .get();

        const batch = firestore.batch();
        for (const doc of expired.docs) {
            batch.delete(doc.ref);
        }
        await batch.commit();

        logger.info(`[AgentBus] Cleaned up ${expired.size} expired messages`);
        return expired.size;
    } catch (error) {
        logger.error('[AgentBus] Failed to cleanup messages',
            error instanceof Error ? error : new Error(String(error)));
        return 0;
    }
}
