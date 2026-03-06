import { generateMarketingVideo } from '../generate-video';
import { generateSoraVideo } from '../../generators/sora';
import { generateVeoVideo } from '../../generators/veo';
import { getSafeVideoProviderAction } from '../../../server/actions/super-admin/safe-settings';

jest.mock('../../../server/actions/super-admin/safe-settings', () => ({
    getSafeVideoProviderAction: jest.fn(),
}));

jest.mock('../../generators/sora', () => ({
    generateSoraVideo: jest.fn(),
}));

jest.mock('../../generators/veo', () => ({
    generateVeoVideo: jest.fn(),
}));

jest.mock('../../genkit', () => ({
    ai: {
        defineFlow: jest.fn((config, handler) => handler),
    },
}));

describe('Video Generation Flow', () => {
    const mockInput = {
        prompt: 'test prompt',
        duration: '5' as const,
        aspectRatio: '16:9' as const,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (generateVeoVideo as jest.Mock).mockResolvedValue({
            videoUrl: 'https://veo.mock/video.mp4',
            duration: 5,
            provider: 'veo',
            model: 'veo-3.1-generate-preview',
        });
    });

    it('uses Veo when provider is set to veo', async () => {
        (getSafeVideoProviderAction as jest.Mock).mockResolvedValue('veo');

        const result = await generateMarketingVideo(mockInput);

        expect(result.videoUrl).toBe('https://veo.mock/video.mp4');
        expect(result.provider).toBe('veo');
        expect(generateSoraVideo).not.toHaveBeenCalled();
    });

    it('uses standard Sora when provider is sora', async () => {
        (getSafeVideoProviderAction as jest.Mock).mockResolvedValue('sora');
        (generateSoraVideo as jest.Mock).mockResolvedValue({
            videoUrl: 'https://sora.mock/standard.mp4',
            duration: 5,
            provider: 'sora',
            model: 'sora-2',
        });

        const result = await generateMarketingVideo(mockInput);

        expect(result.videoUrl).toBe('https://sora.mock/standard.mp4');
        expect(result.provider).toBe('sora');
        expect(generateSoraVideo).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ model: 'sora-2' }));
    });

    it('uses pro Sora when provider is sora-pro', async () => {
        (getSafeVideoProviderAction as jest.Mock).mockResolvedValue('sora-pro');
        (generateSoraVideo as jest.Mock).mockResolvedValue({
            videoUrl: 'https://sora.mock/pro.mp4',
            duration: 8,
            provider: 'sora-pro',
            model: 'sora-2-pro',
        });

        const result = await generateMarketingVideo(mockInput);

        expect(result.videoUrl).toBe('https://sora.mock/pro.mp4');
        expect(result.provider).toBe('sora-pro');
        expect(generateSoraVideo).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ model: 'sora-2-pro' }));
    });

    it('falls back to Veo when Sora fails', async () => {
        (getSafeVideoProviderAction as jest.Mock).mockResolvedValue('sora-pro');
        (generateSoraVideo as jest.Mock).mockRejectedValue(new Error('Sora API Error'));

        const result = await generateMarketingVideo(mockInput);

        expect(result.videoUrl).toBe('https://veo.mock/video.mp4');
        expect(result.provider).toBe('veo');
        expect(generateVeoVideo).toHaveBeenCalled();
    });

    it('throws instead of returning the demo fallback when strict mode is enabled', async () => {
        (getSafeVideoProviderAction as jest.Mock).mockResolvedValue('veo');
        (generateVeoVideo as jest.Mock).mockRejectedValue(new Error('Veo down'));
        (generateSoraVideo as jest.Mock).mockRejectedValue(new Error('Sora down'));

        await expect(
            generateMarketingVideo(mockInput, { allowFallbackDemo: false })
        ).rejects.toThrow('Demo fallback disabled');
    });
});
