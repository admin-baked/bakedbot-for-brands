/**
 * Response Feedback Service
 * 
 * Collects and analyzes user feedback on agent responses.
 * Inspired by Tasklet.ai's 👍/👎 feedback pattern.
 */

import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/firebase/admin';

export type FeedbackRating = 'positive' | 'negative';

export interface ResponseFeedback {
    id: string;
    messageId: string;
    conversationId: string;
    agentId: string;
    userId: string;
    tenantId: string;
    rating: FeedbackRating;
    comment?: string;
    tags?: string[];  // e.g., ['inaccurate', 'too_slow', 'helpful']
    timestamp: Date;
    prompt: string;
    responsePreview: string;  // First 200 chars of response
    metadata?: Record<string, unknown>;
}

export interface FeedbackStats {
    agentId: string;
    totalFeedback: number;
    positive: number;
    negative: number;
    positiveRate: number;
    commonTags: Array<{ tag: string; count: number }>;
    trend: 'improving' | 'declining' | 'stable';
}

// =============================================================================
// FEEDBACK COLLECTION
// =============================================================================

/**
 * Submit feedback for a response
 */
export async function submitFeedback(
    feedback: Omit<ResponseFeedback, 'id' | 'timestamp'>
): Promise<string> {
    const db = getAdminFirestore();
    
    const docRef = await db.collection('response_feedback').add({
        ...feedback,
        timestamp: FieldValue.serverTimestamp(),
    });
    
    // Update agent stats
    await updateAgentFeedbackStats(feedback.agentId, feedback.rating);
    
    return docRef.id;
}

/**
 * Update feedback with additional comment
 */
export async function addFeedbackComment(
    feedbackId: string,
    comment: string,
    tags?: string[]
): Promise<void> {
    const db = getAdminFirestore();
    
    const updateData: Record<string, unknown> = { comment };
    if (tags && tags.length > 0) {
        updateData.tags = FieldValue.arrayUnion(...tags);
    }
    
    await db.collection('response_feedback').doc(feedbackId).update(updateData);
}

// =============================================================================
// FEEDBACK ANALYSIS
// =============================================================================

/**
 * Get feedback stats for an agent
 */
export async function getAgentFeedbackStats(
    agentId: string,
    days: number = 30
): Promise<FeedbackStats> {
    const db = getAdminFirestore();
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const snapshot = await db
        .collection('response_feedback')
        .where('agentId', '==', agentId)
        .where('timestamp', '>=', Timestamp.fromDate(cutoff))
        .get();
    
    const feedback = snapshot.docs.map(doc => doc.data());
    const positive = feedback.filter(f => f.rating === 'positive').length;
    const negative = feedback.filter(f => f.rating === 'negative').length;
    const total = feedback.length;
    
    // Count tags
    const tagCounts: Record<string, number> = {};
    feedback.forEach(f => {
        (f.tags || []).forEach((tag: string) => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
    });
    
    const commonTags = Object.entries(tagCounts)
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    
    // Calculate trend (compare last 7 days to previous 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    
    const recentFeedback = feedback.filter(f => 
        f.timestamp?.toDate?.() >= weekAgo || f.timestamp >= weekAgo
    );
    const olderFeedback = feedback.filter(f => {
        const ts = f.timestamp?.toDate?.() || f.timestamp;
        return ts >= twoWeeksAgo && ts < weekAgo;
    });
    
    const recentPositiveRate = recentFeedback.length > 0
        ? recentFeedback.filter(f => f.rating === 'positive').length / recentFeedback.length
        : 0;
    const olderPositiveRate = olderFeedback.length > 0
        ? olderFeedback.filter(f => f.rating === 'positive').length / olderFeedback.length
        : 0;
    
    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (recentPositiveRate - olderPositiveRate > 0.05) trend = 'improving';
    else if (olderPositiveRate - recentPositiveRate > 0.05) trend = 'declining';
    
    return {
        agentId,
        totalFeedback: total,
        positive,
        negative,
        positiveRate: total > 0 ? positive / total : 0,
        commonTags,
        trend,
    };
}

/**
 * Get recent negative feedback for review
 */
export async function getRecentNegativeFeedback(
    agentId?: string,
    limit: number = 20
): Promise<ResponseFeedback[]> {
    const db = getAdminFirestore();
    
    let query = db
        .collection('response_feedback')
        .where('rating', '==', 'negative')
        .orderBy('timestamp', 'desc')
        .limit(limit);
    
    if (agentId) {
        query = query.where('agentId', '==', agentId);
    }
    
    const snapshot = await query.get();
    
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.() || new Date(),
    })) as ResponseFeedback[];
}

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

/**
 * Update agent-level feedback statistics
 */
async function updateAgentFeedbackStats(
    agentId: string,
    rating: FeedbackRating
): Promise<void> {
    const db = getAdminFirestore();
    const docRef = db.collection('agent_feedback_stats').doc(agentId);
    
    await db.runTransaction(async (transaction) => {
        const doc = await transaction.get(docRef);
        
        if (!doc.exists) {
            transaction.set(docRef, {
                agentId,
                totalFeedback: 1,
                positive: rating === 'positive' ? 1 : 0,
                negative: rating === 'negative' ? 1 : 0,
                lastUpdated: FieldValue.serverTimestamp(),
            });
        } else {
            transaction.update(docRef, {
                totalFeedback: FieldValue.increment(1),
                positive: rating === 'positive' ? FieldValue.increment(1) : FieldValue.increment(0),
                negative: rating === 'negative' ? FieldValue.increment(1) : FieldValue.increment(0),
                lastUpdated: FieldValue.serverTimestamp(),
            });
        }
    });
}

// =============================================================================
// FEEDBACK TAGS
// =============================================================================

export const FEEDBACK_TAGS = {
    positive: [
        { id: 'accurate', label: 'Accurate', icon: '✅' },
        { id: 'helpful', label: 'Helpful', icon: '🙌' },
        { id: 'fast', label: 'Fast', icon: '⚡' },
        { id: 'well_formatted', label: 'Well formatted', icon: '📋' },
        { id: 'exceeded_expectations', label: 'Exceeded expectations', icon: '🌟' },
    ],
    negative: [
        { id: 'inaccurate', label: 'Inaccurate', icon: '❌' },
        { id: 'incomplete', label: 'Incomplete', icon: '⚠️' },
        { id: 'too_slow', label: 'Too slow', icon: '🐢' },
        { id: 'confusing', label: 'Confusing', icon: '❓' },
        { id: 'wrong_format', label: 'Wrong format', icon: '📝' },
        { id: 'didnt_understand', label: "Didn't understand request", icon: '🤔' },
    ],
};
