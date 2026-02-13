/**
 * Unit tests for playbook executor media generation steps
 * Tests the new step executors: fetch_deals, generate_video, generate_image, generate_caption, submit_approval
 */

import type { PlaybookStepConfig } from '@/types/playbook';

// Mock dependencies
jest.mock('@/firebase/server-client', () => {
    const mockDynamicPricingGet = jest.fn(async () => ({
        docs: [
            {
                id: 'deal1',
                data: () => ({
                    name: 'BOGO Cartridges',
                    discountType: 'bogo',
                    productIds: ['prod1', 'prod2'],
                    status: 'active',
                }),
            },
        ],
    }));

    const mockCreativeAdd = jest.fn(async () => ({ id: 'content_123' }));

    const mockFirestore = {
        collection: jest.fn((collectionName: string) => {
            if (collectionName !== 'tenants') {
                return {};
            }

            return {
                doc: jest.fn(() => ({
                    collection: jest.fn((subcollectionName: string) => {
                        if (subcollectionName === 'dynamic_pricing') {
                            return {
                                where: jest.fn(() => ({
                                    get: mockDynamicPricingGet,
                                })),
                            };
                        }

                        if (subcollectionName === 'creative_content') {
                            return {
                                add: mockCreativeAdd,
                            };
                        }

                        return {};
                    }),
                })),
            };
        }),
    };

    return {
        createServerClient: jest.fn(async () => ({
            firestore: mockFirestore,
        })),
    };
});

jest.mock('@/ai/generators/veo', () => ({
    generateVeoVideo: jest.fn(async () => ({
        videoUrl: 'https://storage.googleapis.com/test-bucket/video.mp4',
        thumbnailUrl: 'https://storage.googleapis.com/test-bucket/thumb.jpg',
        duration: 5,
    })),
}));

jest.mock('@/ai/generators/sora', () => ({
    generateSoraVideo: jest.fn(async () => ({
        videoUrl: 'https://storage.googleapis.com/test-bucket/sora-video.mp4',
        duration: 8,
    })),
}));

jest.mock('@/ai/flows/generate-social-image', () => ({
    generateImageFromPrompt: jest.fn(async () => 'https://storage.googleapis.com/test-bucket/image.png'),
}));

jest.mock('@/server/services/media-tracking', () => ({
    trackMediaGeneration: jest.fn(async (event) => ({
        ...event,
        id: 'mge_test_123',
        createdAt: Date.now(),
    })),
    calculateImageCost: jest.fn(() => 0.02),
    calculateVideoCost: jest.fn(() => 0.50),
}));

jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

