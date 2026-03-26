'use server';

import { createServerClient } from '@/firebase/server-client';
import { firestoreTimestampToDate } from '@/lib/firestore-utils';
import type { ChatSession } from '@/lib/store/agent-chat-store';
import { logger } from '@/lib/monitoring';
import { requireUser } from '@/server/auth/auth';

function isSuperRole(role: unknown): boolean {
    if (Array.isArray(role)) {
        return role.includes('super_user') || role.includes('super_admin');
    }
    return role === 'super_user' || role === 'super_admin';
}

function isValidUserId(userId: string): boolean {
    return !!userId && !userId.includes('/');
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

function serializeTemporalValue(value: unknown): string | null {
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value.toISOString();
    }

    if (value && typeof value === 'object') {
        return firestoreTimestampToDate(value)?.toISOString() ?? null;
    }

    return null;
}

function serializeForActionTransport<T>(value: T): T {
    const serializedTemporalValue = serializeTemporalValue(value);
    if (serializedTemporalValue) {
        return serializedTemporalValue as T;
    }

    if (Array.isArray(value)) {
        return value.map((entry) => serializeForActionTransport(entry)) as T;
    }

    if (isPlainObject(value)) {
        return Object.fromEntries(
            Object.entries(value).map(([key, entry]) => [
                key,
                serializeForActionTransport(entry),
            ]),
        ) as T;
    }

    return value;
}

export async function saveChatSession(session: ChatSession) {
    try {
        const user = await requireUser();
        const normalizedSessionId = typeof session.id === 'string' ? session.id.trim() : '';
        if (!isValidUserId(normalizedSessionId)) {
            return { success: false, error: 'Invalid session id' };
        }
        const { firestore } = await createServerClient();

        await firestore.collection('users').doc(user.uid).collection('chat_sessions').doc(normalizedSessionId).set({
            ...session,
            id: normalizedSessionId,
            updatedAt: new Date(),
            userId: user.uid
        }, { merge: true });

        return { success: true };
    } catch (error: any) {
        logger.error('Failed to save chat session', error);
        return { success: false, error: error.message };
    }
}

export async function getChatSessions(userId?: string) {
    try {
        const user = await requireUser();
        const requestedUserId = userId?.trim();
        if (typeof userId === 'string' && requestedUserId?.length === 0) {
            return { success: false, error: 'Invalid user id' };
        }
        const targetId = requestedUserId || user.uid;

        if (!isValidUserId(targetId)) {
            return { success: false, error: 'Invalid user id' };
        }

        if (requestedUserId && requestedUserId !== user.uid && !isSuperRole((user as { role?: string }).role)) {
            logger.warn(`Unauthorized chat session access attempt by ${user.uid} for ${requestedUserId}`);
            return { success: false, error: 'Unauthorized' };
        }

        const { firestore } = await createServerClient();

        const snapshot = await firestore.collection('users').doc(targetId).collection('chat_sessions')
            .orderBy('timestamp', 'desc')
            .limit(20)
            .get();

        const sessions = snapshot.docs.map(doc => {
            const data = doc.data();
            // Ensure messages and artifacts are arrays (guard against corrupt data)
            const messagesArray = Array.isArray(data.messages) ? data.messages : [];
            const artifactsArray = Array.isArray(data.artifacts) ? data.artifacts : [];

            // Serialize to plain objects to ensure safe transfer over RSC boundary
            return {
                id: doc.id,
                title: data.title || 'Untitled Chat',
                preview: data.preview || '',
                // Return as ISO string for safety, client will hydrate
                timestamp: serializeTemporalValue(data.timestamp) ?? new Date().toISOString(),
                messages: serializeForActionTransport(messagesArray),
                role: data.role,
                projectId: data.projectId,
                artifacts: serializeForActionTransport(artifactsArray),
            };
        });

        return { success: true, sessions };
    } catch (error: any) {
        logger.error('Failed to get chat sessions', error);
        // Return a clean error object, do not throw
        return { success: false, error: error.message || 'Unknown error' };
    }
}
