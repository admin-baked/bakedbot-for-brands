/**
 * Conversation Session Management
 * 
 * Manages chat sessions with context memory for multi-turn conversations.
 * Stores conversation history in Firestore for persistence.
 */

'use server';

import { createServerClient } from '@/firebase/server-client';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Timestamp;
    productReferences?: string[];
}

export interface ChatSession {
    id: string;
    userId: string;
    messages: ChatMessage[];
    summary?: string;
    startedAt: Timestamp;
    lastActiveAt: Timestamp;
    expiresAt: Timestamp;
}

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const MAX_MESSAGES_IN_CONTEXT = 10; // Last 10 messages for context

/**
 * Create a new chat session
 */
export async function createChatSession(userId: string): Promise<string> {
    const { firestore } = await createServerClient();

    const now = Timestamp.now();
    const expiresAt = Timestamp.fromMillis(now.toMillis() + SESSION_TIMEOUT_MS);

    const sessionRef = firestore.collection('users').doc(userId).collection('chatSessions').doc();

    await sessionRef.set({
        messages: [],
        startedAt: now,
        lastActiveAt: now,
        expiresAt,
    });

    return sessionRef.id;
}

/**
 * Get an existing chat session
 */
export async function getChatSession(userId: string, sessionId: string): Promise<ChatSession | null> {
    const { firestore } = await createServerClient();

    const sessionRef = firestore.collection('users').doc(userId).collection('chatSessions').doc(sessionId);
    const doc = await sessionRef.get();

    if (!doc.exists) {
        return null;
    }

    const data = doc.data()!;

    // Check if session has expired
    if (data.expiresAt.toMillis() < Date.now()) {
        return null;
    }

    return {
        id: doc.id,
        userId,
        ...data,
    } as ChatSession;
}

/**
 * Add a message to a chat session
 */
export async function addMessageToSession(
    userId: string,
    sessionId: string,
    message: Omit<ChatMessage, 'timestamp'>
): Promise<void> {
    const { firestore } = await createServerClient();

    const sessionRef = firestore.collection('users').doc(userId).collection('chatSessions').doc(sessionId);
    const now = Timestamp.now();
    const expiresAt = Timestamp.fromMillis(now.toMillis() + SESSION_TIMEOUT_MS);

    await sessionRef.update({
        messages: FieldValue.arrayUnion({
            ...message,
            timestamp: now,
        }),
        lastActiveAt: now,
        expiresAt,
    });
}

/**
 * Get conversation context for AI
 * Returns the last N messages formatted for the AI prompt
 */
export async function getConversationContext(
    userId: string,
    sessionId: string
): Promise<ChatMessage[]> {
    const session = await getChatSession(userId, sessionId);

    if (!session) {
        return [];
    }

    // Return last N messages
    return session.messages.slice(-MAX_MESSAGES_IN_CONTEXT);
}

/**
 * Summarize a long conversation
 * TODO: Implement using Gemini API to create a summary
 */
export async function summarizeConversation(
    userId: string,
    sessionId: string
): Promise<string> {
    const session = await getChatSession(userId, sessionId);

    if (!session || session.messages.length < 10) {
        return '';
    }

    // TODO: Use Gemini to create a summary of the conversation
    // For now, return a simple summary
    const userMessages = session.messages.filter(m => m.role === 'user').length;
    const assistantMessages = session.messages.filter(m => m.role === 'assistant').length;

    return `Conversation with ${userMessages} user messages and ${assistantMessages} assistant responses.`;
}

/**
 * Clear conversation context
 */
export async function clearChatSession(userId: string, sessionId: string): Promise<void> {
    const { firestore } = await createServerClient();

    const sessionRef = firestore.collection('users').doc(userId).collection('chatSessions').doc(sessionId);
    await sessionRef.delete();
}

/**
 * Clean up expired sessions
 * Should be called periodically (e.g., via Cloud Function)
 */
export async function cleanupExpiredSessions(userId: string): Promise<number> {
    const { firestore } = await createServerClient();

    const now = Timestamp.now();
    const sessionsRef = firestore.collection('users').doc(userId).collection('chatSessions');

    const expiredSessions = await sessionsRef.where('expiresAt', '<', now).get();

    const batch = firestore.batch();
    expiredSessions.docs.forEach(doc => {
        batch.delete(doc.ref);
    });

    await batch.commit();

    return expiredSessions.size;
}
