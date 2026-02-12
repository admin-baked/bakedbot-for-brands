import {
    getPendingContent,
    getContentById,
    generateContent,
    approveContent,
    requestRevision,
    deleteContent,
    updateContentStatus,
    getContentByPlatform,
    updateCaption,
} from '../creative-content';
import { createServerClient } from '@/firebase/server-client';
import type { GenerateContentRequest } from '@/types/creative-content';

// Mock dependencies
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn()
}));

jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn().mockResolvedValue({
        uid: 'user-123',
        email: 'test@example.com',
        role: 'brand_admin'
    })
}));

jest.mock('@/ai/flows/generate-social-image', () => ({
    generateImageFromPrompt: jest.fn().mockResolvedValue('https://example.com/generated-image.jpg')
}));

jest.mock('@/ai/flows/generate-social-caption', () => ({
    generateSocialCaption: jest.fn().mockResolvedValue({
        primaryCaption: 'Check out our latest product! Quality cannabis you can trust.',
        hashtags: ['#cannabis', '#dispensary'],
        variations: [],
        complianceNotes: []
    })
}));

jest.mock('@/server/agents/deebo', () => ({
    deebo: {
        checkContent: jest.fn().mockResolvedValue({
            status: 'pass',
            violations: [],
            suggestions: []
        })
    }
}));

jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    }
}));

jest.mock('uuid', () => ({
    v4: jest.fn().mockReturnValue('content-uuid-123')
}));

// Mock Firestore
const mockDoc = {
    get: jest.fn(),
    set: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
};

const mockCollection = {
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn()
};

const mockFirestore = {
    collection: jest.fn().mockReturnValue(mockCollection),
    doc: jest.fn().mockReturnValue(mockDoc)
};

