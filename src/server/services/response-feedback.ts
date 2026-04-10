import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';

export type ResponseFeedbackRating = 'positive' | 'negative' | 'neutral';
export type ResponseFeedbackSource =
    | 'user_ui'
    | 'slack_auto'
    | 'slack_incident'
    | 'qa_benchmark'
    | 'system';

export interface ResponseFeedbackInput {
    agentName: string;
    rating: ResponseFeedbackRating;
    source?: ResponseFeedbackSource;
    orgId?: string | null;
    brandId?: string | null;
    messageId?: string | null;
    conversationId?: string | null;
    comment?: string | null;
    reason?: string | null;
    channel?: string | null;
    userMessage?: string | null;
    agentResponse?: string | null;
    metadata?: Record<string, unknown>;
}

function normalizeText(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

export async function recordResponseFeedback(
    input: ResponseFeedbackInput
): Promise<{ success: boolean; id?: string; error?: string }> {
    const agentName = normalizeText(input.agentName)?.toLowerCase();
    if (!agentName) {
        return { success: false, error: 'agentName is required' };
    }

    try {
        const db = getAdminFirestore();
        const now = new Date();
        const nowIso = now.toISOString();

        const docRef = await db.collection('response_feedback').add({
            agentName,
            rating: input.rating,
            source: input.source || 'system',
            orgId: input.orgId || null,
            brandId: input.brandId || null,
            messageId: normalizeText(input.messageId),
            conversationId: normalizeText(input.conversationId),
            channel: normalizeText(input.channel),
            comment: normalizeText(input.comment),
            reason: normalizeText(input.reason),
            userMessage: normalizeText(input.userMessage),
            agentResponse: normalizeText(input.agentResponse),
            metadata: input.metadata || null,
            createdAt: nowIso,
            updatedAt: nowIso,
        });

        return { success: true, id: docRef.id };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.warn('[ResponseFeedback] Failed to record feedback', {
            agentName,
            rating: input.rating,
            source: input.source || 'system',
            error: message,
        });
        return { success: false, error: message };
    }
}
