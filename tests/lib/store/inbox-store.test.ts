/**
 * Inbox Store Tests
 *
 * Tests for the Zustand store managing inbox threads and artifacts.
 */

import { act } from '@testing-library/react';

// Mock uuid before importing the store
jest.mock('uuid', () => ({
    v4: () => 'test-uuid-123',
}));

// Counter for unique IDs
let threadIdCounter = 0;
let artifactIdCounter = 0;

// Mock the inbox types helper functions
jest.mock('@/types/inbox', () => ({
    createInboxThreadId: () => `thread-test-${++threadIdCounter}`,
    createInboxArtifactId: () => `artifact-test-${++artifactIdCounter}`,
    getDefaultAgentForThreadType: (type: string) => {
        const map: Record<string, string> = {
            carousel: 'smokey',
            bundle: 'money_mike',
            creative: 'craig',
            campaign: 'glenda',
            retail_partner: 'glenda',
            launch: 'glenda',
            performance: 'linus',
            outreach: 'craig',
            inventory_promo: 'money_mike',
            event: 'craig',
            general: 'auto',
            product_discovery: 'smokey',
            support: 'smokey',
        };
        return map[type] || 'auto';
    },
    getSupportingAgentsForThreadType: (type: string) => {
        const map: Record<string, string[]> = {
            carousel: ['ezal', 'pops'],
            bundle: ['smokey', 'pops'],
            creative: ['deebo', 'ezal'],
            campaign: ['craig', 'money_mike', 'pops'],
            retail_partner: ['craig', 'money_mike'],
            launch: ['smokey', 'money_mike', 'craig'],
            performance: ['pops', 'ezal'],
            outreach: ['deebo'],
            inventory_promo: ['day_day', 'smokey'],
            event: ['glenda', 'deebo'],
            general: [],
            product_discovery: ['ezal'],
            support: ['deebo'],
        };
        return map[type] || [];
    },
    getQuickActionsForRole: (role: string) => {
        if (role === 'brand' || role === 'dispensary') {
            return [
                { id: 'new-carousel', label: 'New Carousel', threadType: 'carousel' },
                { id: 'new-bundle', label: 'New Bundle', threadType: 'bundle' },
                { id: 'new-creative', label: 'Create Post', threadType: 'creative' },
                { id: 'new-campaign', label: 'Plan Campaign', threadType: 'campaign' },
                { id: 'product-launch', label: 'Product Launch', threadType: 'launch' },
                { id: 'review-performance', label: 'Review Performance', threadType: 'performance' },
                { id: 'customer-blast', label: 'Customer Blast', threadType: 'outreach' },
                { id: 'move-inventory', label: 'Move Inventory', threadType: 'inventory_promo' },
                { id: 'plan-event', label: 'Plan Event', threadType: 'event' },
            ];
        }
        if (role === 'brand') {
            return [
                ...[], // Include base actions
                { id: 'retail-pitch', label: 'Retail Pitch', threadType: 'retail_partner' },
            ];
        }
        return [];
    },
}));

// Import after mocks
import { useInboxStore } from '../../../src/lib/store/inbox-store';
import type { InboxThread, InboxArtifact } from '@/types/inbox';
import type { ChatMessage } from '@/lib/store/agent-chat-store';

