
import { generateSoraVideo, SoraGeneratorOptions } from '@/ai/generators/sora';
import { GenerateVideoInput } from '@/ai/video-types';

// Test options with fast polling for quick tests
const TEST_OPTIONS: SoraGeneratorOptions = {
    pollIntervalMs: 10, // 10ms instead of 5000ms
    maxPollAttempts: 10,
};

describe('Sora Generator', () => {
    const originalFetch = global.fetch;
    const mockFetch = jest.fn();

    beforeAll(() => {
        global.fetch = mockFetch;
        process.env.OPENAI_VIDEO_API_KEY = 'test-key';
    });

    afterAll(() => {
        global.fetch = originalFetch;
        delete process.env.OPENAI_VIDEO_API_KEY;
    });

    beforeEach(() => {
        mockFetch.mockReset();
    });

    test('successfully generates video url via async job flow', async () => {
        const input: GenerateVideoInput = { prompt: 'Test Prompt', duration: '5' };
        
        // Mock job creation response
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ id: 'job-123' })
        });

        // Mock first poll: pending
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ 
                id: 'job-123', 
                status: 'pending' 
            })
        });

        // Mock second poll: completed with video URL
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ 
                id: 'job-123', 
                status: 'completed',
                output: { video_url: 'https://sora.openai.com/video.mp4' }
            })
        });

        const result = await generateSoraVideo(input, TEST_OPTIONS);
        
        expect(result.videoUrl).toBe('https://sora.openai.com/video.mp4');
        expect(mockFetch).toHaveBeenCalledTimes(3);
        
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
            'https://api.openai.com/v1/videos/job-123',
            expect.objectContaining({ method: 'GET' })
        );
    });

    test('uses sora-2-pro model when specified', async () => {
        const input: GenerateVideoInput = { prompt: 'Pro video test' };
        
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ id: 'job-pro' })
        });

        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ 
                id: 'job-pro', 
                status: 'completed',
                output: { video_url: 'https://sora.openai.com/pro-video.mp4' }
            })
        });

        const result = await generateSoraVideo(input, { 
            model: 'sora-2-pro',
            ...TEST_OPTIONS 
        });
        
        expect(result.videoUrl).toBe('https://sora.openai.com/pro-video.mp4');
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
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ id: 'job-fail' })
        });

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

    test('throws error if no video URL in completed response', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ id: 'job-empty' })
        });

        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ 
                id: 'job-empty', 
                status: 'completed',
                output: {} // Missing video_url
            })
        });

        await expect(generateSoraVideo({ prompt: 'empty' }, TEST_OPTIONS))
            .rejects.toThrow('Job completed but no video URL in response');
    });

    test('maps aspect ratio correctly', async () => {
        const input: GenerateVideoInput = { 
            prompt: 'Vertical video', 
            aspectRatio: '9:16' 
        };
        
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ id: 'job-vertical' })
        });

        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ 
                id: 'job-vertical', 
                status: 'completed',
                output: { video_url: 'https://sora.openai.com/vertical.mp4' }
            })
        });

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
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ id: 'job-timeout' })
        });

        // All poll responses return pending
        for (let i = 0; i < 10; i++) {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ 
                    id: 'job-timeout', 
                    status: 'pending'
                })
            });
        }

        await expect(generateSoraVideo({ prompt: 'timeout' }, TEST_OPTIONS))
            .rejects.toThrow('timed out');
    });
});
