'use server';

/**
 * Inbox Agent Handoff Actions
 *
 * Server-side operations for agent handoffs within inbox threads.
 * Enables runtime agent transitions with full history tracking.
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getServerSessionUser } from '@/server/auth/session';
import { logger } from '@/lib/logger';
import type {
    AgentHandoff,
    InboxAgentPersona,
} from '@/types/inbox';

const INBOX_THREADS_COLLECTION = 'inbox_threads';

/**
 * Hand off a thread from one agent to another
 *
 * @param threadId - The inbox thread ID
 * @param toAgent - The agent to hand off to
 * @param reason - Reason for the handoff
 * @param messageId - Optional: ID of the message where handoff occurred
 * @returns Success status and handoff record
 */
export async function handoffToAgent(input: {
    threadId: string;
    toAgent: InboxAgentPersona;
    reason: string;
    messageId?: string;
}): Promise<{
    success: boolean;
    handoff?: AgentHandoff;
    error?: string;
}> {
    try {
        // Auth check
        const user = await getServerSessionUser();
        if (!user) {
            return { success: false, error: 'Unauthorized' };
        }

        const { threadId, toAgent, reason, messageId } = input;

        // Get thread from Firestore
        const db = getFirestore();
        const threadRef = db.collection(INBOX_THREADS_COLLECTION).doc(threadId);
        const threadDoc = await threadRef.get();

        if (!threadDoc.exists) {
            return { success: false, error: 'Thread not found' };
        }

        const threadData = threadDoc.data();
        if (!threadData) {
            return { success: false, error: 'Thread data not found' };
        }

        const fromAgent = threadData.primaryAgent as InboxAgentPersona;

        // Create handoff record
        const handoff: AgentHandoff = {
            id: `handoff_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            fromAgent,
            toAgent,
            reason,
            timestamp: new Date(),
            messageId,
        };

        // Update thread in Firestore
        await threadRef.update({
            primaryAgent: toAgent,
            assignedAgents: FieldValue.arrayUnion(toAgent),
            handoffHistory: FieldValue.arrayUnion(handoff),
            updatedAt: FieldValue.serverTimestamp(),
            lastActivityAt: FieldValue.serverTimestamp(),
        });

        logger.info('[Inbox Handoff] Agent handoff completed', {
            threadId,
            fromAgent,
            toAgent,
            reason,
            userId: user.uid,
        });

        return {
            success: true,
            handoff,
        };
    } catch (error) {
        logger.error('[Inbox Handoff] Failed to hand off agent', error instanceof Error ? error : new Error(String(error)));
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Get handoff history for a thread
 *
 * @param threadId - The inbox thread ID
 * @returns List of handoffs
 */
export async function getHandoffHistory(threadId: string): Promise<{
    success: boolean;
    handoffs?: AgentHandoff[];
    error?: string;
}> {
    try {
        // Auth check
        const user = await getServerSessionUser();
        if (!user) {
            return { success: false, error: 'Unauthorized' };
        }

        const db = getFirestore();
        const threadRef = db.collection(INBOX_THREADS_COLLECTION).doc(threadId);
        const threadDoc = await threadRef.get();

        if (!threadDoc.exists) {
            return { success: false, error: 'Thread not found' };
        }

        const threadData = threadDoc.data();
        const handoffs = (threadData?.handoffHistory || []) as AgentHandoff[];

        // Convert timestamps
        const serializedHandoffs = handoffs.map((h) => ({
            ...h,
            timestamp: h.timestamp instanceof Date ? h.timestamp : new Date(h.timestamp),
        }));

        return {
            success: true,
            handoffs: serializedHandoffs,
        };
    } catch (error) {
        logger.error('[Inbox Handoff] Failed to get handoff history', error instanceof Error ? error : new Error(String(error)));
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