describe('Inbox Store', () => {
    // Reset store and counters before each test
    beforeEach(() => {
        // Reset ID counters
        threadIdCounter = 0;
        artifactIdCounter = 0;

        // Reset to initial state
        useInboxStore.setState({
            threads: [],
            activeThreadId: null,
            threadFilter: { type: 'all', status: 'all', agent: 'all' },
            quickActionMode: null,
            inboxArtifacts: [],
            selectedArtifactId: null,
            isArtifactPanelOpen: false,
            isSidebarCollapsed: false,
            isLoading: false,
            currentRole: null,
            currentOrgId: null,
        });
    });

    describe('Thread Management', () => {
        describe('createThread', () => {
            it('should create a new thread with default values', () => {
                const store = useInboxStore.getState();

                const thread = store.createThread('carousel');

                expect(thread.type).toBe('carousel');
                expect(thread.status).toBe('active');
                expect(thread.primaryAgent).toBe('smokey');
                expect(thread.assignedAgents).toContain('smokey');
                expect(thread.assignedAgents).toContain('ezal');
                expect(thread.messages).toEqual([]);
                expect(thread.artifactIds).toEqual([]);
            });

            it('should create thread with custom title', () => {
                const store = useInboxStore.getState();

                const thread = store.createThread('bundle', { title: 'Weekend Deals' });

                expect(thread.title).toBe('Weekend Deals');
            });

            it('should create thread with initial message', () => {
                const store = useInboxStore.getState();
                const initialMessage: ChatMessage = {
                    id: 'msg-1',
                    type: 'user',
                    content: 'Create a carousel for featured products',
                    timestamp: new Date(),
                };

                const thread = store.createThread('carousel', { initialMessage });

                expect(thread.messages).toHaveLength(1);
                expect(thread.messages[0].content).toBe('Create a carousel for featured products');
                expect(thread.preview).toBe('Create a carousel for featured products');
            });

            it('should set thread as active after creation', () => {
                const store = useInboxStore.getState();

                const thread = store.createThread('creative');

                expect(useInboxStore.getState().activeThreadId).toBe(thread.id);
            });

            it('should add thread to beginning of threads array', () => {
                const store = useInboxStore.getState();

                store.createThread('carousel', { title: 'First' });
                store.createThread('bundle', { title: 'Second' });

                const threads = useInboxStore.getState().threads;
                expect(threads[0].title).toBe('Second');
                expect(threads[1].title).toBe('First');
            });
        });

        describe('setActiveThread', () => {
            it('should set active thread ID', () => {
                const store = useInboxStore.getState();
                store.createThread('carousel');
                store.createThread('bundle');

                const bundleThread = useInboxStore.getState().threads[0];
                store.setActiveThread(bundleThread.id);

                expect(useInboxStore.getState().activeThreadId).toBe(bundleThread.id);
            });

            it('should reset artifact selection when switching threads', () => {
                useInboxStore.setState({
                    selectedArtifactId: 'some-artifact',
                    isArtifactPanelOpen: true,
                });

                const store = useInboxStore.getState();
                store.setActiveThread('new-thread-id');

                const state = useInboxStore.getState();
                expect(state.selectedArtifactId).toBeNull();
                expect(state.isArtifactPanelOpen).toBe(false);
            });
        });

        describe('updateThread', () => {
            it('should update thread properties', () => {
                const store = useInboxStore.getState();
                const thread = store.createThread('carousel', { title: 'Original' });

                store.updateThread(thread.id, { title: 'Updated Title' });

                const updated = useInboxStore.getState().threads.find(t => t.id === thread.id);
                expect(updated?.title).toBe('Updated Title');
            });

            it('should set updatedAt when updating thread', () => {
                const store = useInboxStore.getState();
                const thread = store.createThread('carousel');

                store.updateThread(thread.id, { title: 'New Title' });

                const updated = useInboxStore.getState().threads.find(t => t.id === thread.id);
                expect(updated?.updatedAt).toBeDefined();
                expect(updated?.updatedAt).toBeInstanceOf(Date);
            });
        });

        describe('archiveThread', () => {
            it('should set thread status to archived', () => {
                const store = useInboxStore.getState();
                const thread = store.createThread('carousel');

                store.archiveThread(thread.id);

                const archived = useInboxStore.getState().threads.find(t => t.id === thread.id);
                expect(archived?.status).toBe('archived');
            });

            it('should clear activeThreadId if archived thread was active', () => {
                const store = useInboxStore.getState();
                const thread = store.createThread('carousel');
                expect(useInboxStore.getState().activeThreadId).toBe(thread.id);

                store.archiveThread(thread.id);

                expect(useInboxStore.getState().activeThreadId).toBeNull();
            });
        });

        describe('deleteThread', () => {
            it('should remove thread from store', () => {
                const store = useInboxStore.getState();
                const thread = store.createThread('carousel');
                expect(useInboxStore.getState().threads).toHaveLength(1);

                store.deleteThread(thread.id);

                expect(useInboxStore.getState().threads).toHaveLength(0);
            });

            it('should remove associated artifacts', () => {
                const store = useInboxStore.getState();
                const thread = store.createThread('carousel');

                // Add an artifact to the thread
                store.addArtifactToThread(thread.id, {
                    threadId: thread.id,
                    type: 'carousel',
                    title: 'Test Carousel',
                    status: 'draft',
                    data: {},
                });

                expect(useInboxStore.getState().inboxArtifacts).toHaveLength(1);

                store.deleteThread(thread.id);

                expect(useInboxStore.getState().inboxArtifacts).toHaveLength(0);
            });
        });

        describe('addMessageToThread', () => {
            it('should add message to thread', () => {
                const store = useInboxStore.getState();
                const thread = store.createThread('carousel');

                const message: ChatMessage = {
                    id: 'msg-1',
                    type: 'user',
                    content: 'Hello',
                    timestamp: new Date(),
                };

                store.addMessageToThread(thread.id, message);

                const updated = useInboxStore.getState().threads.find(t => t.id === thread.id);
                expect(updated?.messages).toHaveLength(1);
                expect(updated?.messages[0].content).toBe('Hello');
            });

            it('should update thread preview with new message', () => {
                const store = useInboxStore.getState();
                const thread = store.createThread('carousel');

                const message: ChatMessage = {
                    id: 'msg-1',
                    type: 'agent',
                    content: 'Here is your carousel with featured products...',
                    timestamp: new Date(),
                };

                store.addMessageToThread(thread.id, message);

                const updated = useInboxStore.getState().threads.find(t => t.id === thread.id);
                expect(updated?.preview).toBe('Here is your carousel with featured products...');
            });
        });

        describe('updateMessageInThread', () => {
            it('should update specific message in thread', () => {
                const store = useInboxStore.getState();
                const thread = store.createThread('carousel');

                const message: ChatMessage = {
                    id: 'msg-1',
                    type: 'user',
                    content: 'Original',
                    timestamp: new Date(),
                };
                store.addMessageToThread(thread.id, message);

                store.updateMessageInThread(thread.id, 'msg-1', { content: 'Updated' });

                const updated = useInboxStore.getState().threads.find(t => t.id === thread.id);
                expect(updated?.messages[0].content).toBe('Updated');
            });
        });
    });

    describe('Filter Management', () => {
        describe('setThreadFilter', () => {
            it('should update filter values', () => {
                const store = useInboxStore.getState();

                store.setThreadFilter({ type: 'carousel' });

                expect(useInboxStore.getState().threadFilter.type).toBe('carousel');
            });

            it('should preserve other filter values when updating', () => {
                const store = useInboxStore.getState();
                store.setThreadFilter({ type: 'carousel', status: 'active' });

                store.setThreadFilter({ agent: 'smokey' });

                const filter = useInboxStore.getState().threadFilter;
                expect(filter.type).toBe('carousel');
                expect(filter.status).toBe('active');
                expect(filter.agent).toBe('smokey');
            });
        });

        describe('clearThreadFilter', () => {
            it('should reset filter to defaults', () => {
                const store = useInboxStore.getState();
                store.setThreadFilter({ type: 'bundle', status: 'draft', agent: 'money_mike' });

                store.clearThreadFilter();

                const filter = useInboxStore.getState().threadFilter;
                expect(filter.type).toBe('all');
                expect(filter.status).toBe('all');
                expect(filter.agent).toBe('all');
            });
        });

        describe('getFilteredThreads', () => {
            beforeEach(() => {
                const store = useInboxStore.getState();
                // Create multiple threads for filtering tests
                store.createThread('carousel', { title: 'Carousel 1' });
                store.createThread('bundle', { title: 'Bundle 1' });
                store.createThread('creative', { title: 'Creative 1' });
            });

            it('should return all threads when no filter', () => {
                const store = useInboxStore.getState();
                const filtered = store.getFilteredThreads();
                expect(filtered).toHaveLength(3);
            });

            it('should filter by type', () => {
                const store = useInboxStore.getState();
                store.setThreadFilter({ type: 'carousel' });

                const filtered = store.getFilteredThreads();
                expect(filtered).toHaveLength(1);
                expect(filtered[0].type).toBe('carousel');
            });

            it('should filter by agent', () => {
                const store = useInboxStore.getState();
                store.setThreadFilter({ agent: 'money_mike' });

                const filtered = store.getFilteredThreads();
                expect(filtered).toHaveLength(1);
                expect(filtered[0].primaryAgent).toBe('money_mike');
            });

            it('should filter by status', () => {
                const store = useInboxStore.getState();
                const threads = store.threads;
                store.archiveThread(threads[0].id);

                store.setThreadFilter({ status: 'archived' });

                const filtered = store.getFilteredThreads();
                expect(filtered).toHaveLength(1);
                expect(filtered[0].status).toBe('archived');
            });
        });
    });

    describe('Artifact Management', () => {
        describe('addArtifactToThread', () => {
            it('should add artifact and link to thread', () => {
                const store = useInboxStore.getState();
                const thread = store.createThread('carousel');

                const artifact = store.addArtifactToThread(thread.id, {
                    threadId: thread.id,
                    type: 'carousel',
                    title: 'Featured Products',
                    status: 'draft',
                    data: { productIds: ['p1', 'p2'] },
                });

                expect(artifact.id).toBeDefined();
                expect(artifact.title).toBe('Featured Products');

                const updatedThread = useInboxStore.getState().threads.find(t => t.id === thread.id);
                expect(updatedThread?.artifactIds).toContain(artifact.id);
            });

            it('should auto-open artifact panel', () => {
                const store = useInboxStore.getState();
                const thread = store.createThread('carousel');

                const artifact = store.addArtifactToThread(thread.id, {
                    threadId: thread.id,
                    type: 'carousel',
                    title: 'Test',
                    status: 'draft',
                    data: {},
                });

                const state = useInboxStore.getState();
                expect(state.selectedArtifactId).toBe(artifact.id);
                expect(state.isArtifactPanelOpen).toBe(true);
            });

            it('should set thread status to draft when artifact added', () => {
                const store = useInboxStore.getState();
                const thread = store.createThread('carousel');
                expect(thread.status).toBe('active');

                store.addArtifactToThread(thread.id, {
                    threadId: thread.id,
                    type: 'carousel',
                    title: 'Test',
                    status: 'draft',
                    data: {},
                });

                const updated = useInboxStore.getState().threads.find(t => t.id === thread.id);
                expect(updated?.status).toBe('draft');
            });
        });

        describe('addArtifacts', () => {
            it('should append multiple artifacts to store', () => {
                const store = useInboxStore.getState();

                const artifacts: InboxArtifact[] = [
                    {
                        id: 'art-1',
                        threadId: 'thread-1',
                        type: 'carousel',
                        title: 'Carousel 1',
                        status: 'draft',
                        data: {},
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                    {
                        id: 'art-2',
                        threadId: 'thread-1',
                        type: 'bundle',
                        title: 'Bundle 1',
                        status: 'draft',
                        data: {},
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                ];

                store.addArtifacts(artifacts);

                expect(useInboxStore.getState().inboxArtifacts).toHaveLength(2);
            });

            it('should append to existing artifacts', () => {
                useInboxStore.setState({
                    inboxArtifacts: [{
                        id: 'existing-1',
                        threadId: 'thread-1',
                        type: 'carousel',
                        title: 'Existing',
                        status: 'approved',
                        data: {},
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    }],
                });

                const store = useInboxStore.getState();
                store.addArtifacts([{
                    id: 'new-1',
                    threadId: 'thread-1',
                    type: 'bundle',
                    title: 'New',
                    status: 'draft',
                    data: {},
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }]);

                expect(useInboxStore.getState().inboxArtifacts).toHaveLength(2);
            });
        });

        describe('updateArtifact', () => {
            it('should update artifact properties', () => {
                const store = useInboxStore.getState();
                const thread = store.createThread('carousel');
                const artifact = store.addArtifactToThread(thread.id, {
                    threadId: thread.id,
                    type: 'carousel',
                    title: 'Original',
                    status: 'draft',
                    data: {},
                });

                store.updateArtifact(artifact.id, { title: 'Updated Title' });

                const updated = useInboxStore.getState().inboxArtifacts.find(a => a.id === artifact.id);
                expect(updated?.title).toBe('Updated Title');
            });
        });

        describe('removeArtifact', () => {
            it('should remove artifact from store', () => {
                const store = useInboxStore.getState();
                const thread = store.createThread('carousel');
                const artifact = store.addArtifactToThread(thread.id, {
                    threadId: thread.id,
                    type: 'carousel',
                    title: 'Test',
                    status: 'draft',
                    data: {},
                });

                store.removeArtifact(artifact.id);

                expect(useInboxStore.getState().inboxArtifacts).toHaveLength(0);
            });

            it('should remove artifact ID from thread', () => {
                const store = useInboxStore.getState();
                const thread = store.createThread('carousel');
                const artifact = store.addArtifactToThread(thread.id, {
                    threadId: thread.id,
                    type: 'carousel',
                    title: 'Test',
                    status: 'draft',
                    data: {},
                });

                store.removeArtifact(artifact.id);

                const updatedThread = useInboxStore.getState().threads.find(t => t.id === thread.id);
                expect(updatedThread?.artifactIds).not.toContain(artifact.id);
            });
        });

        describe('approveArtifact', () => {
            it('should set artifact status to approved', () => {
                const store = useInboxStore.getState();
                const thread = store.createThread('carousel');
                const artifact = store.addArtifactToThread(thread.id, {
                    threadId: thread.id,
                    type: 'carousel',
                    title: 'Test',
                    status: 'draft',
                    data: {},
                });

                store.approveArtifact(artifact.id, 'user-123');

                const updated = useInboxStore.getState().inboxArtifacts.find(a => a.id === artifact.id);
                expect(updated?.status).toBe('approved');
                expect(updated?.approvedBy).toBe('user-123');
                expect(updated?.approvedAt).toBeDefined();
            });
        });

        describe('rejectArtifact', () => {
            it('should set artifact status to rejected', () => {
                const store = useInboxStore.getState();
                const thread = store.createThread('carousel');
                const artifact = store.addArtifactToThread(thread.id, {
                    threadId: thread.id,
                    type: 'carousel',
                    title: 'Test',
                    status: 'draft',
                    data: {},
                });

                store.rejectArtifact(artifact.id);

                const updated = useInboxStore.getState().inboxArtifacts.find(a => a.id === artifact.id);
                expect(updated?.status).toBe('rejected');
            });
        });

        describe('publishArtifact', () => {
            it('should set artifact status to published', () => {
                const store = useInboxStore.getState();
                const thread = store.createThread('carousel');
                const artifact = store.addArtifactToThread(thread.id, {
                    threadId: thread.id,
                    type: 'carousel',
                    title: 'Test',
                    status: 'approved',
                    data: {},
                });

                store.publishArtifact(artifact.id);

                const updated = useInboxStore.getState().inboxArtifacts.find(a => a.id === artifact.id);
                expect(updated?.status).toBe('published');
                expect(updated?.publishedAt).toBeDefined();
            });
        });

        describe('getArtifactsForThread', () => {
            it('should return only artifacts for specified thread', () => {
                useInboxStore.setState({
                    inboxArtifacts: [
                        { id: 'a1', threadId: 'thread-1', type: 'carousel', title: 'C1', status: 'draft', data: {}, createdAt: new Date(), updatedAt: new Date() },
                        { id: 'a2', threadId: 'thread-2', type: 'bundle', title: 'B1', status: 'draft', data: {}, createdAt: new Date(), updatedAt: new Date() },
                        { id: 'a3', threadId: 'thread-1', type: 'creative', title: 'CR1', status: 'draft', data: {}, createdAt: new Date(), updatedAt: new Date() },
                    ],
                });

                const store = useInboxStore.getState();
                const artifacts = store.getArtifactsForThread('thread-1');

                expect(artifacts).toHaveLength(2);
                expect(artifacts.map(a => a.id)).toEqual(['a1', 'a3']);
            });
        });
    });

    describe('UI State', () => {
        describe('setSidebarCollapsed', () => {
            it('should update sidebar collapsed state', () => {
                const store = useInboxStore.getState();

                store.setSidebarCollapsed(true);
                expect(useInboxStore.getState().isSidebarCollapsed).toBe(true);

                store.setSidebarCollapsed(false);
                expect(useInboxStore.getState().isSidebarCollapsed).toBe(false);
            });
        });

        describe('setLoading', () => {
            it('should update loading state', () => {
                const store = useInboxStore.getState();

                store.setLoading(true);
                expect(useInboxStore.getState().isLoading).toBe(true);

                store.setLoading(false);
                expect(useInboxStore.getState().isLoading).toBe(false);
            });
        });

        describe('setQuickActionMode', () => {
            it('should set quick action mode', () => {
                const store = useInboxStore.getState();

                store.setQuickActionMode('carousel');
                expect(useInboxStore.getState().quickActionMode).toBe('carousel');
            });

            it('should clear quick action mode when thread created', () => {
                const store = useInboxStore.getState();
                store.setQuickActionMode('bundle');

                store.createThread('bundle');

                expect(useInboxStore.getState().quickActionMode).toBeNull();
            });
        });
    });

    describe('Context Management', () => {
        describe('setCurrentRole', () => {
            it('should set current role', () => {
                const store = useInboxStore.getState();

                store.setCurrentRole('brand');

                expect(useInboxStore.getState().currentRole).toBe('brand');
            });
        });

        describe('setCurrentOrgId', () => {
            it('should set current org ID', () => {
                const store = useInboxStore.getState();

                store.setCurrentOrgId('org-123');

                expect(useInboxStore.getState().currentOrgId).toBe('org-123');
            });

            it('should be used when creating new threads', () => {
                const store = useInboxStore.getState();
                store.setCurrentOrgId('org-456');

                const thread = store.createThread('carousel');

                expect(thread.orgId).toBe('org-456');
            });
        });

        describe('getQuickActions', () => {
            it('should return quick actions based on role', () => {
                const store = useInboxStore.getState();
                store.setCurrentRole('brand');

                const actions = store.getQuickActions();

                // Brand role gets all business quick actions (9 total)
                expect(actions.length).toBeGreaterThanOrEqual(9);
                expect(actions[0].threadType).toBe('carousel');
                expect(actions[1].threadType).toBe('bundle');
                expect(actions[2].threadType).toBe('creative');
            });

            it('should return empty array when no role set', () => {
                const store = useInboxStore.getState();

                const actions = store.getQuickActions();

                expect(actions).toEqual([]);
            });
        });
    });

    describe('Hydration', () => {
        describe('hydrateThreads', () => {
            it('should replace threads with hydrated data', () => {
                const store = useInboxStore.getState();
                store.createThread('carousel');

                const newThreads: InboxThread[] = [
                    {
                        id: 'hydrated-1',
                        orgId: 'org-1',
                        userId: 'user-1',
                        type: 'bundle',
                        status: 'active',
                        title: 'Hydrated Thread',
                        preview: 'Test',
                        primaryAgent: 'money_mike',
                        assignedAgents: ['money_mike'],
                        artifactIds: [],
                        messages: [],
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        lastActivityAt: new Date(),
                    },
                ];

                store.hydrateThreads(newThreads);

                const threads = useInboxStore.getState().threads;
                expect(threads).toHaveLength(1);
                expect(threads[0].id).toBe('hydrated-1');
            });
        });

        describe('hydrateArtifacts', () => {
            it('should replace artifacts with hydrated data', () => {
                const store = useInboxStore.getState();
                const thread = store.createThread('carousel');
                store.addArtifactToThread(thread.id, {
                    threadId: thread.id,
                    type: 'carousel',
                    title: 'Old',
                    status: 'draft',
                    data: {},
                });

                const newArtifacts: InboxArtifact[] = [
                    {
                        id: 'hydrated-art-1',
                        threadId: 'thread-1',
                        type: 'bundle',
                        title: 'Hydrated Artifact',
                        status: 'approved',
                        data: {},
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                ];

                store.hydrateArtifacts(newArtifacts);

                const artifacts = useInboxStore.getState().inboxArtifacts;
                expect(artifacts).toHaveLength(1);
                expect(artifacts[0].id).toBe('hydrated-art-1');
            });
        });
    });

    describe('Computed Getters', () => {
        describe('getThreadById', () => {
            it('should return thread by ID', () => {
                const store = useInboxStore.getState();
                const thread = store.createThread('carousel', { title: 'Find Me' });

                const found = store.getThreadById(thread.id);

                expect(found?.title).toBe('Find Me');
            });

            it('should return undefined for non-existent ID', () => {
                const store = useInboxStore.getState();

                const found = store.getThreadById('non-existent');

                expect(found).toBeUndefined();
            });
        });
    });
});
