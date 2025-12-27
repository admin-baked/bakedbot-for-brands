
import { generateSoraVideo, SoraGeneratorOptions } from '@/ai/generators/sora';
import { GenerateVideoInput } from '@/ai/video-types';

// Test options with fast polling for quick tests
const TEST_OPTIONS: SoraGeneratorOptions = {
    pollIntervalMs: 10, // 10ms instead of 5000ms
    maxPollAttempts: 10,
};

// Mock Firebase Admin Storage
jest.mock('firebase-admin/storage', () => ({
    getStorage: jest.fn(() => ({
        bucket: jest.fn(() => ({
            file: jest.fn(() => ({
                save: jest.fn().mockResolvedValue(undefined),
                makePublic: jest.fn().mockResolvedValue(undefined),
            })),
            name: 'bakedbot-global-assets',
        })),
    })),
}));

describe('Sora Generator', () => {
    const originalFetch = global.fetch;
    const mockFetch = jest.fn();

    beforeAll(() => {
        global.fetch = mockFetch;
        process.env.OPENAI_VIDEO_API_KEY = 'test-key';
        process.env.FIREBASE_STORAGE_BUCKET = 'test-bucket.firebasestorage.app';
    });

    afterAll(() => {
        global.fetch = originalFetch;
        delete process.env.OPENAI_VIDEO_API_KEY;
        delete process.env.FIREBASE_STORAGE_BUCKET;
    });

    beforeEach(() => {
        mockFetch.mockReset();
    });

    // Helper to create standard mock responses
    const mockJobCreation = (jobId: string) => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ id: jobId })
        });
    };

    const mockPollResponse = (jobId: string, status: string, extra = {}) => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ 
                id: jobId, 
                status,
                seconds: '4',
                prompt: 'test prompt',
                ...extra 
            })
        });
    };

    const mockVideoDownload = (size = 1000) => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            arrayBuffer: async () => new ArrayBuffer(size)
        });
    };

    test('successfully generates video via async job flow with download and upload', async () => {
        const input: GenerateVideoInput = { prompt: 'Test Prompt', duration: '5' };
        
        // Mock job creation
        mockJobCreation('video-123');

        // Mock first poll: pending
        mockPollResponse('video-123', 'pending');

        // Mock second poll: completed
        mockPollResponse('video-123', 'completed');

        // Mock video download from /content endpoint
        mockVideoDownload(1500000); // 1.5MB

        const result = await generateSoraVideo(input, TEST_OPTIONS);
        
        // Video should be uploaded to Firebase Storage with public URL
        expect(result.videoUrl).toContain('storage.googleapis.com');
        expect(result.videoUrl).toContain('video-123.mp4');
        expect(mockFetch).toHaveBeenCalledTimes(4);
        
        // Verify job creation request
        expect(mockFetch).toHaveBeenNthCalledWith(1, 
            'https://api.openai.com/v1/videos',
            expect.objectContaining({
                method: 'POST',
                body: expect.stringContaining('"model":"sora-2"'),
            })
        );

        // Verify poll request
        expect(mockFetch).toHaveBeenNthCalledWith(2, 
            'https://api.openai.com/v1/videos/video-123',
            expect.objectContaining({ method: 'GET' })
        );

        // Verify content download request
        expect(mockFetch).toHaveBeenNthCalledWith(4, 
            'https://api.openai.com/v1/videos/video-123/content',
            expect.objectContaining({ 
                method: 'GET',
                headers: expect.objectContaining({
                    'Authorization': 'Bearer test-key'
                })
            })
        );
    });

    test('uses sora-2-pro model when specified', async () => {
        const input: GenerateVideoInput = { prompt: 'Pro video test' };
        
        mockJobCreation('job-pro');
        mockPollResponse('job-pro', 'completed');
        mockVideoDownload();

        const result = await generateSoraVideo(input, { 
            model: 'sora-2-pro',
            ...TEST_OPTIONS 
        });
        
        expect(result.videoUrl).toContain('storage.googleapis.com');
        expect(mockFetch).toHaveBeenNthCalledWith(1, 
            expect.any(String),
            expect.objectContaining({
                body: expect.stringContaining('"model":"sora-2-pro"'),
            })
        );
    });

    test('throws error if job creation fails', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 401,
            text: async () => 'Unauthorized: Invalid API key'
        });

        await expect(generateSoraVideo({ prompt: 'fail' }, TEST_OPTIONS))
            .rejects.toThrow('OpenAI Sora API Error 401: Unauthorized: Invalid API key');
    });

    test('throws error if job fails during processing', async () => {
        mockJobCreation('job-fail');
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ 
                id: 'job-fail', 
                status: 'failed',
                error: { message: 'Content policy violation' }
            })
        });

        await expect(generateSoraVideo({ prompt: 'inappropriate' }, TEST_OPTIONS))
            .rejects.toThrow('Video generation failed: Content policy violation');
    });

    test('throws error if video download fails', async () => {
        mockJobCreation('job-download-fail');
        mockPollResponse('job-download-fail', 'completed');
        
        // Mock failed download
        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 403,
            text: async () => 'Forbidden'
        });

        await expect(generateSoraVideo({ prompt: 'download fail' }, TEST_OPTIONS))
            .rejects.toThrow('Failed to download video: 403');
    });

    test('handles queued and in_progress statuses correctly', async () => {
        const input: GenerateVideoInput = { prompt: 'Queued video' };
        
        mockJobCreation('job-queued');
        mockPollResponse('job-queued', 'queued');
        mockPollResponse('job-queued', 'in_progress');
        mockPollResponse('job-queued', 'completed');
        mockVideoDownload();

        const result = await generateSoraVideo(input, TEST_OPTIONS);
        
        expect(result.videoUrl).toContain('storage.googleapis.com');
        expect(mockFetch).toHaveBeenCalledTimes(5); // create + 3 polls + download
    });

    test('maps aspect ratio correctly', async () => {
        const input: GenerateVideoInput = { 
            prompt: 'Vertical video', 
            aspectRatio: '9:16' 
        };
        
        mockJobCreation('job-vertical');
        mockPollResponse('job-vertical', 'completed');
        mockVideoDownload();

        await generateSoraVideo(input, TEST_OPTIONS);
        
        expect(mockFetch).toHaveBeenNthCalledWith(1, 
            expect.any(String),
            expect.objectContaining({
                body: expect.stringContaining('"size":"720x1280"'),
            })
        );
    });

    test('throws error when API key is missing', async () => {
        delete process.env.OPENAI_VIDEO_API_KEY;
        delete process.env.OPENAI_API_KEY;
        
        await expect(generateSoraVideo({ prompt: 'no key' }, TEST_OPTIONS))
            .rejects.toThrow('Missing OPENAI_VIDEO_API_KEY or OPENAI_API_KEY');
        
        // Restore for other tests
        process.env.OPENAI_VIDEO_API_KEY = 'test-key';
    });

    test('times out after max poll attempts', async () => {
        mockJobCreation('job-timeout');

        // All poll responses return pending
        for (let i = 0; i < 10; i++) {
            mockPollResponse('job-timeout', 'pending');
        }

        await expect(generateSoraVideo({ prompt: 'timeout' }, TEST_OPTIONS))
            .rejects.toThrow('timed out');
    });

    test('extracts duration from job response', async () => {
        mockJobCreation('job-duration');
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ 
                id: 'job-duration', 
                status: 'completed',
                seconds: '8',
                prompt: 'long video'
            })
        });
        mockVideoDownload();

        const result = await generateSoraVideo({ prompt: 'long', duration: '10' }, TEST_OPTIONS);
        
        expect(result.duration).toBe(8);
    });
});
