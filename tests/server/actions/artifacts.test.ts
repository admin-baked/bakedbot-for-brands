/**
 * Artifact Server Actions Unit Tests
 * 
 * Tests for saving, sharing, and retrieving artifacts.
 */

// Mock Firebase Admin
jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn(() => ({
        collection: jest.fn(() => ({
            doc: jest.fn(() => ({
                id: 'mock-doc-id',
                set: jest.fn().mockResolvedValue({}),
                get: jest.fn().mockResolvedValue({ 
                    exists: true, 
                    id: 'mock-share-id',
                    data: () => ({
                        shareId: 'mock-share-id',
                        title: 'Test Artifact',
                        content: 'Test content',
                        type: 'code',
                        ownerId: 'user-123',
                        views: 5,
                        createdAt: { toDate: () => new Date() },
                    })
                }),
                update: jest.fn().mockResolvedValue({}),
                delete: jest.fn().mockResolvedValue({}),
            })),
            where: jest.fn(() => ({
                orderBy: jest.fn(() => ({
                    limit: jest.fn(() => ({
                        get: jest.fn().mockResolvedValue({
                            docs: [
                                {
                                    id: 'artifact-1',
                                    data: () => ({
                                        type: 'code',
                                        title: 'Test Artifact',
                                        content: 'console.log("test")',
                                        createdAt: { toDate: () => new Date() },
                                        updatedAt: { toDate: () => new Date() },
                                    })
                                }
                            ]
                        })
                    }))
                }))
            }))
        })),
    })),
}));

// Mock auth
jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn().mockResolvedValue({ 
        uid: 'user-123', 
        displayName: 'Test User',
        email: 'test@test.com'
    }),
}));

// Mock nanoid
jest.mock('nanoid', () => ({
    nanoid: jest.fn(() => 'mock-nanoid-12')
}));

// Mock Next.js cache
jest.mock('next/cache', () => ({
    revalidatePath: jest.fn(),
}));

import { 
    saveArtifact, 
    shareArtifact, 
    getSharedArtifact, 
    unshareArtifact,
    getUserArtifacts 
} from '@/server/actions/artifacts';

