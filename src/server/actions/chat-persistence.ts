'use server';

import { createServerClient } from '@/firebase/server-client';
import { firestoreTimestampToDate } from '@/lib/firestore-utils';
import type { ChatSession } from '@/lib/store/agent-chat-store';
import { logger } from '@/lib/logger';
import { requireUser } from '@/server/auth/auth';
import { SUPER_USER_ROLES, type UserRole } from '@/types/roles';

function isSuperRole(role: unknown): boolean {
    if (Array.isArray(role)) {
        return role.some(r => SUPER_USER_ROLES.includes(r as UserRole));
    }
    return SUPER_USER_ROLES.includes(role as UserRole);
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

function serializeForActionTransport<T>(value: T, seen = new WeakSet<object>()): T {
    const serializedTemporalValue = serializeTemporalValue(value);
    if (serializedTemporalValue) {
        return serializedTemporalValue as T;
    }

    if (Array.isArray(value)) {
        return value.map((entry) => serializeForActionTransport(entry, seen)) as T;
    }

    if (!value || typeof value !== 'object') {
        return value;
    }

    if (value instanceof Error) {
        return {
            name: value.name,
            message: value.message,
            stack: value.stack,
        } as T;
    }

    if (value instanceof URL) {
        return value.toString() as T;
    }

    if (value instanceof Set) {
        return Array.from(value, (entry) => serializeForActionTransport(entry, seen)) as T;
    }

    if (value instanceof Map) {
        return Object.fromEntries(
            Array.from(value.entries(), ([key, entry]) => [
                String(key),
                serializeForActionTransport(entry, seen),
            ]),
        ) as T;
    }

    if (seen.has(value)) {
        return '[Circular]' as T;
    }

    seen.add(value);

    try {
        if (
            'toJSON' in value &&
            typeof (value as { toJSON?: unknown }).toJSON === 'function'
        ) {
            return serializeForActionTransport(
                (value as { toJSON(): unknown }).toJSON(),
                seen,
            ) as T;
        }

        if (isPlainObject(value) || Object.keys(value).length > 0) {
            return Object.fromEntries(
                Object.entries(value).map(([key, entry]) => [
                    key,
                    serializeForActionTransport(entry, seen),
                ]),
            ) as T;
        }

        return String(value) as T;
    } finally {
        seen.delete(value);
    }
}

function getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message.trim().length > 0) {
        return error.message;
    }

    if (typeof error === 'string' && error.trim().length > 0) {
        return error;
    }

    return fallback;
}

function getErrorLogData(error: unknown): Record<string, unknown> {
    if (error instanceof Error) {
        return {
            error: error.message,
            name: error.name,
            stack: error.stack,
        };
    }

    if (error && typeof error === 'object') {
        return {
            error: getErrorMessage(error, 'Unknown error'),
            details: serializeForActionTransport(error),
        };
    }

    return {
        error: getErrorMessage(error, 'Unknown error'),
    };
}

async function logSafely(
    level: 'warn' | 'error',
    message: string,
    data: Record<string, unknown>,
): Promise<void> {
    try {
        await logger[level](message, data);
    } catch (loggingError: unknown) {
        console.error(`[chat-persistence] ${message}`, {
            ...data,
            loggingError: getErrorMessage(loggingError, 'Unknown logging error'),
        });
    }
}

export async function saveChatSession(session: ChatSession) {
    const normalizedSessionId = typeof session.id === 'string' ? session.id.trim() : '';

    try {
        const user = await requireUser();
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
    } catch (error: unknown) {
        await logSafely('error', 'Failed to save chat session', {
            sessionId: normalizedSessionId || null,
            ...getErrorLogData(error),
        });
        return { success: false, error: getErrorMessage(error, 'Failed to save chat session') };
    }
}

export async function getChatSessions(userId?: string) {
    const requestedUserId = userId?.trim();

    try {
        const user = await requireUser();
        if (typeof userId === 'string' && requestedUserId?.length === 0) {
            return { success: false, error: 'Invalid user id' };
        }
        const targetId = requestedUserId || user.uid;

        if (!isValidUserId(targetId)) {
            return { success: false, error: 'Invalid user id' };
        }

        if (requestedUserId && requestedUserId !== user.uid && !isSuperRole((user as { role?: string }).role)) {
            await logSafely('warn', 'Unauthorized chat session access attempt', {
                userId: user.uid,
                requestedUserId,
            });
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
    } catch (error: unknown) {
        await logSafely('error', 'Failed to get chat sessions', {
            requestedUserId: requestedUserId || null,
            ...getErrorLogData(error),
        });
        return { success: false, error: getErrorMessage(error, 'Unknown error') };
    }
}
