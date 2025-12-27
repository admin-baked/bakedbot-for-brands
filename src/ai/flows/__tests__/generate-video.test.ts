
import { generateMarketingVideo } from '../generate-video';
import { generateSoraVideo } from '../../generators/sora';
import { getSafeVideoProviderAction } from '../../../server/actions/super-admin/safe-settings';
import { ai } from '../../genkit';

// Mocks
jest.mock('../../../server/actions/super-admin/safe-settings', () => ({
    getSafeVideoProviderAction: jest.fn(),
}));

jest.mock('../../generators/sora', () => ({
    generateSoraVideo: jest.fn(),
}));

// Mock Genkit to just pass through functions
jest.mock('../../genkit', () => ({
    ai: {
        defineFlow: jest.fn((config, handler) => handler),
        definePrompt: jest.fn(() => {
            // Mock the prompt executable
            return jest.fn().mockResolvedValue({
                media: { url: 'https://veo.mock/video.mp4' }
            });
        }),
    }
}));

describe('Video Generation Flow', () => {
    const mockInput = {
        prompt: 'test prompt',
        duration: '5',
        aspectRatio: '16:9'
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should use Veo when provider is set to "veo"', async () => {
        (getSafeVideoProviderAction as jest.Mock).mockResolvedValue('veo');
        
        const result = await generateMarketingVideo(mockInput as any);

        expect(result.videoUrl).toBe('https://veo.mock/video.mp4');
        expect(generateSoraVideo).not.toHaveBeenCalled();
    });

    it('should use Sora (Standard) when provider is "sora"', async () => {
        (getSafeVideoProviderAction as jest.Mock).mockResolvedValue('sora');
        (generateSoraVideo as jest.Mock).mockResolvedValue({ videoUrl: 'https://sora.mock/standard.mp4' });

        const result = await generateMarketingVideo(mockInput as any);

        expect(result.videoUrl).toBe('https://sora.mock/standard.mp4');
        expect(generateSoraVideo).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ model: 'sora-2' }));
    });

    it('should use Sora (Pro) when provider is "sora-pro"', async () => {
        (getSafeVideoProviderAction as jest.Mock).mockResolvedValue('sora-pro');
        (generateSoraVideo as jest.Mock).mockResolvedValue({ videoUrl: 'https://sora.mock/pro.mp4' });

        const result = await generateMarketingVideo(mockInput as any);

        expect(result.videoUrl).toBe('https://sora.mock/pro.mp4');
        expect(generateSoraVideo).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ model: 'sora-2-pro' }));
    });

    it('should fall back to Veo when Sora fails', async () => {
        (getSafeVideoProviderAction as jest.Mock).mockResolvedValue('sora-pro');
        (generateSoraVideo as jest.Mock).mockRejectedValue(new Error('Sora API Error'));
        
        // Mock checking logs or ensure no throw
        const result = await generateMarketingVideo(mockInput as any);

        expect(result.videoUrl).toBe('https://veo.mock/video.mp4'); // Fallback triggered
    });
});
