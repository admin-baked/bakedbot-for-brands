/**
 * Inbox Server Actions Tests
 *
 * Tests for the inbox server actions including thread CRUD,
 * artifact management, and agent chat routing.
 */

// Mock Firebase Admin
jest.mock('firebase-admin/firestore', () => ({
    getFirestore: jest.fn(),
    FieldValue: {
        serverTimestamp: jest.fn(() => 'server-timestamp'),
        arrayUnion: jest.fn((item) => ({ type: 'arrayUnion', item })),
        arrayRemove: jest.fn((item) => ({ type: 'arrayRemove', item })),
    },
}));

// Mock auth session
const mockUser = {
    uid: 'user-123',
    email: 'test@example.com',
};

jest.mock('@/server/auth/session', () => ({
    getServerSessionUser: jest.fn(),
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
    },
}));

// Mock agent chat
jest.mock('@/app/dashboard/ceo/agents/actions', () => ({
    runAgentChat: jest.fn(),
}));

// Mock artifact parsing
jest.mock('@/types/artifact', () => ({
    parseArtifactsFromContent: jest.fn(),
}));

// Mock inbox types
let threadIdCounter = 0;
let artifactIdCounter = 0;

jest.mock('@/types/inbox', () => ({
    createInboxThreadId: jest.fn(() => `thread-${++threadIdCounter}`),
    createInboxArtifactId: jest.fn(() => `artifact-${++artifactIdCounter}`),
    getDefaultAgentForThreadType: jest.fn((type: string) => {
        const map: Record<string, string> = {
            carousel: 'smokey',
            bundle: 'money_mike',
            creative: 'craig',
            general: 'glenda',
        };
        return map[type] || 'glenda';
    }),
    getSupportingAgentsForThreadType: jest.fn((type: string) => {
        const map: Record<string, string[]> = {
            carousel: ['ezal'],
            bundle: ['smokey'],
            creative: ['deebo'],
            general: [],
        };
        return map[type] || [];
    }),
    CreateInboxThreadSchema: {
        safeParse: jest.fn((input: any) => ({ success: true, data: input })),
    },
    UpdateInboxThreadSchema: {
        safeParse: jest.fn((input: any) => ({ success: true, data: input })),
    },
}));

import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getServerSessionUser } from '@/server/auth/session';
import { parseArtifactsFromContent } from '@/types/artifact';
import { runAgentChat } from '@/app/dashboard/ceo/agents/actions';
import {
    createInboxThread,
    getInboxThreads,
    getInboxThread,
    updateInboxThread,
    addMessageToInboxThread,
    archiveInboxThread,
    deleteInboxThread,
    runInboxAgentChat,
} from '../../../src/server/actions/inbox';

