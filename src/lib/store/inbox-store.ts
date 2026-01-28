/**
 * Inbox Store
 *
 * Zustand store for managing the Unified Inbox state including
 * threads, filters, and inbox-specific artifacts.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ChatMessage } from './agent-chat-store';
import type {
    InboxThread,
    InboxThreadType,
    InboxThreadStatus,
    InboxAgentPersona,
    InboxArtifact,
    InboxFilter,
    InboxQuickAction,
} from '@/types/inbox';
import {
    createInboxThreadId,
    createInboxArtifactId,
    getDefaultAgentForThreadType,
    getSupportingAgentsForThreadType,
    getQuickActionsForRole,
} from '@/types/inbox';

// ============ Store State Interface ============

interface InboxState {
    // Thread management
    threads: InboxThread[];
    activeThreadId: string | null;
    threadFilter: InboxFilter;

    // Quick action state
    quickActionMode: InboxThreadType | null;

    // Artifact management (inbox-specific)
    inboxArtifacts: InboxArtifact[];
    selectedArtifactId: string | null;
    isArtifactPanelOpen: boolean;

    // UI state
    isSidebarCollapsed: boolean;
    isLoading: boolean;

    // User context
    currentRole: string | null;
    currentOrgId: string | null;

    // Actions
    // Thread actions
    createThread: (
        type: InboxThreadType,
        options?: {
            title?: string;
            initialMessage?: ChatMessage;
            primaryAgent?: InboxAgentPersona;
            projectId?: string;
            brandId?: string;
            dispensaryId?: string;
        }
    ) => InboxThread;
    setActiveThread: (threadId: string | null) => void;
    updateThread: (threadId: string, updates: Partial<InboxThread>) => void;
    updateThreadId: (oldThreadId: string, newThreadId: string) => void;
    archiveThread: (threadId: string) => void;
    deleteThread: (threadId: string) => void;
    addMessageToThread: (threadId: string, message: ChatMessage) => void;
    updateMessageInThread: (threadId: string, messageId: string, updates: Partial<ChatMessage>) => void;

    // Filter actions
    setThreadFilter: (filter: Partial<InboxFilter>) => void;
    clearThreadFilter: () => void;

    // Quick action
    setQuickActionMode: (mode: InboxThreadType | null) => void;

    // Artifact actions
    addArtifactToThread: (threadId: string, artifact: Omit<InboxArtifact, 'id' | 'createdAt' | 'updatedAt'>) => InboxArtifact;
    updateArtifact: (artifactId: string, updates: Partial<InboxArtifact>) => void;
    removeArtifact: (artifactId: string) => void;
    setSelectedArtifact: (artifactId: string | null) => void;
    setArtifactPanelOpen: (isOpen: boolean) => void;
    approveArtifact: (artifactId: string, approvedBy: string) => void;
    rejectArtifact: (artifactId: string) => void;
    publishArtifact: (artifactId: string) => void;

    // UI actions
    setSidebarCollapsed: (collapsed: boolean) => void;
    setLoading: (loading: boolean) => void;

    // Context actions
    setCurrentRole: (role: string | null) => void;
    setCurrentOrgId: (orgId: string | null) => void;

    // Hydration
    hydrateThreads: (threads: InboxThread[]) => void;
    hydrateArtifacts: (artifacts: InboxArtifact[]) => void;

    // Add artifacts (append to existing)
    addArtifacts: (artifacts: InboxArtifact[]) => void;

    // Computed getters (as functions)
    getFilteredThreads: () => InboxThread[];
    getThreadById: (threadId: string) => InboxThread | undefined;
    getArtifactsForThread: (threadId: string) => InboxArtifact[];
    getQuickActions: () => InboxQuickAction[];
}

// ============ Default Filter ============

const DEFAULT_FILTER: InboxFilter = {
    type: 'all',
    status: 'all',
    agent: 'all',
};

// ============ Store Implementation ============

export const useInboxStore = create<InboxState>()(
    persist(
        (set, get) => ({
            // Initial state
            threads: [],
            activeThreadId: null,
            threadFilter: DEFAULT_FILTER,
            quickActionMode: null,
            inboxArtifacts: [],
            selectedArtifactId: null,
            isArtifactPanelOpen: false,
            isSidebarCollapsed: false,
            isLoading: false,
            currentRole: null,
            currentOrgId: null,

            // ============ Thread Actions ============

            createThread: (type, options = {}) => {
                const {
                    title,
                    initialMessage,
                    primaryAgent,
                    projectId,
                    brandId,
                    dispensaryId,
                } = options;

                const { currentOrgId } = get();

                const newThread: InboxThread = {
                    id: createInboxThreadId(),
                    orgId: currentOrgId || '',
                    userId: '', // Will be set by server action
                    type,
                    status: 'active',
                    title: title || `New ${type} conversation`,
                    preview: initialMessage?.content.slice(0, 50) || '',
                    primaryAgent: primaryAgent || getDefaultAgentForThreadType(type),
                    assignedAgents: [
                        primaryAgent || getDefaultAgentForThreadType(type),
                        ...getSupportingAgentsForThreadType(type),
                    ],
                    artifactIds: [],
                    messages: initialMessage ? [initialMessage] : [],
                    projectId,
                    brandId,
                    dispensaryId,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    lastActivityAt: new Date(),
                };

                set((state) => ({
                    threads: [newThread, ...state.threads],
                    activeThreadId: newThread.id,
                    quickActionMode: null,
                }));

                return newThread;
            },

            setActiveThread: (threadId) => {
                set({
                    activeThreadId: threadId,
                    // Reset artifact selection when switching threads
                    selectedArtifactId: null,
                    isArtifactPanelOpen: false,
                });
            },

            updateThread: (threadId, updates) => {
                set((state) => ({
                    threads: state.threads.map((thread) =>
                        thread.id === threadId
                            ? { ...thread, ...updates, updatedAt: new Date() }
                            : thread
                    ),
                }));
            },

            updateThreadId: (oldThreadId: string, newThreadId: string) => {
                set((state) => ({
                    threads: state.threads.map((thread) =>
                        thread.id === oldThreadId
                            ? { ...thread, id: newThreadId, updatedAt: new Date() }
                            : thread
                    ),
                    // Update activeThreadId if it matches the old ID
                    activeThreadId: state.activeThreadId === oldThreadId ? newThreadId : state.activeThreadId,
                }));
            },

            archiveThread: (threadId) => {
                set((state) => ({
                    threads: state.threads.map((thread) =>
                        thread.id === threadId
                            ? { ...thread, status: 'archived' as InboxThreadStatus, updatedAt: new Date() }
                            : thread
                    ),
                    activeThreadId: state.activeThreadId === threadId ? null : state.activeThreadId,
                }));
            },

            deleteThread: (threadId) => {
                set((state) => ({
                    threads: state.threads.filter((thread) => thread.id !== threadId),
                    activeThreadId: state.activeThreadId === threadId ? null : state.activeThreadId,
                    // Also remove associated artifacts
                    inboxArtifacts: state.inboxArtifacts.filter((a) => a.threadId !== threadId),
                }));
            },

            addMessageToThread: (threadId, message) => {
                set((state) => ({
                    threads: state.threads.map((thread) =>
                        thread.id === threadId
                            ? {
                                  ...thread,
                                  messages: [...thread.messages, message],
                                  preview: message.content.slice(0, 50),
                                  lastActivityAt: new Date(),
                                  updatedAt: new Date(),
                              }
                            : thread
                    ),
                }));
            },

            updateMessageInThread: (threadId, messageId, updates) => {
                set((state) => ({
                    threads: state.threads.map((thread) =>
                        thread.id === threadId
                            ? {
                                  ...thread,
                                  messages: thread.messages.map((msg) =>
                                      msg.id === messageId ? { ...msg, ...updates } : msg
                                  ),
                                  updatedAt: new Date(),
                              }
                            : thread
                    ),
                }));
            },

            // ============ Filter Actions ============

            setThreadFilter: (filter) => {
                set((state) => ({
                    threadFilter: { ...state.threadFilter, ...filter },
                }));
            },

            clearThreadFilter: () => {
                set({ threadFilter: DEFAULT_FILTER });
            },

            // ============ Quick Action ============

            setQuickActionMode: (mode) => {
                set({ quickActionMode: mode });
            },

            // ============ Artifact Actions ============

            addArtifactToThread: (threadId, artifactData) => {
                const newArtifact: InboxArtifact = {
                    ...artifactData,
                    id: createInboxArtifactId(),
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };

                set((state) => ({
                    inboxArtifacts: [...state.inboxArtifacts, newArtifact],
                    threads: state.threads.map((thread) =>
                        thread.id === threadId
                            ? {
                                  ...thread,
                                  artifactIds: [...thread.artifactIds, newArtifact.id],
                                  status: 'draft' as InboxThreadStatus,
                                  updatedAt: new Date(),
                              }
                            : thread
                    ),
                    // Auto-open artifact panel
                    selectedArtifactId: newArtifact.id,
                    isArtifactPanelOpen: true,
                }));

                return newArtifact;
            },

            updateArtifact: (artifactId, updates) => {
                set((state) => ({
                    inboxArtifacts: state.inboxArtifacts.map((artifact) =>
                        artifact.id === artifactId
                            ? { ...artifact, ...updates, updatedAt: new Date() }
                            : artifact
                    ),
                }));
            },

            removeArtifact: (artifactId) => {
                const artifact = get().inboxArtifacts.find((a) => a.id === artifactId);

                set((state) => ({
                    inboxArtifacts: state.inboxArtifacts.filter((a) => a.id !== artifactId),
                    threads: artifact
                        ? state.threads.map((thread) =>
                              thread.id === artifact.threadId
                                  ? {
                                        ...thread,
                                        artifactIds: thread.artifactIds.filter((id) => id !== artifactId),
                                        updatedAt: new Date(),
                                    }
                                  : thread
                          )
                        : state.threads,
                    selectedArtifactId:
                        state.selectedArtifactId === artifactId ? null : state.selectedArtifactId,
                }));
            },

            setSelectedArtifact: (artifactId) => {
                set({
                    selectedArtifactId: artifactId,
                    isArtifactPanelOpen: !!artifactId,
                });
            },

            setArtifactPanelOpen: (isOpen) => {
                set({ isArtifactPanelOpen: isOpen });
            },

            approveArtifact: (artifactId, approvedBy) => {
                set((state) => ({
                    inboxArtifacts: state.inboxArtifacts.map((artifact) =>
                        artifact.id === artifactId
                            ? {
                                  ...artifact,
                                  status: 'approved',
                                  approvedBy,
                                  approvedAt: new Date(),
                                  updatedAt: new Date(),
                              }
                            : artifact
                    ),
                }));
            },

            rejectArtifact: (artifactId) => {
                set((state) => ({
                    inboxArtifacts: state.inboxArtifacts.map((artifact) =>
                        artifact.id === artifactId
                            ? { ...artifact, status: 'rejected', updatedAt: new Date() }
                            : artifact
                    ),
                }));
            },

            publishArtifact: (artifactId) => {
                set((state) => ({
                    inboxArtifacts: state.inboxArtifacts.map((artifact) =>
                        artifact.id === artifactId
                            ? {
                                  ...artifact,
                                  status: 'published',
                                  publishedAt: new Date(),
                                  updatedAt: new Date(),
                              }
                            : artifact
                    ),
                }));
            },

            // ============ UI Actions ============

            setSidebarCollapsed: (collapsed) => {
                set({ isSidebarCollapsed: collapsed });
            },

            setLoading: (loading) => {
                set({ isLoading: loading });
            },

            // ============ Context Actions ============

            setCurrentRole: (role) => {
                set({ currentRole: role });
            },

            setCurrentOrgId: (orgId) => {
                set({ currentOrgId: orgId });
            },

            // ============ Hydration ============

            hydrateThreads: (threads) => {
                set({ threads });
            },

            hydrateArtifacts: (artifacts) => {
                set({ inboxArtifacts: artifacts });
            },

            addArtifacts: (artifacts) => {
                set((state) => ({
                    inboxArtifacts: [...state.inboxArtifacts, ...artifacts],
                }));
            },

            // ============ Computed Getters ============

            getFilteredThreads: () => {
                const { threads, threadFilter } = get();

                return threads.filter((thread) => {
                    // Filter by type
                    if (threadFilter.type !== 'all' && thread.type !== threadFilter.type) {
                        return false;
                    }

                    // Filter by status
                    if (threadFilter.status !== 'all' && thread.status !== threadFilter.status) {
                        return false;
                    }

                    // Filter by agent
                    if (threadFilter.agent !== 'all' && thread.primaryAgent !== threadFilter.agent) {
                        return false;
                    }

                    // Filter by date range
                    if (threadFilter.dateRange) {
                        const threadDate = new Date(thread.createdAt);
                        if (
                            threadDate < threadFilter.dateRange.start ||
                            threadDate > threadFilter.dateRange.end
                        ) {
                            return false;
                        }
                    }

                    return true;
                });
            },

            getThreadById: (threadId) => {
                return get().threads.find((thread) => thread.id === threadId);
            },

            getArtifactsForThread: (threadId) => {
                return get().inboxArtifacts.filter((artifact) => artifact.threadId === threadId);
            },

            getQuickActions: () => {
                const { currentRole } = get();
                if (!currentRole) return [];
                return getQuickActionsForRole(currentRole);
            },
        }),
        {
            name: 'inbox-storage',
            partialize: (state) => ({
                threads: state.threads,
                activeThreadId: state.activeThreadId,
                threadFilter: state.threadFilter,
                inboxArtifacts: state.inboxArtifacts,
                currentRole: state.currentRole,
                currentOrgId: state.currentOrgId,
                isSidebarCollapsed: state.isSidebarCollapsed,
                // Don't persist: selectedArtifactId, isArtifactPanelOpen, isLoading, quickActionMode
            }),
        }
    )
);

// ============ Selector Hooks ============

/**
 * Get the currently active thread
 */
export function useActiveThread(): InboxThread | undefined {
    const activeThreadId = useInboxStore((state) => state.activeThreadId);
    const threads = useInboxStore((state) => state.threads);
    return threads.find((t) => t.id === activeThreadId);
}

/**
 * Get messages for the active thread
 */
export function useActiveThreadMessages(): ChatMessage[] {
    const thread = useActiveThread();
    return thread?.messages || [];
}

/**
 * Get artifacts for the active thread
 */
export function useActiveThreadArtifacts(): InboxArtifact[] {
    const thread = useActiveThread();
    const artifacts = useInboxStore((state) => state.inboxArtifacts);

    if (!thread) return [];
    return artifacts.filter((a) => a.threadId === thread.id);
}

/**
 * Get the currently selected artifact
 */
export function useSelectedArtifact(): InboxArtifact | undefined {
    const selectedId = useInboxStore((state) => state.selectedArtifactId);
    const artifacts = useInboxStore((state) => state.inboxArtifacts);
    return artifacts.find((a) => a.id === selectedId);
}
