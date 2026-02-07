/**
 * Tests for useUnifiedHistory hook
 */

import { renderHook, act } from '@testing-library/react';
import { useUnifiedHistory } from '@/hooks/use-unified-history';
import { useAgentChatStore } from '@/lib/store/agent-chat-store';
import { useInboxStore } from '@/lib/store/inbox-store';

// Mock the stores
jest.mock('@/lib/store/agent-chat-store');
jest.mock('@/lib/store/inbox-store');

describe('useUnifiedHistory', () => {
    const mockAgentChatStore = useAgentChatStore as jest.MockedFunction<typeof useAgentChatStore>;
    const mockInboxStore = useInboxStore as jest.MockedFunction<typeof useInboxStore>;

    beforeEach(() => {
        jest.clearAllMocks();

        // Default mock implementations
        mockAgentChatStore.mockImplementation((selector: any) => {
            const state = {
                sessions: [],
                activeSessionId: null,
            };
            return selector ? selector(state) : state;
        });

        mockInboxStore.mockImplementation((selector: any) => {
            const state = {
                threads: [],
                activeThreadId: null,
            };
            return selector ? selector(state) : state;
        });
    });

    describe('basic functionality', () => {
        it('should return empty items when no data exists', () => {
            const { result } = renderHook(() =>
                useUnifiedHistory({ role: 'brand_admin', maxItems: 10 })
            );

            expect(result.current.items).toEqual([]);
            expect(result.current.isEmpty).toBe(true);
        });

        it('should merge inbox threads and agent sessions', () => {
            mockInboxStore.mockImplementation((selector: any) => {
                const state = {
                    threads: [
                        {
                            id: 'thread-1',
                            title: 'Test Thread',
                            preview: 'Thread preview',
                            type: 'general',
                            status: 'active',
                            lastActivityAt: '2024-02-07T12:00:00Z',
                            createdAt: '2024-02-07T11:00:00Z',
                            messages: [],
                            primaryAgent: 'auto',
                            metadata: {},
                        },
                    ],
                    activeThreadId: null,
                };
                return selector(state);
            });

            mockAgentChatStore.mockImplementation((selector: any) => {
                const state = {
                    sessions: [
                        {
                            id: 'session-1',
                            role: 'brand_admin',
                            title: 'Test Session',
                            preview: 'Session preview',
                            timestamp: '2024-02-07T13:00:00Z',
                            messages: [],
                        },
                    ],
                    activeSessionId: null,
                };
                return selector(state);
            });

            const { result } = renderHook(() =>
                useUnifiedHistory({ role: 'brand_admin', maxItems: 10 })
            );

            expect(result.current.items).toHaveLength(2);
            expect(result.current.items[0].source).toBe('agent-chat'); // More recent
            expect(result.current.items[1].source).toBe('inbox');
        });

        it('should sort items by timestamp (most recent first)', () => {
            mockInboxStore.mockImplementation((selector: any) => {
                const state = {
                    threads: [
                        {
                            id: 'thread-1',
                            title: 'Older Thread',
                            preview: 'Preview',
                            type: 'general',
                            status: 'active',
                            lastActivityAt: '2024-02-07T10:00:00Z',
                            createdAt: '2024-02-07T09:00:00Z',
                            messages: [],
                            primaryAgent: 'auto',
                            metadata: {},
                        },
                        {
                            id: 'thread-2',
                            title: 'Newer Thread',
                            preview: 'Preview',
                            type: 'general',
                            status: 'active',
                            lastActivityAt: '2024-02-07T14:00:00Z',
                            createdAt: '2024-02-07T13:00:00Z',
                            messages: [],
                            primaryAgent: 'auto',
                            metadata: {},
                        },
                    ],
                    activeThreadId: null,
                };
                return selector(state);
            });

            const { result } = renderHook(() =>
                useUnifiedHistory({ role: 'brand_admin', maxItems: 10 })
            );

            expect(result.current.items[0].title).toBe('Newer Thread');
            expect(result.current.items[1].title).toBe('Older Thread');
        });

        it('should filter out archived threads', () => {
            mockInboxStore.mockImplementation((selector: any) => {
                const state = {
                    threads: [
                        {
                            id: 'thread-1',
                            title: 'Active Thread',
                            preview: 'Preview',
                            type: 'general',
                            status: 'active',
                            lastActivityAt: '2024-02-07T12:00:00Z',
                            createdAt: '2024-02-07T11:00:00Z',
                            messages: [],
                            primaryAgent: 'auto',
                            metadata: {},
                        },
                        {
                            id: 'thread-2',
                            title: 'Archived Thread',
                            preview: 'Preview',
                            type: 'general',
                            status: 'archived',
                            lastActivityAt: '2024-02-07T12:00:00Z',
                            createdAt: '2024-02-07T11:00:00Z',
                            messages: [],
                            primaryAgent: 'auto',
                            metadata: {},
                        },
                    ],
                    activeThreadId: null,
                };
                return selector(state);
            });

            const { result } = renderHook(() =>
                useUnifiedHistory({ role: 'brand_admin', maxItems: 10 })
            );

            expect(result.current.items).toHaveLength(1);
            expect(result.current.items[0].title).toBe('Active Thread');
        });

        it('should respect maxItems limit', () => {
            mockInboxStore.mockImplementation((selector: any) => {
                const state = {
                    threads: Array.from({ length: 10 }, (_, i) => ({
                        id: `thread-${i}`,
                        title: `Thread ${i}`,
                        preview: 'Preview',
                        type: 'general',
                        status: 'active',
                        lastActivityAt: new Date(Date.now() - i * 1000).toISOString(),
                        createdAt: new Date(Date.now() - i * 2000).toISOString(),
                        messages: [],
                        primaryAgent: 'auto',
                        metadata: {},
                    })),
                    activeThreadId: null,
                };
                return selector(state);
            });

            const { result } = renderHook(() =>
                useUnifiedHistory({ role: 'brand_admin', maxItems: 5 })
            );

            expect(result.current.items).toHaveLength(5);
        });
    });

    describe('filtering', () => {
        beforeEach(() => {
            mockInboxStore.mockImplementation((selector: any) => {
                const state = {
                    threads: [
                        {
                            id: 'thread-1',
                            title: 'Inbox Thread',
                            preview: 'Preview',
                            type: 'general',
                            status: 'active',
                            lastActivityAt: '2024-02-07T12:00:00Z',
                            createdAt: '2024-02-07T11:00:00Z',
                            messages: [],
                            primaryAgent: 'auto',
                            metadata: {},
                        },
                    ],
                    activeThreadId: null,
                };
                return selector(state);
            });

            mockAgentChatStore.mockImplementation((selector: any) => {
                const state = {
                    sessions: [
                        {
                            id: 'session-1',
                            role: 'brand_admin',
                            title: 'Playbook Session',
                            preview: 'Preview',
                            timestamp: '2024-02-07T13:00:00Z',
                            messages: [],
                        },
                    ],
                    activeSessionId: null,
                };
                return selector(state);
            });
        });

        it('should show all items by default', () => {
            const { result } = renderHook(() =>
                useUnifiedHistory({ role: 'brand_admin', maxItems: 10 })
            );

            expect(result.current.items).toHaveLength(2);
            expect(result.current.filter).toBe('all');
        });

        it('should filter to inbox only', () => {
            const { result } = renderHook(() =>
                useUnifiedHistory({ role: 'brand_admin', maxItems: 10 })
            );

            act(() => {
                result.current.setFilter('inbox');
            });

            expect(result.current.items).toHaveLength(1);
            expect(result.current.items[0].source).toBe('inbox');
            expect(result.current.filter).toBe('inbox');
        });

        it('should filter to playbooks only', () => {
            const { result } = renderHook(() =>
                useUnifiedHistory({ role: 'brand_admin', maxItems: 10 })
            );

            act(() => {
                result.current.setFilter('playbooks');
            });

            expect(result.current.items).toHaveLength(1);
            expect(result.current.items[0].source).toBe('agent-chat');
            expect(result.current.filter).toBe('playbooks');
        });

        it('should switch back to all items', () => {
            const { result } = renderHook(() =>
                useUnifiedHistory({ role: 'brand_admin', maxItems: 10 })
            );

            act(() => {
                result.current.setFilter('inbox');
            });

            expect(result.current.items).toHaveLength(1);

            act(() => {
                result.current.setFilter('all');
            });

            expect(result.current.items).toHaveLength(2);
        });
    });

    describe('counts', () => {
        it('should calculate correct counts', () => {
            mockInboxStore.mockImplementation((selector: any) => {
                const state = {
                    threads: [
                        {
                            id: 'thread-1',
                            title: 'Thread 1',
                            preview: 'Preview',
                            type: 'general',
                            status: 'active',
                            lastActivityAt: '2024-02-07T12:00:00Z',
                            createdAt: '2024-02-07T11:00:00Z',
                            messages: [],
                            primaryAgent: 'auto',
                            metadata: {},
                        },
                        {
                            id: 'thread-2',
                            title: 'Thread 2',
                            preview: 'Preview',
                            type: 'general',
                            status: 'active',
                            lastActivityAt: '2024-02-07T12:00:00Z',
                            createdAt: '2024-02-07T11:00:00Z',
                            messages: [],
                            primaryAgent: 'auto',
                            metadata: {},
                        },
                    ],
                    activeThreadId: null,
                };
                return selector(state);
            });

            mockAgentChatStore.mockImplementation((selector: any) => {
                const state = {
                    sessions: [
                        {
                            id: 'session-1',
                            role: 'brand_admin',
                            title: 'Session 1',
                            preview: 'Preview',
                            timestamp: '2024-02-07T13:00:00Z',
                            messages: [],
                        },
                    ],
                    activeSessionId: null,
                };
                return selector(state);
            });

            const { result } = renderHook(() =>
                useUnifiedHistory({ role: 'brand_admin', maxItems: 10 })
            );

            expect(result.current.counts.all).toBe(3);
            expect(result.current.counts.inbox).toBe(2);
            expect(result.current.counts.playbooks).toBe(1);
        });
    });

    describe('active item tracking', () => {
        it('should identify active thread', () => {
            mockInboxStore.mockImplementation((selector: any) => {
                const state = {
                    threads: [
                        {
                            id: 'thread-1',
                            title: 'Active Thread',
                            preview: 'Preview',
                            type: 'general',
                            status: 'active',
                            lastActivityAt: '2024-02-07T12:00:00Z',
                            createdAt: '2024-02-07T11:00:00Z',
                            messages: [],
                            primaryAgent: 'auto',
                            metadata: {},
                        },
                    ],
                    activeThreadId: 'thread-1',
                };
                return selector(state);
            });

            const { result } = renderHook(() =>
                useUnifiedHistory({ role: 'brand_admin', maxItems: 10 })
            );

            expect(result.current.activeItemId).toBe('inbox-thread-1');
        });

        it('should identify active session', () => {
            mockAgentChatStore.mockImplementation((selector: any) => {
                const state = {
                    sessions: [
                        {
                            id: 'session-1',
                            role: 'brand_admin',
                            title: 'Active Session',
                            preview: 'Preview',
                            timestamp: '2024-02-07T13:00:00Z',
                            messages: [],
                        },
                    ],
                    activeSessionId: 'session-1',
                };
                return selector(state);
            });

            const { result } = renderHook(() =>
                useUnifiedHistory({ role: 'brand_admin', maxItems: 10 })
            );

            expect(result.current.activeItemId).toBe('session-session-1');
        });

        it('should return null when no active item', () => {
            const { result } = renderHook(() =>
                useUnifiedHistory({ role: 'brand_admin', maxItems: 10 })
            );

            expect(result.current.activeItemId).toBeNull();
        });
    });

    describe('role handling', () => {
        it('should return empty when role is null', () => {
            const { result } = renderHook(() =>
                useUnifiedHistory({ role: null, maxItems: 10 })
            );

            expect(result.current.items).toEqual([]);
            expect(result.current.isEmpty).toBe(true);
        });

        it('should filter sessions by role', () => {
            mockAgentChatStore.mockImplementation((selector: any) => {
                const state = {
                    sessions: [
                        {
                            id: 'session-1',
                            role: 'brand_admin',
                            title: 'Brand Session',
                            preview: 'Preview',
                            timestamp: '2024-02-07T13:00:00Z',
                            messages: [],
                        },
                        {
                            id: 'session-2',
                            role: 'super_user',
                            title: 'Super User Session',
                            preview: 'Preview',
                            timestamp: '2024-02-07T14:00:00Z',
                            messages: [],
                        },
                    ],
                    activeSessionId: null,
                };
                return selector(state);
            });

            const { result } = renderHook(() =>
                useUnifiedHistory({ role: 'brand_admin', maxItems: 10 })
            );

            const sessionItems = result.current.items.filter((i) => i.source === 'agent-chat');
            expect(sessionItems).toHaveLength(1);
            expect(sessionItems[0].title).toBe('Brand Session');
        });
    });
});
