/**
 * Slack Response Archive Service
 * Persists agent responses to Firestore for audit trail and history
 */

import { DocumentData, DocumentSnapshot } from '@google-cloud/firestore';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';

export interface SlackResponseRecord {
    // Metadata
    timestamp: Date;
    slackUserId: string;
    slackUserEmail?: string;
    channel: string;
    channelName?: string;
    threadTs: string;
    messageTs?: string;

    // Request
    userMessage: string;
    agent: string;
    agentName: string;

    // Response
    agentResponse: string;
    responseLength: number;

    // Context
    isDm: boolean;
    isChannelMsg: boolean;
    requestType: 'dm' | 'mention' | 'channel' | 'slash-command' | 'thread' | 'approval_required';

    // Indexed fields for queries
    date: string; // YYYY-MM-DD for daily grouping
    month: string; // YYYY-MM for monthly grouping
}

const firestore = getAdminFirestore();

/**
 * Archive a Slack agent response to Firestore
 * Collection: slack_responses
 * Document ID: auto-generated timestamp-based
 */
export async function archiveSlackResponse(record: SlackResponseRecord): Promise<void> {
    try {
        const docRef = firestore.collection('slack_responses').doc();

        await docRef.set({
            ...record,
            timestamp: record.timestamp || new Date(),
        });

        logger.info(`[SlackArchive] Archived response from ${record.agent} (${docRef.id})`);
    } catch (err: any) {
        logger.error(`[SlackArchive] Failed to archive response: ${err.message}`);
        // Don't throw — archiving is non-critical
    }
}

/**
 * Query responses by agent
 */
export async function getResponsesByAgent(
    agent: string,
    limit: number = 50
): Promise<SlackResponseRecord[]> {
    try {
        const snapshot = await firestore
            .collection('slack_responses')
            .where('agent', '==', agent)
            .orderBy('timestamp', 'desc')
            .limit(limit)
            .get();

        return snapshot.docs.map((doc) => doc.data() as SlackResponseRecord);
    } catch (err: any) {
        logger.error(`[SlackArchive] Failed to query responses: ${err.message}`);
        return [];
    }
}

/**
 * Query responses by date range
 */
export async function getResponsesByDateRange(
    startDate: Date,
    endDate: Date,
    agent?: string
): Promise<SlackResponseRecord[]> {
    try {
        let query = firestore
            .collection('slack_responses')
            .where('timestamp', '>=', startDate)
            .where('timestamp', '<=', endDate)
            .orderBy('timestamp', 'desc');

        if (agent) {
            query = query.where('agent', '==', agent);
        }

        const snapshot = await query.get();
        return snapshot.docs.map((doc) => doc.data() as SlackResponseRecord);
    } catch (err: any) {
        logger.error(`[SlackArchive] Failed to query date range: ${err.message}`);
        return [];
    }
}

/**
 * Get response statistics for a channel or user
 */
export async function getResponseStats(
    type: 'channel' | 'user',
    id: string
): Promise<{ totalResponses: number; agentBreakdown: Record<string, number> }> {
    try {
        const field = type === 'channel' ? 'channel' : 'slackUserId';
        const snapshot = await firestore
            .collection('slack_responses')
            .where(field, '==', id)
            .get();

        const stats = {
            totalResponses: snapshot.size,
            agentBreakdown: {} as Record<string, number>,
        };

        snapshot.docs.forEach((doc) => {
            const data = doc.data() as SlackResponseRecord;
            stats.agentBreakdown[data.agent] = (stats.agentBreakdown[data.agent] || 0) + 1;
        });

        return stats;
    } catch (err: any) {
        logger.error(`[SlackArchive] Failed to get stats: ${err.message}`);
        return { totalResponses: 0, agentBreakdown: {} };
    }
}

/**
 * Delete old responses (data retention policy)
 * Call this via scheduled Cloud Task
 */
export async function deleteOldResponses(daysToKeep: number = 90): Promise<number> {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

        const snapshot = await firestore
            .collection('slack_responses')
            .where('timestamp', '<', cutoffDate)
            .limit(100) // Batch limit to prevent timeout
            .get();

        let deleted = 0;
        const batch = firestore.batch();

        snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
            deleted++;
        });

        if (deleted > 0) {
            await batch.commit();
            logger.info(`[SlackArchive] Deleted ${deleted} old responses`);
        }

        return deleted;
    } catch (err: any) {
        logger.error(`[SlackArchive] Failed to delete old responses: ${err.message}`);
        return 0;
    }
}
