/**
 * Remotion Root — registers all BakedBot compositions.
 * Used by: npx remotion studio  (preview)
 *           npx remotion render  (local CLI render)
 *           @remotion/renderer renderMedia()  (server-side)
 */

import { Composition } from 'remotion';
import { BrandedSlideshow, type BrandedSlideshowProps } from './compositions/BrandedSlideshow';

const DEFAULT_PROPS: BrandedSlideshowProps = {
    brandName: 'BakedBot AI',
    tagline: 'Turn Your Menu Into a Revenue Engine',
    primaryColor: '#18181b',
    secondaryColor: '#27272a',
    accentColor: '#22c55e',
    logoUrl: undefined,
    productImageUrl: undefined,
    ctaText: 'Shop Now',
    websiteUrl: 'bakedbot.ai',
    headline: 'AI-Powered Cannabis Commerce',
};

export const RemotionRoot: React.FC = () => {
    return (
        <>
            {/* 16:9 — landscape (social feed, LinkedIn, Twitter) */}
            <Composition
                id="BrandedSlideshow-16x9"
                component={BrandedSlideshow}
                durationInFrames={150}
                fps={30}
                width={1280}
                height={720}
                defaultProps={DEFAULT_PROPS}
            />

            {/* 9:16 — vertical (TikTok, Instagram Reels, Stories) */}
            <Composition
                id="BrandedSlideshow-9x16"
                component={BrandedSlideshow}
                durationInFrames={150}
                fps={30}
                width={720}
                height={1280}
                defaultProps={DEFAULT_PROPS}
            />

            {/* 1:1 — square (Instagram feed) */}
            <Composition
                id="BrandedSlideshow-1x1"
                component={BrandedSlideshow}
                durationInFrames={150}
                fps={30}
                width={1080}
                height={1080}
                defaultProps={DEFAULT_PROPS}
            />
        </>
    );
};
