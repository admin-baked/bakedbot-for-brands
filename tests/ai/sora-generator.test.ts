
import { generateSoraVideo } from '@/ai/generators/sora';
import { GenerateVideoInput } from '@/ai/video-types';

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

    test('successfully generates video url', async () => {
        const input: GenerateVideoInput = { prompt: 'Test Prompt', duration: '5' };
        
        // Mock successful response
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                data: [
                    { url: 'https://fake-sora-url.com/video.mp4' }
                ]
            })
        });

        const result = await generateSoraVideo(input);
        expect(result.videoUrl).toBe('https://fake-sora-url.com/video.mp4');
        expect(mockFetch).toHaveBeenCalledWith('https://api.openai.com/v1/video/generations', expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"model":"sora-1.0-turbo"'),
        }));
    });

    test('throws error if API fails', async () => {
        mockFetch.mockResolvedValue({
            ok: false,
            status: 400,
            text: async () => 'Bad Request'
        });

        await expect(generateSoraVideo({ prompt: 'fail' })).rejects.toThrow('OpenAI API Error 400: Bad Request');
    });

    test('throws error if no URL returned', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ data: [] })
        });
        await expect(generateSoraVideo({ prompt: 'empty' })).rejects.toThrow('No video URL returned from Sora.');
    });
});