describe('Inbox Server Actions', () => {
    // Mock Firestore document and collection
    const mockDocRef = {
        set: jest.fn().mockResolvedValue(undefined),
        update: jest.fn().mockResolvedValue(undefined),
        delete: jest.fn().mockResolvedValue(undefined),
        get: jest.fn(),
    };

    const mockCollection = {
        doc: jest.fn(() => mockDocRef),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn(),
    };

    const mockDb = {
        collection: jest.fn(() => mockCollection),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        threadIdCounter = 0;
        artifactIdCounter = 0;
        (getFirestore as jest.Mock).mockReturnValue(mockDb);
        (getServerSessionUser as jest.Mock).mockResolvedValue(mockUser);
    });

    describe('createInboxThread', () => {
        it('should create a new thread successfully', async () => {
            const result = await createInboxThread({
                type: 'carousel',
                title: 'Test Carousel',
            });

            expect(result.success).toBe(true);
            expect(result.thread).toBeDefined();
            expect(result.thread?.type).toBe('carousel');
            expect(result.thread?.title).toBe('Test Carousel');
            expect(result.thread?.primaryAgent).toBe('smokey');
            expect(mockDocRef.set).toHaveBeenCalled();
        });

        it('should return error when user is not authenticated', async () => {
            (getServerSessionUser as jest.Mock).mockResolvedValue(null);

            const result = await createInboxThread({
                type: 'carousel',
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe('Unauthorized');
        });

        it('should include initial message when provided', async () => {
            const initialMessage = {
                id: 'msg-1',
                type: 'user' as const,
                content: 'Create a featured products carousel',
                timestamp: new Date(),
            };

            const result = await createInboxThread({
                type: 'carousel',
                initialMessage,
            });

            expect(result.success).toBe(true);
            expect(result.thread?.messages).toHaveLength(1);
            expect(result.thread?.preview).toBe('Create a featured products carousel');
        });
    });

    describe('getInboxThreads', () => {
        it('should return threads for authenticated user', async () => {
            const mockThreads = [
                {
                    id: 'thread-1',
                    userId: 'user-123',
                    type: 'carousel',
                    status: 'active',
                    title: 'Thread 1',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    lastActivityAt: new Date(),
                    messages: [],
                },
            ];

            mockCollection.get.mockResolvedValue({
                forEach: (cb: any) => mockThreads.forEach((doc) => cb({ data: () => doc })),
            });

            const result = await getInboxThreads();

            expect(result.success).toBe(true);
            expect(result.threads).toBeDefined();
            expect(mockCollection.where).toHaveBeenCalledWith('userId', '==', 'user-123');
        });

        it('should filter by type when specified', async () => {
            mockCollection.get.mockResolvedValue({
                forEach: () => {},
            });

            await getInboxThreads({ type: 'carousel' });

            expect(mockCollection.where).toHaveBeenCalledWith('type', '==', 'carousel');
        });

        it('should return error when not authenticated', async () => {
            (getServerSessionUser as jest.Mock).mockResolvedValue(null);

            const result = await getInboxThreads();

            expect(result.success).toBe(false);
            expect(result.error).toBe('Unauthorized');
        });
    });

    describe('getInboxThread', () => {
        it('should return thread by ID for owner', async () => {
            const mockThread = {
                id: 'thread-1',
                userId: 'user-123',
                type: 'carousel',
                status: 'active',
                title: 'Test Thread',
                createdAt: new Date(),
                updatedAt: new Date(),
                lastActivityAt: new Date(),
                messages: [],
            };

            mockDocRef.get.mockResolvedValue({
                exists: true,
                data: () => mockThread,
            });

            const result = await getInboxThread('thread-1');

            expect(result.success).toBe(true);
            expect(result.thread?.title).toBe('Test Thread');
        });

        it('should return error for non-existent thread', async () => {
            mockDocRef.get.mockResolvedValue({
                exists: false,
            });

            const result = await getInboxThread('non-existent');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Thread not found');
        });

        it('should return error for thread owned by another user', async () => {
            const mockThread = {
                id: 'thread-1',
                userId: 'other-user',
                type: 'carousel',
            };

            mockDocRef.get.mockResolvedValue({
                exists: true,
                data: () => mockThread,
            });

            const result = await getInboxThread('thread-1');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Unauthorized');
        });
    });

    describe('updateInboxThread', () => {
        it('should update thread title', async () => {
            const mockThread = {
                id: 'thread-1',
                userId: 'user-123',
                type: 'carousel',
            };

            mockDocRef.get.mockResolvedValue({
                exists: true,
                data: () => mockThread,
            });

            const result = await updateInboxThread('thread-1', { title: 'New Title' });

            expect(result.success).toBe(true);
            expect(mockDocRef.update).toHaveBeenCalledWith(expect.objectContaining({
                title: 'New Title',
            }));
        });

        it('should return error for unauthorized update', async () => {
            const mockThread = {
                id: 'thread-1',
                userId: 'other-user',
            };

            mockDocRef.get.mockResolvedValue({
                exists: true,
                data: () => mockThread,
            });

            const result = await updateInboxThread('thread-1', { title: 'New Title' });

            expect(result.success).toBe(false);
            expect(result.error).toBe('Unauthorized');
        });
    });

    describe('addMessageToInboxThread', () => {
        it('should add message to thread', async () => {
            const mockThread = {
                id: 'thread-1',
                userId: 'user-123',
                messages: [],
            };

            mockDocRef.get.mockResolvedValue({
                exists: true,
                data: () => mockThread,
            });

            const message = {
                id: 'msg-1',
                type: 'user' as const,
                content: 'Hello',
                timestamp: new Date(),
            };

            const result = await addMessageToInboxThread('thread-1', message);

            expect(result.success).toBe(true);
            expect(mockDocRef.update).toHaveBeenCalledWith(expect.objectContaining({
                preview: 'Hello',
            }));
        });
    });

    describe('archiveInboxThread', () => {
        it('should set thread status to archived', async () => {
            const mockThread = {
                id: 'thread-1',
                userId: 'user-123',
                status: 'active',
            };

            mockDocRef.get.mockResolvedValue({
                exists: true,
                data: () => mockThread,
            });

            const result = await archiveInboxThread('thread-1');

            expect(result.success).toBe(true);
            expect(mockDocRef.update).toHaveBeenCalledWith(expect.objectContaining({
                status: 'archived',
            }));
        });
    });

    describe('deleteInboxThread', () => {
        it('should delete thread and associated artifacts', async () => {
            const mockThread = {
                id: 'thread-1',
                userId: 'user-123',
                artifactIds: ['art-1', 'art-2'],
            };

            mockDocRef.get.mockResolvedValue({
                exists: true,
                data: () => mockThread,
            });

            const result = await deleteInboxThread('thread-1');

            expect(result.success).toBe(true);
            expect(mockDocRef.delete).toHaveBeenCalled();
            // Should delete artifacts too
            expect(mockCollection.doc).toHaveBeenCalledWith('art-1');
            expect(mockCollection.doc).toHaveBeenCalledWith('art-2');
        });

        it('should return error for unauthorized deletion', async () => {
            const mockThread = {
                id: 'thread-1',
                userId: 'other-user',
                artifactIds: [],
            };

            mockDocRef.get.mockResolvedValue({
                exists: true,
                data: () => mockThread,
            });

            const result = await deleteInboxThread('thread-1');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Unauthorized');
        });
    });

    describe('runInboxAgentChat', () => {
        const mockThread = {
            id: 'thread-1',
            userId: 'user-123',
            orgId: 'org-123',
            type: 'carousel',
            primaryAgent: 'smokey',
            title: 'Test Carousel',
            messages: [],
        };

        beforeEach(() => {
            mockDocRef.get.mockResolvedValue({
                exists: true,
                data: () => mockThread,
            });
        });

        it('should route to correct agent based on thread type', async () => {
            (runAgentChat as jest.Mock).mockResolvedValue({
                content: 'Here is your carousel!',
                metadata: {},
            });

            (parseArtifactsFromContent as jest.Mock).mockReturnValue({
                artifacts: [],
                cleanedContent: 'Here is your carousel!',
            });

            await runInboxAgentChat('thread-1', 'Create a featured products carousel');

            expect(runAgentChat).toHaveBeenCalledWith(
                expect.stringContaining('Create a featured products carousel'),
                'smokey',
                expect.any(Object)
            );
        });

        it('should return job ID for async responses', async () => {
            (runAgentChat as jest.Mock).mockResolvedValue({
                content: '',
                metadata: { jobId: 'job-123' },
            });

            const result = await runInboxAgentChat('thread-1', 'Create carousel');

            expect(result.success).toBe(true);
            expect(result.jobId).toBe('job-123');
        });

        it('should parse artifacts from agent response', async () => {
            const mockArtifact = {
                id: 'parsed-art-1',
                type: 'carousel',
                title: 'Featured Products',
                content: '{"productIds": ["p1", "p2"]}',
                metadata: {
                    inboxData: {
                        rationale: 'Best sellers',
                    },
                },
            };

            (runAgentChat as jest.Mock).mockResolvedValue({
                content: ':::artifact:carousel:Featured Products\n{}\n:::',
                metadata: {},
            });

            (parseArtifactsFromContent as jest.Mock).mockReturnValue({
                artifacts: [mockArtifact],
                cleanedContent: '[View Artifact: Featured Products]',
            });

            const result = await runInboxAgentChat('thread-1', 'Create carousel');

            expect(result.success).toBe(true);
            expect(result.message).toBeDefined();
            expect(parseArtifactsFromContent).toHaveBeenCalled();
        });

        it('should return error for non-existent thread', async () => {
            mockDocRef.get.mockResolvedValue({
                exists: false,
            });

            const result = await runInboxAgentChat('non-existent', 'Hello');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Thread not found');
        });

        it('should return error for unauthorized thread', async () => {
            mockDocRef.get.mockResolvedValue({
                exists: true,
                data: () => ({ ...mockThread, userId: 'other-user' }),
            });

            const result = await runInboxAgentChat('thread-1', 'Hello');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Unauthorized');
        });

        it('should return error when not authenticated', async () => {
            (getServerSessionUser as jest.Mock).mockResolvedValue(null);

            const result = await runInboxAgentChat('thread-1', 'Hello');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Unauthorized');
        });

        it('should include thread context in agent call', async () => {
            (runAgentChat as jest.Mock).mockResolvedValue({
                content: 'Response',
                metadata: {},
            });

            (parseArtifactsFromContent as jest.Mock).mockReturnValue({
                artifacts: [],
                cleanedContent: 'Response',
            });

            await runInboxAgentChat('thread-1', 'Create carousel');

            expect(runAgentChat).toHaveBeenCalledWith(
                expect.stringContaining('carousel'),
                expect.any(String),
                expect.objectContaining({
                    source: 'inbox',
                    context: expect.objectContaining({
                        threadId: 'thread-1',
                        threadType: 'carousel',
                    }),
                })
            );
        });
    });
});
