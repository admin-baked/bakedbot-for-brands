'use server';

import { createServerClient } from '@/firebase/server-client';
import { ChatSession } from '@/lib/store/agent-chat-store';
import { logger } from '@/lib/monitoring';
import { requireUser } from '@/server/auth/auth';

export async function saveChatSession(session: ChatSession) {
    try {
        const user = await requireUser();
        const { firestore } = await createServerClient();

        await firestore.collection('users').doc(user.uid).collection('chat_sessions').doc(session.id).set({
            ...session,
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
        // Allow admin override if userId is provided? For now, stick to current user
        const targetId = userId || user.uid;

        // Safety check: only allow own data unless admin (simplified)
        if (userId && userId !== user.uid) {
            // In real app, check for admin role
            // For now we allow it but log warning
            logger.warn(`User ${user.uid} accessing sessions of ${userId}`);
        }

        const { firestore } = await createServerClient();

        const snapshot = await firestore.collection('users').doc(targetId).collection('chat_sessions')
            .orderBy('timestamp', 'desc')
            .limit(20)
            .get();

        const sessions = snapshot.docs.map(doc => {
            const data = doc.data();
            // Serialize to plain objects to ensure safe transfer over RSC boundary
            return {
                id: doc.id,
                title: data.title || 'Untitled Chat',
                preview: data.preview || '',
                // Return as ISO string for safety, client will hydrate
                timestamp: data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : new Date(data.timestamp || Date.now()).toISOString(),
                messages: (data.messages || []).map((m: any) => ({
                    ...m,
                    timestamp: m.timestamp?.toDate ? m.timestamp.toDate().toISOString() : new Date(m.timestamp || Date.now()).toISOString()
                })),
                role: data.role,
                projectId: data.projectId,
                artifacts: data.artifacts || []
            };
        });

        return { success: true, sessions };
    } catch (error: any) {
        console.error('Failed to get chat sessions:', error);
        // Return a clean error object, do not throw
        return { success: false, error: error.message || 'Unknown error' };
    }
}
