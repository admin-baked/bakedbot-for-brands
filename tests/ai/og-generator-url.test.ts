import { normalizeOgAssetUrl } from '@/ai/generators/og';

describe('normalizeOgAssetUrl', () => {
    it('resolves relative asset paths against the provided origin', () => {
        expect(normalizeOgAssetUrl('/icon-192.png', 'https://bakedbot.ai')).toBe(
            'https://bakedbot.ai/icon-192.png'
        );
    });

    it('preserves absolute https urls', () => {
        expect(
            normalizeOgAssetUrl(
                'https://thrivesyracuse.com/wp-content/uploads/logo.png',
                'https://bakedbot.ai'
            )
        ).toBe('https://thrivesyracuse.com/wp-content/uploads/logo.png');
    });

    it('drops unsupported protocols instead of passing them to next/og', () => {
        expect(normalizeOgAssetUrl('javascript:alert(1)', 'https://bakedbot.ai')).toBeUndefined();
    });
});
