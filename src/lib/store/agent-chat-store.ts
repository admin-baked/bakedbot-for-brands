import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ChatMessage {
    id: string;
    type: 'user' | 'agent';
    content: string;
    timestamp: Date;
    thinking?: {
        isThinking: boolean;
        steps: any[];
        plan: string[];
    };
}

export interface ChatSession {
    id: string;
    title: string;
    preview: string;
    timestamp: Date;
    messages: ChatMessage[];
}

interface AgentChatState {
    sessions: ChatSession[];
    activeSessionId: string | null;
    currentMessages: ChatMessage[];

    // Actions
    addMessage: (message) => {
        set((state) => {
                    const newMessages = [...state.currentMessages, message];

// If we have an active session, update it in the sessions list too
let newSessions = state.sessions;
if (state.activeSessionId) {
    newSessions = state.sessions.map(s =>
        s.id === state.activeSessionId
            ? { ...s, messages: newMessages, preview: message.content.slice(0, 50) } // Update preview too
            : s
    );
}

return {
    currentMessages: newMessages,
    sessions: newSessions
};
                });
            },

updateMessage: (id, updates) => {
    set((state) => {
        const newMessages = state.currentMessages.map(m =>
            m.id === id ? { ...m, ...updates } : m
        );

        // Sync back to session if active
        let newSessions = state.sessions;
        if (state.activeSessionId) {
            newSessions = state.sessions.map(s =>
                s.id === state.activeSessionId
                    ? { ...s, messages: newMessages }
                    : s
            );
        }

        return {
            currentMessages: newMessages,
            sessions: newSessions
        };
    });
},

    setActiveSession: (sessionId) => {
        const { sessions, activeSessionId, currentMessages, createSession } = get();

        // If we are currently in "New Chat" (null activeSessionId) and have messages, save them first
        if (!activeSessionId && currentMessages.length > 0) {
            createSession(); // This saves currentMessages to a new session
            // Re-fetch sessions after creation
            const updatedSessions = get().sessions;
            const session = updatedSessions.find(s => s.id === sessionId);
            if (session) {
                set({
                    activeSessionId: sessionId,
                    currentMessages: session.messages
                });
            }
            return;
        }

        const session = sessions.find(s => s.id === sessionId);
        if (session) {
            set({
                activeSessionId: sessionId,
                currentMessages: session.messages
            });
        }
    },

        clearCurrentSession: () => {
            const { currentMessages, activeSessionId, createSession } = get();
            // If we have an active session, this just deselects it (New Chat Mode)
            // If we are already in New Chat mode and have messages, maybe save them?
            // Standard behavior for "New Chat" button is to archive current and start fresh.

            if (currentMessages.length > 0) {
                // If it was a draft (no ID), save it. If it was an active session, it's already updated in `sessions` by addMessage/updateMessage.
                if (!activeSessionId) {
                    createSession();
                }
            }

            set({ activeSessionId: null, currentMessages: [] });
        },

            createSession: (firstMessage) => {
                const { currentMessages } = get();
                // If there are messages in the current view that need saving
                const messagesToSave = currentMessages.length > 0 ? currentMessages : (firstMessage ? [firstMessage] : []);

                if (messagesToSave.length > 0) {
                    const firstMsg = messagesToSave.find(m => m.type === 'user') || messagesToSave[0];
                    const newSession: ChatSession = {
                        id: `session-${Date.now()}`,
                        title: firstMsg?.content.slice(0, 30) || 'New Chat',
                        preview: firstMsg?.content.slice(0, 50) || '',
                        timestamp: new Date(),
                        messages: messagesToSave,
                    };

                    set((state) => ({
                        sessions: [newSession, ...state.sessions]
                    }));
                }

                // Reset for new chat
                set({
                    activeSessionId: null,
                    currentMessages: []
                });
            },
        }),
{
    name: 'agent-chat-storage',
        partialize: (state) => ({
            sessions: state.sessions,
            activeSessionId: state.activeSessionId,
            currentMessages: state.currentMessages
        }),
        }
    )
);

