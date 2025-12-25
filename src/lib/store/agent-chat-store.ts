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
    metadata?: {
        type?: 'compliance_report' | 'product_rec' | 'elasticity_analysis' | 'session_context';
        data?: any;
        brandId?: string;
        brandName?: string;
        agentName?: string;
        role?: string;
        media?: {
            type: 'image' | 'video';
            url: string;
            prompt?: string;
            duration?: number;
            model?: string;
        } | null;
    };
}

export interface ChatSession {
    id: string;
    title: string;
    preview: string;
    timestamp: Date;
    messages: ChatMessage[];
    role?: string; // e.g. 'brand', 'dispensary', 'owner'
}

interface AgentChatState {
    sessions: ChatSession[];
    activeSessionId: string | null;
    currentMessages: ChatMessage[];
    currentRole: string | null;

    // Actions
    setCurrentRole: (role: string) => void;
    createSession: (firstMessage?: ChatMessage, role?: string) => void;
    setActiveSession: (sessionId: string) => void;
    addMessage: (message: ChatMessage) => void;
    updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
    clearCurrentSession: () => void;
    hydrateSessions: (sessions: ChatSession[]) => void;
}

export const useAgentChatStore = create<AgentChatState>()(
    persist(
        (set, get) => ({
            sessions: [],
            activeSessionId: null,
            currentMessages: [],
            currentRole: null,

            setCurrentRole: (role) => set({ currentRole: role }),

            addMessage: (message) => {
                set((state) => {
                    const newMessages = [...state.currentMessages, message];

                    // If we have an active session, update it in the sessions list too
                    let newSessions = state.sessions;
                    if (state.activeSessionId) {
                        newSessions = state.sessions.map(s =>
                            s.id === state.activeSessionId
                                ? { ...s, messages: newMessages, preview: message.content.slice(0, 50) }
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
                    // Re-fetch sessions after creation (createSession updates state synchronously)
                    const updatedState = get();
                    const session = updatedState.sessions.find(s => s.id === sessionId);
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

                if (currentMessages.length > 0) {
                    if (!activeSessionId) {
                        createSession();
                    }
                }

                set({ activeSessionId: null, currentMessages: [] });
            },

            createSession: (firstMessage, role) => {
                const { currentMessages, currentRole } = get();
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
                        role: role || currentRole || undefined
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

            hydrateSessions: (sessions) => {
                set({ sessions });
            },
        }),
        {
            name: 'agent-chat-storage',
            partialize: (state) => ({
                sessions: state.sessions,
                activeSessionId: state.activeSessionId,
                currentMessages: state.currentMessages,
                currentRole: state.currentRole
            }),
        }
    )
);