describe('Playbook Executor - Media Generation Steps', () => {
    const createContext = () => ({
        orgId: 'org_test',
        userId: 'user_test',
        variables: {} as Record<string, any>,
        previousResults: {} as Record<string, any>,
    });

    describe('executeFetchDeals', () => {
        it('should fetch deals from Firestore when source is firestore', async () => {
            const { executeFetchDeals } = await import('../playbook-executor');
            const context = createContext();

            const step: PlaybookStepConfig = {
                id: 'step-1',
                action: 'fetch_deals',
                label: 'Fetch deals',
                params: {
                    source: 'firestore',
                },
            };

            const result = await executeFetchDeals(step, context);

            expect(result.success).toBe(true);
            expect(result.deals).toBeDefined();
            expect(Array.isArray(result.deals)).toBe(true);
            expect(result.deals.length).toBeGreaterThan(0);
            expect(result.deals[0]).toHaveProperty('name');
            expect(context.variables.deals).toBeDefined();
        });

        it('should still fetch deals when source is pos (fallback)', async () => {
            const { executeFetchDeals } = await import('../playbook-executor');
            const context = createContext();

            const step: PlaybookStepConfig = {
                id: 'step-1',
                action: 'fetch_deals',
                label: 'Fetch deals',
                params: {
                    source: 'pos',
                },
            };

            const result = await executeFetchDeals(step, context);

            expect(result.success).toBe(true);
            expect(result.deals).toBeDefined();
            expect(Array.isArray(result.deals)).toBe(true);
            expect(result.deals.length).toBeGreaterThan(0);
            expect(result.deals[0]).toHaveProperty('name');
        });
    });

    describe('executeGenerateVideo', () => {
        it('should generate video with Veo provider', async () => {
            const { executeGenerateVideo } = await import('../playbook-executor');
            const context = createContext();

            const step: PlaybookStepConfig = {
                id: 'step-2',
                action: 'generate_video',
                label: 'Generate video',
                params: {
                    provider: 'veo',
                    aspectRatio: '9:16',
                    duration: '5',
                    style: 'energetic',
                    template: 'deals-showcase',
                },
            };

            context.variables.deals = [
                { name: 'Deal 1', discountType: 'percentage', discountValue: 20 },
            ];

            const result = await executeGenerateVideo(step, context);

            expect(result.success).toBe(true);
            expect(result.videoUrl).toBeDefined();
            expect(result.videoUrl).toContain('.mp4');
            expect(result.costUsd).toBeDefined();
        });

        it('should generate video with Sora provider', async () => {
            const { executeGenerateVideo } = await import('../playbook-executor');
            const context = createContext();

            const step: PlaybookStepConfig = {
                id: 'step-2',
                action: 'generate_video',
                label: 'Generate video',
                params: {
                    provider: 'sora',
                    aspectRatio: '16:9',
                    duration: '8',
                },
            };

            const result = await executeGenerateVideo(step, context);

            expect(result.success).toBe(true);
            expect(result.videoUrl).toBeDefined();
            expect(result.duration).toBe(8);
        });

        it('should default to Veo if no provider specified', async () => {
            const { executeGenerateVideo } = await import('../playbook-executor');
            const context = createContext();

            const step: PlaybookStepConfig = {
                id: 'step-2',
                action: 'generate_video',
                label: 'Generate video',
                params: {},
            };

            const result = await executeGenerateVideo(step, context);

            expect(result.success).toBe(true);
            expect(result.videoUrl).toBeDefined();
        });
    });

    describe('executeGenerateImage', () => {
        it('should generate image with specified tier', async () => {
            const { executeGenerateImage } = await import('../playbook-executor');
            const context = createContext();

            const step: PlaybookStepConfig = {
                id: 'step-3',
                action: 'generate_image',
                label: 'Generate image',
                params: {
                    tier: 'paid',
                    style: 'modern',
                    aspectRatio: '1:1',
                },
            };

            const result = await executeGenerateImage(step, context);

            expect(result.success).toBe(true);
            expect(result.imageUrl).toBeDefined();
            expect(result.imageUrl).toContain('.png');
            expect(result.costUsd).toBeDefined();
        });

        it('should use free tier by default', async () => {
            const { executeGenerateImage } = await import('../playbook-executor');
            const context = createContext();

            const step: PlaybookStepConfig = {
                id: 'step-3',
                action: 'generate_image',
                label: 'Generate image',
                params: {},
            };

            const result = await executeGenerateImage(step, context);

            expect(result.success).toBe(true);
            expect(result.imageUrl).toBeDefined();
        });
    });

    describe('executeGenerateCaption', () => {
        it('should generate caption for specified platform', async () => {
            const { executeGenerateCaption } = await import('../playbook-executor');
            const context = createContext();

            const step: PlaybookStepConfig = {
                id: 'step-4',
                action: 'generate_caption',
                label: 'Generate caption',
                params: {
                    platform: 'instagram',
                    includeHashtags: true,
                    includeCTA: true,
                },
            };

            context.variables.deals = [{ name: 'Deal 1' }];

            const result = await executeGenerateCaption(step, context);

            expect(result.success).toBe(true);
            expect(result.caption).toBeDefined();
            expect(typeof result.caption).toBe('string');
            expect(result.caption.length).toBeGreaterThan(0);
        });

        it('should handle missing context data gracefully', async () => {
            const { executeGenerateCaption } = await import('../playbook-executor');
            const context = createContext();

            const step: PlaybookStepConfig = {
                id: 'step-4',
                action: 'generate_caption',
                label: 'Generate caption',
                params: {
                    platform: 'twitter',
                },
            };

            const result = await executeGenerateCaption(step, context);

            expect(result.success).toBe(true);
            expect(result.caption).toBeDefined();
        });
    });

    describe('executeSubmitApproval', () => {
        it('should create creative content for approval', async () => {
            const { executeSubmitApproval } = await import('../playbook-executor');

            const step: PlaybookStepConfig = {
                id: 'step-5',
                action: 'submit_approval',
                label: 'Submit for approval',
                params: {
                    platform: 'instagram',
                },
            };

            const contextWithMedia = {
                ...createContext(),
                variables: {
                    videoUrl: 'https://example.com/video.mp4',
                    caption: 'Check out our deals! #cannabis #deals',
                },
                stepResults: {
                    'step-2': {
                        videoUrl: 'https://example.com/video.mp4',
                    },
                    'step-4': {
                        caption: 'Check out our deals! 🔥 #cannabis #deals',
                    },
                },
            };

            const result = await executeSubmitApproval(step, contextWithMedia);

            expect(result.contentId).toBeDefined();
            expect(result.status).toBe('pending');
        });
    });

    describe('Integration - Full Weekly Deals Workflow', () => {
        it('should execute complete Weekly Deals Video workflow', async () => {
            const {
                executeFetchDeals,
                executeGenerateVideo,
                executeGenerateCaption,
                executeSubmitApproval,
            } = await import('../playbook-executor');
            const context = createContext();

            // Step 1: Fetch deals
            const fetchStep: PlaybookStepConfig = {
                id: 'step-1',
                action: 'fetch_deals',
                label: 'Fetch deals',
                params: { source: 'firestore' },
            };

            const dealsResult = await executeFetchDeals(fetchStep, context);
            expect(dealsResult.deals).toBeDefined();

            // Step 2: Generate video
            const videoStep: PlaybookStepConfig = {
                id: 'step-2',
                action: 'generate_video',
                label: 'Generate video',
                params: {
                    provider: 'veo',
                    aspectRatio: '9:16',
                    duration: '5',
                },
            };

            const videoResult = await executeGenerateVideo(videoStep, context);
            expect(videoResult.videoUrl).toBeDefined();

            // Step 3: Generate caption
            const captionStep: PlaybookStepConfig = {
                id: 'step-3',
                action: 'generate_caption',
                label: 'Generate caption',
                params: { platform: 'instagram', includeHashtags: true },
            };

            const captionResult = await executeGenerateCaption(captionStep, context);
            expect(captionResult.caption).toBeDefined();

            // Step 4: Submit for approval
            const approvalStep: PlaybookStepConfig = {
                id: 'step-4',
                action: 'submit_approval',
                label: 'Submit approval',
                params: { platform: 'instagram' },
            };

            const approvalResult = await executeSubmitApproval(approvalStep, context);
            expect(approvalResult.contentId).toBeDefined();
            expect(approvalResult.status).toBe('pending');
        });
    });

    describe('Error Handling', () => {
        it('should handle video generation failure gracefully', async () => {
            const { executeGenerateVideo } = await import('../playbook-executor');
            const { generateVeoVideo } = await import('@/ai/generators/veo');
            const context = createContext();

            (generateVeoVideo as jest.Mock).mockRejectedValueOnce(new Error('API timeout'));

            const step: PlaybookStepConfig = {
                id: 'step-2',
                action: 'generate_video',
                label: 'Generate video',
                params: {},
            };

            await expect(executeGenerateVideo(step, context)).rejects.toThrow('API timeout');
        });

        it('should handle missing deals data', async () => {
            const { executeGenerateVideo } = await import('../playbook-executor');
            const context = createContext();

            const step: PlaybookStepConfig = {
                id: 'step-2',
                action: 'generate_video',
                label: 'Generate video',
                params: {
                    template: 'deals-showcase',
                },
            };

            // Should still work but with generic prompt
            const result = await executeGenerateVideo(step, context);
            expect(result.videoUrl).toBeDefined();
        });
    });

    describe('Cost Tracking', () => {
        it('should track costs for video generation', async () => {
            const { executeGenerateVideo } = await import('../playbook-executor');
            const { trackMediaGeneration } = await import('@/server/services/media-tracking');
            const context = createContext();

            const step: PlaybookStepConfig = {
                id: 'step-2',
                action: 'generate_video',
                label: 'Generate video',
                params: {
                    provider: 'veo',
                    duration: '5',
                },
            };

            await executeGenerateVideo(step, context);

            expect(trackMediaGeneration).toHaveBeenCalledWith(
                expect.objectContaining({
                    tenantId: 'org_test',
                    userId: 'user_test',
                    type: 'video',
                    provider: 'veo',
                    success: true,
                })
            );
        });

        it('should track costs for image generation', async () => {
            const { executeGenerateImage } = await import('../playbook-executor');
            const { trackMediaGeneration } = await import('@/server/services/media-tracking');
            const context = createContext();

            const step: PlaybookStepConfig = {
                id: 'step-3',
                action: 'generate_image',
                label: 'Generate image',
                params: { tier: 'paid' },
            };

            await executeGenerateImage(step, context);

            expect(trackMediaGeneration).toHaveBeenCalledWith(
                expect.objectContaining({
                    tenantId: 'org_test',
                    userId: 'user_test',
                    type: 'image',
                    success: true,
                })
            );
        });
    });
});
