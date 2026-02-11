/**
 * Unit tests for playbook executor media generation steps
 * Tests the new step executors: fetch_deals, generate_video, generate_image, generate_caption, submit_approval
 */

import type { PlaybookStepConfig, PlaybookExecutionContext } from '@/types/playbook';

// Mock dependencies
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn(() => ({
        firestore: {
            collection: jest.fn(() => ({
                where: jest.fn(() => ({
                    get: jest.fn(() => ({
                        docs: [
                            {
                                id: 'deal1',
                                data: () => ({
                                    id: 'deal1',
                                    name: 'BOGO Cartridges',
                                    discountType: 'bogo',
                                    productIds: ['prod1', 'prod2'],
                                    active: true,
                                }),
                            },
                        ],
                    })),
                })),
            })),
        },
    })),
}));

jest.mock('@/server/services/alleaves/index', () => ({
    getAlleaves: jest.fn(() => ({
        getDiscounts: jest.fn(async () => [
            {
                id: 'pos_discount_1',
                name: '20% Off Flower',
                discountPercentage: 20,
                applicableProducts: ['flower1', 'flower2'],
            },
        ]),
    })),
}));

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
    generateSocialMediaImage: jest.fn(async () => ({
        imageUrl: 'https://storage.googleapis.com/test-bucket/image.png',
    })),
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
    const mockContext: PlaybookExecutionContext = {
        playbookId: 'test-playbook',
        runId: 'run-123',
        tenantId: 'org_test',
        userId: 'user_test',
        triggeredBy: 'schedule',
        variables: {},
        stepResults: {},
        startTime: Date.now(),
    };

    describe('executeFetchDeals', () => {
        it('should fetch deals from Firestore when source is firestore', async () => {
            const { executeFetchDeals } = await import('../playbook-executor');

            const step: PlaybookStepConfig = {
                id: 'step-1',
                action: 'fetch_deals',
                label: 'Fetch deals',
                params: {
                    source: 'firestore',
                },
            };

            const result = await executeFetchDeals(step, mockContext);

            expect(result.deals).toBeDefined();
            expect(Array.isArray(result.deals)).toBe(true);
            expect(result.deals.length).toBeGreaterThan(0);
            expect(result.deals[0]).toHaveProperty('name');
        });

        it('should fetch deals from POS when source is pos', async () => {
            const { executeFetchDeals } = await import('../playbook-executor');

            const step: PlaybookStepConfig = {
                id: 'step-1',
                action: 'fetch_deals',
                label: 'Fetch deals',
                params: {
                    source: 'pos',
                },
            };

            const result = await executeFetchDeals(step, mockContext);

            expect(result.deals).toBeDefined();
            expect(Array.isArray(result.deals)).toBe(true);
            expect(result.deals.length).toBeGreaterThan(0);
            expect(result.deals[0]).toHaveProperty('name');
        });
    });

    describe('executeGenerateVideo', () => {
        it('should generate video with Veo provider', async () => {
            const { executeGenerateVideo } = await import('../playbook-executor');

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

            const contextWithDeals = {
                ...mockContext,
                stepResults: {
                    'step-1': {
                        deals: [
                            { name: 'Deal 1', discountType: 'percent_off', discountValue: 20 },
                        ],
                    },
                },
            };

            const result = await executeGenerateVideo(step, contextWithDeals);

            expect(result.videoUrl).toBeDefined();
            expect(result.videoUrl).toContain('.mp4');
            expect(result.trackingEvent).toBeDefined();
            expect(result.trackingEvent.id).toBe('mge_test_123');
        });

        it('should generate video with Sora provider', async () => {
            const { executeGenerateVideo } = await import('../playbook-executor');

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

            const result = await executeGenerateVideo(step, mockContext);

            expect(result.videoUrl).toBeDefined();
            expect(result.duration).toBe(8);
        });

        it('should default to Veo if no provider specified', async () => {
            const { executeGenerateVideo } = await import('../playbook-executor');

            const step: PlaybookStepConfig = {
                id: 'step-2',
                action: 'generate_video',
                label: 'Generate video',
                params: {},
            };

            const result = await executeGenerateVideo(step, mockContext);

            expect(result.videoUrl).toBeDefined();
        });
    });

    describe('executeGenerateImage', () => {
        it('should generate image with specified tier', async () => {
            const { executeGenerateImage } = await import('../playbook-executor');

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

            const result = await executeGenerateImage(step, mockContext);

            expect(result.imageUrl).toBeDefined();
            expect(result.imageUrl).toContain('.png');
            expect(result.trackingEvent).toBeDefined();
        });

        it('should use free tier by default', async () => {
            const { executeGenerateImage } = await import('../playbook-executor');

            const step: PlaybookStepConfig = {
                id: 'step-3',
                action: 'generate_image',
                label: 'Generate image',
                params: {},
            };

            const result = await executeGenerateImage(step, mockContext);

            expect(result.imageUrl).toBeDefined();
        });
    });

    describe('executeGenerateCaption', () => {
        it('should generate caption for specified platform', async () => {
            const { executeGenerateCaption } = await import('../playbook-executor');

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

            const contextWithContent = {
                ...mockContext,
                stepResults: {
                    'step-1': {
                        deals: [{ name: 'Deal 1' }],
                    },
                },
            };

            const result = await executeGenerateCaption(step, contextWithContent);

            expect(result.caption).toBeDefined();
            expect(typeof result.caption).toBe('string');
            expect(result.caption.length).toBeGreaterThan(0);
        });

        it('should handle missing context data gracefully', async () => {
            const { executeGenerateCaption } = await import('../playbook-executor');

            const step: PlaybookStepConfig = {
                id: 'step-4',
                action: 'generate_caption',
                label: 'Generate caption',
                params: {
                    platform: 'twitter',
                },
            };

            const result = await executeGenerateCaption(step, mockContext);

            expect(result.caption).toBeDefined();
        });
    });

    describe('executeSubmitApproval', () => {
        it('should create creative content for approval', async () => {
            const { executeSubmitApproval } = await import('../playbook-executor');

            const mockCreateCreativeContent = jest.fn(async () => ({
                id: 'content_123',
                status: 'pending',
            }));

            jest.mock('@/app/actions/creative-content', () => ({
                createCreativeContent: mockCreateCreativeContent,
            }));

            const step: PlaybookStepConfig = {
                id: 'step-5',
                action: 'submit_approval',
                label: 'Submit for approval',
                params: {
                    platform: 'instagram',
                },
            };

            const contextWithMedia = {
                ...mockContext,
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

            // Step 1: Fetch deals
            const fetchStep: PlaybookStepConfig = {
                id: 'step-1',
                action: 'fetch_deals',
                label: 'Fetch deals',
                params: { source: 'firestore' },
            };

            const dealsResult = await executeFetchDeals(fetchStep, mockContext);
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

            const contextAfterDeals = {
                ...mockContext,
                stepResults: { 'step-1': dealsResult },
            };

            const videoResult = await executeGenerateVideo(videoStep, contextAfterDeals);
            expect(videoResult.videoUrl).toBeDefined();

            // Step 3: Generate caption
            const captionStep: PlaybookStepConfig = {
                id: 'step-3',
                action: 'generate_caption',
                label: 'Generate caption',
                params: { platform: 'instagram', includeHashtags: true },
            };

            const contextAfterVideo = {
                ...contextAfterDeals,
                stepResults: {
                    'step-1': dealsResult,
                    'step-2': videoResult,
                },
            };

            const captionResult = await executeGenerateCaption(captionStep, contextAfterVideo);
            expect(captionResult.caption).toBeDefined();

            // Step 4: Submit for approval
            const approvalStep: PlaybookStepConfig = {
                id: 'step-4',
                action: 'submit_approval',
                label: 'Submit approval',
                params: { platform: 'instagram' },
            };

            const contextAfterCaption = {
                ...contextAfterVideo,
                stepResults: {
                    'step-1': dealsResult,
                    'step-2': videoResult,
                    'step-3': captionResult,
                },
            };

            const approvalResult = await executeSubmitApproval(approvalStep, contextAfterCaption);
            expect(approvalResult.contentId).toBeDefined();
            expect(approvalResult.status).toBe('pending');
        });
    });

    describe('Error Handling', () => {
        it('should handle video generation failure gracefully', async () => {
            const { executeGenerateVideo } = await import('../playbook-executor');
            const { generateVeoVideo } = await import('@/ai/generators/veo');

            (generateVeoVideo as jest.Mock).mockRejectedValueOnce(new Error('API timeout'));

            const step: PlaybookStepConfig = {
                id: 'step-2',
                action: 'generate_video',
                label: 'Generate video',
                params: {},
            };

            await expect(executeGenerateVideo(step, mockContext)).rejects.toThrow('API timeout');
        });

        it('should handle missing deals data', async () => {
            const { executeGenerateVideo } = await import('../playbook-executor');

            const step: PlaybookStepConfig = {
                id: 'step-2',
                action: 'generate_video',
                label: 'Generate video',
                params: {
                    template: 'deals-showcase',
                },
            };

            // Context without deals
            const emptyContext = { ...mockContext };

            // Should still work but with generic prompt
            const result = await executeGenerateVideo(step, emptyContext);
            expect(result.videoUrl).toBeDefined();
        });
    });

    describe('Cost Tracking', () => {
        it('should track costs for video generation', async () => {
            const { executeGenerateVideo } = await import('../playbook-executor');
            const { trackMediaGeneration } = await import('@/server/services/media-tracking');

            const step: PlaybookStepConfig = {
                id: 'step-2',
                action: 'generate_video',
                label: 'Generate video',
                params: {
                    provider: 'veo',
                    duration: '5',
                },
            };

            await executeGenerateVideo(step, mockContext);

            expect(trackMediaGeneration).toHaveBeenCalledWith(
                expect.objectContaining({
                    tenantId: 'org_test',
                    userId: 'user_test',
                    type: 'video',
                    provider: 'veo',
                    playbookRunId: 'run-123',
                })
            );
        });

        it('should track costs for image generation', async () => {
            const { executeGenerateImage } = await import('../playbook-executor');
            const { trackMediaGeneration } = await import('@/server/services/media-tracking');

            const step: PlaybookStepConfig = {
                id: 'step-3',
                action: 'generate_image',
                label: 'Generate image',
                params: { tier: 'paid' },
            };

            await executeGenerateImage(step, mockContext);

            expect(trackMediaGeneration).toHaveBeenCalledWith(
                expect.objectContaining({
                    tenantId: 'org_test',
                    type: 'image',
                    playbookRunId: 'run-123',
                })
            );
        });
    });
});