describe('Creative Content Server Actions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (createServerClient as jest.Mock).mockResolvedValue({ firestore: mockFirestore });
    });

    describe('getPendingContent', () => {
        it('returns pending content items from Firestore', async () => {
            const mockDocs = [
                { id: 'content-1', data: () => ({ caption: 'Test 1', status: 'pending' }) },
                { id: 'content-2', data: () => ({ caption: 'Test 2', status: 'draft' }) }
            ];
            mockCollection.get.mockResolvedValue({ docs: mockDocs });

            const result = await getPendingContent('tenant-123');

            expect(result.content).toHaveLength(2);
            expect(result.content[0].id).toBe('content-1');
            expect(mockFirestore.collection).toHaveBeenCalledWith('tenants/tenant-123/creative_content');
            expect(mockCollection.where).toHaveBeenCalledWith('status', 'in', ['pending', 'draft']);
        });

        it('handles empty results', async () => {
            mockCollection.get.mockResolvedValue({ docs: [] });

            const result = await getPendingContent('tenant-123');

            expect(result.content).toHaveLength(0);
        });
    });

    describe('getContentById', () => {
        it('returns content when found', async () => {
            mockDoc.get.mockResolvedValue({
                exists: true,
                id: 'content-1',
                data: () => ({ caption: 'Test caption', platform: 'instagram' })
            });

            const result = await getContentById('tenant-123', 'content-1');

            expect(result).not.toBeNull();
            expect(result?.id).toBe('content-1');
            expect(result?.caption).toBe('Test caption');
        });

        it('returns null when content not found', async () => {
            mockDoc.get.mockResolvedValue({ exists: false });

            const result = await getContentById('tenant-123', 'nonexistent');

            expect(result).toBeNull();
        });
    });

    describe('generateContent', () => {
        const mockRequest: GenerateContentRequest = {
            tenantId: 'tenant-123',
            brandId: 'brand-456',
            platform: 'instagram',
            prompt: 'Generate a post about our new strain',
            style: 'professional',
            includeHashtags: true,
            tier: 'free'
        };

        it('generates content with image and caption', async () => {
            mockDoc.set.mockResolvedValue(undefined);

            const result = await generateContent(mockRequest);

            expect(result.content).toBeDefined();
            expect(result.content.id).toBe('content-uuid-123');
            expect(result.content.platform).toBe('instagram');
            expect(result.content.mediaUrls).toContain('https://example.com/generated-image.jpg');
            expect(result.content.generatedBy).toBe('nano-banana');
        });

        it('saves content to Firestore', async () => {
            mockDoc.set.mockResolvedValue(undefined);

            await generateContent(mockRequest);

            expect(mockFirestore.doc).toHaveBeenCalledWith(
                'tenants/tenant-123/creative_content/content-uuid-123'
            );
            expect(mockDoc.set).toHaveBeenCalled();
        });

        it('runs compliance check via Deebo', async () => {
            const { deebo } = await import('@/server/agents/deebo');
            mockDoc.set.mockResolvedValue(undefined);

            const result = await generateContent(mockRequest);

            expect(deebo.checkContent).toHaveBeenCalled();
            expect(result.complianceResult.status).toBe('active'); // 'pass' maps to 'active'
        });

        it('uses nano-banana-pro for paid tier', async () => {
            mockDoc.set.mockResolvedValue(undefined);

            const result = await generateContent({ ...mockRequest, tier: 'paid' });

            expect(result.content.generatedBy).toBe('nano-banana-pro');
        });
    });

    describe('approveContent', () => {
        it('updates content status to approved', async () => {
            mockDoc.get.mockResolvedValue({ exists: true });
            mockDoc.update.mockResolvedValue(undefined);

            await approveContent({
                contentId: 'content-1',
                tenantId: 'tenant-123',
                approverId: 'user-123'
            });

            expect(mockDoc.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 'approved',
                    complianceStatus: 'active'
                })
            );
        });

        it('sets scheduled status when scheduledAt provided', async () => {
            mockDoc.get.mockResolvedValue({ exists: true });
            mockDoc.update.mockResolvedValue(undefined);

            await approveContent({
                contentId: 'content-1',
                tenantId: 'tenant-123',
                approverId: 'user-123',
                scheduledAt: '2025-01-20T10:00:00Z'
            });

            expect(mockDoc.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 'scheduled',
                    scheduledAt: '2025-01-20T10:00:00Z'
                })
            );
        });

        it('throws error when content not found', async () => {
            mockDoc.get.mockResolvedValue({ exists: false });

            await expect(approveContent({
                contentId: 'nonexistent',
                tenantId: 'tenant-123',
                approverId: 'user-123'
            })).rejects.toThrow('Content not found');
        });
    });

    describe('requestRevision', () => {
        it('updates status to revision and adds note', async () => {
            mockDoc.get.mockResolvedValue({
                exists: true,
                data: () => ({
                    revisionNotes: [],
                    caption: 'Original caption',
                    platform: 'instagram',
                    hashtags: ['#test']
                })
            });
            mockDoc.update.mockResolvedValue(undefined);

            await requestRevision({
                contentId: 'content-1',
                tenantId: 'tenant-123',
                requesterId: 'user-123',
                note: 'Please adjust the tone'
            });

            // First call sets status to revision
            expect(mockDoc.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 'revision',
                    revisionNotes: expect.arrayContaining([
                        expect.objectContaining({
                            note: 'Please adjust the tone',
                            requestedBy: 'user-123'
                        })
                    ])
                })
            );
        });

        it('appends to existing revision notes', async () => {
            mockDoc.get.mockResolvedValue({
                exists: true,
                data: () => ({
                    revisionNotes: [
                        { note: 'Previous note', requestedBy: 'other-user', requestedAt: 1000 }
                    ],
                    caption: 'Original caption',
                    platform: 'instagram',
                    hashtags: []
                })
            });
            mockDoc.update.mockResolvedValue(undefined);

            await requestRevision({
                contentId: 'content-1',
                tenantId: 'tenant-123',
                requesterId: 'user-123',
                note: 'New revision note'
            });

            const updateCall = mockDoc.update.mock.calls[0][0];
            expect(updateCall.revisionNotes).toHaveLength(2);
        });

        it('triggers Craig AI to regenerate caption with revision notes', async () => {
            const { generateSocialCaption } = await import('@/ai/flows/generate-social-caption');

            mockDoc.get.mockResolvedValue({
                exists: true,
                data: () => ({
                    revisionNotes: [],
                    caption: 'Original caption about our product',
                    platform: 'instagram',
                    hashtags: ['#cannabis']
                })
            });
            mockDoc.update.mockResolvedValue(undefined);

            await requestRevision({
                contentId: 'content-1',
                tenantId: 'tenant-123',
                requesterId: 'user-123',
                note: 'Make it more casual and fun'
            });

            // Verify Craig AI was called with revision context
            expect(generateSocialCaption).toHaveBeenCalledWith(
                expect.objectContaining({
                    platform: 'instagram',
                    prompt: expect.stringContaining('ORIGINAL CAPTION'),
                    includeHashtags: true
                })
            );
        });

        it('updates caption to regenerated version and sets status back to pending', async () => {
            mockDoc.get.mockResolvedValue({
                exists: true,
                data: () => ({
                    revisionNotes: [],
                    caption: 'Original caption',
                    platform: 'instagram',
                    hashtags: []
                })
            });
            mockDoc.update.mockResolvedValue(undefined);

            await requestRevision({
                contentId: 'content-1',
                tenantId: 'tenant-123',
                requesterId: 'user-123',
                note: 'Make it shorter'
            });

            // Second update should set new caption and status back to pending
            const secondUpdate = mockDoc.update.mock.calls[1][0];
            expect(secondUpdate.caption).toBe('Check out our latest product! Quality cannabis you can trust.');
            expect(secondUpdate.status).toBe('pending');
        });
    });

    describe('updateCaption', () => {
        it('updates caption directly for inline editing', async () => {
            mockDoc.get.mockResolvedValue({ exists: true });
            mockDoc.update.mockResolvedValue(undefined);

            await updateCaption('tenant-123', 'content-1', 'New edited caption');

            expect(mockFirestore.doc).toHaveBeenCalledWith(
                'tenants/tenant-123/creative_content/content-1'
            );
            expect(mockDoc.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    caption: 'New edited caption',
                    updatedAt: expect.any(Number)
                })
            );
        });

        it('throws error when content not found', async () => {
            mockDoc.get.mockResolvedValue({ exists: false });

            await expect(
                updateCaption('tenant-123', 'nonexistent', 'New caption')
            ).rejects.toThrow('Content not found');
        });

        it('preserves other fields when updating caption', async () => {
            mockDoc.get.mockResolvedValue({ exists: true });
            mockDoc.update.mockResolvedValue(undefined);

            await updateCaption('tenant-123', 'content-1', 'Updated caption text');

            const updateCall = mockDoc.update.mock.calls[0][0];
            // Should only update caption and updatedAt
            expect(Object.keys(updateCall)).toEqual(['caption', 'updatedAt']);
        });
    });

    describe('deleteContent', () => {
        it('deletes content from Firestore', async () => {
            mockDoc.delete.mockResolvedValue(undefined);

            await deleteContent('tenant-123', 'content-1');

            expect(mockFirestore.doc).toHaveBeenCalledWith(
                'tenants/tenant-123/creative_content/content-1'
            );
            expect(mockDoc.delete).toHaveBeenCalled();
        });
    });

    describe('updateContentStatus', () => {
        it('updates status only', async () => {
            mockDoc.update.mockResolvedValue(undefined);

            await updateContentStatus('tenant-123', 'content-1', 'published');

            expect(mockDoc.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 'published'
                })
            );
        });

        it('updates both status and compliance status', async () => {
            mockDoc.update.mockResolvedValue(undefined);

            await updateContentStatus('tenant-123', 'content-1', 'approved', 'active');

            expect(mockDoc.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 'approved',
                    complianceStatus: 'active'
                })
            );
        });
    });

    describe('getContentByPlatform', () => {
        it('returns content filtered by platform', async () => {
            const mockDocs = [
                { id: 'ig-1', data: () => ({ platform: 'instagram', caption: 'IG Post' }) }
            ];
            mockCollection.get.mockResolvedValue({ docs: mockDocs });

            const result = await getContentByPlatform('tenant-123', 'instagram');

            expect(result.content).toHaveLength(1);
            expect(mockCollection.where).toHaveBeenCalledWith('platform', '==', 'instagram');
        });

        it('respects limit parameter', async () => {
            mockCollection.get.mockResolvedValue({ docs: [] });

            await getContentByPlatform('tenant-123', 'tiktok', { limit: 5 });

            // Pagination fetches one extra doc to determine `hasMore`
            expect(mockCollection.limit).toHaveBeenCalledWith(6);
        });
    });
});