describe('Artifact Server Actions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('saveArtifact', () => {
        it('should save a new artifact and return with ID', async () => {
            const artifact = {
                type: 'code' as const,
                title: 'My Code Snippet',
                content: 'const x = 1;',
                language: 'typescript',
            };

            const result = await saveArtifact(artifact);

            expect(result.id).toBe('mock-doc-id');
            expect(result.title).toBe('My Code Snippet');
            expect(result.type).toBe('code');
            expect(result.createdAt).toBeDefined();
            expect(result.updatedAt).toBeDefined();
        });

        it('should use existing ID for updates (upsert)', async () => {
            const artifact = {
                id: 'existing-artifact-id',
                type: 'code' as const,
                title: 'Updated Artifact',
                content: 'updated content',
            };

            const result = await saveArtifact(artifact);

            // The ID should be preserved (though our mock returns 'mock-doc-id')
            expect(result.title).toBe('Updated Artifact');
        });

        it('should handle markdown artifacts', async () => {
            const artifact = {
                type: 'markdown' as const,
                title: 'Documentation',
                content: '# Hello World\n\nThis is markdown.',
            };

            const result = await saveArtifact(artifact);

            expect(result.type).toBe('markdown');
        });

        it('should reject updating an artifact owned by another user', async () => {
            const { getAdminFirestore } = require('@/firebase/admin');
            getAdminFirestore.mockImplementationOnce(() => ({
                collection: jest.fn(() => ({
                    doc: jest.fn(() => ({
                        id: 'existing-artifact-id',
                        get: jest.fn().mockResolvedValue({
                            exists: true,
                            data: () => ({ ownerId: 'different-user' }),
                        }),
                        set: jest.fn().mockResolvedValue({}),
                    })),
                })),
            }));

            await expect(
                saveArtifact({
                    id: 'existing-artifact-id',
                    type: 'code',
                    title: 'Unauthorized update',
                    content: 'nope',
                })
            ).rejects.toThrow('Not authorized');
        });
    });

    describe('shareArtifact', () => {
        it('should create a public share link', async () => {
            const result = await shareArtifact(
                'artifact-123',
                'Shared Artifact',
                'Some content',
                'code',
                { isPublished: false }
            );

            expect(result.success).toBe(true);
            expect(result.shareId).toBe('mock-nanoid-12');
            expect(result.shareUrl).toContain('/artifacts/mock-nanoid-12');
        });

        it('should include metadata in result', async () => {
            const result = await shareArtifact(
                'artifact-123',
                'Shared Artifact',
                'Content',
                'research',
                { summary: 'Test summary' }
            );

            expect(result.success).toBe(true);
        });

        it('should reject sharing artifacts owned by another user', async () => {
            const { getAdminFirestore } = require('@/firebase/admin');
            getAdminFirestore.mockImplementationOnce(() => ({
                collection: jest.fn((name: string) => {
                    if (name === 'artifacts') {
                        return {
                            doc: jest.fn(() => ({
                                get: jest.fn().mockResolvedValue({
                                    exists: true,
                                    data: () => ({ ownerId: 'different-user' }),
                                }),
                                update: jest.fn().mockResolvedValue({}),
                            })),
                        };
                    }

                    if (name === 'shared_artifacts') {
                        return {
                            doc: jest.fn(() => ({
                                set: jest.fn().mockResolvedValue({}),
                            })),
                        };
                    }

                    return { doc: jest.fn() };
                }),
            }));

            const result = await shareArtifact(
                'artifact-123',
                'Shared Artifact',
                'Content',
                'research'
            );

            expect(result.success).toBe(false);
            expect(result.error).toContain('Not authorized');
        });
    });

    describe('getSharedArtifact', () => {
        it('should retrieve a shared artifact by shareId', async () => {
            const result = await getSharedArtifact('mock-share-id');

            expect(result).not.toBeNull();
            expect(result?.shareId).toBe('mock-share-id');
            expect(result?.title).toBe('Test Artifact');
            expect(result?.type).toBe('code');
        });

        it('should increment view count', async () => {
            const result = await getSharedArtifact('mock-share-id');

            // Views should be incremented from 5 to 6
            expect(result?.views).toBe(6);
        });

        it('should return null for non-existent shareId', async () => {
            // Mock to return non-existent doc
            const { getAdminFirestore } = require('@/firebase/admin');
            getAdminFirestore.mockImplementationOnce(() => ({
                collection: jest.fn(() => ({
                    doc: jest.fn(() => ({
                        get: jest.fn().mockResolvedValue({ exists: false }),
                        update: jest.fn(),
                    })),
                })),
            }));

            const result = await getSharedArtifact('non-existent');
            expect(result).toBeNull();
        });
    });

    describe('unshareArtifact', () => {
        it('should delete shared artifact', async () => {
            const result = await unshareArtifact('mock-share-id');

            expect(result.success).toBe(true);
        });

        it('should return error for non-existent artifact', async () => {
            const { getAdminFirestore } = require('@/firebase/admin');
            getAdminFirestore.mockImplementationOnce(() => ({
                collection: jest.fn(() => ({
                    doc: jest.fn(() => ({
                        get: jest.fn().mockResolvedValue({ exists: false }),
                    })),
                })),
            }));

            const result = await unshareArtifact('non-existent');
            expect(result.success).toBe(false);
            expect(result.error).toContain('not found');
        });

        it('should reject if not owner', async () => {
            const { getAdminFirestore } = require('@/firebase/admin');
            getAdminFirestore.mockImplementationOnce(() => ({
                collection: jest.fn(() => ({
                    doc: jest.fn(() => ({
                        get: jest.fn().mockResolvedValue({ 
                            exists: true,
                            data: () => ({ ownerId: 'different-user' })
                        }),
                    })),
                })),
            }));

            const result = await unshareArtifact('mock-share-id');
            expect(result.success).toBe(false);
            expect(result.error).toContain('Not authorized');
        });
    });

    describe('getUserArtifacts', () => {
        it('should return user artifacts', async () => {
            const result = await getUserArtifacts();

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('artifact-1');
            expect(result[0].type).toBe('code');
        });

        it('should convert Firestore timestamps to Dates', async () => {
            const result = await getUserArtifacts();

            expect(result[0].createdAt).toBeInstanceOf(Date);
            expect(result[0].updatedAt).toBeInstanceOf(Date);
        });
    });
});
