import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Artifact } from '@/types/artifact';

export interface ChatMessage {
    id: string;
    type: 'user' | 'agent';
    content: string;
    timestamp: Date;
    artifacts?: Artifact[]; // Artifacts generated in this message

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
    projectId?: string; // Optional project context
    artifacts?: Artifact[]; // All artifacts in this session
}

interface AgentChatState {
    sessions: ChatSession[];
    activeSessionId: string | null;
    currentMessages: ChatMessage[];
    currentRole: string | null;
    currentProjectId: string | null; // Active project context

    // Artifact State
    activeArtifactId: string | null;
    isArtifactPanelOpen: boolean;

    // Actions
    setCurrentRole: (role: string) => void;
    setCurrentProject: (projectId: string | null) => void;
    createSession: (firstMessage?: ChatMessage, role?: string) => void;
    setActiveSession: (sessionId: string) => void;
    addMessage: (message: ChatMessage) => void;
    updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
    clearCurrentSession: () => void;
    hydrateSessions: (sessions: ChatSession[]) => void;
    
    // Artifact Actions
    addArtifact: (artifact: Artifact) => void;
    updateArtifact: (id: string, updates: Partial<Artifact>) => void;
    removeArtifact: (id: string) => void;
    setActiveArtifact: (id: string | null) => void;
    setArtifactPanelOpen: (isOpen: boolean) => void;
}

export const useAgentChatStore = create<AgentChatState>()(
    persist(
        (set, get) => ({
            sessions: [],
            activeSessionId: null,
            currentMessages: [],
            currentRole: null,
            currentProjectId: null,
            currentArtifacts: [] as Artifact[],
            activeArtifactId: null,
            isArtifactPanelOpen: false,

            setCurrentRole: (role) => set({ currentRole: role }),
            setCurrentProject: (projectId) => set({ currentProjectId: projectId }),

            // Artifact Actions
            addArtifact: (artifact: Artifact) => {
                // @ts-ignore
                set((state: AgentChatState) => {
                    const current = state.currentArtifacts || [];
                    return {
                        currentArtifacts: [...current, artifact],
                        activeArtifactId: artifact.id,
                        isArtifactPanelOpen: true
                    };
                });
            },

            updateArtifact: (id, updates) => {
                set((state) => ({
                    currentArtifacts: state.currentArtifacts.map(a => 
                        a.id === id ? { ...a, ...updates, updatedAt: new Date() } : a
                    )
                }));
            },

            removeArtifact: (id) => {
                set((state) => ({
                    currentArtifacts: state.currentArtifacts.filter(a => a.id !== id),
                    activeArtifactId: state.activeArtifactId === id ? null : state.activeArtifactId
                }));
            },

            setActiveArtifact: (id) => {
                set({ 
                    activeArtifactId: id,
                    isArtifactPanelOpen: !!id // Auto-open if ID is provided
                });
            },

            setArtifactPanelOpen: (isOpen) => {
                set({ isArtifactPanelOpen: isOpen });
            },

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
                            currentMessages: session.messages,
                            currentArtifacts: session.artifacts || [],
                            activeArtifactId: null,
                            isArtifactPanelOpen: false
                        });
                    }
                    return;
                }

                const session = sessions.find(s => s.id === sessionId);
                if (session) {
                    set({
                        activeSessionId: sessionId,
                        currentMessages: session.messages,
                        currentArtifacts: session.artifacts || [],
                        activeArtifactId: null,
                        isArtifactPanelOpen: false
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

                set({ 
                    activeSessionId: null, 
                    currentMessages: [],
                    currentArtifacts: [],
                    activeArtifactId: null,
                    isArtifactPanelOpen: false
                });
            },

            createSession: (firstMessage, role) => {
                const { currentMessages, currentRole, currentArtifacts } = get();
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
                        role: role || currentRole || undefined,
                        artifacts: currentArtifacts
                    };

                    set((state) => ({
                        sessions: [newSession, ...state.sessions]
                    }));
                }

                // Reset for new chat
                set({
                    activeSessionId: null,
                    currentMessages: [],
                    currentArtifacts: [],
                    activeArtifactId: null,
                    isArtifactPanelOpen: false
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
                currentRole: state.currentRole,
                currentProjectId: state.currentProjectId,
                currentArtifacts: state.currentArtifacts,
                // Do not persist open state
            }),
        }
    )
);
